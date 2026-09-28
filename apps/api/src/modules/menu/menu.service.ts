import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuCategoryEntity } from '../../database/entities/menu-category.entity';
import { MenuItemEntity } from '../../database/entities/menu-item.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(MenuCategoryEntity)
    private categoryRepo: Repository<MenuCategoryEntity>,
    @InjectRepository(MenuItemEntity)
    private itemRepo: Repository<MenuItemEntity>,
    private auditService: AuditService,
  ) {}

  async getMenu(): Promise<MenuCategoryEntity[]> {
    return this.categoryRepo.find({
      relations: ['items'],
      order: {
        sort_order: 'ASC',
        items: {
          name: 'ASC',
        },
      },
    });
  }

  async updateItem(
    id: string,
    updates: Partial<MenuItemEntity>,
    adminId: string,
  ): Promise<MenuItemEntity> {
    const item = await this.itemRepo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException('Menu item not found');
    }

    const previousPrice = item.price;
    const previousAvailable = item.is_available;

    Object.assign(item, updates);
    const saved = await this.itemRepo.save(item);

    if (updates.price !== undefined && updates.price !== previousPrice) {
      await this.auditService.log({
        actor_id: adminId,
        actor_type: 'admin',
        action: 'MENU_ITEM_PRICE_UPDATE',
        entity: 'menu_items',
        entity_id: id,
        metadata: {
          item_name: item.name,
          old_price: previousPrice,
          new_price: updates.price,
        },
      });
    }

    if (updates.is_available !== undefined && updates.is_available !== previousAvailable) {
      await this.auditService.log({
        actor_id: adminId,
        actor_type: 'admin',
        action: 'MENU_ITEM_AVAILABILITY_TOGGLE',
        entity: 'menu_items',
        entity_id: id,
        metadata: {
          item_name: item.name,
          is_available: updates.is_available,
        },
      });
    }

    return saved;
  }
}
