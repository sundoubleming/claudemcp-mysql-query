import mysql from 'mysql2/promise';

export interface ConnectionParams {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
}

interface PoolEntry {
  pool: mysql.Pool;
  lastUsed: number;
}

const pools = new Map<string, PoolEntry>();

function getDefaultConfig(): Required<ConnectionParams> {
  return {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || '',
  };
}

function resolveConfig(overrides?: ConnectionParams): Required<ConnectionParams> {
  const defaults = getDefaultConfig();
  return {
    host: overrides?.host || defaults.host,
    port: overrides?.port || defaults.port,
    user: overrides?.user || defaults.user,
    password: overrides?.password || defaults.password,
    database: overrides?.database || defaults.database,
  };
}

function poolKey(config: Required<ConnectionParams>): string {
  return `${config.host}:${config.port}:${config.user}:${config.database}`;
}

export function getPool(overrides?: ConnectionParams): mysql.Pool {
  const config = resolveConfig(overrides);
  const key = poolKey(config);

  const existing = pools.get(key);
  if (existing) {
    existing.lastUsed = Date.now();
    return existing.pool;
  }

  const pool = mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database || undefined,
    waitForConnections: true,
    connectionLimit: 5,
    connectTimeout: 10_000,
  });

  pools.set(key, { pool, lastUsed: Date.now() });
  return pool;
}

export async function closeAllPools(): Promise<void> {
  for (const [key, entry] of pools) {
    await entry.pool.end();
    pools.delete(key);
  }
}

export function describeConnection(overrides?: ConnectionParams): string {
  const config = resolveConfig(overrides);
  return `${config.user}@${config.host}:${config.port}/${config.database || '(no database)'}`;
}
