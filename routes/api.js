const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');

// GET all posts for explore page
router.get('/explore-posts-legacy', async (req, res) => {
  try {
    // Fetch posts from database with user information
    const posts = await Post.find()
      .populate('user', 'name email slug avatar')
      .sort({ createdAt: -1 }) // Sort by newest first
      .limit(30); // Limit to 30 posts
    
    // Format posts for frontend display
    const formattedPosts = posts.map(post => {
      // Get the first media item if it exists
      const imageUrl = post.media && post.media.length > 0 ? post.media[0].url : '';
      
      return {
        _id: post._id,
        user: post.user,
        caption: post.caption,
        imageUrl: imageUrl,
        likes: post.likes ? post.likes.length : 0,
        createdAt: post.createdAt
      };
    });
    
    res.json(formattedPosts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// GET user posts for profile page
router.get('/posts/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Fetch posts for specific user
    const posts = await Post.find({ user: userId })
      .populate('user', 'name email slug avatar')
      .sort({ createdAt: -1 }); // Sort by newest first
    
    // Format posts for frontend display
    const formattedPosts = posts.map(post => {
      return {
        _id: post._id,
        user: post.user,
        caption: post.caption,
        media: post.media,
        likes: post.likes ? post.likes.length : 0,
        comments: post.comments,
        createdAt: post.createdAt
      };
    });
    
    res.json(formattedPosts);
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ error: 'Failed to fetch user posts' });
  }
});

// Search users API endpoint
router.get('/search-users', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json([]);
    }
    
    console.log('Searching users with query:', q);
    
    // Search users by name, username, email, or role
    const users = await User.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { username: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { role: { $regex: q, $options: 'i' } }
      ]
    })
    .select('name username email slug role avatar')
    .limit(10);
    
    console.log('Search results:', users.length, 'users found');
    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

module.exports = router;