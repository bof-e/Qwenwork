-- ============================================================================
-- V005 — Projets
-- Référence : PRD v2.0 §11.2 (définition d'origine) ; référencée par
-- project_id (FK) dans data_sources, logical_frameworks, data_batches,
-- ai_documents, reports, dashboards, sync_queue, etc. dans les Specs v2.2,
-- MAIS jamais redéfinie par un CREATE TABLE dans ce document — l'édition 2.2
-- présuppose son existence.
--
-- Adaptation par rapport à la version PRD §11.2 :
--   - `workspace_id UUID` (PRD) renommé/remplacé par `organization_id`, pour
--     rester cohérent avec le modèle de tenant à un seul niveau utilisé
--     partout ailleurs dans les Specs v2.2 (organization_id, pas workspace_id).
--   - `status ENUM(...)` (PRD, syntaxe non-standard) converti en
--     VARCHAR + CHECK, pour suivre la convention adoptée par tout le reste
--     du schéma Specs v2.2 (voir organizations.industry, users.sso_provider).
--   - Ajout de created_at/updated_at et gen_random_uuid(), par cohérence avec
--     toutes les autres tables du schéma.
-- À valider en revue croisée produit/ingénierie (Architecture v2.2.1, item 1
-- des Prochaines Étapes) avant le Sprint 1.
-- ============================================================================

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    budget_total DECIMAL(15,2),
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    status VARCHAR(20) NOT NULL DEFAULT 'Draft'
        CHECK (status IN ('Draft', 'Active', 'Closed', 'Suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_projects_organization ON projects(organization_id);
