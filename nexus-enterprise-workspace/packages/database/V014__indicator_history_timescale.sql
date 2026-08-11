-- ============================================================================
-- V014 — Historisation immuable des indicateurs (BR-01) & hypertable TimescaleDB
-- Référence : Spécifications Fonctionnelles v2.2, Chapitre 8.4
--
-- C'est la migration la plus sensible du schéma (signalée comme telle par le
-- point 2 des « Prochaines Étapes Recommandées » des Specs v2.2 et le point 3
-- de l'Architecture v2.2.1). Points d'attention pour l'exécution en
-- production :
--
--   1. indicator_history est déclarée hypertable, partitionnée sur
--      calculated_at (cible : 50 000 mises à jour/jour/tenant en pointe,
--      Chapitre 13.1). Une hypertable TimescaleDB IMPOSE que la colonne de
--      partition fasse partie de toute clé primaire/unique — d'où
--      PRIMARY KEY (id, calculated_at) plutôt que PRIMARY KEY (id) seul.
--   2. Cette contrainte a une conséquence en cascade : indicators(id) ne peut
--      pas être référencé par une simple FK enfant classique sans risque de
--      verrou étendu à grande échelle une fois la table volumineuse ; la FK
--      est conservée ici pour l'intégrité en développement, mais DOIT être
--      revalidée en test de charge (voir Plan de Tests, section "Charge —
--      Cascade & TimescaleDB") avant la mise en production. Si la FK s'avère
--      trop coûteuse au volume cible, la remplacer par une contrainte
--      applicative + job de réconciliation nocturne.
--   3. SELECT create_hypertable(...) doit s'exécuter sur une table VIDE.
--      Si cette migration est appliquée sur un environnement où
--      indicator_history existe déjà avec des données (ex. migration depuis
--      la v2.1 qui ne connaissait que indicator_values), suivre la procédure
--      de bascule décrite dans le README.md du dossier de migrations
--      (bascule par table temporaire + INSERT INTO ... SELECT, PAS de
--      ALTER TABLE direct).
--   4. indicator_history est INSERT-ONLY (immuabilité BR-01). Aucun rôle
--      applicatif ne doit détenir UPDATE/DELETE dessus — voir V021 (RLS &
--      permissions).
-- ============================================================================

CREATE TABLE indicator_history (
    id UUID DEFAULT gen_random_uuid(),
    indicator_id UUID NOT NULL REFERENCES indicators(id) ON DELETE CASCADE,
    version INT NOT NULL,                          -- Incrémenté à chaque recalcul (BR-01)
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    value DECIMAL(15,2) NOT NULL,
    target_value DECIMAL(15,2),
    baseline_value DECIMAL(15,2),
    formula_type_snapshot VARCHAR(50),             -- Formule utilisée pour ce calcul (traçabilité)
    data_source_batch_id UUID REFERENCES data_batches(id),
    triggered_by VARCHAR(20) NOT NULL
        CHECK (triggered_by IN ('APPROVAL', 'CASCADE', 'MANUAL_RECALC')),
    cascade_source_indicator_id UUID REFERENCES indicators(id),  -- Si déclenché en cascade (4.4)
    calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, calculated_at)   -- calculated_at inclus : requis par TimescaleDB sur la clé de partition
);

SELECT create_hypertable('indicator_history', 'calculated_at');

CREATE INDEX idx_indicator_history_lookup
    ON indicator_history(indicator_id, period_start, period_end, version DESC);

-- Compression native TimescaleDB (columnstore) : NON ACTIVÉE — incompatibilité
-- confirmée avec la Row Level Security (V021, Chapitre 1.5).
--
-- Une tentative précédente avait commenté ce bloc en supposant qu'il
-- s'agissait d'un problème d'ORDRE d'exécution (« activer la compression
-- après la RLS plutôt qu'avant »), et V021 réactivait la compression en fin
-- de fichier. Ceci a été testé et échoue dans les deux sens :
--   - compression puis ENABLE ROW LEVEL SECURITY  → "operation not supported
--     on hypertables that have columnstore enabled"
--   - RLS puis SET (timescaledb.compress)          → "columnstore cannot be
--     used on table with row security"
-- Il ne s'agit donc PAS d'un problème d'ordonnancement : TimescaleDB interdit
-- structurellement la coexistence de la RLS et du columnstore sur une même
-- hypertable (RLS non propagée aux chunks compressés — voir documentation
-- TimescaleDB, section Hypercore : « ROW LEVEL SECURITY is not supported on
-- chunks in the columnstore »).
--
-- La RLS (Chapitre 1.5) est une exigence de sécurité obligatoire et déjà
-- validée fonctionnellement (isolation cross-tenant, voir README.md) ; la
-- compression n'était qu'une intention non spécifiée du Chapitre 8.4
-- ("bénéficier de la compression native"). En cas de conflit entre les deux,
-- la RLS est conservée et la compression native est abandonnée sur cette
-- table. Bloc supprimé (et non plus commenté "à réactiver plus tard") pour
-- éviter qu'une future migration ne retente l'activation sans redécouvrir ce
-- constat.
--
-- Alternative à évaluer en revue croisée produit/ingénierie si le volume de
-- stockage cible (Chapitre 13.1) rend la compression indispensable :
-- isolation tenant via une vue "security_barrier" filtrée par
-- organization_id (accès applicatif exclusivement via la vue, table de base
-- non accessible directement à app_runtime) plutôt que via la RLS native,
-- ce qui laisserait le columnstore disponible. Non implémenté ici : change
-- le modèle d'accès (vue vs table) et doit être validé avant application en
-- production — voir item 6 des Prochaines Étapes de l'Architecture v2.2.1
-- (« Validation du choix TimescaleDB »).
--
-- ⚠️ DÉCISION TRANCHÉE (revue du 8 juillet 2026) : ce compromis (pas de
-- compression tant que la RLS est active sur cette table) est ASSUMÉ
-- délibérément à ce stade, plutôt que de construire une solution
-- d'archivage ou de basculer vers une vue security_barrier — voir V022 pour
-- la justification complète, le suivi de croissance mis en place, et le
-- seuil explicite qui doit déclencher une réévaluation. Ne pas retirer ce
-- commentaire ni celui de V022 sans mettre à jour les deux en cohérence.

-- Continuous aggregate — alimente les dashboards (Chapitre 9) avec une
-- vue pré-agrégée quotidienne par indicateur, sans recalcul à la volée.
-- Mentionné au Chapitre 8.4 ("continuous aggregates pour les dashboards")
-- mais non spécifié ; définition minimale ajoutée ici comme point de départ.
CREATE MATERIALIZED VIEW indicator_history_daily
WITH (timescaledb.continuous) AS
SELECT
    indicator_id,
    time_bucket('1 day', calculated_at) AS day,
    LAST(value, calculated_at) AS last_value,
    COUNT(*) AS update_count
FROM indicator_history
GROUP BY indicator_id, day
WITH NO DATA;

SELECT add_continuous_aggregate_policy('indicator_history_daily',
    start_offset => INTERVAL '3 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

-- ----------------------------------------------------------------------------
-- Table: indicator_values (vue de lecture rapide — dernière version par période)
-- Alimentée UNIQUEMENT par le trigger ci-dessous ; jamais écrite directement
-- par le CalculationEngine (qui écrit dans indicator_history).
-- ----------------------------------------------------------------------------

CREATE TABLE indicator_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    indicator_id UUID NOT NULL REFERENCES indicators(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    value DECIMAL(15,2) NOT NULL,
    target_value DECIMAL(15,2),
    baseline_value DECIMAL(15,2),
    data_source_batch_id UUID REFERENCES data_batches(id),
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(indicator_id, period_start, period_end)
);

CREATE INDEX idx_indicator_values_period ON indicator_values(indicator_id, period_start, period_end);

-- Trigger : maintient indicator_values ("dernière version") à jour après
-- chaque insertion dans indicator_history. INSERT-only, jamais d'UPDATE/DELETE
-- sur indicator_history (immuabilité BR-01).
CREATE OR REPLACE FUNCTION fn_refresh_indicator_values()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO indicator_values (indicator_id, period_start, period_end, value, target_value, baseline_value, data_source_batch_id, calculated_at)
    VALUES (NEW.indicator_id, NEW.period_start, NEW.period_end, NEW.value, NEW.target_value, NEW.baseline_value, NEW.data_source_batch_id, NEW.calculated_at)
    ON CONFLICT (indicator_id, period_start, period_end)
    DO UPDATE SET value = EXCLUDED.value, target_value = EXCLUDED.target_value,
        baseline_value = EXCLUDED.baseline_value, data_source_batch_id = EXCLUDED.data_source_batch_id,
        calculated_at = EXCLUDED.calculated_at;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_indicator_history_insert
    AFTER INSERT ON indicator_history
    FOR EACH ROW EXECUTE FUNCTION fn_refresh_indicator_values();

-- Garde-fou d'immuabilité (BR-01) : interdit explicitement tout UPDATE/DELETE
-- applicatif sur indicator_history, y compris par erreur de code, en plus de
-- la restriction de permission au niveau rôle (V021). Absent du document
-- source, ajouté pour rendre BR-01 non contournable au niveau base de données.
CREATE OR REPLACE FUNCTION fn_prevent_indicator_history_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'indicator_history est immuable (BR-01) : UPDATE/DELETE interdits. Utiliser une nouvelle insertion versionnée.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_indicator_history_no_update
    BEFORE UPDATE OR DELETE ON indicator_history
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_indicator_history_mutation();