// =====================
// EVENTS PAGE
// =====================

console.log('📄 Events Page Loading...');

const eventsContainer = document.getElementById('eventsContainer');
const searchInput = document.getElementById('searchInput');
const refreshBtn = document.getElementById('refreshBtn');

let allEvents = [];

// Refresh events function
async function refreshEvents() {
    console.log('🔄 Refreshing events...');
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.textContent = '⏳ Refreshing...';
    }

    try {
        await loadEvents();
        if (refreshBtn) {
            refreshBtn.textContent = '✓ Updated!';
            setTimeout(() => {
                refreshBtn.textContent = '🔄 Refresh';
                refreshBtn.disabled = false;
            }, 2000);
        }
    } catch (error) {
        console.error('Error refreshing events:', error);
        if (refreshBtn) {
            refreshBtn.textContent = '❌ Error';
            setTimeout(() => {
                refreshBtn.textContent = '🔄 Refresh';
                refreshBtn.disabled = false;
            }, 2000);
        }
    }
}

// Load and display all events
async function loadEvents() {
    try {
        const client = await window.waitForSupabaseClient();
        eventsContainer.innerHTML = '<div class="loading">Loading events...</div>';

        const { data: events, error } = await client
            .from('events')
            .select('*')
            .order('date', { ascending: false });
        if (error) throw error;

        allEvents = events || [];

        if (events.length === 0) {
            eventsContainer.innerHTML = `
                <div class="no-events">
                    <h2>No Events Available</h2>
                    <p>Check back soon for upcoming events!</p>
                </div>
            `;
            return;
        }

        displayEvents(events);
    } catch (error) {
        console.error('Error loading events:', error);
        alert(`Failed to load events: ${error?.message || error}`);
        eventsContainer.innerHTML = `
            <div class="error">
                Failed to load events. Please try again later.
            </div>
        `;
    }
}

// Display events in grid
function displayEvents(events) {
    if (events.length === 0) {
        eventsContainer.innerHTML = `
            <div class="no-events">
                <h2>No Events Found</h2>
                <p>Try adjusting your search or check back soon.</p>
            </div>
        `;
        return;
    }

    eventsContainer.innerHTML = events.map(event => `
        <div class="event-card">
            <div class="event-card-header">
                ${event.flyer_url ? `<img class="event-flyer" src="${escapeHtml(event.flyer_url)}" alt="Event flyer">` : ''}
                <span class="event-card-date">${formatDate(event.date)}</span>
``````````````````````  XXXX                ${event.flyer_url ? `<a class="flyer-registration-link" href="event.html?event_id=${event.id}">Registration Link</a>` : ''}
            </div>
            <div class="event-card-body">
                <h3>${escapeHtml(event.title)}</h3>
                <span class="date">📅 ${new Date(event.date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    })}</span>
                <p>${escapeHtml(event.description || 'No description available')}</p>
                <button class="btn btn-primary" onclick="registerEvent(${event.id})">
                    Register Now
                </button>
            </div>
        </div>
    `).join('');
}

// Format date
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Redirect to registration page
function registerEvent(eventId) {
    window.location.href = `event.html?event_id=${eventId}`;
}

// Search functionality
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();

    if (!searchTerm) {
        displayEvents(allEvents);
        return;
    }

    const filtered = allEvents.filter(event =>
        event.title.toLowerCase().includes(searchTerm) ||
        event.description.toLowerCase().includes(searchTerm)
    );

    displayEvents(filtered);
});

// Refresh button listener
if (refreshBtn) {
    refreshBtn.addEventListener('click', refreshEvents);
    console.log('✅ Refresh button listener attached');
} else {
    console.warn('⚠️  Refresh button not found');
}

// Auto-refresh events every 30 seconds
setInterval(() => {
    console.log('⏰ Auto-refreshing events...');
    loadEvents().catch(error => console.error('Auto-refresh error:', error));
}, 30000);

// Load events when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM Ready - Loading events');
    loadEvents();
});
