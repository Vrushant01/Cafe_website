import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TablesService } from './tables.service';
import { ForceVacateDto, ContactManagerAlertDto, AdminRole } from '@chai-partner/shared';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';

@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get()
  async getAllTables() {
    return this.tablesService.getAllTables();
  }

  @Get(':token/resolve')
  async resolveToken(@Param('token') token: string) {
    return this.tablesService.resolveToken(token);
  }

  @Post(':id/force-vacate')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN, AdminRole.CASHIER)
  async forceVacate(
    @Param('id') tableId: string,
    @Body() body: ForceVacateDto,
    @Request() req: any,
  ) {
    const adminId = req.user?.id || 'admin-system';
    const adminName = req.user?.name || 'Staff User';
    return this.tablesService.forceVacate(tableId, body.reason, adminId, adminName);
  }

  @Post('contact-manager')
  async contactManager(@Body() body: ContactManagerAlertDto) {
    return this.tablesService.contactManager(body.table_number, body.message);
  }
}
