/**
 * FoundrConnect Social Features
 * Handles connections, messaging, and analytics for user profiles
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get user IDs
    const userId = document.getElementById('user-id')?.value;
    const currentProfileId = document.getElementById('profile-user-id')?.value || userId;
    const isOwnProfile = userId === currentProfileId;
    
    // Initialize UI elements
    initializeConnectionUI();
    // Messaging functionality has been removed
    
    // Load data if available
    if (document.getElementById('connections-tab')) {
        loadConnections();
    }
    
    // Track profile view if viewing someone else's profile
    if (!isOwnProfile) {
        trackProfileView(currentProfileId);
    }
    
    // Load analytics data if on own profile
    if (isOwnProfile && document.getElementById('analytics-tab')) {
        loadAnalytics();
    }
    
    // Connection button functionality
    const connectBtn = document.getElementById('connect-button');
    if (connectBtn) {
        connectBtn.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            handleConnectionAction(currentProfileId, action);
        });
    }
    
    // Message button functionality has been removed
});

/**
 * Initialize connection UI elements
 */
function initializeConnectionUI() {
    // Add connection tab to profile if not exists
    const tabsContainer = document.querySelector('.profile-tabs');
    const connectionsTab = document.getElementById('connections-tab');
    
    if (tabsContainer && !connectionsTab) {
        const connectionTabHtml = `
            <div class="tab" data-tab="connections-tab">
                <i class="fas fa-users"></i> Connections
            </div>
        `;
        tabsContainer.innerHTML += connectionTabHtml;
        
        const tabContent = document.querySelector('.tab-content');
        const connectionsPaneHtml = `
            <div id="connections-tab" class="tab-pane">
                <div class="section-header">
                    <h3>Connections</h3>
                </div>
                <div id="connections-container">
                    <div class="loading-connections">Loading connections...</div>
                </div>
            </div>
        `;
        tabContent.innerHTML += connectionsPaneHtml;
        
        // Re-initialize tab click events
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                // Remove active class from all tabs and panes
                tabs.forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                
                // Add active class to clicked tab
                this.classList.add('active');
                
                // Show corresponding tab pane
                const tabId = this.getAttribute('data-tab');
                document.getElementById(tabId).classList.add('active');
                
                // Load content for the tab if needed
                if (tabId === 'connections-tab') {
                    loadConnections();
                }
            });
        });
    }
}

/**
 * Messaging functionality has been removed
 */

/**
 * Load user connections
 */
function loadConnections() {
    const connectionsContainer = document.getElementById('connections-container');
    if (!connectionsContainer) return;
    
    const userId = document.getElementById('profile-user-id')?.value || document.getElementById('user-id')?.value;
    
    connectionsContainer.innerHTML = '<div class="loading-connections">Loading connections...</div>';
    
    fetch(`/api/connections/${userId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.connections) {
                if (data.connections.length > 0) {
                    // Update connections count in user stats
                    const connectionsStatValue = document.querySelector('.stat:nth-child(1) .stat-value');
                    if (connectionsStatValue) {
                        connectionsStatValue.textContent = data.connections.length;
                    }
                    
                    // Render connections
                    connectionsContainer.innerHTML = '<div class="connections-grid"></div>';
                    const connectionsGrid = connectionsContainer.querySelector('.connections-grid');
                    
                    data.connections.forEach(connection => {
                        const connectionHtml = `
                            <div class="connection-card">
                                <a href="/profile/${connection._id}" class="connection-link">
                                    <div class="connection-avatar">
                                        <img src="${connection.avatar || '/img/default-avatar.png'}" alt="${connection.name}">
                                    </div>
                                    <div class="connection-info">
                                        <h4 class="connection-name">${connection.name}</h4>
                                        <p class="connection-title">${connection.title || 'FOUNDER CONNECT Member'}</p>
                                    </div>
                                </a>
                                <div class="connection-actions">
                                    <!-- Message button removed -->
                                </div>
                            </div>
                        `;
                        
                        connectionsGrid.innerHTML += connectionHtml;
                    });
                    
                    // Message button functionality removed
                } else {
                    connectionsContainer.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-users empty-icon"></i>
                            <p>No connections yet</p>
                            <p class="empty-subtext">Connect with other founders, investors, and professionals</p>
                        </div>
                    `;
                }
            } else {
                connectionsContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-circle empty-icon"></i>
                        <p>Failed to load connections</p>
                        <p class="empty-subtext">Please try again later</p>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Error loading connections:', error);
            connectionsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle empty-icon"></i>
                    <p>Error loading connections</p>
                    <p class="empty-subtext">Please try again later</p>
                </div>
            `;
        });
}

/**
 * Handle connection actions (connect, disconnect, accept, reject)
 * @param {string} targetUserId - The ID of the user to connect with
 * @param {string} action - The action to perform (connect, disconnect, accept, reject)
 */
function handleConnectionAction(targetUserId, action) {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'flex';
    }
    
    const connectBtn = document.getElementById('connect-button');
    
    fetch('/api/connections/action', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ targetUserId, action })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update button state based on new connection status
            if (connectBtn) {
                switch (action) {
                    case 'connect':
                        connectBtn.textContent = 'Pending';
                        connectBtn.setAttribute('data-action', 'cancel');
                        connectBtn.classList.remove('btn-primary');
                        connectBtn.classList.add('btn-outline');
                        break;
                    case 'disconnect':
                    case 'cancel':
                    case 'reject':
                        connectBtn.textContent = 'Connect';
                        connectBtn.setAttribute('data-action', 'connect');
                        connectBtn.classList.remove('btn-outline');
                        connectBtn.classList.add('btn-primary');
                        break;
                    case 'accept':
                        connectBtn.textContent = 'Connected';
                        connectBtn.setAttribute('data-action', 'disconnect');
                        connectBtn.classList.remove('btn-primary');
                        connectBtn.classList.add('btn-outline');
                        
                        // Message button functionality has been removed
                        break;
                }
            }
            
            // Update connections count if needed
            if (action === 'accept' || action === 'connect' || action === 'disconnect') {
                // Refresh connections count
                fetch('/api/users/stats')
                    .then(response => response.json())
                    .then(statsData => {
                        if (statsData.success) {
                            const connectionsStatValue = document.querySelector('.stat:nth-child(1) .stat-value');
                            if (connectionsStatValue) {
                                connectionsStatValue.textContent = statsData.stats.connections;
                            }
                        }
                    })
                    .catch(error => console.error('Error updating stats:', error));
            }
            
            // Show success notification
            showNotification('Success', data.message, 'success');
        } else {
            // Show error notification
            showNotification('Error', data.message || 'Failed to perform action', 'error');
        }
    })
    .catch(error => {
        console.error('Error handling connection action:', error);
        showNotification('Error', 'An error occurred while processing your request', 'error');
    })
    .finally(() => {
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    });
}

/**
 * Messaging functionality has been removed
 */

/**
 * Track profile view
 * @param {string} profileId - The ID of the profile being viewed
 */
function trackProfileView(profileId) {
    // Don't track if no profile ID
    if (!profileId) return;
    
    fetch('/api/analytics/track-view', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ profileId })
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success) {
            console.error('Failed to track profile view:', data.message);
        }
    })
    .catch(error => {
        console.error('Error tracking profile view:', error);
    });
}

/**
 * Load analytics data for the user's profile
 */
function loadAnalytics() {
    const analyticsContainer = document.getElementById('analytics-container');
    if (!analyticsContainer) return;
    
    analyticsContainer.innerHTML = '<div class="loading-analytics">Loading analytics...</div>';
    
    fetch('/api/analytics/profile')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.analytics) {
                // Render analytics data
                const analytics = data.analytics;
                
                analyticsContainer.innerHTML = `
                    <div class="analytics-grid">
                        <div class="analytics-card">
                            <div class="analytics-icon">
                                <i class="fas fa-eye"></i>
                            </div>
                            <div class="analytics-data">
                                <h3>${analytics.views.total}</h3>
                                <p>Profile Views</p>
                            </div>
                            <div class="analytics-trend ${analytics.views.trend > 0 ? 'positive' : analytics.views.trend < 0 ? 'negative' : ''}">
                                <i class="fas fa-${analytics.views.trend > 0 ? 'arrow-up' : analytics.views.trend < 0 ? 'arrow-down' : 'minus'}"></i>
                                <span>${Math.abs(analytics.views.trend)}%</span>
                            </div>
                        </div>
                        
                        <div class="analytics-card">
                            <div class="analytics-icon">
                                <i class="fas fa-user-plus"></i>
                            </div>
                            <div class="analytics-data">
                                <h3>${analytics.connectionRequests}</h3>
                                <p>Connection Requests</p>
                            </div>
                        </div>
                        
                        <!-- Messages analytics card removed -->
                        
                        <div class="analytics-card">
                            <div class="analytics-icon">
                                <i class="fas fa-heart"></i>
                            </div>
                            <div class="analytics-data">
                                <h3>${analytics.postEngagements}</h3>
                                <p>Post Engagements</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="analytics-section">
                        <h3>Profile Visitors</h3>
                        <div class="analytics-chart">
                            <canvas id="visitors-chart"></canvas>
                        </div>
                    </div>
                    
                    <div class="analytics-section">
                        <h3>Top Visitors</h3>
                        <div class="top-visitors">
                            ${analytics.topVisitors.length > 0 ? 
                                analytics.topVisitors.map(visitor => `
                                    <div class="visitor-item">
                                        <img src="${visitor.avatar || '/img/default-avatar.png'}" alt="${visitor.name}" class="visitor-avatar">
                                        <div class="visitor-info">
                                            <h4>${visitor.name}</h4>
                                            <p>${visitor.title || 'FOUNDER CONNECT Member'}</p>
                                        </div>
                                        <div class="visitor-count">
                                            <span>${visitor.viewCount}</span> views
                                        </div>
                                    </div>
                                `).join('') : 
                                '<div class="empty-state"><p>No profile visitors yet</p></div>'
                            }
                        </div>
                    </div>
                `;
                
                // Initialize charts if Chart.js is available
                if (window.Chart && analytics.viewsTimeline) {
                    const ctx = document.getElementById('visitors-chart').getContext('2d');
                    new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: analytics.viewsTimeline.labels,
                            datasets: [{
                                label: 'Profile Views',
                                data: analytics.viewsTimeline.data,
                                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                                borderColor: 'rgba(75, 192, 192, 1)',
                                borderWidth: 2,
                                tension: 0.4
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        precision: 0
                                    }
                                }
                            }
                        }
                    });
                }
            } else {
                analyticsContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-chart-bar empty-icon"></i>
                        <p>No analytics data available</p>
                        <p class="empty-subtext">Analytics will appear as your profile gets more engagement</p>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Error loading analytics:', error);
            analyticsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle empty-icon"></i>
                    <p>Error loading analytics</p>
                    <p class="empty-subtext">Please try again later</p>
                </div>
            `;
        });
}

/**
 * Show a notification to the user
 * @param {string} title - The notification title
 * @param {string} message - The notification message
 * @param {string} type - The notification type (success, error, info)
 */
function showNotification(title, message, type = 'info') {
    // Create notification container if it doesn't exist
    let notificationContainer = document.getElementById('notification-container');
    
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        document.body.appendChild(notificationContainer);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Add notification content
    notification.innerHTML = `
        <div class="notification-header">
            <h4>${title}</h4>
            <button class="close-notification">&times;</button>
        </div>
        <div class="notification-body">
            <p>${message}</p>
        </div>
    `;
    
    // Add to container
    notificationContainer.appendChild(notification);
    
    // Add close button functionality
    const closeBtn = notification.querySelector('.close-notification');
    closeBtn.addEventListener('click', function() {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }
    }, 5000);
}