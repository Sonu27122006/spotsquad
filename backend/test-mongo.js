const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

async function test() {
  console.log('Testing MongoMemoryServer...');
  try {
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    console.log('MongoMemoryServer started at:', uri);
    await mongoose.connect(uri);
    console.log('Mongoose connected successfully!');
    await mongoose.disconnect();
    await mongod.stop();
    console.log('Test completed successfully!');
  } catch (err) {
    console.error('MongoMemoryServer error:', err);
  }
}

test();
