/**
 * Concept Explore Page JavaScript
 * Handles dynamic functionality for the grid-based explore page
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize components
    initializeExploreGrid();
    initializeCategoryTabs();
    initializeSearch();
    initializeModal();
    initializeAvatarFunctionality();
    initializeAIPrompt();
});

/**
 * Initialize the explore grid with dynamic content
 */
function initializeExploreGrid() {
    const gridContainer = document.getElementById('concept-grid');
    const loadingElement = document.getElementById('concept-loading');
    
    if (!gridContainer) return;
    
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
                gridContainer.innerHTML = '<div class="concept-empty"></div>';
                return;
            }
            
            // Render posts
            data.posts.forEach((post) => {
                const gridItem = createGridItem(post);
                if (gridItem) {
                    gridContainer.appendChild(gridItem);
                }
            });
            lazyLoadImages();
        })
        .catch(error => {
            console.error('Error fetching posts:', error);
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            gridContainer.innerHTML = '<div class="concept-empty"></div>';
        });
}

/**
 * Create a grid item element
 * @param {Object} post - Post data from API
 * @returns {HTMLElement|null} - Grid item element or null if no media
 */
function createGridItem(post) {
    const hasMedia = post.media && post.media.length > 0;
    if (!hasMedia) {
        return null;
    }

    const item = document.createElement('div');
    item.className = 'concept-grid-item';
    item.dataset.postId = post._id;

    const media = post.media[0];
    const mediaUrl = media.url;
    const thumbnailUrl = media.thumbnail || '/images/placeholder.jpg'; // Use a placeholder

    if (media.type === 'video') {
        item.classList.add('video');
    }

    const imageContainer = document.createElement('div');
    imageContainer.className = 'image-container';

    // Set placeholder in src, actual image in data-src
    const imageSrc = media.type === 'video' ? thumbnailUrl : mediaUrl;
    imageContainer.innerHTML = `<img class="lazy" src="${thumbnailUrl}" data-src="${imageSrc}" alt="${post.title || 'Post media'}">`;

    item.appendChild(imageContainer);

    item.addEventListener('click', () => {
        openPostModal(post);
    });

    return item;
}

/**
 * Initialize category tabs functionality
 */
function initializeCategoryTabs() {
    const categoryTabs = document.querySelectorAll('.category-item');
    if (!categoryTabs.length) return;
    
    categoryTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            categoryTabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Get filter value
            const filter = tab.dataset.filter;
            
            // Filter posts based on category
            filterPosts(filter);
        });
    });
}

/**
 * Filter posts based on category
 * @param {string} filter - Category filter value
 */
function filterPosts(filter) {
    const gridContainer = document.getElementById('concept-grid');
    const loadingElement = document.getElementById('concept-loading');
    
    if (!gridContainer) return;
    
    // Show loading spinner
    if (loadingElement) {
        loadingElement.style.display = 'flex';
    }
    
    // Clear current grid
    gridContainer.innerHTML = '';
    
    // Fetch filtered posts from API
    let apiUrl = '/api/v2/posts/feed';
    if (filter && filter !== 'all') {
        apiUrl += `?filter=${filter}`;
    }
    
    fetch(apiUrl)
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
                gridContainer.innerHTML = `<div class="concept-empty"></div>`;
                return;
            }
            
            // Render filtered posts
            data.posts.forEach((post) => {
                const gridItem = createGridItem(post);
                if (gridItem) {
                    gridContainer.appendChild(gridItem);
                }
            });
            lazyLoadImages();
        })
        .catch(error => {
            console.error('Error fetching filtered posts:', error);
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            gridContainer.innerHTML = '<div class="concept-empty"></div>';
        });
}

/**
 * Initialize search functionality
 */
function initializeSearch() {
    const searchInput = document.querySelector('.concept-nav-search input');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', debounce(function() {
        const query = searchInput.value.trim();
        if (query.length < 2) return;
        
        searchPosts(query);
    }, 300));
}

/**
 * Search posts based on query
 * @param {string} query - Search query
 */
function searchPosts(query) {
    const gridContainer = document.getElementById('concept-grid');
    const loadingElement = document.getElementById('concept-loading');
    
    if (!gridContainer) return;
    
    // Show loading spinner
    if (loadingElement) {
        loadingElement.style.display = 'flex';
    }
    
    // Clear current grid
    gridContainer.innerHTML = '';
    
    // Fetch search results from API
    fetch(`/api/v2/posts/search?q=${encodeURIComponent(query)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to search posts: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Hide loading spinner
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            
            if (!data.posts || data.posts.length === 0) {
                gridContainer.innerHTML = `<div class="concept-empty"></div>`;
                return;
            }
            
            // Render search results
            data.posts.forEach((post) => {
                const gridItem = createGridItem(post);
                if (gridItem) {
                    gridContainer.appendChild(gridItem);
                }
            });
            lazyLoadImages();
        })
        .catch(error => {
            console.error('Error searching posts:', error);
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            gridContainer.innerHTML = '<div class="concept-empty"></div>';
        });
}

/**
 * Initialize modal functionality with improved UI/UX
 */
function initializeModal() {
    const modal = document.getElementById('explore-modal');
    if (!modal) return;
    
    // Add live region for screen reader announcements
    const liveRegion = document.createElement('div');
    liveRegion.className = 'explore-modal-live-region';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    modal.appendChild(liveRegion);
    
    // Close modal when clicking close button
    const closeButton = modal.querySelector('.explore-modal-close');
    if (closeButton) {
        closeButton.addEventListener('click', closeModal);
        // Add ARIA label for screen readers
        closeButton.setAttribute('aria-label', 'Close modal');
        closeButton.setAttribute('role', 'button');
        closeButton.setAttribute('tabindex', '0');
    }
    
    // Close modal when clicking outside content
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Handle keyboard navigation and shortcuts
    document.addEventListener('keydown', (e) => {
        // Only process keyboard events when modal is active
        if (!modal.classList.contains('active')) return;
        
        // Prevent default behavior for navigation keys when modal is open
        if (['Escape', 'ArrowLeft', 'ArrowRight', ' ', 'Enter'].includes(e.key)) {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
            }
        }
        
        // Modal navigation and control shortcuts
        switch (e.key) {
            case 'Escape':
                closeModal();
                break;
            case 'ArrowLeft':
                const prevButton = modal.querySelector('.explore-modal-nav.prev');
                if (prevButton) prevButton.click();
                break;
            case 'ArrowRight':
                const nextButton = modal.querySelector('.explore-modal-nav.next');
                if (nextButton) nextButton.click();
                break;
        }
    });
    
    // Initialize swipe gestures for mobile
    initializeSwipeGestures(modal);
    
    // Add ARIA attributes for accessibility
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
}

/**
 * Initialize swipe gestures for mobile navigation
 * @param {HTMLElement} modal - The modal element
 */
function initializeSwipeGestures(modal) {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    
    const mediaContainer = modal.querySelector('.explore-modal-media');
    if (!mediaContainer) return;
    
    mediaContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, false);
    
    mediaContainer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipeGesture();
    }, false);
    
    // Handle swipe down on mobile to close modal
    modal.addEventListener('touchstart', (e) => {
        touchStartY = e.changedTouches[0].screenY;
    }, false);
    
    modal.addEventListener('touchend', (e) => {
        touchEndY = e.changedTouches[0].screenY;
        const yDiff = touchEndY - touchStartY;
        
        // If swipe down is more than 100px, close the modal
        if (yDiff > 100) {
            closeModal();
        }
    }, false);
    
    function handleSwipeGesture() {
        const xDiff = touchEndX - touchStartX;
        const yDiff = touchEndY - touchStartY;
        
        // Ensure horizontal swipe is more significant than vertical
        if (Math.abs(xDiff) > Math.abs(yDiff) && Math.abs(xDiff) > 50) {
            if (xDiff > 0) {
                // Swipe right - previous item
                const prevButton = modal.querySelector('.explore-modal-nav.prev');
                if (prevButton) prevButton.click();
            } else {
                // Swipe left - next item
                const nextButton = modal.querySelector('.explore-modal-nav.next');
                if (nextButton) nextButton.click();
            }
        }
    }
}

/**
 * Close the modal
 */
function closeModal() {
    const modal = document.getElementById('explore-modal');
    if (!modal) return;
    
    modal.classList.remove('active');
    
    // After animation completes, hide the modal
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
    
    // Re-enable body scrolling
    document.body.style.overflow = '';
}

/**
 * Initialize avatar upload and management functionality
 */
function initializeAvatarFunctionality() {
    // Handle avatar upload in navigation
    const navAvatarInput = document.getElementById('nav-avatar-input');
    const uploadPhotoOptions = document.querySelectorAll('.avatar-option.upload-photo');
    const removePhotoOptions = document.querySelectorAll('.avatar-option.remove-photo');
    
    // Handle click on upload photo options
    uploadPhotoOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Find the closest avatar input
            const container = this.closest('.avatar-container');
            const input = container.querySelector('.avatar-input');
            if (input) {
                input.click();
            }
        });
    });
    
    // Handle click on remove photo options
    removePhotoOptions.forEach(option => {
        option.addEventListener('click', function() {
            if (confirm('Are you sure you want to remove your profile picture?')) {
                // Show loading indicator if available
                const loadingElement = document.getElementById('concept-loading');
                if (loadingElement) {
                    loadingElement.style.display = 'flex';
                }
                
                fetch('/api/users/remove-avatar', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Update avatar to default instead of reloading page
                        const avatarElements = document.querySelectorAll('.avatar-container img');
                        avatarElements.forEach(img => {
                            img.src = data.defaultAvatar || '/images/default-avatar.svg';
                        });
                        
                        // Hide loading indicator
                        if (loadingElement) {
                            loadingElement.style.display = 'none';
                        }
                    } else {
                        alert('Failed to remove avatar: ' + (data.message || 'Unknown error'));
                        if (loadingElement) {
                            loadingElement.style.display = 'none';
                        }
                    }
                })
                .catch(error => {
                    console.error('Error removing avatar:', error);
                    alert('Error removing avatar. Please try again.');
                    if (loadingElement) {
                        loadingElement.style.display = 'none';
                    }
                });
            }
        });
    });
    
    // Handle file input change for avatar upload
    if (navAvatarInput) {
        navAvatarInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Validate file type
                const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                if (!validImageTypes.includes(file.type)) {
                    alert('Please select a valid image file (JPEG, PNG, GIF, or WEBP).');
                    return;
                }
                
                // Validate file size (max 5MB)
                const maxSize = 5 * 1024 * 1024; // 5MB in bytes
                if (file.size > maxSize) {
                    alert('Image size should not exceed 5MB.');
                    return;
                }
                
                // Show loading indicator if available
                const loadingElement = document.getElementById('concept-loading');
                if (loadingElement) {
                    loadingElement.style.display = 'flex';
                }
                
                const formData = new FormData();
                formData.append('avatar', file);

                fetch('/api/users/upload-avatar', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        window.location.reload();
                    } else {
                        alert('Failed to upload avatar: ' + (data.message || 'Unknown error'));
                        if (loadingElement) {
                            loadingElement.style.display = 'none';
                        }
                    }
                })
                .catch(error => {
                    console.error('Error uploading avatar:', error);
                    alert('Error uploading avatar. Please try again.');
                    if (loadingElement) {
                        loadingElement.style.display = 'none';
                    }
                });
            }
        });
    }
}

/**
 * Open post modal with improved UI/UX
 * @param {Object} post - Post data
 */
function openPostModal(post) {
    const modal = document.getElementById('explore-modal');
    if (!modal) return;
    
    // Store current post data for navigation
    modal.dataset.currentPostId = post._id;
    
    // Set ARIA attributes for accessibility
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'explore-modal-title');
    
    // Add a visually hidden title for screen readers if it doesn't exist
    if (!modal.querySelector('#explore-modal-title')) {
        const srTitle = document.createElement('h2');
        srTitle.id = 'explore-modal-title';
        srTitle.className = 'sr-only';
        srTitle.textContent = 'Post Details';
        modal.insertBefore(srTitle, modal.firstChild);
    }
    
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
    if (username) {
        username.textContent = post.user ? post.user.name : 'Unknown User';
        if (post.user) {
            username.addEventListener('click', () => {
                window.location.href = `/profile/${post.user._id}`;
            });
        }
    }
    
    // Set user avatar
    if (userAvatar) {
        if (post.user && post.user.avatar) {
            userAvatar.innerHTML = `<img src="${post.user.avatar}" alt="${post.user.name}" style="object-fit: cover; width: 100%; height: 100%;" onerror="this.onerror=null; this.src='/images/default-avatar.svg';">`;            
            // Add verified badge if user is verified
            if (post.user.verified) {
                userAvatar.innerHTML += `<div class="explore-modal-verified"><i class="fas fa-check"></i></div>`;
            }
        } else {
            // Use default avatar if no avatar is provided
            userAvatar.innerHTML = `<img src="/images/default-avatar.svg" alt="${post.user ? post.user.name : 'User'}" style="object-fit: cover; width: 100%; height: 100%;">`;            
        }
    }
    
    // Set location if available
    if (location) {
        if (post.location) {
            location.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${post.location}`;
            location.style.display = 'flex';
        } else {
            location.style.display = 'none';
        }
    }
    
    // Set media content
    if (mediaContainer && post.media && post.media.length > 0) {
        // Create carousel dots if multiple media items
        if (post.media.length > 1) {
            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'explore-modal-carousel-dots';
            dotsContainer.setAttribute('role', 'tablist');
            dotsContainer.setAttribute('aria-label', 'Media navigation');
            
            post.media.forEach((media, index) => {
                const dot = document.createElement('div');
                dot.className = index === 0 ? 'explore-modal-carousel-dot active' : 'explore-modal-carousel-dot';
                dot.dataset.index = index;
                
                // Add ARIA attributes for accessibility
                dot.setAttribute('role', 'tab');
                dot.setAttribute('tabindex', index === 0 ? '0' : '-1');
                dot.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
                dot.setAttribute('aria-label', `Media ${index + 1} of ${post.media.length}`);
                dot.setAttribute('id', `media-tab-${index}`);
                
                dot.addEventListener('click', () => {
                    updateModalMedia(mediaContainer, post.media[index], post.caption);
                    updateCarouselDots(dotsContainer, index);
                });
                
                dotsContainer.appendChild(dot);
            });
            
            mediaContainer.appendChild(dotsContainer);
        }
        
        // Add first media item
        const media = post.media[0];
        if (media.type === 'video') {
            const video = document.createElement('video');
            video.src = media.url;
            video.controls = true;
            video.autoplay = false;
            video.muted = true; // Auto-play requires muted
            video.className = 'explore-modal-video';
            video.addEventListener('click', () => {
                if (video.paused) {
                    video.play();
                } else {
                    video.pause();
                }
            });
            
            mediaContainer.appendChild(video);
            
            // Add custom video controls
            addCustomVideoControls(mediaContainer, video);
        } else {
            const img = document.createElement('img');
            img.src = media.url;
            img.alt = post.caption || 'Post image';
            img.className = 'explore-modal-image';
            img.addEventListener('click', toggleImageZoom);
            
            mediaContainer.appendChild(img);
        }
        
        // Add navigation arrows if multiple media items
        if (post.media.length > 1) {
            // Create proper button elements for navigation
            const prevButton = document.createElement('button');
            prevButton.className = 'explore-modal-nav prev';
            prevButton.setAttribute('aria-label', 'Previous media');
            prevButton.setAttribute('type', 'button');
            prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
            
            const nextButton = document.createElement('button');
            nextButton.className = 'explore-modal-nav next';
            nextButton.setAttribute('aria-label', 'Next media');
            nextButton.setAttribute('type', 'button');
            nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
            
            prevButton.addEventListener('click', () => {
                navigateModalMedia('prev', post);
            });
            
            nextButton.addEventListener('click', () => {
                navigateModalMedia('next', post);
            });
            
            mediaContainer.appendChild(prevButton);
            mediaContainer.appendChild(nextButton);
        }
    }
    
    // Set caption
    if (caption) {
        caption.innerHTML = '';
        if (post.caption) {
            const captionText = document.createElement('p');
            captionText.innerHTML = formatCaption(post.caption);
            caption.appendChild(captionText);
        }
    }
    
    // Set comments
    if (comments && post.comments && post.comments.length > 0) {
        post.comments.forEach(comment => {
            const commentEl = document.createElement('div');
            commentEl.className = 'explore-modal-comment';
            commentEl.innerHTML = `
                <div class="explore-modal-comment-user">${comment.user.name || 'User'}</div>
                <div class="explore-modal-comment-text">${formatCaption(comment.text)}</div>
            `;
            comments.appendChild(commentEl);
        });
    } else if (comments) {
        comments.innerHTML = '<div class="explore-modal-no-comments">No comments yet</div>';
    }
    
    // Set likes
    if (likes) {
        const likeCount = post.likes ? post.likes.length : 0;
        likes.textContent = likeCount === 1 ? '1 like' : `${likeCount} likes`;
    }
    
    // Set time
    if (time && post.createdAt) {
        time.textContent = formatDate(post.createdAt);
    }
    
    // Show modal
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
    
    // Prevent body scrolling
    document.body.style.overflow = 'hidden';
}

/**
 * Debounce function to limit how often a function can be called
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

/**
 * Lazy load images using Intersection Observer
 */
function lazyLoadImages() {
    const lazyImages = document.querySelectorAll('img.lazy');

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    img.addEventListener('load', () => {
                        // Optional: add a class to fade in the image
                        img.style.opacity = 1;
                    });
                    observer.unobserve(img);
                }
            });
        });

        lazyImages.forEach(img => {
            observer.observe(img);
        });
    } else {
        // Fallback for older browsers
        lazyImages.forEach(img => {
            img.src = img.dataset.src;
            img.classList.remove('lazy');
        });
    }
}

/**
 * Initialize AI prompt functionality
 */
function initializeAIPrompt() {
    const aiPromptInput = document.getElementById('ai-prompt');
    const generateBtn = document.getElementById('generate-btn');
    
    if (!aiPromptInput || !generateBtn) return;
    
    // Store all posts for filtering
    let allPosts = [];
    
    // Fetch all posts initially to have a complete dataset to filter from
    fetch('/api/v2/posts/feed')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch posts: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.posts && data.posts.length > 0) {
                allPosts = [...data.posts];
            }
        })
        .catch(error => {
            console.error('Error fetching posts for AI prompt:', error);
        });
    
    // Add event listener for the generate button
    generateBtn.addEventListener('click', () => {
        handleAIPrompt();
    });
    
    // Add event listener for pressing Enter in the input field
    aiPromptInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleAIPrompt();
        }
    });
    
    /**
     * Handle AI prompt generation
     */
    function handleAIPrompt() {
        const prompt = aiPromptInput.value.trim();
        if (!prompt) return;
        
        const gridContainer = document.getElementById('concept-grid');
        const loadingElement = document.getElementById('concept-loading');
        
        if (!gridContainer) return;
        
        // Show loading spinner
        if (loadingElement) {
            loadingElement.style.display = 'flex';
        }
        
        // Clear current grid
        gridContainer.innerHTML = '';
        
        // Filter posts based on the prompt
        const filteredPosts = filterPostsByPrompt(prompt, allPosts);
        
        // Hide loading spinner
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        if (filteredPosts.length === 0) {
            gridContainer.innerHTML = `<div class="concept-empty">No posts match your prompt. Try different keywords.</div>`;
            return;
        }
        
        // Render filtered posts
        filteredPosts.forEach((post) => {
            const gridItem = createGridItem(post);
            if (gridItem) {
                gridContainer.appendChild(gridItem);
            }
        });
        
        lazyLoadImages();
    }
    
    /**
     * Filter posts based on AI prompt
     * @param {string} prompt - The user's text prompt
     * @param {Array} posts - Array of posts to filter
     * @returns {Array} - Filtered posts
     */
    function filterPostsByPrompt(prompt, posts) {
        if (!prompt || !posts || posts.length === 0) {
            return posts;
        }
        
        const keywords = prompt.toLowerCase().split(/\s+/);
        
        return posts.filter(post => {
            // Create a searchable text from post properties
            const searchText = [
                post.title || '',
                post.content || '',
                post.author?.name || '',
                post.author?.username || '',
                ...(post.tags || []),
                ...(post.categories || [])
            ].join(' ').toLowerCase();
            
            // Check if any keyword is in the searchable text
            return keywords.some(keyword => searchText.includes(keyword));
        });
    }
}

/**
 * Update modal media content
 * @param {HTMLElement} container - Media container element
 * @param {Object} media - Media object with type and url
 * @param {string} caption - Post caption
 */
function updateModalMedia(container, media, caption) {
    // Clear previous media (except carousel dots and navigation)
    const dotsContainer = container.querySelector('.explore-modal-carousel-dots');
    const prevButton = container.querySelector('.explore-modal-nav.prev');
    const nextButton = container.querySelector('.explore-modal-nav.next');
    
    container.innerHTML = '';
    
    // Re-add carousel dots if they existed
    if (dotsContainer) {
        container.appendChild(dotsContainer);
    }
    
    // Add media based on type
    if (media.type === 'video') {
        const video = document.createElement('video');
        video.src = media.url;
        video.controls = true;
        video.autoplay = false;
        video.muted = true;
        video.className = 'explore-modal-video';
        video.addEventListener('click', () => {
            if (video.paused) {
                video.play();
            } else {
                video.pause();
            }
        });
        
        container.appendChild(video);
        
        // Add custom video controls
        addCustomVideoControls(container, video);
    } else {
        const img = document.createElement('img');
        img.src = media.url;
        img.alt = caption || 'Post image';
        img.className = 'explore-modal-image';
        img.addEventListener('click', toggleImageZoom);
        
        container.appendChild(img);
    }
    
    // Re-add navigation buttons if they existed
    if (prevButton && nextButton) {
        container.appendChild(prevButton);
        container.appendChild(nextButton);
    }
}

/**
 * Update carousel dots to show active media
 * @param {HTMLElement} dotsContainer - Container for carousel dots
 * @param {number} activeIndex - Index of active media
 */
function updateCarouselDots(dotsContainer, activeIndex) {
    const dots = dotsContainer.querySelectorAll('.explore-modal-carousel-dot');
    dots.forEach((dot, index) => {
        if (index === activeIndex) {
            dot.classList.add('active');
            dot.setAttribute('aria-selected', 'true');
            dot.setAttribute('tabindex', '0');
        } else {
            dot.classList.remove('active');
            dot.setAttribute('aria-selected', 'false');
            dot.setAttribute('tabindex', '-1');
        }
    });
}

/**
 * Navigate between media items in modal
 * @param {string} direction - Direction to navigate ('prev' or 'next')
 * @param {Object} post - Post data
 */
function navigateModalMedia(direction, post) {
    const mediaContainer = document.querySelector('.explore-modal-media');
    const dotsContainer = mediaContainer.querySelector('.explore-modal-carousel-dots');
    const dots = dotsContainer.querySelectorAll('.explore-modal-carousel-dot');
    
    // Find current active index
    let currentIndex = 0;
    dots.forEach((dot, index) => {
        if (dot.classList.contains('active')) {
            currentIndex = index;
        }
    });
    
    // Calculate new index
    let newIndex;
    if (direction === 'prev') {
        newIndex = currentIndex === 0 ? post.media.length - 1 : currentIndex - 1;
    } else {
        newIndex = currentIndex === post.media.length - 1 ? 0 : currentIndex + 1;
    }
    
    // Update media and dots
    updateModalMedia(mediaContainer, post.media[newIndex], post.caption);
    updateCarouselDots(dotsContainer, newIndex);
}

/**
 * Add custom video controls to video element
 * @param {HTMLElement} container - Container element
 * @param {HTMLVideoElement} video - Video element
 */
function addCustomVideoControls(container, video) {
    const controls = document.createElement('div');
    controls.className = 'explore-modal-video-controls';
    
    // Play/pause button
    const playPauseBtn = document.createElement('button');
    playPauseBtn.className = 'explore-modal-video-play';
    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    playPauseBtn.setAttribute('aria-label', 'Play video');
    
    // Update play/pause button based on video state
    function updatePlayPauseButton() {
        if (video.paused) {
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            playPauseBtn.setAttribute('aria-label', 'Play video');
        } else {
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            playPauseBtn.setAttribute('aria-label', 'Pause video');
        }
    }
    
    // Add event listeners
    playPauseBtn.addEventListener('click', () => {
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    });
    
    video.addEventListener('play', updatePlayPauseButton);
    video.addEventListener('pause', updatePlayPauseButton);
    
    controls.appendChild(playPauseBtn);
    container.appendChild(controls);
}

/**
 * Toggle image zoom on click
 * @param {Event} e - Click event
 */
function toggleImageZoom(e) {
    const img = e.target;
    img.classList.toggle('zoomed');
}

/**
 * Format caption text with links and hashtags
 * @param {string} text - Caption text
 * @returns {string} - Formatted HTML
 */
function formatCaption(text) {
    if (!text) return '';
    
    // Convert URLs to links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    text = text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Convert hashtags to links
    const hashtagRegex = /#(\w+)/g;
    text = text.replace(hashtagRegex, '<a href="/explore?tag=$1" class="hashtag">#$1</a>');
    
    // Convert mentions to links
    const mentionRegex = /@(\w+)/g;
    text = text.replace(mentionRegex, '<a href="/profile/$1" class="mention">@$1</a>');
    
    return text;
}

/**
 * Format date to relative time
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted relative time
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) {
        return 'just now';
    } else if (diffMin < 60) {
        return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
    } else if (diffHour < 24) {
        return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
    } else if (diffDay < 7) {
        return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString();
    }
}
