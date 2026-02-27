import { z } from 'zod';
import { getPool, describeConnection, type ConnectionParams } from '../db.js';
import type { ResultSetHeader } from 'mysql2';

export const mysqlExecuteSchema = {
  sql: z.string().describe('SQL statement (INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, etc.)'),
  host: z.string().optional().describe('Override default MySQL host'),
  port: z.number().optional().describe('Override default MySQL port'),
  user: z.string().optional().describe('Override default MySQL user'),
  password: z.string().optional().describe('Override default MySQL password'),
  database: z.string().optional().describe('Override default MySQL database'),
};

function validateWrite(sql: string): void {
  const trimmed = sql.trim();
  const withoutTrailing = trimmed.endsWith(';') ? trimmed.slice(0, -1) : trimmed;
  if (withoutTrailing.includes(';')) {
    throw new Error('Multi-statement SQL is not allowed. Please send one statement at a time.');
  }
}

export async function handleMysqlExecute(args: {
  sql: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
}): Promise<string> {
  const { sql, ...connOverrides } = args;
  const overrides: ConnectionParams = {};
  if (connOverrides.host) overrides.host = connOverrides.host;
  if (connOverrides.port) overrides.port = connOverrides.port;
  if (connOverrides.user) overrides.user = connOverrides.user;
  if (connOverrides.password) overrides.password = connOverrides.password;
  if (connOverrides.database) overrides.database = connOverrides.database;

  try {
    validateWrite(sql);

    const pool = getPool(Object.keys(overrides).length > 0 ? overrides : undefined);
    const [result] = await pool.query({ sql, timeout: 30_000 });

    const connInfo = describeConnection(Object.keys(overrides).length > 0 ? overrides : undefined);

    const header = result as ResultSetHeader;
    const output: Record<string, any> = {
      connection: connInfo,
      affected_rows: header.affectedRows,
      changed_rows: header.changedRows,
      insert_id: header.insertId,
      info: header.info,
    };

    return JSON.stringify(output, null, 2);
  } catch (error: any) {
    const connInfo = describeConnection(Object.keys(overrides).length > 0 ? overrides : undefined);

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return JSON.stringify({
        error: `Connection failed to ${connInfo}: ${error.message}`,
        hint: 'Check that MySQL is running and the host/port are correct.',
      }, null, 2);
    }

    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      return JSON.stringify({
        error: `Access denied for ${connInfo}`,
        hint: 'Check username and password.',
      }, null, 2);
    }

    return JSON.stringify({
      error: error.message,
      code: error.code,
      connection: connInfo,
    }, null, 2);
  }
}
