import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import {
  TableEntity,
  SessionEntity,
  MenuCategoryEntity,
  MenuItemEntity,
  OrderEntity,
  OrderItemEntity,
  PaymentEntity,
  RefundEntity,
  AdminUserEntity,
  AuditLogEntity,
  IdempotencyKeyEntity,
} from './entities';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const isTest = process.env.NODE_ENV === 'test';
const dbType = process.env.DB_TYPE || (process.env.DB_HOST ? 'postgres' : 'sqlite');

export const dataSourceOptions: DataSourceOptions =
  dbType === 'sqlite' || isTest
    ? {
        type: 'sqlite',
        database: isTest ? ':memory:' : path.resolve(__dirname, '../../../chai_partner.sqlite'),
        entities: [
          TableEntity,
          SessionEntity,
          MenuCategoryEntity,
          MenuItemEntity,
          OrderEntity,
          OrderItemEntity,
          PaymentEntity,
          RefundEntity,
          AdminUserEntity,
          AuditLogEntity,
          IdempotencyKeyEntity,
        ],
        synchronize: true, // auto create schema in sqlite mode
        logging: false,
      }
    : {
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'chai_partner',
        entities: [
          TableEntity,
          SessionEntity,
          MenuCategoryEntity,
          MenuItemEntity,
          OrderEntity,
          OrderItemEntity,
          PaymentEntity,
          RefundEntity,
          AdminUserEntity,
          AuditLogEntity,
          IdempotencyKeyEntity,
        ],
        synchronize: true, // For development; migrations also generated
        logging: process.env.NODE_ENV === 'development',
      };

export const AppDataSource = new DataSource(dataSourceOptions);
