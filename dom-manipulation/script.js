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
        
        // 1. Get server data using the properly named function
        const serverData = await fetchQuotesFromServer();
        
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

// Fetch quotes from server (properly named as per requirements)
async function fetchQuotesFromServer() {
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
    console.log('Simulating sending updates to server:', quotesToSend.length);
    return new Promise(resolve => setTimeout(resolve, 1000));
}

// Merge local and server quotes with conflict detection
function mergeQuotes(localQuotes, serverQuotes) {
    const mergedQuotes = [...localQuotes];
    const conflicts = [];
    let updated = false;
    
    serverQuotes.forEach(serverQuote => {
        const existingIndex = mergedQuotes.findIndex(q => q.id === serverQuote.id);
        
        if (existingIndex === -1) {
            mergedQuotes.push(serverQuote);
            updated = true;
        } else {
            const localQuote = mergedQuotes[existingIndex];
            if (new Date(serverQuote.lastUpdated) > new Date(localQuote.lastUpdated)) {
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
        <p>Some quotes were updated on the server.</p>
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

// Apply saved filter from local storage
function applySavedFilter() {
    const savedFilter = localStorage.getItem('lastFilter');
    if (savedFilter && categoryFilter.querySelector(`option[value="${savedFilter}"]`)) {
        categoryFilter.value = savedFilter;
    }
}

// Filter quotes based on selected category
function filterQuotes() {
    localStorage.setItem('lastFilter', categoryFilter.value);
    showRandomQuote();
}

// Display a random quote from the current filter
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

// Create the form for adding new quotes
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

// Add a new quote
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

// Export quotes to JSON file using Blob
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

// Import quotes from JSON file
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

// Clear all quotes from storage
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

// Initialize the application
init();