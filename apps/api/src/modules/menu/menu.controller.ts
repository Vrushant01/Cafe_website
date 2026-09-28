import { Controller, Get, Patch, Param, Body, Request } from '@nestjs/common';
import { MenuService } from './menu.service';
import { MenuItemEntity } from '../../database/entities/menu-item.entity';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  async getMenu() {
    return this.menuService.getMenu();
  }

  @Patch('items/:id')
  async updateItem(
    @Param('id') id: string,
    @Body() updates: Partial<MenuItemEntity>,
    @Request() req: any,
  ) {
    const adminId = req.user?.id || 'admin-system';
    return this.menuService.updateItem(id, updates, adminId);
  }
}
