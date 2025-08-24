const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/authMiddleware');
const { processAICommand } = require('../services/aiChatService');
const AIChat = require('../models/AIChat');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Process AI commands
router.post('/process', authenticateUser, async (req, res) => {
    try {
        const { command } = req.body;
        
        // Validate command
        if (!command || !command.startsWith('@')) {
            return res.status(400).json({ success: false, message: 'Invalid command. Commands must start with @.' });
        }
        
        // Process command
        const result = await processAICommand(command, req.user);
        
        // Handle specific actions for bio and post generation
        if (result.action === 'bio_updated' || result.action === 'bio_and_post_created') {
            // Emit socket event to update bio in real-time for all connected clients
            if (req.app.get('io')) {
                req.app.get('io').emit('profile:bio_updated', {
                    userId: req.user._id,
                    bio: result.bio
                });
            }
        }
        
        if (result.action === 'post_created' || result.action === 'bio_and_post_created') {
            // Emit socket event to update feed in real-time for all connected clients
            if (req.app.get('io')) {
                req.app.get('io').emit('feed:post_created', {
                    userId: req.user._id,
                    postId: result.postId
                });
            }
        }
        
        res.json(result);
    } catch (error) {
        console.error('Error processing AI command:', error);
        res.status(500).json({ success: false, message: 'An error occurred while processing your command.' });
    }
});

// Process regular AI chat messages using Groq API
router.post('/message', authenticateUser, async (req, res) => {
    try {
        const { message, images } = req.body;
        
        // Validate message
        if (!message && (!images || images.length === 0)) {
            return res.status(400).json({ success: false, message: 'Message or images are required.' });
        }
        
        // Process images if any
        let processedMessage = message;
        if (images && images.length > 0) {
            // Add image information to the message
            processedMessage += `\n[User attached ${images.length} image${images.length > 1 ? 's' : ''}]`;
        }
        
        // Get Groq API key from environment variables
        const groqApiKey = process.env.GROQ_API_KEY;
        
        if (!groqApiKey) {
            console.warn('Groq API service configuration is missing');
            const fallbackResponse = "I'm sorry, but the AI service is currently unavailable. Please contact the administrator to set up a valid API key.";
            await new AIChat({
                user: req.user._id,
                query: processedMessage,
                response: fallbackResponse,
                action: 'none',
                actionData: {}
            }).save();
            return res.json({
                success: false,
                message: 'AI service configuration is missing or invalid.',
                response: fallbackResponse
            });
        }
        
        console.log('Using Groq API');
        console.log('API Key (first few chars):', groqApiKey.substring(0, 10) + '...');
        
        try {
            // Log the request payload for debugging
            const requestPayload = {
                messages: [
                    { role: "user", content: processedMessage }
                ],
                model: "llama3-70b-8192",
                temperature: 0.7,
                max_tokens: 1024,
                top_p: 0.9
            };
            
            console.log('Sending request to Groq API:', {
                model: requestPayload.model,
                messageLength: processedMessage.length,
                endpoint: 'https://api.groq.com/openai/v1/chat/completions',
                apiKeyLength: groqApiKey.length
            });
            
            // Call Groq API with the correct format for chat completions
            const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', requestPayload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${groqApiKey}`
                },
                timeout: 30000 // 30 second timeout
            });
            
            console.log('Groq API response status:', response.status);
            console.log('Groq API response structure:', Object.keys(response.data));
            
            // Extract AI response from Groq API response
            let aiResponse = "I'm sorry, I couldn't generate a proper response.";
            
            if (response.data && response.data.choices && response.data.choices.length > 0) {
                if (response.data.choices[0].message && response.data.choices[0].message.content) {
                    aiResponse = response.data.choices[0].message.content.trim();
                } else {
                    console.log('Unexpected response structure:', JSON.stringify(response.data, null, 2));
                }
            } else {
                console.log('Unexpected response structure:', JSON.stringify(response.data, null, 2));
            }
            
            console.log('Groq API response received successfully');
            console.log('Response length:', aiResponse.length);
            
            // Save the interaction to the database
            await new AIChat({
                user: req.user._id,
                query: processedMessage,
                response: aiResponse,
                action: 'none',
                actionData: {}
            }).save();
            
            res.json({
                success: true,
                response: aiResponse
            });
        } catch (apiError) {
            console.error('Error calling Groq API:', apiError.message);
            console.error('Full error object:', JSON.stringify(apiError, Object.getOwnPropertyNames(apiError), 2));
            
            // Log detailed error information
            if (apiError.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.error('API Error Response Status:', apiError.response.status);
                console.error('API Error Response Headers:', apiError.response.headers);
                console.error('API Error Response Data:', JSON.stringify(apiError.response.data, null, 2));
            } else if (apiError.request) {
                // The request was made but no response was received
                console.error('API Error Request:', typeof apiError.request);
                console.error('No response received from API');
            } else {
                // Something happened in setting up the request that triggered an Error
                console.error('Error Message:', apiError.message);
                console.error('Error Stack:', apiError.stack);
            }
            
            // Determine a more specific error message based on the error
            let errorMessage = "I'm sorry, but I'm having trouble connecting to my knowledge service right now.";
            let detailedError = 'Unknown error: ' + apiError.message;
            
            if (apiError.code === 'ECONNABORTED') {
                errorMessage = "The request to the AI service timed out. Please try again.";
                detailedError = 'Request timeout';
            } else if ((apiError.response && apiError.response.status === 401) || apiError.message.includes('authentication')) {
                errorMessage = "There's an authentication issue with the AI service. Please contact the administrator.";
                detailedError = 'Authentication error';
            } else if ((apiError.response && apiError.response.status === 429) || apiError.message.includes('rate limit')) {
                errorMessage = "The AI service is currently experiencing high demand. Please try again later.";
                detailedError = 'Rate limit exceeded';
            }
            
            // Save the interaction to the database with fallback response
            await new AIChat({
                user: req.user._id,
                query: processedMessage,
                response: errorMessage,
                action: 'none',
                actionData: { error: detailedError }
            }).save();
            
            res.json({
                success: false,
                message: 'Error connecting to AI service: ' + detailedError,
                response: errorMessage
            });
        }
    } catch (error) {
        console.error('Error processing AI message:', error);
        console.error('Error details:', error.response ? error.response.data : 'No response data');
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred while processing your message. Please try again later.',
            response: "I'm sorry, but I encountered an unexpected error. Please try again later."
        });
    }
});

// Import multer for file uploads
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Create directory if it doesn't exist
        const dir = path.join(__dirname, '../public/uploads/media');
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

// Configure file filter
const fileFilter = (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

// Initialize multer upload
const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Upload images for AI chat
router.post('/upload-image', authenticateUser, upload.array('images', 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No images uploaded' });
        }

        const uploadedFiles = req.files.map(file => ({
            filename: file.filename,
            path: `/uploads/media/${file.filename}`,
            originalname: file.originalname
        }));

        return res.json({ success: true, files: uploadedFiles });
    } catch (error) {
        console.error('Error uploading images:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get AI chat history
router.get('/history', authenticateUser, async (req, res) => {
    try {
        const history = await AIChat.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(20);
        
        res.json({ success: true, history });
    } catch (error) {
        console.error('Error fetching AI chat history:', error);
        res.status(500).json({ success: false, message: 'An error occurred while fetching your chat history.' });
    }
});

// Delete AI chat history
router.delete('/history', authenticateUser, async (req, res) => {
    try {
        await AIChat.deleteMany({ user: req.user._id });
        
        res.json({ success: true, message: 'Chat history deleted successfully.' });
    } catch (error) {
        console.error('Error deleting AI chat history:', error);
        res.status(500).json({ success: false, message: 'An error occurred while deleting your chat history.' });
    }
});

module.exports = router;