const express = require('express');
const router = express.Router();
const Post = require('../../models/Post');
const User = require('../../models/User');

/**
 * @route   GET /api/search
 * @desc    Search posts, users, and hashtags
 * @access  Public
 */
router.get('/', async (req, res) => {
    try {
        const query = req.query.q;
        
        if (!query) {
            return res.status(400).json({ message: 'Search query is required' });
        }
        
        // Create regex for case-insensitive search
        const searchRegex = new RegExp(query, 'i');
        
        // Search posts
        const posts = await Post.find({
            $or: [
                { content: searchRegex },
                { hashtags: searchRegex },
                { title: searchRegex }
            ]
        }).populate('user', 'name username avatar');
        
        // Search users
        const users = await User.find({
            $or: [
                { name: searchRegex },
                { username: searchRegex },
                { bio: searchRegex }
            ]
        }).select('name username avatar bio');
        
        // Extract hashtags from posts
        const hashtagSet = new Set();
        posts.forEach(post => {
            if (post.hashtags && Array.isArray(post.hashtags)) {
                post.hashtags.forEach(tag => {
                    if (tag.match(searchRegex)) {
                        hashtagSet.add(tag);
                    }
                });
            }
        });
        
        const hashtags = Array.from(hashtagSet);
        
        // Transform data for frontend
        const transformedPosts = posts.map(post => ({
            id: post._id,
            type: post.mediaType || 'image',
            title: post.title || post.content.substring(0, 100),
            hashtag: post.hashtags && post.hashtags.length > 0 ? post.hashtags[0] : '#ProfessionalGrowth',
            imageUrl: post.mediaUrl || 'https://picsum.photos/500/500?random=' + post._id,
            author: post.user ? post.user.name : 'Unknown User',
            likes: post.likes ? post.likes.length : 0,
            comments: post.comments ? post.comments.length : 0
        }));
        
        const transformedUsers = users.map(user => ({
            id: user._id,
            type: 'user',
            title: user.name,
            hashtag: user.username ? '@' + user.username : '',
            imageUrl: user.avatar || 'https://picsum.photos/500/500?random=' + user._id,
            author: user.bio ? user.bio.substring(0, 50) : '',
            likes: 0,
            comments: 0
        }));
        
        const transformedHashtags = hashtags.map((tag, index) => ({
            id: 'hashtag-' + index,
            type: 'hashtag',
            title: tag,
            hashtag: tag,
            imageUrl: 'https://picsum.photos/500/500?random=' + index,
            author: 'Hashtag',
            likes: 0,
            comments: 0
        }));
        
        // Combine all results
        const results = [
            ...transformedPosts,
            ...transformedUsers,
            ...transformedHashtags
        ];
        
        res.json(results);
    } catch (err) {
        console.error('Search error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;