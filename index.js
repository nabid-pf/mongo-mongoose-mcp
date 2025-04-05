require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');
const glob = require('glob');

const app = express();
app.use(express.json());

// Config variables
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const SCHEMA_PATH = process.env.SCHEMA_PATH;

// Connections
let mongoClient;
let db;
let models = {};

// Load mongoose schemas if SCHEMA_PATH is provided
async function loadSchemas() {
  if (!SCHEMA_PATH) return;

  try {
    const schemaFiles = await glob.glob(path.join(SCHEMA_PATH, '**/*.js'));
    
    if (schemaFiles.length === 0) {
      console.log('No schema files found in the specified path. Running in schemaless mode.');
      return;
    }

    console.log(`Found ${schemaFiles.length} schema files.`);
    
    for (const file of schemaFiles) {
      try {
        const schema = require(path.resolve(file));
        if (schema && schema.modelName) {
          models[schema.modelName] = schema;
          console.log(`Loaded schema for: ${schema.modelName}`);
        }
      } catch (err) {
        console.error(`Error loading schema file ${file}:`, err);
      }
    }
  } catch (err) {
    console.error('Error loading schemas:', err);
    console.log('Running in schemaless mode.');
  }
}

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    // Connect using Mongoose
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB using Mongoose');

    // Also connect using MongoDB native driver
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    db = mongoClient.db();
    console.log('Connected to MongoDB using native driver');

    // Load schemas if path is provided
    await loadSchemas();
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  }
}

// Helper to determine if we have a schema for a collection
function hasSchema(collectionName) {
  return Object.values(models).some(model => 
    model.collection.name.toLowerCase() === collectionName.toLowerCase()
  );
}

// Get model for a collection if it exists
function getModelForCollection(collectionName) {
  return Object.values(models).find(model => 
    model.collection.name.toLowerCase() === collectionName.toLowerCase()
  );
}

// API endpoints
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Mongo MCP server is running',
    schemaMode: Object.keys(models).length > 0 ? 'With Schemas' : 'Schemaless'
  });
});

// List all collections
app.get('/listCollections', async (req, res) => {
  try {
    const collections = await db.listCollections().toArray();
    res.json({
      status: 'ok',
      collections: collections.map(c => c.name)
    });
  } catch (err) {
    