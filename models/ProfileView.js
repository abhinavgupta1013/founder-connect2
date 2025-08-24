const mongoose = require('mongoose');

const profileViewSchema = new mongoose.Schema({
  profile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  viewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Create indexes for efficient querying
profileViewSchema.index({ profile: 1, timestamp: -1 });
profileViewSchema.index({ profile: 1, viewer: 1 });

module.exports = mongoose.model('ProfileView', profileViewSchema);