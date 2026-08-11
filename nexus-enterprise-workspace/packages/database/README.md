# Nexus Enterprise Workspace (NEW) — Database Migrations

This directory is prepared to receive versioned PostgreSQL migration scripts (Flyway naming convention `V{num}__description.sql`) following the architecture detailed in the specifications.

## Planned Migration Order & Schema Architecture

The migration sequence is designed to respect all relational foreign key constraints and implements advanced features like Row Level Security (RLS) and TimescaleDB hypertables.

| Migration File | Target Schema / Table | Chapitre Source | Details |
|---|---|---|---|
| `V001__extensions.sql` | PostgreSQL Extensions | Transverse | Enables `pgcrypto`, `uuid-ossp`, `pgvector`, and `timescaledb` |
| `V002__organizations.sql` | `organizations` | 1.4 | Core multi-tenant organization container |
| `V003__users_iam.sql` | `users`, `refresh_tokens`, `login_attempts` | 2.5 | User account and IAM basics |
| `V004__org_members_invites.sql` | `organization_users`, `invitations` | 1.4 | Tenant associations and signed signup flows |
| `V005__projects.sql` | `projects` | PRD §11.2 | Reconstructed project definitions |
| `V006__data_sources_jobs.sql` | `data_sources`, `sync_jobs` | 3.5 | Ingestion pipelines configuration and telemetry |
| `V007__data_batches_mapping.sql` | `data_batches`, `mapping_templates` | 3.5 | Smart mapping configuration and landing zones |
| `V008__logical_frameworks.sql` | `logical_frameworks`, `indicators` | 4.3 | Impact, Outcomes, Outputs, and Activities DAG |
| `V009__approvals_notifs.sql` | `approval_history`, `notification_preferences` | 5.4 | Audit trails for human-in-the-loop actions |
| `V010__chat_alerts.sql` | `chat_threads`, `chat_messages`, `alerts` | 6.4 | Contextual chat channels and automated alerts |
| `V011__ai_rag.sql` | `ai_documents`, `document_chunks`, `ai_proposals` | 7.4 | Vector storage and smart proposals (RAG) |
| `V012__ai_cleaning.sql` | `ai_cleaning_jobs`, `ai_usage_logs` | 7.4 | AI pipeline telemetry and token accounting |
| `V013__reports.sql` | `reports`, `report_templates` | 8.4 | PDF/DOCX templates and output history |
| `V014__indicator_history.sql` | `indicator_history`, `indicator_values` | 8.4 | TimescaleDB hypertable for metrics, trigger for immuabilité |
| `V015__dashboards.sql` | `dashboards`, `dashboard_shares` | 9.4 | Visual workspace layout and secure shares |
| `V016__exports_shares.sql` | `export_jobs`, `shared_links`, `shared_link_logs` | 11.4 | Safe file egress and shared portal management |
| `V017__audit_logs.sql` | `audit_logs`, `event_store` | 12.3 | Forensic audit trails and immutable events |
| `V018__deletion_requests.sql` | `deletion_requests` | 12.4 | GDPR right-to-be-forgotten deletion queues |
| `V019__offline_sync.sql` | `sync_queue`, `sync_conflicts` | 14.4 | Offline-first syncing conflict resolution queues |
| `V020__billing_subs.sql` | `subscriptions`, `usage_quotas`, `invoices` | 15.4 | Stripe subscriptions, usage, and invoices |
| `V021__row_level_security.sql` | Multi-Tenant RLS Policies | 1.5 | Row Level Security & column store optimization overrides |
| `V022__monitoring_views.sql` | Database Monitoring Views | - | `indicator_history_storage_stats` to track disk footprint |

---

## Technical Notes

### 1. Row Level Security (RLS) vs TimescaleDB Columnstore
As noted in the architectural review, TimescaleDB does not support the coexistence of Row Level Security (RLS) and native columnstore compression on the same hypertable. Therefore, for `indicator_history`, **RLS takes precedence** for multi-tenant safety, and compression has been abandoned. A dedicated view `indicator_history_storage_stats` is created in `V022` to monitor this growth.

### 2. Dénormalisation
To optimize RLS checks on the high-throughput `indicator_history` and `indicator_values` tables, `organization_id` is denormalized directly on these tables (instead of traversing three joins), preventing query degradation.
