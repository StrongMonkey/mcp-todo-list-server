import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TodoDatabase } from "./database.js";
import { TodoMcpServer } from "./mcp-server.js";
import {
  CreateTodoSchema,
  TodoFilterSchema,
  UpdateTodoSchema,
} from "./types.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { IncomingHttpHeaders } from "http";

// Load environment variables
dotenv.config();

// Create MCP server using the SDK
function createMcpServer(
  todoServer: TodoMcpServer,
  headers: IncomingHttpHeaders
): McpServer {
  const server = new McpServer(
    {
      name: "todo-list-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.tool(
    "createTodo",
    "Create a new TODO item",
    CreateTodoSchema.shape,
    async (
      { title, description, priority, due_date },
      { sendNotification }
    ): Promise<CallToolResult> => {
      return todoServer.createTodo(
        { title, description, priority, due_date },
        headers
      );
    }
  );

  server.tool(
    "getTodo",
    "Get a TODO item by ID",
    { id: z.string() },
    async ({ id }, { sendNotification }): Promise<CallToolResult> => {
      return todoServer.getTodo({ id }, headers);
    }
  );

  server.tool(
    "listTodos",
    "List all TODO items",
    TodoFilterSchema.shape,
    async (args, { sendNotification }): Promise<CallToolResult> => {
      return todoServer.listTodos(args, headers);
    }
  );

  server.tool(
    "updateTodo",
    "Update a TODO item",
    UpdateTodoSchema.shape,
    async (args, { sendNotification }): Promise<CallToolResult> => {
      return todoServer.updateTodo(args, headers);
    }
  );

  server.tool(
    "deleteTodo",
    "Delete a TODO item",
    { id: z.string() },
    async ({ id }, { sendNotification }): Promise<CallToolResult> => {
      return todoServer.deleteTodo({ id }, headers);
    }
  );

  server.tool(
    "getTodoStats",
    "Get TODO statistics",
    {},
    async (args, { sendNotification }): Promise<CallToolResult> => {
      return todoServer.getTodoStats(args, headers);
    }
  );

  return server;
}

async function getServer(headers: IncomingHttpHeaders) {
  try {
    const database = new TodoDatabase();
    await database.initialize();

    const todoServer = new TodoMcpServer(database);
    const mcpServer = createMcpServer(todoServer, headers);
    return mcpServer;
  } catch (error) {
    console.error("Failed to initialize server:", error);
    process.exit(1);
  }
}

const app = express();
app.use(express.json());

app.post("/mcp", async (req: Request, res: Response) => {
  console.log("req.headers", req.headers);
  const server = await getServer(req.headers);
  try {
    const transport: StreamableHTTPServerTransport =
      new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on("close", () => {
      console.log("Request closed");
      transport.close();
      server.close();
    });
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  }
});

app.get("/mcp", async (req: Request, res: Response) => {
  console.log("Received GET MCP request");
  res.writeHead(405).end(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    })
  );
});

app.delete("/mcp", async (req: Request, res: Response) => {
  console.log("Received DELETE MCP request");
  res.writeHead(405).end(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    })
  );
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`MCP Stateless Streamable HTTP Server listening on port ${PORT}`);
});

// Handle server shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down server...");
  process.exit(0);
});
