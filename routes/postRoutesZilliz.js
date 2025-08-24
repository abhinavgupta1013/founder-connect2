/**
 * Post Routes using Zilliz
 * Defines API endpoints for post functionality using Zilliz vector database
 */

const express = require('express');
const router = express.Router();
const postControllerZilliz = require('../controllers/postControllerZilliz');
const authMiddleware = require('../middleware/authMiddleware');

// Create a new post with media upload using Zilliz
// Endpoint: POST /api/zilliz/posts/create
router.post('/create',
  authMiddleware.isAuthenticated, // Ensure user is logged in
  postControllerZilliz.uploadMediaZilliz,   // Handle media uploads using multer config
  postControllerZilliz.createPostZilliz     // Controller function to create the post
);

// Get posts for a specific user using Zilliz
// Endpoint: GET /api/zilliz/posts/user/:userId
router.get('/user/:userId',
  // No authentication required - all users can view any user's posts
  postControllerZilliz.getUserPostsZilliz   // Controller function to fetch user posts
);

// Get all posts for the feed using Zilliz
// Endpoint: GET /api/zilliz/posts/feed
router.get('/feed',
  postControllerZilliz.getAllPostsZilliz    // Controller function to fetch all posts
);

// Future endpoints for liking, commenting, and deleting posts can be added here

module.exports = router;