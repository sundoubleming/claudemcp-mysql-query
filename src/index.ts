import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { mysqlQuerySchema, handleMysqlQuery } from './tools/query.js';
import { mysqlExecuteSchema, handleMysqlExecute } from './tools/execute.js';
import { mysqlSchemaSchema, handleMysqlSchema } from './tools/schema.js';
import { closeAllPools } from './db.js';

const server = new McpServer({
  name: 'mysql-query',
  version: '1.0.0',
});

server.tool(
  'mysql_query',
  'Execute a read-only SQL query (SELECT, SHOW, DESCRIBE, EXPLAIN). Safe for exploration — no data modification possible. Results capped at 1000 rows.',
  mysqlQuerySchema,
  async (args) => ({
    content: [{ type: 'text', text: await handleMysqlQuery(args) }],
  })
);

server.tool(
  'mysql_execute',
  'Execute a write SQL statement (INSERT, UPDATE, DELETE, CREATE, ALTER, DROP). Returns affected rows. Use with caution — this modifies data.',
  mysqlExecuteSchema,
  async (args) => ({
    content: [{ type: 'text', text: await handleMysqlExecute(args) }],
  })
);

server.tool(
  'mysql_schema',
  'Inspect database schema: list databases, list tables in a database, or describe a table (columns, indexes, CREATE statement).',
  mysqlSchemaSchema,
  async (args) => ({
    content: [{ type: 'text', text: await handleMysqlSchema(args) }],
  })
);

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeAllPools();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeAllPools();
  process.exit(0);
});

const transport = new StdioServerTransport();
await server.connect(transport);
