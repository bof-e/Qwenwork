-- ============================================================================
-- V011 — Nexus AI Core : ingestion documentaire (RAG)
-- Référence : Spécifications Fonctionnelles v2.2, Chapitre 7.4
-- Dépend de l'extension pgvector (V001).
-- ============================================================================

CREATE TABLE ai_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL
        CHECK (file_type IN ('PDF', 'DOCX')),
    file_size BIGINT,
    processing_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (processing_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    chunk_count INT NOT NULL DEFAULT 0,
    uploaded_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_documents_project ON ai_documents(project_id);

-- Table: document_chunks
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES ai_documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    embedding_vector VECTOR(1536),    -- pgvector — Google/Gemini Embeddings (7.2.1)
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_document_chunks_document ON document_chunks(document_id);

-- Index de similarité vectorielle (IVFFlat) — requis pour des requêtes RAG
-- performantes à l'échelle ; absent du document source, ajouté par nécessité
-- opérationnelle. `lists` à recalibrer selon le volume réel de chunks.
CREATE INDEX idx_document_chunks_embedding ON document_chunks
    USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);

-- Table: ai_proposals (Propositions de cadre logique — 7.2.1)
CREATE TABLE ai_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    document_id UUID REFERENCES ai_documents(id) ON DELETE SET NULL,
    proposal_type VARCHAR(50) NOT NULL
        CHECK (proposal_type IN ('LOGICAL_FRAMEWORK', 'INDICATORS')),
    proposal_data JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'ACCEPTED', 'MODIFIED', 'REJECTED')),
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_proposals_project ON ai_proposals(project_id, status);
