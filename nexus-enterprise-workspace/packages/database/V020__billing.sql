-- ============================================================================
-- V020 — Facturation & abonnement
-- Référence : Spécifications Fonctionnelles v2.2, Chapitre 15.4
-- ============================================================================

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    tier VARCHAR(50) NOT NULL
        CHECK (tier IN ('NGO_Essential', 'Enterprise_Professional', 'Sovereign')),
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'MONTHLY'
        CHECK (billing_cycle IN ('MONTHLY', 'ANNUAL')),
    plan_config JSONB NOT NULL,    -- Quotas inclus, connecteurs, overage_policy
    external_customer_id VARCHAR(100),   -- ID chez le fournisseur de paiement (ex. Stripe)
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'PAST_DUE', 'CANCELLED')),
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    subscription_ended_at TIMESTAMP WITH TIME ZONE,   -- Alimente deletion_requests (12.4)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_organization ON subscriptions(organization_id);
CREATE UNIQUE INDEX idx_subscriptions_active_per_org
    ON subscriptions(organization_id) WHERE status = 'ACTIVE';

-- Table: usage_quotas (Compteurs de consommation par période)
CREATE TABLE usage_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    quota_type VARCHAR(50) NOT NULL
        CHECK (quota_type IN ('AI_REPORT', 'AI_CLEANING', 'DATA_VOLUME_MB')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    included_amount DECIMAL(15,2) NOT NULL,
    consumed_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    UNIQUE(organization_id, quota_type, period_start, period_end)
);

-- Table: invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    base_amount DECIMAL(15,2) NOT NULL,     -- Socle par siège
    overage_amount DECIMAL(15,2) NOT NULL DEFAULT 0,   -- Dépassements d'usage
    total_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PAID', 'FAILED')),
    external_invoice_id VARCHAR(100),   -- ID chez le fournisseur de paiement
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_invoices_organization ON invoices(organization_id, period_start);

COMMENT ON INDEX idx_subscriptions_active_per_org IS
    'Garantit au plus une souscription ACTIVE par organisation à un instant T (absent du document source, ajouté pour éviter une ambiguïté de facturation).';
