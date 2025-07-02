import { Pool, PoolClient } from "pg";
import {
  TodoItem,
  CreateTodoRequest,
  UpdateTodoRequest,
  UserInfo,
} from "./types.js";

export class TodoDatabase {
  private pool: Pool;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is required");
    }

    this.pool = new Pool({
      connectionString: databaseUrl,
      min: parseInt(process.env.DB_POOL_MIN || "2"),
      max: parseInt(process.env.DB_POOL_MAX || "10"),
    });

    // Test the connection
    this.pool.on("error", (err) => {
      console.error("Unexpected error on idle client", err);
      process.exit(-1);
    });
  }

  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS todo_items (
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
        )
      `);

      // Create indexes for better performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_todo_user_id ON todo_items(user_id);
        CREATE INDEX IF NOT EXISTS idx_todo_completed ON todo_items(completed);
        CREATE INDEX IF NOT EXISTS idx_todo_priority ON todo_items(priority);
        CREATE INDEX IF NOT EXISTS idx_todo_due_date ON todo_items(due_date);
      `);

      console.log("Database initialized successfully");
    } finally {
      client.release();
    }
  }

  async createTodo(todo: CreateTodoRequest, user: UserInfo): Promise<TodoItem> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `
        INSERT INTO todo_items (title, description, priority, due_date, user_id, user_email, user_name)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
        [
          todo.title,
          todo.description || null,
          todo.priority || "medium",
          todo.due_date ? new Date(todo.due_date) : null,
          user.id,
          user.email,
          user.name,
        ]
      );

      return this.mapRowToTodoItem(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async getTodoById(id: string, userId: string): Promise<TodoItem | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `
        SELECT * FROM todo_items 
        WHERE id = $1 AND user_id = $2
      `,
        [id, userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToTodoItem(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async getAllTodos(
    userId: string,
    filters: {
      completed?: boolean;
      priority?: string;
      search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ todos: TodoItem[]; total: number }> {
    const client = await this.pool.connect();
    try {
      let whereConditions = ["user_id = $1"];
      let params = [userId];
      let paramIndex = 2;

      if (filters.completed !== undefined) {
        whereConditions.push(`completed = $${paramIndex}`);
        params.push(filters.completed.toString());
        paramIndex++;
      }

      if (filters.priority) {
        whereConditions.push(`priority = $${paramIndex}`);
        params.push(filters.priority);
        paramIndex++;
      }

      if (filters.search) {
        whereConditions.push(
          `(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`
        );
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      const whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

      // Get total count
      const countResult = await client.query(
        `
        SELECT COUNT(*) FROM todo_items ${whereClause}
      `,
        params
      );
      const total = parseInt(countResult.rows[0].count);

      // Get paginated results
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;

      const result = await client.query(
        `
        SELECT * FROM todo_items 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `,
        [...params, limit, offset]
      );

      const todos = result.rows.map((row) => this.mapRowToTodoItem(row));

      return { todos, total };
    } finally {
      client.release();
    }
  }

  async updateTodo(
    id: string,
    updates: UpdateTodoRequest,
    userId: string
  ): Promise<TodoItem | null> {
    const client = await this.pool.connect();
    try {
      const setClauses: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (updates.title !== undefined) {
        setClauses.push(`title = $${paramIndex}`);
        params.push(updates.title);
        paramIndex++;
      }

      if (updates.description !== undefined) {
        setClauses.push(`description = $${paramIndex}`);
        params.push(updates.description);
        paramIndex++;
      }

      if (updates.completed !== undefined) {
        setClauses.push(`completed = $${paramIndex}`);
        params.push(updates.completed);
        paramIndex++;
      }

      if (updates.priority !== undefined) {
        setClauses.push(`priority = $${paramIndex}`);
        params.push(updates.priority);
        paramIndex++;
      }

      if (updates.due_date !== undefined) {
        setClauses.push(`due_date = $${paramIndex}`);
        params.push(updates.due_date ? new Date(updates.due_date) : null);
        paramIndex++;
      }

      if (setClauses.length === 0) {
        return this.getTodoById(id, userId);
      }

      setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

      const result = await client.query(
        `
        UPDATE todo_items 
        SET ${setClauses.join(", ")}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `,
        [...params, id, userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToTodoItem(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async deleteTodo(id: string, userId: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `
        DELETE FROM todo_items 
        WHERE id = $1 AND user_id = $2
      `,
        [id, userId]
      );

      return (result.rowCount ?? 0) > 0;
    } finally {
      client.release();
    }
  }

  async getTodoStats(userId: string): Promise<{
    total: number;
    completed: number;
    pending: number;
    overdue: number;
  }> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE completed = true) as completed,
          COUNT(*) FILTER (WHERE completed = false) as pending,
          COUNT(*) FILTER (WHERE completed = false AND due_date < CURRENT_TIMESTAMP) as overdue
        FROM todo_items 
        WHERE user_id = $1
      `,
        [userId]
      );

      const row = result.rows[0];
      return {
        total: parseInt(row.total),
        completed: parseInt(row.completed),
        pending: parseInt(row.pending),
        overdue: parseInt(row.overdue),
      };
    } finally {
      client.release();
    }
  }

  private mapRowToTodoItem(row: any): TodoItem {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      completed: row.completed,
      priority: row.priority,
      due_date: row.due_date ? new Date(row.due_date) : undefined,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      user_id: row.user_id,
      user_email: row.user_email,
      user_name: row.user_name,
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
