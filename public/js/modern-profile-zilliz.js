/**
 * Modern Profile Zilliz Integration
 * Extends modern-profile.js with Zilliz-based media and post functionality
 */

// Flag to determine whether to use Zilliz or MongoDB
const useZilliz = true;

/**
 * Create media using Zilliz
 */
function createMediaZilliz() {
    const titleInput = document.getElementById('media-title');
    const descriptionInput = document.getElementById('media-description');
    const companyInput = document.getElementById('media-company');
    const fundingInput = document.getElementById('media-funding');
    const membersInput = document.getElementById('media-members');
    
    // Validate required fields
    if (!titleInput.value || !descriptionInput.value) {
        showToast('Please provide a title and description', 'error');
        return;
    }
    
    // Prepare data with explicit string conversion
    const mediaData = {
        title: String(titleInput.value),
        description: String(descriptionInput.value),
        company: String(companyInput.value || ''),
        funding: String(fundingInput.value || ''),
        members: String(membersInput.value || '')
    };
    
    console.log('Sending media data to Zilliz API:', mediaData);
    
    // Show loading state
    const createButton = document.getElementById('create-media-btn');
    const originalText = createButton.textContent;
    createButton.disabled = true;
    createButton.textContent = 'Creating...';
    
    // Send data to Zilliz API endpoint
    fetch('/api/zilliz/media/create-media', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(mediaData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Reset form
            document.getElementById('media-form').reset();
            
            // Close modal
            const mediaModal = document.getElementById('media-modal');
            if (mediaModal) {
                const bootstrapModal = bootstrap.Modal.getInstance(mediaModal);
                if (bootstrapModal) {
                    bootstrapModal.hide();
                }
            }
            
            // Reload media
            loadMediaZilliz();
            
            // Show success message
            showToast('Media created successfully', 'success');
        } else {
            showToast(`Failed to create media: ${data.message}`, 'error');
        }
    })
    .catch(error => {
        console.error('Error creating media:', error);
        showToast('An error occurred while creating media', 'error');
    })
    .finally(() => {
        // Reset button state
        createButton.disabled = false;
        createButton.textContent = originalText;
    });
}

/**
 * Load media using Zilliz
 */
function loadMediaZilliz() {
    const mediaGrid = document.getElementById('media-grid');
    const mediaEmptyState = document.getElementById('media-empty-state');
    
    if (!mediaGrid) return;
    
    // Show loading state
    document.getElementById('loading').style.display = 'flex';
    mediaGrid.innerHTML = '';
    
    // Fetch media from Zilliz API
    fetch('/api/zilliz/media/user-media')
        .then(response => response.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            
            if (data.success && data.media && data.media.length > 0) {
                // Hide empty state
                if (mediaEmptyState) mediaEmptyState.style.display = 'none';
                
                // Sort media by creation date (newest first)
                const sortedMedia = data.media.sort((a, b) => {
                    return new Date(b.createdAt) - new Date(a.createdAt);
                });
                
                // Render media items
                sortedMedia.forEach(item => {
                    const mediaItem = document.createElement('div');
                    mediaItem.className = 'media-item';
                    mediaItem.dataset.id = item._id;
                    
                    const mediaContent = document.createElement('div');
                    mediaContent.className = 'media-content';
                    
                    // Create media preview
                    if (item.type === 'image') {
                        const img = document.createElement('img');
                        img.src = item.url;
                        img.alt = item.title;
                        mediaContent.appendChild(img);
                    } else if (item.type === 'video') {
                        const video = document.createElement('video');
                        video.src = item.url;
                        video.controls = true;
                        mediaContent.appendChild(video);
                    }
                    
                    // Create media info
                    const mediaInfo = document.createElement('div');
                    mediaInfo.className = 'media-info';
                    
                    const mediaTitle = document.createElement('h3');
                    mediaTitle.textContent = item.title;
                    mediaInfo.appendChild(mediaTitle);
                    
                    const mediaDescription = document.createElement('p');
                    mediaDescription.textContent = item.description;
                    mediaInfo.appendChild(mediaDescription);
                    
                    // Add company, funding, and members if available
                    if (item.company) {
                        const companyInfo = document.createElement('p');
                        companyInfo.className = 'company-info';
                        companyInfo.textContent = `Company: ${item.company}`;
                        mediaInfo.appendChild(companyInfo);
                    }
                    
                    if (item.funding) {
                        const fundingInfo = document.createElement('p');
                        fundingInfo.className = 'funding-info';
                        fundingInfo.textContent = `Funding: ${item.funding}`;
                        mediaInfo.appendChild(fundingInfo);
                    }
                    
                    if (item.members) {
                        const membersInfo = document.createElement('p');
                        membersInfo.className = 'members-info';
                        membersInfo.textContent = `Team: ${item.members}`;
                        mediaInfo.appendChild(membersInfo);
                    }
                    
                    // Create delete button
                    const deleteButton = document.createElement('button');
                    deleteButton.className = 'delete-media-btn';
                    deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
                    deleteButton.addEventListener('click', () => deleteMediaZilliz(item._id));
                    
                    // Assemble media item
                    mediaItem.appendChild(mediaContent);
                    mediaItem.appendChild(mediaInfo);
                    mediaItem.appendChild(deleteButton);
                    
                    // Add to grid
                    mediaGrid.appendChild(mediaItem);
                });
            } else {
                // Show empty state
                if (mediaEmptyState) mediaEmptyState.style.display = 'flex';
            }
        })
        .catch(error => {
            console.error('Error loading media:', error);
            document.getElementById('loading').style.display = 'none';
            showToast('Failed to load media', 'error');
        });
}

/**
 * Delete media using Zilliz
 * @param {string} mediaId - The ID of the media to delete
 */
function deleteMediaZilliz(mediaId) {
    if (!confirm('Are you sure you want to delete this media?')) return;
    
    fetch(`/api/zilliz/media/delete-media/${mediaId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Remove media item from DOM
            const mediaItem = document.querySelector(`.media-item[data-id="${mediaId}"]`);
            if (mediaItem) mediaItem.remove();
            
            // Check if there are any media items left
            const mediaGrid = document.getElementById('media-grid');
            const mediaEmptyState = document.getElementById('media-empty-state');
            
            if (mediaGrid && mediaGrid.children.length === 0 && mediaEmptyState) {
                mediaEmptyState.style.display = 'flex';
            }
            
            showToast('Media deleted successfully', 'success');
        } else {
            showToast(`Failed to delete media: ${data.message}`, 'error');
        }
    })
    .catch(error => {
        console.error('Error deleting media:', error);
        showToast('An error occurred while deleting media', 'error');
    });
}

/**
 * Create post using Zilliz
 * @param {Event} e - The form submission event
 */
function createPostZilliz(e) {
    e.preventDefault();
    const caption = document.getElementById('post-caption').value;
    const submitButton = document.getElementById('submit-post');
    const mediaFiles = window.postManager ? window.postManager.mediaFiles : [];
    
    if (!caption && mediaFiles.length === 0) {
        alert('Please add a caption or media to your post');
        return;
    }
    
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Posting...';
    }
    
    try {
        const formData = new FormData();
        formData.append('caption', caption);
        mediaFiles.forEach((file, index) => {
            formData.append('media', file);
        });
        
        fetch('/api/zilliz/posts/create', {
            method: 'POST',
            body: formData,
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Close modal if it exists
                if (window.postManager) {
                    window.postManager.closePostModal();
                }
                
                // Reload posts
                if (typeof loadPostsZilliz === 'function') {
                    loadPostsZilliz();
                } else {
                    window.location.reload();
                }
                
                showToast('Post created successfully', 'success');
            } else {
                alert(data.error || 'Failed to create post');
            }
        })
        .catch(error => {
            console.error('Error creating post:', error);
            alert('An error occurred. Please try again later.');
        })
        .finally(() => {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Post';
            }
        });
    } catch (error) {
        console.error('Error creating post:', error);
        alert('An error occurred. Please try again later.');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Post';
        }
    }
}

/**
 * Load posts using Zilliz
 */
function loadPostsZilliz() {
    const postsContainer = document.getElementById('posts-container');
    const postsEmptyState = document.getElementById('posts-empty-state');
    
    if (!postsContainer) return;

    document.getElementById('loading').style.display = 'flex';
    postsContainer.innerHTML = '';
    
    // Get user ID from the page
    const userId = document.getElementById('user-id')?.value;
    if (!userId) {
        console.error('User ID not found');
        document.getElementById('loading').style.display = 'none';
        return;
    }
    
    fetch(`/api/zilliz/posts/user/${userId}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            
            if (data.success && data.posts && data.posts.length > 0) {
                // Hide empty state
                if (postsEmptyState) postsEmptyState.style.display = 'none';
                
                // Render posts
                data.posts.forEach(post => {
                    const postElement = createPostElement(post);
                    postsContainer.appendChild(postElement);
                });
            } else {
                // Show empty state
                if (postsEmptyState) postsEmptyState.style.display = 'flex';
            }
        })
        .catch(error => {
            console.error('Error loading posts:', error);
            document.getElementById('loading').style.display = 'none';
            showToast('Failed to load posts', 'error');
        });
}

/**
 * Create a post element from post data
 * @param {Object} post - The post data
 * @returns {HTMLElement} - The post element
 */
function createPostElement(post) {
    const postElement = document.createElement('div');
    postElement.className = 'post-card';
    postElement.dataset.id = post.id;
    
    // Create post header
    const postHeader = document.createElement('div');
    postHeader.className = 'post-header';
    
    const userAvatar = document.createElement('img');
    userAvatar.src = post.user.avatar || '/images/default-avatar.png';
    userAvatar.alt = post.user.name;
    userAvatar.className = 'post-avatar';
    
    const userInfo = document.createElement('div');
    userInfo.className = 'post-user-info';
    
    const userName = document.createElement('h3');
    userName.textContent = post.user.name;
    
    const userTitle = document.createElement('p');
    userTitle.textContent = post.user.title || 'User';
    
    const postDate = document.createElement('span');
    postDate.className = 'post-date';
    postDate.textContent = new Date(post.createdAt).toLocaleDateString();
    
    userInfo.appendChild(userName);
    userInfo.appendChild(userTitle);
    
    postHeader.appendChild(userAvatar);
    postHeader.appendChild(userInfo);
    postHeader.appendChild(postDate);
    
    // Create post content
    const postContent = document.createElement('div');
    postContent.className = 'post-content';
    
    if (post.caption) {
        const caption = document.createElement('p');
        caption.textContent = post.caption;
        postContent.appendChild(caption);
    }
    
    // Create media container if post has media
    if (post.media && post.media.length > 0) {
        const mediaContainer = document.createElement('div');
        mediaContainer.className = 'post-media';
        
        post.media.forEach(media => {
            if (media.type === 'image') {
                const img = document.createElement('img');
                img.src = media.url;
                img.alt = 'Post image';
                mediaContainer.appendChild(img);
            } else if (media.type === 'video') {
                const video = document.createElement('video');
                video.src = media.url;
                video.controls = true;
                mediaContainer.appendChild(video);
            }
        });
        
        postContent.appendChild(mediaContainer);
    }
    
    // Create post actions
    const postActions = document.createElement('div');
    postActions.className = 'post-actions';
    
    const likeButton = document.createElement('button');
    likeButton.className = 'like-button';
    likeButton.innerHTML = `<i class="far fa-heart"></i> ${post.likes ? post.likes.length : 0}`;
    
    const commentButton = document.createElement('button');
    commentButton.className = 'comment-button';
    commentButton.innerHTML = `<i class="far fa-comment"></i> ${post.comments ? post.comments.length : 0}`;
    
    postActions.appendChild(likeButton);
    postActions.appendChild(commentButton);
    
    // Assemble post
    postElement.appendChild(postHeader);
    postElement.appendChild(postContent);
    postElement.appendChild(postActions);
    
    return postElement;
}

// Initialize Zilliz functionality when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Override the default functions if useZilliz is true
    if (useZilliz) {
        console.log('Using Zilliz for media and posts');
        
        // Override media functions
        window.createMedia = createMediaZilliz;
        window.loadMedia = loadMediaZilliz;
        window.deleteMedia = deleteMediaZilliz;
        
        // Override post functions if PostManager exists
        if (window.PostManager) {
            const originalPostManager = window.PostManager;
            window.PostManager = class extends originalPostManager {
                constructor() {
                    super();
                    this.apiBaseUrl = '/api/zilliz/posts'; // Override API base URL
                }
                
                handlePostSubmit(e) {
                    createPostZilliz(e); // Use Zilliz version
                }
                
                fetchAndRenderPosts(userId) {
                    if (typeof loadPostsZilliz === 'function') {
                        loadPostsZilliz(); // Use Zilliz version
                    } else {
                        super.fetchAndRenderPosts(userId); // Fall back to original
                    }
                }
            };
            
            // Reinitialize PostManager
            new window.PostManager();
        }
        
        // Load media and posts using Zilliz
        loadMediaZilliz();
        if (typeof loadPostsZilliz === 'function') {
            loadPostsZilliz();
        }
    }
});