import { db } from "../../mongodb/client.js";
import { BaseTool, ToolResponse } from "../base/tool.js";
import { models } from "../../mongoose/manager.js";

export class ListCollectionsTool extends BaseTool {
  name = "listCollections";
  description = "List available collections in the database";
  inputSchema = {
    type: "object" as const,  // Use "as const" to make TypeScript infer the literal type
    properties: {},
    required: [] as string[],  // Explicit type for the array
    additionalProperties: false
  };

  async execute(): Promise<ToolResponse> {
    try {
      // Get collections from native MongoDB driver
      const collectionsArray = await db.listCollections().toArray();
      const collections = collectionsArray.map((c) => c.name);

      // Get information about which collections have Mongoose schemas
      const collectionsWithSchemas = Array.from(models.values()).map(
        (model) => model.collection.name
      );

      // Format the result
      const result = {
        collections,
        collectionsWithSchemas,
        totalCollections: collections.length,
        totalCollectionsWithSchemas: collectionsWithSchemas.length,
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
        isError: false,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
}
