-- ============================================================================
-- V002 — Organisations (tenants)
-- Référence : Spécifications Fonctionnelles v2.2, Chapitre 1.4
-- ============================================================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    industry VARCHAR(50) NOT NULL
        CHECK (industry IN ('Enterprise', 'NGO', 'Consulting', 'Government')),
    subscription_tier VARCHAR(50) NOT NULL DEFAULT 'NGO_Essential'
        CHECK (subscription_tier IN ('NGO_Essential', 'Enterprise_Professional', 'Sovereign')),
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE organizations IS
    'Entité racine du multi-tenant (Chapitre 1.2.1). Toutes les autres ressources en dépendent, directement ou via project_id.';
