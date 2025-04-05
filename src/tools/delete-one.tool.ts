import { z } from "zod";
import { ToolDefinition } from "../types/tool-definition.js";
import MongoDBClient from "../clients/mongodb-client.js";

const toolName = "deleteOne";
const toolDescription = "Soft delete a single document";

const toolSchema = {
  collection: z.string().describe("The collection name to delete from"),
  filter: z.string().describe("Filter query in JSON format to find the document to delete"),
  hardDelete: z.boolean().describe("If true, physically removes the document. If false, performs a soft delete by setting deleted=true").default(false)
};

const toolHandler = async (
  args: { collection: string; filter: string; hardDelete: boolean }, 
  _extra: { signal: AbortSignal }
) => {
  try {
    const client = MongoDBClient.getInstance();
    const db = client.getDb();
    
    // Parse the filter JSON
    const filterObj = JSON.parse(args.filter);
    
    // Check if we have a schema for this collection
    const hasSchema = client.hasSchema(args.collection);
    const model = client.getModel(args.collection);
    
    let result;
    
    if (args.hardDelete) {
      // Perform hard delete
      if (hasSchema && model) {
        result = await model.deleteOne(filterObj);
      } else {
        const collection = db.collection(args.collection);
        result = await collection.deleteOne(filterObj);
      }
    } else {
      // Perform soft delete (update with deleted flag)
      if (hasSchema && model) {
        result = await model.updateOne(
          filterObj,
          { $set: { deleted: true, deletedAt: new Date() } }
        );
      } else {
        const collection = db.collection(args.collection);
        result = await collection.updateOne(
          filterObj,
          { $set: { deleted: true, deletedAt: new Date() } }
        );
      }
    }
    
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            status: "success",
            usedModel: hasSchema && model ? "Mongoose" : "MongoDB Native",
            operationType: args.hardDelete ? "Hard Delete" : "Soft Delete",
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

export const DeleteOneTool: ToolDefinition<typeof toolSchema> = {
  name: toolName,
  description: toolDescription,
  schema: toolSchema,
  handler: toolHandler
};
