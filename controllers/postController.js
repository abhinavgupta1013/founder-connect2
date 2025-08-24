/**
 * Post Controller
 * Handles post creation, retrieval, and management
 */

const Post = require('../models/Post');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../public/uploads');
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
    cb(null, uniqueSuffix + ext);
  }
});

// Filter function to validate file types
const fileFilter = (req, file, cb) => {
  // Accept images and videos
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only images and videos are allowed'), false);
  }
};

// Initialize multer upload
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

/**
 * Middleware to handle media uploads
 */
exports.uploadMedia = upload.array('media', 10); // Allow up to 10 files

/**
 * Create a new post
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createPost = async (req, res) => {
  try {
    // Get user ID from authenticated session
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'You must be logged in to create a post' });
    }

    // Get post data from request
    const { caption, scheduledDate } = req.body;
    
    // Validate that either caption or media is provided
    if (!caption && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ error: 'Post must contain caption or media' });
    }

    // Process uploaded files
    const mediaFiles = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        // Create absolute URL for storage in database
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const absoluteUrl = `${baseUrl}/uploads/${file.filename}`;
        const fileType = file.mimetype.startsWith('image/') ? 'image' : 'video';
        
        mediaFiles.push({
          url: absoluteUrl,
          type: fileType,
          filename: file.filename
        });
      });
    }

    // Create new post
    const newPost = new Post({
      user: userId,
      caption,
      media: mediaFiles,
      createdAt: new Date(),
      isScheduled: !!scheduledDate,
      scheduledDate: scheduledDate || undefined,
      publishStatus: scheduledDate ? 'scheduled' : 'published'
    });

    await newPost.save();

    // Return success response
    res.status(201).json({ 
      success: true, 
      message: 'Post created successfully',
      post: newPost
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'An error occurred while creating the post' });
  }
};

/**
 * Schedule a post or multiple posts
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.schedulePost = async (req, res) => {
  try {
    const { postContent, topic, schedulingOptions } = req.body;
    const userId = req.session.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'You must be logged in to schedule a post' });
    }
    
    // Get user data for saving post
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Import the content generation service
    const contentGenerationService = require('../services/contentGenerationService');
    
    // Handle scheduling based on options
    if (schedulingOptions && schedulingOptions.generateMultiple) {
      // Generate multiple posts on the same topic
      try {
        const result = await contentGenerationService.handlePostScheduling(
          postContent, 
          topic, 
          user, 
          schedulingOptions
        );
        
        return res.json(result);
      } catch (error) {
        console.error('Error generating multiple posts:', error);
        return res.status(500).json({
          action: 'error',
          message: `Error generating multiple posts: ${error.message}`
        });
      }
    } else {
      // Schedule a single post
      let scheduledDate = null;
      
      if (schedulingOptions && schedulingOptions.useOptimalTime) {
        // Use the optimal time
        const optimalTime = contentGenerationService.getOptimalPostingTime(user);
        scheduledDate = new Date();
        scheduledDate.setHours(optimalTime.hour, optimalTime.minute, 0, 0);
        
        // If the time is in the past, schedule for tomorrow
        if (scheduledDate < new Date()) {
          scheduledDate.setDate(scheduledDate.getDate() + 1);
        }
      } else if (schedulingOptions && schedulingOptions.customDate) {
        // Use custom date
        scheduledDate = new Date(schedulingOptions.customDate);
      }
      
      try {
        // Save post with scheduled date
        const newPost = await contentGenerationService.savePostToFeed(postContent, user, scheduledDate);
        
        return res.json({
          action: 'post_scheduled',
          message: `✅ Post scheduled for publishing on ${scheduledDate ? scheduledDate.toLocaleString() : 'now'}.`,
          post: postContent,
          postId: newPost._id,
          scheduledDate: scheduledDate
        });
      } catch (error) {
        console.error('Error scheduling post:', error);
        return res.status(500).json({
          action: 'error',
          message: `Error scheduling post: ${error.message}`
        });
      }
    }
  } catch (error) {
    console.error('Error scheduling post:', error);
    res.status(500).json({
      action: 'error',
      message: `Error scheduling post: ${error.message}`
    });
  }
};

/**
 * Get posts for a user (PUBLIC ACCESS - for profile image visibility)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find posts by user ID, sorted by creation date (newest first)
    // Now allows public access to any user's posts for profile visibility
    const posts = await Post.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate('user', 'name avatar slug title location');
    
    res.status(200).json({ 
      success: true,
      posts,
      message: 'Posts retrieved successfully'
    });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ 
      success: false,
      error: 'An error occurred while fetching posts' 
    });
  }
};

/**
 * Get public media posts for a user (for profile gallery)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUserMedia = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find posts with media only, sorted by creation date (newest first)
    const posts = await Post.find({ 
      user: userId,
      'media.0': { $exists: true } // Only posts with at least one media item
    })
      .sort({ createdAt: -1 })
      .populate('user', 'name avatar slug title location')
      .select('media caption createdAt likes comments user');
    
    res.status(200).json({ 
      success: true,
      posts,
      message: 'Media posts retrieved successfully'
    });
  } catch (error) {
    console.error('Get user media error:', error);
    res.status(500).json({ 
      success: false,
      error: 'An error occurred while fetching media posts' 
    });
  }
};

/**
 * Get a single post by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getPostById = async (req, res) => {
  try {
    const { postId } = req.params;
    
    const post = await Post.findById(postId)
      .populate('user', 'name avatar slug');
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.status(200).json({ post });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: 'An error occurred while fetching the post' });
  }
};

/**
 * Delete a post
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.session.userId;
    
    // Find the post
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Check if user is the owner of the post
    if (post.user.toString() !== userId) {
      return res.status(403).json({ error: 'You are not authorized to delete this post' });
    }
    
    // Delete media files
    if (post.media && post.media.length > 0) {
      post.media.forEach(media => {
        const filePath = path.join(__dirname, '../public', media.url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }
    
    // Delete the post
    await Post.findByIdAndDelete(postId);
    
    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'An error occurred while deleting the post' });
  }
};

// Middleware to handle file uploads
exports.uploadMedia = upload.array('media', 5); // Allow up to 5 files

/**
 * Get all posts for the feed
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllPosts = async (req, res) => {
  try {
    // Find all posts, sorted by creation date (newest first)
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .populate('user', 'name avatar slug title role')
      .limit(20); // Limit to 20 posts for performance

    // Normalize media URLs to absolute
    const host = `${req.protocol}://${req.get('host')}`;
    posts.forEach(p => {
      if (p.media && p.media.length) {
        p.media.forEach(m => {
          if (m.url && !m.url.startsWith('http')) {
            m.url = `${host}${m.url.startsWith('/') ? '' : '/'}${m.url}`;
          }
        });
      }
    });
    
    res.status(200).json({ 
      success: true,
      posts,
      message: 'Posts retrieved successfully'
    });
  } catch (error) {
    console.error('Get all posts error:', error);
    res.status(500).json({ 
      success: false,
      error: 'An error occurred while fetching posts' 
    });
  }
};