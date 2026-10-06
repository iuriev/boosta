import { Controller, Get } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionUser } from '../auth/session';
import { ReportDto } from './dto/report.dto';
import { ReportService } from './report.service';

@ApiTags('report')
@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  // No identifier is accepted: the report is always the caller's own.
  @Get()
  @ApiCookieAuth()
  @ApiOperation({
    summary: "The signed-in user's report, built from their most recently submitted attempt.",
  })
  @ApiOkResponse({ type: ReportDto })
  @ApiUnauthorizedResponse({ description: 'No valid session' })
  @ApiNotFoundResponse({ description: 'The user has not taken the quiz yet (REPORT_NOT_FOUND)' })
  getReport(@CurrentUser() user: SessionUser): Promise<ReportDto> {
    return this.reportService.getForUser(user.id);
  }
}
