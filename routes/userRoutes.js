const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const { isAuthenticated } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../public/uploads/avatars');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        // Accept only images
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

// Update profile
router.post('/update-profile', isAuthenticated, async (req, res) => {
    try {
        const { name, title, location, website, bio, skills } = req.body;
        const userId = req.user._id;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { 
                name, 
                title, 
                location, 
                website, 
                bio,
                skills
            },
            { new: true }
        );

        res.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
});

// Update bio
router.post('/update-bio', isAuthenticated, async (req, res) => {
    try {
        const { bio } = req.body;
        const userId = req.user._id;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { bio },
            { new: true }
        );

        res.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error('Error updating bio:', error);
        res.status(500).json({ success: false, message: 'Failed to update bio' });
    }
});

// Update skills
router.post('/update-skills', isAuthenticated, async (req, res) => {
    try {
        const { skills } = req.body;
        const userId = req.user._id;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { skills },
            { new: true }
        );

        res.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error('Error updating skills:', error);
        res.status(500).json({ success: false, message: 'Failed to update skills' });
    }
});

// Add experience
router.post('/add-experience', isAuthenticated, async (req, res) => {
    try {
        const { title, company, startDate, endDate, description } = req.body;
        const userId = req.user._id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Initialize experience array if it doesn't exist
        if (!user.experience) {
            user.experience = [];
        }

        // Add new experience
        user.experience.push({
            title,
            company,
            startDate,
            endDate,
            description
        });

        await user.save();

        res.json({ success: true, user });
    } catch (error) {
        console.error('Error adding experience:', error);
        res.status(500).json({ success: false, message: 'Failed to add experience' });
    }
});

// Update experience
router.post('/update-experience', isAuthenticated, async (req, res) => {
    try {
        const { index, title, company, startDate, endDate, description } = req.body;
        const userId = req.user._id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!user.experience || !user.experience[index]) {
            return res.status(404).json({ success: false, message: 'Experience not found' });
        }

        // Update experience
        user.experience[index] = {
            title,
            company,
            startDate,
            endDate,
            description
        };

        await user.save();

        res.json({ success: true, user });
    } catch (error) {
        console.error('Error updating experience:', error);
        res.status(500).json({ success: false, message: 'Failed to update experience' });
    }
});

// Delete experience
router.post('/delete-experience', isAuthenticated, async (req, res) => {
    try {
        const { index } = req.body;
        const userId = req.user._id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!user.experience || !user.experience[index]) {
            return res.status(404).json({ success: false, message: 'Experience not found' });
        }

        // Remove experience at the specified index
        user.experience.splice(index, 1);

        await user.save();

        res.json({ success: true, user });
    } catch (error) {
        console.error('Error deleting experience:', error);
        res.status(500).json({ success: false, message: 'Failed to delete experience' });
    }
});

// Upload avatar
router.post('/upload-avatar', isAuthenticated, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const userId = req.user._id;
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { avatar: avatarUrl },
            { new: true }
        );

        res.json({ success: true, avatarUrl, user: updatedUser });
    } catch (error) {
        console.error('Error uploading avatar:', error);
        res.status(500).json({ success: false, message: 'Failed to upload avatar' });
    }
});

// Remove avatar
router.post('/remove-avatar', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $unset: { avatar: "" } },
            { new: true }
        );

        res.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error('Error removing avatar:', error);
        res.status(500).json({ success: false, message: 'Failed to remove avatar' });
    }
});

// Get user by ID
router.get('/:userId', isAuthenticated, async (req, res) => {
    try {
        const { userId } = req.params;
        
        const user = await User.findById(userId).select('name avatar _id');
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        res.json({ success: true, user });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch user' });
    }
});

// Get current user profile for investor outreach
router.get('/profile', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    res.json({
      name: user.name,
      email: user.email
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Failed to fetch user profile' });
  }
});

// Get user media (images from posts)
router.get('/user/:userId/media', isAuthenticated, async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Find user's posts that have media
        const posts = await Post.find({ 
            user: userId,
            'media.0': { $exists: true } // Only posts with at least one media item
        }).select('media createdAt');
        
        // Extract all media items
        let media = [];
        posts.forEach(post => {
            if (post.media && post.media.length > 0) {
                post.media.forEach(item => {
                    media.push({
                        url: item.url,
                        type: item.type,
                        postId: post._id,
                        createdAt: post.createdAt
                    });
                });
            }
        });
        
        // Sort by newest first
        media.sort((a, b) => b.createdAt - a.createdAt);
        
        res.json({ success: true, media });
    } catch (error) {
        console.error('Error fetching user media:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch user media' });
    }
});

const userController = require('../controllers/userController');

// Search users
router.get('/search-users', userController.searchUsers);

module.exports = router;