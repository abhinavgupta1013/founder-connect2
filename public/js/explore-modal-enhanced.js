/**
 * Enhanced Modal Functionality for Explore Page
 * Implements advanced content display, navigation, and interaction features
 */

// Global variables to track current post and state
let currentPost = null;
let currentMediaIndex = 0;
let isVideoPlaying = false;
let isZoomed = false;
let touchStartX = 0;
let touchStartY = 0;

// Initialize modal functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeEnhancedModal();
    
    // Add event listeners to navigation arrows
    const explorePrevArrow = document.querySelector('.explore-modal-prev-arrow');
    const exploreNextArrow = document.querySelector('.explore-modal-next-arrow');
    
    if (explorePrevArrow) {
        explorePrevArrow.addEventListener('click', (e) => {
            e.stopPropagation();
            navigateModal('prev');
        });
    }
    
    if (exploreNextArrow) {
        exploreNextArrow.addEventListener('click', (e) => {
            e.stopPropagation();
            navigateModal('next');
        });
    }
});

/**
 * Initialize enhanced modal functionality
 */
function initializeEnhancedModal() {
    const modal = document.getElementById('explore-modal');
    if (!modal) return;
    
    // Add live region for screen reader announcements
    const liveRegion = document.createElement('div');
    liveRegion.className = 'explore-modal-live-region';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    modal.appendChild(liveRegion);
    
    // Add navigation arrows to the modal
    const mediaContainer = modal.querySelector('.explore-modal-media');
    if (mediaContainer) {
        // Create previous arrow button
        const prevArrow = document.createElement('button');
        prevArrow.className = 'modal-nav-arrow prev';
        prevArrow.setAttribute('aria-label', 'Previous post');
        prevArrow.innerHTML = '←';
        prevArrow.addEventListener('click', () => navigateModal('prev'));
        
        // Create next arrow button
        const nextArrow = document.createElement('button');
        nextArrow.className = 'modal-nav-arrow next';
        nextArrow.setAttribute('aria-label', 'Next post');
        nextArrow.innerHTML = '→';
        nextArrow.addEventListener('click', () => navigateModal('next'));
        
        // Add arrows to media container
        mediaContainer.appendChild(prevArrow);
        mediaContainer.appendChild(nextArrow);
    }
    
    // Close modal when clicking close button
    const closeButton = modal.querySelector('.explore-modal-close');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            closeModal();
        });
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
        const modal = document.getElementById('explore-modal');
        if (!modal || !modal.classList.contains('active')) return;
        
        // Prevent default behavior for navigation keys when modal is open
        if (['Escape', 'ArrowLeft', 'ArrowRight', ' ', 'Enter', 'Tab', 'L', 'C', 'S', 'M'].includes(e.key)) {
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
                navigateModal('prev');
                break;
            case 'ArrowRight':
                navigateModal('next');
                break;
            case ' ': // Spacebar
                if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                    toggleVideoPlayback();
                }
                break;
            case 'Enter':
                if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                    focusCommentInput();
                }
                break;
            case 'Tab':
                // Trap focus within modal when it's open
                trapFocusInModal(e);
                break;
            case 'L':
                if (!e.ctrlKey && !e.metaKey && !e.altKey && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                    // Like/unlike post shortcut
                    toggleLike();
                }
                break;
            case 'C':
                if (!e.ctrlKey && !e.metaKey && !e.altKey && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                    // Focus comment input shortcut
                    focusCommentInput();
                }
                break;
            case 'S':
                if (!e.ctrlKey && !e.metaKey && !e.altKey && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                    // Save post shortcut
                    toggleSave();
                }
                break;
            case 'M':
                if (!e.ctrlKey && !e.metaKey && !e.altKey && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                    // Mute/unmute video shortcut
                    toggleMute();
                }
                break;
        }
    });
    
    // Add keyboard shortcut info to modal
    const shortcutsInfo = document.createElement('div');
    shortcutsInfo.className = 'explore-modal-shortcuts-info';
    shortcutsInfo.innerHTML = `
        <button class="explore-modal-shortcuts-toggle" aria-label="Show keyboard shortcuts">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" stroke-width="2"/>
                <path d="M7 10H7.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M11 10H11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M15 10H15.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M7 14H7.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M11 14H11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M15 14H15.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
        </button>
        <div class="explore-modal-shortcuts-panel" hidden>
            <h3>Keyboard Shortcuts</h3>
            <ul>
                <li><kbd>←</kbd> Previous media</li>
                <li><kbd>→</kbd> Next media</li>
                <li><kbd>Space</kbd> Play/pause video</li>
                <li><kbd>Enter</kbd> Focus comment input</li>
                <li><kbd>L</kbd> Like/unlike post</li>
                <li><kbd>C</kbd> Focus comment input</li>
                <li><kbd>S</kbd> Save post</li>
                <li><kbd>M</kbd> Mute/unmute video</li>
                <li><kbd>Esc</kbd> Close modal</li>
            </ul>
        </div>
    `;
    modal.appendChild(shortcutsInfo);
    
    // Toggle shortcuts panel visibility
    const shortcutsToggle = shortcutsInfo.querySelector('.explore-modal-shortcuts-toggle');
    const shortcutsPanel = shortcutsInfo.querySelector('.explore-modal-shortcuts-panel');
    
    shortcutsToggle.addEventListener('click', () => {
        const isHidden = shortcutsPanel.hidden;
        shortcutsPanel.hidden = !isHidden;
        shortcutsToggle.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
        shortcutsToggle.setAttribute('aria-label', isHidden ? 'Hide keyboard shortcuts' : 'Show keyboard shortcuts');
    });
    
    // Initialize swipe gestures for mobile
    initializeSwipeGestures(modal);
    
    // Initialize comment form
    initializeCommentForm();
    
    // Add ARIA attributes for accessibility
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'modal-title');
    
    // Add skip link for keyboard users
    addModalSkipLink(modal);
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
                navigateModal('prev');
            } else {
                // Swipe left - next item
                navigateModal('next');
            }
        }
    }
}

/**
 * Open post modal - public function that can be called from other scripts
 * @param {Object} post - Post data
 */
function openPostModal(post) {
    openEnhancedModal(post);
}

// Make openPostModal available globally
window.openPostModal = openPostModal;

/**
 * Open enhanced post modal with post data
 * @param {Object} post - Post data
 */
function openEnhancedModal(post) {
    const modal = document.getElementById('explore-modal');
    if (!modal) return;
    
    // Store post ID in modal dataset for navigation
    modal.dataset.currentPostId = post._id;
    
    // Ensure navigation arrows are visible
    const modalMediaContainer = modal.querySelector('.explore-modal-media');
    if (modalMediaContainer) {
        // Check if arrows already exist
        if (!modalMediaContainer.querySelector('.modal-nav-arrow.prev')) {
            // Create previous arrow button
            const prevArrow = document.createElement('button');
            prevArrow.className = 'modal-nav-arrow prev';
            prevArrow.setAttribute('aria-label', 'Previous post');
            prevArrow.innerHTML = '←';
            prevArrow.addEventListener('click', () => navigateModal('prev'));
            modalMediaContainer.appendChild(prevArrow);
        }
        
        if (!modalMediaContainer.querySelector('.modal-nav-arrow.next')) {
            // Create next arrow button
            const nextArrow = document.createElement('button');
            nextArrow.className = 'modal-nav-arrow next';
            nextArrow.setAttribute('aria-label', 'Next post');
            nextArrow.innerHTML = '→';
            nextArrow.addEventListener('click', () => navigateModal('next'));
            modalMediaContainer.appendChild(nextArrow);
        }
    }
    
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
    const relatedContainer = modal.querySelector('.explore-modal-related-grid');
    
    // Clear previous content
    if (mediaContainer) mediaContainer.innerHTML = '';
    if (comments) comments.innerHTML = '';
    if (relatedContainer) relatedContainer.innerHTML = '';
    
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
            userAvatar.innerHTML = `<img src="${post.user.avatar}" alt="${post.user.name}" style="object-fit: cover; width: 100%; height: 100%;">`;
            userAvatar.addEventListener('click', () => {
                window.location.href = `/profile/${post.user._id}`;
            });
            
            // Add verified badge if user is verified
            if (post.user.verified) {
                userAvatar.innerHTML += `<div class="explore-modal-verified"><i class="fas fa-check"></i></div>`;
            }
        } else {
            const avatarLetter = post.user && post.user.name ? post.user.name.charAt(0).toUpperCase() : 'U';
            userAvatar.innerHTML = avatarLetter;
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
                
                // Add keyboard support
                dot.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        updateModalMedia(mediaContainer, post.media[index], post.caption);
                        updateCarouselDots(dotsContainer, index);
                    }
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
            video.autoplay = true;
            video.muted = true; // Auto-play requires muted
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
            img.addEventListener('click', toggleImageZoom);
            
            mediaContainer.appendChild(img);
        }
        
        // Add navigation arrows if multiple media items
        if (post.media.length > 1) {
            // Create proper button elements for navigation
            const prevMediaButton = document.createElement('button');
            prevButton.className = 'explore-modal-nav prev';
            prevButton.setAttribute('aria-label', 'Previous media');
            prevButton.setAttribute('type', 'button');
            prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
            
            const nextButton = document.createElement('button');
            nextButton.className = 'explore-modal-nav next';
            nextButton.setAttribute('aria-label', 'Next media');
            nextButton.setAttribute('type', 'button');
            nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
            
            mediaContainer.appendChild(prevButton);
            mediaContainer.appendChild(nextButton);
            
            // Add navigation functionality
            let currentMediaIndex = 0;
            const prevButton = mediaContainer.querySelector('.prev');
            const nextMediaButton = mediaContainer.querySelector('.next');
            const dotsContainer = mediaContainer.querySelector('.explore-modal-carousel-dots');
            
            if (prevButton) {
                // Add click event listener
                prevButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    currentMediaIndex = (currentMediaIndex - 1 + post.media.length) % post.media.length;
                    updateModalMedia(mediaContainer, post.media[currentMediaIndex], post.caption);
                    updateCarouselDots(dotsContainer, currentMediaIndex);
                });
                
                // Add keyboard support
                prevButton.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        currentMediaIndex = (currentMediaIndex - 1 + post.media.length) % post.media.length;
                        updateModalMedia(mediaContainer, post.media[currentMediaIndex], post.caption);
                        updateCarouselDots(dotsContainer, currentMediaIndex);
                    }
                });
            }
            
            if (nextButton) {
                // Add click event listener
                nextButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    currentMediaIndex = (currentMediaIndex + 1) % post.media.length;
                    updateModalMedia(mediaContainer, post.media[currentMediaIndex], post.caption);
                    updateCarouselDots(dotsContainer, currentMediaIndex);
                });
                
                // Add keyboard support
                nextButton.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        currentMediaIndex = (currentMediaIndex + 1) % post.media.length;
                        updateModalMedia(mediaContainer, post.media[currentMediaIndex], post.caption);
                        updateCarouselDots(dotsContainer, currentMediaIndex);
                    }
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
            ${formatTextWithLinks(post.caption)}
        `;
    } else if (caption) {
        caption.innerHTML = '';
    }
    
    // Set comments
    if (comments && post.comments && post.comments.length > 0) {
        // Sort comments by date (newest first)
        const sortedComments = [...post.comments].sort((a, b) => {
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
        
        sortedComments.forEach(comment => {
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
                    <span class="explore-modal-comment-text">${formatTextWithLinks(comment.text)}</span>
                    <div class="explore-modal-comment-time">${timeAgo}</div>
                </div>
            `;
            
            comments.appendChild(commentElement);
            
            // Add replies if any
            if (comment.replies && comment.replies.length > 0) {
                const threadContainer = document.createElement('div');
                threadContainer.className = 'explore-modal-comment-thread';
                
                comment.replies.forEach(reply => {
                    const replyElement = document.createElement('div');
                    replyElement.className = 'explore-modal-comment';
                    
                    const replyDate = new Date(reply.createdAt);
                    const replyTimeAgo = formatTimeAgo(replyDate);
                    
                    const replyAvatarLetter = reply.user && reply.user.name ? reply.user.name.charAt(0).toUpperCase() : 'U';
                    const replyAvatarHTML = reply.user && reply.user.avatar 
                        ? `<img src="${reply.user.avatar}" alt="${reply.user.name}">` 
                        : replyAvatarLetter;
                    
                    replyElement.innerHTML = `
                        <div class="explore-modal-comment-avatar">${replyAvatarHTML}</div>
                        <div class="explore-modal-comment-content">
                            <span class="explore-modal-comment-username">${reply.user ? reply.user.name : 'Unknown User'}</span>
                            <span class="explore-modal-comment-text">${formatTextWithLinks(reply.text)}</span>
                            <div class="explore-modal-comment-time">${replyTimeAgo}</div>
                        </div>
                    `;
                    
                    threadContainer.appendChild(replyElement);
                });
                
                comments.appendChild(threadContainer);
            }
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
        
        // Add full date on hover
        time.title = postDate.toLocaleString();
    }
    
    // Create a container for all related content sections if it doesn't exist
    let relatedContentContainer = modal.querySelector('.explore-modal-related-content-container');
    if (!relatedContentContainer) {
        relatedContentContainer = document.createElement('div');
        relatedContentContainer.className = 'explore-modal-related-content-container';
        
        // Find the parent element to append the container to
        const modalContent = modal.querySelector('.explore-modal-content');
        if (modalContent) {
            modalContent.appendChild(relatedContentContainer);
        }
    } else {
        // Clear existing content
        relatedContentContainer.innerHTML = '';
    }
    
    // Add related posts if available
    if (relatedContainer && post.relatedPosts) {
        post.relatedPosts.forEach(relatedPost => {
            if (relatedPost.media && relatedPost.media.length > 0) {
                const relatedItem = document.createElement('div');
                relatedItem.className = 'explore-modal-related-item';
                
                const mediaUrl = relatedPost.media[0].url;
                relatedItem.innerHTML = `<img src="${mediaUrl}" alt="Related post">`;
                
                relatedItem.addEventListener('click', () => {
                    // Fetch full post data and open modal
                    fetchPostDetails(relatedPost._id);
                });
                
                relatedContainer.appendChild(relatedItem);
            }
        });
    } else if (relatedContainer) {
        // If no related posts provided, fetch some based on tags or user
        fetchRelatedPosts(post._id, post.user ? post.user._id : null);
    }
    
    // Initialize like button functionality
    initializeLikeButton(post);
    
    // Show modal
    modal.style.display = 'flex';
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
}

/**
 * Add custom video controls to video element
 * @param {HTMLElement} container - Container element
 * @param {HTMLVideoElement} video - Video element
 */
function addCustomVideoControls(container, video) {
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'explore-modal-video-controls';
    
    // Create play/pause button
    const playButton = document.createElement('button');
    playButton.className = 'explore-modal-video-play';
    playButton.innerHTML = video.paused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
    playButton.setAttribute('aria-label', video.paused ? 'Play video' : 'Pause video');
    playButton.setAttribute('type', 'button');
    
    // Create progress bar
    const progressContainer = document.createElement('div');
    progressContainer.className = 'explore-modal-video-progress';
    progressContainer.setAttribute('role', 'slider');
    progressContainer.setAttribute('aria-label', 'Video progress');
    progressContainer.setAttribute('aria-valuemin', '0');
    progressContainer.setAttribute('aria-valuemax', '100');
    progressContainer.setAttribute('aria-valuenow', '0');
    progressContainer.setAttribute('tabindex', '0');
    
    const progressBar = document.createElement('div');
    progressBar.className = 'explore-modal-video-progress-bar';
    progressContainer.appendChild(progressBar);
    
    // Create time display
    const timeDisplay = document.createElement('div');
    timeDisplay.className = 'explore-modal-video-time';
    timeDisplay.textContent = '0:00 / 0:00';
    
    // Create volume button
    const volumeButton = document.createElement('button');
    volumeButton.className = 'explore-modal-video-volume';
    volumeButton.innerHTML = video.muted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
    volumeButton.setAttribute('aria-label', video.muted ? 'Unmute video' : 'Mute video');
    volumeButton.setAttribute('aria-pressed', video.muted ? 'true' : 'false');
    volumeButton.setAttribute('type', 'button');
    
    // Create fullscreen button
    const fullscreenButton = document.createElement('button');
    fullscreenButton.className = 'explore-modal-video-fullscreen';
    fullscreenButton.innerHTML = '<i class="fas fa-expand"></i>';
    fullscreenButton.setAttribute('aria-label', 'Toggle fullscreen');
    fullscreenButton.setAttribute('type', 'button');
    
    // Add all elements to controls container
    controlsContainer.appendChild(playButton);
    controlsContainer.appendChild(progressContainer);
    controlsContainer.appendChild(timeDisplay);
    controlsContainer.appendChild(volumeButton);
    controlsContainer.appendChild(fullscreenButton);
    
    // Add controls to container
    container.appendChild(controlsContainer);
    
    // Add event listeners
    playButton.addEventListener('click', () => {
        if (video.paused) {
            video.play();
            playButton.innerHTML = '<i class="fas fa-pause"></i>';
            playButton.setAttribute('aria-label', 'Pause video');
        } else {
            video.pause();
            playButton.innerHTML = '<i class="fas fa-play"></i>';
            playButton.setAttribute('aria-label', 'Play video');
        }
    });
    
    // Update progress bar as video plays
    video.addEventListener('timeupdate', () => {
        const progress = (video.currentTime / video.duration) * 100;
        progressBar.style.width = `${progress}%`;
        
        // Update ARIA attributes for accessibility
        progressContainer.setAttribute('aria-valuenow', Math.round(progress));
        
        // Update time display
        const currentTime = formatVideoTime(video.currentTime);
        const duration = formatVideoTime(video.duration);
        timeDisplay.textContent = `${currentTime} / ${duration}`;
    });
    
    // Allow seeking by clicking on progress bar
    progressContainer.addEventListener('click', (e) => {
        const rect = progressContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        video.currentTime = pos * video.duration;
    });
    
    // Add keyboard support for progress bar
    progressContainer.addEventListener('keydown', (e) => {
        // Left/right arrow keys to seek backward/forward
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            const seekAmount = e.key === 'ArrowLeft' ? -5 : 5; // 5 seconds
            video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seekAmount));
        }
        // Home/End keys to seek to beginning/end
        else if (e.key === 'Home' || e.key === 'End') {
            e.preventDefault();
            video.currentTime = e.key === 'Home' ? 0 : video.duration;
        }
    });
    
    // Toggle mute on volume button click
    volumeButton.addEventListener('click', () => {
        video.muted = !video.muted;
        volumeButton.innerHTML = video.muted ? 
            '<i class="fas fa-volume-mute"></i>' : 
            '<i class="fas fa-volume-up"></i>';
        volumeButton.setAttribute('aria-label', video.muted ? 'Unmute video' : 'Mute video');
        volumeButton.setAttribute('aria-pressed', video.muted ? 'true' : 'false');
    });
    
    // Toggle fullscreen on fullscreen button click
    fullscreenButton.addEventListener('click', () => {
        if (video.requestFullscreen) {
            video.requestFullscreen();
        } else if (video.webkitRequestFullscreen) {
            video.webkitRequestFullscreen();
        } else if (video.msRequestFullscreen) {
            video.msRequestFullscreen();
        }
    });
    
    // Update play button when video ends
    video.addEventListener('ended', () => {
        playButton.innerHTML = '<i class="fas fa-play"></i>';
    });
}

/**
 * Format video time in MM:SS format
 * @param {Number} seconds - Time in seconds
 * @returns {String} - Formatted time string
 */
function formatVideoTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Toggle image zoom on click
 * @param {Event} e - Click event
 */
function toggleImageZoom(e) {
    const img = e.target;
    if (img.classList.contains('zoomed')) {
        img.classList.remove('zoomed');
        img.style.transform = 'scale(1)';
        img.style.cursor = 'zoom-in';
    } else {
        img.classList.add('zoomed');
        img.style.transform = 'scale(1.5)';
        img.style.cursor = 'zoom-out';
    }
}

/**
 * Update carousel dots to show active item
 * @param {HTMLElement} dotsContainer - Container for carousel dots
 * @param {Number} activeIndex - Index of active item
 */
/**
 * Update carousel dots to reflect active media
 * @param {HTMLElement} dotsContainer - Container for carousel dots
 * @param {Number} activeIndex - Index of active media item
 */
function updateCarouselDots(dotsContainer, activeIndex) {
    if (!dotsContainer) return;
    
    const dots = dotsContainer.querySelectorAll('.explore-modal-carousel-dot');
    dots.forEach((dot, index) => {
        // Update visual state
        if (index === activeIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
        
        // Update ARIA attributes for accessibility
        dot.setAttribute('aria-selected', index === activeIndex ? 'true' : 'false');
        dot.setAttribute('tabindex', index === activeIndex ? '0' : '-1');
    });
    
    // Announce to screen readers which media is now active
    const liveRegion = document.querySelector('.explore-modal-live-region');
    if (liveRegion) {
        liveRegion.textContent = `Showing media ${activeIndex + 1} of ${dots.length}`;
    }
}

/**
 * Update modal media content
 * @param {HTMLElement} container - Media container element
 * @param {Object} media - Media object
 * @param {String} caption - Post caption
 */
function updateModalMedia(container, media, caption) {
    // Store navigation elements
    const prevButton = container.querySelector('.prev');
    const nextButton = container.querySelector('.next');
    const dotsContainer = container.querySelector('.explore-modal-carousel-dots');
    
    // Remove existing media but keep navigation elements
    const mediaElements = container.querySelectorAll('img, video, .explore-modal-text-only, .explore-modal-video-controls');
    mediaElements.forEach(el => el.remove());
    
    // Add new media
    if (media.type === 'video') {
        const video = document.createElement('video');
        video.src = media.url;
        video.controls = true;
        video.autoplay = true;
        video.muted = true;
        video.addEventListener('click', () => {
            if (video.paused) {
                video.play();
            } else {
                video.pause();
            }
        });
        
        container.insertBefore(video, prevButton || dotsContainer || null);
        
        // Add custom video controls
        addCustomVideoControls(container, video);
    } else {
        const imgWrapper = document.createElement('div');
        imgWrapper.className = 'modal-image-wrapper';

        const img = document.createElement('img');
        img.src = media.url;
        img.alt = caption || 'Post image';
        img.style.cursor = 'zoom-in'; // Set initial cursor
        img.addEventListener('click', toggleImageZoom);
        
        imgWrapper.appendChild(img);
        container.insertBefore(imgWrapper, prevButton || dotsContainer || null);
    }
}

/**
 * Initialize like button functionality
 * @param {Object} post - Post data
 */
function initializeLikeButton(post) {
    const modal = document.getElementById('explore-modal');
    if (!modal) return;
    
    const likeButton = modal.querySelector('.explore-modal-action-button:first-child');
    const likesCount = modal.querySelector('.explore-modal-likes');
    
    if (!likeButton || !likesCount) return;
    
    // Add heart class for styling
    likeButton.classList.add('heart');
    
    // Clear previous event listeners by cloning and replacing the button
    const newLikeButton = likeButton.cloneNode(true);
    likeButton.parentNode.replaceChild(newLikeButton, likeButton);
    
    // Check if user has already liked the post
    const currentUser = getCurrentUser();
    const isLiked = currentUser && post.likes && post.likes.includes(currentUser._id);
    
    // Set initial state
    if (isLiked) {
        newLikeButton.classList.add('active');
        newLikeButton.innerHTML = '<i class="fas fa-heart"></i>';
    } else {
        newLikeButton.classList.remove('active');
        newLikeButton.innerHTML = '<i class="far fa-heart"></i>';
    }
    
    // Add click event
    newLikeButton.addEventListener('click', () => {
        if (!currentUser) {
            // Redirect to login if not logged in
            window.location.href = '/login';
            return;
        }
        
        // Disable button during API call to prevent multiple clicks
        newLikeButton.disabled = true;
        
        const isNowLiked = newLikeButton.classList.contains('active');
        const likesCountValue = parseInt(likesCount.textContent);
        
        if (isNowLiked) {
            // Unlike post
            unlikePost(post._id)
                .then(data => {
                    newLikeButton.classList.remove('active');
                    newLikeButton.innerHTML = '<i class="far fa-heart"></i>';
                    likesCount.textContent = `${data.likes.length} ${data.likes.length === 1 ? 'like' : 'likes'}`;
                })
                .catch(error => {
                    console.error('Error unliking post:', error);
                })
                .finally(() => {
                    newLikeButton.disabled = false;
                });
        } else {
            // Like post
            likePost(post._id)
                .then(data => {
                    newLikeButton.classList.add('active');
                    newLikeButton.innerHTML = '<i class="fas fa-heart"></i>';
                    newLikeButton.classList.add('heart-animation');
                    likesCount.textContent = `${data.likes.length} ${data.likes.length === 1 ? 'like' : 'likes'}`;
                    
                    // Remove animation class after animation completes
                    setTimeout(() => {
                        newLikeButton.classList.remove('heart-animation');
                    }, 800);
                })
                .catch(error => {
                    console.error('Error liking post:', error);
                })
                .finally(() => {
                    newLikeButton.disabled = false;
                });
        }
    });
}

/**
 * Get current user information
 * @returns {Object|null} - Current user object or null if not logged in
 */
function getCurrentUser() {
    // This function should be implemented based on your authentication system
    // In a real application, this would fetch from a session or local storage
    
    // Check if window.mockAPI exists and has currentUser defined
    if (window.mockAPI && window.mockAPI.currentUser) {
        return window.mockAPI.currentUser;
    }
    
    // Fallback to window.currentUser or return null
    return window.currentUser || null;
}

/**
 * Like a post via API
 * @param {String} postId - Post ID
 * @returns {Promise} - Promise that resolves when the like is processed
 */
function likePost(postId) {
    if (!postId) return Promise.reject(new Error('No post ID provided'));
    
    return fetch(`/api/v2/posts/${postId}/like`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to like post');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Update current post data if it matches
            if (currentPost && currentPost._id === postId) {
                currentPost.likes = data.likes;
                currentPost.liked = true;
            }
            return data;
        } else {
            throw new Error(data.message || 'Failed to like post');
        }
    })
    .catch(error => {
        console.error('Error liking post:', error);
        throw error;
    });
}

/**
 * Unlike a post via API
 * @param {String} postId - Post ID
 * @returns {Promise} - Promise that resolves when the unlike is processed
 */
function unlikePost(postId) {
    if (!postId) return Promise.reject(new Error('No post ID provided'));
    
    return fetch(`/api/v2/posts/${postId}/unlike`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to unlike post');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Update current post data if it matches
            if (currentPost && currentPost._id === postId) {
                currentPost.likes = data.likes;
                currentPost.liked = false;
            }
            return data;
        } else {
            throw new Error(data.message || 'Failed to unlike post');
        }
    })
    .catch(error => {
        console.error('Error unliking post:', error);
        throw error;
    });
}

/**
 * Fetch related posts for a post
 * @param {String} postId - Post ID
 * @param {String} userId - User ID
 */
function fetchRelatedPosts(postId, userId) {
    const relatedContainer = document.querySelector('.explore-modal-related-grid');
    if (!relatedContainer) return;
    
    // Show loading state
    relatedContainer.innerHTML = '<div class="explore-modal-loading">Loading related posts...</div>';
    
    // Mock API endpoint for testing
    const mockEndpoint = `/api/mock/posts/related?postId=${postId}`;
    
    // Create a parent container for all related content sections if it doesn't exist
    let relatedContentContainer = document.querySelector('.explore-modal-related-content-container');
    if (!relatedContentContainer) {
        relatedContentContainer = document.createElement('div');
        relatedContentContainer.className = 'explore-modal-related-content-container';
        
        // Find the parent element to append the container to
        const modalContent = document.querySelector('.explore-modal-content');
        if (modalContent) {
            modalContent.appendChild(relatedContentContainer);
        }
    }
    
    // Fetch from mock API endpoint
    fetch(mockEndpoint)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch related posts');
            }
            return response.json();
        })
        .then(data => {
            relatedContainer.innerHTML = '';
            
            if (data && data.posts && data.posts.length > 0) {
                // Add related posts to grid (limit to 4 for 2x2 grid)
                const relatedPosts = data.posts.slice(0, 4);
                relatedPosts.forEach(relatedPost => {
                    if (relatedPost.media && relatedPost.media.length > 0) {
                        const relatedItem = document.createElement('div');
                        relatedItem.className = 'explore-modal-related-item';
                        
                        const mediaUrl = relatedPost.media[0].url;
                        const mediaType = relatedPost.media[0].type || 'image';
                        
                        // Create thumbnail with overlay
                        let thumbnailHTML = '';
                        if (mediaType === 'video') {
                            thumbnailHTML = `
                                <div class="explore-modal-related-thumbnail">
                                    <img src="${relatedPost.media[0].thumbnail || mediaUrl}" alt="Related post">
                                    <div class="explore-modal-related-overlay">
                                        <i class="fas fa-play"></i>
                                    </div>
                                </div>
                            `;
                        } else {
                            thumbnailHTML = `
                                <div class="explore-modal-related-thumbnail">
                                    <img src="${mediaUrl}" alt="Related post">
                                    <div class="explore-modal-related-overlay">
                                        <i class="fas fa-image"></i>
                                    </div>
                                </div>
                            `;
                        }
                        
                        relatedItem.innerHTML = thumbnailHTML;
                        
                        relatedItem.addEventListener('click', () => {
                            // Fetch full post data and open modal
                            fetchPostDetails(relatedPost._id);
                        });
                        
                        relatedContainer.appendChild(relatedItem);
                    }
                });
                
                // If we have a user ID, fetch and display user's other posts
                if (userId) {
                    fetchUserOtherPosts(userId, postId, relatedContentContainer);
                }
                
                // Add trending tags section
                fetchTrendingTags(relatedContentContainer);
            } else {
                relatedContainer.innerHTML = '<div class="explore-modal-no-related">No related posts found</div>';
            }
        })
        .catch(error => {
            console.error('Error fetching related posts:', error);
            relatedContainer.innerHTML = '<div class="explore-modal-error">Error loading related posts</div>';
        });
}

/**
 * Fetch user's other posts
 * @param {String} userId - User ID
 * @param {String} currentPostId - Current post ID to exclude
 * @param {HTMLElement} relatedContentContainer - Container for related content
 */
function fetchUserOtherPosts(userId, currentPostId, relatedContentContainer) {
    if (!userId) return;
    
    // In a real app, this would fetch from an API
    // For now, use mock data or assume window.mockAPI exists
    const userPosts = window.mockAPI && window.mockAPI.posts ? 
        window.mockAPI.posts.filter(post => 
            post.user._id === userId && post._id !== currentPostId
        ).slice(0, 10) : [];
    
    if (userPosts.length > 0) {
        const modal = document.getElementById('explore-modal');
        if (!modal) return;
        
        // Create section for user's other posts if it doesn't exist
        let userPostsSection = modal.querySelector('.explore-modal-user-posts-section');
        if (!userPostsSection) {
            userPostsSection = document.createElement('div');
            userPostsSection.className = 'explore-modal-user-posts-section';
            
            // Append to the related content container if provided
            if (relatedContentContainer) {
                relatedContentContainer.appendChild(userPostsSection);
            } else {
                modal.querySelector('.explore-modal-content').appendChild(userPostsSection);
            }
            
            // Create section title
            const sectionTitle = document.createElement('h3');
            sectionTitle.className = 'explore-modal-section-title';
            sectionTitle.textContent = 'More from this user';
            userPostsSection.appendChild(sectionTitle);
            
            // Create horizontal scrollable container
            const scrollContainer = document.createElement('div');
            scrollContainer.className = 'explore-modal-user-posts-scroll';
            userPostsSection.appendChild(scrollContainer);
            
            // Add user posts to horizontal scroll
            userPosts.forEach(post => {
                if (post.media && post.media.length > 0) {
                    const postItem = document.createElement('div');
                    postItem.className = 'explore-modal-user-post-item';
                    
                    const mediaUrl = post.media[0].type === 'video' ? 
                        (post.media[0].thumbnail || post.media[0].url) : 
                        post.media[0].url;
                    
                    postItem.innerHTML = `<img src="${mediaUrl}" alt="User post">`;
                    
                    postItem.addEventListener('click', () => {
                        // Fetch full post data and open modal
                        fetchPostDetails(post._id);
                    });
                    
                    scrollContainer.appendChild(postItem);
                }
            });
            
            // Add view all link
            const viewAllLink = document.createElement('a');
            viewAllLink.className = 'explore-modal-view-all';
            viewAllLink.textContent = 'View Profile';
            viewAllLink.href = `/profile/${userId}`;
            viewAllLink.addEventListener('click', (e) => {
                // Close modal when clicking view all
                closeModal();
            });
            
            userPostsSection.appendChild(viewAllLink);
        } else if (relatedContentContainer && !relatedContentContainer.contains(userPostsSection)) {
            // Move the section to the new container if needed
            relatedContentContainer.appendChild(userPostsSection);
        }
    }
}

/**
 * Fetch trending tags
 * @param {HTMLElement} relatedContentContainer - Container for related content
 */
function fetchTrendingTags(relatedContentContainer) {
    const modal = document.getElementById('explore-modal');
    if (!modal) return;
    
    // In a real app, this would fetch from an API
    // For now, use mock data
    const mockTrendingTags = [
        { tag: 'technology', count: 1243 },
        { tag: 'startup', count: 982 },
        { tag: 'entrepreneurship', count: 756 },
        { tag: 'funding', count: 621 },
        { tag: 'innovation', count: 543 },
        { tag: 'networking', count: 432 },
        { tag: 'business', count: 321 },
        { tag: 'venture', count: 287 }
    ];
    
    // Create trending tags section if it doesn't exist
    let tagsSection = modal.querySelector('.explore-modal-tags-section');
    if (!tagsSection) {
        tagsSection = document.createElement('div');
        tagsSection.className = 'explore-modal-tags-section';
        
        // Append to the related content container if provided
        if (relatedContentContainer) {
            relatedContentContainer.appendChild(tagsSection);
        } else {
            modal.querySelector('.explore-modal-content').appendChild(tagsSection);
        }
        
        // Create section title
        const sectionTitle = document.createElement('h3');
        sectionTitle.className = 'explore-modal-section-title';
        sectionTitle.textContent = 'Trending Tags';
        tagsSection.appendChild(sectionTitle);
        
        // Create tags container
        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'explore-modal-tags-container';
        
        // Add tags
        mockTrendingTags.forEach(tagData => {
            const tagElement = document.createElement('a');
            tagElement.className = 'explore-modal-tag';
            tagElement.href = '#';
            tagElement.innerHTML = `
                <span class="explore-modal-tag-name">#${tagData.tag}</span>
                <span class="explore-modal-tag-count">${formatCount(tagData.count)} posts</span>
            `;
            
            tagElement.addEventListener('click', (e) => {
                e.preventDefault();
                // Close modal
                closeModal();
                // Filter explore grid by tag
                if (typeof filterExploreGrid === 'function') {
                    filterExploreGrid('tag', tagData.tag);
                } else {
                    // Fallback - redirect to explore page with tag filter
                    window.location.href = `/explore?tag=${tagData.tag}`;
                }
            });
            
            tagsContainer.appendChild(tagElement);
        });
        
        tagsSection.appendChild(tagsContainer);
    } else if (relatedContentContainer && !relatedContentContainer.contains(tagsSection)) {
        // Move the section to the new container if needed
        relatedContentContainer.appendChild(tagsSection);
    }
}

/**
 * Format count for display (e.g. 1.2K)
 * @param {Number} count - Count to format
 * @returns {String} - Formatted count
 */
function formatCount(count) {
    if (count < 1000) return count;
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
    return `${(count / 1000000).toFixed(1)}M`;
}

/**
 * Fetch post details by ID
 * @param {String} postId - Post ID
 */
function fetchPostDetails(postId) {
    if (!postId) return;
    
    // Show loading state in modal
    const modal = document.getElementById('explore-modal');
    if (modal) {
        modal.classList.add('loading');
        if (!modal.classList.contains('active')) {
            modal.classList.add('active');
            document.body.classList.add('modal-open');
        }
        
        const modalContent = modal.querySelector('.explore-modal-content');
        if (modalContent) {
            modalContent.innerHTML = '<div class="explore-modal-loading-spinner"></div>';
        }
    }
    
    // Fetch post details from API
    fetch(`/api/v2/posts/${postId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch post details');
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.post) {
                // Store current post globally
                currentPost = data.post;
                currentMediaIndex = 0;
                
                // Open modal with post data
                openEnhancedModal(data.post);
            } else {
                throw new Error('Invalid response format');
            }
        })
        .catch(error => {
            console.error('Error fetching post details:', error);
            if (modal) {
                const modalContent = modal.querySelector('.explore-modal-content');
                if (modalContent) {
                    modalContent.innerHTML = '<div class="explore-modal-error">Failed to load post</div>';
                }
                modal.classList.remove('loading');
            }
        });
}

/**
 * Navigate between posts in modal
 * @param {String} direction - Navigation direction ('prev' or 'next')
 */
function navigateModal(direction) {
    const modal = document.getElementById('explore-modal');
    if (!modal || !modal.classList.contains('active')) return;
    
    // Find the current post in the grid
    const currentPostId = modal.dataset.currentPostId;
    if (!currentPostId) return;
    
    const allPosts = document.querySelectorAll('.explore-card');
    let currentIndex = -1;
    
    // Find the index of the current post
    allPosts.forEach((post, index) => {
        if (post.dataset.postId === currentPostId) {
            currentIndex = index;
        }
    });
    
    if (currentIndex === -1) return;
    
    // Calculate the next/previous index
    let targetIndex;
    if (direction === 'prev') {
        targetIndex = (currentIndex - 1 + allPosts.length) % allPosts.length;
    } else {
        targetIndex = (currentIndex + 1) % allPosts.length;
    }
    
    // Get the target post ID
    const targetPostId = allPosts[targetIndex].dataset.postId;
    
    // Fetch and open the target post
    fetchPostDetails(targetPostId);
}

/**
 * Toggle video playback in modal
 */
function toggleVideoPlayback() {
    const modal = document.getElementById('explore-modal');
    if (!modal || !modal.classList.contains('active')) return;
    
    const video = modal.querySelector('video');
    if (!video) return;
    
    if (video.paused) {
        video.play();
    } else {
        video.pause();
    }
}

/**
 * Focus on comment input
 */
function focusCommentInput() {
    const modal = document.getElementById('explore-modal');
    if (!modal || !modal.classList.contains('active')) return;
    
    const commentInput = modal.querySelector('.explore-modal-add-comment input');
    if (commentInput) {
        commentInput.focus();
    }
}

/**
 * Initialize comment form functionality
 */
function initializeCommentForm() {
    const modal = document.getElementById('explore-modal');
    if (!modal) return;
    
    const commentForm = modal.querySelector('.explore-modal-add-comment');
    if (!commentForm) return;
    
    const commentInput = commentForm.querySelector('input');
    const submitButton = commentForm.querySelector('button');
    
    if (commentInput && submitButton) {
        // Add character counter
        const counterElement = document.createElement('div');
        counterElement.className = 'explore-modal-comment-counter';
        counterElement.textContent = '0/500';
        commentForm.appendChild(counterElement);
        
        // Update counter on input
        commentInput.addEventListener('input', () => {
            updateCommentCounter(commentInput);
        });
        
        // Submit comment on button click
        submitButton.addEventListener('click', () => {
            const postId = modal.dataset.currentPostId;
            const text = commentInput.value.trim();
            
            if (postId && text) {
                addComment(postId, text);
            }
        });
        
        // Submit on Enter key
        commentInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const postId = modal.dataset.currentPostId;
                const text = commentInput.value.trim();
                
                if (postId && text) {
                    addComment(postId, text);
                    e.preventDefault();
                }
            }
        });
    }
}

/**
 * Update comment character counter
 * @param {HTMLInputElement} input - Comment input element
 */
function updateCommentCounter(input) {
    const MAX_LENGTH = 500;
    const counterElement = document.querySelector('.explore-modal-comment-counter');
    
    if (counterElement) {
        const currentLength = input.value.length;
        counterElement.textContent = `${currentLength}/${MAX_LENGTH}`;
        
        if (currentLength > MAX_LENGTH) {
            counterElement.classList.add('over-limit');
            input.value = input.value.substring(0, MAX_LENGTH);
            counterElement.textContent = `${MAX_LENGTH}/${MAX_LENGTH}`;
        } else {
            counterElement.classList.remove('over-limit');
        }
    }
}

/**
 * Add a comment to a post
 * @param {String} postId - Post ID
 * @param {String} text - Comment text
 */
function addComment(postId, text) {
    if (!text.trim()) return;
    
    // Call API to add comment
    fetch(`/api/v2/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: text })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to add comment');
        }
        return response.json();
    })
    .then(data => {
        if (data.success && data.comment) {
            // Add new comment to UI
            const commentsContainer = document.querySelector('.explore-modal-comments');
            if (commentsContainer) {
                const commentElement = document.createElement('div');
                commentElement.className = 'explore-modal-comment';
                
                const currentUser = getCurrentUser();
                const avatarHTML = currentUser && currentUser.avatar 
                    ? `<img src="${currentUser.avatar}" alt="${currentUser.name}">` 
                    : currentUser.name.charAt(0).toUpperCase();
                
                commentElement.innerHTML = `
                    <div class="explore-modal-comment-avatar">${avatarHTML}</div>
                    <div class="explore-modal-comment-content">
                        <span class="explore-modal-comment-username">${currentUser.name}</span>
                        <span class="explore-modal-comment-text">${formatTextWithLinks(text)}</span>
                        <div class="explore-modal-comment-time">Just now</div>
                    </div>
                `;
                
                // Add to the beginning of the comments list
                if (commentsContainer.firstChild) {
                    commentsContainer.insertBefore(commentElement, commentsContainer.firstChild);
                } else {
                    commentsContainer.appendChild(commentElement);
                }
                
                // Clear input field
                const commentInput = document.querySelector('.explore-modal-add-comment input');
                if (commentInput) {
                    commentInput.value = '';
                    updateCommentCounter(commentInput);
                }
                
                // Remove 'no comments' message if present
                const noCommentsMsg = commentsContainer.querySelector('.explore-modal-no-comments');
                if (noCommentsMsg) {
                    noCommentsMsg.remove();
                }
            }
        }
    })
    .catch(error => {
        console.error('Error adding comment:', error);
    });
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
 * Format text with links, hashtags, and mentions
 * @param {String} text - Text to format
 * @returns {String} - Formatted HTML
 */
function formatTextWithLinks(text) {
    if (!text) return '';
    
    // Replace URLs with clickable links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    text = text.replace(urlRegex, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
    
    // Replace hashtags with clickable links
    const hashtagRegex = /#(\w+)/g;
    text = text.replace(hashtagRegex, (match, hashtag) => 
        `<a href="/explore?tag=${hashtag}" class="hashtag">#${hashtag}</a>`);
    
    // Replace mentions with clickable links
    const mentionRegex = /@(\w+)/g;
    text = text.replace(mentionRegex, (match, username) => 
        `<a href="/profile/${username}" class="mention">@${username}</a>`);
    
    return text;
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

/**
 * Focus the comment input field
 */
function focusCommentInput() {
    const commentInput = document.querySelector('.explore-modal-add-comment input');
    if (commentInput) {
        commentInput.focus();
    }
}

/**
 * Toggle like status for the current post
 */
function toggleLike() {
    if (!currentPost) return;
    
    const likeButton = document.querySelector('.explore-modal-like');
    if (!likeButton) return;
    
    if (currentPost.liked) {
        unlikePost(currentPost._id);
        likeButton.classList.remove('active');
        likeButton.setAttribute('aria-pressed', 'false');
        likeButton.setAttribute('aria-label', 'Like this post');
    } else {
        likePost(currentPost._id);
        likeButton.classList.add('active');
        likeButton.setAttribute('aria-pressed', 'true');
        likeButton.setAttribute('aria-label', 'Unlike this post');
    }
}

/**
 * Toggle save status for the current post
 */
function toggleSave() {
    if (!currentPost) return;
    
    const saveButton = document.querySelector('.explore-modal-save');
    if (!saveButton) return;
    
    // Toggle saved state
    currentPost.saved = !currentPost.saved;
    
    // Update UI
    if (currentPost.saved) {
        saveButton.classList.add('active');
        saveButton.setAttribute('aria-pressed', 'true');
        saveButton.setAttribute('aria-label', 'Unsave this post');
        // Show success message
        showToast('Post saved to your collection');
    } else {
        saveButton.classList.remove('active');
        saveButton.setAttribute('aria-pressed', 'false');
        saveButton.setAttribute('aria-label', 'Save this post');
        // Show success message
        showToast('Post removed from your collection');
    }
    
    // In a real app, you would make an API call here
    console.log(`Post ${currentPost.saved ? 'saved' : 'unsaved'}: ${currentPost._id}`);
}

/**
 * Toggle mute status for the current video
 */
function toggleMute() {
    const videoElement = document.querySelector('.explore-modal-media video');
    if (!videoElement) return;
    
    const muteButton = document.querySelector('.explore-modal-video-mute');
    
    videoElement.muted = !videoElement.muted;
    
    if (muteButton) {
        if (videoElement.muted) {
            muteButton.innerHTML = '<i class="fas fa-volume-mute"></i>';
            muteButton.setAttribute('aria-label', 'Unmute video');
        } else {
            muteButton.innerHTML = '<i class="fas fa-volume-up"></i>';
            muteButton.setAttribute('aria-label', 'Mute video');
        }
    }
}

/**
 * Show a toast notification
 * @param {String} message - Message to display
 */
function showToast(message) {
    // Check if a toast container exists, create one if not
    let toastContainer = document.querySelector('.explore-toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'explore-toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'explore-toast';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = message;
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

/**
 * Trap focus within the modal when it's open
 * @param {Event} e - Keyboard event
 */
function trapFocusInModal(e) {
    const modal = document.getElementById('explore-modal');
    if (!modal || !modal.classList.contains('active')) return;
    
    // Get all focusable elements in the modal
    const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    // If shift+tab pressed and focus is on first element, move to last element
    if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
    }
    // If tab pressed and focus is on last element, move to first element
    else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
    }
}

/**
 * Add a skip link to the modal for keyboard users
 * @param {HTMLElement} modal - The modal element
 */
function addModalSkipLink(modal) {
    if (!modal) return;
    
    // Check if skip link already exists
    if (modal.querySelector('.explore-modal-skip-link')) return;
    
    // Create skip link
    const skipLink = document.createElement('a');
    skipLink.className = 'explore-modal-skip-link';
    skipLink.textContent = 'Skip to content';
    skipLink.href = '#';
    skipLink.setAttribute('tabindex', '0');
    
    // Style the skip link (will be hidden until focused)
    skipLink.style.position = 'absolute';
    skipLink.style.top = '-9999px';
    skipLink.style.left = '-9999px';
    skipLink.style.padding = '10px';
    skipLink.style.background = 'var(--color-primary)';
    skipLink.style.color = 'white';
    skipLink.style.zIndex = '2000';
    skipLink.style.borderRadius = 'var(--radius-sm)';
    
    // Show skip link when focused
    skipLink.addEventListener('focus', () => {
        skipLink.style.top = '10px';
        skipLink.style.left = '10px';
    });
    
    // Hide skip link when blurred
    skipLink.addEventListener('blur', () => {
        skipLink.style.top = '-9999px';
        skipLink.style.left = '-9999px';
    });
    
    // Skip to main content when clicked
    skipLink.addEventListener('click', (e) => {
        e.preventDefault();
        const content = modal.querySelector('.explore-modal-content');
        if (content) {
            content.setAttribute('tabindex', '-1');
            content.focus();
        }
    });
    
    // Add skip link to modal
    modal.insertBefore(skipLink, modal.firstChild);
}