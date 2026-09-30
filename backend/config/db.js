const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

let memoryServerInstance = null;

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/parkingspot';
  
  // Try connecting to provided MONGODB_URI first
  try {
    console.log(`[DB] Attempting connection to MongoDB at: ${uri} ...`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500,
    });
    console.log(`[DB] Connected successfully to primary MongoDB at: ${uri}`);
    return;
  } catch (err) {
    console.warn(`[DB] Primary MongoDB at ${uri} was not reachable (${err.message}).`);
    console.log('[DB] Launching standalone local MongoDB engine (MongoMemoryServer)...');
  }

  // Fallback to standalone MongoDB engine
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const dbPath = path.join(__dirname, '..', 'data', 'db');
    if (!fs.existsSync(dbPath)) {
      fs.mkdirSync(dbPath, { recursive: true });
    }

    memoryServerInstance = await MongoMemoryServer.create({
      instance: {
        port: 27017,
        dbName: 'parkingspot',
        dbPath: dbPath,
        storageEngine: 'wiredTiger',
      },
    });

    const fallbackUri = memoryServerInstance.getUri();
    console.log(`[DB] Standalone MongoDB started on: ${fallbackUri}`);
    await mongoose.connect(fallbackUri);
    console.log(`[DB] Mongoose connected successfully to standalone MongoDB!`);
  } catch (err2) {
    // If specific port 27017 is busy, try random port without dbPath
    try {
      console.warn(`[DB] Fallback with fixed port failed (${err2.message}), launching dynamic standalone MongoDB...`);
      const { MongoMemoryServer } = require('mongodb-memory-server');
      memoryServerInstance = await MongoMemoryServer.create({
        instance: {
          dbName: 'parkingspot',
        },
      });
      const dynamicUri = memoryServerInstance.getUri();
      console.log(`[DB] Dynamic MongoDB started on: ${dynamicUri}`);
      await mongoose.connect(dynamicUri);
      console.log(`[DB] Mongoose connected to dynamic MongoDB successfully!`);
    } catch (err3) {
      console.error('[DB] Critical error connecting to MongoDB:', err3.message);
      throw err3;
    }
  }
}

async function closeDB() {
  await mongoose.disconnect();
  if (memoryServerInstance) {
    await memoryServerInstance.stop();
  }
}

module.exports = { connectDB, closeDB };
