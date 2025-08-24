/**
 * Post Routes
 * Handles all post-related routes including creation, viewing, and interaction
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Post = require('../models/Post');
const User = require('../models/User');
const { isAuthenticated } = require('../middleware/authMiddleware');

// Configure multer for media uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const dir = path.join(__dirname, '../public/uploads/posts');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif|mp4|webm|mov/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image and video files are allowed'));
  }
});

// Create Post Page
router.get('/create-post', isAuthenticated, (req, res) => {
  res.render('create-post', {
    user: req.user,
    title: 'Create Post - FoundrConnect'
  });
});

// Create Post API
router.post('/api/posts/create', isAuthenticated, upload.array('media', 5), async (req, res) => {
  try {
    const { caption } = req.body;
    
    // Create media array from uploaded files
    const media = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fileType = file.mimetype.startsWith('image/') ? 'image' : 'video';
        media.push({
          url: `/uploads/posts/${file.filename}`,
          type: fileType,
          filename: file.filename
        });
      }
    }
    
    // Create new post
    const post = new Post({
      user: req.user._id,
      caption,
      media
    });
    
    await post.save();
    
    res.status(201).json({
      success: true,
      post
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating post'
    });
  }
});

// Get User Posts API
router.get('/api/posts/user/:userId', async (req, res) => {
  try {
    const posts = await Post.find({ user: req.params.userId })
      .sort({ createdAt: -1 })
      .populate('user', 'name avatar');
    
    const formattedPosts = posts.map(post => ({
      id: post._id,
      content: post.caption,
      media: post.media.length > 0 ? post.media[0].url : null,
      mediaType: post.media.length > 0 ? post.media[0].type : null,
      likes: post.likes.length,
      comments: post.comments,
      createdAt: post.createdAt,
      author: {
        id: post.user._id,
        name: post.user.name,
        avatar: post.user.avatar
      }
    }));
    
    res.json({
      success: true,
      posts: formattedPosts
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching posts'
    });
  }
});

// Like Post API
router.post('/api/posts/:postId/like', isAuthenticated, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Check if user already liked the post
    const alreadyLiked = post.likes.includes(req.user._id);
    
    if (alreadyLiked) {
      // Unlike the post
      post.likes = post.likes.filter(id => !id.equals(req.user._id));
    } else {
      // Like the post
      post.likes.push(req.user._id);
    }
    
    await post.save();
    
    res.json({
      success: true,
      liked: !alreadyLiked,
      likeCount: post.likes.length
    });
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({
      success: false,
      message: 'Error liking post'
    });
  }
});

// Add Comment API
router.post('/api/posts/:postId/comment', isAuthenticated, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required'
      });
    }
    
    const post = await Post.findById(req.params.postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    const comment = {
      user: req.user._id,
      text,
      createdAt: new Date()
    };
    
    post.comments.push(comment);
    await post.save();
    
    // Populate user info for the new comment
    const populatedPost = await Post.findById(post._id)
      .populate('comments.user', 'name avatar');
    
    const newComment = populatedPost.comments[populatedPost.comments.length - 1];
    
    res.status(201).json({
      success: true,
      comment: {
        id: newComment._id,
        text: newComment.text,
        createdAt: newComment.createdAt,
        user: {
          id: newComment.user._id,
          name: newComment.user.name,
          avatar: newComment.user.avatar
        }
      }
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding comment'
    });
  }
});

module.exports = router;