/**
 * Media Routes using Zilliz
 * Handles media creation, retrieval, and management using Zilliz vector database
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ZillizClient } = require('@zilliz/milvus2-sdk-node');
const { isAuthenticated } = require('../../middleware/authMiddleware');

// Initialize Zilliz client
const zillizClient = new ZillizClient({
    address: process.env.ZILLIZ_ENDPOINT || 'localhost:19530',
    username: process.env.ZILLIZ_USERNAME || '',
    password: process.env.ZILLIZ_PASSWORD || '',
    ssl: process.env.ZILLIZ_SSL === 'true'
});

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
        cb(null, 'zilliz-' + uniqueSuffix + ext);
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

// Helper function to ensure Zilliz collection exists
async function ensureMediaCollectionExists() {
    try {
        await zillizClient.connect();
        
        const collectionName = 'user_media';
        
        // Check if collection exists
        const hasCollection = await zillizClient.hasCollection({
            collection_name: collectionName
        });
        
        if (!hasCollection) {
            // Create collection with schema
            await zillizClient.createCollection({
                collection_name: collectionName,
                fields: [
                    {
                        name: 'id',
                        description: 'Media ID',
                        data_type: 'Int64',
                        is_primary_key: true,
                        autoID: true
                    },
                    {
                        name: 'user_id',
                        description: 'User ID',
                        data_type: 'Int64'
                    },
                    {
                        name: 'url',
                        description: 'Media URL',
                        data_type: 'VarChar',
                        max_length: 255
                    },
                    {
                        name: 'type',
                        description: 'Media Type',
                        data_type: 'VarChar',
                        max_length: 50
                    },
                    {
                        name: 'title',
                        description: 'Media Title',
                        data_type: 'VarChar',
                        max_length: 255
                    },
                    {
                        name: 'description',
                        description: 'Media Description',
                        data_type: 'VarChar',
                        max_length: 1000
                    },
                    {
                        name: 'company',
                        description: 'Company Name',
                        data_type: 'VarChar',
                        max_length: 255
                    },
                    {
                        name: 'funding',
                        description: 'Funding Information',
                        data_type: 'VarChar',
                        max_length: 255
                    },
                    {
                        name: 'members',
                        description: 'Team Members',
                        data_type: 'VarChar',
                        max_length: 255
                    },
                    {
                        name: 'created_at',
                        description: 'Creation Timestamp',
                        data_type: 'Int64'
                    }
                ]
            });
        }
        
        return collectionName;
    } catch (error) {
        console.error('Error ensuring media collection exists:', error);
        throw error;
    }
}

// Upload media
router.post('/upload-media', isAuthenticated, upload.array('media', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded' });
        }
        
        const userId = req.user._id;
        
        // Ensure collection exists
        const collectionName = await ensureMediaCollectionExists();
        
        // Get additional data from request body
        const { title, description, company, funding, members } = req.body;
        
        // Process uploaded files
        const mediaItems = [];
        const zillizEntries = [];
        
        for (const file of req.files) {
            const isVideo = file.mimetype.startsWith('video/');
            const mediaItem = {
                url: `/uploads/media/${file.filename}`,
                type: isVideo ? 'video' : 'image',
                title: title || '',
                description: description || '',
                company: company || '',
                funding: funding || '',
                members: members || '',
                createdAt: Date.now()
            };
            
            // Add to Zilliz
            zillizEntries.push({
                user_id: parseInt(userId),
                url: mediaItem.url,
                type: mediaItem.type,
                title: mediaItem.title,
                description: mediaItem.description,
                company: mediaItem.company,
                funding: mediaItem.funding,
                members: mediaItem.members,
                created_at: mediaItem.createdAt
            });
            
            mediaItems.push(mediaItem);
        }
        
        // Insert into Zilliz
        await zillizClient.insert({
            collection_name: collectionName,
            data: zillizEntries
        });
        
        res.json({ success: true, media: mediaItems });
    } catch (error) {
        console.error('Error uploading media:', error);
        res.status(500).json({ success: false, message: 'Failed to upload media: ' + error.message });
    }
});

// Get user media
router.get('/user-media', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Ensure collection exists
        const collectionName = await ensureMediaCollectionExists();
        
        // Search for media related to current user
        const searchParams = {
            collection_name: collectionName,
            expr: `user_id == ${userId}`,
            output_fields: ['url', 'type', 'title', 'description', 'company', 'funding', 'members', 'created_at', 'id']
        };
        
        const searchResult = await zillizClient.search(searchParams);
        
        let mediaItems = [];
        if (searchResult && searchResult.results) {
            // Transform results into the expected format
            mediaItems = searchResult.results.map(result => ({
                _id: result.id, // Use Zilliz ID as MongoDB-like _id
                url: result.url,
                type: result.type,
                title: result.title,
                description: result.description,
                company: result.company,
                funding: result.funding,
                members: result.members,
                createdAt: new Date(parseInt(result.created_at))
            }));
        }
        
        res.json({ success: true, media: mediaItems });
    } catch (error) {
        console.error('Error fetching user media:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch user media: ' + error.message });
    }
});

// Delete media
router.delete('/delete-media/:mediaId', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id;
        const mediaId = parseInt(req.params.mediaId);
        
        if (isNaN(mediaId)) {
            return res.status(400).json({ success: false, message: 'Invalid media ID' });
        }
        
        // Ensure collection exists
        const collectionName = await ensureMediaCollectionExists();
        
        // First, get the media item to find the file path
        const searchParams = {
            collection_name: collectionName,
            expr: `id == ${mediaId} && user_id == ${userId}`,
            output_fields: ['url']
        };
        
        const searchResult = await zillizClient.search(searchParams);
        
        if (!searchResult || !searchResult.results || searchResult.results.length === 0) {
            return res.status(404).json({ success: false, message: 'Media not found' });
        }
        
        // Get the media file path
        const mediaUrl = searchResult.results[0].url;
        const mediaPath = path.join(__dirname, '../../public', mediaUrl);
        
        // Remove the file if it exists
        if (fs.existsSync(mediaPath)) {
            fs.unlinkSync(mediaPath);
        }
        
        // Delete from Zilliz
        await zillizClient.delete({
            collection_name: collectionName,
            expr: `id == ${mediaId} && user_id == ${userId}`
        });
        
        res.json({ success: true, message: 'Media deleted successfully' });
    } catch (error) {
        console.error('Error deleting media:', error);
        res.status(500).json({ success: false, message: 'Failed to delete media: ' + error.message });
    }
});

// Create media without file upload
router.post('/create-media', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Ensure collection exists
        const collectionName = await ensureMediaCollectionExists();
        
        // Get data from request body
        const { title, description, company, funding, members } = req.body;
        
        console.log('Server received data:', req.body);
        
        if (!title || !description) {
            return res.status(400).json({ success: false, message: 'Title and description are required' });
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
            createdAt: Date.now()
        };
        
        // Insert into Zilliz
        const insertResult = await zillizClient.insert({
            collection_name: collectionName,
            data: [{
                user_id: parseInt(userId),
                url: mediaItem.url,
                type: mediaItem.type,
                title: mediaItem.title,
                description: mediaItem.description,
                company: mediaItem.company,
                funding: mediaItem.funding,
                members: mediaItem.members,
                created_at: mediaItem.createdAt
            }]
        });
        
        // Get the inserted ID
        if (insertResult && insertResult.insert_cnt > 0) {
            // For client compatibility, add _id field to match MongoDB format
            mediaItem._id = insertResult.ids[0];
        }
        
        res.json({ success: true, media: mediaItem });
    } catch (error) {
        console.error('Error creating media:', error);
        res.status(500).json({ success: false, message: 'Failed to create media: ' + error.message });
    }
});

module.exports = router;