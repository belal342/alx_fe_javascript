// DOM elements
const quoteDisplay = document.getElementById('quoteDisplay');
const newQuoteBtn = document.getElementById('newQuote');
const categorySelect = document.getElementById('categorySelect');
const exportQuotesBtn = document.getElementById('exportQuotes');
const importFileInput = document.getElementById('importFile');
const clearStorageBtn = document.getElementById('clearStorage');

// Quotes array (will be loaded from storage)
let quotes = [];

// Initialize the app
function init() {
    // Load quotes from local storage
    loadQuotesFromStorage();
    
    // Set up event listeners
    newQuoteBtn.addEventListener('click', showRandomQuote);
    exportQuotesBtn.addEventListener('click', exportToJson);
    importFileInput.addEventListener('change', importFromJsonFile);
    clearStorageBtn.addEventListener('click', clearStorage);
    
    // Create the add quote form
    createAddQuoteForm();
    
    // Populate category filter
    updateCategoryFilter();
    
    // Show initial random quote
    showRandomQuote();
    
    // Store the initial load time in session storage
    sessionStorage.setItem('lastLoaded', new Date().toISOString());
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
            { text: "The only way to do great work is to love what you do.", category: "inspiration" },
            { text: "Innovation distinguishes between a leader and a follower.", category: "leadership" },
            { text: "Your time is limited, don't waste it living someone else's life.", category: "life" }
        ];
        saveQuotes();
    }
}

// Save quotes to local storage
function saveQuotes() {
    localStorage.setItem('quotes', JSON.stringify(quotes));
    console.log('Saved quotes to local storage');
    
    // Also store last update time in session storage
    sessionStorage.setItem('lastUpdated', new Date().toISOString());
}

// Display a random quote
function showRandomQuote() {
    // Filter quotes if a category is selected
    let filteredQuotes = quotes;
    if (categorySelect.value !== 'all') {
        filteredQuotes = quotes.filter(quote => quote.category === categorySelect.value);
    }
    
    if (filteredQuotes.length === 0) {
        quoteDisplay.innerHTML = '<p>No quotes available in this category.</p>';
        return;
    }
    
    const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
    const quote = filteredQuotes[randomIndex];
    
    // Create DOM elements for the quote
    quoteDisplay.innerHTML = `
        <p class="quote-text">"${quote.text}"</p>
        <p class="quote-category">— ${quote.category}</p>
        <p><small>Last viewed: ${new Date().toLocaleTimeString()}</small></p>
    `;
    
    // Store last viewed quote in session storage
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
    
    const categoryInput = document.createElement('input');
    categoryInput.id = 'newQuoteCategory';
    categoryInput.type = 'text';
    categoryInput.placeholder = 'Enter quote category';
    
    const addButton = document.createElement('button');
    addButton.textContent = 'Add Quote';
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
    
    // Add new quote to array
    const newQuote = { text, category };
    quotes.push(newQuote);
    
    // Clear input fields
    document.getElementById('newQuoteText').value = '';
    document.getElementById('newQuoteCategory').value = '';
    
    // Save to storage and update UI
    saveQuotes();
    updateCategoryFilter();
    
    // Show the newly added quote
    quoteDisplay.innerHTML = `
        <p class="quote-text">"${newQuote.text}"</p>
        <p class="quote-category">— ${newQuote.category}</p>
        <p><em>New quote added successfully!</em></p>
    `;
}

// Update the category filter dropdown
function updateCategoryFilter() {
    // Get all unique categories
    const categories = ['all', ...new Set(quotes.map(quote => quote.category))];
    
    // Clear existing options
    categorySelect.innerHTML = '';
    
    // Add new options
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category === 'all' ? 'All Categories' : category;
        categorySelect.appendChild(option);
    });
    
    // Add event listener for category change
    categorySelect.addEventListener('change', showRandomQuote);
}

// Export quotes to JSON file
function exportToJson() {
    if (quotes.length === 0) {
        alert('No quotes to export');
        return;
    }
    
    const dataStr = JSON.stringify(quotes, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'quotes.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
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
            
            // Validate each quote
            for (const quote of importedQuotes) {
                if (!quote.text || !quote.category) {
                    throw new Error('Invalid quote format: Each quote must have text and category');
                }
            }
            
            // Replace existing quotes with imported ones
            quotes = importedQuotes;
            saveQuotes();
            updateCategoryFilter();
            showRandomQuote();
            
            alert(`Successfully imported ${importedQuotes.length} quotes`);
        } catch (error) {
            alert('Error importing quotes: ' + error.message);
            console.error('Import error:', error);
        }
        
        // Reset file input
        event.target.value = '';
    };
    fileReader.readAsText(file);
}

// Clear all quotes from storage
function clearStorage() {
    if (confirm('Are you sure you want to clear all quotes? This cannot be undone.')) {
        localStorage.removeItem('quotes');
        sessionStorage.removeItem('lastUpdated');
        quotes = [];
        saveQuotes();
        updateCategoryFilter();
        quoteDisplay.innerHTML = '<p>All quotes have been cleared.</p>';
    }
}

// Initialize the application
init();