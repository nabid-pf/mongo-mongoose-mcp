import mongoose from "mongoose";
import { glob } from "glob";

// Map to store loaded Mongoose models
export const models: Map<string, mongoose.Model<any>> = new Map();

export async function connectToMongoose(databaseUrl: string, schemaPath?: string) {
  try {
    await mongoose.connect(databaseUrl);
    console.error("Connected to MongoDB using Mongoose");

    // Load schemas if path is provided
    if (schemaPath) {
      await loadSchemas(schemaPath);
    }

    return mongoose;
  } catch (error) {
    console.error("Mongoose connection error:", error);
    throw error;
  }
}

export async function loadSchemas(schemaPath: string) {
  try {
    console.error(`Looking for schemas in: ${schemaPath}`);
    const schemaFiles = await glob(`${schemaPath}/**/*.{js,ts}`);
    
    if (schemaFiles.length === 0) {
      console.error(`No schema files found in ${schemaPath}. Running in schemaless mode.`);
      return;
    }

    console.error(`Found ${schemaFiles.length} schema files.`);
    
    for (const file of schemaFiles) {
      try {
        // Dynamic import for ES modules
        const module = await import(`file://${file}`);
        const model = module.default || module;
        
        if (model && model.modelName && typeof model.find === 'function') {
          models.set(model.modelName.toLowerCase(), model);
          console.error(`Loaded schema for: ${model.modelName}`);
        } else {
          console.error(`File ${file} does not export a valid Mongoose model`);
        }
      } catch (err) {
        console.error(`Error loading schema file ${file}:`, err);
      }
    }
    
    console.error(`Loaded ${models.size} schemas successfully`);
  } catch (err) {
    console.error("Error loading schemas:", err);
    console.error("Running in schemaless mode.");
  }
}

export function getModelForCollection(collectionName: string): mongoose.Model<any> | undefined {
  return Array.from(models.values()).find(
    model => model.collection.name.toLowerCase() === collectionName.toLowerCase()
  );
}

export function hasSchemaForCollection(collectionName: string): boolean {
  return !!getModelForCollection(collectionName);
}

export async function closeMongoose() {
  await mongoose.disconnect();
}
