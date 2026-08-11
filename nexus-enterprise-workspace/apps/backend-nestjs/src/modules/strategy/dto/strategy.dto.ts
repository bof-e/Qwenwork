import { IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateLogicalFrameworkNodeDto {
  @IsUUID()
  project_id!: string;

  @IsIn(['IMPACT', 'OUTCOME', 'OUTPUT', 'ACTIVITY', 'INPUT'])
  level!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  parent_id?: string;

  @IsOptional()
  @IsInt()
  order_index?: number;
}

export class CreateIndicatorDto {
  @IsUUID()
  framework_id!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  unit?: string;

  // Catalogue simplifié — à aligner sur Specs Chapitre 4.4 (catalogue complet des formules).
  @IsIn(['SUM', 'AVERAGE', 'COUNT', 'LATEST', 'MANUAL'])
  formula_type!: string;

  @IsOptional()
  @IsObject()
  formula_params?: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  target_value?: number;

  @IsOptional()
  @IsNumber()
  baseline_value?: number;

  @IsOptional()
  @IsString()
  periodicity?: string;
}

export class ApproveDataBatchDto {
  @IsOptional()
  @IsString()
  comment?: string;
}

export class RejectDataBatchDto {
  @IsString()
  rejection_reason!: string;
}
