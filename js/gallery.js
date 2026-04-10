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

function buildImageSlideshowMarkup(images, title, slideshowId) {
    return `
        <div class="event-slideshow" data-slideshow-id="${escapeHtml(slideshowId)}">
            <div class="event-slideshow-frame">
                <button type="button" class="slideshow-nav prev" data-direction="-1" aria-label="Previous image">‹</button>
                <img class="event-slideshow-image" src="${escapeHtml(images[0])}" alt="${escapeHtml(title)} highlight image">
                <button type="button" class="slideshow-nav next" data-direction="1" aria-label="Next image">›</button>
            </div>
            <div class="slideshow-dots">
                ${images.map((_, index) => `
                    <button type="button" class="slideshow-dot ${index === 0 ? 'active' : ''}" data-index="${index}" aria-label="Go to image ${index + 1}"></button>
                `).join('')}
            </div>
        </div>
    `;
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
            <section class="gallery-event-block" data-images='${escapeHtml(JSON.stringify(result.gallery_images || []))}'>
                <div class="gallery-event-header">
                    <h3 class="gallery-event-title">${escapeHtml(event.title)}</h3>
                    <p class="gallery-event-date">${new Date(event.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div class="winners-showcase">
                    ${Array.isArray(result.winners) && result.winners.length ? `
                        <div class="winner-podium">
                            ${buildWinnerPodiumMarkup(result.winners)}
                        </div>
                    ` : ''}
                    ${Array.isArray(result.gallery_images) && result.gallery_images.length
                        ? buildImageSlideshowMarkup(result.gallery_images, event.title, `gallery-${event.id}`)
                        : ''}
                </div>
            </section>
        `).join('');

        bindGallerySlideshows();
    } catch (error) {
        console.error('Error loading gallery:', error);
        galleryResults.innerHTML = '<div class="error">Failed to load winners gallery.</div>';
    }
}

document.addEventListener('DOMContentLoaded', loadGalleryResults);

function bindGallerySlideshows() {
    document.querySelectorAll('.event-slideshow[data-slideshow-id]').forEach((slideshow) => {
        const slides = Array.from(slideshow.querySelectorAll('.slideshow-dot'));
        const imageEl = slideshow.querySelector('.event-slideshow-image');
        const images = slides.map((_, index) => {
            const eventBlock = slideshow.closest('.gallery-event-block');
            const data = eventBlock?.dataset.images;
            if (!data) return null;
            try {
                return JSON.parse(data)[index] || null;
            } catch {
                return null;
            }
        }).filter(Boolean);

        if (!imageEl || !images.length) return;

        let currentIndex = 0;
        const renderSlide = () => {
            imageEl.src = images[currentIndex];
            slides.forEach((dot, index) => dot.classList.toggle('active', index === currentIndex));
        };

        slideshow.querySelectorAll('.slideshow-nav').forEach((button) => {
            button.addEventListener('click', () => {
                const direction = Number(button.dataset.direction || '0');
                currentIndex = (currentIndex + direction + images.length) % images.length;
                renderSlide();
            });
        });

        slides.forEach((dot) => {
            dot.addEventListener('click', () => {
                currentIndex = Number(dot.dataset.index || '0');
                renderSlide();
            });
        });

        if (images.length > 1) {
            window.setInterval(() => {
                currentIndex = (currentIndex + 1) % images.length;
                renderSlide();
            }, 3800);
        }
    });
}

function buildWinnerPodiumMarkup(winners) {
    const winnerByRank = new Map(
        winners
            .filter((winner) => winner?.name)
            .sort((a, b) => Number(a.rank) - Number(b.rank))
            .slice(0, 3)
            .map((winner) => [Number(winner.rank), winner])
    );
    const displayOrder = [2, 1, 3];

    return displayOrder.map((rank) => {
        const winner = winnerByRank.get(rank);
        if (!winner) return '';

        return `
            <article class="podium-card podium-rank-${rank}">
                <div class="podium-medal medal-rank-${rank}">
                    <div class="podium-medal-ribbon"></div>
                    <div class="podium-medal-disc">${String(rank).padStart(2, '0')}</div>
                    <div class="podium-laurel left"></div>
                    <div class="podium-laurel right"></div>
                </div>
                <span class="winner-rank">${formatWinnerRank(rank)}</span>
                <h4 class="winner-name">${escapeHtml(winner.name)}</h4>
            </article>
        `;
    }).join('');
}
