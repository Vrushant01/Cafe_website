import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuCategoryEntity } from '../../database/entities/menu-category.entity';
import { MenuItemEntity } from '../../database/entities/menu-item.entity';
import { MenuService } from './menu.service';
import { MenuController } from './menu.controller';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([MenuCategoryEntity, MenuItemEntity])],
  controllers: [MenuController],
  providers: [MenuService, AdminAuthGuard, RolesGuard],
  exports: [MenuService],
})
export class MenuModule {}
