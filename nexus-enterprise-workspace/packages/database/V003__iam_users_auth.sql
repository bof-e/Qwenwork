-- ============================================================================
-- V003 — Utilisateurs & authentification
-- Référence : Spécifications Fonctionnelles v2.2, Chapitre 2.5
-- Note d'ordonnancement : dans le document source, ces tables apparaissent au
-- Chapitre 2 (après organization_users du Chapitre 1.4), mais organization_users
-- référence users(id) par clé étrangère. Cette migration est donc appliquée
-- AVANT V004 (organization_users) pour respecter les contraintes FK.
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),                    -- NULL si SSO uniquement
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_sso_user BOOLEAN NOT NULL DEFAULT FALSE,
    sso_provider VARCHAR(50)
        CHECK (sso_provider IS NULL OR sso_provider IN ('google', 'microsoft', 'saml')),
    sso_provider_id VARCHAR(255),
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    backup_codes JSONB,                             -- Liste des codes de récupération MFA
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_users_auth_method
        CHECK (password_hash IS NOT NULL OR is_sso_user = TRUE)
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id) WHERE revoked_at IS NULL;

-- Table: login_attempts (Rate limiting — Chapitre 2.4 : 5 échecs / 15 min)
CREATE TABLE login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    ip_address INET,
    success BOOLEAN NOT NULL,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_login_attempts_email_time ON login_attempts(email, attempted_at);

COMMENT ON CONSTRAINT chk_users_auth_method ON users IS
    'Renforce la règle 2.2.1 : un compte a soit un mot de passe, soit une origine SSO — jamais aucun des deux (absent du document source, ajouté par cohérence).';
