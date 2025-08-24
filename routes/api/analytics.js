/**
 * FoundrConnect Analytics API Routes
 * Handles profile view tracking and analytics data
 */

const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../../middleware/authMiddleware');
const User = require('../../models/User');
const ProfileView = require('../../models/ProfileView');

/**
 * @route   POST /api/analytics/track-view
 * @desc    Track a profile view
 * @access  Private
 */
router.post('/track-view', authenticateUser, async (req, res) => {
    try {
        const { profileId } = req.body;
        const viewerId = req.user.id;
        
        // Don't track if viewing own profile
        if (profileId === viewerId) {
            return res.json({ success: true, message: 'Own profile view not tracked' });
        }
        
        // Create profile view record
        await ProfileView.create({
            profile: profileId,
            viewer: viewerId,
            timestamp: Date.now()
        });
        
        return res.json({ success: true, message: 'Profile view tracked' });
    } catch (err) {
        console.error('Error tracking profile view:', err.message);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * @route   GET /api/analytics/profile
 * @desc    Get analytics data for the current user's profile
 * @access  Private
 */
router.get('/profile', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get profile views
        const allViews = await ProfileView.find({ profile: userId })
            .populate('viewer', 'name avatar title')
            .sort({ timestamp: -1 });
        
        // Get total view count
        const totalViews = allViews.length;
        
        // Get unique viewers
        const uniqueViewers = [...new Set(allViews.map(view => view.viewer._id.toString()))];
        const uniqueViewCount = uniqueViewers.length;
        
        // Calculate view trend (% change in last 30 days compared to previous 30 days)
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));
        
        const last30DaysViews = allViews.filter(view => 
            new Date(view.timestamp) >= thirtyDaysAgo
        ).length;
        
        const previous30DaysViews = allViews.filter(view => 
            new Date(view.timestamp) >= sixtyDaysAgo && 
            new Date(view.timestamp) < thirtyDaysAgo
        ).length;
        
        let viewTrend = 0;
        if (previous30DaysViews > 0) {
            viewTrend = Math.round(((last30DaysViews - previous30DaysViews) / previous30DaysViews) * 100);
        } else if (last30DaysViews > 0) {
            viewTrend = 100; // If there were no views in the previous period but there are now
        }
        
        // Get top visitors
        const viewCounts = {};
        allViews.forEach(view => {
            const viewerId = view.viewer._id.toString();
            if (!viewCounts[viewerId]) {
                viewCounts[viewerId] = {
                    count: 0,
                    viewer: view.viewer
                };
            }
            viewCounts[viewerId].count++;
        });
        
        const topVisitors = Object.values(viewCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
            .map(item => ({
                _id: item.viewer._id,
                name: item.viewer.name,
                avatar: item.viewer.avatar,
                title: item.viewer.title,
                viewCount: item.count
            }));
        
        // Get views timeline data (last 7 days)
        const last7Days = [];
        const viewsData = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            
            const dayViews = allViews.filter(view => 
                new Date(view.timestamp) >= date && 
                new Date(view.timestamp) < nextDate
            ).length;
            
            const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            last7Days.push(formattedDate);
            viewsData.push(dayViews);
        }
        
        // Get connection requests count
        const user = await User.findById(userId);
        const connectionRequests = user.connectionRequests ? user.connectionRequests.length : 0;
        
        // Messages functionality removed
        
        // Get post engagements (likes, comments)
        const postEngagements = 0; // This would be implemented with Post model
        
        // Compile analytics data
        const analyticsData = {
            views: {
                total: totalViews,
                unique: uniqueViewCount,
                trend: viewTrend
            },
            connectionRequests,
            // messages field removed,
            postEngagements,
            topVisitors,
            viewsTimeline: {
                labels: last7Days,
                data: viewsData
            }
        };
        
        return res.json({ success: true, analytics: analyticsData });
    } catch (err) {
        console.error('Error fetching analytics:', err.message);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;