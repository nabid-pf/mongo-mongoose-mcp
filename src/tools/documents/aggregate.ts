import { db } from "../../mongodb/client.js";
import { BaseTool, ToolResponse } from "../base/tool.js";
import { getModelForCollection, hasSchemaForCollection } from "../../mongoose/manager.js";
import { PipelineStage } from "mongoose";

type AggregateParams = {
  collection: string;
  pipeline: Record<string, unknown>[];
};

export class AggregateTool extends BaseTool<AggregateParams> {
  name = "aggregate";
  description = "Execute an aggregation pipeline on a collection";
  inputSchema = {
    type: "object" as const,
    properties: {
      collection: {
        type: "string",
        description: "Collection name"
      },
      pipeline: {
        type: "array",
        description: "MongoDB aggregation pipeline stages (e.g. [{$match: {...}}, {$group: {...}}])",
        items: {
          type: "object",
          additionalProperties: true
        },
        minItems: 1
      }
    },
    required: ["collection", "pipeline"] as string[],
    additionalProperties: false
  };

  async execute(params: AggregateParams): Promise<ToolResponse> {
    try {
      const collection = this.validateCollection(params.collection);
      
      if (!Array.isArray(params.pipeline)) {
        throw new Error("Pipeline must be an array of aggregation stages");
      }
      
      const pipeline = params.pipeline;
      
      // Add $match stage at the beginning to exclude soft-deleted documents
      // Only add if the first stage isn't already a $match
      const firstStage = pipeline[0];
      if (!firstStage || !('$match' in firstStage)) {
        pipeline.unshift({ $match: { isDeleted: { $ne: true } } });
      } else {
        // If there's already a $match stage, add the isDeleted filter to it
        const matchStage = firstStage['$match'] as Record<string, unknown>;
        if (matchStage && typeof matchStage === 'object') {
          firstStage['$match'] = { ...matchStage, isDeleted: { $ne: true } };
        }
      }

      let results: unknown[] = [];

      // Check if we have a schema for this collection
      if (hasSchemaForCollection(collection)) {
        const model = getModelForCollection(collection);
        console.error(`Using Mongoose model for collection: ${collection}`);
        
        if (!model) {
          throw new Error(`Model exists for collection ${collection} but could not be retrieved`);
        }
        
        // Use Mongoose model - cast pipeline to PipelineStage[] to satisfy TypeScript
        results = await model.aggregate(pipeline as unknown as PipelineStage[]);
      } else {
        console.error(`Using native MongoDB for collection: ${collection}`);
        
        // Use native MongoDB driver
        results = await db.collection(collection).aggregate(pipeline).toArray();
      }

      // Ensure results is an array
      if (!results) {
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
      return this.handleError(error);
    }
  }
}
