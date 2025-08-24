/**
 * Feed.js - Handles fetching and displaying posts in the main feed
 */

class FeedManager {
    constructor() {
        this.feedContainer = document.getElementById('feed-posts');
        this.loadMoreBtn = document.getElementById('load-more-btn');
        this.page = 1;
        this.limit = 10;
        this.hasMore = true;
        this.isLoading = false;
        
        // Initialize event listeners
        this.initEventListeners();
        
        // Load initial posts
        this.loadPosts();
    }
    
    initEventListeners() {
        // Add event listener to load more button
        if (this.loadMoreBtn) {
            this.loadMoreBtn.addEventListener('click', () => {
                if (!this.isLoading && this.hasMore) {
                    this.page++;
                    this.loadPosts();
                }
            });
        }
        
        // Add event listener for like button clicks (using event delegation)
        document.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('like-button')) {
                const postId = e.target.closest('.card').dataset.postId;
                this.handleLikePost(postId, e.target);
            }
        });
        
        // Add event listener for comment form submissions (using event delegation)
        document.addEventListener('submit', (e) => {
            if (e.target && e.target.classList.contains('comment-form')) {
                e.preventDefault();
                const postId = e.target.closest('.card').dataset.postId;
                const commentInput = e.target.querySelector('.comment-input');
                const commentText = commentInput.value.trim();
                
                if (commentText) {
                    this.handleAddComment(postId, commentText, commentInput);
                }
            }
        });
    }
    
    async loadPosts() {
        try {
            this.isLoading = true;
            this.loadMoreBtn.textContent = 'Loading...';
            
            // Fetch posts from the API using V2 endpoint
            const response = await fetch(`/api/v2/posts/feed`);
            const data = await response.json();
            
            if (data.success) {
                // Check if there are more posts to load
                if (data.posts.length < this.limit) {
                    this.hasMore = false;
                    this.loadMoreBtn.style.display = 'none';
                }
                
                // Render posts
                this.renderPosts(data.posts);
            } else {
                console.error('Failed to load posts:', data.message);
            }
        } catch (error) {
            console.error('Error loading posts:', error);
        } finally {
            this.isLoading = false;
            this.loadMoreBtn.textContent = 'Load More';
        }
    }
    
    renderPosts(posts) {
        // If it's the first page, clear the container
        if (this.page === 1) {
            this.feedContainer.innerHTML = '';
        }
        
        // Check if there are any posts to display
        if (posts.length === 0 && this.page === 1) {
            // Display a message when there are no posts
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-feed-message';
            emptyMessage.innerHTML = `
                <i class="fas fa-inbox"></i>
                <p>No posts to display yet.</p>
                <p>Be the first to share something with the community!</p>
            `;
            this.feedContainer.appendChild(emptyMessage);
            return;
        }
        
        // Create HTML for each post and append to the feed container
        posts.forEach(post => {
            const postElement = this.createPostElement(post);
            this.feedContainer.appendChild(postElement);
        });
    }
    
    createPostElement(post) {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.postId = post._id;
        
        // Determine banner color based on post type or randomly
        const bannerColors = ['#1E88E5', '#43A047', '#FB8C00', '#8E24AA'];
        const randomColor = bannerColors[Math.floor(Math.random() * bannerColors.length)];
        
        // Format date
        const postDate = new Date(post.createdAt);
        const timeAgo = this.getTimeAgo(postDate);
        
        // Get user's first initial for avatar
        const userInitial = post.user.name ? post.user.name.charAt(0) : 'U';
        
        // Create post HTML structure
        card.innerHTML = `
            <div class="card-banner" style="background-color: ${randomColor};"></div>
            <div class="card-avatar">${userInitial}</div>
            <div class="card-content">
                <div class="card-title">${post.caption}</div>
                <div class="card-subtitle"><a href="/profile/${post.user.slug}" class="user-profile-link">${post.user.name}</a> • ${post.user.title || 'User'} • ${timeAgo}</div>
                ${this.renderMediaContent(post.media)}
                <div class="card-footer">
                    <div class="card-stats">
                        <div class="stat-item like-button" title="Like this post">
                            <i class="fas fa-heart ${post.likes.includes(currentUserId) ? 'liked' : ''}"></i>
                            <span class="like-count">${post.likes.length}</span>
                        </div>
                        <div class="stat-item comment-toggle" title="View comments">
                            <i class="fas fa-comment"></i>
                            <span class="comment-count">${post.comments.length}</span>
                        </div>
                        <div class="stat-item" title="Share this post">
                            <i class="fas fa-share"></i>
                            <span>0</span>
                        </div>
                    </div>
                    <button class="card-action">Connect</button>
                </div>
                
                <!-- Comments Section (Hidden by default) -->
                <div class="comments-section" style="display: none;">
                    <div class="comments-list">
                        ${this.renderComments(post.comments)}
                    </div>
                    <form class="comment-form">
                        <input type="text" class="comment-input" placeholder="Add a comment...">
                        <button type="submit" class="comment-submit">Post</button>
                    </form>
                </div>
            </div>
        `;
        
        // Add event listener to toggle comments visibility
        const commentToggle = card.querySelector('.comment-toggle');
        const commentsSection = card.querySelector('.comments-section');
        
        commentToggle.addEventListener('click', () => {
            commentsSection.style.display = commentsSection.style.display === 'none' ? 'block' : 'none';
        });
        
        return card;
    }
    
    renderMediaContent(media) {
        if (!media || media.length === 0) {
            return '';
        }
        
        let mediaHtml = '<div class="card-media">';
        
        media.forEach(item => {
            if (item.type.startsWith('image')) {
                mediaHtml += `<img src="${item.url}" alt="Post image" class="post-image">`;
            } else if (item.type.startsWith('video')) {
                mediaHtml += `
                    <video controls class="post-video">
                        <source src="${item.url}" type="${item.type}">
                        Your browser does not support the video tag.
                    </video>
                `;
            }
        });
        
        mediaHtml += '</div>';
        return mediaHtml;
    }
    
    renderComments(comments) {
        if (!comments || comments.length === 0) {
            return '<div class="no-comments">No comments yet</div>';
        }
        
        return comments.map(comment => {
            const commentDate = new Date(comment.createdAt);
            const timeAgo = this.getTimeAgo(commentDate);
            
            return `
                <div class="comment">
                    <div class="comment-avatar">${comment.user.name.charAt(0)}</div>
                    <div class="comment-content">
                        <div class="comment-author">${comment.user.name}</div>
                        <div class="comment-text">${comment.text}</div>
                        <div class="comment-time">${timeAgo}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    async handleLikePost(postId, likeButton) {
        try {
            const response = await fetch(`/api/posts/${postId}/like`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Update UI
                const likeIcon = likeButton.querySelector('i');
                const likeCount = likeButton.querySelector('.like-count');
                
                if (data.liked) {
                    likeIcon.classList.add('liked');
                    likeCount.textContent = parseInt(likeCount.textContent) + 1;
                } else {
                    likeIcon.classList.remove('liked');
                    likeCount.textContent = parseInt(likeCount.textContent) - 1;
                }
            }
        } catch (error) {
            console.error('Error liking post:', error);
        }
    }
    
    async handleAddComment(postId, commentText, commentInput) {
        try {
            const response = await fetch(`/api/posts/${postId}/comment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: commentText })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Clear input field
                commentInput.value = '';
                
                // Update comment count
                const card = document.querySelector(`.card[data-post-id="${postId}"]`);
                const commentCount = card.querySelector('.comment-count');
                commentCount.textContent = parseInt(commentCount.textContent) + 1;
                
                // Add new comment to the comments list
                const commentsList = card.querySelector('.comments-list');
                const noComments = commentsList.querySelector('.no-comments');
                
                if (noComments) {
                    commentsList.innerHTML = '';
                }
                
                const commentElement = document.createElement('div');
                commentElement.className = 'comment';
                commentElement.innerHTML = `
                    <div class="comment-avatar">${data.comment.user.name.charAt(0)}</div>
                    <div class="comment-content">
                        <div class="comment-author">${data.comment.user.name}</div>
                        <div class="comment-text">${data.comment.text}</div>
                        <div class="comment-time">Just now</div>
                    </div>
                `;
                
                commentsList.appendChild(commentElement);
            }
        } catch (error) {
            console.error('Error adding comment:', error);
        }
    }
    
    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        
        let interval = Math.floor(seconds / 31536000);
        if (interval >= 1) {
            return interval === 1 ? '1 year ago' : `${interval} years ago`;
        }
        
        interval = Math.floor(seconds / 2592000);
        if (interval >= 1) {
            return interval === 1 ? '1 month ago' : `${interval} months ago`;
        }
        
        interval = Math.floor(seconds / 86400);
        if (interval >= 1) {
            return interval === 1 ? '1 day ago' : `${interval} days ago`;
        }
        
        interval = Math.floor(seconds / 3600);
        if (interval >= 1) {
            return interval === 1 ? '1 hour ago' : `${interval} hours ago`;
        }
        
        interval = Math.floor(seconds / 60);
        if (interval >= 1) {
            return interval === 1 ? '1 minute ago' : `${interval} minutes ago`;
        }
        
        return seconds < 10 ? 'just now' : `${seconds} seconds ago`;
    }
}

// Initialize the feed manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Get current user ID from a global variable (should be set in the template)
    window.currentUserId = window.currentUserId || '';
    
    // Initialize the feed manager
    const feedManager = new FeedManager();
});