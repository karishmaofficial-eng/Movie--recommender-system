// Global State
let allMovieTitles = [];
let highlightedIndex = -1;

// DOM Elements
const searchInput = document.getElementById('movie-search');
const clearSearchBtn = document.getElementById('clear-search-btn');
const searchBtn = document.getElementById('search-btn');
const autocompleteList = document.getElementById('autocomplete-list');
const loader = document.getElementById('loader');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');

const selectedMovieSection = document.getElementById('selected-movie-section');
const selectedMoviePoster = document.getElementById('selected-movie-poster');
const selectedMovieTitle = document.getElementById('selected-movie-title');
const selectedMovieDirector = document.getElementById('selected-movie-director');
const selectedMovieGenres = document.getElementById('selected-movie-genres');
const selectedMovieOverview = document.getElementById('selected-movie-overview');
const selectedMovieCast = document.getElementById('selected-movie-cast');

const recommendationsSection = document.getElementById('recommendations-section');
const recommendationsGrid = document.getElementById('recommendations-grid');

// TMDB Configurations
const TMDB_API_KEY = '8265bd1679663a7ea12ac168da84d2e8'; // Shared TMDB API key for learning purposes
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchMovieTitles();
    setupEventListeners();
});

// Fetch all titles for instant autocomplete filtering
async function fetchMovieTitles() {
    try {
        const response = await fetch('/api/movies');
        if (response.ok) {
            allMovieTitles = await response.json();
            console.log(`Loaded ${allMovieTitles.length} titles for autocomplete.`);
        }
    } catch (error) {
        console.error('Failed to load movie titles for autocomplete:', error);
    }
}

// Event Listeners setup
function setupEventListeners() {
    // Input key/change events
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keydown', handleSearchKeydown);
    
    // Buttons
    searchBtn.addEventListener('click', () => triggerRecommendation(searchInput.value));
    clearSearchBtn.addEventListener('click', clearSearch);
    
    // Click outside search suggestions closes dropdown
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-box-container')) {
            closeAutocomplete();
        }
    });
}

// Handle search input values and autocomplete list populating
function handleSearchInput() {
    const query = searchInput.value.trim();
    highlightedIndex = -1;
    
    if (query.length > 0) {
        clearSearchBtn.style.display = 'block';
        showSuggestions(query);
    } else {
        clearSearchBtn.style.display = 'none';
        closeAutocomplete();
    }
}

// Show auto-suggestions in dropdown list
function showSuggestions(query) {
    const matchingMovies = allMovieTitles
        .filter(title => title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 8); // Max 8 suggestions
        
    if (matchingMovies.length === 0) {
        closeAutocomplete();
        return;
    }
    
    autocompleteList.innerHTML = '';
    matchingMovies.forEach((title, index) => {
        const li = document.createElement('li');
        
        // Highlight query match in string
        const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
        const highlightedText = title.replace(regex, '<strong>$1</strong>');
        
        li.innerHTML = `<i class="fa-solid fa-film"></i> ${highlightedText}`;
        li.addEventListener('click', () => {
            searchInput.value = title;
            closeAutocomplete();
            triggerRecommendation(title);
        });
        
        autocompleteList.appendChild(li);
    });
    
    autocompleteList.style.display = 'block';
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Autocomplete Keyboard navigation support (Arrow Keys & Enter)
function handleSearchKeydown(e) {
    const items = autocompleteList.querySelectorAll('li');
    if (!items.length) return;
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        highlightedIndex = (highlightedIndex + 1) % items.length;
        updateActiveSuggestion(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        highlightedIndex = (highlightedIndex - 1 + items.length) % items.length;
        updateActiveSuggestion(items);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedIndex > -1 && items[highlightedIndex]) {
            items[highlightedIndex].click();
        } else {
            triggerRecommendation(searchInput.value);
            closeAutocomplete();
        }
    } else if (e.key === 'Escape') {
        closeAutocomplete();
    }
}

function updateActiveSuggestion(items) {
    items.forEach((item, index) => {
        if (index === highlightedIndex) {
            item.classList.add('active');
            searchInput.value = item.textContent.trim();
        } else {
            item.classList.remove('active');
        }
    });
}

function closeAutocomplete() {
    autocompleteList.style.display = 'none';
    autocompleteList.innerHTML = '';
    highlightedIndex = -1;
}

function clearSearch() {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    closeAutocomplete();
    
    selectedMovieSection.style.display = 'none';
    recommendationsSection.style.display = 'none';
    errorMessage.style.display = 'none';
}

// Main API call function to fetch recommendation calculations from Flask backend
async function triggerRecommendation(title) {
    if (!title.trim()) return;
    
    closeAutocomplete();
    showLoader();
    
    try {
        const response = await fetch(`/api/recommend?title=${encodeURIComponent(title)}`);
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Movie not found.');
        }
        
        const data = await response.json();
        renderResults(data);
    } catch (error) {
        showError(error.message);
    }
}

function showLoader() {
    loader.style.display = 'flex';
    errorMessage.style.display = 'none';
    selectedMovieSection.style.display = 'none';
    recommendationsSection.style.display = 'none';
}

function showError(msg) {
    loader.style.display = 'none';
    errorText.textContent = msg;
    errorMessage.style.display = 'flex';
}

// Render selected movie details and the recommendation grid
async function renderResults(data) {
    loader.style.display = 'none';
    
    const movie = data.movie;
    const recs = data.recommendations;
    
    // 1. Populate Selected Movie Card
    selectedMovieTitle.textContent = movie.title;
    selectedMovieDirector.textContent = movie.director ? movie.director : 'Director Unknown';
    selectedMovieOverview.textContent = movie.overview;
    
    // Populate genres
    selectedMovieGenres.innerHTML = '';
    if (movie.genres && movie.genres.length > 0) {
        movie.genres.forEach(g => {
            const badge = document.createElement('span');
            badge.className = 'genre-badge';
            badge.textContent = g;
            selectedMovieGenres.appendChild(badge);
        });
    } else {
        selectedMovieGenres.innerHTML = '<span class="badge">N/A</span>';
    }
    
    // Populate cast
    selectedMovieCast.innerHTML = '';
    if (movie.cast && movie.cast.length > 0) {
        movie.cast.forEach(actor => {
            const badge = document.createElement('span');
            badge.className = 'cast-badge';
            badge.textContent = actor;
            selectedMovieCast.appendChild(badge);
        });
    } else {
        selectedMovieCast.innerHTML = '<span class="badge">N/A</span>';
    }
    
    // Fetch Poster for selected movie
    fetchAndDisplayPoster(movie.id, movie.title, selectedMoviePoster);
    
    // 2. Populate Recommendations Grid
    recommendationsGrid.innerHTML = '';
    recs.forEach(rec => {
        const card = document.createElement('div');
        card.className = 'recommendation-card glass-panel';
        
        // Setup details text
        const genreBadges = rec.genres.slice(0, 2).map(g => `<span class="card-genre-badge">${g}</span>`).join('') || '<span class="card-genre-badge">Movie</span>';
        const similarityPercentage = Math.round(rec.score * 100);
        
        card.innerHTML = `
            <div class="card-poster-wrapper">
                <img src="" alt="${rec.title} Poster" class="card-poster" id="poster-rec-${rec.id}">
                <div class="score-badge"><i class="fa-solid fa-fire"></i> ${similarityPercentage}% Match</div>
            </div>
            <div class="card-content">
                <h4 class="card-title" title="${rec.title}">${rec.title}</h4>
                <div class="card-genres">${genreBadges}</div>
                <p class="card-overview">${rec.overview || 'No description available for this recommendation.'}</p>
                <button class="recommend-sim-btn" data-title="${rec.title}">
                    <i class="fa-solid fa-sparkles"></i>
                    <span>Match Similar</span>
                </button>
            </div>
        `;
        
        // Add card to grid
        recommendationsGrid.appendChild(card);
        
        // Fetch poster for this card
        const cardImg = card.querySelector(`#poster-rec-${rec.id}`);
        fetchAndDisplayPoster(rec.id, rec.title, cardImg);
        
        // Wire up "Match Similar" recommendation surfing button
        const simBtn = card.querySelector('.recommend-sim-btn');
        simBtn.addEventListener('click', () => {
            searchInput.value = rec.title;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            triggerRecommendation(rec.title);
        });
    });
    
    // Make containers visible with CSS fade-in animations
    selectedMovieSection.style.display = 'block';
    recommendationsSection.style.display = 'block';
}

// Fetch poster path from TMDB API with Canvas graphics placeholder fallback
async function fetchAndDisplayPoster(movieId, movieTitle, imgElement) {
    try {
        const response = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}`);
        
        if (!response.ok) {
            throw new Error('Poster not found via TMDB API.');
        }
        
        const data = await response.json();
        
        if (data.poster_path) {
            imgElement.src = `${TMDB_IMAGE_BASE_URL}${data.poster_path}`;
            return;
        }
        
        // If poster path doesn't exist
        generateCanvasPoster(movieTitle, imgElement);
    } catch (error) {
        // Fallback to locally generated Canvas graphic on API fail or offline
        generateCanvasPoster(movieTitle, imgElement);
    }
}

// Fallback Canvas graphic poster generator
function generateCanvasPoster(title, imgElement) {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');
    
    // Create rich dark background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 450);
    gradient.addColorStop(0, '#1e1b4b'); // indigo-950
    gradient.addColorStop(0.5, '#0f172a'); // slate-900
    gradient.addColorStop(1, '#311042'); // purple-950
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 300, 450);
    
    // Add film borders decorations
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 290, 440);
    
    // Draw stylized camera/film logo watermark
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.font = 'bold 120px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎬', 150, 200);
    
    // Text style configs for Title
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 10;
    
    // Wrap Title words properly to fit poster
    const words = title.split(' ');
    let lines = [];
    let currentLine = '';
    const maxWidth = 240;
    
    ctx.font = 'bold 24px "Outfit", sans-serif';
    
    for (let n = 0; n < words.length; n++) {
        let testLine = currentLine + words[n] + ' ';
        let metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
            lines.push(currentLine.trim());
            currentLine = words[n] + ' ';
        } else {
            currentLine = testLine;
        }
    }
    lines.push(currentLine.trim());
    
    // Render text lines centered
    const lineHeight = 32;
    const startY = 225 - ((lines.length - 1) * lineHeight) / 2;
    
    lines.forEach((line, i) => {
        ctx.fillText(line, 150, startY + (i * lineHeight));
    });
    
    // Draw brand tag at bottom
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '600 12px "Outfit", sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('CINEMATCH', 150, 410);
    
    // Set element source
    imgElement.src = canvas.toDataURL('image/png');
}
