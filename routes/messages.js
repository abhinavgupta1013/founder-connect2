const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { authenticateUser, protectRoute, redirectIfAuthenticated } = require('../middleware/authMiddleware');

// Get all conversations for the current user
router.get('/api/conversations', authenticateUser, async (req, res) => {
    try {
        const conversations = await Conversation.find({
            participants: req.user._id
        })
        .populate('participants', 'name avatar')
        .populate('messages')
        .sort({ updatedAt: -1 });

        res.json({ conversations });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Error fetching conversations' });
    }
});

// Create a new conversation
router.post('/api/conversations', authenticateUser, async (req, res) => {
    try {
        const { participantId } = req.body;

        // Check if conversation already exists
        const existingConversation = await Conversation.findOne({
            participants: { $all: [req.user._id, participantId] }
        });

        if (existingConversation) {
            return res.json({ 
                success: true, 
                conversation: existingConversation 
            });
        }

        // Create new conversation
        const conversation = new Conversation({
            participants: [req.user._id, participantId],
            messages: []
        });

        await conversation.save();

        // Populate the conversation with user details
        await conversation.populate('participants', 'name avatar');

        res.json({ 
            success: true, 
            conversation 
        });
    } catch (error) {
        console.error('Error creating conversation:', error);
        res.status(500).json({ error: 'Error creating conversation' });
    }
});

// Get all users for new message
router.get('/api/users', authenticateUser, async (req, res) => {
    try {
        const users = await User.find({
            _id: { $ne: req.user._id }
        }).select('name avatar');

        res.json({ users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Error fetching users' });
    }
});

// Search users for messaging
router.get('/api/search-users-for-message', authenticateUser, async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query || query.trim() === '') {
            return res.json({ users: [] });
        }
        
        const users = await User.find({
            _id: { $ne: req.user._id },
            name: { $regex: query, $options: 'i' }
        }).select('name avatar').limit(10);
        
        res.json({ users });
    } catch (error) {
        console.error('Error searching users:', error);
                res.status(500).json({ error: 'Error searching users' });
    }
});

// Get a single conversation by ID
router.get('/api/conversations/:id', authenticateUser, async (req, res) => {
    try {
        const conversation = await Conversation.findById(req.params.id)
            .populate('participants', 'name avatar')
            .populate({
                path: 'messages',
                populate: {
                    path: 'sender',
                    select: 'name avatar'
                }
            });

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        res.json({ success: true, conversation });
    } catch (error) {
        console.error('Error fetching conversation:', error);
        res.status(500).json({ error: 'Error fetching conversation' });
    }
});

// Socket.IO message handler
module.exports = function(io) {
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);
        
        // Join a room for the user
        if (socket.request.user && socket.request.user._id) {
            const userId = socket.request.user._id;
            socket.join(`user_${userId}`);
            console.log(`User ${userId} joined their room`);
        }

        socket.on('send_message', async (data) => {
            try {
                console.log('socket.request.user:', socket.request.user);
                const { conversationId, content } = data;
                const userId = socket.request.user._id;
                
                console.log(`Received message from user ${userId} for conversation ${conversationId}:`, content);

                // Create new message
                const message = new Message({
                    conversation: conversationId,
                    sender: userId,
                    content
                });

                await message.save();
                console.log('Message saved to database with ID:', message._id);

                // Get conversation to find participants
                const conversation = await Conversation.findByIdAndUpdate(
                    conversationId,
                    { 
                        $push: { messages: message._id },
                        $set: { updatedAt: new Date() }
                    },
                    { new: true }
                ).populate('participants', '_id');

                // Populate message with sender details
                
                // Create a response object with all necessary data
                const messageResponse = {
                    _id: message._id,
                    conversation: conversationId,
                    sender: message.sender,
                    content: message.content,
                    createdAt: message.createdAt,
                    conversationId: conversationId
                };

                console.log('Broadcasting message to participants:', conversation.participants.map(p => p._id));
                
                // Emit message to all participants in the conversation
                if (conversation && conversation.participants) {
                    conversation.participants.forEach(participant => {
                        const roomName = `user_${participant._id}`;
                        console.log(`Emitting message to room: ${roomName}`);
                        io.to(roomName).emit('new_message', messageResponse);
                    });
                }
            } catch (error) {
                console.error('Error sending message:' , error);
                socket.emit('message_error', { error: 'Failed to send message' });
            }
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });

    return router;
};