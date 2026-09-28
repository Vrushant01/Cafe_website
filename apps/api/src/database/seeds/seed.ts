import { AppDataSource } from '../data-source';
import {
  TableEntity,
  MenuCategoryEntity,
  MenuItemEntity,
  AdminUserEntity,
} from '../entities';
import { TableStatus, AdminRole, generateSignedQrToken } from '@chai-partner/shared';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

const QR_SECRET = process.env.QR_HMAC_SECRET || 'chai_partner_qr_signing_secret_min_32_characters_long';

export async function runSeed() {
  console.log('--- Initializing Data Source for Seed ---');
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const tableRepo = AppDataSource.getRepository(TableEntity);
  const categoryRepo = AppDataSource.getRepository(MenuCategoryEntity);
  const itemRepo = AppDataSource.getRepository(MenuItemEntity);
  const userRepo = AppDataSource.getRepository(AdminUserEntity);

  console.log('Seeding 25 Tables...');
  const tableCount = parseInt(process.env.DEFAULT_TABLE_COUNT || '25', 10);
  for (let i = 1; i <= tableCount; i++) {
    const existing = await tableRepo.findOne({ where: { table_number: i } });
    const seatCount = i <= 10 ? 2 : i <= 20 ? 4 : 6;
    const qrToken = generateSignedQrToken(i, QR_SECRET);

    if (existing) {
      existing.seat_count = seatCount;
      existing.qr_token = qrToken;
      await tableRepo.save(existing);
    } else {
      const table = tableRepo.create({
        table_number: i,
        seat_count: seatCount,
        status: TableStatus.AVAILABLE,
        qr_token: qrToken,
      });
      await tableRepo.save(table);
    }
  }

  console.log('Seeding Admin Users (Admin, Kitchen, Cashier)...');
  const passwordHash = await bcrypt.hash('admin123', 10);
  const kitchenHash = await bcrypt.hash('kitchen123', 10);
  const cashierHash = await bcrypt.hash('cashier123', 10);

  const defaultUsers = [
    { name: 'Owner / Admin', email: 'admin@chaipartner.com', role: AdminRole.ADMIN, password_hash: passwordHash },
    { name: 'Head Chef', email: 'kitchen@chaipartner.com', role: AdminRole.KITCHEN, password_hash: kitchenHash },
    { name: 'Counter Cashier', email: 'cashier@chaipartner.com', role: AdminRole.CASHIER, password_hash: cashierHash },
  ];

  for (const u of defaultUsers) {
    const existing = await userRepo.findOne({ where: { email: u.email } });
    if (!existing) {
      await userRepo.save(userRepo.create(u));
    }
  }

  console.log('Seeding Menu Categories and Items...');
  const menuData = [
    {
      category: 'Milk Tea',
      sortOrder: 1,
      items: [
        { name: 'Masala Chai', description: 'Traditional aromatic spiced tea brewed with fresh ginger and cardamom', price: 30, is_bestseller: true, veg_flag: true },
        { name: 'Cardamom (Elaichi) Chai', description: 'Fragrant and soothing elaichi infused milk tea', price: 35, is_bestseller: true, veg_flag: true },
        { name: 'Ginger Chai', description: 'Strong, invigorating fresh adrak chai', price: 30, is_bestseller: false, veg_flag: true },
        { name: 'Kulhad Chai', description: 'Earthy flavored chai served in an authentic clay kulhad', price: 40, is_bestseller: true, veg_flag: true },
        { name: 'Cutting Chai', description: 'Mumbai style brisk half-cup cutting tea', price: 20, is_bestseller: false, veg_flag: true },
      ],
    },
    {
      category: 'Milk',
      sortOrder: 2,
      items: [
        { name: 'Hot Chocolate', description: 'Rich, velvety melted cocoa beverage topped with chocolate drizzle', price: 90, is_bestseller: true, veg_flag: true },
        { name: 'Badam Milk', description: 'Slow cooked saffron almond milk with crunchy nut slivers', price: 80, is_bestseller: false, veg_flag: true },
        { name: 'Turmeric Latte', description: 'Golden immunity milk with organic haldi and cracked black pepper', price: 70, is_bestseller: false, veg_flag: true },
        { name: 'Rose Milk', description: 'Chilled refreshing milk infused with pure Damascus rose syrup', price: 60, is_bestseller: false, veg_flag: true },
      ],
    },
    {
      category: 'Coeeff',
      sortOrder: 3,
      items: [
        { name: 'Filter Coffee', description: 'Authentic South Indian chicory-blend decoction frothed with milk', price: 50, is_bestseller: true, veg_flag: true },
        { name: 'Hot Cappuccino', description: 'Double shot espresso balanced with steamed milk and dense foam', price: 90, is_bestseller: false, veg_flag: true },
        { name: 'Cafe Mocha', description: 'Dark chocolate syrup blended with espresso and silky microfoam', price: 110, is_bestseller: false, veg_flag: true },
        { name: 'Cold Coffee', description: 'Classic thick whipped iced coffee with chocolate drizzle', price: 100, is_bestseller: true, veg_flag: true },
        { name: 'Espresso', description: 'Bold and intense single shot straight extraction', price: 60, is_bestseller: false, veg_flag: true },
      ],
    },
    {
      category: 'Coolers',
      sortOrder: 4,
      items: [
        { name: 'Mint Mojito', description: 'Crushed garden mint, fresh lime wedges and bubbling soda', price: 80, is_bestseller: true, veg_flag: true },
        { name: 'Lemon Shikanji', description: 'Desi style spiced lemonade with cumin, mint and rock salt', price: 50, is_bestseller: false, veg_flag: true },
        { name: 'Blue Lagoon', description: 'Vibrant curacao cooler with citrus fizz', price: 90, is_bestseller: false, veg_flag: true },
        { name: 'Aam Panna', description: 'Tangy roasted raw mango cooler with roasted cumin', price: 60, is_bestseller: false, veg_flag: true },
      ],
    },
    {
      category: 'Without Milk Tea',
      sortOrder: 5,
      items: [
        { name: 'Honey Ginger Lemon Tea', description: 'Raw mountain honey, crushed ginger and fresh lemon juice', price: 50, is_bestseller: true, veg_flag: true },
        { name: 'Green Tea', description: 'Antioxidant rich whole leaf organic green tea', price: 40, is_bestseller: false, veg_flag: true },
        { name: 'Lemon Tea', description: 'Bright and brisk Assam black tea with lemon zest', price: 30, is_bestseller: false, veg_flag: true },
        { name: 'Black Tea', description: 'Pure unadulterated high grown Nilgiri black tea', price: 25, is_bestseller: false, veg_flag: true },
      ],
    },
    {
      category: 'Ice Tea',
      sortOrder: 6,
      items: [
        { name: 'Peach Ice Tea', description: 'Sweet aromatic peach puree infused into crisp iced black tea', price: 70, is_bestseller: true, veg_flag: true },
        { name: 'Lemon Ice Tea', description: 'Crisp, citrusy iced tea served chilled over ice', price: 60, is_bestseller: false, veg_flag: true },
        { name: 'Berry Ice Tea', description: 'Wild berries blend brewed with iced black tea', price: 80, is_bestseller: false, veg_flag: true },
      ],
    },
    {
      category: 'Bites',
      sortOrder: 7,
      items: [
        { name: 'Bun Maska', description: 'Soft warm bakery bun slathered with salted butter', price: 45, is_bestseller: true, veg_flag: true },
        { name: 'Maskabun Jam', description: 'Classic sweet bun with whipped butter and mixed fruit jam', price: 55, is_bestseller: false, veg_flag: true },
        { name: 'Samosa (2 pcs)', description: 'Crispy flaky crust stuffed with spicy mashed potato and peas', price: 40, is_bestseller: true, veg_flag: true },
        { name: 'Veg Cutlet', description: 'Golden crumb-fried spiced potato and vegetable patties', price: 60, is_bestseller: false, veg_flag: true },
      ],
    },
    {
      category: 'Desi Garam',
      sortOrder: 8,
      items: [
        { name: 'Vada Pav', description: 'Batata vada tucked into a toasted pav with dry garlic chutney', price: 35, is_bestseller: true, veg_flag: true },
        { name: 'Pav Bhaji', description: 'Spiced mixed vegetable mash served with buttery pav and lemon', price: 120, is_bestseller: true, veg_flag: true },
        { name: 'Poha', description: 'Indori style flattened rice tempered with mustard, peanuts and curry leaves', price: 50, is_bestseller: false, veg_flag: true },
        { name: 'Chole Bhature', description: 'Punjabi spiced chickpeas with two fluffy golden fried bhaturas', price: 140, is_bestseller: false, veg_flag: true },
      ],
    },
    {
      category: 'Sandwich',
      sortOrder: 9,
      items: [
        { name: 'Veg Cheese Grilled Sandwich', description: 'Triple decker sandwich packed with cucumber, tomato and gooey mozzarella', price: 90, is_bestseller: true, veg_flag: true },
        { name: 'Bombay Masala Sandwich', description: 'Spicy mashed potato stuffing with mint chutney and sev', price: 80, is_bestseller: false, veg_flag: true },
        { name: 'Corn Cheese Sandwich', description: 'Sweet golden corn and molten cheese grilled crisp', price: 100, is_bestseller: false, veg_flag: true },
        { name: 'Paneer Tikka Sandwich', description: 'Marinated cottage cheese cubes grilled with bell peppers', price: 120, is_bestseller: true, veg_flag: true },
      ],
    },
    {
      category: 'Maggie',
      sortOrder: 10,
      items: [
        { name: 'Cheese Masala Maggie', description: 'Classic instant noodles tossed with extra spices and melted cheese', price: 80, is_bestseller: true, veg_flag: true },
        { name: 'Classic Maggie', description: 'Nostalgic 2-minute street style masala noodles', price: 50, is_bestseller: false, veg_flag: true },
        { name: 'Veggie Butter Maggie', description: 'Loaded with peas, carrots, sweet corn and a dollop of Amul butter', price: 70, is_bestseller: false, veg_flag: true },
      ],
    },
    {
      category: 'Nanchos',
      sortOrder: 11,
      items: [
        { name: 'Cheese Loaded Nachos', description: 'Crisp tortilla corn chips blanketed with warm cheese sauce and jalapeños', price: 110, is_bestseller: true, veg_flag: true },
        { name: 'Salsa Nachos', description: 'Crunchy nachos served with tangy Mexican tomato cilantro salsa', price: 90, is_bestseller: false, veg_flag: true },
        { name: 'Jalapeno Cheese Nachos', description: 'Spicy pickled jalapeno slices with hot queso cheddar dip', price: 120, is_bestseller: false, veg_flag: true },
      ],
    },
    {
      category: 'Moctails',
      sortOrder: 12,
      items: [
        { name: 'Watermelon Mint Twist', description: 'Fresh crushed watermelon juice with mint and sparkling soda', price: 100, is_bestseller: true, veg_flag: true },
        { name: 'Virgin Pina Colada', description: 'Creamy coconut cream and pineapple juice blended smooth', price: 110, is_bestseller: false, veg_flag: true },
        { name: 'Sunrise Cooler', description: 'Layered orange juice, grenadine and fizzy lemon spritz', price: 95, is_bestseller: false, veg_flag: true },
      ],
    },
    {
      category: 'Pizza',
      sortOrder: 13,
      items: [
        { name: 'Margherita Pizza', description: 'Classic 8-inch hand stretched crust with San Marzano style sauce and mozzarella', price: 160, is_bestseller: true, veg_flag: true },
        { name: 'Farmhouse Veg Pizza', description: 'Topped with capsicum, red onion, ripe tomatoes and golden sweet corn', price: 210, is_bestseller: false, veg_flag: true },
        { name: 'Paneer Tikka Pizza', description: 'Tandoori spiced paneer cubes, roasted peppers and spicy makhani sauce base', price: 240, is_bestseller: true, veg_flag: true },
        { name: 'Corn & Jalapeno Pizza', description: 'Fiery pickled jalapeños and sweet corn kernels with extra cheese', price: 190, is_bestseller: false, veg_flag: true },
      ],
    },
  ];

  for (const catData of menuData) {
    let category = await categoryRepo.findOne({ where: { name: catData.category } });
    if (!category) {
      category = categoryRepo.create({
        name: catData.category,
        sort_order: catData.sortOrder,
      });
      await categoryRepo.save(category);
    }

    for (const item of catData.items) {
      const existingItem = await itemRepo.findOne({
        where: { name: item.name, category_id: category.id },
      });
      if (!existingItem) {
        const menuItem = itemRepo.create({
          category_id: category.id,
          name: item.name,
          description: item.description,
          price: item.price,
          is_bestseller: item.is_bestseller,
          is_available: true,
          veg_flag: item.veg_flag,
        });
        await itemRepo.save(menuItem);
      }
    }
  }

  console.log('--- Seed Completed Successfully! ---');
}

if (require.main === module) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
