import { z } from "zod";
import { ToolDefinition } from "../types/tool-definition.js";
import MongoDBClient from "../clients/mongodb-client.js";

const toolName = "updateOne";
const toolDescription = "Update a single document";

const toolSchema = {
  collection: z.string().describe("The collection name to update"),
  filter: z.string().describe("Filter query in JSON format to find the document to update"),
  update: z.string().describe("Update operations in JSON format"),
  upsert: z.boolean().describe("Create the document if it doesn't exist").default(false)
};

const toolHandler = async (
  args: { collection: string; filter: string; update: string; upsert: boolean }, 
  _extra: { signal: AbortSignal }
) => {
  try {
    const client = MongoDBClient.getInstance();
    const db = client.getDb();
    
    // Parse the JSON strings
    const filterObj = JSON.parse(args.filter);
    const updateObj = JSON.parse(args.update);
    
    // Check if we have a schema for this collection
    const hasSchema = client.hasSchema(args.collection);
    const model = client.getModel(args.collection);
    
    let result;
    
    // If we have a schema and the model exists, use Mongoose
    if (hasSchema && model) {
      result = await model.updateOne(
        filterObj,
        updateObj,
        { upsert: args.upsert }
      );
    } else {
      // Use native MongoDB driver
      const collection = db.collection(args.collection);
      result = await collection.updateOne(
        filterObj,
        updateObj,
        { upsert: args.upsert }
      );
    }
    
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            status: "success",
            usedModel: hasSchema && model ? "Mongoose" : "MongoDB Native",
            result
          }, null, 2)
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            status: "error",
            message: (error as Error).message,
            stack: (error as Error).stack
          }, null, 2)
        }
      ]
    };
  }
};

export const UpdateOneTool: ToolDefinition<typeof toolSchema> = {
  name: toolName,
  description: toolDescription,
  schema: toolSchema,
  handler: toolHandler
};
