/**
 * Explore Page Redesign JavaScript
 * Handles dynamic functionality for the Instagram/Twitter hybrid explore page
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize components
    initializeExploreGrid();
    initializeFilterTabs();
    initializeSearch();
    initializeModal();
});

/**
 * Initialize the explore grid with masonry layout and dynamic content
 */
function initializeExploreGrid() {
    const postsContainer = document.getElementById('explore-grid');
    const loadingElement = document.getElementById('explore-loading');
    
    if (!postsContainer) return;
    
    // Show loading spinner
    if (loadingElement) {
        loadingElement.style.display = 'flex';
    }
    
    // Fetch posts from API
    fetch('/api/v2/posts/feed')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch posts: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Hide loading spinner
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            
            if (!data.posts || data.posts.length === 0) {
                postsContainer.innerHTML = '<div class="explore-empty">No posts found</div>';
                return;
            }
            
            // Render posts with different card sizes
            data.posts.forEach((post, index) => {
                const cardElement = createCardElement(post, index);
                postsContainer.appendChild(cardElement);
            });
            
            // Initialize masonry layout if needed
            // This is optional as CSS Grid with auto-placement works well too
        })
        .catch(error => {
            console.error('Error fetching posts:', error);
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            postsContainer.innerHTML = '<div class="explore-empty">Error loading posts. Please try again later.</div>';
        });
}

/**
 * Create a card element for the explore grid
 * @param {Object} post - Post data from API
 * @param {Number} index - Index of the post in the array
 * @returns {HTMLElement} - Card element
 */
function createCardElement(post, index) {
    const card = document.createElement('div');
    
    // Determine card size based on content and index
    // This creates visual variety in the grid
    let cardSize = 'standard';
    
    // Assign different card sizes based on index or content type
    // Every 7th post is large (2x2)
    if (index % 7 === 0) {
        cardSize = 'large';
    }
    // Every 5th post is wide (2x1)
    else if (index % 5 === 0) {
        cardSize = 'wide';
    }
    // Every 3rd post is tall (1x2)
    else if (index % 3 === 0) {
        cardSize = 'tall';
    }
    
    // If post has video, prefer tall format
    if (post.media && post.media.length > 0 && post.media[0].type === 'video') {
        cardSize = 'tall';
    }
    
    // If post has multiple media items, prefer large format
    if (post.media && post.media.length > 1) {
        cardSize = 'large';
    }
    
    card.className = `explore-card ${cardSize}`;
    card.dataset.postId = post._id;
    
    // Get media URL if available
    const hasMedia = post.media && post.media.length > 0;
    const mediaUrl = hasMedia ? post.media[0].url : '';
    const mediaType = hasMedia ? post.media[0].type : '';
    
    // Get user info
    const userName = post.user ? post.user.name : 'Unknown User';
    const userAvatar = post.user && post.user.avatar ? post.user.avatar : '';
    const avatarLetter = userName.charAt(0).toUpperCase();
    
    // Format date
    const postDate = new Date(post.createdAt);
    const timeAgo = formatTimeAgo(postDate);
    
    // Create HTML content
    let mediaContent = '';
    if (hasMedia) {
        if (mediaType === 'video') {
            mediaContent = `<video class="explore-card-media" src="${mediaUrl}" muted loop></video>`;
        } else {
            mediaContent = `<img class="explore-card-media" src="${mediaUrl}" alt="${post.caption || 'Post image'}">`;
        }
    } else {
        // Placeholder for text-only posts
        mediaContent = `<div class="explore-card-media explore-card-text-only">${post.caption}</div>`;
    }
    
    // Create card HTML
    card.innerHTML = `
        ${mediaContent}
        <div class="explore-card-overlay">
            <div class="explore-card-user">
                <div class="explore-card-avatar">
                    ${userAvatar ? `<img src="${userAvatar}" alt="${userName}" onerror="this.onerror=null; this.src='/images/default-avatar.svg';">` : `<img src="/images/default-avatar.svg" alt="${userName}">`}
                </div>
                <div class="explore-card-username">${userName}</div>
            </div>
            <div class="explore-card-metrics">
                <div class="explore-card-metric">
                    <i class="far fa-heart"></i> ${post.likes ? post.likes.length : 0}
                </div>
                <div class="explore-card-metric">
                    <i class="far fa-comment"></i> ${post.comments ? post.comments.length : 0}
                </div>
            </div>
        </div>
    `;
    
    // Add content type indicator
    if (hasMedia) {
        if (mediaType === 'video') {
            card.innerHTML += `<div class="explore-card-type"><i class="fas fa-play"></i></div>`;
        } else if (post.media.length > 1) {
            // Add carousel indicator for multiple media items
            let dotsHTML = '';
            for (let i = 0; i < post.media.length; i++) {
                dotsHTML += `<div class="explore-card-carousel-dot ${i === 0 ? 'active' : ''}"></div>`;
            }
            card.innerHTML += `
                <div class="explore-card-type"><i class="fas fa-clone"></i></div>
                <div class="explore-card-carousel-dots">${dotsHTML}</div>
            `;
        }
    }
    
    // Add click event to open modal
    card.addEventListener('click', () => {
        openPostModal(post);
    });
    
    // Add hover event for videos to play/pause
    if (hasMedia && mediaType === 'video') {
        const videoElement = card.querySelector('video');
        if (videoElement) {
            card.addEventListener('mouseenter', () => {
                videoElement.play();
            });
            card.addEventListener('mouseleave', () => {
                videoElement.pause();
            });
        }
    }
    
    return card;
}

/**
 * Initialize filter tabs functionality
 */
function initializeFilterTabs() {
    const filterTabs = document.querySelectorAll('.explore-filter-tab');
    if (!filterTabs.length) return;
    
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            filterTabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Get filter type
            const filterType = tab.dataset.filter;
            
            // Apply filter to grid
            filterExploreGrid(filterType);
        });
    });
}

/**
 * Filter the explore grid based on selected filter
 * @param {String} filterType - Type of filter to apply
 */
function filterExploreGrid(filterType) {
    const grid = document.getElementById('explore-grid');
    const cards = document.querySelectorAll('.explore-card');
    
    if (!grid || !cards.length) return;
    
    // Show loading spinner
    const loadingElement = document.getElementById('explore-loading');
    if (loadingElement) {
        loadingElement.style.display = 'flex';
    }
    
    // If filter is 'all', show all cards
    if (filterType === 'all') {
        cards.forEach(card => {
            card.style.display = 'block';
        });
        
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        return;
    }
    
    // Otherwise, fetch filtered posts from API
    fetch(`/api/v2/posts/feed?filter=${filterType}`)
        .then(response => response.json())
        .then(data => {
            // Clear grid
            grid.innerHTML = '';
            
            // Render filtered posts
            if (data.posts && data.posts.length > 0) {
                data.posts.forEach((post, index) => {
                    const cardElement = createCardElement(post, index);
                    grid.appendChild(cardElement);
                });
            } else {
                grid.innerHTML = '<div class="explore-empty">No posts found for this filter</div>';
            }
            
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error fetching filtered posts:', error);
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            grid.innerHTML = '<div class="explore-empty">Error loading posts. Please try again later.</div>';
        });
}

/**
 * Initialize search functionality
 */
function initializeSearch() {
    const searchInput = document.querySelector('.explore-nav-search input');
    const searchResults = document.getElementById('explore-search-results');
    
    if (!searchInput || !searchResults) return;
    
    // Preserve the default search text value
    const defaultSearchText = searchInput.value;
    
    // Debounce function to limit API calls
    const debounce = (func, wait) => {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(context, args);
            }, wait);
        };
    };
    
    // Search as user types
    searchInput.addEventListener('input', debounce(function() {
        const query = this.value.trim();
        
        if (query.length < 2) {
            searchResults.style.display = 'none';
            return;
        }
        
        performSearch(query);
    }, 300));
    
    // Ensure the default text is visible when the page loads
    if (defaultSearchText) {
        // If there's a default value, show it and trigger search if needed
        if (defaultSearchText.length >= 2) {
            performSearch(defaultSearchText);
        }
    }
    
    // Show search results on focus
    searchInput.addEventListener('focus', function() {
        // Don't clear the input field when focused
        if (this.value.trim().length >= 2) {
            performSearch(this.value.trim());
        }
    });
    
    // Hide search results when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });
}

/**
 * Perform search and display results
 * @param {String} query - Search query
 */
function performSearch(query) {
    const searchResults = document.getElementById('explore-search-results');
    if (!searchResults) return;
    
    console.log('Performing search for query:', query);
    fetch(`/api/search-users?q=${encodeURIComponent(query)}`)
        .then(response => {
            console.log('Search API response received:', response);
            if (!response.ok) {
                throw new Error('Search failed');
            }
            return response.json();
        })
        .then(users => {
            console.log('Users data received:', users);
            searchResults.innerHTML = '';
            
            if (users.length === 0) {
                searchResults.innerHTML = '<div class="explore-search-result-item">No users found</div>';
            } else {
                users.forEach(user => {
                    const item = document.createElement('div');
                    item.className = 'explore-search-result-item';
                    
                    // Create user avatar
                    const avatarLetter = user.name ? user.name.charAt(0).toUpperCase() : 'U';
                    const avatarHTML = user.avatar 
                        ? `<img src="${user.avatar}" alt="${user.name}">` 
                        : avatarLetter;
                    
                    // Display username if available
                    const usernameDisplay = user.username ? `@${user.username}` : '';
                    
                    item.innerHTML = `
                        <div class="explore-search-result-avatar">${avatarHTML}</div>
                        <div class="explore-search-result-info">
                            <div class="explore-search-result-name">${user.name}</div>
                            <div class="explore-search-result-username">${usernameDisplay}</div>
                            <div class="explore-search-result-role">${user.role || 'Member'}</div>
                        </div>
                    `;
                    
                    const messageButton = document.createElement('button');
                    messageButton.className = 'explore-search-result-message-button';
                    messageButton.textContent = 'Message';
                    messageButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openChat(user._id);
                    });

                    item.appendChild(messageButton);

                    item.addEventListener('click', () => {
                        window.location.href = `/profile/${user.slug || user._id}`;
                    });
                    
                    searchResults.appendChild(item);
                });
            }
            
            searchResults.style.display = 'block';
        })
        .catch(error => {
            console.error('Search error:', error);
            searchResults.innerHTML = '<div class="explore-search-result-item">Error performing search</div>';
            searchResults.style.display = 'block';
        });
}

/**
 * Initialize modal functionality
 */
function initializeModal() {
    // Check if enhanced modal initialization is available
    if (typeof initializeEnhancedModal === 'function') {
        // Use the enhanced modal initialization if available
        initializeEnhancedModal();
    } else {
        // Fallback to original modal initialization
        initializeLegacyModal();
    }
}

/**
 * Initialize legacy modal functionality (fallback)
 */
function initializeLegacyModal() {
    const modal = document.getElementById('explore-modal');
    if (!modal) return;
    
    // Close modal when clicking close button
    const closeButton = modal.querySelector('.explore-modal-close');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            closeModal();
        });
    }
    
    // Close modal when clicking outside content
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Close modal with escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

/**
 * Open post modal with post data
 * @param {Object} post - Post data
 */
function openPostModal(post) {
    // Call the enhanced modal function from explore-modal-enhanced.js
    if (typeof openEnhancedModal === 'function') {
        // Use the enhanced modal if available
        openEnhancedModal(post);
    } else {
        // Fallback to original modal if enhanced modal is not available
        openLegacyModal(post);
    }
}

/**
 * Legacy modal implementation (fallback)
 * @param {Object} post - Post data
 */
function openLegacyModal(post) {
    const modal = document.getElementById('explore-modal');
    if (!modal) return;
    
    // Get modal elements
    const mediaContainer = modal.querySelector('.explore-modal-media');
    const userAvatar = modal.querySelector('.explore-modal-avatar');
    const username = modal.querySelector('.explore-modal-username');
    const location = modal.querySelector('.explore-modal-location');
    const caption = modal.querySelector('.explore-modal-caption');
    const comments = modal.querySelector('.explore-modal-comments');
    const likes = modal.querySelector('.explore-modal-likes');
    const time = modal.querySelector('.explore-modal-time');
    
    // Clear previous content
    if (mediaContainer) mediaContainer.innerHTML = '';
    if (comments) comments.innerHTML = '';
    
    // Set user info
    if (username) username.textContent = post.user ? post.user.name : 'Unknown User';
    
    // Set user avatar
    if (userAvatar) {
        if (post.user && post.user.avatar) {
            userAvatar.innerHTML = `<img src="${post.user.avatar}" alt="${post.user.name}">`;
        } else {
            const avatarLetter = post.user && post.user.name ? post.user.name.charAt(0).toUpperCase() : 'U';
            userAvatar.innerHTML = avatarLetter;
        }
    }
    
    // Set location if available
    if (location) {
        location.textContent = post.location || '';
        location.style.display = post.location ? 'block' : 'none';
    }
    
    // Set media content
    if (mediaContainer && post.media && post.media.length > 0) {
        const media = post.media[0];
        if (media.type === 'video') {
            mediaContainer.innerHTML = `<video src="${media.url}" controls autoplay></video>`;
        } else {
            mediaContainer.innerHTML = `<img src="${media.url}" alt="${post.caption || 'Post image'}">`;
        }
        
        // Add navigation arrows if multiple media items
        if (post.media.length > 1) {
            mediaContainer.innerHTML += `
                <div class="explore-modal-nav prev"><i class="fas fa-chevron-left"></i></div>
                <div class="explore-modal-nav next"><i class="fas fa-chevron-right"></i></div>
            `;
            
            // Add navigation functionality
            let currentMediaIndex = 0;
            const prevButton = mediaContainer.querySelector('.prev');
            const nextButton = mediaContainer.querySelector('.next');
            
            if (prevButton) {
                prevButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    currentMediaIndex = (currentMediaIndex - 1 + post.media.length) % post.media.length;
                    updateModalMedia(mediaContainer, post.media[currentMediaIndex], post.caption);
                });
            }
            
            if (nextButton) {
                nextButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    currentMediaIndex = (currentMediaIndex + 1) % post.media.length;
                    updateModalMedia(mediaContainer, post.media[currentMediaIndex], post.caption);
                });
            }
        }
    } else if (mediaContainer) {
        // Text-only post
        mediaContainer.innerHTML = `<div class="explore-modal-text-only">${post.caption}</div>`;
    }
    
    // Set caption
    if (caption && post.caption) {
        caption.innerHTML = `
            <span class="explore-modal-caption-username">${post.user ? post.user.name : 'Unknown User'}</span>
            ${post.caption}
        `;
    } else if (caption) {
        caption.innerHTML = '';
    }
    
    // Set comments
    if (comments && post.comments && post.comments.length > 0) {
        post.comments.forEach(comment => {
            const commentElement = document.createElement('div');
            commentElement.className = 'explore-modal-comment';
            
            const commentDate = new Date(comment.createdAt);
            const timeAgo = formatTimeAgo(commentDate);
            
            const avatarLetter = comment.user && comment.user.name ? comment.user.name.charAt(0).toUpperCase() : 'U';
            const avatarHTML = comment.user && comment.user.avatar 
                ? `<img src="${comment.user.avatar}" alt="${comment.user.name}">` 
                : avatarLetter;
            
            commentElement.innerHTML = `
                <div class="explore-modal-comment-avatar">${avatarHTML}</div>
                <div class="explore-modal-comment-content">
                    <span class="explore-modal-comment-username">${comment.user ? comment.user.name : 'Unknown User'}</span>
                    <span class="explore-modal-comment-text">${comment.text}</span>
                    <div class="explore-modal-comment-time">${timeAgo}</div>
                </div>
            `;
            
            comments.appendChild(commentElement);
        });
    } else if (comments) {
        comments.innerHTML = '<div class="explore-modal-no-comments">No comments yet</div>';
    }
    
    // Set likes count
    if (likes) {
        const likesCount = post.likes ? post.likes.length : 0;
        likes.textContent = `${likesCount} ${likesCount === 1 ? 'like' : 'likes'}`;
    }
    
    // Set time
    if (time && post.createdAt) {
        const postDate = new Date(post.createdAt);
        time.textContent = formatTimeAgo(postDate);
    }
    
    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
}

/**
 * Update modal media content
 * @param {HTMLElement} container - Media container element
 * @param {Object} media - Media object
 * @param {String} caption - Post caption
 */
function updateModalMedia(container, media, caption) {
    // Remove existing media but keep navigation buttons
    const prevButton = container.querySelector('.prev');
    const nextButton = container.querySelector('.next');
    container.innerHTML = '';
    
    // Add new media
    if (media.type === 'video') {
        container.innerHTML = `<video src="${media.url}" controls autoplay></video>`;
    } else {
        container.innerHTML = `<img src="${media.url}" alt="${caption || 'Post image'}">`;
    }
    
    // Re-add navigation buttons
    if (prevButton && nextButton) {
        container.appendChild(prevButton);
        container.appendChild(nextButton);
    }
}

/**
 * Close the modal
 */
function closeModal() {
    const modal = document.getElementById('explore-modal');
    if (!modal) return;
    
    modal.classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
    
    // Pause any playing videos
    const videos = modal.querySelectorAll('video');
    videos.forEach(video => {
        video.pause();
    });
}

/**
 * Open chat with a user
 * @param {String} userId - The ID of the user to chat with
 */
function openChat(userId) {
    // Redirect to the messages page with the user ID
    window.location.href = `/messages?userId=${userId}`;
}

/**
 * Format time ago from date
 * @param {Date} date - Date to format
 * @returns {String} - Formatted time ago string
 */
function formatTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return `${diffInSeconds} seconds ago`;
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
        return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
    }
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
        return `${diffInWeeks} ${diffInWeeks === 1 ? 'week' : 'weeks'} ago`;
    }
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
        return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
    }
    
    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`;
}