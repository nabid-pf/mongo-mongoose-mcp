import { z } from "zod";
import { ToolDefinition } from "../types/tool-definition.js";
import MongoDBClient from "../clients/mongodb-client.js";

const toolName = "insertOne";
const toolDescription = "Insert a single document";

const toolSchema = {
  collection: z.string().describe("The collection name to insert into"),
  document: z.string().describe("Document to insert in JSON format")
};

const toolHandler = async (
  args: { collection: string; document: string }, 
  _extra: { signal: AbortSignal }
) => {
  try {
    const client = MongoDBClient.getInstance();
    const db = client.getDb();
    
    // Parse the document JSON
    const documentObj = JSON.parse(args.document);
    
    // Check if we have a schema for this collection
    const hasSchema = client.hasSchema(args.collection);
    const model = client.getModel(args.collection);
    
    let result;
    
    // If we have a schema and the model exists, use Mongoose
    if (hasSchema && model) {
      const newDocument = new model(documentObj);
      result = await newDocument.save();
    } else {
      // Use native MongoDB driver
      const collection = db.collection(args.collection);
      result = await collection.insertOne(documentObj);
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

export const InsertOneTool: ToolDefinition<typeof toolSchema> = {
  name: toolName,
  description: toolDescription,
  schema: toolSchema,
  handler: toolHandler
};
