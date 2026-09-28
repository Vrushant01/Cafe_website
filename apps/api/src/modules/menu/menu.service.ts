import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuCategoryEntity } from '../../database/entities/menu-category.entity';
import { MenuItemEntity } from '../../database/entities/menu-item.entity';
import { AuditService } from '../audit/audit.service';
import { CreateMenuItemDto, UpdateMenuItemDto } from '@chai-partner/shared';

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

  async getCategories(): Promise<MenuCategoryEntity[]> {
    return this.categoryRepo.find({
      order: {
        sort_order: 'ASC',
      },
    });
  }

  async getItemById(id: string): Promise<MenuItemEntity> {
    const item = await this.itemRepo.findOne({
      where: { id },
      relations: ['category'],
    });
    if (!item) {
      throw new NotFoundException(`Menu item ${id} not found`);
    }
    return item;
  }

  async addItem(dto: CreateMenuItemDto, adminId: string): Promise<MenuItemEntity> {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new BadRequestException('Item name is required');
    }
    if (dto.price === undefined || dto.price <= 0) {
      throw new BadRequestException('Item price must be greater than zero');
    }

    const category = await this.categoryRepo.findOne({ where: { id: dto.category_id } });
    if (!category) {
      throw new NotFoundException(`Category with ID ${dto.category_id} not found`);
    }

    const item = this.itemRepo.create({
      category_id: dto.category_id,
      name: dto.name.trim(),
      description: dto.description?.trim() || '',
      price: dto.price,
      image_url: dto.image_url || null,
      is_bestseller: dto.is_bestseller ?? false,
      is_available: dto.is_available ?? true,
      veg_flag: dto.veg_flag ?? true,
    });

    const saved = await this.itemRepo.save(item);

    // Audit log (BRAIN Rule 9)
    await this.auditService.log({
      actor_id: adminId,
      actor_type: 'admin',
      action: 'MENU_ITEM_CREATED',
      entity: 'menu_items',
      entity_id: saved.id,
      metadata: {
        item_name: saved.name,
        category_name: category.name,
        price: saved.price,
        admin_id: adminId,
      },
    });

    return saved;
  }

  async updateItem(
    id: string,
    updates: UpdateMenuItemDto,
    adminId: string,
  ): Promise<MenuItemEntity> {
    const item = await this.itemRepo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException('Menu item not found');
    }

    const previousPrice = Number(item.price);
    const previousAvailable = item.is_available;
    const previousBestseller = item.is_bestseller;

    if (updates.category_id) {
      const category = await this.categoryRepo.findOne({ where: { id: updates.category_id } });
      if (!category) {
        throw new NotFoundException(`Category with ID ${updates.category_id} not found`);
      }
    }

    if (updates.price !== undefined && updates.price <= 0) {
      throw new BadRequestException('Price must be greater than zero');
    }

    Object.assign(item, updates);
    const saved = await this.itemRepo.save(item);

    // Audit price changes with old and new price
    if (updates.price !== undefined && Number(updates.price) !== previousPrice) {
      await this.auditService.log({
        actor_id: adminId,
        actor_type: 'admin',
        action: 'MENU_ITEM_PRICE_UPDATE',
        entity: 'menu_items',
        entity_id: id,
        metadata: {
          item_name: item.name,
          old_price: previousPrice,
          new_price: Number(updates.price),
          admin_id: adminId,
        },
      });
    }

    // Audit availability toggle
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
          admin_id: adminId,
        },
      });
    }

    // Audit bestseller toggle
    if (updates.is_bestseller !== undefined && updates.is_bestseller !== previousBestseller) {
      await this.auditService.log({
        actor_id: adminId,
        actor_type: 'admin',
        action: 'MENU_ITEM_BESTSELLER_TOGGLE',
        entity: 'menu_items',
        entity_id: id,
        metadata: {
          item_name: item.name,
          is_bestseller: updates.is_bestseller,
          admin_id: adminId,
        },
      });
    }

    return saved;
  }

  async toggleAvailability(id: string, adminId: string): Promise<MenuItemEntity> {
    const item = await this.getItemById(id);
    return this.updateItem(id, { is_available: !item.is_available }, adminId);
  }

  async toggleBestseller(id: string, adminId: string): Promise<MenuItemEntity> {
    const item = await this.getItemById(id);
    return this.updateItem(id, { is_bestseller: !item.is_bestseller }, adminId);
  }

  async deleteItem(id: string, adminId: string): Promise<{ success: boolean; deleted_item_name: string }> {
    const item = await this.getItemById(id);
    const itemName = item.name;

    await this.itemRepo.delete({ id });

    // Audit log (BRAIN Rule 9)
    await this.auditService.log({
      actor_id: adminId,
      actor_type: 'admin',
      action: 'MENU_ITEM_DELETED',
      entity: 'menu_items',
      entity_id: id,
      metadata: {
        deleted_item_name: itemName,
        admin_id: adminId,
      },
    });

    return { success: true, deleted_item_name: itemName };
  }
}
