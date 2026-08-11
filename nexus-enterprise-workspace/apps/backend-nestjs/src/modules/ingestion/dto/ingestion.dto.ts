import { IsArray, IsIn, IsObject, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDataSourceDto {
  @IsUUID()
  project_id!: string;

  @IsIn(['KOBOTOOLBOX', 'SHAREPOINT', 'GOOGLE_DRIVE', 'S3', 'FILE_UPLOAD'])
  source_type!: string;

  @IsObject()
  configuration!: Record<string, unknown>;
}

class SyncBatchItemDto {
  @IsUUID()
  client_uuid!: string;

  @IsUUID()
  form_id!: string;

  @IsObject()
  payload!: Record<string, unknown>;

  @IsString()
  created_offline_at!: string;
}

export class SyncPushDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncBatchItemDto)
  @MaxLength(50)
  batches!: SyncBatchItemDto[];
}

export class ResolveSyncConflictDto {
  @IsIn(['KEEP_LOCAL', 'KEEP_SERVER', 'MERGED'])
  resolution!: string;

  @IsOptional()
  @IsObject()
  merged_payload?: Record<string, unknown>;
}
