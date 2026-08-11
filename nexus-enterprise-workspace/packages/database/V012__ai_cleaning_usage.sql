-- ============================================================================
-- V012 — Nettoyage IA & suivi de consommation
-- Référence : Spécifications Fonctionnelles v2.2, Chapitre 7.4
-- ai_usage_logs sert aussi de base au suivi des quotas de facturation
-- (Chapitre 15.2.2, voir V020) et transporte la locale de génération pour le
-- multilinguisme (Chapitre 13.4).
-- ============================================================================

CREATE TABLE ai_cleaning_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_batch_id UUID NOT NULL REFERENCES data_batches(id) ON DELETE CASCADE,
    model_used VARCHAR(50) NOT NULL
        CHECK (model_used IN ('gemini-pro', 'claude-3.5-sonnet')),
    input_data JSONB NOT NULL,
    output_data JSONB,
    suggestions JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    tokens_used INT,
    cost_usd DECIMAL(10,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_ai_cleaning_jobs_batch ON ai_cleaning_jobs(data_batch_id);

-- Table: ai_usage_logs (Audit & Cost tracking)
CREATE TABLE ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    endpoint VARCHAR(100) NOT NULL,
    model VARCHAR(50) NOT NULL,
    tokens_input INT,
    tokens_output INT,
    cost_usd DECIMAL(10,4),
    anonymized BOOLEAN NOT NULL DEFAULT TRUE,     -- BR-03 — doit rester TRUE en usage nominal
    locale VARCHAR(10) NOT NULL DEFAULT 'fr'
        CHECK (locale IN ('fr', 'en', 'es', 'ar')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_usage_logs_org_time ON ai_usage_logs(organization_id, created_at);

COMMENT ON COLUMN ai_usage_logs.anonymized IS
    'BR-03 : doit être TRUE pour tout appel à un fournisseur externe (Gemini/Claude). Un enregistrement FALSE est une non-conformité à investiguer (voir M5-T05 dans le Plan de Tests).';
