# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server that provides MySQL database access tools. It exposes three tools for database operations: read-only queries, write operations, and schema inspection.

## Development Commands

```bash
# Run in development mode (uses tsx for hot reload)
npm run dev

# Build TypeScript to dist/
npm run build

# Run compiled version
npm start
```

## Configuration

The server uses environment variables for default MySQL connection settings:
- `MYSQL_HOST` (default: localhost)
- `MYSQL_PORT` (default: 3306)
- `MYSQL_USER` (default: root)
- `MYSQL_PASSWORD` (default: empty)
- `MYSQL_DATABASE` (default: empty)

All tools accept optional connection parameters that override these defaults on a per-call basis.

## Architecture

### Entry Point (`src/index.ts`)
Registers three MCP tools with the server:
- `mysql_query` - read-only operations (SELECT, SHOW, DESCRIBE, EXPLAIN)
- `mysql_execute` - write operations (INSERT, UPDATE, DELETE, CREATE, ALTER, DROP)
- `mysql_schema` - schema inspection (list databases/tables, describe table structure)

### Connection Management (`src/db.ts`)
- Maintains a pool cache keyed by `host:port:user:database`
- Pools are reused across calls with matching connection parameters
- Each pool has a connection limit of 5 and 10s connect timeout
- Graceful shutdown closes all pools on SIGINT/SIGTERM

### Tool Handlers (`src/tools/`)
Each tool handler follows the same pattern:
1. Parse and validate input using Zod schemas
2. Merge connection overrides with defaults
3. Get or create connection pool
4. Execute SQL with 30s timeout
5. Return JSON-formatted results with connection info
6. Catch and format errors with helpful hints

**Safety Features:**
- `query.ts` enforces read-only operations via regex validation
- Both query and execute prevent multi-statement SQL (no semicolons except trailing)
- Query results are capped at 1000 rows with truncation warnings
- Schema operations use backtick-quoted identifiers to prevent injection

## Key Constraints

- Single statement per call (multi-statement SQL blocked for safety)
- Query results limited to 1000 rows (add LIMIT clause for specific ranges)
- 30 second timeout on all SQL operations
- Connection pool limit of 5 per unique connection configuration
