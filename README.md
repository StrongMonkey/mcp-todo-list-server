# TODO List MCP Server

A Model Context Protocol (MCP) server that provides CRUD operations for TODO items with PostgreSQL backend. The server extracts user information from forwarded headers and stores TODO items per user.

## Features

- ✅ Create, Read, Update, Delete TODO items
- 🔍 Search and filter TODOs by status, priority, and text
- 📊 Get TODO statistics and completion rates
- 🏷️ Priority levels (low, medium, high)
- 📅 Due date support
- 👤 User-specific TODO lists (extracted from headers)
- 🔗 Resource links for TODO items
- 📝 Prompt templates for TODO creation

## Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd go-mcp-todo-list
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp env.example .env
```

Edit `.env` with your database configuration:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/todo_db
PORT=3000
DB_POOL_MIN=2
DB_POOL_MAX=10
```

4. Create the PostgreSQL database:

```sql
CREATE DATABASE todo_db;
```

## Usage

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

The server will start on port 3000 (or the port specified in your `.env` file).

## API Endpoints

### MCP Endpoint

- `POST /mcp` - Main MCP protocol endpoint
- `DELETE /mcp` - Clean up session

### Health Check

- `GET /health` - Server health status

## MCP Tools

### 1. Create TODO

```json
{
  "method": "tools/call",
  "params": {
    "name": "create-todo",
    "arguments": {
      "title": "Buy groceries",
      "description": "Milk, bread, eggs",
      "priority": "medium",
      "due_date": "2024-01-15T18:00:00Z"
    }
  }
}
```

### 2. List TODOs

```json
{
  "method": "tools/call",
  "params": {
    "name": "list-todos",
    "arguments": {
      "completed": false,
      "priority": "high",
      "search": "groceries",
      "limit": 10,
      "offset": 0
    }
  }
}
```

### 3. Get TODO

```json
{
  "method": "tools/call",
  "params": {
    "name": "get-todo",
    "arguments": {
      "id": "todo-id-here"
    }
  }
}
```

### 4. Update TODO

```json
{
  "method": "tools/call",
  "params": {
    "name": "update-todo",
    "arguments": {
      "id": "todo-id-here",
      "title": "Updated title",
      "completed": true,
      "priority": "high"
    }
  }
}
```

### 5. Complete TODO

```json
{
  "method": "tools/call",
  "params": {
    "name": "complete-todo",
    "arguments": {
      "id": "todo-id-here"
    }
  }
}
```

### 6. Delete TODO

```json
{
  "method": "tools/call",
  "params": {
    "name": "delete-todo",
    "arguments": {
      "id": "todo-id-here"
    }
  }
}
```

### 7. Get Statistics

```json
{
  "method": "tools/call",
  "params": {
    "name": "get-todo-stats",
    "arguments": {}
  }
}
```

### 8. Get Resources

```json
{
  "method": "tools/call",
  "params": {
    "name": "get-todo-resources",
    "arguments": {
      "completed": false,
      "limit": 5
    }
  }
}
```

## MCP Prompts

### Create TODO Template

```json
{
  "method": "prompts/get",
  "params": {
    "name": "create-todo-template",
    "arguments": {
      "title": "New task",
      "description": "Task description",
      "priority": "medium",
      "due_date": "2024-01-15"
    }
  }
}
```

## MCP Resources

### Read TODO Resource

```json
{
  "method": "resources/read",
  "params": {
    "uri": "todo://todo-id-here"
  }
}
```

### Read Statistics Resource

```json
{
  "method": "resources/read",
  "params": {
    "uri": "todo://stats"
  }
}
```

## User Authentication

The server extracts user information from the following headers:

- `X-Forwarded-User` - User ID
- `X-Forwarded-Email` - User email
- `X-Forwarded-Name` - User name

If these headers are not provided, the server will use default anonymous values.

## Database Schema

The server automatically creates the following table:

```sql
CREATE TABLE todo_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  priority VARCHAR(10) CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  due_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id VARCHAR(255) NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL
);
```

## Session Management

The server supports session-based connections:

- Include `mcp-session-id` header for session persistence
- Sessions are automatically cleaned up on DELETE requests
- Database connections are pooled per session

## Error Handling

The server returns standard JSON-RPC 2.0 error responses:

- `-32601` - Method not found
- `-32603` - Internal error
- `-32000` - Session not initialized

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### TypeScript

The project is written in TypeScript with strict type checking enabled.

## License

MIT License
