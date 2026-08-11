export const QUEUE_DATA_INGESTION = 'data-ingestion';
export const QUEUE_EXPORTS = 'exports';

export interface SyncJobPayload {
  syncJobId: string;
  dataSourceId: string;
}

export interface ExportJobPayload {
  exportJobId: string;
  entityType: 'dashboard' | 'report';
  entityId: string;
  format: string;
}
