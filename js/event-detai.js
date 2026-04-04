// =====================
// EVENT DETAIL & REGISTRATION
// =====================

console.log('✅ event-detai.js loaded');
window.__eventDetailLoaded = true;

const eventDetailsDiv = document.getElementById('eventDetails');
const registrationForm = document.getElementById('registrationForm');
const questionsContainer = document.getElementById('questionsContainer');
const successMessage = document.getElementById('successMessage');

let currentEvent = null;
let currentQuestions = [];

// Get event_id from URL
function getEventIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('event_id');
    if (!raw) return null;
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
}

// Load event details and questions
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
        const matched = events.find(item => String(item.id) === String(eventId));
        if (!matched) {
            showError('Event not found');
            return;
        }

        currentEvent = matched;

        // Display event details
        eventDetailsDiv.innerHTML = `
            <h1>${escapeHtml(currentEvent.title)}</h1>
            <div class="event-meta">
                <div class="event-meta-item">
                    <span>📅</span>
                    <span>${new Date(currentEvent.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })}</span>
                </div>
            </div>
            <div class="event-description">
                <p>${escapeHtml(currentEvent.description || 'No description available')}</p>
            </div>
        `;

        // Fetch questions
        const questionRes = await fetch(`/api/public-questions?event_id=${encodeURIComponent(eventId)}`, { cache: 'no-store' });
        const questionData = await questionRes.json().catch(() => null);
        if (!questionRes.ok) throw new Error(questionData?.error || 'Failed to fetch questions');

        currentQuestions = questionData?.questions || [];
        console.log('Loaded questions:', currentQuestions.length);

        // Generate form
        generateDynamicForm();

        // Show form
        registrationForm.style.display = 'block';
    } catch (error) {
        console.error('Error loading event details:', error);
        showError('Failed to load event details');
        alert(`Failed to load event details: ${error?.message || error}`);
    }
}

// Expose for the shim (without changing HTML)
window.__loadEventDetails = loadEventDetails;

// Generate dynamic registration form
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

// Create form field based on question type
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
                ${(question.options || []).map(opt => `
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

        default:
            fieldHTML += `<input type="text" id="q${index}" name="q${index}" ${isRequired ? 'required' : ''}>`;
    }

    div.innerHTML = fieldHTML;
    return div;
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

// Collect form data
function collectFormData() {
    const answers = {};

    currentQuestions.forEach((question, index) => {
        const questionId = question.id;
        const questionType = question.type;

        if (questionType === 'checkbox') {
            // Collect all checked checkboxes
            const checkboxes = document.querySelectorAll(`input[name="q${index}"]:checked`);
            answers[questionId] = Array.from(checkboxes).map(cb => cb.value);
        } else {
            // Get single value
            const element = document.querySelector(`[name="q${index}"]`);
            answers[questionId] = element ? element.value : '';
        }
    });

    return answers;
}

// Handle form submission
registrationForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
        const client = await window.waitForSupabaseClient();
        // Collect data
        const answers = collectFormData();

        // Submit to Supabase
        const { error } = await client
            .from('responses')
            .insert({
                event_id: currentEvent.id,
                answers
            });
        if (error) throw error;

        // Hide form and show success message
        registrationForm.style.display = 'none';
        successMessage.style.display = 'block';

        // Scroll to success message
        successMessage.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error submitting registration:', error);
        showError('Failed to submit registration. Please try again.');
        alert('Failed to submit registration. Please try again.');
    }
});

// Show error message
function showError(message) {
    eventDetailsDiv.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
}

// Load event details when page loads
document.addEventListener('DOMContentLoaded', loadEventDetails);
