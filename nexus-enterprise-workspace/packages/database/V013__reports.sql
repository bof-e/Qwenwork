-- ============================================================================
-- V013 — Générateur de rapports institutionnels
-- Référence : Spécifications Fonctionnelles v2.2, Chapitre 8.4 (1/2)
-- ============================================================================

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    report_type VARCHAR(50) NOT NULL
        CHECK (report_type IN ('NARRATIVE', 'FINANCIAL', 'IMPACT')),
    template_id UUID,                    -- Référence logique à report_templates (voir note)
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'GENERATING', 'COMPLETED', 'FAILED')),
    content JSONB,
    file_url VARCHAR(500),
    file_format VARCHAR(20)
        CHECK (file_format IS NULL OR file_format IN ('PDF', 'DOCX')),
    generated_by_user_id UUID NOT NULL REFERENCES users(id),
    generated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reports_project ON reports(project_id, period_start, period_end);

-- Table: report_templates
CREATE TABLE report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_config JSONB NOT NULL,     -- Structure du template (sections, styles)
    is_system_template BOOLEAN NOT NULL DEFAULT FALSE,
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- FK différée : reports.template_id -> report_templates.id. Le document source
-- déclare reports AVANT report_templates sans FK explicite sur template_id ;
-- elle est ajoutée ici maintenant que la table cible existe.
ALTER TABLE reports
    ADD CONSTRAINT fk_reports_template
    FOREIGN KEY (template_id) REFERENCES report_templates(id) ON DELETE SET NULL;
