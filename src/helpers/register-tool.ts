import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Tool definition interface
 */
interface ToolDefinition<T> {
  name: string;
  description: string;
  schema: T;
  handler: (args: any, extra: { signal: AbortSignal }) => Promise<any>;
}

/**
 * Register a tool with the MCP server
 */
export function RegisterTool<Args>(
  server: McpServer,
  toolDefinition: ToolDefinition<Args>
): void {
  // Use proper method available on the Server class
  server.tool(
    toolDefinition.name,
    toolDefinition.description,
    toolDefinition.schema as any,
    toolDefinition.handler
  );
}
