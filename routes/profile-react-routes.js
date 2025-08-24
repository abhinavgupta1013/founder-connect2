const express = require('express');
const router = express.Router();
const { authenticateUser, protectRoute } = require('../middleware/authMiddleware');
const User = require('../models/User');

// Route to render the React-based profile page
router.get('/profile-react', protectRoute, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.status(404).render('error', { message: 'User not found' });
        }
        
        res.render('profile-react', { user });
    } catch (error) {
        console.error('Error loading profile page:', error);
        res.status(500).render('error', { message: 'Server error' });
    }
});

module.exports = router;