#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { config } from "dotenv";
import { connectToMongoDB, closeMongoDB } from "./mongodb/client.js";
import { connectToMongoose, closeMongoose } from "./mongoose/manager.js";
import { ToolRegistry } from "./tools/registry.js";

// Load environment variables
config();

// Parse command line arguments
const args = process.argv.slice(2);
const databaseUrl = args[0] || process.env.MONGODB_URI || "mongodb://localhost:27017/test";
const schemaPath = args[1] || process.env.SCHEMA_PATH;

// Initialize tools
const toolRegistry = new ToolRegistry();

// Create MCP server
const server = new Server(
  {
    name: "mongodb-mongoose-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {
        list: true,
        call: true,
      },
    },
  }
);

// Display banner
console.error(`
┌───────────────────────────────────────────────────┐
│                                                   │
│      MongoDB/Mongoose MCP Server                  │
│                v0.1.0                             │
│                                                   │
│      Connecting to MongoDB...                     │
│                                                   │
└───────────────────────────────────────────────────┘
`);

console.error(`MongoDB URI: ${databaseUrl}`);
console.error(`Schema Path: ${schemaPath || 'None (running in schemaless mode)'}`);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: toolRegistry.getToolSchemas(),
  _meta: {},
}));

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const name = request.params.name;
  const args = request.params.arguments ?? {};

  try {
    console.error(`Executing tool: ${name}`);
    console.error(`Arguments: ${JSON.stringify(args, null, 2)}`);

    const tool = toolRegistry.getTool(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }

    const result = await tool.execute(args);
    return { toolResult: result };
  } catch (error) {
    console.error("Operation failed:", error);
    return {
      toolResult: {
        content: [
          {
            type: "text",
            text: error instanceof Error ? error.message : String(error),
          },
        ],
        isError: true,
      },
    };
  }
});

// Start the server
async function runServer() {
  try {
    // Connect to MongoDB with native driver
    await connectToMongoDB(databaseUrl);
    console.error("Connected to MongoDB using native driver");
    
    // Connect to MongoDB with Mongoose (if schema path provided)
    if (schemaPath) {
      await connectToMongoose(databaseUrl, schemaPath);
      console.error("Connected to MongoDB using Mongoose with schemas");
    }
    
    // Connect to the MCP transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MongoDB/Mongoose MCP server running on stdio");
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Handle shutdown
process.on("SIGINT", async () => {
  try {
    await closeMongoDB();
    if (schemaPath) {
      await closeMongoose();
    }
  } finally {
    process.exit(0);
  }
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
  process.exit(1);
});

runServer().catch(console.error);
