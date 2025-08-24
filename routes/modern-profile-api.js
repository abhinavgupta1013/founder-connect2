class PostManager {
  constructor() {
    this.apiBaseUrl = '/api/posts';
    this.mediaFiles = [];
    this.userId = userId; // Replace with actual user ID logic
    this.setupEventListeners();
    this.createPostModal();
    this.fetchAndRenderPosts(); // Fetch and render posts on initialization
  }

  // ... (existing methods remain the same)

  /**
   * Fetch posts for the current user and render them
   */
  async fetchAndRenderPosts() {
    try {
      const response = await fetch(`/api/users/${this.userId}/media`);
      const data = await response.json();
      if (response.ok) {
        this.renderPosts(data.media); // Render posts dynamically
        this.updatePostCount(data.media.length); // Update post count
      } else {
        console.error('Failed to fetch posts:', data.error);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  }

  /**
   * Render posts on the profile page
   * @param {Array} posts - Array of posts to render
   */
  renderPosts(posts) {
    const postsContainer = document.getElementById('posts-container');
    if (!postsContainer) return;
    postsContainer.innerHTML = ''; // Clear existing posts
    if (posts.length === 0) {
      postsContainer.innerHTML = '<p>No posts yet</p>';
    } else {
      posts.forEach(post => {
        const postHtml = `
          <div class="post">
            <h3>${post.caption}</h3>
            ${post.media.map(media => `<img src="${media.url}" alt="Post Media">`).join('')}
          </div>
        `;
        postsContainer.insertAdjacentHTML('beforeend', postHtml);
      });
    }
  }

  /**
   * Update the post count displayed on the profile page
   * @param {number} count - The number of posts
   */
  updatePostCount(count) {
    const postCountElement = document.getElementById('post-count');
    if (postCountElement) {
      postCountElement.textContent = count;
    }
  }

  /**
   * Handle post form submission
   * @param {Event} e - The submit event
   */
  async handlePostSubmit(e) {
    e.preventDefault();
    const caption = document.getElementById('post-caption').value;
    const submitButton = document.getElementById('submit-post');
    if (!caption && this.mediaFiles.length === 0) {
      alert('Please add a caption or media to your post');
      return;
    }
    // Show loading state
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Posting...';
    }
    try {
      // Create FormData object to send files
      const formData = new FormData();
      formData.append('caption', caption);
      // Add media files
      this.mediaFiles.forEach((file, index) => {
        formData.append('media', file);
      });
      // Send post request
      const response = await fetch('/api/posts', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (response.ok) {
        // Close modal and reset form
        this.closePostModal();
        // Fetch and render new posts dynamically
        this.fetchAndRenderPosts();
      } else {
        alert(data.error || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      alert('An error occurred. Please try again later.');
    } finally {
      // Reset button state
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Post';
      }
    }
  }
}