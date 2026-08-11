-- ============================================================================
-- V006 — Hub de connecteurs : sources de données & jobs de synchronisation
-- Référence : Spécifications Fonctionnelles v2.2, Chapitre 3.5
-- ============================================================================

CREATE TABLE data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) NOT NULL
        CHECK (source_type IN ('KOBOTOOLBOX', 'SHAREPOINT', 'GOOGLE_DRIVE', 'S3', 'FILE_UPLOAD')),
    configuration JSONB NOT NULL,           -- Credentials et config spécifique au type (3.2.2)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_data_sources_project ON data_sources(project_id);
CREATE INDEX idx_data_sources_organization ON data_sources(organization_id);

-- Table: sync_jobs
CREATE TABLE sync_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    rows_processed INT NOT NULL DEFAULT 0,
    error_message TEXT,
    metadata JSONB,                          -- Statistiques détaillées du sync
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sync_jobs_source_status ON sync_jobs(data_source_id, status);

COMMENT ON TABLE sync_jobs IS
    'Orchestré via la queue BullMQ "data-ingestion" (Chapitre 3.2.1). Traitement asynchrone obligatoire au-delà de 10 000 lignes (Chapitre 3.4).';
