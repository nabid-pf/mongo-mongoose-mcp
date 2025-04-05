# MongoDB Mongoose MCP

An MCP (Model Context Protocol) server that enables Claude to interact with MongoDB databases, with optional Mongoose schema support.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- Query, insert, update, and manage MongoDB collections directly from Claude
- Optional Mongoose schema support for data validation and hooks
- Soft delete implementation for document safety
- Clean separation between schema-based and schemaless operations

## Prerequisites
- Node.js (v18 or higher)
- MongoDB

## Integrating with Claude Desktop

To add the MCP server to Claude Desktop:

1. Go to Settings > Developer > Edit config
2. Add the following to your claude_desktop_config.json file:

```json
{
  "mcpServers": {
    "mongodb-mongoose": {
      "command": "npx",
      "args": [
        "-y", 
        "mongo-mongoose-mcp",
      ],
      "env": {
        "MONGODB_URI": <your mongodb uri>,
        "SCHEMA_PATH" : <path to the root folder of all your mongoose schemas>
      }
    }
  }
}
```

## Available MCP Commands

When integrated with Claude, the following commands become available:

### Query Tools
- `find`: Query documents with filtering and projection
- `listCollections`: List available collections
- `insertOne`: Insert a single document
- `updateOne`: Update a single document
- `deleteOne`: Soft delete a single document
- `count`: Count documents with filtering
- `aggregate`: Query documents with aggregation pipeline

### Index Tools
- `createIndex`: Create a new index
- `dropIndex`: Remove an index
- `indexes`: List indexes for a collection

## Example Usage

Once integrated with Claude Desktop, you can use natural language to interact with your MongoDB database:

- "Show me all users in my database who are older than 30"
- "Insert a new product with name 'Widget X', price $29.99, and category 'Electronics'"
- "Count all completed orders from the past week"
- "Create an index on the email field of the users collection"

## For Developers

### Building from Source

```bash
# Clone the repository
git clone https://github.com/nabid-pf/mongo-mongoose-mcp.git
cd mongo-mongoose-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Test with the MCP inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

### Creating Mongoose Schemas

Place your Mongoose schema files in the a directory and specify that path in SCHEMA_PATH var
Make sure mongoose npm package is installed globally or within that path

```javascript
// models/user.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  age: Number,
  createdAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date
});

const User = mongoose.model('User', userSchema);

export default User;
```

## How It Works

This project uses:
- MongoDB native driver for direct database operations
- Mongoose for schema-based operations when schemas are available
- The Model Context Protocol (MCP) to communicate with Claude

## License

MIT
