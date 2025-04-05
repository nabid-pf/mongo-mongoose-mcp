import { db } from "../../mongodb/client.js";
import { BaseTool, ToolResponse } from "../base/tool.js";
import { getModelForCollection, hasSchemaForCollection } from "../../mongoose/manager.js";

type IndexDirection = 1 | -1 | "text" | "hashed" | "2d" | "2dsphere" | "geoHaystack";

type CreateIndexParams = {
  collection: string;
  keys: Record<string, unknown>;
  options?: Record<string, unknown>;
};

export class CreateIndexTool extends BaseTool<CreateIndexParams> {
  name = "createIndex";
  description = "Create a new index on a collection";
  inputSchema = {
    type: "object" as const,
    properties: {
      collection: {
        type: "string",
        description: "Collection name"
      },
      keys: {
        type: "object",
        description: "Fields to index (e.g. { name: 1 } for ascending index on name field)",
        additionalProperties: true
      },
      options: {
        type: "object",
        description: "Index options (e.g. { unique: true, background: true })",
        properties: {
          unique: {
            type: "boolean",
            description: "If true, the index will only accept unique values"
          },
          background: {
            type: "boolean",
            description: "Create the index in the background, not blocking other operations"
          },
          name: {
            type: "string",
            description: "Custom name for the index"
          },
          sparse: {
            type: "boolean",
            description: "If true, the index only references documents with the specified field"
          },
          expireAfterSeconds: {
            type: "integer",
            description: "TTL in seconds for documents (requires a date field)"
          }
        },
        additionalProperties: true
      }
    },
    required: ["collection", "keys"] as string[],
    additionalProperties: false
  };

  async execute(params: CreateIndexParams): Promise<ToolResponse> {
    try {
      const collection = this.validateCollection(params.collection);
      const keys = this.validateObject(params.keys, "keys");
      const options = params.options || {};

      // Convert keys to proper format expected by MongoDB/Mongoose
      const indexSpec: Record<string, IndexDirection> = {};
      Object.entries(keys).forEach(([key, value]) => {
        // Convert number-like values to actual numbers (1, -1)
        if (value === 1 || value === -1 || value === "1" || value === "-1") {
          indexSpec[key] = Number(value) as IndexDirection;
        } else if (value === "text") {
          indexSpec[key] = "text" as IndexDirection;
        } else if (value === "2dsphere") {
          indexSpec[key] = "2dsphere" as IndexDirection;
        } else {
          // Default to ascending
          indexSpec[key] = 1;
        }
      });

      let result: string;

      // Check if we have a schema for this collection
      if (hasSchemaForCollection(collection)) {
        const model = getModelForCollection(collection);
        console.error(`Using Mongoose model for collection: ${collection}`);
        
        if (!model) {
          throw new Error(`Model exists for collection ${collection} but could not be retrieved`);
        }
        
        // Use Mongoose model
        result = await model.collection.createIndex(indexSpec, options as any);
      } else {
        console.error(`Using native MongoDB for collection: ${collection}`);
        
        // Use native MongoDB driver
        result = await db.collection(collection).createIndex(indexSpec, options as any);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              indexName: result,
              message: `Index created successfully on collection ${collection}`
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
