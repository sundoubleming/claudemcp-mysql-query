# MySQL Query MCP Server

一个基于 Model Context Protocol (MCP) 的 MySQL 数据库访问服务器，为 AI 助手提供安全的数据库操作能力。

## 功能特性

- **只读查询** (`mysql_query`): 执行 SELECT、SHOW、DESCRIBE、EXPLAIN 等安全的查询操作
- **写入操作** (`mysql_execute`): 执行 INSERT、UPDATE、DELETE、CREATE、ALTER、DROP 等数据修改操作
- **模式检查** (`mysql_schema`): 查看数据库列表、表列表、表结构详情

### 安全特性

- 自动防止多语句 SQL 注入
- 查询结果自动限制在 1000 行以内
- 30 秒查询超时保护
- 连接池管理，避免连接泄漏
- 详细的错误提示和连接信息

## 安装

```bash
# 克隆项目
git clone <repository-url>
cd claudemcp-mysql-query

# 安装依赖
npm install

# 构建项目
npm run build
```

## 配置方法

### 1. 环境变量配置（推荐）

创建 `.env` 文件或设置环境变量：

```bash
export MYSQL_HOST=localhost
export MYSQL_PORT=3306
export MYSQL_USER=root
export MYSQL_PASSWORD=your_password
export MYSQL_DATABASE=your_database
```

### 2. Claude Desktop 配置

在 Claude Desktop 的配置文件中添加：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mysql-query": {
      "command": "node",
      "args": ["/path/to/claudemcp-mysql-query/dist/index.js"],
      "env": {
        "MYSQL_HOST": "localhost",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "root",
        "MYSQL_PASSWORD": "your_password",
        "MYSQL_DATABASE": "your_database"
      }
    }
  }
}
```

### 3. Claude Code CLI 配置

在 Claude Code CLI 的配置文件中添加：

**配置文件位置**: `~/.config/claude/config.json`

```json
{
  "mcpServers": {
    "mysql-query": {
      "command": "node",
      "args": ["/path/to/claudemcp-mysql-query/dist/index.js"],
      "env": {
        "MYSQL_HOST": "localhost",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "root",
        "MYSQL_PASSWORD": "your_password",
        "MYSQL_DATABASE": "your_database"
      }
    }
  }
}
```

配置完成后，重启 Claude Code CLI 即可使用。

### 4. 开发模式运行

```bash
# 使用环境变量
export MYSQL_HOST=localhost
export MYSQL_USER=root
export MYSQL_PASSWORD=your_password

# 启动开发服务器
npm run dev
```

## 使用说明

配置完成后，可以通过自然语言提示词与 AI 助手交互来操作数据库。

### 提示词使用示例

**查询数据：**
```
帮我查询 users 表中年龄大于 18 岁的所有用户
```

**查看表结构：**
```
显示 orders 表的结构
```

**列出所有表：**
```
列出 mydb 数据库中的所有表
```

**插入数据：**
```
在 users 表中插入一条记录，姓名为"李四"，邮箱为"lisi@example.com"
```

**更新数据：**
```
将 id 为 5 的用户状态更新为 active
```

**统计查询：**
```
统计每个部门的员工数量
```

**复杂查询：**
```
查询最近 7 天内注册的用户，按注册时间倒序排列
```

AI 助手会自动调用相应的工具（mysql_query、mysql_execute 或 mysql_schema）来执行操作。

### 工具 1: mysql_query（只读查询）

执行安全的只读查询操作。

**参数：**
- `sql` (必需): SQL 查询语句
- `host` (可选): 覆盖默认主机
- `port` (可选): 覆盖默认端口
- `user` (可选): 覆盖默认用户
- `password` (可选): 覆盖默认密码
- `database` (可选): 覆盖默认数据库

**示例：**
```sql
SELECT * FROM users WHERE age > 18 LIMIT 10;
SHOW TABLES;
DESCRIBE users;
```

### 工具 2: mysql_execute（写入操作）

执行数据修改操作，需谨慎使用。

**参数：**
- `sql` (必需): SQL 语句
- 其他参数同 `mysql_query`

**示例：**
```sql
INSERT INTO users (name, email) VALUES ('张三', 'zhangsan@example.com');
UPDATE users SET status = 'active' WHERE id = 1;
DELETE FROM logs WHERE created_at < '2024-01-01';
CREATE TABLE test (id INT PRIMARY KEY, name VARCHAR(100));
```

### 工具 3: mysql_schema（模式检查）

检查数据库结构信息。

**参数：**
- `action` (必需): 操作类型
  - `list_databases`: 列出所有数据库
  - `list_tables`: 列出指定数据库的所有表
  - `describe_table`: 查看表的详细结构
- `database` (可选): 目标数据库名
- `table` (可选): 目标表名（describe_table 时必需）
- 其他连接参数同上

**示例：**
```javascript
// 列出所有数据库
{ "action": "list_databases" }

// 列出指定数据库的表
{ "action": "list_tables", "database": "mydb" }

// 查看表结构
{ "action": "describe_table", "database": "mydb", "table": "users" }
```

## 连接池管理

服务器会自动管理连接池：
- 相同连接参数的请求会复用同一个连接池
- 每个连接池最多 5 个连接
- 连接超时时间 10 秒
- 程序退出时自动关闭所有连接池

## 错误处理

服务器会返回详细的错误信息：

- **连接失败**: 检查 MySQL 是否运行，主机和端口是否正确
- **访问拒绝**: 检查用户名和密码
- **查询超时**: 查询超过 30 秒，考虑添加索引或简化查询
- **语法错误**: 返回 MySQL 的具体错误信息

## 开发

```bash
# 开发模式（支持热重载）
npm run dev

# 构建
npm run build

# 运行构建后的版本
npm start
```

## 技术栈

- **TypeScript**: 类型安全的开发体验
- **mysql2**: MySQL 客户端库（Promise 支持）
- **@modelcontextprotocol/sdk**: MCP 协议实现
- **zod**: 运行时类型验证

## 许可证

Private

## 注意事项

1. 生产环境请使用只读账户执行查询操作
2. 写入操作需要特别谨慎，建议在使用前进行权限控制
3. 敏感信息（密码）不要硬编码在配置文件中
4. 建议使用环境变量或密钥管理服务存储数据库凭证
