-- ============================================================================
-- V021 — Isolation multi-tenant (Row Level Security) & durcissement des rôles
-- Référence : Spécifications Fonctionnelles v2.2, Chapitre 1.5 ("Row Level
-- Security (RLS) obligatoire sur toutes les tables héritées d'une
-- organization_id") ; US-05 ("aucune donnée d'un autre tenant n'est jamais
-- accessible") ; M1-T02 (Architecture v2.2.1) ; M7-T04 (permissions PostgreSQL
-- sur audit_logs).
--
-- Ce fichier n'était couvert par AUCUNE des deux références techniques au-delà
-- du principe général ; son contenu (fonctions, dénormalisation, policies) est
-- une proposition d'implémentation à valider en revue croisée
-- produit/ingénierie (item 1 des Prochaines Étapes de l'Architecture v2.2.1)
-- avant application en production.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Rôle applicatif dédié & fonctions de session
-- ----------------------------------------------------------------------------
-- Le pool de connexions NestJS se connecte avec ce rôle (jamais avec le
-- superutilisateur de migration). Le middleware NestJS (Chapitre 1.5) exécute
-- `SELECT set_config('app.current_org_id', $1, true)` et
-- `SELECT set_config('app.current_user_id', $2, true)` en tout début de
-- transaction, à partir du JWT décodé.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
        CREATE ROLE app_runtime LOGIN PASSWORD 'CHANGE_ME_VIA_SECRETS_MANAGER';
    END IF;
END
$$;

DO $$
BEGIN
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO app_runtime', current_database());
END
$$;
GRANT USAGE ON SCHEMA public TO app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_runtime;

CREATE OR REPLACE FUNCTION current_org_id() RETURNS UUID AS $$
    SELECT NULLIF(current_setting('app.current_org_id', true), '')::UUID;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION current_user_id() RETURNS UUID AS $$
    SELECT NULLIF(current_setting('app.current_user_id', true), '')::UUID;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION current_org_id() IS
    'Lit app.current_org_id, positionné par le middleware NestJS à partir du header X-Organization-ID / sous-domaine (Chapitre 1.5). NULL si non positionné (ex. endpoints publics ou pré-sélection d''organisation).';

-- ----------------------------------------------------------------------------
-- 2. Durcissement des tables append-only (M7-T04, BR-01, BR-05)
-- ----------------------------------------------------------------------------
-- audit_logs et event_store : rétention légale 7 ans (BR-05) — aucun rôle
-- applicatif ne doit pouvoir modifier ou supprimer une ligne, indépendamment
-- de RLS. indicator_history is déjà protégée par trigger (V014) ; la
-- restriction de permission ci-dessous est une seconde barrière (defense in
-- depth), conforme à l'esprit de M7-T04 qui teste ce refus "au niveau des
-- permissions PostgreSQL" et non uniquement applicatif.

REVOKE UPDATE, DELETE ON audit_logs FROM app_runtime;
REVOKE UPDATE, DELETE ON event_store FROM app_runtime;
REVOKE UPDATE, DELETE ON indicator_history FROM app_runtime;
REVOKE UPDATE, DELETE ON approval_history FROM app_runtime;
REVOKE UPDATE, DELETE ON message_edits FROM app_runtime;
REVOKE UPDATE, DELETE ON shared_link_access_logs FROM app_runtime;
REVOKE UPDATE, DELETE ON login_attempts FROM app_runtime;

-- ----------------------------------------------------------------------------
-- 3. Dénormalisation ciblée d'organization_id (performance RLS — hot path)
-- ----------------------------------------------------------------------------
-- indicator_history / indicator_values sont les deux tables explicitement
-- soumises à un objectif de charge chiffré (50 000 mises à jour/jour/tenant en
-- pointe, Chapitre 13.1 ; rafraîchissement dashboard < 2s, Chapitre 9.5). Une
-- policy RLS par sous-requête (indicator_id -> logical_frameworks -> projects
-- -> organization_id, soit 3 jointures) sur CE volume précis présenterait un
-- risque de régression de performance non négligeable. organization_id est
-- donc dupliqué directement sur ces deux tables pour permettre une policy RLS
-- à comparaison directe (index simple), au prix d'une dénormalisation limitée
-- et documentée — à revalider par le test de charge dédié (voir Plan de
-- Tests, section Performance).

-- Aucune désactivation de compression n'est requise ici : V014 n'active plus
-- la compression native sur indicator_history (voir V014, commentaire
-- détaillé) précisément parce que TimescaleDB ne permet pas de faire
-- coexister columnstore (compression) et Row Level Security sur une même
-- hypertable, quel que soit l'ordre d'exécution. La table reste donc en
-- rowstore non compressé tant que la RLS y est active.

ALTER TABLE indicator_history ADD COLUMN organization_id UUID;
ALTER TABLE indicator_values ADD COLUMN organization_id UUID;

CREATE INDEX idx_indicator_history_org ON indicator_history(organization_id, calculated_at);
CREATE INDEX idx_indicator_values_org ON indicator_values(organization_id);

-- Backfill pour une base déjà peuplée (no-op sur une base neuve). La
-- protection d'immuabilité BR-01 (trigger trg_indicator_history_no_update,
-- V014) est désactivée le temps de cette unique opération de migration
-- structurelle, puis immédiatement réactivée — aucun UPDATE applicatif
-- normal ne doit jamais emprunter ce chemin.
ALTER TABLE indicator_history DISABLE TRIGGER trg_indicator_history_no_update;

UPDATE indicator_history ih SET organization_id = p.organization_id
    FROM indicators i JOIN logical_frameworks lf ON lf.id = i.framework_id
         JOIN projects p ON p.id = lf.project_id
    WHERE ih.indicator_id = i.id AND ih.organization_id IS NULL;

ALTER TABLE indicator_history ENABLE TRIGGER trg_indicator_history_no_update;

UPDATE indicator_values iv SET organization_id = p.organization_id
    FROM indicators i JOIN logical_frameworks lf ON lf.id = i.framework_id
         JOIN projects p ON p.id = lf.project_id
    WHERE iv.indicator_id = i.id AND iv.organization_id IS NULL;

-- Le CalculationEngine (Chapitre 4.4) DOIT être mis à jour pour renseigner
-- organization_id à l'écriture (résolu depuis le framework_id de l'indicateur
-- concerné) ; ce n'est pas automatisable par trigger sans dupliquer la
-- logique de résolution de chemin ci-dessus à chaque INSERT à haute fréquence.
ALTER TABLE indicator_history ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE indicator_values ALTER COLUMN organization_id SET NOT NULL;

-- CORRECTIF requis par cette dénormalisation : le trigger fn_refresh_indicator_values
-- (V014) propage indicator_history -> indicator_values sans organization_id.
-- Repéré par exécution en validation dans cet environnement (une insertion dans
-- indicator_history après application de V021 échouait avec "null value in
-- column organization_id of relation indicator_values violates not-null
-- constraint", le trigger n'étant pas au courant de la colonne ajoutée
-- ci-dessus). CREATE OR REPLACE plutôt que modifier V014 directement : la
-- définition d'origine reste valide et exécutable seule, avant que V021 ne
-- soit appliquée.
CREATE OR REPLACE FUNCTION fn_refresh_indicator_values()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO indicator_values (indicator_id, organization_id, period_start, period_end, value, target_value, baseline_value, data_source_batch_id, calculated_at)
    VALUES (NEW.indicator_id, NEW.organization_id, NEW.period_start, NEW.period_end, NEW.value, NEW.target_value, NEW.baseline_value, NEW.data_source_batch_id, NEW.calculated_at)
    ON CONFLICT (indicator_id, period_start, period_end)
    DO UPDATE SET value = EXCLUDED.value, target_value = EXCLUDED.target_value,
        baseline_value = EXCLUDED.baseline_value, data_source_batch_id = EXCLUDED.data_source_batch_id,
        organization_id = EXCLUDED.organization_id, calculated_at = EXCLUDED.calculated_at;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 4. Row Level Security — Groupe A : organization_id en colonne directe
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_enable_direct_org_rls(tbl regclass) RETURNS void AS $$
BEGIN
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format(
        'CREATE POLICY tenant_isolation ON %s USING (organization_id = current_org_id())',
        tbl
    );
END;
$$ LANGUAGE plpgsql;

SELECT fn_enable_direct_org_rls('invitations');
SELECT fn_enable_direct_org_rls('data_sources');
SELECT fn_enable_direct_org_rls('chat_threads');
SELECT fn_enable_direct_org_rls('ai_documents');
SELECT fn_enable_direct_org_rls('ai_usage_logs');
SELECT fn_enable_direct_org_rls('reports');
SELECT fn_enable_direct_org_rls('report_templates');
SELECT fn_enable_direct_org_rls('dashboards');
SELECT fn_enable_direct_org_rls('audit_logs');
SELECT fn_enable_direct_org_rls('deletion_requests');
SELECT fn_enable_direct_org_rls('subscriptions');
SELECT fn_enable_direct_org_rls('usage_quotas');
SELECT fn_enable_direct_org_rls('invoices');
SELECT fn_enable_direct_org_rls('projects');
-- indicator_history reste en rowstore non compressé : la RLS et le
-- columnstore TimescaleDB ne peuvent pas coexister sur une même hypertable,
-- dans un sens comme dans l'autre (cf. V014). La RLS étant l'exigence
-- obligatoire (Chapitre 1.5) et déjà validée fonctionnellement, aucune
-- tentative de réactivation de la compression n'est faite ici.
SELECT fn_enable_direct_org_rls('indicator_history');

SELECT fn_enable_direct_org_rls('indicator_values');

-- organizations : cas particulier — la clé de tenant EST l'id de la ligne, et
-- un utilisateur peut être membre de plusieurs organisations (Chapitre 1.2.3)
-- et doit pouvoir les lister via GET /organizations AVANT toute sélection
-- d'un current_org_id (poule/œuf). La policy est donc fondée sur
-- l'appartenance (organization_users), pas sur current_org_id().
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
CREATE POLICY membership_isolation ON organizations
    USING (id IN (SELECT organization_id FROM organization_users WHERE user_id = current_user_id()));

-- organization_users : un utilisateur voit ses propres lignes de membership,
-- et toute ligne de membership de l'organisation couramment sélectionnée.
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_users FORCE ROW LEVEL SECURITY;
CREATE POLICY membership_isolation ON organization_users
    USING (user_id = current_user_id() OR organization_id = current_org_id());

-- ----------------------------------------------------------------------------
-- 5. Row Level Security — Groupe B : via project_id -> projects.organization_id
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_enable_project_scoped_rls(tbl regclass, project_fk text) RETURNS void AS $$
BEGIN
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format(
        'CREATE POLICY tenant_isolation ON %1$s USING (
            EXISTS (SELECT 1 FROM projects p WHERE p.id = %1$s.%2$I AND p.organization_id = current_org_id())
        )', tbl, project_fk
    );
END;
$$ LANGUAGE plpgsql;

SELECT fn_enable_project_scoped_rls('logical_frameworks', 'project_id');
SELECT fn_enable_project_scoped_rls('data_batches', 'project_id');
SELECT fn_enable_project_scoped_rls('ai_proposals', 'project_id');
SELECT fn_enable_project_scoped_rls('sync_queue', 'project_id');

-- indicators : dépend de logical_frameworks.project_id (un hop de plus)
ALTER TABLE indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicators FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON indicators USING (
    EXISTS (
        SELECT 1 FROM logical_frameworks lf JOIN projects p ON p.id = lf.project_id
        WHERE lf.id = indicators.framework_id AND p.organization_id = current_org_id()
    )
);

-- sync_jobs / mapping_templates : dépendent de data_sources.organization_id (direct)
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_jobs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON sync_jobs USING (
    EXISTS (SELECT 1 FROM data_sources ds WHERE ds.id = sync_jobs.data_source_id AND ds.organization_id = current_org_id())
);

ALTER TABLE mapping_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE mapping_templates FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON mapping_templates USING (
    EXISTS (SELECT 1 FROM data_sources ds WHERE ds.id = mapping_templates.data_source_id AND ds.organization_id = current_org_id())
);

-- approval_history : dépend de data_batches.project_id (un hop de plus)
ALTER TABLE approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_history FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON approval_history USING (
    EXISTS (
        SELECT 1 FROM data_batches db JOIN projects p ON p.id = db.project_id
        WHERE db.id = approval_history.data_batch_id AND p.organization_id = current_org_id()
    )
);

-- sync_conflicts : dépend de sync_queue.project_id (un hop de plus)
ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_conflicts FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON sync_conflicts USING (
    EXISTS (
        SELECT 1 FROM sync_queue sq JOIN projects p ON p.id = sq.project_id
        WHERE sq.id = sync_conflicts.sync_queue_id AND p.organization_id = current_org_id()
    )
);

-- document_chunks : dépend de ai_documents.organization_id (direct)
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON document_chunks USING (
    EXISTS (SELECT 1 FROM ai_documents ad WHERE ad.id = document_chunks.document_id AND ad.organization_id = current_org_id())
);

-- ai_cleaning_jobs : dépend de data_batches.project_id (deux hops)
ALTER TABLE ai_cleaning_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cleaning_jobs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON ai_cleaning_jobs USING (
    EXISTS (
        SELECT 1 FROM data_batches db JOIN projects p ON p.id = db.project_id
        WHERE db.id = ai_cleaning_jobs.data_batch_id AND p.organization_id = current_org_id()
    )
);

-- chat_messages / message_edits / alerts : dépendent de chat_threads.organization_id (direct)
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON chat_messages USING (
    EXISTS (SELECT 1 FROM chat_threads ct WHERE ct.id = chat_messages.thread_id AND ct.organization_id = current_org_id())
);

ALTER TABLE message_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_edits FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON message_edits USING (
    EXISTS (
        SELECT 1 FROM chat_messages cm JOIN chat_threads ct ON ct.id = cm.thread_id
        WHERE cm.id = message_edits.message_id AND ct.organization_id = current_org_id()
    )
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON alerts USING (
    thread_id IS NULL OR
    EXISTS (SELECT 1 FROM chat_threads ct WHERE ct.id = alerts.thread_id AND ct.organization_id = current_org_id())
);

-- dashboard_shares / dashboard_views : dépendent de dashboards.organization_id (direct)
ALTER TABLE dashboard_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_shares FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON dashboard_shares USING (
    EXISTS (SELECT 1 FROM dashboards d WHERE d.id = dashboard_shares.dashboard_id AND d.organization_id = current_org_id())
);

ALTER TABLE dashboard_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_views FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON dashboard_views USING (
    EXISTS (SELECT 1 FROM dashboards d WHERE d.id = dashboard_views.dashboard_id AND d.organization_id = current_org_id())
);

-- scheduled_exports : dashboard_id OU report_id (l'un des deux, jamais les deux — cf. Specs 11.4)
ALTER TABLE scheduled_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_exports FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON scheduled_exports USING (
    EXISTS (SELECT 1 FROM dashboards d WHERE d.id = scheduled_exports.dashboard_id AND d.organization_id = current_org_id())
    OR EXISTS (SELECT 1 FROM reports r WHERE r.id = scheduled_exports.report_id AND r.organization_id = current_org_id())
);

-- notification_preferences : project_id nullable (préférence globale utilisateur si NULL)
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON notification_preferences USING (
    user_id = current_user_id()
    OR EXISTS (SELECT 1 FROM projects p WHERE p.id = notification_preferences.project_id AND p.organization_id = current_org_id())
);

-- ----------------------------------------------------------------------------
-- 6. Row Level Security — Groupe C : scoping par propriété (ressources
--    polymorphes ou volontairement accessibles hors contexte tenant)
-- ----------------------------------------------------------------------------
ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_jobs FORCE ROW LEVEL SECURITY;
CREATE POLICY owner_isolation ON export_jobs USING (requested_by_user_id = current_user_id());

ALTER TABLE shared_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_links FORCE ROW LEVEL SECURITY;
CREATE POLICY owner_isolation ON shared_links USING (created_by_user_id = current_user_id());

-- shared_link_access_logs : lecture réservée au créateur du lien (audit des accès, Chapitre 11.2.3)
ALTER TABLE shared_link_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_link_access_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY owner_isolation ON shared_link_access_logs USING (
    EXISTS (SELECT 1 FROM shared_links sl WHERE sl.id = shared_link_access_logs.shared_link_id AND sl.created_by_user_id = current_user_id())
);

-- ----------------------------------------------------------------------------
-- 7. Exceptions documentées (pas de RLS applicable)
-- ----------------------------------------------------------------------------
COMMENT ON FUNCTION fn_enable_direct_org_rls IS
    'Fonction utilitaire de migration uniquement — non destinée à un usage applicatif au runtime.';
COMMENT ON FUNCTION fn_enable_project_scoped_rls IS
    'Fonction utilitaire de migration uniquement — non destinée à un usage applicatif au runtime.';