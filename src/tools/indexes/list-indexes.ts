import { db } from "../../mongodb/client.js";
import { BaseTool, ToolResponse } from "../base/tool.js";
import { getModelForCollection, hasSchemaForCollection } from "../../mongoose/manager.js";
import { Document } from "mongodb";

type ListIndexesParams = {
  collection: string;
};

export class ListIndexesTool extends BaseTool<ListIndexesParams> {
  name = "indexes";
  description = "List indexes for a collection";
  inputSchema = {
    type: "object" as const,
    properties: {
      collection: {
        type: "string",
        description: "Collection name"
      }
    },
    required: ["collection"] as string[],
    additionalProperties: false
  };

  async execute(params: ListIndexesParams): Promise<ToolResponse> {
    try {
      const collection = this.validateCollection(params.collection);

      let indexes: Document[] = [];

      // Check if we have a schema for this collection
      if (hasSchemaForCollection(collection)) {
        const model = getModelForCollection(collection);
        console.error(`Using Mongoose model for collection: ${collection}`);
        
        if (!model) {
          throw new Error(`Model exists for collection ${collection} but could not be retrieved`);
        }
        
        // Use Mongoose model
        indexes = await model.collection.indexes();
      } else {
        console.error(`Using native MongoDB for collection: ${collection}`);
        
        // Use native MongoDB driver
        indexes = await db.collection(collection).indexes();
      }

      // Ensure we have an array
      if (!indexes) {
        indexes = [];
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(indexes, null, 2),
          },
        ],
        isError: false,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
}
