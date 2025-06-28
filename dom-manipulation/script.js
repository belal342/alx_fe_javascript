// Initial quotes array
let quotes = [
    { text: "The only way to do great work is to love what you do.", category: "inspiration" },
    { text: "Innovation distinguishes between a leader and a follower.", category: "leadership" },
    { text: "Your time is limited, don't waste it living someone else's life.", category: "life" },
    { text: "Stay hungry, stay foolish.", category: "motivation" },
    { text: "The journey of a thousand miles begins with one step.", category: "inspiration" }
];

// DOM elements
const quoteDisplay = document.getElementById('quoteDisplay');
const newQuoteBtn = document.getElementById('newQuote');
const categorySelect = document.getElementById('categorySelect');
const newQuoteText = document.getElementById('newQuoteText');
const newQuoteCategory = document.getElementById('newQuoteCategory');

// Initialize the app
function init() {
    // Set up event listeners
    newQuoteBtn.addEventListener('click', showRandomQuote);
    
    // Populate category filter
    updateCategoryFilter();
    
    // Show initial random quote
    showRandomQuote();
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
    `;
}

// Add a new quote
function addQuote() {
    const text = newQuoteText.value.trim();
    const category = newQuoteCategory.value.trim();
    
    if (!text || !category) {
        alert('Please enter both quote text and category');
        return;
    }
    
    // Add new quote to array
    const newQuote = { text, category };
    quotes.push(newQuote);
    
    // Clear input fields
    newQuoteText.value = '';
    newQuoteCategory.value = '';
    
    // Update category filter
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

// Initialize the application
init();