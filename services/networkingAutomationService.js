const User = require('../models/User');
const Notification = require('../models/Notification');
const axios = require('axios');
require('dotenv').config();

/**
 * Networking Automation Service
 * Handles AI-powered connection suggestions and automated message drafting
 */

// OpenAI API configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Find top connection suggestions for a user based on their profile
 * @param {Object} user - User object with profile information
 * @param {Number} limit - Maximum number of suggestions to return (default: 5)
 * @returns {Array} - Array of suggested user objects with similarity scores
 */
async function findConnectionSuggestions(user, limit = 5) {
  try {
    // Extract user interests and profile data
    const userInterests = [
      ...(user.tags || []),
      ...(user.skills || [])
    ];
    
    // Build query conditions based on user role and interests
    const queryConditions = [];
    
    // Match by complementary roles
    if (user.role) {
      const complementaryRoles = getComplementaryRoles(user.role);
      if (complementaryRoles.length > 0) {
        queryConditions.push({ role: { $in: complementaryRoles } });
      }
    }
    
    // Match by shared interests/skills
    if (userInterests.length > 0) {
      queryConditions.push({
        $or: [
          { tags: { $in: userInterests } },
          { skills: { $in: userInterests } }
        ]
      });
    }
    
    // Exclude current user and existing connections/requests
    const excludeIds = [
      user._id,
      ...(user.connections || []),
      ...(user.connectionRequests || []),
      ...(user.pendingConnections || [])
    ];
    
    // Find potential connections
    let potentialConnections = [];
    
    if (queryConditions.length > 0) {
      potentialConnections = await User.find({
        $and: [
          { _id: { $nin: excludeIds } },
          { $or: queryConditions }
        ]
      })
      .select('_id name role title bio tags skills avatar slug')
      .limit(limit * 2); // Get more than needed for scoring
    } else {
      // Fallback to active users if no specific criteria
      potentialConnections = await User.find({
        _id: { $nin: excludeIds },
        'analytics.lastActive': { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Active in last 30 days
      })
      .select('_id name role title bio tags skills avatar slug')
      .limit(limit * 2);
    }
    
    // Score and rank connections
    const scoredConnections = potentialConnections.map(connection => {
      const score = calculateConnectionScore(user, connection);
      return {
        user: connection,
        score
      };
    });
    
    // Sort by score and limit
    scoredConnections.sort((a, b) => b.score - a.score);
    
    // Return top suggestions
    return scoredConnections.slice(0, limit).map(item => ({
      _id: item.user._id,
      name: item.user.name,
      role: item.user.role,
      title: item.user.title,
      bio: item.user.bio,
      avatar: item.user.avatar,
      slug: item.user.slug,
      score: item.score
    }));
  } catch (error) {
    console.error('Error finding connection suggestions:', error);
    return [];
  }
}

/**
 * Calculate a connection relevance score between two users
 * @param {Object} user - Current user
 * @param {Object} potentialConnection - Potential connection user
 * @returns {Number} - Relevance score (0-100)
 */
function calculateConnectionScore(user, potentialConnection) {
  let score = 0;
  
  // Role complementarity (highest weight)
  if (user.role && potentialConnection.role) {
    const complementaryRoles = getComplementaryRoles(user.role);
    if (complementaryRoles.includes(potentialConnection.role.toLowerCase())) {
      score += 40;
    }
  }
  
  // Shared skills/interests
  const userInterests = [...(user.tags || []), ...(user.skills || [])];
  const connectionInterests = [...(potentialConnection.tags || []), ...(potentialConnection.skills || [])];
  
  const sharedInterests = userInterests.filter(interest => 
    connectionInterests.includes(interest)
  );
  
  score += Math.min(sharedInterests.length * 10, 30); // Up to 30 points for shared interests
  
  // Bio similarity (if both have bios)
  if (user.bio && potentialConnection.bio) {
    // Simple text similarity check
    const userBioWords = user.bio.toLowerCase().split(/\W+/);
    const connectionBioWords = potentialConnection.bio.toLowerCase().split(/\W+/);
    
    const sharedWords = userBioWords.filter(word => 
      word.length > 4 && connectionBioWords.includes(word)
    );
    
    score += Math.min(sharedWords.length * 5, 20); // Up to 20 points for bio similarity
  }
  
  // Activity bonus (active users get a small boost)
  if (potentialConnection.analytics && potentialConnection.analytics.lastActive) {
    const daysSinceActive = (Date.now() - new Date(potentialConnection.analytics.lastActive)) / (1000 * 60 * 60 * 24);
    if (daysSinceActive < 7) {
      score += 10; // Active in the last week
    } else if (daysSinceActive < 30) {
      score += 5; // Active in the last month
    }
  }
  
  return Math.min(score, 100); // Cap at 100
}

/**
 * Get complementary roles for networking
 * @param {String} role - User's role
 * @returns {Array} - Array of complementary roles
 */
function getComplementaryRoles(role) {
  const roleMap = {
    'founder': ['investor', 'developer', 'designer', 'marketer', 'mentor'],
    'investor': ['founder', 'entrepreneur'],
    'developer': ['founder', 'designer', 'product manager'],
    'designer': ['founder', 'developer', 'product manager'],
    'marketer': ['founder', 'entrepreneur'],
    'entrepreneur': ['investor', 'developer', 'designer', 'marketer', 'mentor'],
    'product manager': ['developer', 'designer'],
    'mentor': ['founder', 'entrepreneur'],
    'student': ['mentor', 'founder', 'investor']
  };
  
  const userRole = role.toLowerCase();
  return roleMap[userRole] || [];
}

/**
 * Generate a personalized intro message for a connection
 * @param {Object} user - Current user
 * @param {Object} targetUser - Target user to connect with
 * @returns {String} - Generated intro message
 */
async function generateIntroMessage(user, targetUser) {
  try {
    // Extract relevant user information
    const userInfo = {
      name: user.name,
      role: user.role || 'professional',
      interests: [...(user.tags || []), ...(user.skills || [])].slice(0, 5)
    };
    
    const targetInfo = {
      name: targetUser.name,
      role: targetUser.role || 'professional',
      interests: [...(targetUser.tags || []), ...(targetUser.skills || [])].slice(0, 5)
    };
    
    // Find common interests
    const commonInterests = userInfo.interests.filter(interest => 
      targetInfo.interests.includes(interest)
    );
    
    // Create prompt for message generation
    let prompt = `Write a brief, friendly connection request message from ${userInfo.name} (${userInfo.role}) to ${targetInfo.name} (${targetInfo.role}).`;
    
    if (commonInterests.length > 0) {
      prompt += ` Mention their shared interest in ${commonInterests.join(', ')}.`;
    }
    
    prompt += ` The message should be professional, personalized, and under 150 characters.`;
    
    // Generate message using OpenAI API via axios
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: 'gpt-4o', // Using the latest model as specified
        messages: [
          { role: 'system', content: 'You are a professional networking assistant who writes concise, personalized connection messages.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 150,
        temperature: 0.7
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );
    
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating intro message:', error);
    return `Hi ${targetUser.name}, I'd like to connect with you on Founder Connect!`;
  }
}

/**
 * Send weekly connection suggestions to a user
 * @param {Object} user - User object
 * @returns {Object} - Result with success status and message
 */
async function sendWeeklySuggestions(user) {
  try {
    // Get top 5 connection suggestions
    const suggestions = await findConnectionSuggestions(user, 5);
    
    if (suggestions.length === 0) {
      return {
        success: false,
        message: 'No suitable connection suggestions found'
      };
    }
    
    // Create notification with suggestions
    const notification = new Notification({
      recipient: user._id,
      type: 'connection_suggestions',
      message: `Here are your top ${suggestions.length} connection suggestions for this week!`,
      data: {
        suggestions: suggestions.map(s => ({
          userId: s._id,
          name: s.name,
          role: s.role || s.title,
          avatar: s.avatar
        }))
      },
      read: false
    });
    
    await notification.save();
    
    return {
      success: true,
      message: `Sent ${suggestions.length} connection suggestions to ${user.name}`,
      suggestions
    };
  } catch (error) {
    console.error('Error sending weekly suggestions:', error);
    return {
      success: false,
      message: 'Failed to send connection suggestions'
    };
  }
}

/**
 * Send a connection request with an AI-generated intro message
 * @param {Object} user - Current user sending the request
 * @param {Object} targetUser - Target user to connect with
 * @returns {Object} - Result with success status and message
 */
async function sendConnectionWithIntro(user, targetUser) {
  try {
    // Check if already connected or request pending
    if (
      user.connections.includes(targetUser._id) ||
      user.pendingConnections.includes(targetUser._id) ||
      targetUser.connectionRequests.includes(user._id)
    ) {
      return {
        success: false,
        message: 'Connection request already sent or users already connected'
      };
    }
    
    // Generate intro message
    const introMessage = await generateIntroMessage(user, targetUser);
    
    // Add to current user's pending connections
    await User.findByIdAndUpdate(user._id, {
      $addToSet: { pendingConnections: targetUser._id }
    });
    
    // Add to target user's connection requests
    await User.findByIdAndUpdate(targetUser._id, {
      $addToSet: { connectionRequests: user._id }
    });
    
    // Create notification with intro message
    const notification = new Notification({
      recipient: targetUser._id,
      sender: user._id,
      type: 'connection_request',
      message: `${user.name} sent you a connection request`,
      data: {
        introMessage
      },
      read: false
    });
    
    await notification.save();
    
    return {
      success: true,
      message: `Connection request sent to ${targetUser.name} with intro message`,
      introMessage
    };
  } catch (error) {
    console.error('Error sending connection with intro:', error);
    return {
      success: false,
      message: 'Failed to send connection request'
    };
  }
}

module.exports = {
  findConnectionSuggestions,
  generateIntroMessage,
  sendWeeklySuggestions,
  sendConnectionWithIntro
};