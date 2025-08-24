/**
 * FoundrConnect Connections API Routes
 * Handles connection requests, acceptances, and management
 */

const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../../middleware/authMiddleware');
const User = require('../../models/User');
const Connection = require('../../models/Connection');
const Notification = require('../../models/Notification');

/**
 * @route   GET /api/connections/:userId
 * @desc    Get user connections
 * @access  Private
 */
router.get('/:userId', authenticateUser, async (req, res) => {
    try {
        const userId = req.params.userId;
        
        // Find user and populate connections
        const user = await User.findById(userId).populate('connections', 'name avatar title');
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        return res.json({ success: true, connections: user.connections || [] });
    } catch (err) {
        console.error('Error fetching connections:', err.message);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * @route   GET /api/connections/status/:targetUserId
 * @desc    Get connection status with a specific user
 * @access  Private
 */
router.get('/status/:targetUserId', authenticateUser, async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const targetUserId = req.params.targetUserId;

        if (currentUserId === targetUserId) {
            return res.json({ success: true, status: 'is_self' });
        }

        const currentUser = await User.findById(currentUserId);

        if (!currentUser) {
            return res.status(404).json({ success: false, message: 'Current user not found' });
        }
        
        currentUser.connections = currentUser.connections || [];
        currentUser.pendingConnections = currentUser.pendingConnections || [];
        currentUser.connectionRequests = currentUser.connectionRequests || [];

        let status = 'none';
        if (currentUser.connections.map(id => id.toString()).includes(targetUserId)) {
            status = 'connected';
        } else if (currentUser.pendingConnections.map(id => id.toString()).includes(targetUserId)) {
            status = 'pending_sent';
        } else if (currentUser.connectionRequests.map(id => id.toString()).includes(targetUserId)) {
            status = 'pending_received';
        }
        
        return res.json({ success: true, status: status });

    } catch (err) {
        console.error('Error fetching specific connection status:', err.message);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * @route   POST /api/connections/request
 * @desc    Send a connection request to a target user
 * @access  Private
 */
router.post('/request', authenticateUser, async (req, res) => {
    try {
        const { targetUserId } = req.body; // User to send request to
        const userId = req.user.id; // Current user sending the request
        
        if (!targetUserId) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        
        // Prevent self-connections
        if (targetUserId === userId) {
            return res.status(400).json({ success: false, message: 'Cannot connect with yourself' });
        }
        
        // Find both users
        const currentUser = await User.findById(userId);
        const targetUser = await User.findById(targetUserId);
        
        if (!currentUser || !targetUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        // Initialize arrays if they don't exist
        if (!currentUser.connections) currentUser.connections = [];
        if (!currentUser.pendingConnections) currentUser.pendingConnections = [];
        if (!currentUser.connectionRequests) currentUser.connectionRequests = [];
        if (!targetUser.connections) targetUser.connections = [];
        if (!targetUser.pendingConnections) targetUser.pendingConnections = [];
        if (!targetUser.connectionRequests) targetUser.connectionRequests = [];
        
        // Add to pending connections for current user (sender)
        if (!currentUser.pendingConnections.includes(targetUserId)) {
            currentUser.pendingConnections.push(targetUserId);
        }
        
        // Add to connection requests for target user
        if (!targetUser.connectionRequests.includes(userId)) {
            targetUser.connectionRequests.push(userId);
        }
        
        const message = `Connection request sent to ${targetUser.name}`;
        
        // Create notification for target user
        const newNotification = await Notification.create({
            recipient: targetUserId,
            sender: userId, // This is the fromUserId for the frontend notification
            type: 'connection_request',
            message: `${currentUser.name} sent you a connection request`,
            read: false
        });

        // Emit notification to the target user via Socket.IO
        const io = req.app.get('socketio');
        if (io) {
            // Populate sender details for the notification payload
            const senderDetails = {
                _id: currentUser._id,
                name: currentUser.name,
                avatar: currentUser.avatar // Assuming avatar field exists
            };
            const notificationPayload = {
                ...newNotification.toObject(),
                sender: senderDetails, // Override sender ID with sender object
                actionDetails: { // For client-side button handling
                    type: 'connection_request',
                    fromUserId: userId
                }
            };
            io.to(targetUserId).emit('new_notification', notificationPayload);
            console.log(`Emitted 'new_notification' to room ${targetUserId}`);
        } else {
            console.error('Socket.IO instance not found in app settings.');
        }
        
        // Save both users
        await currentUser.save();
        await targetUser.save();
        
        return res.json({ success: true, message });
    } catch (err) {
        console.error('Error sending connection request:', err.message);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * @route   POST /api/connections/respond
 * @desc    Accept or reject a connection request
 * @access  Private
 */
router.post('/respond', authenticateUser, async (req, res) => {
    try {
        const { requestFromUserId, action } = req.body; // requestFromUserId is the user who sent the request
        const userId = req.user.id; // Current user responding to the request

        if (!requestFromUserId || !action || !['accept', 'reject'].includes(action)) {
            return res.status(400).json({ success: false, message: 'Missing or invalid required fields' });
        }

        if (requestFromUserId === userId) {
            return res.status(400).json({ success: false, message: 'Cannot respond to your own request actions' });
        }

        const currentUser = await User.findById(userId); // The one responding
        const senderUser = await User.findById(requestFromUserId); // The one who sent the request

        if (!currentUser || !senderUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Initialize arrays
        currentUser.connections = currentUser.connections || [];
        currentUser.pendingConnections = currentUser.pendingConnections || [];
        currentUser.connectionRequests = currentUser.connectionRequests || [];
        senderUser.connections = senderUser.connections || [];
        senderUser.pendingConnections = senderUser.pendingConnections || [];
        senderUser.connectionRequests = senderUser.connectionRequests || [];

        let message = '';

        if (action === 'accept') {
            // Remove from connection requests for current user (responder)
            currentUser.connectionRequests = currentUser.connectionRequests.filter(id => id.toString() !== requestFromUserId);
            // Remove from pending connections for senderUser
            senderUser.pendingConnections = senderUser.pendingConnections.filter(id => id.toString() !== userId);

            // Add to connections for both users
            const wasNewConnectionForCurrent = !currentUser.connections.includes(requestFromUserId);
            const wasNewConnectionForSender = !senderUser.connections.includes(userId);
            
            if (wasNewConnectionForCurrent) {
                currentUser.connections.push(requestFromUserId);
                // Increment connection count only if this is a new connection
                currentUser.connectionCount = (currentUser.connectionCount || 0) + 1;
            }
            
            if (wasNewConnectionForSender) {
                senderUser.connections.push(userId);
                // Increment connection count only if this is a new connection
                senderUser.connectionCount = (senderUser.connectionCount || 0) + 1;
            }
            
            message = `You are now connected with ${senderUser.name}`;

            // Create notification for senderUser (who initially sent the request)
            const acceptedNotification = await Notification.create({
                recipient: requestFromUserId, // The user who sent the original request
                sender: userId, // The user who accepted the request
                type: 'connection_accepted',
                message: `${currentUser.name} accepted your connection request.`,
                read: false
            });

            // Emit notification to the sender user via Socket.IO
            const io = req.app.get('socketio');
            if (io) {
                const responderDetails = {
                    _id: currentUser._id,
                    name: currentUser.name,
                    avatar: currentUser.avatar
                };
                const notificationPayload = {
                    ...acceptedNotification.toObject(),
                    sender: responderDetails, // Pass responder details
                    // No actionDetails needed for simple acceptance notification
                };
                io.to(requestFromUserId).emit('new_notification', notificationPayload);
                console.log(`Emitted 'new_notification' (connection_accepted) to room ${requestFromUserId}`);
                
                // Emit connection update to both users for real-time UI updates
                io.to(requestFromUserId).emit('connection_update', {
                    type: 'accepted',
                    fromUserId: userId,
                    connectionCount: senderUser.connectionCount
                });
                
                io.to(userId).emit('connection_update', {
                    type: 'accepted',
                    fromUserId: requestFromUserId,
                    connectionCount: currentUser.connectionCount
                });
            } else {
                console.error('Socket.IO instance not found for accepted notification.');
            }

        } else if (action === 'reject') {
            // Remove from connection requests for current user (responder)
            currentUser.connectionRequests = currentUser.connectionRequests.filter(id => id.toString() !== requestFromUserId);
            // Remove from pending connections for senderUser
            senderUser.pendingConnections = senderUser.pendingConnections.filter(id => id.toString() !== userId);
            message = `Connection request from ${senderUser.name} rejected`;

            // Optionally, notify the sender that their request was rejected
            const rejectedNotification = await Notification.create({
                recipient: requestFromUserId, // The user who sent the original request
                sender: userId, // The user who rejected the request
                type: 'connection_rejected', // A new type, or use a generic info type
                message: `${currentUser.name} declined your connection request.`,
                read: false
            });

            const io = req.app.get('socketio');
            if (io) {
                const responderDetails = {
                    _id: currentUser._id,
                    name: currentUser.name,
                    avatar: currentUser.avatar
                };
                const notificationPayload = {
                    ...rejectedNotification.toObject(),
                    sender: responderDetails
                };
                io.to(requestFromUserId).emit('new_notification', notificationPayload);
                console.log(`Emitted 'new_notification' (connection_rejected) to room ${requestFromUserId}`);
            } else {
                console.error('Socket.IO instance not found for rejected notification.');
            }
        }

        await currentUser.save();
        await senderUser.save();
        return res.json({ success: true, message });

    } catch (err) {
        console.error('Error responding to connection request:', err.message);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * @route   POST /api/connections/cancel
 * @desc    Cancel an outgoing connection request
 * @access  Private
 */
router.post('/cancel', authenticateUser, async (req, res) => {
    try {
        const { targetUserId } = req.body; // User to whom the request was sent
        const userId = req.user.id; // Current user cancelling the request

        if (!targetUserId) {
            return res.status(400).json({ success: false, message: 'Missing targetUserId' });
        }
        if (targetUserId === userId) {
            return res.status(400).json({ success: false, message: 'Invalid action with yourself' });
        }

        const currentUser = await User.findById(userId);
        const recipientUser = await User.findById(targetUserId);

        if (!currentUser || !recipientUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        currentUser.pendingConnections = currentUser.pendingConnections || [];
        recipientUser.connectionRequests = recipientUser.connectionRequests || [];

        // Remove from pending connections for current user
        currentUser.pendingConnections = currentUser.pendingConnections.filter(id => id.toString() !== targetUserId);
        // Remove from connection requests for target user
        recipientUser.connectionRequests = recipientUser.connectionRequests.filter(id => id.toString() !== userId);
        
        await currentUser.save();
        await recipientUser.save();
        return res.json({ success: true, message: `Connection request to ${recipientUser.name} cancelled` });

    } catch (err) {
        console.error('Error cancelling connection request:', err.message);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * @route   POST /api/connections/disconnect
 * @desc    Disconnect from an existing connection
 * @access  Private
 */
router.post('/disconnect', authenticateUser, async (req, res) => {
    try {
        const { targetUserId } = req.body; // User to disconnect from
        const userId = req.user.id; // Current user initiating disconnect

        if (!targetUserId) {
            return res.status(400).json({ success: false, message: 'Missing targetUserId' });
        }
        if (targetUserId === userId) {
            return res.status(400).json({ success: false, message: 'Cannot disconnect from yourself' });
        }

        const currentUser = await User.findById(userId);
        const otherUser = await User.findById(targetUserId);

        if (!currentUser || !otherUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        currentUser.connections = currentUser.connections || [];
        otherUser.connections = otherUser.connections || [];

        // Remove from connections for both users
        currentUser.connections = currentUser.connections.filter(id => id.toString() !== targetUserId);
        otherUser.connections = otherUser.connections.filter(id => id.toString() !== userId);
        
        // Decrement connection count for both users
        currentUser.connectionCount = Math.max(0, (currentUser.connectionCount || 0) - 1);
        otherUser.connectionCount = Math.max(0, (otherUser.connectionCount || 0) - 1);
        
        await currentUser.save();
        await otherUser.save();
        
        // Emit connection update via Socket.IO for real-time UI updates
        const io = req.app.get('socketio');
        if (io) {
            // Notify both users about the disconnection
            io.to(userId).emit('connection_update', {
                type: 'removed',
                fromUserId: targetUserId,
                connectionCount: currentUser.connectionCount
            });
            
            io.to(targetUserId).emit('connection_update', {
                type: 'removed',
                fromUserId: userId,
                connectionCount: otherUser.connectionCount
            });
            
            // Create notification for the other user
            const disconnectNotification = await Notification.create({
                recipient: targetUserId,
                sender: userId,
                type: 'connection_removed',
                message: `${currentUser.name} has removed the connection with you.`,
                read: false
            });
            
            // Send notification to the other user
            const senderDetails = {
                _id: currentUser._id,
                name: currentUser.name,
                avatar: currentUser.avatar
            };
            
            io.to(targetUserId).emit('new_notification', {
                ...disconnectNotification.toObject(),
                sender: senderDetails
            });
        }
        
        return res.json({ success: true, message: `Disconnected from ${otherUser.name}` });

    } catch (err) {
        console.error('Error disconnecting:', err.message);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});


/**
 * @route   GET /api/connections/requests
 * @desc    Get connection requests for the current user
 * @access  Private
 */
router.get('/requests', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Find user and populate connection requests
        const user = await User.findById(userId).populate('connectionRequests', 'name avatar title');
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        return res.json({ success: true, requests: user.connectionRequests || [] });
    } catch (err) {
        console.error('Error fetching connection requests:', err.message);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * @route   GET /api/connections/pending
 * @desc    Get pending connection requests sent by the current user
 * @access  Private
 */
router.get('/pending', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Find user and populate pending connections
        const user = await User.findById(userId).populate('pendingConnections', 'name avatar title');
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        return res.json({ success: true, pending: user.pendingConnections || [] });
    } catch (err) {
        console.error('Error fetching pending connections:', err.message);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * @route   GET /api/connections/status/:targetUserId
 * @desc    Get the connection status between the current user and a target user
 * @access  Private
 */
router.get('/status/:targetUserId', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { targetUserId } = req.params;

        if (!targetUserId) {
            return res.status(400).json({ success: false, message: 'Missing targetUserId.' });
        }

        if (userId === targetUserId) {
            return res.json({ success: true, status: 'self' }); // Or some other status indicating it's the user's own profile
        }

        const currentUser = await User.findById(userId);
        const targetUser = await User.findById(targetUserId); // Ensure target user exists

        if (!currentUser || !targetUser) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        let status = 'none';
        if (currentUser.connections && currentUser.connections.map(id => id.toString()).includes(targetUserId)) {
            status = 'connected';
        } else if (currentUser.pendingConnections && currentUser.pendingConnections.map(id => id.toString()).includes(targetUserId)) {
            status = 'pending_sent'; // Current user sent a request to targetUser
        } else if (currentUser.connectionRequests && currentUser.connectionRequests.map(id => id.toString()).includes(targetUserId)) {
            status = 'pending_received'; // Current user received a request from targetUser
        }

        return res.json({ success: true, status });

    } catch (err) {
        console.error('Error fetching connection status:', err.message);
        return res.status(500).json({ success: false, message: 'Server error while fetching connection status.' });
    }
});

module.exports = router;