-- ============================================================================
-- V017 — Journalisation d'audit & event store
-- Référence : Spécifications Fonctionnelles v2.2, Chapitre 12.3
-- Conservation légale 7 ans (BR-05) — voir V021 pour la restriction de
-- permissions qui protège cette rétention au niveau base de données.
-- ============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,   -- 'LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'EXPORT', ...
    entity_type VARCHAR(50),        -- 'project', 'data_batch', 'indicator', etc.
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_org_time ON audit_logs(organization_id, created_at);
CREATE INDEX idx_audit_logs_user_time ON audit_logs(user_id, created_at);

-- Table: event_store (Event Sourcing)
CREATE TABLE event_store (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    event_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    aggregate_id UUID NOT NULL,      -- ID de l'entité concernée
    aggregate_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_event_store_aggregate ON event_store(aggregate_type, aggregate_id, occurred_at);

COMMENT ON TABLE audit_logs IS
    'Conservation 7 ans (BR-05). Export automatique vers S3 Glacier après 30 jours (job planifié, Chapitre 12.2) — hors périmètre SQL, à orchestrer côté infra/BullMQ.';
