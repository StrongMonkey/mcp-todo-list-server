import { z } from "zod";

// MCP Types (simplified version based on the example)
export interface CallToolResult {
  content: Array<
    | {
        type: "text";
        text: string;
      }
    | ResourceLink
  >;
}

export interface GetPromptResult {
  messages: Array<{
    role: "user" | "assistant";
    content: {
      type: "text";
      text: string;
    };
  }>;
}

export interface ReadResourceResult {
  contents: Array<{
    uri: string;
    text: string;
  }>;
}

export interface ResourceLink {
  type: "resource_link";
  uri: string;
  name: string;
  mimeType: string;
  description?: string;
}

export interface PrimitiveSchemaDefinition {
  type: "string" | "number" | "integer" | "boolean";
  title?: string;
  description?: string;
  format?: string;
  enum?: string[];
  enumNames?: string[];
  default?: any;
  minimum?: number;
  maximum?: number;
  maxLength?: number;
}

// TODO Item Types
export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  due_date?: Date;
  created_at: Date;
  updated_at: Date;
  user_id: string;
  user_email: string;
  user_name: string;
}

export interface CreateTodoRequest {
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  due_date?: string;
}

export interface UpdateTodoRequest {
  title?: string;
  description?: string;
  completed?: boolean;
  priority?: "low" | "medium" | "high";
  due_date?: string;
}

// User Info from Headers
export interface UserInfo {
  id: string;
  email: string;
  name: string;
}

// Zod Schemas for validation
export const CreateTodoSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
  description: z.string().max(1000, "Description too long").optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  due_date: z.string().datetime().optional(),
});

export const UpdateTodoSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title too long")
    .optional(),
  description: z.string().max(1000, "Description too long").optional(),
  completed: z.boolean().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  due_date: z.string().datetime().optional(),
});

export const TodoFilterSchema = z.object({
  completed: z.boolean().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

// Helper function to check if request is initialization
export function isInitializeRequest(body: any): boolean {
  return body.method === "initialize";
}
