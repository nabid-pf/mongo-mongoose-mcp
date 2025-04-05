import { db } from "../../mongodb/client.js";
import { BaseTool, ToolResponse } from "../base/tool.js";
import { getModelForCollection, hasSchemaForCollection } from "../../mongoose/manager.js";

type CountParams = {
  collection: string;
  filter?: Record<string, unknown>;
};

export class CountTool extends BaseTool<CountParams> {
  name = "count";
  description = "Count documents in a collection with optional filtering";
  inputSchema = {
    type: "object" as const,
    properties: {
      collection: {
        type: "string",
        description: "Collection name"
      },
      filter: {
        type: "object",
        description: "MongoDB filter query",
        additionalProperties: true,
        default: {}
      }
    },
    required: ["collection"] as string[],
    additionalProperties: false
  };

  async execute(params: CountParams): Promise<ToolResponse> {
    try {
      const collection = this.validateCollection(params.collection);
      const filter = params.filter || {};

      // Add isDeleted filter to exclude soft-deleted documents by default
      const finalFilter = { ...filter, isDeleted: { $ne: true } };
      let count;

      // Check if we have a schema for this collection
      if (hasSchemaForCollection(collection)) {
        const model = getModelForCollection(collection);
        console.error(`Using Mongoose model for collection: ${collection}`);
        
        if (!model) {
          throw new Error(`Model exists for collection ${collection} but could not be retrieved`);
        }
        
        // Use Mongoose model
        count = await model.countDocuments(finalFilter);
      } else {
        console.error(`Using native MongoDB for collection: ${collection}`);
        
        // Use native MongoDB driver
        count = await db.collection(collection).countDocuments(finalFilter);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ count }, null, 2),
          },
        ],
        isError: false,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
}
