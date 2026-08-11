import { Module } from '@nestjs/common';
import { AuditController, BillingController, GdprController } from './platform.controller';
import { GdprPurgeService } from './gdpr-purge.service';

@Module({
  controllers: [AuditController, BillingController, GdprController],
  providers: [GdprPurgeService],
})
export class PlatformModule {}
