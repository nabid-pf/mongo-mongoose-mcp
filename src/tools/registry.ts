import { BaseTool } from "./base/tool.js";
import { ListCollectionsTool } from "./collection/list-collections.js";
import { FindTool } from "./documents/find.js";
import { InsertOneTool } from "./documents/insert-one.js";
import { UpdateOneTool } from "./documents/update-one.js";
import { DeleteOneTool } from "./documents/delete-one.js";
import { CountTool } from "./documents/count.js";
import { AggregateTool } from "./documents/aggregate.js";
import { CreateIndexTool } from "./indexes/create-index.js";
import { DropIndexTool } from "./indexes/drop-index.js";
import { ListIndexesTool } from "./indexes/list-indexes.js";
import { McpError, ErrorCode, Tool } from "@modelcontextprotocol/sdk/types.js";

export class ToolRegistry {
  private tools: Map<string, BaseTool<any>> = new Map();

  constructor() {
    // Collection tools
    this.registerTool(new ListCollectionsTool());
    
    // Document tools
    this.registerTool(new FindTool());
    this.registerTool(new InsertOneTool());
    this.registerTool(new UpdateOneTool());
    this.registerTool(new DeleteOneTool());
    this.registerTool(new CountTool());
    this.registerTool(new AggregateTool());
    
    // Index tools
    this.registerTool(new CreateIndexTool());
    this.registerTool(new DropIndexTool());
    this.registerTool(new ListIndexesTool());
  }

  registerTool(tool: BaseTool<any>) {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): BaseTool<any> | undefined {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
    return tool;
  }

  getAllTools(): BaseTool<any>[] {
    return Array.from(this.tools.values());
  }

  getToolSchemas(): Tool[] {
    return this.getAllTools().map((tool) => {
      const inputSchema = tool.inputSchema as any;
      return {
        name: tool.name,
        description: tool.description,
        inputSchema: {
          type: "object",
          properties: inputSchema.properties || {},
          ...(inputSchema.required && { required: inputSchema.required }),
        },
      };
    });
  }
}
