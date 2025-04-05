import { db } from "../../mongodb/client.js";
import { BaseTool, ToolResponse } from "../base/tool.js";
import { getModelForCollection, hasSchemaForCollection } from "../../mongoose/manager.js";

type DeleteOneParams = {
  collection: string;
  filter: Record<string, unknown>;
};

export class DeleteOneTool extends BaseTool<DeleteOneParams> {
  name = "deleteOne";
  description = "Soft delete a single document from a collection";
  inputSchema = {
    type: "object" as const,
    properties: {
      collection: {
        type: "string",
        description: "Collection name"
      },
      filter: {
        type: "object",
        description: "Filter to match the document to delete",
        additionalProperties: true
      }
    },
    required: ["collection", "filter"] as string[],
    additionalProperties: false
  };

  async execute(params: DeleteOneParams): Promise<ToolResponse> {
    try {
      const collection = this.validateCollection(params.collection);
      const filter = this.validateObject(params.filter, "filter");

      // Add isDeleted filter to exclude already deleted documents
      const finalFilter = { ...filter, isDeleted: { $ne: true } };
      let result;

      // Implementing soft delete by setting a deletedAt timestamp
      const softDeleteUpdate = {
        $set: { 
          deletedAt: new Date(),
          isDeleted: true 
        }
      };

      // Check if we have a schema for this collection
      if (hasSchemaForCollection(collection)) {
        const model = getModelForCollection(collection);
        console.error(`Using Mongoose model for collection: ${collection}`);
        
        if (!model) {
          throw new Error(`Model exists for collection ${collection} but could not be retrieved`);
        }
        
        // Use Mongoose model with soft delete
        result = await model.updateOne(finalFilter, softDeleteUpdate);
      } else {
        console.error(`Using native MongoDB for collection: ${collection}`);
        
        // Use native MongoDB driver with soft delete
        result = await db.collection(collection).updateOne(finalFilter, softDeleteUpdate);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              ...result,
              softDeleted: true,
              message: "Document has been soft deleted (marked as deleted but still exists in the database)"
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
