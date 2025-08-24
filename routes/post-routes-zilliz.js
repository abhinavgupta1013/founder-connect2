const express = require('express');
const router = express.Router();
const path = require('path');
const { authenticateUser } = require('../middleware/authMiddleware');
const postControllerZilliz = require('../controllers/postControllerZilliz');

// Create a new post with media upload
router.post('/create', authenticateUser, postControllerZilliz.uploadMediaZilliz, postControllerZilliz.createPostZilliz);

// Get posts for a specific user
router.get('/user/:userId', authenticateUser, postControllerZilliz.getUserPostsZilliz);

// Get all posts for the feed
router.get('/feed', authenticateUser, postControllerZilliz.getAllPostsZilliz);

module.exports = router;