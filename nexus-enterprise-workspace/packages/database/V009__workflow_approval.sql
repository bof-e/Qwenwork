-- ============================================================================
-- V009 — Workflow d'approbation
-- Référence : Spécifications Fonctionnelles v2.2, Chapitre 5.4
-- ============================================================================

CREATE TABLE approval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_batch_id UUID NOT NULL REFERENCES data_batches(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL
        CHECK (action IN ('SUBMITTED', 'APPROVED', 'REJECTED')),
    performed_by_user_id UUID NOT NULL REFERENCES users(id),
    comment TEXT,
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_approval_history_batch ON approval_history(data_batch_id, created_at);

-- Table: notification_preferences
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL
        CHECK (notification_type IN ('BATCH_SUBMITTED', 'BATCH_APPROVED', 'ALERT_TRIGGERED')),
    channel VARCHAR(20) NOT NULL
        CHECK (channel IN ('EMAIL', 'IN_APP', 'WEBHOOK')),
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, project_id, notification_type, channel)
);
