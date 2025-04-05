import { MongoClient, Db } from "mongodb";
import { config } from "dotenv";
import mongoose from "mongoose";
import { glob } from "glob";


config();

class MongoDBClient {
  private static instance: MongoDBClient | null = null;
  private mongoClient: MongoClient | null = null;
  private db: Db | null = null;
  private models: Record<string, mongoose.Model<any>> = {};
  private initialized: boolean = false;

  private constructor() {}

  public static getInstance(): MongoDBClient {
    if (!MongoDBClient.instance) {
      MongoDBClient.instance = new MongoDBClient();
    }
    return MongoDBClient.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/mcp-database";
      const schemaPath = process.env.SCHEMA_PATH;

      // Connect with MongoDB driver
      this.mongoClient = new MongoClient(uri);
      await this.mongoClient.connect();
      this.db = this.mongoClient.db();
      console.error(`Connected to MongoDB using native driver`);

      // Connect with Mongoose
      await mongoose.connect(uri);
      console.error(`Connected to MongoDB using Mongoose`);

      // Load schemas if path is provided
      if (schemaPath) {
        await this.loadSchemas(schemaPath);
      } else {
        console.error("No schema path provided. Running in schemaless mode.");
      }

      this.initialized = true;
    } catch (error) {
      console.error("MongoDB connection error:", error);
      throw error;
    }
  }

  private async loadSchemas(schemaPath: string): Promise<void> {
    try {
      // Use the absolute path directly
      const schemaFiles = await glob(`${schemaPath}/**/*.{js,ts}`);
      
      if (schemaFiles.length === 0) {
        console.error(`No schema files found in ${schemaPath}. Running in schemaless mode.`);
        return;
      }

      console.error(`Found ${schemaFiles.length} schema files.`);
      
      for (const file of schemaFiles) {
        try {
          // Use require for npm package compatibility
          const moduleImport = require(file);
          const schema = moduleImport.default;
          
          if (schema && schema.modelName) {
            this.models[schema.modelName.toLowerCase()] = schema;
            console.error(`Loaded schema for: ${schema.modelName}`);
          }
        } catch (err) {
          console.error(`Error loading schema file ${file}:`, err);
        }
      }
      
      console.error(`Loaded ${Object.keys(this.models).length} schemas.`);
    } catch (error) {
      console.error("Error loading schemas:", error);
      console.error("Running in schemaless mode.");
    }
  }

  public getDb(): Db {
    if (!this.db) {
      throw new Error("Database not initialized. Call initialize() first.");
    }
    return this.db;
  }

  public hasSchema(collectionName: string): boolean {
    const collection = collectionName.toLowerCase();
    return Object.keys(this.models).some(model => 
      model === collection || 
      this.models[model].collection.name.toLowerCase() === collection
    );
  }

  public getModel(collectionName: string): mongoose.Model<any> | null {
    const collection = collectionName.toLowerCase();
    
    // Try direct match on model name
    if (this.models[collection]) {
      return this.models[collection];
    }
    
    // Try match on collection name
    const model = Object.values(this.models).find(
      model => model.collection.name.toLowerCase() === collection
    );
    
    return model || null;
  }

  public getModels(): Record<string, mongoose.Model<any>> {
    return this.models;
  }

  public async close(): Promise<void> {
    if (this.mongoClient) {
      await this.mongoClient.close();
      this.mongoClient = null;
      this.db = null;
    }
    
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    
    this.initialized = false;
  }
}

export default MongoDBClient;
