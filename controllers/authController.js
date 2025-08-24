/**
 * Authentication Controller
 * Handles user authentication operations including signup, login, verification, and password reset
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const emailService = require('../services/emailService');
const otpService = require('../services/otpService');

// Authentication controller methods

/**
 * Handle user signup
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.signup = async (req, res) => {
  try {
    const { email, name, password } = req.body;

    // Validate input
    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Generate OTP
    const otp = otpService.generateOTP();
    
    // Store OTP with expiration (10 minutes)
    otpService.storeOTP(email, otp, { name, password });

    // Send OTP email
    const emailSent = await emailService.sendOTPEmail(email, otp);
    if (!emailSent) {
      return res.status(500).json({ error: 'Failed to send verification email' });
    }

    // Store email in session for OTP verification
    req.session.pendingEmail = email;

    res.status(200).json({ 
      success: true, 
      message: 'OTP sent to your email for verification', 
      redirectTo: '/verify-otp', // Add redirectTo for client-side navigation
      email: email // Send email back for session storage on client
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'An error occurred during signup' });
  }
};

/**
 * Verify OTP for user registration
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    const email = req.session.pendingEmail;
    const defaultAvatarPath = '/images/default-avatar.svg';

    if (!email) {
      return res.status(400).json({ error: 'Session expired. Please try signing up again.' });
    }

    // Verify OTP
    const verification = otpService.verifyOTP(email, otp);
    if (!verification.valid) {
      return res.status(400).json({ error: verification.message });
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
      createdAt: new Date(),
      avatar: defaultAvatarPath // Set default avatar for new users
    });

    await newUser.save();

    // Clean up OTP store
    otpService.deleteOTP(email);
    delete req.session.pendingEmail;

    // Send welcome email
    await emailService.sendWelcomeEmail(email, otpData.name);

    // Set user session
    req.session.userId = newUser._id;

    res.status(201).json({ 
      success: true, 
      message: 'Account created successfully', 
      userId: newUser._id,
      redirect: '/main' // Redirect to Main Page instead of Profile Page after successful verification
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ error: 'An error occurred during verification' });
  }
};

/**
 * Resend OTP for verification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.resendOTP = async (req, res) => {
  try {
    const email = req.session.pendingEmail;
    
    if (!email) {
      return res.status(400).json({ error: 'Session expired. Please try signing up again.' });
    }

    // Check if OTP data exists
    const otpData = otpService.getOTPData(email);
    if (!otpData) {
      return res.status(400).json({ error: 'Registration data not found. Please sign up again.' });
    }

    // Generate new OTP
    const newOTP = otpService.generateOTP();
    
    // Update OTP in store
    otpService.updateOTP(email, newOTP);

    // Send new OTP email
    const emailSent = await emailService.sendOTPEmail(email, newOTP);
    if (!emailSent) {
      return res.status(500).json({ error: 'Failed to send verification email' });
    }

    res.status(200).json({ message: 'New OTP sent to your email' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'An error occurred while resending OTP' });
  }
};

/**
 * Handle user login
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(400).json({ error: 'Please verify your email before logging in' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Set user session
    req.session.userId = user._id;

    res.status(200).json({ 
      message: 'Login successful', 
      userId: user._id,
      redirect: '/main' // Redirect to Main Page instead of Profile Page after successful login
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'An error occurred during login' });
  }
};

/**
 * Handle user logout
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.logout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.status(200).json({ message: 'Logged out successfully' });
  });
};

/**
 * Request password reset
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate input
    if (!email) {
      return res.status(400).json({ error: 'Please provide your email' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      // For security reasons, don't reveal that the user doesn't exist
      return res.status(200).json({ message: 'If your email is registered, you will receive a password reset link' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour

    // Update user with reset token
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    // Send password reset email
    const emailSent = await emailService.sendPasswordResetEmail(email, resetToken);
    if (!emailSent) {
      return res.status(500).json({ error: 'Failed to send password reset email' });
    }

    res.status(200).json({ message: 'If your email is registered, you will receive a password reset link' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
};

/**
 * Reset password with token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    // Validate input
    if (!token || !password) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    // Find user by reset token and check expiry
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Password reset token is invalid or has expired' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user password and clear reset token
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Send welcome email after successful account creation
    await emailService.sendWelcomeEmail(user.email, user.name);

    res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'An error occurred while resetting your password' });
  }
};

/**
 * Get current user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'An error occurred while fetching user data' });
  }
};

/**
 * Update user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { name, username, location, phone, website, tags } = req.body;

    // Find user and update profile
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update fields if provided
    if (name) user.name = name;
    if (username) user.username = username;
    if (location) user.location = location;
    if (phone) user.phone = phone;
    if (website) user.website = website;
    if (tags) user.tags = tags;

    await user.save();

    res.status(200).json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'An error occurred while updating your profile' });
  }
};