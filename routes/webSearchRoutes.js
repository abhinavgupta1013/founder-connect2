const express = require('express');
const router = express.Router();
const { protectRoute } = require('../middleware/authMiddleware');

/**
 * @route   GET /web-search
 * @desc    Render the web search page
 * @access  Private
 */
router.get('/', protectRoute, (req, res) => {
  try {
    res.render('web-search', {
      user: req.user,
      title: 'Business Research Assistant'
    });
  } catch (error) {
    console.error('Error rendering web search page:', error);
    res.status(500).render('error', { 
      message: 'Server error', 
      error: process.env.NODE_ENV === 'development' ? error : {} 
    });
  }
});

module.exports = router;