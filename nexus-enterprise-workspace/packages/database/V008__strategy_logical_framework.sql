-- ============================================================================
-- V008 — Cadre logique & indicateurs
-- Référence : Spécifications Fonctionnelles v2.2, Chapitre 4.3
-- ============================================================================

CREATE TABLE logical_frameworks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    level VARCHAR(50) NOT NULL
        CHECK (level IN ('Impact', 'Outcome', 'Output', 'Activity', 'Input')),
    code VARCHAR(50),                        -- ex: "OUT_1.2"
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES logical_frameworks(id) ON DELETE CASCADE,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_logical_frameworks_project ON logical_frameworks(project_id);
CREATE INDEX idx_logical_frameworks_parent ON logical_frameworks(parent_id);

COMMENT ON TABLE logical_frameworks IS
    'Adjacency List (parent_id). Un parent ne peut être supprimé que si ses enfants sont d''abord supprimés/archivés (Chapitre 4.2.1) — règle applicative, non enforcée par une contrainte SQL native (ON DELETE CASCADE ferait l''inverse). À enforcer côté service.';

-- Table: indicators
CREATE TABLE indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    framework_id UUID NOT NULL REFERENCES logical_frameworks(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50),
    formula_type VARCHAR(50) NOT NULL
        CHECK (formula_type IN ('SUM', 'AVG', 'WEIGHTED_AVG', 'MOVING_ANNUAL_TOTAL', 'CUSTOM_SQL')),
    formula_params JSONB,     -- ex: {"weights": {"region_a": 0.6}} ou {"window_months": 12}
    target_value DECIMAL(15,2),
    baseline_value DECIMAL(15,2),
    periodicity VARCHAR(50)
        CHECK (periodicity IN ('MONTHLY', 'QUARTERLY', 'ANNUAL')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_indicators_framework ON indicators(framework_id);
