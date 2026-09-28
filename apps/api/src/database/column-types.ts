import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const isSqlite =
  process.env.NODE_ENV === 'test' ||
  process.env.DB_TYPE === 'sqlite' ||
  !process.env.DB_HOST;

export const DateTimeColumnType = (isSqlite ? 'datetime' : 'timestamp') as any;
