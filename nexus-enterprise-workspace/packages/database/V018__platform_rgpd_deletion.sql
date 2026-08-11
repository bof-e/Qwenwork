-- ============================================================================
-- V018 — Droit à l'oubli (RGPD/CCPA)
-- Référence : Spécifications Fonctionnelles v2.2, Chapitre 12.4
-- Reconstruite depuis le document source (paragraphe, non un bloc de code
-- structuré dans l'export d'origine) — champs identiques, mise en forme SQL.
-- ============================================================================

CREATE TABLE deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,    -- NULL si suppression au niveau organisation
    requested_by_user_id UUID NOT NULL REFERENCES users(id),
    reason VARCHAR(50) NOT NULL
        CHECK (reason IN ('SUBSCRIPTION_ENDED', 'USER_REQUEST', 'ADMIN_ACTION')),
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,        -- Date de résiliation/demande + 30 jours (délai de grâce)
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED'
        CHECK (status IN ('SCHEDULED', 'CANCELLED', 'COMPLETED', 'FAILED')),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_deletion_requests_target
        CHECK (organization_id IS NOT NULL OR user_id IS NOT NULL)
);

CREATE INDEX idx_deletion_requests_scheduled
    ON deletion_requests(scheduled_for)
    WHERE status = 'SCHEDULED';

COMMENT ON TABLE deletion_requests IS
    'Job planifié quotidien "data-retention" (BullMQ) sélectionne les lignes SCHEDULED dont scheduled_for <= NOW() et exécute la suppression en cascade décrite au Chapitre 12.4 (anonymisation des champs identifiants, conservation légale des tables sous obligation BR-05).';

COMMENT ON CONSTRAINT chk_deletion_requests_target ON deletion_requests IS
    'Une demande cible une organisation OU un utilisateur (absent du document source, ajouté pour éviter une ligne sans cible).';
