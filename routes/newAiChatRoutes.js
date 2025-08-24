const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/authMiddleware');
const { processAICommand } = require('../services/aiChatService');
const AIChat = require('../models/AIChat');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const OpenAI = require('openai');

dotenv.config();

// Initialize OpenAI client with OpenRouter
const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
        "HTTP-Referer": "https://founderconnect.ai/ai/chat/new", // Optional. Site URL for rankings on openrouter.ai.
        "X-Title": "FounderConnect AI Chat" // Optional. Site title for rankings on openrouter.ai.
    }
});

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../public/uploads/chat-images');
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'chat-image-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        // Accept images only
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

/**
 * @route POST /ai/chat/message
 * @desc Process a regular chat message
 * @access Private
 */
router.post('/message', authenticateUser, async (req, res) => {
    try {
        const { message, images } = req.body;
        const userId = req.user.id;
        
        if (!message && (!images || images.length === 0)) {
            return res.status(400).json({ success: false, message: 'Message or image is required' });
        }
        
        // Process message with OpenAI
        let prompt = message || 'Describe this image';
        let response;
        
        if (images && images.length > 0) {
            // Process with images
            const imageContents = [];
            
            for (const imagePath of images) {
                // Convert relative path to absolute
                const absolutePath = path.join(__dirname, '..', imagePath);
                
                if (fs.existsSync(absolutePath)) {
                    const imageContent = fs.readFileSync(absolutePath);
                    imageContents.push({
                        type: 'image_url',
                        image_url: {
                            url: `data:image/jpeg;base64,${imageContent.toString('base64')}`
                        }
                    });
                }
            }
            
            // Call OpenAI API with images
            const completion = await openai.chat.completions.create({
                model: "openai/gpt-4-vision",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            ...imageContents
                        ]
                    }
                ],
                max_tokens: 500
            });
            
            response = completion.choices[0].message.content;
        } else {
            // Process text-only message
            const completion = await openai.chat.completions.create({
                model: "z-ai/glm-4.5-air:free",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 500
            });
            
            response = completion.choices[0].message.content;
        }
        
        // Save chat to database
        const newChat = new AIChat({
            user: userId,
            query: message,
            response: response,
            action: 'message',
            actionData: { images: images || [] }
        });
        
        await newChat.save();
        
        res.json({ success: true, response });
    } catch (error) {
        console.error('Error processing chat message:', error);
        res.status(500).json({ success: false, message: 'Error processing your message' });
    }
});

/**
 * @route POST /ai/chat/process
 * @desc Process an AI command
 * @access Private
 */
router.post('/process', authenticateUser, async (req, res) => {
    try {
        const { command } = req.body;
        const userId = req.user.id;
        const currentUser = req.user; // Ensure we pass the full user object to the service
        
        if (!command) {
            return res.status(400).json({ success: false, message: 'Command is required' });
        }
        
        // Process the command using existing service
        const result = await processAICommand(command, currentUser);
        
        // Save command to database
        const newChat = new AIChat({
            user: userId,
            query: command,
            response: result.message || result.response || 'Command processed',
            action: result.action || 'none',
            actionData: result.data || {}
        });
        
        await newChat.save();
        
        res.json(result);
    } catch (error) {
        console.error('Error processing AI command:', error);
        res.status(500).json({ success: false, message: 'Error processing your command' });
    }
});

/**
 * @route POST /ai/chat/upload-image
 * @desc Upload images for chat
 * @access Private
 */
router.post('/upload-image', authenticateUser, upload.array('images', 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No images uploaded' });
        }
        
        const files = req.files.map(file => {
            // Convert absolute path to relative path for client
            const relativePath = '/uploads/chat-images/' + path.basename(file.path);
            
            return {
                originalname: file.originalname,
                path: relativePath,
                size: file.size
            };
        });
        
        res.json({ success: true, files });
    } catch (error) {
        console.error('Error uploading images:', error);
        res.status(500).json({ success: false, message: 'Error uploading images' });
    }
});

/**
 * @route GET /ai/chat/history
 * @desc Get user's chat history
 * @access Private
 */
router.get('/history', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get chat history grouped by conversation
        const chats = await AIChat.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(100);
        
        res.json({ success: true, chats });
    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({ success: false, message: 'Error fetching chat history' });
    }
});

/**
 * @route DELETE /ai/chat/:chatId
 * @desc Delete a specific chat
 * @access Private
 */
router.delete('/:chatId', authenticateUser, async (req, res) => {
    try {
        const chatId = req.params.chatId;
        const userId = req.user.id;
        
        // Find and delete the chat
        const chat = await AIChat.findOne({ _id: chatId, user: userId });
        
        if (!chat) {
            return res.status(404).json({ success: false, message: 'Chat not found' });
        }
        
        await AIChat.deleteOne({ _id: chatId });
        
        res.json({ success: true, message: 'Chat deleted successfully' });
    } catch (error) {
        console.error('Error deleting chat:', error);
        res.status(500).json({ success: false, message: 'Error deleting chat' });
    }
});

/**
 * @route GET /ai/chat/new
 * @desc Render the new AI chat page
 * @access Private
 */
router.get('/new', authenticateUser, (req, res) => {
    res.render('new-ai-chat', {
        title: 'AI Chat',
        user: req.user,
        currentUser: req.user // Add currentUser for consistency with other routes
    });
});

/**
 * @route GET /ai/chat
 * @desc Redirect to the new AI chat page
 * @access Private
 */
router.get('/', authenticateUser, (req, res) => {
    res.redirect('/ai/chat/new');
});

module.exports = router;