// DOM elements
const quoteDisplay = document.getElementById('quoteDisplay');
const newQuoteBtn = document.getElementById('newQuote');
const categoryFilter = document.getElementById('categoryFilter');
const exportQuotesBtn = document.getElementById('exportQuotes');
const importFileInput = document.getElementById('importFile');
const clearStorageBtn = document.getElementById('clearStorage');

// Create sync status element
const syncStatus = document.createElement('div');
syncStatus.id = 'syncStatus';
document.body.appendChild(syncStatus);

// Configuration
const SERVER_URL = 'https://jsonplaceholder.typicode.com/posts'; // Mock API
const SYNC_INTERVAL = 30000; // 30 seconds
let lastSyncTime = null;
let hasUnresolvedConflicts = false;

// Quotes array (will be loaded from storage)
let quotes = [];

// Initialize the app
function init() {
    // Load quotes from local storage
    loadQuotesFromStorage();
    
    // Set up event listeners
    newQuoteBtn.addEventListener('click', showRandomQuote);
    exportQuotesBtn.addEventListener('click', exportToJsonFile);
    importFileInput.addEventListener('change', importFromJsonFile);
    clearStorageBtn.addEventListener('click', clearStorage);
    categoryFilter.addEventListener('change', filterQuotes);
    
    // Create the add quote form
    createAddQuoteForm();
    
    // Populate categories dropdown
    populateCategories();
    
    // Apply last saved filter if exists
    applySavedFilter();
    
    // Show initial random quote
    showRandomQuote();
    
    // Initialize server sync
    setupServerSync();
    
    // Store the initial load time in session storage
    sessionStorage.setItem('lastLoaded', new Date().toISOString());
}

// Server synchronization setup
function setupServerSync() {
    // Initial sync
    syncWithServer();
    
    // Periodic sync
    setInterval(syncWithServer, SYNC_INTERVAL);
    
    // Display sync status
    updateSyncStatus('Last sync: Never', 'gray');
}

// Sync data with server
async function syncWithServer() {
    try {
        updateSyncStatus('Syncing with server...', 'blue');
        
        // Get current timestamp before sync
        const syncStartTime = new Date().toISOString();
        
        // 1. Get server data
        const serverData = await fetchServerData();
        
        // 2. Merge with local data
        const mergeResult = mergeQuotes(quotes, serverData);
        
        // 3. Handle conflicts if any
        if (mergeResult.conflicts.length > 0) {
            hasUnresolvedConflicts = true;
            showConflictNotification(mergeResult.conflicts);
        }
        
        // 4. Update local storage if changes were made
        if (mergeResult.updated || mergeResult.conflicts.length > 0) {
            quotes = mergeResult.mergedQuotes;
            saveQuotes();
            populateCategories();
            showRandomQuote();
        }
        
        // 5. Update sync status
        lastSyncTime = new Date();
        updateSyncStatus(`Last sync: ${lastSyncTime.toLocaleTimeString()}`, 'green');
        
        // 6. Simulate sending updates to server
        await sendUpdatesToServer(quotes);
        
    } catch (error) {
        console.error('Sync failed:', error);
        updateSyncStatus('Sync failed', 'red');
    }
}

// Fetch data from server (simulated)
async function fetchServerData() {
    // In a real app, this would be your actual API endpoint
    const response = await fetch(SERVER_URL);
    if (!response.ok) throw new Error('Server request failed');
    
    // Transform mock data into our quote format
    const serverPosts = await response.json();
    return serverPosts.slice(0, 5).map(post => ({
        id: post.id,
        text: post.title,
        category: 'server',
        lastUpdated: new Date().toISOString()
    }));
}

// Send updates to server (simulated)
async function sendUpdatesToServer(quotesToSend) {
    // In a real app, you would only send changed quotes
    console.log('Simulating sending updates to server:', quotesToSend.length);
    return new Promise(resolve => setTimeout(resolve, 1000));
}

// Merge local and server quotes with conflict detection
function mergeQuotes(localQuotes, serverQuotes) {
    const mergedQuotes = [...localQuotes];
    const conflicts = [];
    let updated = false;
    
    // Add server quotes that don't exist locally
    serverQuotes.forEach(serverQuote => {
        const existingIndex = mergedQuotes.findIndex(q => q.id === serverQuote.id);
        
        if (existingIndex === -1) {
            // New quote from server
            mergedQuotes.push(serverQuote);
            updated = true;
        } else {
            // Potential conflict
            const localQuote = mergedQuotes[existingIndex];
            if (new Date(serverQuote.lastUpdated) > new Date(localQuote.lastUpdated)) {
                // Server version is newer - update local
                if (JSON.stringify(serverQuote) !== JSON.stringify(localQuote)) {
                    conflicts.push({
                        id: serverQuote.id,
                        local: localQuote,
                        server: serverQuote
                    });
                    mergedQuotes[existingIndex] = serverQuote;
                    updated = true;
                }
            }
        }
    });
    
    return {
        mergedQuotes,
        conflicts,
        updated
    };
}

// Show conflict notification
function showConflictNotification(conflicts) {
    const conflictDialog = document.createElement('div');
    conflictDialog.style.position = 'fixed';
    conflictDialog.style.bottom = '20px';
    conflictDialog.style.right = '20px';
    conflictDialog.style.padding = '15px';
    conflictDialog.style.backgroundColor = '#ffeb3b';
    conflictDialog.style.border = '1px solid #ffc107';
    conflictDialog.style.borderRadius = '5px';
    conflictDialog.style.zIndex = '1000';
    conflictDialog.style.maxWidth = '300px';
    
    conflictDialog.innerHTML = `
        <h3 style="margin-top: 0;">Data Conflicts Detected (${conflicts.length})</h3>
        <p>Some quotes were updated on the server. We've kept the server version.</p>
        <button id="viewConflicts" style="margin-top: 10px;">View Conflicts</button>
        <button id="dismissConflicts" style="margin-top: 10px; margin-left: 5px;">Dismiss</button>
    `;
    
    document.body.appendChild(conflictDialog);
    
    document.getElementById('viewConflicts').addEventListener('click', () => {
        showDetailedConflicts(conflicts);
        conflictDialog.remove();
    });
    
    document.getElementById('dismissConflicts').addEventListener('click', () => {
        conflictDialog.remove();
    });
}

// Show detailed conflict resolution UI
function showDetailedConflicts(conflicts) {
    const conflictContainer = document.createElement('div');
    conflictContainer.style.position = 'fixed';
    conflictContainer.style.top = '0';
    conflictContainer.style.left = '0';
    conflictContainer.style.right = '0';
    conflictContainer.style.bottom = '0';
    conflictContainer.style.backgroundColor = 'rgba(0,0,0,0.7)';
    conflictContainer.style.zIndex = '1001';
    conflictContainer.style.padding = '20px';
    conflictContainer.style.overflow = 'auto';
    
    let conflictsHTML = '<h2>Resolve Conflicts</h2>';
    
    conflicts.forEach((conflict, index) => {
        conflictsHTML += `
            <div style="background: white; padding: 15px; margin-bottom: 15px; border-radius: 5px;">
                <h3>Conflict #${index + 1}</h3>
                <div style="display: flex; justify-content: space-between;">
                    <div style="width: 48%; border: 1px solid #ccc; padding: 10px;">
                        <h4>Local Version</h4>
                        <p><strong>Text:</strong> ${conflict.local.text}</p>
                        <p><strong>Category:</strong> ${conflict.local.category}</p>
                        <p><small>Last updated: ${new Date(conflict.local.lastUpdated).toLocaleString()}</small></p>
                        <button onclick="resolveConflict(${index}, 'local')">Keep Local</button>
                    </div>
                    <div style="width: 48%; border: 1px solid #ccc; padding: 10px;">
                        <h4>Server Version</h4>
                        <p><strong>Text:</strong> ${conflict.server.text}</p>
                        <p><strong>Category:</strong> ${conflict.server.category}</p>
                        <p><small>Last updated: ${new Date(conflict.server.lastUpdated).toLocaleString()}</small></p>
                        <button onclick="resolveConflict(${index}, 'server')">Keep Server</button>
                    </div>
                </div>
            </div>
        `;
    });
    
    conflictsHTML += `
        <button style="margin-top: 20px; padding: 10px 20px;" onclick="document.body.removeChild(this.parentNode)">
            Close Conflict Resolution
        </button>
    `;
    
    conflictContainer.innerHTML = conflictsHTML;
    document.body.appendChild(conflictContainer);
}

// Resolve a conflict
function resolveConflict(index, version) {
    console.log(`Resolved conflict ${index} in favor of ${version} version`);
    hasUnresolvedConflicts = false;
}

// Update sync status display
function updateSyncStatus(message, color) {
    syncStatus.textContent = message;
    syncStatus.style.color = color;
    syncStatus.style.margin = '10px 0';
    syncStatus.style.padding = '5px';
    syncStatus.style.fontSize = '0.9em';
}

// Load quotes from local storage
function loadQuotesFromStorage() {
    const storedQuotes = localStorage.getItem('quotes');
    if (storedQuotes) {
        quotes = JSON.parse(storedQuotes);
        console.log('Loaded quotes from local storage:', quotes.length);
    } else {
        // Default quotes if none in storage
        quotes = [
            { id: 1, text: "The only way to do great work is to love what you do.", category: "inspiration", lastUpdated: new Date().toISOString() },
            { id: 2, text: "Innovation distinguishes between a leader and a follower.", category: "leadership", lastUpdated: new Date().toISOString() },
            { id: 3, text: "Your time is limited, don't waste it living someone else's life.", category: "life", lastUpdated: new Date().toISOString() }
        ];
        saveQuotes();
    }
}

// Save quotes to local storage
function saveQuotes() {
    localStorage.setItem('quotes', JSON.stringify(quotes));
    console.log('Saved quotes to local storage');
    
    // Store last update time in session storage
    sessionStorage.setItem('lastUpdated', new Date().toISOString());
}

// Populate categories dropdown
function populateCategories() {
    // Clear existing options
    categoryFilter.innerHTML = '';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = 'all';
    defaultOption.textContent 