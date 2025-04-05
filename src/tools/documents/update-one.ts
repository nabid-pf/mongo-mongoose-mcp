import { db } from "../../mongodb/client.js";
import { BaseTool, ToolResponse } from "../base/tool.js";
import { getModelForCollection, hasSchemaForCollection } from "../../mongoose/manager.js";

type UpdateOneParams = {
  collection: string;
  filter: Record<string, unknown>;
  update: Record<string, unknown>;
  upsert?: boolean;
};

export class UpdateOneTool extends BaseTool<UpdateOneParams> {
  name = "updateOne";
  description = "Update a single document in a collection";
  inputSchema = {
    type: "object" as const,
    properties: {
      collection: {
        type: "string",
        description: "Collection name"
      },
      filter: {
        type: "object",
        description: "Filter to match the document to update",
        additionalProperties: true
      },
      update: {
        type: "object",
        description: "Update operations to apply to the document (e.g. {$set: {name: 'new name'}})",
        additionalProperties: true
      },
      upsert: {
        type: "boolean",
        description: "Insert a new document if no match is found",
        default: false
      }
    },
    required: ["collection", "filter", "update"] as string[],
    additionalProperties: false
  };

  async execute(params: UpdateOneParams): Promise<ToolResponse> {
    try {
      const collection = this.validateCollection(params.collection);
      const filter = this.validateObject(params.filter, "filter");
      const update = this.validateObject(params.update, "update");
      const upsert = params.upsert || false;

      // Add isDeleted filter to exclude soft-deleted documents by default
      const finalFilter = { ...filter, isDeleted: { $ne: true } };
      let result;

      // Check if we have a schema for this collection
      if (hasSchemaForCollection(collection)) {
        const model = getModelForCollection(collection);
        console.error(`Using Mongoose model for collection: ${collection}`);
        
        if (!model) {
          throw new Error(`Model exists for collection ${collection} but could not be retrieved`);
        }
        
        // Ensure update has an operator, if not, wrap it in $set
        const updateWithOperator = Object.keys(update)[0]?.startsWith('$') 
          ? update 
          : { $set: update };
        
        // Use Mongoose model
        result = await model.updateOne(finalFilter, updateWithOperator, { upsert });
      } else {
        console.error(`Using native MongoDB for collection: ${collection}`);
        
        // Ensure update has an operator, if not, wrap it in $set
        const updateWithOperator = Object.keys(update)[0]?.startsWith('$') 
          ? update 
          : { $set: update };
        
        // Use native MongoDB driver
        result = await db.collection(collection).updateOne(finalFilter, updateWithOperator, { upsert });
      }

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
