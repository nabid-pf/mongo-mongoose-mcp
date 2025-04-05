import { db } from "../../mongodb/client.js";
import { BaseTool, ToolResponse } from "../base/tool.js";
import { getModelForCollection, hasSchemaForCollection } from "../../mongoose/manager.js";
import { SortOrder } from "mongoose";

type FindParams = {
  collection: string;
  filter?: Record<string, unknown>;
  projection?: Record<string, unknown>;
  limit?: number;
  skip?: number;
  sort?: Record<string, unknown>;
};

export class FindTool extends BaseTool<FindParams> {
  name = "find";
  description = "Query documents with filtering, projection, and pagination";
  inputSchema = {
    type: "object" as const,
    properties: {
      collection: {
        type: "string",
        description: "Collection name",
      },
      filter: {
        type: "object",
        description: "MongoDB filter query",
        additionalProperties: true,
        default: {}
      },
      projection: {
        type: "object",
        description: "Fields to include or exclude",
        additionalProperties: true,
        default: {}
      },
      limit: {
        type: "integer",
        description: "Maximum number of documents to return",
        minimum: 0
      },
      skip: {
        type: "integer",
        description: "Number of documents to skip",
        minimum: 0
      },
      sort: {
        type: "object",
        description: "Sort order (e.g. {name: 1} for ascending, {name: -1} for descending)",
        additionalProperties: true,
        default: {}
      },
    },
    required: ["collection"] as string[],
  };

  async execute(params: FindParams): Promise<ToolResponse> {
    const collection = this.validateCollection(params.collection);
    const filter = params.filter || {};
    const projection = params.projection || {};
    const options: Record<string, unknown> = {};
    const model = getModelForCollection(collection);

    if (params.limit !== undefined) options.limit = params.limit;
    if (params.skip !== undefined) options.skip = params.skip;
    if (params.sort !== undefined) options.sort = params.sort;

    let results: unknown[] = [];
    try {
      // Check if we have a schema for this collection
      if (hasSchemaForCollection(collection)) {
        console.error(`Using Mongoose model for collection: ${collection}`);
        
        // Check if model exists before using it
        if (model) {
          // Add isDeleted filter to exclude soft-deleted documents by default
          const finalFilter = { ...filter, isDeleted: { $ne: true } };
          
          // Use lean() to get plain JavaScript objects instead of Mongoose documents
          const query = model.find(finalFilter, projection, options);
          
          // Apply sorting if provided
          if (params.sort && Object.keys(params.sort).length > 0) {
            // Convert sort object to format expected by Mongoose
            const sortObj: Record<string, SortOrder> = {};
            Object.entries(params.sort).forEach(([key, value]) => {
              // Convert value to SortOrder type (1, -1, 'asc', 'desc', etc.)
              sortObj[key] = value as SortOrder;
            });
            query.sort(sortObj);
          }
          
          results = await query.lean();
        } else {
          throw new Error(`Model exists for collection ${collection} but could not be retrieved`);
        }
      } else {
        console.error(`Using native MongoDB for collection: ${collection}`);
        
        // Add isDeleted filter to exclude soft-deleted documents by default
        const finalFilter = { ...filter, isDeleted: { $ne: true } };
        
        // Use native MongoDB driver
        const cursor = db.collection(collection)
          .find(finalFilter, { projection })
          .limit(params.limit || 0)
          .skip(params.skip || 0);
        
        // Apply sorting only if provided
        if (params.sort && Object.keys(params.sort).length > 0) {
          cursor.sort(params.sort as any); // Type cast as any for MongoDB driver
        }
        
        results = await cursor.toArray();
      }

      // Check if results is undefined
      if (results === undefined) {
        results = [];
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2),
          },
        ],
        isError: false,
      };
    } catch (error) {
      return this.handleError(error, {
        collection: params.collection,
        filter: params.filter || {},
        projection: params.projection || {},
        sort: params.sort || {},
        skip: params.skip || 0,
        limit: params.limit || 0,
        collectionName: model?.collection.name,
        dbName: model?.collection.dbName,
      });
    }
  }
}
