/**
 * Post Model
 * Defines the schema for user posts with media and captions
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Media schema for post attachments
const MediaSchema = new Schema({
  url: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['image', 'video'],
    required: true
  },
  filename: {
    type: String,
    required: true
  }
});

// Post schema
const PostSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  caption: {
    type: String,
    trim: true
  },
  media: [MediaSchema],
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  isScheduled: {
    type: Boolean,
    default: false
  },
  scheduledDate: {
    type: Date,
    default: null
  },
  publishStatus: {
    type: String,
    enum: ['published', 'scheduled', 'draft'],
    default: 'published'
  }
});

// Virtual for post URL
PostSchema.virtual('url').get(function() {
  return `/posts/${this._id}`;
});

module.exports = mongoose.model('Post', PostSchema);