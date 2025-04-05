import { db } from "../../mongodb/client.js";
import { BaseTool, ToolResponse } from "../base/tool.js";
import { getModelForCollection, hasSchemaForCollection } from "../../mongoose/manager.js";

type InsertOneParams = {
  collection: string;
  document: Record<string, unknown>;
};

interface InsertResult {
  insertedId: string;
  acknowledged: boolean;
}

export class InsertOneTool extends BaseTool<InsertOneParams> {
  name = "insertOne";
  description = "Insert a single document into a collection";
  inputSchema = {
    type: "object" as const,
    properties: {
      collection: {
        type: "string",
        description: "Collection name"
      },
      document: {
        type: "object",
        description: "Document to insert",
        additionalProperties: true
      }
    },
    required: ["collection", "document"] as string[],
    additionalProperties: false
  };

  async execute(params: InsertOneParams): Promise<ToolResponse> {
    try {
      const collection = this.validateCollection(params.collection);
      const document = this.validateObject(params.document, "document");

      let result: InsertResult;

      // Check if we have a schema for this collection
      if (hasSchemaForCollection(collection)) {
        const model = getModelForCollection(collection);
        console.error(`Using Mongoose model for collection: ${collection}`);
        
        if (!model) {
          throw new Error(`Model exists for collection ${collection} but could not be retrieved`);
        }
        
        // Use Mongoose model
        const newDoc = new model(document);
        await newDoc.save();
        
        result = {
          insertedId: newDoc._id.toString(),
          acknowledged: true,
        };
      } else {
        console.error(`Using native MongoDB for collection: ${collection}`);
        
        // Use native MongoDB driver
        const dbResult = await db.collection(collection).insertOne(document);
        
        // Create a standardized result object
        result = {
          insertedId: dbResult.insertedId ? dbResult.insertedId.toString() : "",
          acknowledged: dbResult.acknowledged || false
        };
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
