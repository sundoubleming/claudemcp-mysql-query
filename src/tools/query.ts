import { z } from 'zod';
import { getPool, describeConnection, type ConnectionParams } from '../db.js';

const MAX_ROWS = 1000;

const READONLY_PATTERN = /^\s*(SELECT|SHOW|DESCRIBE|DESC|EXPLAIN)\b/i;

export const mysqlQuerySchema = {
  sql: z.string().describe('SQL query (SELECT, SHOW, DESCRIBE, EXPLAIN only)'),
  host: z.string().optional().describe('Override default MySQL host'),
  port: z.number().optional().describe('Override default MySQL port'),
  user: z.string().optional().describe('Override default MySQL user'),
  password: z.string().optional().describe('Override default MySQL password'),
  database: z.string().optional().describe('Override default MySQL database'),
};

function validateReadOnly(sql: string): void {
  if (!READONLY_PATTERN.test(sql)) {
    throw new Error(
      'Only SELECT, SHOW, DESCRIBE, and EXPLAIN statements are allowed. Use mysql_execute for write operations.'
    );
  }

  const trimmed = sql.trim();
  const withoutTrailing = trimmed.endsWith(';') ? trimmed.slice(0, -1) : trimmed;
  if (withoutTrailing.includes(';')) {
    throw new Error('Multi-statement SQL is not allowed. Please send one statement at a time.');
  }
}

export async function handleMysqlQuery(args: {
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
    validateReadOnly(sql);

    const pool = getPool(Object.keys(overrides).length > 0 ? overrides : undefined);
    const [rows] = await pool.query({ sql, timeout: 30_000 });

    const resultArray = Array.isArray(rows) ? rows : [rows];
    const totalRows = resultArray.length;
    const truncated = totalRows > MAX_ROWS;
    const displayRows = truncated ? resultArray.slice(0, MAX_ROWS) : resultArray;

    const output: Record<string, any> = {
      connection: describeConnection(Object.keys(overrides).length > 0 ? overrides : undefined),
      total_rows: totalRows,
      rows: displayRows,
    };

    if (truncated) {
      output.warning = `Results truncated to ${MAX_ROWS} rows (total: ${totalRows}). Add LIMIT to your query for specific ranges.`;
    }

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

    if (error.code === 'PROTOCOL_SEQUENCE_TIMEOUT' || error.message?.includes('timeout')) {
      return JSON.stringify({
        error: `Query timed out on ${connInfo}`,
        hint: 'The query exceeded 30s. Consider adding indexes or simplifying the query.',
      }, null, 2);
    }

    return JSON.stringify({
      error: error.message,
      code: error.code,
      connection: connInfo,
    }, null, 2);
  }
}
