// ===============================================================
// EVENT DETAIL & REGISTRATION
// ===============================================================

console.log('event-detai.js loaded');
window.__eventDetailLoaded = true;

const eventDetailsDiv = document.getElementById('eventDetails');
const eventWinnersSection = document.getElementById('eventWinnersSection');
const registrationForm = document.getElementById('registrationForm');
const questionsContainer = document.getElementById('questionsContainer');
const successMessage = document.getElementById('successMessage');
const registrationSubmitBtn = registrationForm?.querySelector('button[type="submit"]');
const registrationSection = document.querySelector('.registration-section');
const registrationWrapper = document.querySelector('.registration-wrapper');

let currentEvent = null;
let currentQuestions = [];
let currentEventId = null;
let registrationSubmitting = false;
let currentEventResult = null;
let eventImageSlideIndex = 0;

function getRegistrationStorageKey(eventId) {
    return `event-registration-submitted:${String(eventId || '')}`;
}

function hasSubmittedRegistration(eventId) {
    try {
        return window.localStorage.getItem(getRegistrationStorageKey(eventId)) === '1';
    } catch {
        return false;
    }
}

function markRegistrationSubmitted(eventId) {
    try {
        window.localStorage.setItem(getRegistrationStorageKey(eventId), '1');
    } catch {
        // Ignore storage errors and still allow the success flow.
    }
}

function showAlreadyRegisteredMessage() {
    registrationForm.style.display = 'none';
    successMessage.style.display = 'block';
    successMessage.innerHTML = `
        <h2>Registration Already Submitted</h2>
        <p>You have already filled this registration form on this device.</p>
        <a href="events.html" class="btn btn-primary">Back to Events</a>
    `;
}

function isRegistrationClosed(eventDate) {
    if (!eventDate) return false;
    const parsedDate = new Date(eventDate);
    if (Number.isNaN(parsedDate.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    parsedDate.setHours(0, 0, 0, 0);
    return parsedDate < today;
}

function getEventIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('event_id');
}

async function loadEventDetails() {
    const eventId = getEventIdFromUrl();
    currentEventId = eventId;

    if (!eventId) {
        showError('No event selected');
        return;
    }

    try {
        console.log('Loading event details for event_id:', eventId);
        const [eventRes, eventResultRes] = await Promise.all([
            fetch('/api/public-events?include_results=1', { cache: 'no-store' }),
            Promise.resolve({ ok: true, json: async () => null })
        ]);
        const eventData = await eventRes.json().catch(() => null);
        const eventResultData = eventData;
        if (!eventRes.ok) throw new Error(eventData?.error || 'Failed to fetch events');

        const events = eventData?.events || [];
        const matched = events.find((item) => String(item.id) === String(eventId));
        if (!matched) {
            showError('Event not found');
            return;
        }

        currentEvent = matched;
        currentEventResult = (eventResultData?.results || []).find((item) => String(item.event_id) === String(eventId)) || null;
        const registrationClosed = isRegistrationClosed(currentEvent.date);

        if (registrationSection) {
            registrationSection.classList.toggle('closed-event-page', registrationClosed);
        }
        if (registrationWrapper) {
            registrationWrapper.classList.toggle('closed-event-page', registrationClosed);
        }

        const formattedDate = new Date(currentEvent.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        eventDetailsDiv.innerHTML = registrationClosed
            ? `
                <div class="event-hero-title-wrap closed-event-title-wrap">
                    <h1 class="event-hero-title">${escapeHtml(currentEvent.title)}</h1>
                </div>
            `
            : `
                <div class="event-hero-title-wrap">
                    <p class="event-kicker">Upcoming Event</p>
                    <h1 class="event-hero-title">${escapeHtml(currentEvent.title)}</h1>
                </div>
                <div class="event-hero-card">
                    ${currentEvent.flyer_url
                ? `<div class="event-hero-image-wrap">
                            <img class="event-hero-image" src="${escapeHtml(currentEvent.flyer_url)}" alt="${escapeHtml(currentEvent.title)} flyer">
                       </div>`
                : ''}
                    <div class="event-meta">
                        <div class="event-meta-item">
                            <span class="event-meta-icon">Date</span>
                            <span>${formattedDate}</span>
                        </div>
                    </div>
                    <div class="event-description">
                        <p>${escapeHtml(currentEvent.description || 'No description available')}</p>
                    </div>
                </div>
            `;

        renderWinnersSection(registrationClosed);

        const questionRes = await fetch(`/api/public-questions?event_id=${encodeURIComponent(eventId)}`, { cache: 'no-store' });
        const questionData = await questionRes.json().catch(() => null);
        if (!questionRes.ok) throw new Error(questionData?.error || 'Failed to fetch questions');

        currentQuestions = questionData?.questions || [];
        console.log('Loaded questions:', currentQuestions.length);

        generateDynamicForm();
        if (registrationClosed) {
            registrationForm.style.display = 'none';
            successMessage.style.display = 'none';
        } else if (hasSubmittedRegistration(eventId)) {
            showAlreadyRegisteredMessage();
        } else {
            registrationForm.style.display = 'block';
            successMessage.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading event details:', error);
        showError('Failed to load event details');
        alert(`Failed to load event details: ${error?.message || error}`);
    }
}

window.__loadEventDetails = loadEventDetails;

function generateDynamicForm() {
    questionsContainer.innerHTML = '';

    if (currentQuestions.length === 0) {
        questionsContainer.innerHTML = '<p>This event has no questions to answer.</p>';
        return;
    }

    currentQuestions.forEach((question, index) => {
        const formGroup = createFormField(question, index);
        questionsContainer.appendChild(formGroup);
    });
}

function renderWinnersSection(registrationClosed) {
    if (!eventWinnersSection) return;

    const winners = Array.isArray(currentEventResult?.winners)
        ? currentEventResult.winners.filter((winner) => winner?.name).sort((a, b) => Number(a.rank) - Number(b.rank)).slice(0, 3)
        : [];
    const galleryImages = Array.isArray(currentEventResult?.gallery_images)
        ? currentEventResult.gallery_images.filter(Boolean)
        : [];

    if (!registrationClosed || (!winners.length && !galleryImages.length) || !currentEventResult?.gallery_enabled) {
        eventWinnersSection.style.display = 'none';
        eventWinnersSection.innerHTML = '';
        return;
    }

    eventWinnersSection.style.display = 'block';
    eventWinnersSection.innerHTML = `
        <div class="event-winners-header">
            <h2>Top Three Winners</h2>
            <p>${escapeHtml(currentEvent?.title || 'This event')} highlights and top performers after the deadline.</p>
        </div>
        <div class="winners-showcase">
            ${winners.length ? `<div class="winner-podium">
                ${buildWinnerPodiumMarkup(winners)}
            </div>` : ''}
            ${galleryImages.length ? buildImageSlideshowMarkup(galleryImages, currentEvent?.title || 'Event') : ''}
        </div>
    `;

    if (galleryImages.length) {
        bindImageSlideshow(eventWinnersSection, galleryImages, currentEvent?.title || 'Event');
    }
}

function buildWinnerPodiumMarkup(winners) {
    const winnerByRank = new Map(winners.map((winner) => [Number(winner.rank), winner]));
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
                <h3 class="winner-name">${escapeHtml(winner.name)}</h3>
            </article>
        `;
    }).join('');
}

function formatWinnerRank(rank) {
    const value = Number(rank);
    if (value === 1) return '1st Prize';
    if (value === 2) return '2nd Prize';
    if (value === 3) return '3rd Prize';
    return `${value || ''} Prize`.trim();
}

function buildImageSlideshowMarkup(images, title) {
    const safeTitle = escapeHtml(title);
    return `
        <div class="event-slideshow" data-slideshow="event">
            <div class="event-slideshow-frame">
                <button type="button" class="slideshow-nav prev" data-direction="-1" aria-label="Previous image">‹</button>
                <img class="event-slideshow-image" src="${escapeHtml(images[0])}" alt="${safeTitle} highlight image">
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

function bindImageSlideshow(container, images, title) {
    const slideshow = container.querySelector('[data-slideshow="event"]');
    if (!slideshow) return;

    const imageEl = slideshow.querySelector('.event-slideshow-image');
    const dots = Array.from(slideshow.querySelectorAll('.slideshow-dot'));
    const safeTitle = escapeHtml(title);

    const renderSlide = () => {
        if (!imageEl) return;
        const imageUrl = images[eventImageSlideIndex] || images[0];
        imageEl.src = imageUrl;
        imageEl.alt = `${safeTitle} highlight image ${eventImageSlideIndex + 1}`;
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === eventImageSlideIndex);
        });
    };

    slideshow.querySelectorAll('.slideshow-nav').forEach((button) => {
        button.addEventListener('click', () => {
            const direction = Number(button.dataset.direction || '0');
            eventImageSlideIndex = (eventImageSlideIndex + direction + images.length) % images.length;
            renderSlide();
        });
    });

    dots.forEach((dot) => {
        dot.addEventListener('click', () => {
            eventImageSlideIndex = Number(dot.dataset.index || '0');
            renderSlide();
        });
    });

    if (images.length > 1) {
        window.clearInterval(window.__eventSlideshowTimer);
        window.__eventSlideshowTimer = window.setInterval(() => {
            eventImageSlideIndex = (eventImageSlideIndex + 1) % images.length;
            renderSlide();
        }, 3500);
    }

    renderSlide();
}

function createFormField(question, index) {
    const div = document.createElement('div');
    div.className = 'form-group';
    const isRequired = question.required !== false;

    let fieldHTML = `<label for="q${index}" class="${isRequired ? 'required' : ''}">${escapeHtml(question.question)}</label>`;

    switch (question.type) {
        case 'text':
            fieldHTML += `<input type="text" id="q${index}" name="q${index}" ${isRequired ? 'required' : ''} placeholder="Enter your answer">`;
            break;
        case 'email':
            fieldHTML += `<input type="email" id="q${index}" name="q${index}" ${isRequired ? 'required' : ''} placeholder="Enter your email">`;
            break;
        case 'number':
            fieldHTML += `<input type="number" id="q${index}" name="q${index}" ${isRequired ? 'required' : ''} placeholder="Enter a number">`;
            break;
        case 'textarea':
            fieldHTML += `<textarea id="q${index}" name="q${index}" ${isRequired ? 'required' : ''} placeholder="Enter your answer"></textarea>`;
            break;
        case 'select':
            fieldHTML += `<select id="q${index}" name="q${index}" ${isRequired ? 'required' : ''}>
                <option value="">-- Select an option --</option>
                ${(question.options || []).map((opt) => `
                    <option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>
                `).join('')}
            </select>`;
            break;
        case 'radio':
            fieldHTML += '<div class="radio-group">';
            (question.options || []).forEach((opt, optIndex) => {
                fieldHTML += `
                    <div class="radio-item">
                        <input type="radio" id="q${index}_${optIndex}" name="q${index}" value="${escapeHtml(opt)}" ${isRequired ? 'required' : ''}>
                        <label for="q${index}_${optIndex}">${escapeHtml(opt)}</label>
                    </div>
                `;
            });
            fieldHTML += '</div>';
            break;
        case 'checkbox':
            fieldHTML += '<div class="checkbox-group">';
            (question.options || []).forEach((opt, optIndex) => {
                fieldHTML += `
                    <div class="checkbox-item">
                        <input type="checkbox" id="q${index}_${optIndex}" name="q${index}" value="${escapeHtml(opt)}">
                        <label for="q${index}_${optIndex}">${escapeHtml(opt)}</label>
                    </div>
                `;
            });
            fieldHTML += '</div>';
            break;
        case 'file':
            fieldHTML += `
                <input type="file" id="q${index}" name="q${index}" ${isRequired ? 'required' : ''} ${Array.isArray(question.options) && question.options.length ? `accept="${escapeHtml(question.options.join(','))}"` : ''}>
                <small style="display:block; margin-top:6px; color:#64748b;">
                    ${Array.isArray(question.options) && question.options.length ? `Allowed: ${escapeHtml(question.options.join(', '))}` : 'Upload a file'}
                </small>
            `;
            break;
        case 'group_members':
            const maxMembers = Math.min(
                10,
                Math.max(1, Number.parseInt(Array.isArray(question.options) ? question.options[0] : question.options, 10) || 2)
            );
            fieldHTML += `
                <div class="group-members-box">
                    <select id="q${index}" name="q${index}" ${isRequired ? 'required' : ''} onchange="toggleGroupMemberFields(${index})">
                        <option value="">Select group size</option>
                        ${Array.from({ length: maxMembers }, (_, optionIndex) => `
                            <option value="${optionIndex + 1}">${optionIndex + 1} Member${optionIndex === 0 ? '' : 's'}</option>
                        `).join('')}
                    </select>
                    <div id="groupMembersFields${index}" class="group-members-fields" style="display:none;">
                        ${Array.from({ length: maxMembers }, (_, memberIndex) => `
                            <div
                                class="group-member-card"
                                id="q${index}_memberBlock${memberIndex + 1}"
                                style="${memberIndex === 0 ? '' : 'display:none;'}"
                            >
                                <div style="font-weight:600; color:#1e293b; margin-bottom:8px;">Member ${memberIndex + 1}</div>
                                <input
                                    type="text"
                                    id="q${index}_member${memberIndex + 1}_surname"
                                    name="q${index}_member${memberIndex + 1}_surname"
                                    placeholder="Surname"
                                >
                                <input
                                    type="text"
                                    id="q${index}_member${memberIndex + 1}_name"
                                    name="q${index}_member${memberIndex + 1}_name"
                                    placeholder="Name"
                                >
                                <input
                                    type="text"
                                    id="q${index}_member${memberIndex + 1}_father"
                                    name="q${index}_member${memberIndex + 1}_father"
                                    placeholder="Father Name"
                                >
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            break;
        default:
            fieldHTML += `<input type="text" id="q${index}" name="q${index}" ${isRequired ? 'required' : ''}>`;
    }

    div.innerHTML = fieldHTML;
    return div;
}

function toggleGroupMemberFields(index) {
    const countSelect = document.getElementById(`q${index}`);
    const fieldsWrap = document.getElementById(`groupMembersFields${index}`);
    if (!countSelect || !fieldsWrap) return;

    const count = Number.parseInt(countSelect.value, 10) || 0;
    fieldsWrap.style.display = count ? 'grid' : 'none';

    let memberIndex = 1;
    while (true) {
        const block = document.getElementById(`q${index}_memberBlock${memberIndex}`);
        const surnameInput = document.getElementById(`q${index}_member${memberIndex}_surname`);
        const nameInput = document.getElementById(`q${index}_member${memberIndex}_name`);
        const fatherInput = document.getElementById(`q${index}_member${memberIndex}_father`);
        if (!block || !surnameInput || !nameInput || !fatherInput) break;

        const isVisible = memberIndex <= count;
        block.style.display = isVisible ? 'block' : 'none';
        surnameInput.required = isVisible;
        nameInput.required = isVisible;
        fatherInput.required = isVisible;

        if (!isVisible) {
            surnameInput.value = '';
            nameInput.value = '';
            fatherInput.value = '';
        }
        memberIndex += 1;
    }
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

function collectFormData() {
    const answers = {};

    currentQuestions.forEach((question, index) => {
        const questionId = question.id;
        const questionType = question.type;

        if (questionType === 'checkbox') {
            const checkboxes = document.querySelectorAll(`input[name="q${index}"]:checked`);
            answers[questionId] = Array.from(checkboxes).map((checkbox) => checkbox.value);
        } else if (questionType === 'file') {
            answers[questionId] = document.querySelector(`[name="q${index}"]`)?.files?.[0] || '';
        } else if (questionType === 'group_members') {
            const groupSize = document.querySelector(`[name="q${index}"]`)?.value || '';
            const maxMembers = Number.parseInt(groupSize, 10) || 0;
            const memberNames = [];

            for (let memberIndex = 1; memberIndex <= maxMembers; memberIndex += 1) {
                const surname = document.getElementById(`q${index}_member${memberIndex}_surname`)?.value.trim() || '';
                const name = document.getElementById(`q${index}_member${memberIndex}_name`)?.value.trim() || '';
                const fatherName = document.getElementById(`q${index}_member${memberIndex}_father`)?.value.trim() || '';
                const value = [surname, name, fatherName].filter(Boolean).join(' ');
                if (value) memberNames.push(value);
            }

            answers[questionId] = {
                group_size: groupSize,
                member_names: memberNames
            };
        } else {
            const element = document.querySelector(`[name="q${index}"]`);
            answers[questionId] = element ? element.value : '';
        }
    });

    return answers;
}

async function uploadResponseFile(file) {
    const dataBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result || '');
            const commaIndex = result.indexOf(',');
            resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
        };
        reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });

    return {
        __fileUpload: true,
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        size: file.size || 0,
        dataBase64
    };
}

registrationForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (registrationSubmitting) {
        return;
    }

    try {
        registrationSubmitting = true;
        if (registrationSubmitBtn) {
            registrationSubmitBtn.disabled = true;
            registrationSubmitBtn.textContent = 'Uploading PDF / Submitting...';
        }

        const rawAnswers = collectFormData();
        const answers = {};

        for (const question of currentQuestions) {
            const questionId = question.id;
            const value = rawAnswers[questionId];
            if (question.type === 'file' && value instanceof File) {
                if (registrationSubmitBtn) {
                    registrationSubmitBtn.textContent = `Uploading ${value.name}...`;
                }
                answers[questionId] = await uploadResponseFile(value);
            } else {
                answers[questionId] = value;
            }
        }

        if (registrationSubmitBtn) {
            registrationSubmitBtn.textContent = 'Submitting Registration...';
        }

        const response = await fetch('/api/public-submit-response', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event_id: currentEvent.id,
                answers
            })
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
            throw new Error(data?.error || data?.message || 'Failed to submit response');
        }

        markRegistrationSubmitted(currentEvent?.id || currentEventId);
        registrationForm.style.display = 'none';
        successMessage.style.display = 'block';
        successMessage.innerHTML = `
            <h2>Registration Successful!</h2>
            <p>Your registration has been submitted successfully. This form is now locked on this device.</p>
            <a href="events.html" class="btn btn-primary">Back to Events</a>
        `;
        successMessage.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error submitting registration:', error);
        showError('Failed to submit registration. Please try again.');
        alert('Failed to submit registration. Please try again.');
        registrationSubmitting = false;
        if (registrationSubmitBtn) {
            registrationSubmitBtn.disabled = false;
            registrationSubmitBtn.textContent = 'Submit Registration';
        }
    }
});

function showError(message) {
    eventDetailsDiv.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
}

document.addEventListener('DOMContentLoaded', loadEventDetails);
