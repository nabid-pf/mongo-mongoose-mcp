import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export class MongoMcpServer {
  private static instance: McpServer | null = null;

  private constructor() {}

  public static GetServer(): McpServer {
    if (MongoMcpServer.instance === null) {
      MongoMcpServer.instance = new McpServer({
        name: "MongoDB & Mongoose MCP Server",
        version: "1.0.0",
        capabilities: {
          tools: {},
        },
      });
    }
    return MongoMcpServer.instance;
  }
}
