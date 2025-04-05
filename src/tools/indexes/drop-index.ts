import { db } from "../../mongodb/client.js";
import { BaseTool, ToolResponse } from "../base/tool.js";
import { getModelForCollection, hasSchemaForCollection } from "../../mongoose/manager.js";

type DropIndexParams = {
  collection: string;
  indexName: string;
};

export class DropIndexTool extends BaseTool<DropIndexParams> {
  name = "dropIndex";
  description = "Remove an index from a collection";
  inputSchema = {
    type: "object" as const,
    properties: {
      collection: {
        type: "string",
        description: "Collection name"
      },
      indexName: {
        type: "string",
        description: "Name of the index to drop"
      }
    },
    required: ["collection", "indexName"] as string[],
    additionalProperties: false
  };

  async execute(params: DropIndexParams): Promise<ToolResponse> {
    try {
      const collection = this.validateCollection(params.collection);
      const indexName = params.indexName;

      if (typeof indexName !== "string" || !indexName.trim()) {
        throw new Error("Index name must be a non-empty string");
      }

      let result;

      // Check if we have a schema for this collection
      if (hasSchemaForCollection(collection)) {
        const model = getModelForCollection(collection);
        console.error(`Using Mongoose model for collection: ${collection}`);
        
        if (!model) {
          throw new Error(`Model exists for collection ${collection} but could not be retrieved`);
        }
        
        // Use Mongoose model
        result = await model.collection.dropIndex(indexName);
      } else {
        console.error(`Using native MongoDB for collection: ${collection}`);
        
        // Use native MongoDB driver
        result = await db.collection(collection).dropIndex(indexName);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              acknowledged: true,
              message: `Index '${indexName}' dropped successfully from collection ${collection}`
            }, null, 2),
          },
        ],
        isError: false,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
}
