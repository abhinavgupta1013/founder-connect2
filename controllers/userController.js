const User = require('../models/User');

// Helper function to generate random password for bulk imports
const generateRandomPassword = () => {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  
  return password;
};

// Cleanup invalid profile pictures
exports.cleanupProfilePictures = async (req, res) => {
  try {
    const defaultAvatarPath = '/images/default-avatar.svg';
    const oldDefaultPaths = [
      null,
      '',
      undefined,
      'undefined',
      'null',
      '/images/placeholder.jpg',
      '/images/default-avatar.png',
      '/images/user.png',
      '/images/avatar.png'
    ];
    
    // Find users with old default or invalid image paths
    const updateResult = await User.updateMany(
      { $or: [
          { avatar: { $in: oldDefaultPaths } },
          { avatar: { $exists: false } }
        ]
      },
      { $set: { avatar: defaultAvatarPath } }
    );
    
    return res.status(200).json({
      message: 'Profile pictures cleanup completed',
      updated: updateResult.nModified || updateResult.modifiedCount || 0
    });
  } catch (error) {
    console.error('Profile pictures cleanup error:', error);
    return res.status(500).json({ message: 'Server error during profile pictures cleanup', error: error.message });
  }
};

exports.searchUsers = async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ success: false, message: 'Search query is required' });
        }

        // Search for users by name, email, or username (if applicable)
        // Using a case-insensitive regex search
        const users = await User.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } },
                // Add other fields if you want to search them, e.g., username
                // { username: { $regex: query, $options: 'i' } }
            ]
        }).select('name avatar _id'); // Select only necessary fields

        res.json(users);
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ success: false, message: 'Failed to search users' });
    }
};

// Import users in bulk (for admin)
exports.bulkImportUsers = async (req, res) => {
  try {
    const { users } = req.body;
    const defaultAvatarPath = '/images/default-avatar.svg';
    
    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ message: 'Invalid user data for bulk import' });
    }
    
    const results = [];
    
    for (const userData of users) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email: userData.email });
        
        if (existingUser) {
          results.push({
            email: userData.email,
            status: 'skipped',
            message: 'User already exists'
          });
          continue;
        }
        
        // Create new user with default avatar if not provided
        const user = new User({
          name: userData.name,
          email: userData.email,
          password: userData.password || generateRandomPassword(),
          role: userData.role || 'user',
          avatar: userData.avatar || defaultAvatarPath
        });
        
        await user.save();
        
        results.push({
          email: userData.email,
          status: 'success',
          message: 'User created successfully'
        });
      } catch (error) {
        results.push({
          email: userData.email || 'unknown',
          status: 'error',
          message: error.message
        });
      }
    }
    
    return res.status(200).json({ results });
  } catch (error) {
    console.error('Bulk import error:', error);
    return res.status(500).json({ message: 'Server error during bulk import', error: error.message });
  }
};
