// ===============================================================
// EVENT DETAIL & REGISTRATION
// ===============================================================

console.log('event-detai.js loaded');
window.__eventDetailLoaded = true;

const eventDetailsDiv = document.getElementById('eventDetails');
const registrationForm = document.getElementById('registrationForm');
const questionsContainer = document.getElementById('questionsContainer');
const successMessage = document.getElementById('successMessage');

let currentEvent = null;
let currentQuestions = [];

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

    if (!eventId) {
        showError('No event selected');
        return;
    }

    try {
        console.log('Loading event details for event_id:', eventId);
        const eventRes = await fetch('/api/public-events', { cache: 'no-store' });
        const eventData = await eventRes.json().catch(() => null);
        if (!eventRes.ok) throw new Error(eventData?.error || 'Failed to fetch events');

        const events = eventData?.events || [];
        const matched = events.find((item) => String(item.id) === String(eventId));
        if (!matched) {
            showError('Event not found');
            return;
        }

        currentEvent = matched;
        const registrationClosed = isRegistrationClosed(currentEvent.date);

        const formattedDate = new Date(currentEvent.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        eventDetailsDiv.innerHTML = `
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
                ${registrationClosed
                ? `<div class="event-closed-note">
                        <span class="event-status-pill">Registration Closed</span>
                        <h2>Thank You</h2>
                        <p>Thank you to all students, faculty members, coordinators, volunteers, and supporters who helped make this event successful.</p>
                   </div>`
                : ''}
            </div>
        `;

        const questionRes = await fetch(`/api/public-questions?event_id=${encodeURIComponent(eventId)}`, { cache: 'no-store' });
        const questionData = await questionRes.json().catch(() => null);
        if (!questionRes.ok) throw new Error(questionData?.error || 'Failed to fetch questions');

        currentQuestions = questionData?.questions || [];
        console.log('Loaded questions:', currentQuestions.length);

        generateDynamicForm();
        registrationForm.style.display = registrationClosed ? 'none' : 'block';
        successMessage.style.display = 'none';
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
                            <input
                                type="text"
                                id="q${index}_member${memberIndex + 1}"
                                name="q${index}_member${memberIndex + 1}"
                                placeholder="Member ${memberIndex + 1} Name"
                                style="${memberIndex === 0 ? '' : 'display:none;'}"
                            >
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
        const input = document.getElementById(`q${index}_member${memberIndex}`);
        if (!input) break;

        const isVisible = memberIndex <= count;
        input.required = isVisible;
        input.style.display = isVisible ? 'block' : 'none';
        if (!isVisible) input.value = '';
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
                const value = document.getElementById(`q${index}_member${memberIndex}`)?.value.trim() || '';
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

    try {
        const rawAnswers = collectFormData();
        const answers = {};

        for (const question of currentQuestions) {
            const questionId = question.id;
            const value = rawAnswers[questionId];
            if (question.type === 'file' && value instanceof File) {
                answers[questionId] = await uploadResponseFile(value);
            } else {
                answers[questionId] = value;
            }
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

        registrationForm.style.display = 'none';
        successMessage.style.display = 'block';
        successMessage.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error submitting registration:', error);
        showError('Failed to submit registration. Please try again.');
        alert('Failed to submit registration. Please try again.');
    }
});

function showError(message) {
    eventDetailsDiv.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
}

document.addEventListener('DOMContentLoaded', loadEventDetails);
