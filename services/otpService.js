/**
 * OTP Service
 * Handles OTP generation, storage, and validation
 */

// Store OTPs temporarily (in production, use Redis or another solution)
const otpStore = new Map();

/**
 * Generate a 6-digit OTP
 * @returns {string} The generated OTP
 */
exports.generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Store OTP with user data and expiration
 * @param {string} email - User email
 * @param {string} otp - Generated OTP
 * @param {Object} userData - User data to store with OTP
 * @param {number} expiryMinutes - Expiry time in minutes
 */
exports.storeOTP = (email, otp, userData, expiryMinutes = 10) => {
  otpStore.set(email, {
    otp,
    ...userData,
    expiresAt: Date.now() + expiryMinutes * 60 * 1000
  });
};

/**
 * Get stored OTP data
 * @param {string} email - User email
 * @returns {Object|null} OTP data or null if not found
 */
exports.getOTPData = (email) => {
  return otpStore.get(email) || null;
};

/**
 * Verify OTP validity
 * @param {string} email - User email
 * @param {string} otp - OTP to verify
 * @returns {Object} Result with status and message
 */
exports.verifyOTP = (email, otp) => {
  const otpData = otpStore.get(email);
  
  if (!otpData) {
    return { valid: false, message: 'OTP expired. Please request a new one.' };
  }
  
  // Check if OTP is expired
  if (Date.now() > otpData.expiresAt) {
    otpStore.delete(email);
    return { valid: false, message: 'OTP expired. Please request a new one.' };
  }
  
  // Verify OTP
  if (otp !== otpData.otp) {
    return { valid: false, message: 'Invalid OTP. Please try again.' };
  }
  
  return { valid: true, data: otpData };
};

/**
 * Delete OTP data
 * @param {string} email - User email
 */
exports.deleteOTP = (email) => {
  otpStore.delete(email);
};

/**
 * Update existing OTP with new OTP
 * @param {string} email - User email
 * @param {string} newOTP - New OTP to store
 * @param {number} expiryMinutes - Expiry time in minutes
 * @returns {boolean} Success status
 */
exports.updateOTP = (email, newOTP, expiryMinutes = 10) => {
  const otpData = otpStore.get(email);
  if (!otpData) {
    return false;
  }
  
  otpStore.set(email, {
    ...otpData,
    otp: newOTP,
    expiresAt: Date.now() + expiryMinutes * 60 * 1000
  });
  
  return true;
};