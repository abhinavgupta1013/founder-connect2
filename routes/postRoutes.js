/**
 * Post Routes
 * Defines API endpoints for post functionality
 */

const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const authMiddleware = require('../middleware/authMiddleware');

// Create a new post with media upload
router.post('/', 
  authMiddleware.isAuthenticated, 
  postController.uploadMedia,
  postController.createPost
);

// Schedule a post or multiple posts
router.post('/schedule', 
  authMiddleware.isAuthenticated, 
  postController.schedulePost
);

// Get all posts for the feed
router.get('/feed', postController.getAllPosts);

// Get posts for a specific user
router.get('/user/:userId', postController.getUserPosts);

// Get a specific post by ID
router.get('/:postId', postController.getPostById);

// Delete a post
router.delete('/:postId', 
  authMiddleware.isAuthenticated, 
  postController.deletePost
);

module.exports = router;