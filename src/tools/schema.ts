import { z } from 'zod';
import { getPool, describeConnection, type ConnectionParams } from '../db.js';

export const mysqlSchemaSchema = {
  action: z.enum(['list_databases', 'list_tables', 'describe_table']).describe(
    'Action: list_databases, list_tables, or describe_table'
  ),
  database: z.string().optional().describe('Target database (for list_tables / describe_table)'),
  table: z.string().optional().describe('Target table (required for describe_table)'),
  host: z.string().optional().describe('Override default MySQL host'),
  port: z.number().optional().describe('Override default MySQL port'),
  user: z.string().optional().describe('Override default MySQL user'),
  password: z.string().optional().describe('Override default MySQL password'),
};

export async function handleMysqlSchema(args: {
  action: 'list_databases' | 'list_tables' | 'describe_table';
  database?: string;
  table?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
}): Promise<string> {
  const { action, database, table, ...connOverrides } = args;
  const overrides: ConnectionParams = {};
  if (connOverrides.host) overrides.host = connOverrides.host;
  if (connOverrides.port) overrides.port = connOverrides.port;
  if (connOverrides.user) overrides.user = connOverrides.user;
  if (connOverrides.password) overrides.password = connOverrides.password;
  if (database) overrides.database = database;

  try {
    const pool = getPool(Object.keys(overrides).length > 0 ? overrides : undefined);
    const connInfo = describeConnection(Object.keys(overrides).length > 0 ? overrides : undefined);

    if (action === 'list_databases') {
      const [rows] = await pool.query('SHOW DATABASES');
      const databases = (rows as any[]).map((r) => r.Database);
      return JSON.stringify({ connection: connInfo, databases }, null, 2);
    }

    if (action === 'list_tables') {
      const db = database || process.env.MYSQL_DATABASE;
      if (!db) {
        return JSON.stringify({
          error: 'No database specified. Provide the "database" parameter or set MYSQL_DATABASE env var.',
        }, null, 2);
      }
      const [rows] = await pool.query(`SHOW TABLES FROM \`${db}\``);
      const key = `Tables_in_${db}`;
      const tables = (rows as any[]).map((r) => r[key]);
      return JSON.stringify({ connection: connInfo, database: db, tables }, null, 2);
    }

    if (action === 'describe_table') {
      if (!table) {
        return JSON.stringify({
          error: 'The "table" parameter is required for describe_table action.',
        }, null, 2);
      }
      const db = database || process.env.MYSQL_DATABASE;
      const qualifiedTable = db ? `\`${db}\`.\`${table}\`` : `\`${table}\``;

      const [columns] = await pool.query(`DESCRIBE ${qualifiedTable}`);
      const [indexes] = await pool.query(`SHOW INDEX FROM ${qualifiedTable}`);
      const [createResult] = await pool.query(`SHOW CREATE TABLE ${qualifiedTable}`);
      const createStatement = (createResult as any[])[0]?.['Create Table'] || '';

      return JSON.stringify({
        connection: connInfo,
        table: db ? `${db}.${table}` : table,
        columns,
        indexes,
        create_statement: createStatement,
      }, null, 2);
    }

    return JSON.stringify({ error: `Unknown action: ${action}` }, null, 2);
  } catch (error: any) {
    const connInfo = describeConnection(Object.keys(overrides).length > 0 ? overrides : undefined);
    return JSON.stringify({
      error: error.message,
      code: error.code,
      connection: connInfo,
    }, null, 2);
  }
}
