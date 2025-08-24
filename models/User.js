const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: false
  },
  dob: {
    type: Date,
    required: false
  },
  username: {
    type: String,
    required: false
  },
  password: {
    type: String,
    required: false
  },
  slug: {
    type: String,
    required: false,
    unique: true
  },
  role: {
    type: String,
    required: false
  },
  location: {
    type: String,
    required: false
  },
  phone: {
    type: String,
    required: false
  },
  website: {
    type: String,
    required: false
  },
  tags: {
    type: [String],
    default: []
  },
  skills: {
    type: [String],
    default: []
  },
  bio: {
    type: String,
    required: false
  },
  title: {
    type: String,
    required: false
  },
  avatar: {
    type: String,
    required: false
  },
  experience: {
    type: [{
      title: String,
      company: String,
      startDate: String,
      endDate: String,
      description: String
    }],
    default: []
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  resetToken: {
    type: String
  },
  resetTokenExpiry: {
    type: Date
  },
  investmentCount: {
    type: Number,
    default: 0
  },
  investmentRange: {
    type: String,
    required: false
  },
  portfolioCompanies: {
    type: [String],
    default: []
  },
  media: {
    type: [{
      url: String,
      type: String,
      title: String,
      description: String,
      company: String,
      funding: String,
      members: String,
      createdAt: Date
    }],
    default: []
  },
  connections: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: []
  },
  connectionRequests: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: []
  },
  pendingConnections: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: []
  },
  // messages field removed
  analytics: {
    profileViews: {
      type: Number,
      default: 0
    },
    viewHistory: {
      type: [{
        viewedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        timestamp: {
          type: Date,
          default: Date.now
        }
      }],
      default: []
    },
    engagement: {
      type: [{
        action: {
          type: String,
          enum: ['view', 'connect', 'other'] // 'message' action type removed
        },
        by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        timestamp: {
          type: Date,
          default: Date.now
        }
      }],
      default: []
    },
    lastActive: {
      type: Date,
      default: Date.now
    }
  },
  privacySettings: {
    profileVisibility: {
      type: String,
      enum: ['public', 'connections', 'private'],
      default: 'public'
    },
    showEmail: {
      type: Boolean,
      default: false
    },
    showPhone: {
      type: Boolean,
      default: false
    }
  
  },
  connectionCount: {
    type: Number,
    default: 0
  },
  avatar: {
    type: String,
    required: false
  },
  otp: {
    code: String,
    expiresAt: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Generate slug from email if not provided and ensure avatar is set
UserSchema.pre('save', function(next) {
  // Generate slug if not provided
  if (!this.slug && this.email) {
    this.slug = this.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-');
  }
  
  // Ensure avatar is set to default if null, undefined, or empty string
  if (!this.avatar) {
    this.avatar = '/images/default-avatar.svg';
  }
  
  next();
});


module.exports = mongoose.model('User', UserSchema);