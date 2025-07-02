import { z } from "zod";
import { TodoDatabase } from "./database.js";
import {
  GetPromptResult,
  ReadResourceResult,
  ResourceLink,
  CreateTodoSchema,
  UpdateTodoSchema,
  TodoFilterSchema,
  UserInfo,
} from "./types.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export class TodoMcpServer {
  private database: TodoDatabase;

  constructor(database: TodoDatabase) {
    this.database = database;
  }

  getTools() {
    return {
      createTodo: {
        description: "Create a new TODO item",
        parameters: CreateTodoSchema,
      },
      getTodo: {
        description: "Get a TODO item by ID",
        parameters: z.object({ id: z.string() }),
      },
      listTodos: {
        description: "List all TODO items",
        parameters: TodoFilterSchema,
      },
      updateTodo: {
        description: "Update a TODO item",
        parameters: UpdateTodoSchema,
      },
      deleteTodo: {
        description: "Delete a TODO item",
        parameters: z.object({ id: z.string() }),
      },
      getTodoStats: {
        description: "Get TODO statistics",
      },
      completeTodo: {
        description: "Mark a TODO item as completed",
        parameters: z.object({ id: z.string() }),
      },
      getTodoResources: {
        description: "Get TODO resources",
      },
    };
  }

  // Helper function to extract user info from headers
  private extractUserInfo(headers: any): UserInfo {
    const userId = headers["x-forwarded-user"] || "anonymous";
    const email = headers["x-forwarded-email"] || "anonymous@example.com";
    const name = headers["x-forwarded-name"] || "Anonymous User";

    return { id: userId, email, name };
  }

  // Create a new TODO item
  async createTodo(params: any, headers: any): Promise<CallToolResult> {
    try {
      const user = this.extractUserInfo(headers);
      const validatedData = CreateTodoSchema.parse(params);

      const todo = await this.database.createTodo(validatedData, user);

      return {
        content: [
          {
            type: "text",
            text: `✅ TODO created successfully!\n\n**${todo.title}**\n${
              todo.description ? `Description: ${todo.description}\n` : ""
            }Priority: ${todo.priority}\n${
              todo.due_date
                ? `Due: ${todo.due_date.toLocaleDateString()}\n`
                : ""
            }ID: ${todo.id}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error creating TODO: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  }

  // Get a specific TODO item by ID
  async getTodo(params: any, headers: any): Promise<CallToolResult> {
    try {
      const user = this.extractUserInfo(headers);
      const { id } = z.object({ id: z.string() }).parse(params);

      const todo = await this.database.getTodoById(id, user.id);

      if (!todo) {
        return {
          content: [
            {
              type: "text",
              text: `❌ TODO with ID "${id}" not found`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `**${todo.title}**\n${
              todo.description ? `Description: ${todo.description}\n` : ""
            }Status: ${
              todo.completed ? "✅ Completed" : "⏳ Pending"
            }\nPriority: ${todo.priority}\n${
              todo.due_date
                ? `Due: ${todo.due_date.toLocaleDateString()}\n`
                : ""
            }Created: ${todo.created_at.toLocaleDateString()}\nUpdated: ${todo.updated_at.toLocaleDateString()}\nID: ${
              todo.id
            }`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error retrieving TODO: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  }

  // List all TODO items with optional filtering
  async listTodos(params: any, headers: any): Promise<CallToolResult> {
    try {
      const user = this.extractUserInfo(headers);
      const filters = TodoFilterSchema.parse(params);

      const { todos, total } = await this.database.getAllTodos(
        user.id,
        filters
      );

      if (todos.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `📝 No TODO items found${
                filters.search ? ` matching "${filters.search}"` : ""
              }`,
            },
          ],
        };
      }

      const todoList = todos
        .map((todo) => {
          const status = todo.completed ? "✅" : "⏳";
          const priority =
            todo.priority === "high"
              ? "🔴"
              : todo.priority === "medium"
              ? "🟡"
              : "🟢";
          const dueInfo = todo.due_date
            ? ` (Due: ${todo.due_date.toLocaleDateString()})`
            : "";
          return `${status} ${priority} **${todo.title}**${dueInfo}`;
        })
        .join("\n");

      return {
        content: [
          {
            type: "text",
            text: `📝 Found ${total} TODO items (showing ${todos.length}):\n\n${todoList}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error listing TODOs: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  }

  // Update a TODO item
  async updateTodo(params: any, headers: any): Promise<CallToolResult> {
    try {
      const user = this.extractUserInfo(headers);
      const { id, ...updates } = z
        .object({
          id: z.string(),
          ...UpdateTodoSchema.shape,
        })
        .parse(params);

      const todo = await this.database.updateTodo(id, updates, user.id);

      if (!todo) {
        return {
          content: [
            {
              type: "text",
              text: `❌ TODO with ID "${id}" not found`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `✅ TODO updated successfully!\n\n**${todo.title}**\n${
              todo.description ? `Description: ${todo.description}\n` : ""
            }Status: ${
              todo.completed ? "✅ Completed" : "⏳ Pending"
            }\nPriority: ${todo.priority}\n${
              todo.due_date
                ? `Due: ${todo.due_date.toLocaleDateString()}\n`
                : ""
            }Updated: ${todo.updated_at.toLocaleDateString()}\nID: ${todo.id}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error updating TODO: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  }

  // Delete a TODO item
  async deleteTodo(params: any, headers: any): Promise<CallToolResult> {
    try {
      const user = this.extractUserInfo(headers);
      const { id } = z.object({ id: z.string() }).parse(params);

      const success = await this.database.deleteTodo(id, user.id);

      if (!success) {
        return {
          content: [
            {
              type: "text",
              text: `❌ TODO with ID "${id}" not found`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `🗑️ TODO with ID "${id}" deleted successfully`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error deleting TODO: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  }

  // Get TODO statistics
  async getTodoStats(params: any, headers: any): Promise<CallToolResult> {
    try {
      const user = this.extractUserInfo(headers);
      const stats = await this.database.getTodoStats(user.id);

      return {
        content: [
          {
            type: "text",
            text: `📊 TODO Statistics for ${user.name}:\n\n📝 Total: ${
              stats.total
            }\n✅ Completed: ${stats.completed}\n⏳ Pending: ${
              stats.pending
            }\n🚨 Overdue: ${stats.overdue}\n\nCompletion Rate: ${
              stats.total > 0
                ? Math.round((stats.completed / stats.total) * 100)
                : 0
            }%`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error getting statistics: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  }

  // Mark TODO as completed
  async completeTodo(params: any, headers: any): Promise<CallToolResult> {
    try {
      const user = this.extractUserInfo(headers);
      const { id } = z.object({ id: z.string() }).parse(params);

      const todo = await this.database.updateTodo(
        id,
        { completed: true },
        user.id
      );

      if (!todo) {
        return {
          content: [
            {
              type: "text",
              text: `❌ TODO with ID "${id}" not found`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `🎉 Congratulations! TODO completed:\n\n**${todo.title}**\n${
              todo.description ? `Description: ${todo.description}\n` : ""
            }Priority: ${
              todo.priority
            }\nCompleted: ${todo.updated_at.toLocaleDateString()}\nID: ${
              todo.id
            }`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error completing TODO: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  }

  // Get TODO items as resource links
  async getTodoResources(params: any, headers: any): Promise<CallToolResult> {
    try {
      const user = this.extractUserInfo(headers);
      const filters = TodoFilterSchema.parse(params);

      const { todos } = await this.database.getAllTodos(user.id, filters);

      const resourceLinks: ResourceLink[] = todos.map((todo) => ({
        type: "resource_link",
        uri: `todo://${todo.id}`,
        name: todo.title,
        mimeType: "application/json",
        description: `${todo.completed ? "Completed" : "Pending"} - ${
          todo.priority
        } priority${
          todo.due_date ? ` - Due: ${todo.due_date.toLocaleDateString()}` : ""
        }`,
      }));

      return {
        content: [
          {
            type: "text",
            text: `📝 Available TODO resources (${resourceLinks.length} items):`,
          },
          {
            type: "text",
            text: "\nYou can read any of these resources using their URI.",
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error getting TODO resources: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  }

  // Read a TODO resource
  async readTodoResource(
    uri: string,
    headers: any
  ): Promise<ReadResourceResult> {
    try {
      const user = this.extractUserInfo(headers);
      const todoId = uri.replace("todo://", "");

      const todo = await this.database.getTodoById(todoId, user.id);

      if (!todo) {
        throw new Error(`TODO with ID "${todoId}" not found`);
      }

      return {
        contents: [
          {
            uri,
            text: JSON.stringify(todo, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(
        `Error reading TODO resource: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // Get a prompt template for creating TODOs
  async getCreateTodoPrompt(params: any): Promise<GetPromptResult> {
    const { title, description, priority, due_date } = params;

    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please help me create a TODO item with the following details:\nTitle: ${
              title || "[Please provide a title]"
            }\nDescription: ${
              description || "[Optional description]"
            }\nPriority: ${priority || "medium"}\nDue Date: ${
              due_date || "[Optional due date]"
            }\n\nPlease provide any additional suggestions or improvements for this TODO item.`,
          },
        },
      ],
    };
  }
}
