const express = require('express');
const router = express.Router();
const User = require('../models/User');
// Message model import removed
const { isAuthenticated } = require('../middleware/authMiddleware');

// ===== CONNECTION ROUTES =====

// Get user connections
router.get('/connections', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId)
      .populate({
        path: 'connections.user',
        select: 'name avatar title bio slug'
      });

    // Filter connections by status
    const accepted = user.connections.filter(conn => conn.status === 'accepted');
    const pending = user.connections.filter(conn => conn.status === 'pending');
    const sent = await User.find({
      'connections.user': userId,
      'connections.status': 'pending'
    }).select('name avatar title bio slug');

    res.json({
      success: true,
      connections: {
        accepted,
        pending,
        sent
      }
    });
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch connections' });
  }
});

// Send connection request
router.post('/connect/:userId', isAuthenticated, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.userId;

    // Prevent connecting to self
    if (currentUserId.toString() === targetUserId) {
      return res.status(400).json({ success: false, message: 'Cannot connect to yourself' });
    }

    // Check if connection already exists
    const user = await User.findById(currentUserId);
    const existingConnection = user.connections.find(
      conn => conn.user.toString() === targetUserId
    );

    if (existingConnection) {
      return res.status(400).json({ 
        success: false, 
        message: `Connection request already ${existingConnection.status}` 
      });
    }

    // Add connection request
    user.connections.push({
      user: targetUserId,
      status: 'pending',
      createdAt: new Date()
    });

    // Add to analytics
    user.analytics.engagement.push({
      action: 'connect',
      by: currentUserId,
      timestamp: new Date()
    });

    await user.save();

    res.json({ success: true, message: 'Connection request sent' });
  } catch (error) {
    console.error('Error sending connection request:', error);
    res.status(500).json({ success: false, message: 'Failed to send connection request' });
  }
});

// Accept/Reject connection request
router.put('/connect/:userId', isAuthenticated, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const requesterId = req.params.userId;
    const { action } = req.body; // 'accept' or 'reject'

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    // Find the connection request
    const user = await User.findById(currentUserId);
    const connectionIndex = user.connections.findIndex(
      conn => conn.user.toString() === requesterId && conn.status === 'pending'
    );

    if (connectionIndex === -1) {
      return res.status(404).json({ success: false, message: 'Connection request not found' });
    }

    // Update connection status
    user.connections[connectionIndex].status = action === 'accept' ? 'accepted' : 'rejected';

    // If accepted, add the connection to the requester's connections as well
    if (action === 'accept') {
      const requester = await User.findById(requesterId);
      requester.connections.push({
        user: currentUserId,
        status: 'accepted',
        createdAt: new Date()
      });
      await requester.save();

      // Add to analytics
      user.analytics.engagement.push({
        action: 'connect',
        by: requesterId,
        timestamp: new Date()
      });
    }

    await user.save();

    res.json({ 
      success: true, 
      message: `Connection request ${action === 'accept' ? 'accepted' : 'rejected'}` 
    });
  } catch (error) {
    console.error('Error handling connection request:', error);
    res.status(500).json({ success: false, message: 'Failed to handle connection request' });
  }
});

// Remove connection
router.delete('/connect/:userId', isAuthenticated, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.userId;

    // Remove connection from current user
    await User.findByIdAndUpdate(currentUserId, {
      $pull: { connections: { user: targetUserId } }
    });

    // Remove connection from target user
    await User.findByIdAndUpdate(targetUserId, {
      $pull: { connections: { user: currentUserId } }
    });

    res.json({ success: true, message: 'Connection removed' });
  } catch (error) {
    console.error('Error removing connection:', error);
    res.status(500).json({ success: false, message: 'Failed to remove connection' });
  }
});

// ===== MESSAGING ROUTES REMOVED =====
// Messaging functionality has been removed

// ===== ANALYTICS ROUTES =====

// Track profile view
router.post('/analytics/view/:userId', isAuthenticated, async (req, res) => {
  try {
    const viewerId = req.user._id;
    const profileId = req.params.userId;

    // Don't track self-views
    if (viewerId.toString() === profileId) {
      return res.json({ success: true });
    }

    const user = await User.findById(profileId);
    
    // Increment profile views
    user.analytics.profileViews += 1;
    
    // Add to view history
    user.analytics.viewHistory.push({
      viewedBy: viewerId,
      timestamp: new Date()
    });
    
    // Add to engagement
    user.analytics.engagement.push({
      action: 'view',
      by: viewerId,
      timestamp: new Date()
    });
    
    await user.save();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking profile view:', error);
    res.status(500).json({ success: false, message: 'Failed to track profile view' });
  }
});

// Get profile analytics
router.get('/analytics/profile', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    // Get view counts by day for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentViews = user.analytics.viewHistory.filter(
      view => view.timestamp >= thirtyDaysAgo
    );
    
    // Group views by day
    const viewsByDay = {};
    recentViews.forEach(view => {
      const date = view.timestamp.toISOString().split('T')[0];
      viewsByDay[date] = (viewsByDay[date] || 0) + 1;
    });
    
    // Get unique viewers
    const uniqueViewers = new Set(recentViews.map(view => view.viewedBy.toString())).size;
    
    // Get engagement breakdown
    const engagement = {
      views: user.analytics.engagement.filter(e => e.action === 'view').length,
      connects: user.analytics.engagement.filter(e => e.action === 'connect').length,
      // Messages analytics removed
      other: user.analytics.engagement.filter(e => e.action === 'other').length
    };
    
    res.json({
      success: true,
      analytics: {
        totalViews: user.analytics.profileViews,
        recentViews: recentViews.length,
        uniqueViewers,
        viewsByDay,
        engagement
      }
    });
  } catch (error) {
    console.error('Error fetching profile analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile analytics' });
  }
});

// ===== PUBLIC PROFILE ROUTES =====

// Get public profile
router.get('/profile/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const user = await User.findOne({ slug })
      .select('-password -resetToken -resetTokenExpiry');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check privacy settings
    if (user.privacySettings.profileVisibility === 'private') {
      // If logged in user is viewing
      if (req.user && req.user._id) {
        // Check if they are connected
        const isConnected = user.connections.some(
          conn => conn.user.toString() === req.user._id.toString() && conn.status === 'accepted'
        );
        
        if (!isConnected && user._id.toString() !== req.user._id.toString()) {
          return res.status(403).json({ 
            success: false, 
            message: 'This profile is private' 
          });
        }
      } else {
        return res.status(403).json({ 
          success: false, 
          message: 'This profile is private' 
        });
      }
    } else if (user.privacySettings.profileVisibility === 'connections') {
      // If logged in user is viewing
      if (req.user && req.user._id) {
        // Check if they are connected
        const isConnected = user.connections.some(
          conn => conn.user.toString() === req.user._id.toString() && conn.status === 'accepted'
        );
        
        if (!isConnected && user._id.toString() !== req.user._id.toString()) {
          return res.json({
            success: true,
            user: {
              _id: user._id,
              name: user.name,
              title: user.title,
              avatar: user.avatar,
              slug: user.slug,
              isLimited: true
            }
          });
        }
      } else {
        return res.json({
          success: true,
          user: {
            _id: user._id,
            name: user.name,
            title: user.title,
            avatar: user.avatar,
            slug: user.slug,
            isLimited: true
          }
        });
      }
    }
    
    // Filter out private information based on settings
    if (!user.privacySettings.showEmail) {
      user.email = undefined;
    }
    
    if (!user.privacySettings.showPhone) {
      user.phone = undefined;
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error fetching public profile:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
});

// Update privacy settings
router.put('/privacy', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const { profileVisibility, showEmail, showPhone } = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        'privacySettings.profileVisibility': profileVisibility,
        'privacySettings.showEmail': showEmail,
        'privacySettings.showPhone': showPhone
      },
      { new: true }
    );
    
    res.json({
      success: true,
      privacySettings: updatedUser.privacySettings
    });
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    res.status(500).json({ success: false, message: 'Failed to update privacy settings' });
  }
});

module.exports = router;