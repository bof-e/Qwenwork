-- ============================================================================
-- V010 — Communication contextuelle (chat & alertes)
-- Référence : Spécifications Fonctionnelles v2.2, Chapitre 6.4
-- ============================================================================

CREATE TABLE chat_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL
        CHECK (entity_type IN ('project', 'indicator', 'data_batch')),
    entity_id UUID NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_threads_entity ON chat_threads(entity_type, entity_id);
CREATE INDEX idx_chat_threads_organization ON chat_threads(organization_id);

-- Table: chat_messages
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_system_message BOOLEAN NOT NULL DEFAULT FALSE,   -- Messages du bot Nexus AI (alertes)
    mentions JSONB,           -- ['user_id1', 'user_id2']
    attachments JSONB,        -- Liste des fichiers attachés
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_thread ON chat_messages(thread_id, created_at);

-- Table: message_edits (Historique — WORM, Chapitre 6.2.3)
CREATE TABLE message_edits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    old_content TEXT NOT NULL,
    new_content TEXT NOT NULL,
    edited_by_user_id UUID NOT NULL REFERENCES users(id),
    edited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: alerts
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID REFERENCES chat_threads(id) ON DELETE SET NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    alert_type VARCHAR(50) NOT NULL
        CHECK (alert_type IN ('THRESHOLD_EXCEEDED', 'ANOMALY_DETECTED', 'DATA_QUALITY')),
    severity VARCHAR(20) NOT NULL
        CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
    message TEXT NOT NULL,
    metadata JSONB,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_by_user_id UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_alerts_entity ON alerts(entity_type, entity_id);
CREATE INDEX idx_alerts_unresolved ON alerts(is_resolved) WHERE NOT is_resolved;

COMMENT ON TABLE alerts IS
    'Déclenchement automatique par le module Nexus AI en cas de franchissement de seuil (Chapitre 6.2.2). Critère US-08 : discussion créée en moins de 5 minutes après détection.';
