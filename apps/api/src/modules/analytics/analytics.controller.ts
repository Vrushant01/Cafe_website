import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { AdminRole, IAnalyticsOverview } from '@chai-partner/shared';

@Controller('admin/analytics')
@UseGuards(AdminAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  @Roles(AdminRole.ADMIN)
  async getAnalytics(
    @Query('range') range?: 'day' | 'week' | 'month' | 'year' | 'all',
  ): Promise<IAnalyticsOverview> {
    return this.analyticsService.getAnalytics(range || 'day');
  }
}
