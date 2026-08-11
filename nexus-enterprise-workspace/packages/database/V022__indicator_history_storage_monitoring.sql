-- ============================================================================
-- V022 — Suivi de croissance de indicator_history & seuil de réévaluation
-- Référence : décision prise en revue d'équipe le 8 juillet 2026, suite à
-- l'incompatibilité structurelle entre Row Level Security et compression
-- native TimescaleDB (columnstore) découverte lors de l'exécution de V021
-- sur indicator_history — voir le commentaire détaillé dans V014, section
-- "Compression native TimescaleDB (columnstore) : NON ACTIVÉE".
--
-- ⚠️ CONTEXTE — POURQUOI CE FICHIER EXISTE
-- indicator_history est une table insert-only et immuable par design (BR-01,
-- V014) : elle ne rétrécit jamais, à un rythme de jusqu'à 50 000
-- écritures/jour/tenant en pointe (Chapitre 13.1). Sans compression native
-- (abandonnée au profit de la RLS, exigence non négociable du Chapitre 1.5),
-- son volume disque croît de manière quasi linéaire avec le temps ET avec le
-- nombre de tenants actifs, sans jamais se stabiliser. Concrètement : le
-- coût d'infrastructure marginal par tenant augmente avec son ancienneté sur
-- la plateforme, un paramètre qui n'est actuellement modélisé nulle part
-- dans la facturation (V020, subscriptions/usage_quotas/invoices).
--
-- DÉCISION RETENUE : assumer ce compromis à court terme plutôt que de
-- construire immédiatement une solution d'archivage (chunks anciens vers une
-- hypertable froide compressée, hors chemin RLS interactif) ou de remplacer
-- la RLS native par une vue security_barrier (qui réintroduirait un risque
-- de contournement sur les accès SQL directs, contraire à l'exigence testée
-- M1-T02). Construire l'archivage maintenant reviendrait à optimiser un
-- problème non mesuré : aucune donnée réelle de croissance n'existe encore
-- à ce stade du projet. C'est une décision délibérément réversible : le
-- risque assumé est un surcoût de stockage à court terme, borné par le
-- suivi ci-dessous — PAS un oubli.
--
-- SEUIL DE RÉÉVALUATION — à respecter impérativement : revisiter ce choix
-- (cf. alternative d'archivage documentée dans V014) dès que L'UNE de ces
-- deux conditions est atteinte, la première déclenchant :
--   1. la taille de indicator_history (voir vue ci-dessous) dépasse le
--      seuil défini avec l'équipe produit selon le budget infra (à chiffrer
--      — non fixé dans cette migration, volontairement : le chiffrer ici
--      sans données réelles serait arbitraire) ;
--   2. OU le test de charge dédié déjà prévu (README.md, Plan de Tests,
--      section Performance) est atteint dans le calendrier projet.
-- ============================================================================

-- Vue de suivi — coût de lecture volontairement faible, pensée pour un appel
-- périodique (job planifié externe : cron, pg_cron, ou étape d'un pipeline
-- de monitoring existant — NON embarqué ici pour ne pas complexifier
-- prématurément le schéma sur une hypothèse non mesurée, cf. décision
-- ci-dessus). Utilise les fonctions TimescaleDB approximatives et cachées
-- (hypertable_approximate_size, approximate_row_count) plutôt que
-- pg_total_relation_size / COUNT(*), qui impliqueraient un scan complet —
-- précisément le genre de coût qu'on cherche à éviter sur une table conçue
-- pour ne faire que croître.
CREATE OR REPLACE VIEW indicator_history_storage_stats AS
SELECT
    now() AS measured_at,
    pg_size_pretty(hypertable_approximate_size('indicator_history')) AS total_size_pretty,
    hypertable_approximate_size('indicator_history') AS total_size_bytes,
    approximate_row_count('indicator_history') AS row_count_approx,
    (SELECT count(*) FROM timescaledb_information.chunks
        WHERE hypertable_name = 'indicator_history') AS chunk_count;

COMMENT ON VIEW indicator_history_storage_stats IS
    'Suivi de la croissance de indicator_history, non compressée par choix documenté (V014, V022 — revue du 8 juillet 2026). À interroger périodiquement via un job planifié externe et à comparer au seuil de réévaluation défini dans le commentaire d''en-tête de V022. Ne conserve pas d''historique par elle-même : chaque appel reflète l''état courant ; la tendance dans le temps doit être suivie côté outil de monitoring (Grafana/Datadog ou équivalent) qui échantillonne cette vue régulièrement, pas dans cette base.';

-- Note volontairement absente ici : pas de table d'historique des mesures,
-- pas de job pg_cron embarqué, pas d'alerte. Ajouter cette complexité avant
-- d'avoir un seuil chiffré et un outil de monitoring cible choisi serait de
-- l'anticipation non justifiée — cf. décision ci-dessus. Cette vue est le
-- minimum nécessaire pour que "monitorer" soit vérifiable, pas un système de
-- surveillance complet.
