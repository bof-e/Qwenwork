-- ============================================================================
-- V016 — Exportation & partage externe
-- Référence : Spécifications Fonctionnelles v2.2, Chapitre 11.4
-- ============================================================================

CREATE TABLE export_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('dashboard', 'report')),
    entity_id UUID NOT NULL,
    requested_by_user_id UUID NOT NULL REFERENCES users(id),
    format VARCHAR(20) NOT NULL CHECK (format IN ('PDF', 'EXCEL', 'CSV', 'PPTX', 'PNG')),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    file_url VARCHAR(500),
    error_message TEXT,
    config JSONB,             -- Paramètres d'export
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_export_jobs_entity ON export_jobs(entity_type, entity_id);

-- Table: shared_links
CREATE TABLE shared_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),           -- NULL si pas de mot de passe
    expires_at TIMESTAMP WITH TIME ZONE,
    access_count INT NOT NULL DEFAULT 0,
    max_access_count INT,                 -- NULL = illimité
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shared_links_entity ON shared_links(entity_type, entity_id);

-- Table: shared_link_access_logs
CREATE TABLE shared_link_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shared_link_id UUID NOT NULL REFERENCES shared_links(id) ON DELETE CASCADE,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_shared_link_access_logs_link ON shared_link_access_logs(shared_link_id, accessed_at);

-- Table: scheduled_exports
CREATE TABLE scheduled_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID REFERENCES dashboards(id) ON DELETE CASCADE,
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    schedule VARCHAR(50) NOT NULL,        -- Cron expression
    formats JSONB NOT NULL,               -- ['PDF', 'EXCEL']
    recipients JSONB NOT NULL,            -- ['email1@example.com', 'email2@example.com']
    next_run_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_scheduled_exports_target
        CHECK (dashboard_id IS NOT NULL OR report_id IS NOT NULL)
);

CREATE INDEX idx_scheduled_exports_next_run ON scheduled_exports(next_run_at) WHERE is_active;

COMMENT ON CONSTRAINT chk_scheduled_exports_target ON scheduled_exports IS
    'Un export planifié cible un dashboard OU un rapport (absent du document source, ajouté pour éviter une ligne sans cible).';
