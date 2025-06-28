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
    
    // Add styles dynamically
    addStyles();
}

// Add necessary styles
function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .sync-notification {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #ffeb3b;
            border: 1px solid #ffc107;
            border-radius: 5px;
            padding: 15px;
            max-width: 300px;
            z-index: 1000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .conflict-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            z-index: 1001;
            padding: 20px;
            overflow: auto;
        }
        .conflict-modal .modal-content {
            background: white;
            padding: 20px;
            border-radius: 5px;
            max-width: 800px;
            margin: 0 auto;
        }
        .conflict-item {
            margin-bottom: 20px;
            padding: 15px;
            border: 1px solid #eee;
        }
        .versions {
            display: flex;
            gap: 20px;
            margin-top: 10px;
        }
        .version {
            flex: 1;
            padding: 10px;
            border: 1px solid #ddd;
        }
        .version.local { background: #e8f5e9; }
        .version.server { background: #e3f2fd; }
        #syncStatus {
            margin: 10px 0;
            padding: 5px;
            font-size: 0.9em;
        }
    `;
    document.head.appendChild(style);
}

// Server synchronization setup
function setupServerSync() {
    // Initial sync
    syncQuotes();
    
    // Periodic sync
    setInterval(syncQuotes, SYNC_INTERVAL);
    
    updateSyncStatus('Ready to sync', 'gray');
}

// Main sync function
async function syncQuotes() {
    try {
        updateSyncStatus('Syncing with server...', 'blue');
        
        // 1. Get server data
        const serverQuotes = await fetchQuotesFromServer();
        
        // 2. Merge with local data
        const mergeResult = mergeData(quotes, serverQuotes);
        
        // 3. Handle conflicts if any
        if (mergeResult.conflicts.length > 0) {
            hasUnresolvedConflicts = true;
            showSyncNotification(
                `${mergeResult.conflicts.length} conflicts detected`,
                mergeResult.conflicts
            );
        }
        
        // 4. Update local storage if needed
        if (mergeResult.updated || mergeResult.conflicts.length > 0) {
            quotes = mergeResult.mergedData;
            saveQuotes();
            populateCategories();
            showRandomQuote();
        }
        
        // 5. Send local updates to server
        await sendUpdatesToServer(quotes);
        
        updateSyncStatus(`Synced: ${new Date().toLocaleTimeString()}`, 'green');
        
    } catch (error) {
        console.error('Sync error:', error);
        updateSyncStatus('Sync failed', 'red');
    }
}

// Fetch quotes from server
async function fetchQuotesFromServer() {
    const response = await fetch(SERVER_URL);
    if (!response.ok) throw new Error('Server request failed');
    
    const serverPosts = await response.json();
    return serverPosts.slice(0, 5).map(post => ({
        id: post.id,
        text: post.title,
        category: 'server',
        lastUpdated: new Date().toISOString()
    }));
}

// Send updates to server with proper POST request
async function sendUpdatesToServer(quotesToSend) {
    try {
        updateSyncStatus('Sending updates to server...', 'blue');
        
        const quotesToSync = quotesToSend.filter(quote => 
            !quote.synced || 
            new Date(quote.lastUpdated) > new Date(quote.lastSynced || 0)
        );

        if (quotesToSync.length === 0) {
            console.log('No quotes need syncing');
            return;
        }

        // Simulate POST request with proper headers
        const response = await fetch(SERVER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer mock-token'
            },
            body: JSON.stringify({
                quotes: quotesToSync,
                lastSync: localStorage.getItem('lastSync') || null
            })
        });

        if (!response.ok) throw new Error('Failed to sync with server');

        // Update sync status
        const now = new Date().toISOString();
        quotes.forEach(quote => {
            if (quotesToSync.some(q => q.id === quote.id)) {
                quote.lastSynced = now;
                quote.synced = true;
            }
        });

        localStorage.setItem('lastSync', now);
        updateSyncStatus(`Sync complete: ${new Date().toLocaleTimeString()}`, 'green');

    } catch (error) {
        console.error('Sync failed:', error);
        updateSyncStatus('Sync failed', 'red');
        throw error;
    }
}

// Merge data with conflict detection
function mergeData(localData, serverData) {
    const merged = [...localData];
    const conflicts = [];
    let updated = false;

    serverData.forEach(serverItem => {
        const localIndex = merged.findIndex(item => item.id === serverItem.id);
        
        if (localIndex === -1) {
            merged.push(serverItem);
            updated = true;
        } else {
            const localItem = merged[localIndex];
            const serverIsNewer = new Date(serverItem.lastUpdated) > new Date(localItem.lastUpdated);
            
            if (serverIsNewer && !deepEqual(serverItem, localItem)) {
                conflicts.push({
                    id: serverItem.id,
                    local: localItem,
                    server: serverItem
                });
                merged[localIndex] = serverItem;
                updated = true;
            }
        }
    });

    return { mergedData: merged, conflicts, updated };
}

// Deep equality check
function deepEqual(obj1, obj2) {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
}

// Show sync notification
function showSyncNotification(message, conflicts = []) {
    const notification = document.createElement('div');
    notification.className = 'sync-notification';
    notification.innerHTML = `
        <div class="sync-notification-content">
            <h3>${message}</h3>
            ${conflicts.length ? `
                <p>${conflicts.length} conflicts need resolution</p>
                <button class="resolve-btn">Resolve Now</button>
            ` : ''}
            <button class="dismiss-btn">Dismiss</button>
        </div>
    `;

    document.body.appendChild(notification);

    notification.querySelector('.resolve-btn')?.addEventListener('click', () => {
        showConflictResolution(conflicts);
        notification.remove();
    });

    notification.querySelector('.dismiss-btn').addEventListener('click', () => {
        notification.remove();
    });
}

// Show conflict resolution UI
function showConflictResolution(conflicts) {
    const modal = document.createElement('div');
    modal.className = 'conflict-modal';
    
    let conflictsHTML = conflicts.map((conflict, index) => `
        <div class="conflict-item">
            <h3>Conflict #${index + 1}</h3>
            <div class="versions">
                <div class="version local">
                    <h4>Your Version</h4>
                    <p>${conflict.local.text}</p>
                    <small>${new Date(conflict.local.lastUpdated).toLocaleString()}</small>
                    <button data-id="${conflict.id}" data-version="local">Keep This</button>
                </div>
                <div class="version server">
                    <h4>Server Version</h4>
                    <p>${conflict.server.text}</p>
                    <small>${new Date(conflict.server.lastUpdated).toLocaleString()}</small>
                    <button data-id="${conflict.id}" data-version="server">Keep This</button>
                </div>
            </div>
        </div>
    `).join('');

    modal.innerHTML = `
        <div class="modal-content">
            <h2>Resolve Conflicts</h2>
            ${conflictsHTML}
            <button class="close-modal">Close</button>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelectorAll('[data-version]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.dataset.id);
            const version = e.target.dataset.version;
            resolveConflict(id, version);
            modal.remove();
        });
    });

    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.remove();
    });
}

// Resolve conflict
function resolveConflict(id, version) {
    const conflictIndex = quotes.findIndex(q => q.id === id);
    if (conflictIndex === -1) return;

    if (version === 'server') {
        // Server version already applied during merge
        quotes[conflictIndex].resolved = true;
    } else {
        // Revert to local version
        const localVersion = JSON.parse(sessionStorage.getItem('conflictLocal_' + id));
        if (localVersion) {
            quotes[conflictIndex] = localVersion;
            quotes[conflictIndex].lastUpdated = new Date().toISOString();
            quotes[conflictIndex].resolved = true;
        }
    }
    
    saveQuotes();
    hasUnresolvedConflicts = quotes.some(q => q.conflict && !q.resolved);
}

// Update sync status
function updateSyncStatus(message, color) {
    syncStatus.textContent = message;
    syncStatus.style.color = color;
}

// Load quotes from local storage
function loadQuotesFromStorage() {
    const storedQuotes = localStorage.getItem('quotes');
    if (storedQuotes) {
        quotes = JSON.parse(storedQuotes);
    } else {
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
    sessionStorage.setItem('lastUpdated', new Date().toISOString());
}

// Populate categories dropdown
function populateCategories() {
    categoryFilter.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = 'all';
    defaultOption.textContent = 'All Categories';
    categoryFilter.appendChild(defaultOption);
    
    [...new Set(quotes.map(quote => quote.category))].forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
}

// Apply saved filter
function applySavedFilter() {
    const savedFilter = localStorage.getItem('lastFilter');
    if (savedFilter && categoryFilter.querySelector(`option[value="${savedFilter}"]`)) {
        categoryFilter.value = savedFilter;
    }
}

// Filter quotes
function filterQuotes() {
    localStorage.setItem('lastFilter', categoryFilter.value);
    showRandomQuote();
}

// Display random quote
function showRandomQuote() {
    const selectedCategory = categoryFilter.value;
    let filteredQuotes = selectedCategory === 'all' ? quotes : quotes.filter(quote => quote.category === selectedCategory);
    
    if (filteredQuotes.length === 0) {
        quoteDisplay.innerHTML = `
            <p>No quotes available in this category.</p>
            <p>Try selecting a different category or adding new quotes.</p>
        `;
        return;
    }
    
    const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
    const quote = filteredQuotes[randomIndex];
    
    quoteDisplay.innerHTML = `
        <p class="quote-text">"${quote.text}"</p>
        <p class="quote-category">— ${quote.category}</p>
        <p><small>Filter: ${selectedCategory === 'all' ? 'All Categories' : selectedCategory}</small></p>
        <p><small>Last viewed: ${new Date().toLocaleTimeString()}</small></p>
    `;
    
    sessionStorage.setItem('lastViewedQuote', JSON.stringify(quote));
}

// Create add quote form
function createAddQuoteForm() {
    const formContainer = document.createElement('div');
    formContainer.style.marginTop = '30px';
    
    const heading = document.createElement('h3');
    heading.textContent = 'Add New Quote';
    
    const quoteInput = document.createElement('input');
    quoteInput.id = 'newQuoteText';
    quoteInput.type = 'text';
    quoteInput.placeholder = 'Enter a new quote';
    quoteInput.style.margin = '5px';
    quoteInput.style.padding = '8px';
    
    const categoryInput = document.createElement('input');
    categoryInput.id = 'newQuoteCategory';
    categoryInput.type = 'text';
    categoryInput.placeholder = 'Enter quote category';
    categoryInput.style.margin = '5px';
    categoryInput.style.padding = '8px';
    
    const addButton = document.createElement('button');
    addButton.textContent = 'Add Quote';
    addButton.style.margin = '5px';
    addButton.style.padding = '8px 15px';
    addButton.style.backgroundColor = '#4CAF50';
    addButton.style.color = 'white';
    addButton.style.border = 'none';
    addButton.style.borderRadius = '4px';
    addButton.style.cursor = 'pointer';
    addButton.addEventListener('click', addQuote);
    
    formContainer.appendChild(heading);
    formContainer.appendChild(quoteInput);
    formContainer.appendChild(categoryInput);
    formContainer.appendChild(addButton);
    
    document.body.appendChild(formContainer);
}

// Add new quote
function addQuote() {
    const text = document.getElementById('newQuoteText').value.trim();
    const category = document.getElementById('newQuoteCategory').value.trim();
    
    if (!text || !category) {
        alert('Please enter both quote text and category');
        return;
    }
    
    const newQuote = { 
        id: Date.now(),
        text, 
        category,
        lastUpdated: new Date().toISOString()
    };
    quotes.push(newQuote);
    
    document.getElementById('newQuoteText').value = '';
    document.getElementById('newQuoteCategory').value = '';
    
    saveQuotes();
    populateCategories();
    showRandomQuote();
    
    quoteDisplay.innerHTML = `
        <p class="quote-text">"${newQuote.text}"</p>
        <p class="quote-category">— ${newQuote.category}</p>
        <p><em>New quote added successfully!</em></p>
    `;
}

// Export to JSON
function exportToJsonFile() {
    if (quotes.length === 0) {
        alert('No quotes to export');
        return;
    }
    
    const jsonString = JSON.stringify(quotes, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quotes.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

// Import from JSON
function importFromJsonFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const fileReader = new FileReader();
    fileReader.onload = function(e) {
        try {
            const importedQuotes = JSON.parse(e.target.result);
            
            if (!Array.isArray(importedQuotes) || importedQuotes.length === 0) {
                throw new Error('Invalid format: Expected an array of quotes');
            }
            
            for (const quote of importedQuotes) {
                if (!quote.text || !quote.category) {
                    throw new Error('Invalid quote format: Each quote must have text and category');
                }
                if (!quote.id) quote.id = Date.now();
                if (!quote.lastUpdated) quote.lastUpdated = new Date().toISOString();
            }
            
            quotes = importedQuotes;
            saveQuotes();
            populateCategories();
            showRandomQuote();
            
            alert(`Successfully imported ${importedQuotes.length} quotes`);
        } catch (error) {
            alert('Error importing quotes: ' + error.message);
        }
        
        event.target.value = '';
    };
    fileReader.readAsText(file);
}

// Clear storage
function clearStorage() {
    if (confirm('Are you sure you want to clear all quotes? This cannot be undone.')) {
        localStorage.removeItem('quotes');
        localStorage.removeItem('lastFilter');
        sessionStorage.removeItem('lastUpdated');
        quotes = [];
        saveQuotes();
        populateCategories();
        quoteDisplay.innerHTML = '<p>All quotes have been cleared.</p>';
    }
}

// Initialize
init();