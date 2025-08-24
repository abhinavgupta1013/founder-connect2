const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authController = require('../controllers/authController');
const { protectRoute, redirectIfAuthenticated } = require('../middleware/authMiddleware');
const bcrypt = require('bcryptjs');
const otpService = require('../services/otpService');
const emailService = require('../services/emailService');

// Signup Route
router.post('/signup', redirectIfAuthenticated, authController.signup);

// Verify OTP Route
router.post('/verify-otp', redirectIfAuthenticated, authController.verifyOTP);

// API endpoint for OTP verification (used by client-side JavaScript)
router.post('/api/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    // Verify OTP
    const verification = otpService.verifyOTP(email, otp);
    if (!verification.valid) {
      return res.status(400).json({ success: false, message: verification.message });
    }
    
    // Get the verified OTP data
    const otpData = verification.data;

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(otpData.password, salt);

    // Create new user
    const newUser = new User({
      email,
      name: otpData.name,
      password: hashedPassword,
      isVerified: true,
      createdAt: new Date()
    });

    await newUser.save();

    // Clean up OTP store
    otpService.deleteOTP(email);
    
    // Set user session
    req.session.userId = newUser._id;

    res.status(201).json({ 
      success: true, 
      message: 'Account created successfully', 
      userId: newUser._id,
      redirect: '/', // Redirect to main page after successful verification
      redirectUrl: '/' // Added redirectUrl for client-side compatibility
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ success: false, message: 'An error occurred during verification' });
  }
});

// Resend OTP Route
router.post('/resend-otp', redirectIfAuthenticated, authController.resendOTP);

// API endpoint for resending OTP (used by client-side JavaScript)
router.post('/api/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Check if OTP data exists
    const otpData = otpService.getOTPData(email);
    if (!otpData) {
      return res.status(400).json({ success: false, error: 'Registration data not found. Please sign up again.' });
    }

    // Generate new OTP
    const newOTP = otpService.generateOTP();
    
    // Update OTP in store
    otpService.updateOTP(email, newOTP);

    // Send new OTP email
    const emailSent = await emailService.sendOTPEmail(email, newOTP);
    if (!emailSent) {
      return res.status(500).json({ success: false, error: 'Failed to send verification email' });
    }

    res.status(200).json({ success: true, message: 'New OTP sent to your email' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ success: false, error: 'An error occurred while resending OTP' });
  }
});

// Login Route
router.post('/login', redirectIfAuthenticated, authController.login);

// Logout Route
router.post('/logout', protectRoute, authController.logout);

// Forgot Password Route
router.post('/forgot-password', redirectIfAuthenticated, authController.forgotPassword);

// Reset Password Route
router.post('/reset-password/:token', redirectIfAuthenticated, authController.resetPassword);

// Get Current User Route
router.get('/me', protectRoute, authController.getCurrentUser);

// Update Profile Route
router.put('/profile', protectRoute, authController.updateProfile);

// Page Routes (Render EJS templates)

// Signup Page
router.get('/signup', redirectIfAuthenticated, (req, res) => {
  res.render('signup');
});

// Login Page
router.get('/login', redirectIfAuthenticated, (req, res) => {
  res.render('login');
});

// OTP Verification Page
router.get('/verify-otp', redirectIfAuthenticated, (req, res) => {
  if (!req.session.pendingEmail) {
    return res.redirect('/signup');
  }
  res.render('otp');
});

// Forgot Password Page
router.get('/forgot-password', redirectIfAuthenticated, (req, res) => {
  res.render('forgot-password');
});

// Reset Password Page
router.get('/reset-password/:token', redirectIfAuthenticated, async (req, res) => {
  try {
    const { token } = req.params;
    
    // Verify token is valid
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.render('error', { message: 'Password reset token is invalid or has expired' });
    }

    res.render('reset-password', { token });
  } catch (error) {
    console.error('Reset password page error:', error);
    res.render('error', { message: 'An error occurred' });
  }
});

// Profile Page
router.get('/profile', protectRoute, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.redirect('/login');
    }
    res.render('modern-profile', { user, currentUser: user });
  } catch (error) {
    console.error('Profile page error:', error);
    res.render('error', { message: 'An error occurred' });
  }
});

// Legacy Profile Page (keeping for reference)
router.get('/profile-legacy', protectRoute, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.redirect('/login');
    }
    res.render('modern-profile', { user, currentUser: user });
  } catch (error) {
    console.error('Profile page error:', error);
    res.render('error', { message: 'An error occurred' });
  }
});

module.exports = router;