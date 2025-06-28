// DOM elements
const quoteDisplay = document.getElementById('quoteDisplay');
const newQuoteBtn = document.getElementById('newQuote');
const categoryFilter = document.getElementById('categoryFilter');
const exportQuotesBtn = document.getElementById('exportQuotes');
const importFileInput = document.getElementById('importFile');
const clearStorageBtn = document.getElementById('clearStorage');

// Create notification container
const notificationContainer = document.createElement('div');
notificationContainer.id = 'notification-container';
document.body.appendChild(notificationContainer);

// Create sync status element
const syncStatus = document.createElement('div');
syncStatus.className = 'sync-status';
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
    
    // Add styles
    addStyles();
}

// Add necessary styles
function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Notification styles */
        #notification-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            z-index: 1000;
        }
        .notification {
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            box-shadow: 0 3px 10px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease-out;
            display: flex;
            justify-content: space-between;
            align-items: center;
            max-width: 300px;
        }
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        .notification-success {
            background-color: #4CAF50;
            border-left: 5px solid #388E3C;
        }
        .notification-warning {
            background-color: #FFC107;
            color: #212121;
            border-left: 5px solid #FFA000;
        }
        .notification-error {
            background-color: #F44336;
            border-left: 5px solid #D32F2F;
        }
        .notification-info {
            background-color: #2196F3;
            border-left: 5px solid #1976D2;
        }
        .notification-close {
            background: none;
            border: none;
            color: inherit;
            font-size: 1.2em;
            cursor: pointer;
            margin-left: 10px;
        }

        /* Conflict resolution modal styles */
        .conflict-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            z-index: 1001;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .conflict-content {
            background: white;
            padding: 20px;
            border-radius: 5px;
            max-width: 800px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
        }
        .conflict-item {
            margin-bottom: 20px;
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 5px;
        }
        .conflict-versions {
            display: flex;
            gap: 20px;
            margin-top: 15px;
        }
        .conflict-version {
            flex: 1;
            padding: 15px;
            border-radius: 5px;
        }
        .local-version {
            background: #E8F5E9;
            border: 1px solid #C8E6C9;
        }
        .server-version {
            background: #E3F2FD;
            border: 1px solid #BBDEFB;
        }

        /* Sync status styles */
        .sync-status {
            position: fixed;
            bottom: 10px;
            left: 10px;
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 0.9em;
            background: #757575;
            color: white;
        }
        .status-syncing {
            background: #2196F3;
        }
        .status-success {
            background: #4CAF50;
        }
        .status-error {
            background: #F44336;
        }

        /* Confirmation dialog styles */
        .confirm-dialog {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            z-index: 1002;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .confirm-content {
            background: white;
            padding: 20px;
            border-radius: 5px;
            max-width: 400px;
            width: 90%;
        }
        .confirm-buttons {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 20px;
        }
        .confirm-button {
            padding: 8px 15px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        .confirm-primary {
            background: #F44336;
            color: white;
        }
        .confirm-secondary {
            background: #E0E0E0;
        }
    `;
    document.head.appendChild(style);
}

// Show notification (replaces alert())
function showNotification(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;
    
    notificationContainer.appendChild(notification);
    
    // Auto-remove after duration
    const timer = setTimeout(() => {
        notification.remove();
    }, duration);
    
    // Manual close
    notification.querySelector('.notification-close').addEventListener('click', () => {
        clearTimeout(timer);
        notification.remove();
    });
}

// Show confirmation dialog (replaces confirm())
function showConfirmation(message, callback) {
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.innerHTML = `
        <div class="confirm-content">
            <p>${message}</p>
            <div class="confirm-buttons">
                <button class="confirm-button confirm-secondary">Cancel</button>
                <button class="confirm-button confirm-primary">Confirm</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    dialog.querySelector('.confirm-secondary').addEventListener('click', () => {
        dialog.remove();
        callback(false);
    });
    
    dialog.querySelector('.confirm-primary').addEventListener('click', () => {
        dialog.remove();
        callback(true);
    });
}

// Server synchronization setup
function setupServerSync() {
    updateSyncStatus('Ready to sync');
    
    // Initial sync
    syncQuotes();
    
    // Periodic sync
    setInterval(syncQuotes, SYNC_INTERVAL);
}

// Main sync function
async function syncQuotes() {
    try {
        updateSyncStatus('Syncing with server...', 'syncing');
        
        // 1. Get server data
        const serverQuotes = await fetchQuotesFromServer();
        
        // 2. Merge with local data
        const mergeResult = mergeData(quotes, serverQuotes);
        
        // 3. Handle conflicts or show success
        if (mergeResult.conflicts.length > 0) {
            hasUnresolvedConflicts = true;
            showNotification(
                `${mergeResult.conflicts.length} conflicts detected with server data`,
                'warning',
                10000
            );
            showConflictResolution(mergeResult.conflicts);
        } else if (mergeResult.updated) {
            showNotification('Quotes synced with server!', 'success');
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
        
        updateSyncStatus(`Synced: ${new Date().toLocaleTimeString()}`, 'success');
        
    } catch (error) {
        console.error('Sync error:', error);
        updateSyncStatus('Sync failed', 'error');
        showNotification('Failed to sync with server', 'error');
    }
}

// Update sync status display
function updateSyncStatus(message, status = '') {
    syncStatus.textContent = message;
    syncStatus.className = `sync-status ${status ? 'status-' + status : ''}`;
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
        lastUpdated: new Date().toISOString(),
        source: 'server'
    }));
}

// Send updates to server
async function sendUpdatesToServer(quotesToSend) {
    const quotesToSync = quotesToSend.filter(quote => 
        !quote.synced || 
        new Date(quote.lastUpdated) > new Date(quote.lastSynced || 0)
    );

    if (quotesToSync.length === 0) return;

    try {
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
    } catch (error) {
        console.error('Failed to send updates:', error);
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
                    local: {...localItem},
                    server: {...serverItem}
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

// Show conflict resolution UI
function showConflictResolution(conflicts) {
    const modal = document.createElement('div');
    modal.className = 'conflict-modal';
    
    let conflictsHTML = conflicts.map((conflict, index) => `
        <div class="conflict-item">
            <h3>Conflict #${index + 1}</h3>
            <p>Quote ID: ${conflict.id}</p>
            <div class="conflict-versions">
                <div class="conflict-version local-version">
                    <h4>Your Version</h4>
                    <p>"${conflict.local.text}"</p>
                    <p><strong>Category:</strong> ${conflict.local.category}</p>
                    <p><small>Last updated: ${new Date(conflict.local.lastUpdated).toLocaleString()}</small></p>
                    <button class="resolve-btn" data-id="${conflict.id}" data-version="local">Keep This Version</button>
                </div>
                <div class="conflict-version server-version">
                    <h4>Server Version</h4>
                    <p>"${conflict.server.text}"</p>
                    <p><strong>Category:</strong> ${conflict.server.category}</p>
                    <p><small>Last updated: ${new Date(conflict.server.lastUpdated).toLocaleString()}</small></p>
                    <button class="resolve-btn" data-id="${conflict.id}" data-version="server">Keep This Version</button>
                </div>
            </div>
        </div>
    `).join('');

    modal.innerHTML = `
        <div class="conflict-content">
            <h2>Resolve Conflicts</h2>
            <p>Please choose which version to keep for each quote:</p>
            ${conflictsHTML}
            <button class="close-modal">Close</button>
        </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    modal.querySelectorAll('.resolve-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.dataset.id);
            const version = e.target.dataset.version;
            resolveConflict(id, version);
            modal.remove();
            showNotification('Conflict resolved successfully!', 'success');
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

    // In a real app, you would implement proper conflict resolution logic
    console.log(`Resolved conflict for quote ${id} in favor of ${version} version`);
    
    // Mark as resolved
    quotes[conflictIndex].resolved = true;
    quotes[conflictIndex].resolution = version;
    quotes[conflictIndex].lastUpdated = new Date().toISOString();
    
    saveQuotes();
    hasUnresolvedConflicts = quotes.some(q => q.conflict && !q.resolved);
}

// Load quotes from local storage
function loadQuotesFromStorage() {
    const storedQuotes = localStorage.getItem('quotes');
    if (storedQuotes) {
        quotes = JSON.parse(storedQuotes);
    } else {
        quotes = [
            { 
                id: 1, 
                text: "The only way to do great work is to love what you do.", 
                category: "inspiration", 
                lastUpdated: new Date().toISOString(),
                source: 'local'
            },
            { 
                id: 2, 
                text: "Innovation distinguishes between a leader and a follower.", 
                category: "leadership", 
                lastUpdated: new Date().toISOString(),
                source: 'local'
            },
            { 
                id: 3, 
                text: "Your time is limited, don't waste it living someone else's life.", 
                category: "life", 
                lastUpdated: new Date().toISOString(),
                source: 'local'
            }
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
        ${quote.source === 'server' ? '<p><small><em>Synced from server</em></small></p>' : ''}
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
    quoteInput.style.width = '300px';
    
    const categoryInput = document.createElement('input');
    categoryInput.id = 'newQuoteCategory';
    categoryInput.type = 'text';
    categoryInput.placeholder = 'Enter quote category';
    categoryInput.style.margin = '5px';
    categoryInput.style.padding = '8px';
    categoryInput.style.width = '300px';
    
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
        showNotification('Please enter both quote text and category', 'warning');
        return;
    }
    
    const newQuote = { 
        id: Date.now(),
        text, 
        category,
        lastUpdated: new Date().toISOString(),
        source: 'local',
        synced: false
    };
    quotes.push(newQuote);
    
    document.getElementById('newQuoteText').value = '';
    document.getElementById('newQuoteCategory').value = '';
    
    saveQuotes();
    populateCategories();
    showRandomQuote();
    
    showNotification('New quote added successfully!', 'success');
}

// Export to JSON
function exportToJsonFile() {
    if (quotes.length === 0) {
        showNotification('No quotes to export', 'warning');
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
        showNotification('Quotes exported successfully!', 'success');
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
                if (!quote.source) quote.source = 'import';
            }
            
            quotes = importedQuotes;
            saveQuotes();
            populateCategories();
            showRandomQuote();
            
            showNotification(`Successfully imported ${importedQuotes.length} quotes`, 'success');
        } catch (error) {
            showNotification('Error importing quotes: ' + error.message, 'error');
        }
        
        event.target.value = '';
    };
    fileReader.readAsText(file);
}

// Clear storage
function clearStorage() {
    showConfirmation('Are you sure you want to clear all quotes? This cannot be undone.', (confirmed) => {
        if (confirmed) {
            localStorage.removeItem('quotes');
            localStorage.removeItem('lastFilter');
            sessionStorage.removeItem('lastUpdated');
            quotes = [];
            saveQuotes();
            populateCategories();
            quoteDisplay.innerHTML = '<p>All quotes have been cleared.</p>';
            showNotification('All quotes have been cleared', 'success');
        }
    });
}

// Initialize
init();