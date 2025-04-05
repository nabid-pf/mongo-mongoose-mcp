import mongoose from "mongoose";
import { glob } from "glob";
import path from "path";
import { fileURLToPath } from "url";

// Map to store loaded Mongoose models
export const models: Map<string, mongoose.Model<any>> = new Map();

export async function connectToMongoose(databaseUrl: string, schemaPath?: string) {
  try {
    // Connect to MongoDB with Mongoose
    await mongoose.connect(databaseUrl);
    console.error("Connected to MongoDB using Mongoose");

    // Ensure connection is fully established
    await new Promise(resolve => {
      if (mongoose.connection.readyState === 1) {
        resolve(true);
      } else {
        mongoose.connection.once('connected', resolve);
      }
    });

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
    // Make sure we have an absolute path
    const resolvedPath = path.isAbsolute(schemaPath) 
      ? schemaPath 
      : path.resolve(process.cwd(), schemaPath);
    
    console.error(`Looking for schemas in: ${resolvedPath}`);
    
    // Find all .js and .ts files in the directory (and subdirectories)
    const schemaFiles = await glob(`${resolvedPath}/**/*.{js,ts}`);
    
    if (schemaFiles.length === 0) {
      console.error(`No schema files found in ${resolvedPath}. Running in schemaless mode.`);
      return;
    }

    console.error(`Found ${schemaFiles.length} schema files.`);
    
    for (const file of schemaFiles) {
      try {
        console.error(`Attempting to load schema from: ${file}`);
        
        // Format the file path for dynamic import
        // For files on disk, we need to use the file:// protocol
        const fileUrl = `file://${file}`;
        
        // Dynamically import the schema file
        const module = await import(fileUrl).catch(err => {
          console.error(`Error importing module ${file}:`, err);
          return null;
        });
        
        if (!module) continue;
        
        // Get the model (either default export or module itself)
        const model = module.default || module;
        
        // Add some debug info
        console.error(`Module loaded from ${file}:`, {
          hasDefault: !!module.default,
          modelName: model?.modelName,
          isMongooseModel: model?.prototype?.constructor?.name === 'model'
        });
        
        // Check if it's a valid Mongoose model
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
