// Example usage of the TODO List MCP Server
// This file demonstrates how to interact with the server

const BASE_URL = "http://localhost:3000";
const SESSION_ID = "test-session-123";

// Helper function to make MCP requests
async function makeMcpRequest(method, params, headers = {}) {
  const response = await fetch(`${BASE_URL}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "mcp-session-id": SESSION_ID,
      "X-Forwarded-User": "test-user-123",
      "X-Forwarded-Email": "test@example.com",
      "X-Forwarded-Name": "Test User",
      ...headers,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    }),
  });

  return response.json();
}

// Example: Initialize the MCP connection
async function initialize() {
  console.log("Initializing MCP connection...");
  const result = await makeMcpRequest("initialize", {});
  console.log("Initialization result:", result);
  return result;
}

// Example: Create a TODO
async function createTodo() {
  console.log("\nCreating a TODO...");
  const result = await makeMcpRequest("tools/call", {
    name: "create-todo",
    arguments: {
      title: "Buy groceries",
      description: "Milk, bread, eggs, and vegetables",
      priority: "medium",
      due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    },
  });
  console.log("Create TODO result:", result);
  return result;
}

// Example: Create another TODO
async function createAnotherTodo() {
  console.log("\nCreating another TODO...");
  const result = await makeMcpRequest("tools/call", {
    name: "create-todo",
    arguments: {
      title: "Write documentation",
      description: "Update the README with new features",
      priority: "high",
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Next week
    },
  });
  console.log("Create another TODO result:", result);
  return result;
}

// Example: List all TODOs
async function listTodos() {
  console.log("\nListing all TODOs...");
  const result = await makeMcpRequest("tools/call", {
    name: "list-todos",
    arguments: {
      limit: 10,
      offset: 0,
    },
  });
  console.log("List TODOs result:", result);
  return result;
}

// Example: Get TODO statistics
async function getStats() {
  console.log("\nGetting TODO statistics...");
  const result = await makeMcpRequest("tools/call", {
    name: "get-todo-stats",
    arguments: {},
  });
  console.log("Statistics result:", result);
  return result;
}

// Example: Search TODOs
async function searchTodos() {
  console.log("\nSearching for TODOs...");
  const result = await makeMcpRequest("tools/call", {
    name: "list-todos",
    arguments: {
      search: "groceries",
      completed: false,
    },
  });
  console.log("Search result:", result);
  return result;
}

// Example: Get TODO resources
async function getResources() {
  console.log("\nGetting TODO resources...");
  const result = await makeMcpRequest("tools/call", {
    name: "get-todo-resources",
    arguments: {
      limit: 5,
    },
  });
  console.log("Resources result:", result);
  return result;
}

// Example: Get a prompt template
async function getPromptTemplate() {
  console.log("\nGetting prompt template...");
  const result = await makeMcpRequest("prompts/get", {
    name: "create-todo-template",
    arguments: {
      title: "New task",
      description: "Task description",
      priority: "medium",
    },
  });
  console.log("Prompt template result:", result);
  return result;
}

// Example: Read a resource
async function readResource(uri) {
  console.log(`\nReading resource: ${uri}`);
  const result = await makeMcpRequest("resources/read", {
    uri,
  });
  console.log("Read resource result:", result);
  return result;
}

// Example: Complete a TODO (you'll need to extract the ID from a previous response)
async function completeTodo(todoId) {
  console.log(`\nCompleting TODO: ${todoId}`);
  const result = await makeMcpRequest("tools/call", {
    name: "complete-todo",
    arguments: {
      id: todoId,
    },
  });
  console.log("Complete TODO result:", result);
  return result;
}

// Example: Delete a TODO (you'll need to extract the ID from a previous response)
async function deleteTodo(todoId) {
  console.log(`\nDeleting TODO: ${todoId}`);
  const result = await makeMcpRequest("tools/call", {
    name: "delete-todo",
    arguments: {
      id: todoId,
    },
  });
  console.log("Delete TODO result:", result);
  return result;
}

// Example: Clean up session
async function cleanup() {
  console.log("\nCleaning up session...");
  const response = await fetch(`${BASE_URL}/mcp`, {
    method: "DELETE",
    headers: {
      "mcp-session-id": SESSION_ID,
    },
  });
  console.log("Cleanup status:", response.status);
}

// Run all examples
async function runExamples() {
  try {
    await initialize();
    await createTodo();
    await createAnotherTodo();
    await listTodos();
    await getStats();
    await searchTodos();
    await getResources();
    await getPromptTemplate();

    // Note: To test these, you'll need to extract actual TODO IDs from previous responses
    // await completeTodo('some-todo-id');
    // await deleteTodo('some-todo-id');

    await cleanup();

    console.log("\n✅ All examples completed successfully!");
  } catch (error) {
    console.error("❌ Error running examples:", error);
  }
}

// Check if server is running
async function checkHealth() {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    const result = await response.json();
    console.log("Server health:", result);
    return result.status === "ok";
  } catch (error) {
    console.error("Server not running or health check failed:", error);
    return false;
  }
}

// Main execution
async function main() {
  console.log("🚀 TODO List MCP Server Test Examples");
  console.log("=====================================\n");

  const isHealthy = await checkHealth();
  if (!isHealthy) {
    console.log("❌ Server is not running. Please start the server first:");
    console.log("   npm run dev");
    return;
  }

  console.log("✅ Server is running and healthy!\n");
  await runExamples();
}

// Run if this file is executed directly
if (typeof window === "undefined") {
  main();
}

module.exports = {
  makeMcpRequest,
  initialize,
  createTodo,
  listTodos,
  getStats,
  searchTodos,
  getResources,
  getPromptTemplate,
  readResource,
  completeTodo,
  deleteTodo,
  cleanup,
  checkHealth,
};
