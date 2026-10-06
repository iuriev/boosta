import { Module } from '@nestjs/common';

import { AttemptsModule } from '../attempts/attempts.module';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';

@Module({
  imports: [AttemptsModule],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
