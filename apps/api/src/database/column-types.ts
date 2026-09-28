const isSqlite = process.env.NODE_ENV === 'test' || process.env.DB_TYPE === 'sqlite';

export const DateTimeColumnType = (isSqlite ? 'datetime' : 'timestamp') as any;
