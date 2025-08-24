/**
 * Mock API for testing enhanced modal functionality
 * This file simulates API responses for posts, comments, and related content
 */

// Create a global mockAPI object to store state
window.mockAPI = {};

// Mock user data
const mockUsers = [
    {
        _id: 'user1',
        name: 'John Smith',
        username: 'johnsmith',
        avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
        verified: true,
        followers: 1542,
        following: 356,
        posts: 89
    },
    {
        _id: 'user2',
        name: 'Sarah Johnson',
        username: 'sarahj',
        avatar: 'https://randomuser.me/api/portraits/women/2.jpg',
        verified: false,
        followers: 982,
        following: 245,
        posts: 42
    },
    {
        _id: 'user3',
        name: 'Michael Chen',
        username: 'mikechen',
        avatar: 'https://randomuser.me/api/portraits/men/3.jpg',
        verified: true,
        followers: 3254,
        following: 127,
        posts: 156
    },
    {
        _id: 'user4',
        name: 'Emily Davis',
        username: 'emilyd',
        avatar: 'https://randomuser.me/api/portraits/women/4.jpg',
        verified: false,
        followers: 754,
        following: 289,
        posts: 67
    }
];

// Store users in mockAPI for access from other scripts
window.mockAPI.users = mockUsers;

// Mock comments data
const mockComments = [
    {
        _id: 'comment1',
        user: mockUsers[1],
        text: 'This is amazing! Love the design approach you took here.',
        createdAt: new Date(Date.now() - 3600000 * 2), // 2 hours ago
        likes: 12,
        replies: [
            {
                _id: 'reply1',
                user: mockUsers[0],
                text: 'Thanks Sarah! Appreciate the feedback.',
                createdAt: new Date(Date.now() - 3600000), // 1 hour ago
                likes: 3
            },
            {
                _id: 'reply2',
                user: mockUsers[3],
                text: 'I agree with Sarah, really well done!',
                createdAt: new Date(Date.now() - 1800000), // 30 minutes ago
                likes: 1
            }
        ]
    },
    {
        _id: 'comment2',
        user: mockUsers[2],
        text: 'Could you share more about the tools you used for this project? I'm working on something similar.',
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
        likes: 8,
        replies: []
    },
    {
        _id: 'comment3',
        user: mockUsers[3],
        text: 'The color palette is perfect for this concept! 👏',
        createdAt: new Date(Date.now() - 172800000), // 2 days ago
        likes: 15,
        replies: []
    }
];

// Mock media data
const mockMedia = [
    // Images
    {
        type: 'image',
        url: 'https://source.unsplash.com/random/1200x800?design'
    },
    {
        type: 'image',
        url: 'https://source.unsplash.com/random/1200x800?technology'
    },
    {
        type: 'image',
        url: 'https://source.unsplash.com/random/1200x800?business'
    },
    {
        type: 'image',
        url: 'https://source.unsplash.com/random/1200x800?startup'
    },
    // Videos
    {
        type: 'video',
        url: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4'
    },
    {
        type: 'video',
        url: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_2mb.mp4'
    }
];

// Mock posts data
const mockPosts = [
    {
        _id: 'post1',
        user: mockUsers[0],
        caption: 'Just launched our new product design! #design #product #startup',
        location: 'San Francisco, CA',
        media: [mockMedia[0], mockMedia[1]],
        likes: ['user2', 'user3', 'user4'],
        comments: [mockComments[0], mockComments[1]],
        createdAt: new Date(Date.now() - 86400000 * 2), // 2 days ago
        views: 1245
    },
    {
        _id: 'post2',
        user: mockUsers[1],
        caption: 'Working on a new mobile app interface. What do you think? #ux #design #mobile',
        location: 'New York, NY',
        media: [mockMedia[2]],
        likes: ['user1', 'user3'],
        comments: [mockComments[2]],
        createdAt: new Date(Date.now() - 86400000 * 5), // 5 days ago
        views: 876
    },
    {
        _id: 'post3',
        user: mockUsers[2],
        caption: 'Demo day for our latest startup! So excited to share what we've been working on. #startup #tech #innovation',
        location: 'Austin, TX',
        media: [mockMedia[4]],
        likes: ['user1', 'user4'],
        comments: [],
        createdAt: new Date(Date.now() - 86400000 * 1), // 1 day ago
        views: 2134
    },
    {
        _id: 'post4',
        user: mockUsers[3],
        caption: 'Just published my article on founder mental health. Link in bio. #mentalhealth #founders #entrepreneurship',
        location: '',
        media: [],
        likes: ['user1', 'user2', 'user3'],
        comments: [],
        createdAt: new Date(Date.now() - 3600000 * 5), // 5 hours ago
        views: 543
    },
    {
        _id: 'post5',
        user: mockUsers[0],
        caption: 'Our team at the annual tech conference. Great connecting with everyone! #networking #conference #tech',
        location: 'Las Vegas, NV',
        media: [mockMedia[3], mockMedia[5], mockMedia[0]],
        likes: ['user2', 'user3'],
        comments: [],
        createdAt: new Date(Date.now() - 86400000 * 7), // 7 days ago
        views: 1876
    }
];

// Store posts in mockAPI for access from other scripts
window.mockAPI.posts = mockPosts;

// Add related posts to each post
mockPosts.forEach(post => {
    // Get 4 random posts that aren't the current post
    post.relatedPosts = mockPosts
        .filter(p => p._id !== post._id)
        .sort(() => 0.5 - Math.random())
        .slice(0, 4);
});

// Set current user
window.mockAPI.currentUser = mockUsers[0]; // John Smith

// Mock API endpoints
const mockAPI = {
    // Get post details
    getPost: (postId) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const post = mockPosts.find(p => p._id === postId);
                if (post && window.mockAPI.currentUser) {
                    // Add liked property based on current user
                    post.liked = post.likes.includes(window.mockAPI.currentUser._id);
                }
                resolve({ success: true, post });
            }, 300); // Simulate network delay
        });
    },
    
    // Get related posts
    getRelatedPosts: (postId, userId) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const post = mockPosts.find(p => p._id === postId);
                if (post && post.relatedPosts) {
                    resolve({ success: true, posts: post.relatedPosts });
                } else {
                    // If no related posts found, return random posts
                    const randomPosts = mockPosts
                        .filter(p => p._id !== postId)
                        .sort(() => 0.5 - Math.random())
                        .slice(0, 4);
                    resolve({ success: true, posts: randomPosts });
                }
            }, 500); // Simulate network delay
        });
    },
    
    // Like a post
    likePost: (postId) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const post = mockPosts.find(p => p._id === postId);
                if (post && window.mockAPI.currentUser) {
                    if (!post.likes.includes(window.mockAPI.currentUser._id)) {
                        post.likes.push(window.mockAPI.currentUser._id);
                    }
                    resolve({ success: true, likes: post.likes, liked: true });
                } else {
                    resolve({ success: false, message: 'Post not found or user not logged in' });
                }
            }, 300);
        });
    },
    
    // Unlike a post
    unlikePost: (postId) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const post = mockPosts.find(p => p._id === postId);
                if (post && window.mockAPI.currentUser) {
                    post.likes = post.likes.filter(id => id !== window.mockAPI.currentUser._id);
                    resolve({ success: true, likes: post.likes, liked: false });
                } else {
                    resolve({ success: false, message: 'Post not found or user not logged in' });
                }
            }, 300);
        });
    },
    
    // Add a comment
    addComment: (postId, text) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const post = mockPosts.find(p => p._id === postId);
                if (post && window.mockAPI.currentUser && text) {
                    const newComment = {
                        _id: `comment${Date.now()}`,
                        user: window.mockAPI.currentUser,
                        text: text,
                        createdAt: new Date(),
                        likes: 0,
                        replies: []
                    };
                    post.comments.push(newComment);
                    resolve({ success: true, comment: newComment });
                } else {
                    resolve({ success: false, message: 'Post not found, user not logged in, or empty comment' });
                }
            }, 300);
        });
    },
    
    // Search users
    searchUsers: (query) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                if (!query) {
                    resolve({ success: true, users: [] });
                    return;
                }
                
                const searchQuery = query.toLowerCase();
                const matchedUsers = mockUsers.filter(user => 
                    user.name.toLowerCase().includes(searchQuery) || 
                    user.username.toLowerCase().includes(searchQuery)
                );
                
                resolve({ success: true, users: matchedUsers });
            }, 300);
        });
    }
};

// Override fetch for specific API endpoints to use mock data
const originalFetch = window.fetch;
window.fetch = function(url, options) {
    // Extract endpoint from URL
    const urlObj = new URL(url, window.location.origin);
    const endpoint = urlObj.pathname;
    const params = Object.fromEntries(urlObj.searchParams);
    
    console.log(`[Mock API] Request: ${endpoint}`, params);
    
    // Mock specific API endpoints
    if (endpoint.match(/\/api\/v2\/posts\/[\w]+$/)) {
        // Get post details: /api/v2/posts/:id
        const postId = endpoint.split('/').pop();
        return mockAPI.getPost(postId);
    } else if (endpoint === '/api/v2/posts/related') {
        // Get related posts: /api/v2/posts/related?postId=:id&userId=:userId
        return mockAPI.getRelatedPosts(params.postId, params.userId);
    } else if (endpoint.match(/\/api\/v2\/posts\/[\w]+\/like$/)) {
        // Like a post: /api/v2/posts/:id/like
        const postId = endpoint.split('/')[4];
        return mockAPI.likePost(postId);
    } else if (endpoint.match(/\/api\/v2\/posts\/[\w]+\/unlike$/)) {
        // Unlike a post: /api/v2/posts/:id/unlike
        const postId = endpoint.split('/')[4];
        return mockAPI.unlikePost(postId);
    } else if (endpoint.match(/\/api\/v2\/posts\/[\w]+\/comments$/)) {
        // Add a comment: /api/v2/posts/:id/comments
        const postId = endpoint.split('/')[4];
        const body = JSON.parse(options.body);
        return mockAPI.addComment(postId, body.text);
    } else if (endpoint === '/api/v2/posts/feed') {
        // Get posts feed: /api/v2/posts/feed
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    ok: true,
                    json: () => Promise.resolve({ success: true, posts: mockPosts })
                });
            }, 500);
        });
    } else if (endpoint === '/api/v2/search/users') {
        // Search users: /api/v2/search/users?q=:query
        return mockAPI.searchUsers(params.q);
    }
    
    console.log(`[Mock API] Passing through to original fetch: ${endpoint}`);
    
    // For all other requests, use the original fetch
    return originalFetch(url, options);
};

console.log('Mock API initialized for enhanced modal testing');