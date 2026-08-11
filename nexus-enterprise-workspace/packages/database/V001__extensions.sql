-- ============================================================================
-- V001 — Extensions PostgreSQL requises
-- Référence : Spécifications Fonctionnelles v2.2, principes transverses +
--             Chapitres 3.6 (pgcrypto), 7.4 (pgvector), 8.4 (TimescaleDB)
-- ============================================================================
-- Ordre de préséance : timescaledb DOIT être chargée avant toute création de
-- hypertable (V014). pgvector est requise par document_chunks.embedding_vector
-- (V011, RAG). pgcrypto fournit gen_random_uuid() et pgp_sym_encrypt/decrypt
-- (chiffrement des champs sensibles, BR-02).

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;        -- pgvector — Chapitre 7.4 (embeddings RAG)
CREATE EXTENSION IF NOT EXISTS timescaledb;   -- Chapitre 8.4 (indicator_history hypertable)

-- Note infrastructure : sur AWS RDS/Aurora, timescaledb n'est pas disponible en
-- extension managée à ce jour — une instance EC2/EKS auto-gérée ou Timescale
-- Cloud est requise si ce choix (PRD §11.1, Specs §8.4) est confirmé en
-- Sprint 1 (cf. Architecture v2.2.1, Prochaines Étapes #6).
