const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { MilvusClient } = require('@zilliz/milvus2-sdk-node');
const { DataType } = require('@zilliz/milvus2-sdk-node');

// Initialize Zilliz client
const zillizClient = new MilvusClient({
    address: `${process.env.ZILLIZ_HOST}:${process.env.ZILLIZ_PORT}` || 'localhost:19530',
    token: process.env.ZILLIZ_PASSWORD || '',
    ssl: true
});

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../public/uploads/media');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// File filter for multer
const fileFilter = (req, file, cb) => {
    // Accept images and videos only
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image and video files are allowed!'), false);
    }
};

// Configure multer upload
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 10 // Maximum 10 files
    }
});

// Helper function to ensure the user_media collection exists
async function ensureUserMediaCollection() {
    try {
        // Check if collection exists
        const collections = await zillizClient.listCollections();
        const collectionExists = collections.data.some(c => c.name === 'user_media');
        
        if (!collectionExists) {
            // Create collection with schema
            await zillizClient.createCollection({
                collection_name: 'user_media',
                fields: [
                    {
                        name: 'id',
                        data_type: DataType.VarChar,
                        is_primary_key: true,
                        max_length: 36
                    },
                    {
                        name: 'user_id',
                        data_type: DataType.VarChar,
                        max_length: 36
                    },
                    {
                        name: 'title',
                        data_type: DataType.VarChar,
                        max_length: 255
                    },
                    {
                        name: 'description',
                        data_type: DataType.VarChar,
                        max_length: 1000
                    },
                    {
                        name: 'url',
                        data_type: DataType.VarChar,
                        max_length: 500
                    },
                    {
                        name: 'type',
                        data_type: DataType.VarChar,
                        max_length: 50
                    },
                    {
                        name: 'company',
                        data_type: DataType.VarChar,
                        max_length: 255
                    },
                    {
                        name: 'funding',
                        data_type: DataType.VarChar,
                        max_length: 255
                    },
                    {
                        name: 'members',
                        data_type: DataType.VarChar,
                        max_length: 500
                    },
                    {
                        name: 'created_at',
                        data_type: DataType.VarChar,
                        max_length: 50
                    }
                ]
            });
            
            console.log('Created user_media collection in Zilliz');
        }
    } catch (error) {
        console.error('Error ensuring user_media collection exists:', error);
        throw error;
    }
}

// Route to upload media files
router.post('/upload-media', upload.array('media', 10), async (req, res) => {
    try {
        // Ensure user is logged in
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'User not logged in' });
        }
        
        const userId = req.session.user._id;
        
        // Ensure collection exists
        await ensureUserMediaCollection();
        
        // Process uploaded files
        const mediaItems = [];
        
        for (const file of req.files) {
            // Determine file type
            const fileType = file.mimetype.startsWith('image/') ? 'image' : 'video';
            
            // Create relative URL for the file
            const relativeUrl = `/uploads/media/${file.filename}`;
            
            // Create media item
            const mediaItem = {
                id: `${Date.now()}-${Math.round(Math.random() * 1E9)}`,
                user_id: userId,
                title: req.body.title || file.originalname,
                description: req.body.description || '',
                url: relativeUrl,
                type: fileType,
                company: req.body.company || '',
                funding: req.body.funding || '',
                members: req.body.members || '',
                created_at: new Date().toISOString()
            };
            
            // Insert media item into Zilliz
            await zillizClient.insert({
                collection_name: 'user_media',
                data: [mediaItem]
            });
            
            mediaItems.push(mediaItem);
        }
        
        res.json({ success: true, media: mediaItems });
    } catch (error) {
        console.error('Error uploading media:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Route to get user media
router.get('/user-media', async (req, res) => {
    try {
        // Ensure user is logged in
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'User not logged in' });
        }
        
        const userId = req.session.user._id;
        
        // Ensure collection exists
        await ensureUserMediaCollection();
        
        // Query media for this user
        const result = await zillizClient.query({
            collection_name: 'user_media',
            filter: `user_id == "${userId}"`,
            output_fields: ['id', 'title', 'description', 'url', 'type', 'company', 'funding', 'members', 'created_at']
        });
        
        // Format the media items for the client
        const media = result.data.map(item => ({
            _id: item.id,
            title: item.title,
            description: item.description,
            url: item.url,
            type: item.type,
            company: item.company,
            funding: item.funding,
            members: item.members,
            createdAt: item.created_at
        }));
        
        res.json({ success: true, media });
    } catch (error) {
        console.error('Error getting user media:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Route to delete media
router.delete('/delete-media/:mediaId', async (req, res) => {
    try {
        // Ensure user is logged in
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'User not logged in' });
        }
        
        const userId = req.session.user._id;
        const mediaId = req.params.mediaId;
        
        // Ensure collection exists
        await ensureUserMediaCollection();
        
        // Get media item to check ownership and get file path
        const result = await zillizClient.query({
            collection_name: 'user_media',
            filter: `id == "${mediaId}" && user_id == "${userId}"`,
            output_fields: ['url']
        });
        
        if (result.data.length === 0) {
            return res.status(404).json({ success: false, message: 'Media not found or not owned by user' });
        }
        
        // Get file path from URL
        const mediaUrl = result.data[0].url;
        const filePath = path.join(__dirname, '../public', mediaUrl);
        
        // Delete file from filesystem if it exists
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        // Delete media from Zilliz
        await zillizClient.delete({
            collection_name: 'user_media',
            filter: `id == "${mediaId}"`
        });
        
        res.json({ success: true, message: 'Media deleted successfully' });
    } catch (error) {
        console.error('Error deleting media:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Route to create media without file upload
router.post('/create-media', async (req, res) => {
    try {
        // Ensure user is logged in
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'User not logged in' });
        }
        
        const userId = req.session.user._id;
        
        // Validate required fields
        if (!req.body.title || !req.body.description) {
            return res.status(400).json({ success: false, message: 'Title and description are required' });
        }
        
        // Ensure collection exists
        await ensureUserMediaCollection();
        
        // Create media item with explicit string conversion
        const mediaItem = {
            id: `${Date.now()}-${Math.round(Math.random() * 1E9)}`,
            user_id: userId,
            title: String(req.body.title),
            description: String(req.body.description),
            url: '',  // No file URL since this is text-only media
            type: 'text',
            company: String(req.body.company || ''),
            funding: String(req.body.funding || ''),
            members: String(req.body.members || ''),
            created_at: new Date().toISOString()
        };
        
        // Insert media item into Zilliz
        await zillizClient.insert({
            collection_name: 'user_media',
            data: [mediaItem]
        });
        
        res.json({ success: true, media: mediaItem });
    } catch (error) {
        console.error('Error creating media:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;