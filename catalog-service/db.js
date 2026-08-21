const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/shopping_site';
    await mongoose.connect(mongoURI);
    console.log('MongoDB Connected to', mongoURI);
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
};

module.exports = connectDB;
