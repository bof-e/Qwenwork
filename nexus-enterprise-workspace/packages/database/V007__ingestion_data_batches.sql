-- ============================================================================
-- V007 — Lots de données & modèles de mapping
-- Référence : Spécifications Fonctionnelles v2.2, Chapitre 3.5
-- BR-02 (chiffrement des champs sensibles) : voir sensitive_fields_encrypted
-- et sensitive_fields_key_id ci-dessous, détaillés au Chapitre 3.6.
-- ============================================================================

CREATE TABLE data_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_job_id UUID REFERENCES sync_jobs(id) ON DELETE SET NULL,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    raw_payload JSONB NOT NULL,                  -- Exclut les champs identifiants (BR-02)
    sensitive_fields_encrypted BYTEA,             -- pgp_sym_encrypt(), clé issue de KMS (BR-02)
    sensitive_fields_key_id VARCHAR(100),         -- Référence à la clé KMS utilisée (rotation)
    cleaned_payload JSONB,
    cleaning_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (cleaning_status IN ('PENDING', 'CLEANED', 'FLAGGED', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED')),
    validation_errors JSONB,
    cleaning_suggestions JSONB,                   -- Suggestions de l'IA (7.2.2)
    submitted_by_user_id UUID REFERENCES users(id),
    submitted_at TIMESTAMP WITH TIME ZONE,
    approved_by_user_id UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note d'harmonisation : le Chapitre 5.2.1 liste les statuts
-- PENDING/CLEANED/SUBMITTED/IN_REVIEW/APPROVED/REJECTED (workflow d'approbation),
-- tandis que le Chapitre 3.5 liste PENDING/CLEANED/FLAGGED/APPROVED/REJECTED
-- (pipeline d'ingestion). Le CHECK ci-dessus est l'union des deux ensembles ;
-- à trancher explicitement en Sprint 1 (état canonique unique recommandé).

CREATE INDEX idx_data_batches_project_status ON data_batches(project_id, cleaning_status);
CREATE INDEX idx_data_batches_sync_job ON data_batches(sync_job_id);

-- Table: mapping_templates (Smart Mapping — Chapitre 3.2.3)
CREATE TABLE mapping_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    mapping_config JSONB NOT NULL,     -- { "source_column": "target_field" }
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_mapping_templates_source ON mapping_templates(data_source_id) WHERE is_active;
