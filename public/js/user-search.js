/**
 * User Search Functionality for Concept Explore Page
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeUserSearch();
});

/**
 * Initialize user search functionality
 */
function initializeUserSearch() {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('explore-search-results');
    
    if (!searchInput || !searchResults) return;
    
    // Add event listener for input changes
    searchInput.addEventListener('input', debounce(function() {
        const query = searchInput.value.trim();
        
        // Clear results if query is too short
        if (query.length < 2) {
            searchResults.innerHTML = '';
            searchResults.style.display = 'none';
            return;
        }
        
        // Fetch search results
        fetchUserSearchResults(query, searchResults);
    }, 300));
    
    // Close search results when clicking outside
    document.addEventListener('click', function(event) {
        if (!searchInput.contains(event.target) && !searchResults.contains(event.target)) {
            searchResults.style.display = 'none';
        }
    });
}

/**
 * Fetch user search results from API
 * @param {string} query - Search query
 * @param {HTMLElement} resultsContainer - Container for search results
 */
function fetchUserSearchResults(query, resultsContainer) {
    // Show loading indicator
    resultsContainer.innerHTML = '<div class="search-loading">Searching...</div>';
    resultsContainer.style.display = 'block';
    
    // Fetch from search API
    fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Search request failed: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Process and display results
            displaySearchResults(data, resultsContainer);
        })
        .catch(error => {
            console.error('Search error:', error);
            resultsContainer.innerHTML = '<div class="search-error">Error searching. Please try again.</div>';
        });
}

/**
 * Display search results in the results container
 * @param {Array} data - Search results data
 * @param {HTMLElement} resultsContainer - Container for search results
 */
function displaySearchResults(data, resultsContainer) {
    // Clear previous results
    resultsContainer.innerHTML = '';
    
    // Filter to only get user results
    const userResults = data.filter(item => item.type === 'user');
    
    // Check if we have user results
    if (userResults.length === 0) {
        resultsContainer.innerHTML = '<div class="search-no-results">No users found</div>';
        return;
    }
    
    // Create results list
    const resultsList = document.createElement('div');
    resultsList.className = 'search-results';
    
    // Add user results
    userResults.forEach(user => {
        const resultItem = createUserResultItem(user);
        resultsList.appendChild(resultItem);
    });
    
    // Add to container
    resultsContainer.appendChild(resultsList);
    resultsContainer.style.display = 'block';
}

/**
 * Create a user result item element
 * @param {Object} user - User data
 * @returns {HTMLElement} - User result item element
 */
function createUserResultItem(user) {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    
    // Create avatar
    const avatar = document.createElement('div');
    // Handle the imageUrl from the API response
    if (user.imageUrl) {
        avatar.innerHTML = `<img src="${user.imageUrl}" alt="${user.title}" class="search-result-avatar">`;
    } else {
        avatar.className = 'search-result-avatar';
        avatar.textContent = user.title.charAt(0).toUpperCase();
    }
    
    // Create user info
    const info = document.createElement('div');
    info.className = 'search-result-info';
    
    // Extract username from hashtag field which contains @username
    const username = user.hashtag ? user.hashtag.replace('@', '') : '';
    
    info.innerHTML = `
        <div class="search-result-name">${user.title}</div>
        <div class="search-result-username">${user.hashtag || ''}</div>
        ${user.author ? `<div class="search-result-bio">${user.author}</div>` : ''}
    `;
    
    // Add elements to item
    item.appendChild(avatar);
    item.appendChild(info);
    
    // Add click event to navigate to user profile
    item.addEventListener('click', () => {
        window.location.href = `/modern-profile/${username || user.id}`;
    });
    
    return item;
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