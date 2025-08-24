/**
 * Investor Outreach Routes
 */

const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/authMiddleware');

/**
 * @route GET /investor-outreach
 * @desc Render investor outreach page
 * @access Private
 */
router.get('/', isAuthenticated, (req, res) => {
  res.render('investor-outreach', {
    user: req.user,
    title: 'Investor Outreach'
  });
});

module.exports = router;