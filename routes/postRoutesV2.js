/**
 * Post Routes V2
 * Defines API v2 endpoints for post functionality
 */

const express = require('express');
const router = express.Router();
const postControllerV2 = require('../controllers/postControllerV2');
const authMiddleware = require('../middleware/authMiddleware');

// Create a new post (V2) with media upload
// Endpoint: POST /api/v2/posts/create
router.post('/create',
  authMiddleware.isAuthenticated, // Ensure user is logged in
  postControllerV2.uploadMediaV2,   // Handle media uploads using multer config from postControllerV2
  postControllerV2.createPostV2     // Controller function to create the post
);

// Get posts for a specific user (V2)
// Endpoint: GET /api/v2/posts/user/:userId
router.get('/user/:userId',
  // No authentication required - all users can view any user's posts
  postControllerV2.getUserPostsV2   // Controller function to fetch user posts
);

// Get all posts for the feed (V2)
// Endpoint: GET /api/v2/posts/feed
router.get('/feed',
  // No authentication required - all users can view all posts
  postControllerV2.getAllPostsV2    // Controller function to fetch all posts
);

// Search posts (V2)
// Endpoint: GET /api/v2/posts/search
router.get('/search',
  // No authentication required - all users can search posts
  postControllerV2.searchPostsV2    // Controller function to search posts
);

// Future V2 routes (like, comment, delete) can be added here.

module.exports = router;