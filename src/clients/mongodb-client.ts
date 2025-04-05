import { MongoClient, Db } from "mongodb";
import { config } from "dotenv";
import mongoose from "mongoose";
import { glob } from "glob";
import fs from 'fs';
import path from 'path';
import { tmpdir } from 'os';


config();

class MongoDBClient {
  private static instance: MongoDBClient | null = null;
  private mongoClient: MongoClient | null = null;
  private db: Db | null = null;
  private models: Record<string, mongoose.Model<any>> = {};
  private initialized: boolean = false;
  private tempSchemaDir: string | null = null;

  private constructor() {}

  public static getInstance(): MongoDBClient {
    if (!MongoDBClient.instance) {
      MongoDBClient.instance = new MongoDBClient();
    }
    return MongoDBClient.instance;
  }

  private async copySchemaFiles(sourcePath: string): Promise<string> {
    const tempDir = path.join(tmpdir(), 'mcp-schemas-' + Date.now());
    await fs.promises.mkdir(tempDir, { recursive: true });

    const files = await glob(`${sourcePath}/**/*.{js,ts}`);
    
    for (const file of files) {
      const relativePath = path.relative(sourcePath, file);
      const targetPath = path.join(tempDir, relativePath);
      
      await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.promises.copyFile(file, targetPath);
    }

    return tempDir;
  }

  private async cleanupTempDir(): Promise<void> {
    if (this.tempSchemaDir) {
      try {
        await fs.promises.rm(this.tempSchemaDir, { recursive: true, force: true });
      } catch (error) {
        console.error('Error cleaning up temporary schema directory:', error);
      }
    }
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/mcp-database";
      const schemaPath = process.env.SCHEMA_PATH;

      console.error(`Attempting to connect to MongoDB at: ${uri}`);
      console.error(`Schema path: ${schemaPath}`);

      // Connect with MongoDB driver
      this.mongoClient = new MongoClient(uri);
      await this.mongoClient.connect();
      this.db = this.mongoClient.db();
      console.error(`Connected to MongoDB using native driver`);

      // Connect with Mongoose
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      console.error(`Connected to MongoDB using Mongoose`);

      // Load schemas if path is provided
      if (schemaPath) {
        console.error(`Loading schemas from: ${schemaPath}`);
        // Copy schema files to temp directory if running via npx
        this.tempSchemaDir = await this.copySchemaFiles(schemaPath);
        await this.loadSchemas(this.tempSchemaDir);
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
      console.error(`Starting schema loading from path: ${schemaPath}`);
      const schemaFiles = await glob(`${schemaPath}/**/*.{js,ts}`);
      
      console.error(`Found schema files:`, schemaFiles);
      
      if (schemaFiles.length === 0) {
        console.error(`No schema files found in ${schemaPath}. Running in schemaless mode.`);
        return;
      }

      console.error(`Found ${schemaFiles.length} schema files.`);
      
      for (const file of schemaFiles) {
        try {
          console.error(`Attempting to load schema file: ${file}`);
          const moduleImport = require(file);
          const schema = moduleImport.default;
          
          if (schema && schema.modelName) {
            this.models[schema.modelName.toLowerCase()] = schema;
            console.error(`Successfully loaded schema for: ${schema.modelName}`);
          } else {
            console.error(`Schema file ${file} does not export a valid model`);
          }
        } catch (err) {
          console.error(`Error loading schema file ${file}:`, err);
        }
      }
      
      console.error(`Loaded ${Object.keys(this.models).length} schemas.`);
      console.error(`Available models:`, Object.keys(this.models));
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
    
    await this.cleanupTempDir();
    this.initialized = false;
  }
}

export default MongoDBClient;
