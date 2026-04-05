// =====================
// EVENTS PAGE
// =====================

console.log('Events page loading...');

const eventsContainer = document.getElementById('eventsContainer');
const searchInput = document.getElementById('searchInput');
const refreshBtn = document.getElementById('refreshBtn');

let allEvents = [];

function isRegistrationClosed(eventDate) {
    if (!eventDate) return false;
    const parsedDate = new Date(eventDate);
    if (Number.isNaN(parsedDate.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    parsedDate.setHours(0, 0, 0, 0);
    return parsedDate < today;
}

async function refreshEvents() {
    console.log('Refreshing events...');
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.textContent = 'Refreshing...';
    }

    try {
        await loadEvents();
        if (refreshBtn) {
            refreshBtn.textContent = 'Updated!';
            setTimeout(() => {
                refreshBtn.textContent = 'Refresh';
                refreshBtn.disabled = false;
            }, 2000);
        }
    } catch (error) {
        console.error('Error refreshing events:', error);
        if (refreshBtn) {
            refreshBtn.textContent = 'Error';
            setTimeout(() => {
                refreshBtn.textContent = 'Refresh';
                refreshBtn.disabled = false;
            }, 2000);
        }
    }
}

async function loadEvents() {
    try {
        eventsContainer.innerHTML = '<div class="loading">Loading events...</div>';

        const response = await fetch('/api/public-events', { cache: 'no-store' });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || 'Failed to fetch events');

        allEvents = data?.events || [];

        if (allEvents.length === 0) {
            eventsContainer.innerHTML = `
                <div class="no-events">
                    <h2>No Events Available</h2>
                    <p>Check back soon for upcoming events!</p>
                </div>
            `;
            return;
        }

        displayEvents(allEvents);
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

    eventsContainer.innerHTML = events.map((event) => {
        const registrationClosed = isRegistrationClosed(event.date);
        const flyerMarkup = event.flyer_url
            ? `<img class="event-flyer" src="${escapeHtml(event.flyer_url)}" alt="${escapeHtml(event.title)} flyer">`
            : '<div class="event-flyer event-flyer-placeholder">Event Flyer</div>';

        const fullDate = new Date(event.date).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });

        return `
            <div class="event-card" tabindex="0">
                <div class="event-card-inner">
                    <div class="event-card-face event-card-front">
                        ${flyerMarkup}
                        <span class="event-card-date">${formatDate(event.date)}</span>
                    </div>
                    <div class="event-card-face event-card-back">
                        <span class="event-card-date event-card-date-back">${formatDate(event.date)}</span>
                        <div class="event-card-body">
                            <h3>${escapeHtml(event.title)}</h3>
                            <span class="date">${fullDate}</span>
                            <p>${escapeHtml(event.description || 'No description available')}</p>
                            ${registrationClosed
                ? `<div class="event-status-message">
                                    <span class="event-status-pill">Registration Closed</span>
                                    <p>Thank you to everyone who supported and helped make this event successful.</p>
                               </div>`
                : `<button class="event-overlay-register" onclick="registerEvent('${escapeJsString(String(event.id))}')">
                                    Register Now
                               </button>`}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (match) => map[match]);
}

function escapeJsString(text) {
    if (text == null) return '';
    return String(text)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\r/g, '\\r')
        .replace(/\n/g, '\\n');
}

function registerEvent(eventId) {
    window.location.href = `event.html?event_id=${encodeURIComponent(eventId)}`;
}

if (eventsContainer) {
    eventsContainer.addEventListener('click', (event) => {
        const registerButton = event.target.closest('.event-overlay-register');
        if (registerButton) return;

        const card = event.target.closest('.event-card');
        if (!card) return;

        card.classList.toggle('is-flipped');
    });

    eventsContainer.addEventListener('focusin', (event) => {
        const card = event.target.closest('.event-card');
        if (card) card.classList.add('is-flipped');
    });

    eventsContainer.addEventListener('focusout', (event) => {
        const card = event.target.closest('.event-card');
        if (!card) return;

        setTimeout(() => {
            if (!card.contains(document.activeElement)) {
                card.classList.remove('is-flipped');
            }
        }, 0);
    });
}

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();

        if (!searchTerm) {
            displayEvents(allEvents);
            return;
        }

        const filtered = allEvents.filter((event) =>
            event.title.toLowerCase().includes(searchTerm) ||
            (event.description || '').toLowerCase().includes(searchTerm)
        );

        displayEvents(filtered);
    });
}

if (refreshBtn) {
    refreshBtn.addEventListener('click', refreshEvents);
    console.log('Refresh button listener attached');
} else {
    console.warn('Refresh button not found');
}

setInterval(() => {
    if (document.hidden) return;
    console.log('Auto-refreshing events...');
    loadEvents().catch((error) => console.error('Auto-refresh error:', error));
}, 60000);

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM ready - loading events');
    loadEvents();
});
