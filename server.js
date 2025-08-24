require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

// Set up multer for file uploads
const multer = require('multer');

const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/avatars')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'avatar-' + uniqueSuffix + ext);
  }
});
const avatarUpload = multer({ storage: avatarStorage });

mongoose.connect(process.env.MONGODB_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true, 
}) 
.then(() => console.log("MongoDB connected ✅")) 
.catch(err => console.error("MongoDB error ❌", err));

const app = express();
const http = require('http').createServer(app);
const PORT = process.env.PORT || 3001;

// Socket.IO setup
const io = require('socket.io')(http, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3001",
        methods: ["GET", "POST"]
    }
});
app.set('socketio', io);

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Create a session middleware instance with the same settings as the Express app
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }
});

// Use the same session middleware for Express
app.use(sessionMiddleware);

// Socket.IO middleware for authentication
io.use((socket, next) => {
    // Apply the session middleware to the socket request
    sessionMiddleware(socket.request, {}, () => {
        if (socket.request.session && socket.request.session.userId) {
            // Set the user ID in the socket request
            socket.request.user = { _id: socket.request.session.userId };
            console.log('Socket authenticated for user:', socket.request.session.userId);
            next();
        } else {
            console.log('Socket authentication failed - no session or userId');
            next(new Error('Authentication error'));
        }
    });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected to socket:', socket.id);
    
    // If user is authenticated, join them to their personal room
    if (socket.request.user && socket.request.user._id) {
        const userId = socket.request.user._id;
        socket.join(userId); // Use userId directly as the room name for simplicity
        console.log(`User ${userId} joined their room`);
    }
    
    // Handle manual user registration (for cases where session auth might not work)
    socket.on('registerUser', (userId) => {
        if (userId) {
            socket.join(userId);
            console.log(`User ${userId} manually registered and joined room`);
        }
    });
    
    // Handle connection updates
    socket.on('connection_update', (data) => {
        if (data.targetUserId) {
            // Forward the connection update to the target user
            io.to(data.targetUserId).emit('connection_update', {
                type: data.type,
                fromUserId: data.fromUserId,
                connectionCount: data.connectionCount
            });
        }
    });
    
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Import Authentication Middleware
const { authenticateUser, protectRoute, redirectIfAuthenticated } = require('./middleware/authMiddleware');

// Import Auth Routes
const authRoutes = require('./routes/authRoutes');

// Zilliz Connection
const { MilvusClient } = require('@zilliz/milvus2-sdk-node');

// Create Milvus client with API key authentication for Zilliz Cloud
const milvusClient = new MilvusClient({
  address: `${process.env.ZILLIZ_HOST}:${process.env.ZILLIZ_PORT}`,
  ssl: true,
  token: process.env.ZILLIZ_PASSWORD, // Using the API key directly as token
  timeout: 60000
});

// Test Zilliz connection
console.log(`Attempting to connect to Zilliz at: ${process.env.ZILLIZ_HOST}:${process.env.ZILLIZ_PORT}`);

milvusClient.listCollections()
  .then(collections => {
    console.log('Connected to Zilliz successfully');
    console.log('Available collections:', collections);
  })
  .catch(err => {
    console.error('Zilliz connection error:', err);
    console.log('Please check that your Zilliz credentials are correct');
  });

// Keep MongoDB connection for backward compatibility during migration
// This can be removed once migration to Zilliz is complete
if (process.env.MONGODB_URI) {
  console.log('Maintaining MongoDB connection for backward compatibility');
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000
  }).catch(err => console.error('MongoDB fallback connection error:', err));
}

// Nodemailer Configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  },
  logger: true,
  debug: true
});

// Import Routes
const User = require('./models/User');
const Post = require('./models/Post');
const Notification = require('./models/Notification');

// Import Routes
const postRoutes = require('./routes/postRoutes');
const postRoutesV2 = require('./routes/postRoutesV2');
const apiRoutes = require('./routes/api');
const socialRoutes = require('./routes/socialRoutes');
const networkingAutomationRoutes = require('./routes/api/networkingAutomation');
const webSearchApiRoutes = require('./routes/api/web-search');

const profileReactRoutes = require('./routes/profile-react-routes');
const messagesRoutes = require('./routes/messages');
const aiChatRoutes = require('./routes/aiChatRoutes');
const webSearchRoutes = require('./routes/webSearchRoutes');
const userController = require('./controllers/userController');
const { isAdmin } = require('./middleware/authMiddleware');





// Use Auth Routes
app.use('/api/auth', authRoutes);
// Use Investor Outreach Routes
app.use('/api/investor-outreach', require('./routes/api/investorOutreach'));
app.use('/investor-outreach', require('./routes/investorOutreachRoutes'));
app.use('/', authRoutes);

// Use Web Search Routes
app.use('/api/web-search', webSearchApiRoutes);
app.use('/web-search', webSearchRoutes);

// AI Outreach Assistant Route
app.get('/ai-outreach', protectRoute, (req, res) => {
  res.redirect('/api/web-search/ai-outreach');
});

// Use Post Routes
app.use('/api/posts', postRoutes);
app.use('/api/v2/posts', postRoutesV2);

// Use User Routes
app.post('/api/admin/users/bulk-import', isAdmin, userController.bulkImportUsers);

// Use Profile React Routes
app.use('/', profileReactRoutes);

// Use Social Routes
app.use('/api/social', socialRoutes);

// Use API Routes
app.use('/api', apiRoutes);

// Use AI Chat Routes (redirecting to new implementation)
app.use('/api/ai-chat', (req, res) => {
  res.redirect('/ai/chat/new');
});

// Use New AI Chat Routes
const newAiChatRoutes = require('./routes/newAiChatRoutes');
app.use('/ai/chat', newAiChatRoutes);

// Use Networking Automation Routes
app.use('/api/networking', networkingAutomationRoutes);

// Modern Profile Page Route - Current User
app.get('/modern-profile', protectRoute, async (req, res) => {
  try {
    res.render('modern-profile', { user: req.user, currentUser: req.user });
  } catch (error) {
    console.error('Error rendering modern profile:', error);
    res.redirect('/error');
  }
});

// Modern Profile Page Route - View Other User
app.get('/modern-profile/:userId', protectRoute, async (req, res) => {
  try {
    const userId = req.params.userId;
    // Try to find user by ID first
    let profileUser = await User.findById(userId);
    
    // If not found by ID, try to find by username/slug
    if (!profileUser) {
      profileUser = await User.findOne({ slug: userId });
    }
    
    if (!profileUser) {
      return res.status(404).render('error', { message: 'User not found' });
    }
    
    res.render('modern-profile', { user: profileUser, currentUser: req.user });
  } catch (error) {
    console.error('Error rendering user profile:', error);
    res.redirect('/error');
  }
});

// Profile Redesign Page Route
app.get('/profile-redesign', protectRoute, async (req, res) => {
  try {
    // Redirect to modern profile page instead
    res.redirect('/modern-profile');
  } catch (error) {
    console.error('Error rendering profile redesign:', error);
    res.redirect('/error');
  }
});

// Define additional API routes
app.use('/api/connections', require('./routes/api/connections'));
app.use('/api/connections', require('./routes/api/connections-status'));
// Messages API routes removed
app.use('/api/analytics', require('./routes/api/analytics'));
app.use('/api/media', require('./routes/api/media'));
app.use('/api/search', require('./routes/api/search'));

// View Routes

// Profile Segmented Page Route
app.get('/profile-segmented', protectRoute, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.redirect('/login');
    }
    res.render('profile-segmented', { user });
  } catch (error) {
    console.error('Error loading profile page:', error);
    res.status(500).render('error', { message: 'Failed to load profile page' });
  }
});

app.get('/', protectRoute, async (req, res) => {
  try {
    // Fetch up to 5 registered users (excluding the current user)
    // Only show users who have completed registration (have name and either title or role)
    const suggestedUsers = await User.find({
      _id: { $ne: req.user._id },
      name: { $exists: true, $ne: null, $ne: '' },
      $or: [
        { title: { $exists: true, $ne: null, $ne: '' } },
        { role: { $exists: true, $ne: null, $ne: '' } }
      ],
      isVerified: true
    })
      .select('name avatar title role')
      .sort({ createdAt: -1 }) // Show newest registered users first
      .limit(5);
    res.render('index', { user: req.user, suggestedUsers });
  } catch (error) {
    console.error('Error rendering index:', error);
    res.redirect('/error');
  }
});

// Login Page Route
app.get('/login', redirectIfAuthenticated, (req, res) => {
  res.render('login');
});

// Signup Page Route
app.get('/signup', redirectIfAuthenticated, (req, res) => {
  res.render('signup');
});

// Notifications Page Route
app.get('/notifications', protectRoute, async (req, res) => {
  try {
    const Notification = require('./models/Notification'); // Ensure model is required
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('sender', 'name avatar slug') // Populate sender details
      .sort({ createdAt: -1 }); // Show newest first

    res.render('notifications', { 
      user: req.user, 
      notifications: notifications,
      currentPath: '/notifications' // For nav-header active state
    });
  } catch (error) {
    console.error('Error rendering notifications page:', error);
    res.status(500).render('error', { message: 'Failed to load notifications' });
  }
});

// Messages Page Route
app.get('/messages', authenticateUser, (req, res) => {
    res.render('messages', {
        user: req.user,
        path: '/messages'
    });
});

// Explore Page Route
// Redirect old explore route to concept-explore
app.get('/explore', protectRoute, (req, res) => {
  res.redirect('/concept-explore');
});

// Concept Explore Page Route
app.get('/concept-explore', protectRoute, async (req, res) => {
  try {
    res.render('concept-explore', { user: req.user, path: '/concept-explore' });
  } catch (error) {
    console.error('Error rendering concept explore page:', error);
    res.redirect('/error');
  }
});

app.get('/founders', protectRoute, async (req, res) => {
  try {
    // Fetch all users with the 'Founder' role
    const allFounders = await User.find({
      title: 'Founder',
      isVerified: true,
      name: { $exists: true, $ne: null, $ne: '' }
    })
    .select('name avatar title bio createdAt')
    .sort({ createdAt: -1 });
    
    // Get featured founders (most recent 5)
    const featuredFounders = allFounders.slice(0, 5);
    
    // Get stats for the dashboard
    const totalFounders = await User.countDocuments({ title: 'Founder' });
    const newFoundersThisMonth = await User.countDocuments({
      title: 'Founder',
      createdAt: { $gte: new Date(new Date().setDate(1)) } // From the 1st of current month
    });
    
    res.render('founders', { 
      user: req.user, 
      path: '/founders',
      featuredFounders: featuredFounders,
      allFounders: allFounders,
      stats: {
        totalFounders: totalFounders,
        newFoundersThisMonth: newFoundersThisMonth
      }
    });
  } catch (error) {
    console.error('Error rendering founders page:', error);
    res.status(500).render('error', { message: 'Failed to load founders page' });
  }
});

app.get('/investors', protectRoute, async (req, res) => {
  try {
    // Fetch all users with the 'Investor' role
    const allInvestors = await User.find({
      title: 'Investor',
      isVerified: true,
      name: { $exists: true, $ne: null, $ne: '' }
    })
    .select('name avatar title bio createdAt')
    .sort({ createdAt: -1 });
    
    // Get featured investors (most recent 5)
    const featuredInvestors = allInvestors.slice(0, 5);
    
    // Get stats for the dashboard
    const totalInvestors = await User.countDocuments({ title: 'Investor' });
    const newInvestorsThisMonth = await User.countDocuments({
      title: 'Investor',
      createdAt: { $gte: new Date(new Date().setDate(1)) } // From the 1st of current month
    });
    
    res.render('investors', { 
      user: req.user, 
      path: '/investors',
      featuredInvestors: featuredInvestors,
      allInvestors: allInvestors,
      stats: {
        totalInvestors: totalInvestors,
        newInvestorsThisMonth: newInvestorsThisMonth
      }
    });
  } catch (error) {
    console.error('Error rendering investors page:', error);
    res.status(500).render('error', { message: 'Failed to load investors page' });
  }
});

app.get('/manufacturers', protectRoute, async (req, res) => {
  try {
    // Fetch all users with the 'Manufacturer' role
    const allManufacturers = await User.find({
      title: 'Manufacturer',
      isVerified: true,
      name: { $exists: true, $ne: null, $ne: '' }
    })
    .select('name avatar title bio createdAt')
    .sort({ createdAt: -1 });
    
    // Get featured manufacturers (most recent 5)
    const featuredManufacturers = allManufacturers.slice(0, 5);
    
    // Get stats for the dashboard
    const totalManufacturers = await User.countDocuments({ title: 'Manufacturer' });
    const newManufacturersThisMonth = await User.countDocuments({
      title: 'Manufacturer',
      createdAt: { $gte: new Date(new Date().setDate(1)) } // From the 1st of current month
    });
    
    res.render('manufacturers', { 
      user: req.user, 
      path: '/manufacturers',
      featuredManufacturers: featuredManufacturers,
      allManufacturers: allManufacturers,
      stats: {
        totalManufacturers: totalManufacturers,
        newManufacturersThisMonth: newManufacturersThisMonth
      }
    });
  } catch (error) {
    console.error('Error rendering manufacturers page:', error);
    res.status(500).render('error', { message: 'Failed to load manufacturers page' });
  }
});

app.get('/interns', protectRoute, async (req, res) => {
  try {
    // Fetch all users with the 'Intern' role
    const allInterns = await User.find({
      title: 'Intern',
      isVerified: true,
      name: { $exists: true, $ne: null, $ne: '' }
    })
    .select('name avatar title bio createdAt')
    .sort({ createdAt: -1 });
    
    // Get featured interns (most recent 5)
    const featuredInterns = allInterns.slice(0, 5);
    
    // Get stats for the dashboard
    const totalInterns = await User.countDocuments({ title: 'Intern' });
    const newInternsThisMonth = await User.countDocuments({
      title: 'Intern',
      createdAt: { $gte: new Date(new Date().setDate(1)) } // From the 1st of current month
    });
    
    res.render('interns', { 
      user: req.user, 
      path: '/interns',
      featuredInterns: featuredInterns,
      allInterns: allInterns,
      stats: {
        totalInterns: totalInterns,
        newInternsThisMonth: newInternsThisMonth
      }
    });
  } catch (error) {
    console.error('Error rendering interns page:', error);
    res.status(500).render('error', { message: 'Failed to load interns page' });
  }
});

// Create Post Route
app.get('/create-post', protectRoute, async (req, res) => {
  try {
    res.render('create-post', { user: req.user });
  } catch (error) {
    console.error('Error rendering create post page:', error);
    res.redirect('/error');
  }
});

// Complete signup route
app.get('/complete-signup', protectRoute, async (req, res) => {
  try {
    res.render('profile', { user: req.user });
  } catch (error) {
    console.error('Error rendering complete signup:', error);
    res.redirect('/error');
  }
});

app.get('/profile', protectRoute, async (req, res) => {
  try {
    // Use the modern profile page
    res.render('modern-profile', { user: req.user, currentUser: req.user });
  } catch (error) {
    console.error('Error rendering profile:', error);
    res.redirect('/error');
  }
});

// Legacy profile page route
app.get('/profile-legacy', protectRoute, async (req, res) => {
  try {
    // Redirect to modern profile page instead
    res.redirect('/modern-profile');
  } catch (error) {
    console.error('Error rendering legacy profile:', error);
    res.redirect('/error');
  }
});

// API route to update user profile
app.patch('/api/users/:id', protectRoute, async (req, res) => {
  try {
    // Ensure user can only update their own profile
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const allowedUpdates = ['name', 'title', 'location', 'website', 'bio', 'skills'];
    const updates = {};
    
    // Filter allowed updates
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });
    
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// API route for profile updates (PUT - full update)
app.put('/api/user/profile', protectRoute, async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, title, location, website, bio, skills } = req.body;
    
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (title !== undefined) updates.title = title;
    if (location !== undefined) updates.location = location;
    if (website !== undefined) updates.website = website;
    if (bio !== undefined) updates.bio = bio;
    if (skills !== undefined) updates.skills = skills;
    
    const user = await User.findByIdAndUpdate(userId, updates, { new: true });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// API route for partial profile updates (PATCH - partial update)
app.patch('/api/user/profile', protectRoute, async (req, res) => {
  try {
    const userId = req.user._id;
    const updates = {};
    
    // Allow updating any of these fields
    const allowedUpdates = ['name', 'title', 'location', 'website', 'bio', 'skills'];
    
    // Filter allowed updates
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });
    
    const user = await User.findByIdAndUpdate(userId, updates, { new: true });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// API route to get current user's profile
app.get('/api/user/profile', protectRoute, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// API route to upload avatar
app.post('/api/user/avatar', protectRoute, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const userId = req.user._id;
    const avatarPath = '/uploads/avatars/' + req.file.filename;
    
    // Create avatars directory if it doesn't exist
    const avatarDir = path.join(__dirname, 'public/uploads/avatars');
    if (!fs.existsSync(avatarDir)) {
      fs.mkdirSync(avatarDir, { recursive: true });
    }
    
    // Move file to avatars directory
    const oldPath = req.file.path;
    const newPath = path.join(avatarDir, req.file.filename);
    
    fs.renameSync(oldPath, newPath);
    
    // Update user avatar in database
    const user = await User.findByIdAndUpdate(
      userId,
      { avatar: avatarPath },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove avatar
app.delete('/api/users/remove-avatar', protectRoute, async (req, res) => {
  try {
    const userId = req.user._id;
    const defaultAvatarPath = '/images/default-avatar.svg';
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Set default avatar path instead of null
    user.avatar = defaultAvatarPath;
    await user.save();

    return res.status(200).json({ 
      message: 'Avatar removed successfully', 
      defaultAvatar: defaultAvatarPath 
    });
  } catch (error) {
    console.error('Error removing avatar:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// API route to get user experience
app.get('/api/user/:userId/experience', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user.experience || []);
  } catch (error) {
    console.error('Error fetching experience:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// API route to delete user experience
app.delete('/api/user/experience/:experienceId', protectRoute, async (req, res) => {
  try {
    const { experienceId } = req.params;
    const userId = req.user._id;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Find the experience index
    const experienceIndex = user.experience.findIndex(exp => exp._id.toString() === experienceId);
    
    if (experienceIndex === -1) {
      return res.status(404).json({ error: 'Experience not found' });
    }
    
    // Remove the experience
    user.experience.splice(experienceIndex, 1);
    await user.save();
    
    res.json({ success: true, message: 'Experience deleted successfully' });
  } catch (error) {
    console.error('Error deleting experience:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// API route to get user media
app.get('/api/media/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find posts by user that have media
    const posts = await Post.find({
      author: userId,
      'media.0': { $exists: true } // Only posts with at least one media item
    }).sort({ createdAt: -1 });
    
    // Extract media from posts
    const media = [];
    posts.forEach(post => {
      if (post.media && post.media.length > 0) {
        post.media.forEach(item => {
          media.push({
            _id: item._id || post._id,
            url: item.url,
            type: item.type || 'image',
            title: item.title || '',
            createdAt: post.createdAt
          });
        });
      }
    });
    
    res.json(media);
  } catch (error) {
    console.error('Error fetching user media:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// API route to get user profile data
app.get('/api/user/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find user by ID
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Count user's connections
    const connectionCount = user.connections ? user.connections.length : 0;
    
    // Count user's posts
    const postCount = await Post.countDocuments({ author: userId });
    
    // Prepare response data
    const profileData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      title: user.title,
      location: user.location,
      website: user.website,
      bio: user.bio,
      skills: user.skills,
      connectionCount,
      postCount
    };
    
    res.json(profileData);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// API route to add experience
app.post('/api/users/:id/experience', protectRoute, async (req, res) => {
  try {
    // Ensure user can only update their own profile
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Initialize experience array if it doesn't exist
    if (!user.experience) {
      user.experience = [];
    }
    
    // Add new experience
    user.experience.push(req.body.experience);
    await user.save();
    
    res.status(201).json(user);
  } catch (error) {
    console.error('Error adding experience:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// API route to update experience
app.put('/api/users/:id/experience/:index', protectRoute, async (req, res) => {
  try {
    // Ensure user can only update their own profile
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const index = parseInt(req.params.index);
    
    // Check if experience exists
    if (!user.experience || !user.experience[index]) {
      return res.status(404).json({ error: 'Experience not found' });
    }
    
    // Update experience
    user.experience[index] = req.body;
    await user.save();
    
    res.json(user);
  } catch (error) {
    console.error('Error updating experience:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// API route to delete experience
app.delete('/api/users/:id/experience/:index', protectRoute, async (req, res) => {
  try {
    // Ensure user can only update their own profile
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const index = parseInt(req.params.index);
    
    // Check if experience exists
    if (!user.experience || !user.experience[index]) {
      return res.status(404).json({ error: 'Experience not found' });
    }
    
    // Remove experience
    user.experience.splice(index, 1);
    await user.save();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting experience:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// API route to upload avatar
app.post('/api/users/:id/avatar', protectRoute, avatarUpload.single('avatar'), async (req, res) => {
  try {
    // Ensure user can only update their own profile
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Create uploads directory if it doesn't exist
    const avatarDir = path.join(__dirname, 'public/uploads/avatars');
    if (!fs.existsSync(avatarDir)){
      fs.mkdirSync(avatarDir, { recursive: true });
    }
    
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    const user = await User.findByIdAndUpdate(
      req.params.id, 
      { avatar: avatarUrl },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true, avatar: avatarUrl });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Check if token is valid
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.redirect('/error?message=Invalid or expired reset token');
    }
    
    res.render('reset-password', { token });
  } catch (error) {
    console.error('Error rendering reset password page:', error);
    res.redirect('/error');
  }
});

app.get('/forgot-password', redirectIfAuthenticated, (req, res) => {
  res.render('forgot-password');
});

// Unified Error route - ensures query parameter 'message' is used
app.get('/error', (req, res) => {
  const message = req.query.message || 'An unknown error occurred. Please try again.';
  res.render('error', { message });
});

// Message API Routes removed

// Authentication Routes
app.post('/signup', async (req, res) => {
  // Set default avatar path
  const defaultAvatarPath = '/images/default-avatar.svg';
  try {
      const { name, email, password } = req.body;
      
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists. Please log in.' });
      }
      
      // Create new user
      const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Updated to 6 digits
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry
      
      const user = new User({ name, email, password, otp: { code: otp, expiresAt }, avatar: defaultAvatarPath });
    await user.save();
    
    // Send OTP via email
    try {
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: email,
        subject: 'Your OTP Code',
        text: `Hi ${req.body.username || 'user'}, your OTP code is ${otp}. It will expire in 5 minutes.`
      };
      
      const info = await transporter.sendMail(mailOptions);
      console.log('Message sent: %s', info.messageId);
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
    
    req.session.pendingEmail = email; // For the GET /verify-otp route to know which email is being verified
    res.json({ success: true, redirectTo: '/verify-otp', email: email });
  } catch (error) {
    console.error('Error during signup:', error); // Log the full error server-side
    let userMessage = 'An error occurred during signup. Please try again later.';

    if (error.code === 11000) { // MongoDB duplicate key error (often for email)
        userMessage = 'An account with this email already exists. Please try logging in.';
        return res.status(409).json({ message: userMessage }); // 409 Conflict
    } else if (error.name === 'ValidationError') {
        // Concatenate all validation error messages
        const messages = Object.values(error.errors).map(e => e.message).join('. ');
        userMessage = `Please check your input: ${messages}`;
        return res.status(400).json({ message: userMessage }); // 400 Bad Request
    } else if (error.message && (error.message.toLowerCase().includes('failed to send mail') || error.message.toLowerCase().includes('invalid login'))) {
        // Specific error for email sending failures, which might be caught if `transporter.sendMail` throws
        userMessage = 'Could not send verification email. Please check your email address or try again later.';
        // Log the specific error for admin review, but send a generic message to user
        console.error('Specific email sending or auth error during signup:', error.message);
    }
    // For other unhandled errors, send a generic message but log the specific one.
    res.status(500).json({ message: userMessage });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found. Please sign up.' });
    }
    
    // Generate and send OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Updated to 6 digits
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry
    
    user.otp = { code: otp, expiresAt };
    await user.save();
    
    // Send OTP via email
    try {
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: email,
        subject: 'Your OTP Code',
        text: `Hi ${req.body.username || 'user'}, your OTP code is ${otp}. It will expire in 5 minutes.`
      };
      
      const info = await transporter.sendMail(mailOptions);
      console.log('Message sent: %s', info.messageId);
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
    
    req.session.pendingEmail = email; // For the GET /verify-otp route
    res.json({ success: true, redirectTo: '/verify-otp', email: email });
  } catch (error) {
    res.status(500).json({ error: 'Error during login' });
  }
});

app.post('/api/send-otp', async (req, res) => {
  try {
    const { username, email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Updated to 6 digits
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ email });
    }

    user.otp = { code: otp, expiresAt };
    user.isVerified = false;
    await user.save();

    // Send OTP via email
    try {
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: email,
        subject: 'Your OTP Code',
        text: `Hi ${req.body.username || 'user'}, your OTP code is ${otp}. It will expire in 5 minutes.`
      };
      
      const info = await transporter.sendMail(mailOptions);
      console.log('Message sent: %s', info.messageId);
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }

    req.session.pendingEmail = email; // For the GET /verify-otp route to know which email is being verified
    res.json({ success: true, redirectTo: '/verify-otp', email: email });
  } catch (error) {
    res.status(500).json({ error: 'Error sending OTP' });
  }
});

// Add this route to your server.js file if it doesn't exist already
app.post('/api/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    console.log('Received OTP verification request:', { email, otp });
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if OTP exists and is valid
    if (!user.otp || !user.otp.code) {
      return res.status(400).json({ message: 'No OTP was generated for this user' });
    }
    
    // Check if OTP is expired
    if (user.otp.expiresAt < new Date()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one' });
    }
    
    console.log('Comparing OTPs:', { provided: otp, stored: user.otp.code });
    
    // Check if OTP matches
    if (user.otp.code !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    
    // OTP is valid, mark user as verified
    user.isVerified = true;
    user.otp = undefined; // Clear the OTP
    
    // Set user session
    req.session.userId = user._id;
    req.session.username = user.username || user.name;
    req.session.email = user.email;
    
    await user.save();
    
    console.log('OTP verification successful');
    res.json({ success: true, redirect: '/' });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Complete signup with password
app.post('/api/complete-signup', async (req, res) => {
  try {
    const { fullname, dob, username, email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !user.isVerified) {
      return res.status(400).json({ error: 'User not found or not verified' });
    }

    // Update user with remaining information
    user.name = fullname;
    user.dob = new Date(dob);
    user.username = username;
    user.password = password; // In a real app, you should hash this password
    
    await user.save();

    res.json({ success: true, redirect: '/main' });
  } catch (error) {
    console.error('Error completing signup:', error);
    res.status(500).json({ error: 'Error completing signup' });
  }
});

// Main page route
app.get('/main', (req, res) => {
  res.render('index', { user: req.session.user || null });
});

// Serve the main app for all other routes
app.get('/', (req, res) => {
  // If user is logged in, redirect to their profile
  if (req.session && req.session.userId) {
    User.findById(req.session.userId)
      .then(user => {
        if (user && user.slug) {
          return res.redirect(`/profile/${user.slug}`);
        }
        // Fetch suggested users
        User.find({ _id: { $ne: user._id } })
          .select('name avatar title role')
          .limit(5)
          .then(suggestedUsers => {
            res.render('index', { user: user || null, suggestedUsers });
          })
          .catch(err => {
            console.error('Error fetching suggested users:', err);
            res.render('index', { user: user || null, suggestedUsers: [] });
          });
      })
      .catch(err => {
        console.error('Error finding user:', err);
        res.render('index', { user: null, suggestedUsers: [] });
      });
  } else {
    res.render('index', { user: null, suggestedUsers: [] });
  }
});

// Serve login page
app.get('/login', (req, res) => {
  res.render('login');
});

// Redirect /profile to user's profile if logged in
app.get('/profile', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (user && user.slug) {
      return res.redirect(`/profile/${user.slug}`);
    }
    res.render('profile', { user: user || null });
  } catch (error) {
    console.error('Error redirecting to profile:', error);
    res.redirect('/');
  }
});

// Protected routes
app.get('/main', protectRoute, (req, res) => {
  res.render('index', { user: req.session.user || null });
});

app.get('/dashboard', protectRoute, (req, res) => {
  res.render('index', { user: req.session.user || null });
});

// Signup page route
app.get('/signup', (req, res) => {
  res.render('signup');
});

// Login endpoint
app.get('/nav-header.ejs', (req, res) => {
  res.render('partials/nav-header', { 
    user: req.session.user || null,
    currentPath: req.path 
  });
});
app.post('/api/login', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }
    
    // Check if user exists - use case-insensitive email matching
    const user = await User.findOne({ email: { $regex: new RegExp('^' + email + '$', 'i') } });
    if (!user) {
      return res.status(401).json({ error: 'No account found with this email' });
    }
    
    // Check if password matches using bcrypt
    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password' });
    }
    
    // Check if user is verified
    if (!user.isVerified) {
      return res.status(401).json({ error: 'Please verify your account first' });
    }
    
    // Login successful
    // Set session
    req.session.userId = user._id;
    req.session.username = user.username || username;
    req.session.email = user.email;
    
    // Return user info and token (session ID as token for simplicity)
    // In a real app, you would generate a proper JWT token
    const userInfo = {
      id: user._id,
      username: user.username || username,
      email: user.email,
      name: user.name,
      slug: user.slug || user._id
    };
    
    res.json({ 
      success: true, 
      token: req.sessionID,
      user: userInfo
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

// Check authentication status
app.get('/api/check-auth', authenticateUser, (req, res) => {
  res.json({ authenticated: true });
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true });
  });
});

// Profile Routes
app.get('/profile/:slug', authenticateUser, async (req, res) => {
  try {
    const { slug } = req.params;
    const user = await User.findOne({ slug });
    
    if (!user) {
      return res.status(404).render('error', { message: 'User not found' });
    }
    
    // Use modern-profile template instead of the old profile-redesign template
    res.render('modern-profile', { user, currentUser: req.user });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).render('error', { message: 'Failed to fetch profile' });
  }
});

// Search API
app.get('/api/search-users', async (req, res) => {
  try {
    const { q } = req.query;
    console.log('Search query received:', q); // Log the search query
    
    if (!q || q.length < 2) {
      console.log('Search query too short or empty.');
      return res.json([]);
    }
    
    const users = await User.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    }).limit(10).select('name slug role location avatar');
    
    console.log('Users found:', users.length); // Log the number of users found
    res.json(users);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// After login redirect
app.get('/api/me', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      slug: user.slug
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Standalone AI Chat Page Route
app.get('/ai-chat', authenticateUser, async (req, res) => {
  try {
    // Redirect to the new AI chat implementation
    res.redirect('/ai/chat/new');
  } catch (error) {
    console.error('Error redirecting to AI chat page:', error);
    res.status(500).send('An error occurred while redirecting to the AI chat page');
  }
});

// Start the server
http.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`You can also access it at http://127.0.0.1:${PORT}`);
});

// Global error handler for missing views
app.use((err, req, res, next) => {
  if (err.message && err.message.includes('Failed to lookup view')) {
    console.error(`Missing view: ${err.message}`);
    return res.status(404).render('error', { message: 'Page not found' });
  }
  next(err);
});

// Add this route handler for notifications
app.get('/notifications', protectRoute, async (req, res) => {
  try {
    // Fetch notifications for the current user
    const notifications = await Notification.find({ recipient: req.session.userId })
      .populate('sender', 'name avatar')
      .sort({ createdAt: -1 });
    
    res.render('notifications', { 
      user: req.session.user,
      notifications,
      currentPath: '/notifications'
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).render('error', { message: 'Error loading notifications' });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected to Socket.IO:', socket.id);
    
    if (socket.request.user && socket.request.user._id) {
        const userId = socket.request.user._id;
        console.log(`User ${userId} authenticated and connected`);
        
        // Join a room for the user
        socket.join(`user_${userId}`);
    }
    
    socket.on('disconnect', () => {
        console.log('User disconnected from Socket.IO:', socket.id);
    });
});

// Initialize messages routes with Socket.IO
app.use(messagesRoutes(io));

const { spawn } = require('child_process');
app.post('/api/business-research', (req, res) => {
  const topic = req.body.topic;
  const py = spawn('python', ['services/email_extractor.py', topic]);
  let data = '';
  py.stdout.on('data', chunk => { data += chunk; });
  py.on('close', () => {
    try {
      const result = JSON.parse(data);
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: 'Failed to parse Python output.' });
    }
  });
});