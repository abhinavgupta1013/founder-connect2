/**
 * FoundrConnect Authentication Client
 * Handles client-side authentication interactions
 */

// Authentication State Management
const AuthState = {
  // Check if user is authenticated
  isAuthenticated: () => {
    return localStorage.getItem('token') !== null;
  },
  
  // Store authentication token
  setToken: (token) => {
    localStorage.setItem('token', token);
  },
  
  // Get authentication token
  getToken: () => {
    return localStorage.getItem('token');
  },
  
  // Remove authentication token
  removeToken: () => {
    localStorage.removeItem('token');
  },
  
  // Store user data
  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
  },
  
  // Get user data
  getUser: () => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  },
  
  // Remove user data
  removeUser: () => {
    localStorage.removeItem('user');
  },
  
  // Store redirect URL for after login
  setRedirectUrl: (url) => {
    sessionStorage.setItem('redirectUrl', url);
  },
  
  // Get redirect URL
  getRedirectUrl: () => {
    return sessionStorage.getItem('redirectUrl');
  },
  
  // Clear redirect URL
  clearRedirectUrl: () => {
    sessionStorage.removeItem('redirectUrl');
  },
  
  // Store email for OTP verification flow
  setEmail: (email) => {
    sessionStorage.setItem('email', email);
  },
  
  // Get email for OTP verification
  getEmail: () => {
    return sessionStorage.getItem('email');
  }
};

// UI Helper Methods
const UIHelpers = {
  // Show error message
  showError: (element, message) => {
    if (!element) return;
    element.textContent = message;
    element.style.color = '#d93025';
    element.style.display = 'block';
  },
  
  // Show success message
  showSuccess: (element, message) => {
    if (!element) return;
    element.textContent = message;
    element.style.color = '#4285f4';
    element.style.display = 'block';
  },
  
  // Disable button and show loading state
  setButtonLoading: (button, isLoading) => {
    if (!button) return;
    if (isLoading) {
      button.disabled = true;
      button.textContent = 'Please wait...';
    } else {
      button.disabled = false;
      button.textContent = button.getAttribute('data-original-text') || button.textContent;
    }
  },
  
  // Save original button text
  saveButtonText: (button) => {
    if (!button) return;
    if (!button.getAttribute('data-original-text')) {
      button.setAttribute('data-original-text', button.textContent);
    }
  },
  
  // Show loading spinner
  showLoading: () => {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = 'flex';
    }
  },
  
  // Hide loading spinner
  hideLoading: () => {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = 'none';
    }
  }
};

class AuthClient {
  /**
   * Initialize the authentication client
   */
  constructor() {
    this.apiBaseUrl = '/api/auth';
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for authentication forms
   */
  setupEventListeners() {
    // Handle signup form
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
      signupForm.addEventListener('submit', this.handleSignup.bind(this));
    }

    // Handle login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', this.handleLogin.bind(this));
    }

    // Handle OTP verification form
    const otpForm = document.getElementById('otp-form');
    if (otpForm) {
      otpForm.addEventListener('submit', this.handleOTPVerification.bind(this));
      
      // Handle resend OTP button
      const resendOtpButton = document.getElementById('resend-otp');
      if (resendOtpButton) {
        UIHelpers.saveButtonText(resendOtpButton);
        resendOtpButton.addEventListener('click', this.handleResendOTP.bind(this));
      }
    }

    // Handle logout button
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
      logoutButton.addEventListener('click', this.handleLogout.bind(this));
    }
  }

  /**
   * Handle signup form submission
   * @param {Event} e - The form submission event
   */
  async handleSignup(e) {
    e.preventDefault();
    
    const errorMessage = document.getElementById('error-message');
    const email = document.getElementById('email').value;
    const name = document.getElementById('name')?.value || '';
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password')?.value || password;
    const submitButton = e.target.querySelector('button[type="submit"]');
    
    // Reset error message
    if (errorMessage) {
      errorMessage.style.display = 'none';
    }
    
    // Basic validation
    if (password !== confirmPassword) {
      UIHelpers.showError(errorMessage, 'Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      UIHelpers.showError(errorMessage, 'Password must be at least 8 characters long');
      return;
    }
    
    // Show loading state
    UIHelpers.saveButtonText(submitButton);
    UIHelpers.setButtonLoading(submitButton, true);
    UIHelpers.showLoading();
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, name, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Store email and name for OTP verification
        AuthState.setEmail(email);
        sessionStorage.setItem('name', name);
        
        // Add debug log
        console.log('Signup successful, redirecting to OTP page');
        
        // Redirect to OTP verification page
        window.location.href = '/otp';
        
        // Force the redirect if needed
        setTimeout(() => {
          if (window.location.pathname !== '/otp') {
            console.log('Redirect did not happen, forcing redirect');
            window.location.replace('/otp');
          }
        }, 1000);
      } else {
        UIHelpers.showError(errorMessage, data.error || 'An error occurred');
      }
    } catch (error) {
      console.error('Error:', error);
      UIHelpers.showError(errorMessage, 'An error occurred. Please try again later.');
    } finally {
      UIHelpers.setButtonLoading(submitButton, false);
      UIHelpers.hideLoading();
    }
  }

  /**
   * Handle login form submission
   * @param {Event} e - The form submission event
   */
  async handleLogin(e) {
    e.preventDefault();
    
    const errorMessage = document.getElementById('error-message');
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const submitButton = e.target.querySelector('button[type="submit"]');
    
    // Reset error message
    if (errorMessage) {
      errorMessage.style.display = 'none';
    }
    
    // Show loading state
    UIHelpers.saveButtonText(submitButton);
    UIHelpers.setButtonLoading(submitButton, true);
    UIHelpers.showLoading();
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Store authentication data
        AuthState.setToken(data.token);
        AuthState.setUser(data.user);
        
        // Check if there's a redirect URL from the response or stored in AuthState
        if (data.redirect) {
          window.location.href = data.redirect; // Use server-provided redirect URL
        } else {
          const redirectUrl = AuthState.getRedirectUrl();
          if (redirectUrl) {
            AuthState.clearRedirectUrl();
            window.location.href = redirectUrl;
          } else {
            // Default redirect to Main Page
              window.location.href = '/main';
          }
        }
      } else {
        UIHelpers.showError(errorMessage, data.error || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Error:', error);
      UIHelpers.showError(errorMessage, 'An error occurred. Please try again later.');
    } finally {
      UIHelpers.setButtonLoading(submitButton, false);
      UIHelpers.hideLoading();
    }
  }

  /**
   * Handle OTP verification form submission
   * @param {Event} e - The form submission event
   */
  async handleOTPVerification(e) {
    e.preventDefault();
    
    const errorMessage = document.getElementById('error-message');
    const otp = document.getElementById('otp').value;
    const email = AuthState.getEmail();
    const submitButton = e.target.querySelector('button[type="submit"]');
    
    if (!email) {
      UIHelpers.showError(errorMessage, 'Session expired. Please go back to signup.');
      return;
    }
    
    // Reset error message
    if (errorMessage) {
      errorMessage.style.display = 'none';
    }
    
    // Show loading state
    UIHelpers.saveButtonText(submitButton);
    UIHelpers.setButtonLoading(submitButton, true);
    UIHelpers.showLoading();
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, otp })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Store authentication data if provided
        if (data.token) {
          AuthState.setToken(data.token);
        }
        if (data.user) {
          AuthState.setUser(data.user);
        }
        
        // Clear session storage data
        sessionStorage.removeItem('email');
        sessionStorage.removeItem('name');
        
        // Redirect to Main Page or specified redirect URL
            window.location.href = data.redirect || '/main';
            console.log('Redirecting to:', data.redirect || '/main');
      } else {
        UIHelpers.showError(errorMessage, data.message || data.error || 'Invalid OTP');
      }
    } catch (error) {
      console.error('Error:', error);
      UIHelpers.showError(errorMessage, 'An error occurred. Please try again later.');
    } finally {
      UIHelpers.setButtonLoading(submitButton, false);
      UIHelpers.hideLoading();
    }
  }

  /**
   * Handle resend OTP button click
   * @param {Event} e - The click event
   */
  async handleResendOTP(e) {
    e.preventDefault();
    
    const errorMessage = document.getElementById('error-message');
    const email = AuthState.getEmail();
    const resendButton = document.getElementById('resend-otp');
    
    if (!email) {
      UIHelpers.showError(errorMessage, 'Session expired. Please go back to signup.');
      return;
    }
    
    // Reset error message
    if (errorMessage) {
      errorMessage.style.display = 'none';
    }
    
    // Show loading state
    UIHelpers.setButtonLoading(resendButton, true);
    UIHelpers.showLoading();
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/resend-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Reset timer if available
        const timer = document.getElementById('timer');
        if (timer) {
          timer.textContent = 'Code expires in: 5:00';
          // Restart timer functionality would be handled by the page's own timer script
        }
        
        UIHelpers.showSuccess(errorMessage, data.message || 'New code sent successfully!');
      } else {
        UIHelpers.showError(errorMessage, data.error || 'Failed to resend OTP');
      }
    } catch (error) {
      console.error('Error:', error);
      UIHelpers.showError(errorMessage, 'An error occurred. Please try again later.');
    } finally {
      UIHelpers.setButtonLoading(resendButton, false);
      UIHelpers.hideLoading();
    }
  }

  /**
   * Handle logout button click
   * @param {Event} e - The click event
   */
  async handleLogout(e) {
    e.preventDefault();
    
    UIHelpers.showLoading();
    
    try {
      // Call logout endpoint to invalidate server-side session if needed
      await fetch(`${this.apiBaseUrl}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AuthState.getToken()}`
        }
      });
      
      // Clear local authentication data regardless of server response
      AuthState.removeToken();
      AuthState.removeUser();
      
      // Redirect to login page
      window.location.href = '/login';
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if logout API fails, clear local auth data and redirect
      AuthState.removeToken();
      AuthState.removeUser();
      window.location.href = '/login';
    } finally {
      UIHelpers.hideLoading();
    }
  }
}

// Handle protected page access
const handleProtectedPageAccess = () => {
  // Check if user is trying to access a protected page
  const isProtectedPage = [
    '/profile',
    '/dashboard',
    // '/messages' route removed
    '/notifications'
    // Add other protected pages here
  ].some(page => window.location.pathname.startsWith(page));
  
  if (isProtectedPage && !AuthState.isAuthenticated()) {
    // Save the current URL for redirect after login
    AuthState.setRedirectUrl(window.location.pathname);
    // Redirect to login page
    window.location.href = '/login';
    return false;
  }
  
  return true;
};

// Initialize the auth client when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Don't redirect from auth pages
  const isAuthPage = [
    '/login',
    '/signup',
    '/otp',
    '/reset-password'
  ].some(page => window.location.pathname.startsWith(page));
  
  if (!isAuthPage) {
    handleProtectedPageAccess();
  }
  
  // Initialize AuthClient
  new AuthClient();
});