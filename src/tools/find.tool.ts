import { z } from "zod";
import { ToolDefinition } from "../types/tool-definition.js";
import MongoDBClient from "../clients/mongodb-client.js";

const toolName = "find";
const toolDescription = "Query documents with filtering and projection";

const toolSchema = {
  collection: z.string().describe("The collection name to query"),
  filter: z.string().describe("Filter query in JSON format").default("{}"),
  projection: z.string().describe("Projection in JSON format (fields to include/exclude)").default("{}"),
  limit: z.number().describe("Maximum number of documents to return").default(10),
  skip: z.number().describe("Number of documents to skip").default(0),
  sort: z.string().describe("Sort specification in JSON format").default("{}")
};

const toolHandler = async (
  args: { 
    collection: string; 
    filter: string; 
    projection: string; 
    limit: number; 
    skip: number; 
    sort: string; 
  }, 
  _extra: { signal: AbortSignal }
) => {
  const client = MongoDBClient.getInstance();
  const db = client.getDb();
  
  // Parse the JSON strings
  const filterObj = JSON.parse(args.filter);
  const projectionObj = JSON.parse(args.projection);
  const sortObj = JSON.parse(args.sort);
  
  // Get the collection
  const collection = db.collection(args.collection);
  const models = client.getModels();
  
  // Check if we have a schema for this collection
  const hasSchema = client.hasSchema(args.collection);
  const model = models[args.collection];
  try {
    let results;
    
    // If we have a schema and the model exists, use Mongoose
    if (hasSchema && model) {
      results = await model
        .find(filterObj, projectionObj)
        .sort(sortObj)
        .skip(args.skip)
        .limit(args.limit)
        .lean()
        .exec();
    } else {
      // Use native MongoDB driver
      results = await collection
        .find(filterObj, { projection: projectionObj })
        .sort(sortObj)
        .skip(args.skip)
        .limit(args.limit)
        .toArray();
    }
    
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            status: "success",
            count: results.length,
            usedModel: hasSchema && model ? "Mongoose" : "MongoDB Native",
            data: results
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
            usedModel: hasSchema && model ? "Mongoose" : "MongoDB Native",
            collection: args.collection,
            dbName: collection.dbName,
            collectionName: collection.collectionName,
            hint: collection.hint,
            filter: filterObj,
            projection: projectionObj,
            sort: sortObj,
            skip: args.skip,
            limit: args.limit,
            message: (error as Error).message,
            stack: (error as Error).stack
          }, null, 2)
        }
      ]
    };
  }
};

export const FindTool: ToolDefinition<typeof toolSchema> = {
  name: toolName,
  description: toolDescription,
  schema: toolSchema,
  handler: toolHandler
};
