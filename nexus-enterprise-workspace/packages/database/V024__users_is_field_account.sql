-- ============================================================================
-- V024 — users.is_field_account (débloque le scope JWT field_sync, Specs §2.2.4)
-- ============================================================================
-- TODO ouvert depuis le module IAM (M1, instructions/00 et auth.service.ts) :
-- le scope "field_sync" était codé pour toujours renvoyer un tableau vide,
-- faute de colonne pour distinguer un compte de collecte terrain. Cette
-- migration ajoute la colonne ; auth.service.ts est mis à jour dans la même
-- passe pour la lire réellement au login/register.

ALTER TABLE users ADD COLUMN is_field_account BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN users.is_field_account IS
    'Compte de collecte terrain (Specs §2.2.4) — accorde le scope JWT field_sync indépendamment du rôle RBAC de base, pour les endpoints /sync/*.';
