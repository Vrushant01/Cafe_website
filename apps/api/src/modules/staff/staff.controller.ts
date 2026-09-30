import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import {
  AdminRole,
  CreateStaffDto,
  UpdateStaffDto,
  UpdateStaffStatusDto,
} from '@chai-partner/shared';

@Controller('admin/staff')
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles(AdminRole.ADMIN)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  async getAllStaff() {
    return this.staffService.findAll();
  }

  @Post()
  async createStaff(@Body() dto: CreateStaffDto) {
    return this.staffService.create(dto);
  }

  @Patch(':id')
  async updateStaff(@Param('id') id: string, @Body() dto: UpdateStaffDto) {
    return this.staffService.update(id, dto);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStaffStatusDto,
    @Request() req: any,
  ) {
    const currentAdminId = req.user?.id;
    return this.staffService.updateStatus(id, dto.is_active, currentAdminId);
  }
}
