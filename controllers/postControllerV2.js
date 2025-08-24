/**
 * Post Controller V2
 * Handles post creation, retrieval, and management for API v2
 */

const Post = require('../models/Post');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Configure multer for file uploads
const storageV2 = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../public/uploads/media'); // Specific media folder
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Create unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'v2-' + uniqueSuffix + ext); // Prefix to distinguish v2 uploads if needed
  }
});

// Filter function to validate file types (same as v1 for now)
const fileFilterV2 = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only images and videos are allowed for posts.'), false);
  }
};

// Initialize multer upload for V2
const uploadV2 = multer({
  storage: storageV2,
  fileFilter: fileFilterV2,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB limit for v2, for example
  }
});

/**
 * Middleware to handle media uploads for V2 posts
 */
exports.uploadMediaV2 = uploadV2.array('media', 5); // Allow up to 5 files for a post

/**
 * Create a new post (V2)
 * Endpoint: POST /api/v2/posts/create
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createPostV2 = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'You must be logged in to create a post.' });
    }

    const { caption } = req.body;
    if (!caption && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ error: 'Post must contain a caption or media.' });
    }

    const mediaFiles = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const absoluteUrl = `${baseUrl}/uploads/media/${file.filename}`;
        const fileType = file.mimetype.startsWith('image/') ? 'image' : 'video';
        mediaFiles.push({
          url: absoluteUrl,
          type: fileType,
          filename: file.filename
        });
      });
    }

    const newPost = new Post({
      user: userId,
      caption,
      media: mediaFiles,
      // likes and comments will default to empty/0 based on model schema
    });

    await newPost.save();
    const populatedPost = await Post.findById(newPost._id).populate('user', 'name avatar slug');

    res.status(201).json({
      success: true,
      message: 'Post created successfully (v2).',
      post: populatedPost
    });
  } catch (error) {
    console.error('Create post v2 error:', error);
    // Handle multer errors specifically if needed
    if (error instanceof multer.MulterError) {
        return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'An error occurred while creating the post (v2).' });
  }
};

/**
 * Get posts for a user (V2)
 * Endpoint: GET /api/v2/posts/user/:userId
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUserPostsV2 = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required.' });
    }

    const posts = await Post.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate('user', 'name avatar slug') // Populate user details
      .populate('likes', 'name avatar slug') // Populate likes with user details
      .populate({
        path: 'comments.user',
        select: 'name avatar slug'
      }); // Populate comment authors

    res.status(200).json({ 
        success: true,
        posts 
    });
  } catch (error) {
    console.error('Get user posts v2 error:', error);
    res.status(500).json({ error: 'An error occurred while fetching user posts (v2).' });
  }
};

/**
 * Get all posts for the feed (V2)
 * Endpoint: GET /api/v2/posts/feed
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllPostsV2 = async (req, res) => {
  try {
    // Find all posts, sorted by creation date (newest first)
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .populate('user', 'name avatar slug title role') // Populate user details
      .populate('likes', 'name avatar slug') // Populate likes with user details
      .populate({
        path: 'comments.user',
        select: 'name avatar slug'
      }) // Populate comment authors
      .limit(20); // Limit to 20 posts for performance
    
    res.status(200).json({ 
      success: true,
      posts,
      message: 'Posts retrieved successfully (v2)'
    });
  } catch (error) {
    console.error('Get all posts v2 error:', error);
    res.status(500).json({ 
      success: false,
      error: 'An error occurred while fetching posts (v2)' 
    });
  }
};

/**
 * Search posts (V2)
 * Endpoint: GET /api/v2/posts/search
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.searchPostsV2 = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ 
        success: false,
        error: 'Search query must be at least 2 characters long' 
      });
    }
    
    // Search posts by caption or user name
    const posts = await Post.find({
      $or: [
        { caption: { $regex: q, $options: 'i' } }, // Case-insensitive search in caption
      ]
    })
    .sort({ createdAt: -1 })
    .populate('user', 'name avatar slug title role') // Populate user details
    .populate('likes', 'name avatar slug') // Populate likes with user details
    .populate({
      path: 'comments.user',
      select: 'name avatar slug'
    }) // Populate comment authors
    .limit(20); // Limit to 20 posts for performance
    
    res.status(200).json({ 
      success: true,
      posts,
      message: 'Posts search completed successfully (v2)'
    });
  } catch (error) {
    console.error('Search posts v2 error:', error);
    res.status(500).json({ 
      success: false,
      error: 'An error occurred while searching posts (v2)' 
    });
  }
};

// Future V2 functions (like, comment, delete) can be added here following the same pattern.