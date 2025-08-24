require('dotenv').config();
const mongoose = require('mongoose');

console.log('Testing MongoDB connection');
console.log('MongoDB URI:', process.env.MONGODB_URI);

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000 // 5 seconds timeout
})
.then(() => {
  console.log('MongoDB connected successfully');
  process.exit(0);
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});