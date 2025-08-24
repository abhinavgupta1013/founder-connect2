require('dotenv').config();
const { MilvusClient } = require('@zilliz/milvus2-sdk-node');

console.log('Testing Zilliz connection');
console.log(`Zilliz Host: ${process.env.ZILLIZ_HOST}`);
console.log(`Zilliz Port: ${process.env.ZILLIZ_PORT}`);
console.log(`Zilliz User: ${process.env.ZILLIZ_USER}`);
console.log(`Zilliz Password: ${process.env.ZILLIZ_PASSWORD ? '******' : 'Not set'}`);

// Try with token-based authentication (using password as token)
const milvusClient = new MilvusClient({
  address: `${process.env.ZILLIZ_HOST}:${process.env.ZILLIZ_PORT}`,
  token: process.env.ZILLIZ_PASSWORD,
  ssl: true,
  timeout: 60000
});

// Test Zilliz connection
console.log('Attempting to connect to Zilliz with token-based authentication...');

milvusClient.listCollections()
  .then(collections => {
    console.log('Connected to Zilliz successfully');
    console.log('Available collections:', collections);
    process.exit(0);
  })
  .catch(err => {
    console.error('Zilliz connection error:', err);
    console.log('Please check that your Zilliz credentials are correct');
    process.exit(1);
  });