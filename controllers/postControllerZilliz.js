/**
 * Post Controller using Zilliz
 * Handles post creation, retrieval, and management using Zilliz vector database
 */

const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { MilvusClient } = require('@zilliz/milvus2-sdk-node');

// Initialize Zilliz client
const zillizClient = new MilvusClient({
    address: `${process.env.ZILLIZ_HOST}:${process.env.ZILLIZ_PORT}` || 'localhost:19530',
    token: process.env.ZILLIZ_PASSWORD || '',
    ssl: true
});

// Configure multer for file uploads
const storageZilliz = multer.diskStorage({
    destination: function(req, file, cb) {
        const uploadDir = path.join(__dirname, '../public/uploads/media');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        // Create unique filename with original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'zilliz-post-' + uniqueSuffix + ext);
    }
});

// Filter function to validate file types
const fileFilterZilliz = (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        cb(null, true);
    } else {
        cb(new Error('Only images and videos are allowed for posts.'), false);
    }
};

// Initialize multer upload
const uploadZilliz = multer({
    storage: storageZilliz,
    fileFilter: fileFilterZilliz,
    limits: {
        fileSize: 15 * 1024 * 1024 // 15MB limit
    }
});

/**
 * Helper function to ensure Zilliz collections exist
 */
async function ensurePostCollectionsExist() {
    try {
        await zillizClient.connect();
        
        // Create posts collection if it doesn't exist
        const postsCollectionName = 'posts';
        const hasPostsCollection = await zillizClient.hasCollection({
            collection_name: postsCollectionName
        });
        
        if (!hasPostsCollection) {
            await zillizClient.createCollection({
                collection_name: postsCollectionName,
                fields: [
                    {
                        name: 'id',
                        description: 'Post ID',
                        data_type: 'Int64',
                        is_primary_key: true,
                        autoID: true
                    },
                    {
                        name: 'user_id',
                        description: 'User ID',
                        data_type: 'Int64'
                    },
                    {
                        name: 'caption',
                        description: 'Post Caption',
                        data_type: 'VarChar',
                        max_length: 1000
                    },
                    {
                        name: 'created_at',
                        description: 'Creation Timestamp',
                        data_type: 'Int64'
                    }
                ]
            });
        }
        
        // Create post_media collection if it doesn't exist
        const postMediaCollectionName = 'post_media';
        const hasPostMediaCollection = await zillizClient.hasCollection({
            collection_name: postMediaCollectionName
        });
        
        if (!hasPostMediaCollection) {
            await zillizClient.createCollection({
                collection_name: postMediaCollectionName,
                fields: [
                    {
                        name: 'id',
                        description: 'Media ID',
                        data_type: 'Int64',
                        is_primary_key: true,
                        autoID: true
                    },
                    {
                        name: 'post_id',
                        description: 'Post ID',
                        data_type: 'Int64'
                    },
                    {
                        name: 'url',
                        description: 'Media URL',
                        data_type: 'VarChar',
                        max_length: 255
                    },
                    {
                        name: 'type',
                        description: 'Media Type',
                        data_type: 'VarChar',
                        max_length: 50
                    },
                    {
                        name: 'filename',
                        description: 'Original Filename',
                        data_type: 'VarChar',
                        max_length: 255
                    }
                ]
            });
        }
        
        // Create post_likes collection if it doesn't exist
        const postLikesCollectionName = 'post_likes';
        const hasPostLikesCollection = await zillizClient.hasCollection({
            collection_name: postLikesCollectionName
        });
        
        if (!hasPostLikesCollection) {
            await zillizClient.createCollection({
                collection_name: postLikesCollectionName,
                fields: [
                    {
                        name: 'id',
                        description: 'Like ID',
                        data_type: 'Int64',
                        is_primary_key: true,
                        autoID: true
                    },
                    {
                        name: 'post_id',
                        description: 'Post ID',
                        data_type: 'Int64'
                    },
                    {
                        name: 'user_id',
                        description: 'User ID',
                        data_type: 'Int64'
                    },
                    {
                        name: 'created_at',
                        description: 'Creation Timestamp',
                        data_type: 'Int64'
                    }
                ]
            });
        }
        
        // Create post_comments collection if it doesn't exist
        const postCommentsCollectionName = 'post_comments';
        const hasPostCommentsCollection = await zillizClient.hasCollection({
            collection_name: postCommentsCollectionName
        });
        
        if (!hasPostCommentsCollection) {
            await zillizClient.createCollection({
                collection_name: postCommentsCollectionName,
                fields: [
                    {
                        name: 'id',
                        description: 'Comment ID',
                        data_type: 'Int64',
                        is_primary_key: true,
                        autoID: true
                    },
                    {
                        name: 'post_id',
                        description: 'Post ID',
                        data_type: 'Int64'
                    },
                    {
                        name: 'user_id',
                        description: 'User ID',
                        data_type: 'Int64'
                    },
                    {
                        name: 'text',
                        description: 'Comment Text',
                        data_type: 'VarChar',
                        max_length: 1000
                    },
                    {
                        name: 'created_at',
                        description: 'Creation Timestamp',
                        data_type: 'Int64'
                    }
                ]
            });
        }
        
        return {
            postsCollectionName,
            postMediaCollectionName,
            postLikesCollectionName,
            postCommentsCollectionName
        };
    } catch (error) {
        console.error('Error ensuring post collections exist:', error);
        throw error;
    }
}

/**
 * Helper function to get user details by ID
 */
async function getUserDetails(userId) {
    // In a real implementation, this would fetch user details from your user database
    // For now, we'll return a placeholder object
    return {
        _id: userId,
        name: 'User ' + userId,
        avatar: '/images/default-avatar.png',
        slug: 'user-' + userId,
        title: 'Founder',
        role: 'Entrepreneur'
    };
}

/**
 * Middleware to handle media uploads
 */
const uploadMediaZilliz = uploadZilliz.array('media', 5); // Allow up to 5 files for a post

/**
 * Create a new post
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createPostZilliz = async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({ error: 'You must be logged in to create a post.' });
        }

        const { caption } = req.body;
        if (!caption && (!req.files || req.files.length === 0)) {
            return res.status(400).json({ error: 'Post must contain a caption or media.' });
        }

        // Ensure collections exist
        const { postsCollectionName, postMediaCollectionName } = await ensurePostCollectionsExist();

        // Insert post into Zilliz
        const postData = {
            user_id: parseInt(userId),
            caption: caption || '',
            created_at: Date.now()
        };

        const insertResult = await zillizClient.insert({
            collection_name: postsCollectionName,
            data: [postData]
        });

        if (!insertResult || insertResult.insert_cnt === 0) {
            return res.status(500).json({ error: 'Failed to create post in Zilliz.' });
        }

        const postId = insertResult.ids[0];

        // Process media files if any
        const mediaFiles = [];
        if (req.files && req.files.length > 0) {
            const mediaData = req.files.map(file => {
                const baseUrl = `${req.protocol}://${req.get('host')}`;
                const absoluteUrl = `${baseUrl}/uploads/media/${file.filename}`;
                const fileType = file.mimetype.startsWith('image/') ? 'image' : 'video';
                return {
                    post_id: postId,
                    url: absoluteUrl,
                    type: fileType,
                    filename: file.filename
                };
            });

            // Insert media into Zilliz
            await zillizClient.insert({
                collection_name: postMediaCollectionName,
                data: mediaData
            });

            // Format media for response
            mediaFiles.push(...mediaData.map(media => ({
                url: media.url,
                type: media.type,
                filename: media.filename
            })));
        }

        // Get user details for response
        const user = await getUserDetails(userId);

        res.status(201).json({
            success: true,
            message: 'Post created successfully (Zilliz).',
            post: {
                id: postId,
                user,
                caption: caption || '',
                media: mediaFiles,
                likes: [],
                comments: [],
                createdAt: new Date()
            }
        });
    } catch (error) {
        console.error('Create post Zilliz error:', error);
        // Handle multer errors specifically if needed
        if (error instanceof multer.MulterError) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'An error occurred while creating the post: ' + error.message });
    }
};

/**
 * Get posts for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserPostsZilliz = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required.' });
        }

        // Ensure collections exist
        const { postsCollectionName, postMediaCollectionName, postLikesCollectionName, postCommentsCollectionName } = 
            await ensurePostCollectionsExist();

        // Get posts from Zilliz
        const postsSearchParams = {
            collection_name: postsCollectionName,
            expr: `user_id == ${userId}`,
            output_fields: ['id', 'user_id', 'caption', 'created_at']
        };

        const postsResult = await zillizClient.search(postsSearchParams);

        if (!postsResult || !postsResult.results) {
            return res.status(200).json({ success: true, posts: [] });
        }

        // Format posts and fetch related data
        const formattedPosts = [];
        for (const post of postsResult.results) {
            const postId = post.id;

            // Get media for this post
            const mediaSearchParams = {
                collection_name: postMediaCollectionName,
                expr: `post_id == ${postId}`,
                output_fields: ['url', 'type', 'filename']
            };

            const mediaResult = await zillizClient.search(mediaSearchParams);
            const media = mediaResult && mediaResult.results ? 
                mediaResult.results.map(m => ({
                    url: m.url,
                    type: m.type,
                    filename: m.filename
                })) : [];

            // Get likes for this post
            const likesSearchParams = {
                collection_name: postLikesCollectionName,
                expr: `post_id == ${postId}`,
                output_fields: ['user_id']
            };

            const likesResult = await zillizClient.search(likesSearchParams);
            const likes = likesResult && likesResult.results ? 
                await Promise.all(likesResult.results.map(async l => await getUserDetails(l.user_id))) : [];

            // Get comments for this post
            const commentsSearchParams = {
                collection_name: postCommentsCollectionName,
                expr: `post_id == ${postId}`,
                output_fields: ['id', 'user_id', 'text', 'created_at']
            };

            const commentsResult = await zillizClient.search(commentsSearchParams);
            const comments = commentsResult && commentsResult.results ? 
                await Promise.all(commentsResult.results.map(async c => ({
                    id: c.id,
                    user: await getUserDetails(c.user_id),
                    text: c.text,
                    createdAt: new Date(parseInt(c.created_at))
                }))) : [];

            // Get user details
            const user = await getUserDetails(post.user_id);

            // Format the complete post
            formattedPosts.push({
                id: postId,
                user,
                caption: post.caption,
                media,
                likes,
                comments,
                createdAt: new Date(parseInt(post.created_at))
            });
        }

        res.status(200).json({ 
            success: true,
            posts: formattedPosts
        });
    } catch (error) {
        console.error('Get user posts Zilliz error:', error);
        res.status(500).json({ error: 'An error occurred while fetching user posts: ' + error.message });
    }
};

/**
 * Get all posts for the feed
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllPostsZilliz = async (req, res) => {
    try {
        // Ensure collections exist
        const { postsCollectionName, postMediaCollectionName, postLikesCollectionName, postCommentsCollectionName } = 
            await ensurePostCollectionsExist();

        // Get posts from Zilliz, sorted by creation date (newest first)
        const postsSearchParams = {
            collection_name: postsCollectionName,
            output_fields: ['id', 'user_id', 'caption', 'created_at']
        };

        const postsResult = await zillizClient.search(postsSearchParams);

        if (!postsResult || !postsResult.results) {
            return res.status(200).json({ 
                success: true,
                posts: [],
                message: 'No posts found (Zilliz)'
            });
        }

        // Sort posts by created_at (newest first)
        const sortedPosts = postsResult.results.sort((a, b) => parseInt(b.created_at) - parseInt(a.created_at));
        
        // Limit to 20 posts for performance
        const limitedPosts = sortedPosts.slice(0, 20);

        // Format posts and fetch related data
        const formattedPosts = [];
        for (const post of limitedPosts) {
            const postId = post.id;

            // Get media for this post
            const mediaSearchParams = {
                collection_name: postMediaCollectionName,
                expr: `post_id == ${postId}`,
                output_fields: ['url', 'type', 'filename']
            };

            const mediaResult = await zillizClient.search(mediaSearchParams);
            const media = mediaResult && mediaResult.results ? 
                mediaResult.results.map(m => ({
                    url: m.url,
                    type: m.type,
                    filename: m.filename
                })) : [];

            // Get likes for this post
            const likesSearchParams = {
                collection_name: postLikesCollectionName,
                expr: `post_id == ${postId}`,
                output_fields: ['user_id']
            };

            const likesResult = await zillizClient.search(likesSearchParams);
            const likes = likesResult && likesResult.results ? 
                await Promise.all(likesResult.results.map(async l => await getUserDetails(l.user_id))) : [];

            // Get comments for this post
            const commentsSearchParams = {
                collection_name: postCommentsCollectionName,
                expr: `post_id == ${postId}`,
                output_fields: ['id', 'user_id', 'text', 'created_at']
            };

            const commentsResult = await zillizClient.search(commentsSearchParams);
            const comments = commentsResult && commentsResult.results ? 
                await Promise.all(commentsResult.results.map(async c => ({
                    id: c.id,
                    user: await getUserDetails(c.user_id),
                    text: c.text,
                    createdAt: new Date(parseInt(c.created_at))
                }))) : [];

            // Get user details
            const user = await getUserDetails(post.user_id);

            // Format the complete post
            formattedPosts.push({
                id: postId,
                user,
                caption: post.caption,
                media,
                likes,
                comments,
                createdAt: new Date(parseInt(post.created_at))
            });
        }

        res.status(200).json({ 
            success: true,
            posts: formattedPosts,
            message: 'Posts retrieved successfully (Zilliz)'
        });
    } catch (error) {
        console.error('Get all posts Zilliz error:', error);
        res.status(500).json({ 
            success: false,
            error: 'An error occurred while fetching posts: ' + error.message
        });
    }
};

// Export the controller functions and middleware
module.exports = {
    uploadMediaZilliz,
    createPostZilliz,
    getUserPostsZilliz,
    getAllPostsZilliz
};