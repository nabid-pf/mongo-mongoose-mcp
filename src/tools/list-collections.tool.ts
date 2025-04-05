import { z } from "zod";
import { ToolDefinition } from "../types/tool-definition.js";
import MongoDBClient from "../clients/mongodb-client.js";

const toolName = "listCollections";
const toolDescription = "List available collections";

const toolSchema = {};

const toolHandler = async (_args: {}, _extra: { signal: AbortSignal }) => {
  try {
    const client = MongoDBClient.getInstance();
    const db = client.getDb();
    
    // Get collections using the MongoDB driver
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    // Get models with schemas
    const models = client.getModels();
    const schemaCollections = Object.keys(models).map(modelName => {
      const model = models[modelName];
      return {
        name: model.collection.name,
        hasSchema: true,
        modelName: model.modelName,
        schema: model.schema.obj,
        dbName: model.collection.dbName,
        collectionName: model.collection.name,
      };
    });
    
    // Combine the information
    const collectionInfo = collectionNames.map(name => {
      const schemaInfo = schemaCollections.find(s => s.name === name);
      return {
        name,
        hasSchema: !!schemaInfo,
        modelName: schemaInfo?.modelName || null
      };
    });
    
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            status: "success",
            count: collectionInfo.length,
            collections: collectionInfo
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

export const ListCollectionsTool: ToolDefinition<typeof toolSchema> = {
  name: toolName,
  description: toolDescription,
  schema: toolSchema,
  handler: toolHandler
};
