class PostManager {
  constructor() {
    this.apiBaseUrl = '/api/v2/posts'; // Updated to V2 base URL
    this.mediaFiles = [];
    this.setupEventListeners();
    this.createPostModal();
    // this.fetchAndRenderPosts(); // Removed: Fetch and render posts on initialization
  }

  setupEventListeners() {
    const postNavItem = document.querySelector('.nav-item .fa-plus-circle').parentElement;
    if (postNavItem) {
      postNavItem.addEventListener('click', this.openPostModal.bind(this));
    }
    document.addEventListener('DOMContentLoaded', () => {
      const closeModalBtn = document.getElementById('close-post-modal');
      if (closeModalBtn) {
        closeModalBtn.addEventListener('click', this.closePostModal.bind(this));
      }
      const postForm = document.getElementById('post-form');
      if (postForm) {
        postForm.addEventListener('submit', this.handlePostSubmit.bind(this));
      }
      const fileInput = document.getElementById('post-media');
      if (fileInput) {
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));
      }
    });
  }

  createPostModal() {
    const modalHTML = `
      <div id="post-modal" class="post-modal">
        <!-- Modal HTML remains the same -->
      </div>
    `;
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      /* Styles remain the same */
    `;
    document.head.appendChild(styleElement);
  }

  openPostModal() {
    const modal = document.getElementById('post-modal');
    if (modal) {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    } else {
      window.location.href = '/create-post';
    }
  }

  closePostModal() {
    const modal = document.getElementById('post-modal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
      const form = document.getElementById('post-form');
      if (form) form.reset();
      const preview = document.getElementById('media-preview');
      if (preview) preview.innerHTML = '';
      this.mediaFiles = [];
    }
  }

  handleFileSelect(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const preview = document.getElementById('media-preview');
    if (!preview) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      this.mediaFiles.push(file);
      const mediaItem = document.createElement('div');
      mediaItem.className = 'media-item';
      const removeBtn = document.createElement('div');
      removeBtn.className = 'remove-media';
      removeBtn.innerHTML = '&times;';
      removeBtn.dataset.index = this.mediaFiles.length - 1;
      removeBtn.addEventListener('click', this.removeMedia.bind(this));
      if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        mediaItem.appendChild(img);
      } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        video.controls = true;
        mediaItem.appendChild(video);
      }
      mediaItem.appendChild(removeBtn);
      preview.appendChild(mediaItem);
    }
  }

  removeMedia(e) {
    const index = parseInt(e.target.dataset.index);
    if (isNaN(index)) return;
    this.mediaFiles.splice(index, 1);
    const mediaItem = e.target.parentElement;
    if (mediaItem) mediaItem.remove();
    const removeButtons = document.querySelectorAll('.remove-media');
    removeButtons.forEach((btn, i) => {
      btn.dataset.index = i;
    });
  }

  async handlePostSubmit(e) {
    e.preventDefault();
    const caption = document.getElementById('post-caption').value;
    const submitButton = document.getElementById('submit-post');
    if (!caption && this.mediaFiles.length === 0) {
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
      this.mediaFiles.forEach((file, index) => {
        formData.append('media', file);
      });
      const response = await fetch(`${this.apiBaseUrl}/create`, { // Updated to V2 create endpoint
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        this.closePostModal();
        
        // Try to call loadPosts() from modern-profile.js if it exists
        // This will refresh the posts list on the profile page
        if (typeof loadPosts === 'function') {
          loadPosts();
        } else if (window.loadPosts) {
          window.loadPosts();
        } else {
          // Fallback to page reload if loadPosts function is not accessible
          window.location.reload();
        }
      } else {
        alert(data.error || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      alert('An error occurred. Please try again later.');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Post';
      }
    }
  }

  async fetchAndRenderPosts(userId) { // Added userId parameter
    try {
      if (!userId) {
        console.warn('Skipping fetchAndRenderPosts: userId is not available.');
        const postsContainer = document.getElementById('posts-container');
        if (postsContainer) postsContainer.innerHTML = '<p>User ID not found, cannot load posts.</p>';
        return;
      }
      const response = await fetch(`${this.apiBaseUrl}/user/${userId}`); // Updated to V2 get user posts endpoint
      const data = await response.json();
      if (response.ok) {
        this.renderPosts(data.posts); // Render posts dynamically
        this.updatePostCount(data.postCount); // Update post count
      } else {
        console.error('Failed to fetch posts:', data.error);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  }

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

  updatePostCount(count) {
    const postCountElement = document.getElementById('post-count');
    if (postCountElement) {
      postCountElement.textContent = count;
    }
  }
}

// Initialize PostManager
document.addEventListener('DOMContentLoaded', () => {
  new PostManager();
});