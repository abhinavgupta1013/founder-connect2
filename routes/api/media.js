const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../../models/User');
const { isAuthenticated } = require('../../middleware/authMiddleware');

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Create directory if it doesn't exist
        const dir = path.join(__dirname, '../../public/uploads/media');
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'chat-' + uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: function (req, file, cb) {
        // Accept images and videos
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|mp4|webm|mov)$/)) {
            return cb(new Error('Only image and video files are allowed!'), false);
        }
        cb(null, true);
    }
});

// Upload media
router.post('/upload-media', isAuthenticated, upload.array('media', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded' });
        }
        
        const userId = req.user._id;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        // Get additional data from request body
        const { title, description, company, funding, members } = req.body;
        
        // Initialize media array if it doesn't exist
        if (!user.media) {
            user.media = [];
        }
        
        // Process uploaded files
        const mediaItems = req.files.map(file => {
            const isVideo = file.mimetype.startsWith('video/');
            return {
                url: `/uploads/media/${file.filename}`,
                type: isVideo ? 'video' : 'image',
                title: title || '',
                description: description || '',
                company: company || '',
                funding: funding || '',
                members: members || '',
                createdAt: new Date()
            };
        });
        
        // Add new media to user's media array
        user.media.push(...mediaItems);
        await user.save();
        
        res.json({ success: true, media: mediaItems });
    } catch (error) {
        console.error('Error uploading media:', error);
        res.status(500).json({ success: false, message: 'Failed to upload media' });
    }
});

// Get user media
router.get('/user-media', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        res.json({ success: true, media: user.media || [] });
    } catch (error) {
        console.error('Error fetching user media:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch user media' });
    }
});

// Delete media
router.delete('/delete-media/:mediaId', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id;
        const mediaId = req.params.mediaId;
        
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        // Find the media item
        const mediaIndex = user.media.findIndex(item => item._id.toString() === mediaId);
        
        if (mediaIndex === -1) {
            return res.status(404).json({ success: false, message: 'Media not found' });
        }
        
        // Get the media file path
        const mediaUrl = user.media[mediaIndex].url;
        const mediaPath = path.join(__dirname, '../../public', mediaUrl);
        
        // Remove the file if it exists
        if (fs.existsSync(mediaPath)) {
            fs.unlinkSync(mediaPath);
        }
        
        // Remove the media item from the user's media array
        user.media.splice(mediaIndex, 1);
        await user.save();
        
        res.json({ success: true, message: 'Media deleted successfully' });
    } catch (error) {
        console.error('Error deleting media:', error);
        res.status(500).json({ success: false, message: 'Failed to delete media' });
    }
});

// Create media without file upload
router.post('/create-media', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        // Get data from request body
        const { title, description, company, funding, members } = req.body;
        
        console.log('Server received data:', req.body);
        
        if (!title || !description) {
            return res.status(400).json({ success: false, message: 'Title and description are required' });
        }
        
        // Initialize media array if it doesn't exist
        if (!user.media) {
            user.media = [];
        }
        
        // Create new media item with explicit string conversion
        const mediaItem = {
            url: '/images/founder-connect-icon.svg', // Default placeholder image
            type: 'image',
            title: String(title),
            description: String(description),
            company: company ? String(company) : '',
            funding: funding ? String(funding) : '',
            members: members ? String(members) : '',
            createdAt: new Date()
        };
        
        // Add new media to user's media array
        user.media.push(mediaItem);
        await user.save();
        
        res.json({ success: true, media: mediaItem });
    } catch (error) {
        console.error('Error creating media:', error);
        res.status(500).json({ success: false, message: 'Failed to create media: ' + error.message });
    }
});

module.exports = router;