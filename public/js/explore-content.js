// Explore Content Layout JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the explore layout
    initExploreLayout();
});

/**
 * Initialize the explore layout
 */
function initExploreLayout() {
    // Get the container element
    const contentContainer = document.querySelector('.content');
    if (!contentContainer) return;

    // Create the explore layout structure
    createExploreLayout(contentContainer);

    // Load mock data for demonstration
    loadMockData();

    // Add event listeners
    addEventListeners();
}

/**
 * Create the explore layout structure
 * @param {HTMLElement} container - The container element
 */
function createExploreLayout(container) {
    // Create the explore layout HTML
    const exploreLayoutHTML = `
        <div class="explore-layout">
            <!-- Search Bar -->
            <div class="explore-search-container">
                <div class="explore-search-wrapper">
                    <i class="fas fa-search explore-search-icon"></i>
                    <input type="text" id="explore-search-input" class="explore-search-input" placeholder="Search users...">
                    <button id="explore-search-clear" class="explore-search-clear" style="display: none;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            
            <!-- Filter Tabs -->
            <div class="explore-filter-tabs">
                <div class="explore-filter-tab active" data-filter="all">All</div>
                <div class="explore-filter-tab" data-filter="images">Images</div>
                <div class="explore-filter-tab" data-filter="popular">Popular</div>
                <div class="explore-filter-tab" data-filter="recent">Recent</div>
                <div class="explore-filter-tab" data-filter="following">Following</div>
            </div>
            
            <!-- Search Results Info -->
            <div id="explore-search-results-info" class="explore-search-results-info" style="display: none;">
                <span id="explore-search-results-count">0</span> results for "<span id="explore-search-query"></span>"
                <button id="explore-search-reset" class="explore-search-reset">Clear search</button>
            </div>
            
            <!-- Loading Spinner -->
            <div id="explore-loading" class="loading-container" style="display: none;">
                <div class="loading-spinner"></div>
            </div>
            
            <!-- Explore Grid -->
            <div class="explore-grid" id="explore-grid">
                <!-- Posts will be loaded dynamically via JavaScript -->
            </div>
        </div>
    `;

    // Insert the explore layout HTML into the container
    container.innerHTML = exploreLayoutHTML;
}

/**
 * Load mock data for demonstration
 */
function loadMockData() {
    // Show loading spinner
    const loadingElement = document.getElementById('explore-loading');
    if (loadingElement) {
        loadingElement.style.display = 'flex';
    }

    // Simulate loading delay
    setTimeout(() => {
        // Generate mock data
        const mockData = generateMockData();

        // Render the mock data
        renderExploreItems(mockData);

        // Hide loading spinner
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }, 1000);
}

/**
 * Generate mock data for demonstration
 * @returns {Array} - Array of mock data items
 */
function generateMockData() {
    const mockData = [];

    // Use reliable image URLs instead of random external ones
    const reliableImageUrls = [
        '/uploads/1749936576285-977006122.jpg',
        '/uploads/1749989520415-818844024.webp',
        '/uploads/1752750927133-954186956.png',
        '/uploads/1752996853704-872686660.png',
        '/uploads/1753630493070-878835276.png'
    ];

    // Generate 10 mock items with reliable images
    for (let i = 0; i < 10; i++) {
        mockData.push({
            id: i + 1,
            type: 'image',
            // Use a reliable image URL from our uploads folder
            imageUrl: reliableImageUrls[i % reliableImageUrls.length],
            author: 'User ' + (i + 1),
            likes: Math.floor(Math.random() * 1000),
            comments: Math.floor(Math.random() * 100)
        });
    }

    return mockData;
}

/**
 * Render explore items to the grid
 * @param {Array} items - Array of items to render
 */
function renderExploreItems(items) {
    const exploreGrid = document.getElementById('explore-grid');
    if (!exploreGrid) return;

    // Clear the grid
    exploreGrid.innerHTML = '';
    
    if (items.length === 0) {
        exploreGrid.innerHTML = '<div class="explore-no-results">No results found</div>';
        return;
    }

    // Render each item
    items.forEach((item, index) => {
        const itemElement = document.createElement('div');
        
        // Assign different sizes based on index to create a more interesting grid
        // This helps eliminate empty spaces by creating a more balanced layout
        let sizeClass = '';
        if (index % 7 === 0) {
            sizeClass = 'large'; // 2x2
        } else if (index % 5 === 0) {
            sizeClass = 'wide';  // 2x1
        } else if (index % 3 === 0) {
            sizeClass = 'tall';  // 1x2
        } else {
            sizeClass = 'standard'; // 1x1
        }
        
        itemElement.className = `explore-item ${sizeClass}`;
        itemElement.dataset.id = item.id;
        itemElement.dataset.type = item.type;

        // Create item HTML with proper image loading
        itemElement.innerHTML = `
            <div class="explore-item-media">
                <img src="${item.imageUrl}" alt="Image by ${item.author}" loading="lazy" onerror="this.src='/images/placeholder.jpg'">
            </div>
        `;

        // Add click event listener
        itemElement.addEventListener('click', () => {
            openEnhancedPostModal(item);
        });

        // Add to grid
        exploreGrid.appendChild(itemElement);
    });
}

/**
 * Add event listeners
 */
function addEventListeners() {
    // Filter tabs
    const filterTabs = document.querySelectorAll('.explore-filter-tab');
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            filterTabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Get filter value
            const filter = tab.dataset.filter;
            
            // Hide search results info when changing filters
            const searchResultsInfo = document.getElementById('explore-search-results-info');
            if (searchResultsInfo) {
                searchResultsInfo.style.display = 'none';
            }
            
            // Filter items (in a real app, you would fetch filtered data from the server)
            console.log('Filter selected:', filter);
            
            // For demo, just reload mock data
            loadMockData();
        });
    });
    
    // Search input
    const searchInput = document.getElementById('explore-search-input');
    const searchClear = document.getElementById('explore-search-clear');
    const searchReset = document.getElementById('explore-search-reset');
    
    if (searchInput) {
        // Add input event listener
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim();
            
            // Show/hide clear button
            if (searchClear) {
                searchClear.style.display = query.length > 0 ? 'flex' : 'none';
            }
            
            // If query is empty, reset search
            if (query.length === 0) {
                resetSearch();
                return;
            }
            
            // Debounce search to avoid too many requests
            clearTimeout(searchInput.debounceTimer);
            searchInput.debounceTimer = setTimeout(() => {
                performSearch(query);
            }, 500);
        });
        
        // Add keydown event listener for Enter key
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query.length > 0) {
                    performSearch(query);
                }
            }
        });
    }
    
    // Search clear button
    if (searchClear) {
        searchClear.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
                searchClear.style.display = 'none';
                resetSearch();
            }
        });
    }
    
    // Search reset button
    if (searchReset) {
        searchReset.addEventListener('click', resetSearch);
    }
}

/**
 * Perform search
 * @param {string} query - The search query
 */
function performSearch(query) {
    console.log('Searching for:', query);
    
    // Show loading spinner
    const loadingElement = document.getElementById('explore-loading');
    if (loadingElement) {
        loadingElement.style.display = 'flex';
    }
    
    // In a real app, you would make an API call to search the database
    // For demo purposes, we'll simulate an API call with setTimeout
    setTimeout(() => {
        // Make API call to search endpoint
        fetch(`/api/search?q=${encodeURIComponent(query)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Update search results info
                const searchResultsInfo = document.getElementById('explore-search-results-info');
                const searchResultsCount = document.getElementById('explore-search-results-count');
                const searchQueryElement = document.getElementById('explore-search-query');
                
                if (searchResultsInfo && searchResultsCount && searchQueryElement) {
                    searchResultsInfo.style.display = 'flex';
                    searchResultsCount.textContent = data.length;
                    searchQueryElement.textContent = query;
                }
                
                // Render search results
                renderExploreItems(data);
                
                // Hide loading spinner
                if (loadingElement) {
                    loadingElement.style.display = 'none';
                }
            })
            .catch(error => {
                console.error('Error searching:', error);
                
                // For demo purposes, fall back to filtered mock data
                const mockData = generateMockData();
                const filteredData = mockData.filter(item => {
                    return (
                        item.author.toLowerCase().includes(query.toLowerCase())
                    );
                });
                
                // Update search results info
                const searchResultsInfo = document.getElementById('explore-search-results-info');
                const searchResultsCount = document.getElementById('explore-search-results-count');
                const searchQueryElement = document.getElementById('explore-search-query');
                
                if (searchResultsInfo && searchResultsCount && searchQueryElement) {
                    searchResultsInfo.style.display = 'flex';
                    searchResultsCount.textContent = filteredData.length;
                    searchQueryElement.textContent = query;
                }
                
                // Render filtered mock data
                renderExploreItems(filteredData);
                
                // Hide loading spinner
                if (loadingElement) {
                    loadingElement.style.display = 'none';
                }
            });
    }, 500);
}

/**
 * Reset search
 */
function resetSearch() {
    // Hide search results info
    const searchResultsInfo = document.getElementById('explore-search-results-info');
    if (searchResultsInfo) {
        searchResultsInfo.style.display = 'none';
    }
    
    // Load mock data
    loadMockData();
}