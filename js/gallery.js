const galleryResults = document.getElementById('galleryResults');

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, (match) => map[match]);
}

function isEventClosed(eventDate) {
    if (!eventDate) return false;
    const parsedDate = new Date(eventDate);
    if (Number.isNaN(parsedDate.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    parsedDate.setHours(0, 0, 0, 0);
    return parsedDate < today;
}

function formatWinnerRank(rank) {
    const value = Number(rank);
    if (value === 1) return '1st Prize';
    if (value === 2) return '2nd Prize';
    if (value === 3) return '3rd Prize';
    return `${value || ''} Prize`.trim();
}

async function loadGalleryResults() {
    if (!galleryResults) return;

    try {
        const [eventsResponse, resultsResponse] = await Promise.all([
            fetch('/api/public-events?include_results=1', { cache: 'no-store' }),
            Promise.resolve({ ok: true, json: async () => null })
        ]);
        const eventsData = await eventsResponse.json().catch(() => null);
        const resultsData = eventsData;

        if (!eventsResponse.ok) throw new Error(eventsData?.error || 'Failed to fetch events');

        const eventsById = new Map((eventsData?.events || []).map((event) => [String(event.id), event]));
        const galleryItems = (resultsData?.results || [])
            .map((result) => ({
                result,
                event: eventsById.get(String(result.event_id))
            }))
            .filter(({ event, result }) => {
                const hasWinners = Array.isArray(result?.winners) && result.winners.length;
                const hasImages = Array.isArray(result?.gallery_images) && result.gallery_images.length;
                return event && result?.gallery_enabled && isEventClosed(event.date) && (hasWinners || hasImages);
            })
            .sort((a, b) => new Date(b.event.date).getTime() - new Date(a.event.date).getTime());

        if (!galleryItems.length) {
            galleryResults.innerHTML = `
                <div class="gallery-event-block">
                    <div class="gallery-event-header">
                        <h3 class="gallery-event-title">No Winner Gallery Yet</h3>
                        <p class="gallery-event-date">Completed events with saved winners will appear here.</p>
                    </div>
                </div>
            `;
            return;
        }

        galleryResults.innerHTML = galleryItems.map(({ event, result }) => `
            <section class="gallery-event-block">
                <div class="gallery-event-header">
                    <h3 class="gallery-event-title">${escapeHtml(event.title)}</h3>
                    <p class="gallery-event-date">${new Date(event.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                ${Array.isArray(result.gallery_images) && result.gallery_images.length ? `
                    <div class="winners-grid" style="margin-bottom:20px;">
                        ${result.gallery_images.map((url, index) => `
                            <article class="winner-card">
                                <img class="winner-card-image" src="${escapeHtml(url)}" alt="${escapeHtml(event.title)} image ${index + 1}">
                            </article>
                        `).join('')}
                    </div>
                ` : ''}
                <div class="winners-grid">
                    ${result.winners
                        .sort((a, b) => Number(a.rank) - Number(b.rank))
                        .slice(0, 3)
                        .map((winner) => `
                            <article class="winner-card">
                                ${winner.image_url
                                    ? `<img class="winner-card-image" src="${escapeHtml(winner.image_url)}" alt="${escapeHtml(winner.name || `Winner ${winner.rank}`)}">`
                                    : `<div class="winner-card-placeholder">${formatWinnerRank(winner.rank)}</div>`}
                                <div class="winner-card-body">
                                    <span class="winner-rank">${formatWinnerRank(winner.rank)}</span>
                                    <h4 class="winner-name">${escapeHtml(winner.name || `Winner ${winner.rank}`)}</h4>
                                </div>
                            </article>
                        `).join('')}
                </div>
            </section>
        `).join('');
    } catch (error) {
        console.error('Error loading gallery:', error);
        galleryResults.innerHTML = '<div class="error">Failed to load winners gallery.</div>';
    }
}

document.addEventListener('DOMContentLoaded', loadGalleryResults);
