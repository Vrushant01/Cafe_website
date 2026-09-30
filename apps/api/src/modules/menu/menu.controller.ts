import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { MenuService } from './menu.service';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { AdminRole, CreateMenuItemDto, UpdateMenuItemDto } from '@chai-partner/shared';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  async getMenu() {
    return this.menuService.getMenu();
  }

  @Get('categories')
  async getCategories() {
    return this.menuService.getCategories();
  }

  @Get('items/:id')
  async getItem(@Param('id') id: string) {
    return this.menuService.getItemById(id);
  }

  @Post('items')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN)
  async addItem(@Body() dto: CreateMenuItemDto, @Request() req: any) {
    const adminId = req.user?.id || 'admin';
    return this.menuService.addItem(dto, adminId);
  }

  @Patch('items/:id')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN)
  async updateItem(
    @Param('id') id: string,
    @Body() updates: UpdateMenuItemDto,
    @Request() req: any,
  ) {
    const adminId = req.user?.id || 'admin';
    return this.menuService.updateItem(id, updates, adminId);
  }

  @Patch('items/:id/availability')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN, AdminRole.KITCHEN, AdminRole.CASHIER)
  async toggleAvailability(@Param('id') id: string, @Request() req: any) {
    const adminId = req.user?.id || 'admin';
    return this.menuService.toggleAvailability(id, adminId);
  }

  @Patch('items/:id/bestseller')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN)
  async toggleBestseller(@Param('id') id: string, @Request() req: any) {
    const adminId = req.user?.id || 'admin';
    return this.menuService.toggleBestseller(id, adminId);
  }

  @Delete('items/:id')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN)
  async deleteItem(@Param('id') id: string, @Request() req: any) {
    const adminId = req.user?.id || 'admin';
    return this.menuService.deleteItem(id, adminId);
  }
}
