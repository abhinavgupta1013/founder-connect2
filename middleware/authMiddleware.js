/**
 * Authentication Middleware
 * This file contains middleware functions for authentication and route protection
 */

const User = require('../models/User');
const jwt = require('jsonwebtoken');

/**
 * Middleware to check if user is authenticated via API
 * Used for API routes that return JSON responses
 */
const authenticateUser = async (req, res, next) => {
  try {
    // Check if user is authenticated via session
    if (req.session && req.session.userId) {
      // Optionally fetch user data to ensure user still exists
      const user = await User.findById(req.session.userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found. Please login again.' });
      }
      
      // Attach user to request object for use in route handlers
      req.user = user;
      return next();
    }
    
    // User is not authenticated
    return res.status(401).json({ error: 'Unauthorized. Please login to continue.' });
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'An error occurred during authentication' });
  }
};

/**
 * Middleware to protect web routes
 * Redirects to login page if user is not authenticated
 * Used for routes that render views
 */
const protectRoute = async (req, res, next) => {
  try {
    if (req.session && req.session.userId) {
      // Optionally fetch user data to ensure user still exists
      const user = await User.findById(req.session.userId);
      if (!user) {
        // Clear invalid session
        req.session.destroy();
        return res.redirect('/login?error=session_expired');
      }
      
      // Attach user to request object for use in route handlers and templates
      req.user = user;
      res.locals.user = user; // Make user available to all templates
      return next();
    }
    
    // User is not authenticated, redirect to login
    return res.redirect('/login');
  } catch (error) {
    console.error('Route protection error:', error);
    // Pass a more specific error message to the error page
    const errorMessage = encodeURIComponent(error.message || 'An unexpected error occurred while protecting the route.');
    return res.redirect(`/error?message=${errorMessage}`);
  }
};

/**
 * Middleware to check if user is already logged in
 * Redirects to home page if user is already authenticated
 * Used for login and signup pages to prevent logged-in users from accessing them
 */
const redirectIfAuthenticated = async (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect('/');
  }
  next();
};

/**
 * Middleware to check if user is authenticated
 * Used for API routes that require authentication
 */
const isAuthenticated = async (req, res, next) => {
  try {
    // Check if user is authenticated via session
    if (req.session && req.session.userId) {
      // Optionally fetch user data to ensure user still exists
      const user = await User.findById(req.session.userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found. Please login again.' });
      }
      
      // Attach user to request object for use in route handlers
      req.user = user;
      return next();
    }
    
    // User is not authenticated
    return res.status(401).json({ error: 'Unauthorized. Please login to continue.' });
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'An error occurred during authentication' });
  }
};

/**
 * Middleware to check if user is an admin
 * Used for routes that require admin privileges
 */
const isAdmin = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const user = await User.findById(req.session.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    
    next();
  } catch (error) {
    console.error('Admin authorization error:', error);
    res.status(500).json({ message: 'Server error during authorization' });
  }
};

module.exports = {
  authenticateUser,
  protectRoute,
  redirectIfAuthenticated,
  isAuthenticated,
  isAdmin
};