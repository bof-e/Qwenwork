-- ============================================================================
-- V004 — Appartenance aux organisations & invitations
-- Référence : Spécifications Fonctionnelles v2.2, Chapitre 1.4
-- ============================================================================

CREATE TABLE organization_users (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL
        CHECK (role IN ('Owner', 'Executive', 'Manager', 'Analyst', 'Viewer')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, organization_id)
);

COMMENT ON TABLE organization_users IS
    'Un User peut appartenir à plusieurs Organizations, avec un rôle distinct par organisation (Chapitre 1.2.3 — cas d''usage : consultant multi-clients).';

-- Table: invitations
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL
        CHECK (role IN ('Owner', 'Executive', 'Manager', 'Analyst', 'Viewer')),
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,   -- 72h (Chapitre 1.3)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note : un index partiel `WHERE expires_at > NOW()` est impossible en
-- PostgreSQL (NOW() est STABLE, pas IMMUTABLE — rejeté par le planificateur
-- d'index). La dédoublonnage des invitations actives est donc appliqué côté
-- service (vérification `SELECT ... WHERE expires_at > NOW()` avant INSERT),
-- comme documenté dans le contrat POST /organizations/{orgId}/users/invite
-- de la spécification OpenAPI (409 si déjà membre ou déjà invité).
CREATE INDEX idx_invitations_org_email ON invitations(organization_id, email, expires_at);
