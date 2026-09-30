import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TablesService } from './tables.service';
import {
  ForceVacateDto,
  ContactManagerAlertDto,
  CreateTableDto,
  UpdateTableDto,
  DisableTableDto,
  AdminRole,
} from '@chai-partner/shared';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';

@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  // ----------------------------------------------------------------
  // Public-ish (used by QR scan flow — token verification is done in service)
  // ----------------------------------------------------------------

  @Get()
  async getAllTables() {
    return this.tablesService.getAllTables();
  }

  @Get(':token/resolve')
  async resolveToken(@Param('token') token: string) {
    return this.tablesService.resolveToken(token);
  }

  // ----------------------------------------------------------------
  // OWNER-ONLY CRUD endpoints
  // ----------------------------------------------------------------

  @Post()
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN)
  async createTable(@Body() body: CreateTableDto, @Request() req: any) {
    const adminId = req.user?.id || 'admin-system';
    const adminName = req.user?.name || 'Admin';
    return this.tablesService.createTable(body.table_number, body.seat_count, adminId, adminName);
  }

  @Patch(':id')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN)
  async updateTable(
    @Param('id') id: string,
    @Body() body: UpdateTableDto,
    @Request() req: any,
  ) {
    const adminId = req.user?.id || 'admin-system';
    const adminName = req.user?.name || 'Admin';
    return this.tablesService.updateTable(id, body, adminId, adminName);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN)
  async archiveTable(@Param('id') id: string, @Request() req: any) {
    const adminId = req.user?.id || 'admin-system';
    const adminName = req.user?.name || 'Admin';
    return this.tablesService.archiveTable(id, adminId, adminName);
  }

  @Post(':id/disable')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN)
  async disableTable(
    @Param('id') id: string,
    @Body() body: DisableTableDto,
    @Request() req: any,
  ) {
    const adminId = req.user?.id || 'admin-system';
    const adminName = req.user?.name || 'Admin';
    return this.tablesService.disableTable(id, body?.reason, adminId, adminName);
  }

  @Post(':id/enable')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN)
  async enableTable(@Param('id') id: string, @Request() req: any) {
    const adminId = req.user?.id || 'admin-system';
    const adminName = req.user?.name || 'Admin';
    return this.tablesService.enableTable(id, adminId, adminName);
  }

  @Post(':id/qr/regenerate')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN)
  async regenerateQr(@Param('id') id: string, @Request() req: any) {
    const adminId = req.user?.id || 'admin-system';
    const adminName = req.user?.name || 'Admin';
    return this.tablesService.regenerateQr(id, adminId, adminName);
  }

  // ----------------------------------------------------------------
  // EXISTING operations (Cashier/Admin)
  // ----------------------------------------------------------------

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
