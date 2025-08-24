/**
 * FoundrConnect Connection Status API Routes
 * Handles checking connection status between users
 */

const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../../middleware/authMiddleware');
const User = require('../../models/User');

/**
 * @route   GET /api/connections/status
 * @desc    Get all connection statuses for the current user
 * @access  Private
 */
router.get('/status', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Find user
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        // Initialize arrays if they don't exist
        if (!user.connections) user.connections = [];
        if (!user.pendingConnections) user.pendingConnections = [];
        if (!user.connectionRequests) user.connectionRequests = [];
        
        // Create a map of user IDs to connection statuses
        const connections = {};
        
        // Add connected users
        user.connections.forEach(id => {
            connections[id] = 'connected';
        });
        
        // Add pending sent requests
        user.pendingConnections.forEach(id => {
            connections[id] = 'pending_sent';
        });
        
        // Add pending received requests
        user.connectionRequests.forEach(id => {
            connections[id] = 'pending_received';
        });
        
        return res.json({ success: true, connections });
    } catch (err) {
        console.error('Error fetching connection statuses:', err.message);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;