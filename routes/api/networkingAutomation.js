const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../../middleware/authMiddleware');
const User = require('../../models/User');
const networkingAutomationService = require('../../services/networkingAutomationService');

/**
 * @route   GET /api/networking/suggestions
 * @desc    Get connection suggestions for the current user
 * @access  Private
 */
router.get('/suggestions', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const limit = req.query.limit ? parseInt(req.query.limit) : 5;
    const suggestions = await networkingAutomationService.findConnectionSuggestions(user, limit);
    
    res.json({
      success: true,
      suggestions
    });
  } catch (error) {
    console.error('Error getting connection suggestions:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   POST /api/networking/send-connection/:userId
 * @desc    Send connection request with AI-generated intro message
 * @access  Private
 */
router.post('/send-connection/:userId', authenticateUser, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Target user not found' });
    }
    
    // Check if custom message is provided or generate one
    let introMessage = req.body.message;
    if (!introMessage) {
      introMessage = await networkingAutomationService.generateIntroMessage(currentUser, targetUser);
    }
    
    // Send connection request with intro message
    const result = await networkingAutomationService.sendConnectionWithIntro(currentUser, targetUser);
    
    // Emit socket event for real-time notification
    if (result.success && req.app.get('io')) {
      req.app.get('io').to(targetUser._id.toString()).emit('notification:new', {
        type: 'connection_request',
        from: {
          _id: currentUser._id,
          name: currentUser.name,
          avatar: currentUser.avatar
        },
        message: `${currentUser.name} sent you a connection request`,
        introMessage: result.introMessage
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error sending connection with intro:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   POST /api/networking/weekly-suggestions
 * @desc    Send weekly connection suggestions to user
 * @access  Private
 */
router.post('/weekly-suggestions', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const result = await networkingAutomationService.sendWeeklySuggestions(user);
    
    // Emit socket event for real-time notification
    if (result.success && req.app.get('io')) {
      req.app.get('io').to(user._id.toString()).emit('notification:new', {
        type: 'connection_suggestions',
        message: `Here are your top ${result.suggestions.length} connection suggestions for this week!`,
        suggestions: result.suggestions
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error sending weekly suggestions:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   POST /api/networking/auto-suggest-all
 * @desc    Send weekly suggestions to all active users (admin only)
 * @access  Private/Admin
 */
router.post('/auto-suggest-all', authenticateUser, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    // Find active users who haven't received suggestions in the last 7 days
    const activeUsers = await User.find({
      'analytics.lastActive': { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Active in last 30 days
    });
    
    const results = [];
    
    // Send suggestions to each user
    for (const user of activeUsers) {
      const result = await networkingAutomationService.sendWeeklySuggestions(user);
      results.push({
        userId: user._id,
        name: user.name,
        success: result.success,
        suggestionCount: result.suggestions?.length || 0
      });
    }
    
    res.json({
      success: true,
      message: `Sent suggestions to ${results.filter(r => r.success).length} out of ${results.length} users`,
      results
    });
  } catch (error) {
    console.error('Error sending suggestions to all users:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;