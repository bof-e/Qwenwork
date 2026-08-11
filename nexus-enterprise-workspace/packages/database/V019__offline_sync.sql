-- ============================================================================
-- V019 — Synchronisation Offline-First & PWA Terrain
-- Référence : Spécifications Fonctionnelles v2.2, Chapitre 14.4
-- ============================================================================

CREATE TABLE sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_uuid UUID NOT NULL,     -- Généré côté client, garantit l'idempotence
    user_id UUID NOT NULL REFERENCES users(id),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    data_batch_id UUID REFERENCES data_batches(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'RECEIVED'
        CHECK (status IN ('RECEIVED', 'PROCESSED', 'CONFLICT', 'FAILED')),
    created_offline_at TIMESTAMP WITH TIME ZONE NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_uuid)
);

CREATE INDEX idx_sync_queue_project_status ON sync_queue(project_id, status);

-- Table: sync_conflicts
CREATE TABLE sync_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_queue_id UUID NOT NULL REFERENCES sync_queue(id) ON DELETE CASCADE,
    conflict_type VARCHAR(50) NOT NULL
        CHECK (conflict_type IN ('DUPLICATE_SUBMISSION', 'CONCURRENT_EDIT')),
    local_payload JSONB NOT NULL,
    server_payload JSONB NOT NULL,
    resolution VARCHAR(20)
        CHECK (resolution IS NULL OR resolution IN ('KEEP_LOCAL', 'KEEP_SERVER', 'MERGED')),
    resolved_payload JSONB,
    resolved_by_user_id UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sync_conflicts_unresolved ON sync_conflicts(sync_queue_id) WHERE resolution IS NULL;

COMMENT ON TABLE sync_conflicts IS
    'Les champs marqués conflict_sensitive (montants, quantités) sont toujours remontés ici plutôt que résolus automatiquement (Chapitre 14.2.3). Toute résolution est journalisée dans audit_logs (action SYNC_CONFLICT_RESOLVED).';
