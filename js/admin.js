// =====================
// ADMIN DASHBOARD
// =====================

console.log('🚀 Admin Dashboard Loading...');

// Debug: Check if DOM elements exist
console.log('📋 Checking DOM Elements:');
console.log('  - eventsList:', document.getElementById('eventsList') ? '✅' : '❌');
console.log('  - addEventBtn:', document.getElementById('addEventBtn') ? '✅' : '❌');
console.log('  - addQuestionBtn:', document.getElementById('addQuestionBtn') ? '✅' : '❌');
console.log('  - exportExcelBtn:', document.getElementById('exportExcelBtn') ? '✅' : '❌');
console.log('  - exportPdfBtn:', document.getElementById('exportPdfBtn') ? '✅' : '❌');
console.log('  - exportWordBtn:', document.getElementById('exportWordBtn') ? '✅' : '❌');
console.log('  - addEventModal:', document.getElementById('addEventModal') ? '✅' : '❌');
console.log('  - addQuestionModal:', document.getElementById('addQuestionModal') ? '✅' : '❌');

const eventsList = document.getElementById('eventsList');
const noSelection = document.getElementById('noSelection');
const responsesSection = document.getElementById('responsesSection');
const selectedEventTitle = document.getElementById('selectedEventTitle');
const responsesTable = document.getElementById('responsesTable');
const filterInput = document.getElementById('filterInput');
const responseCount = document.getElementById('responseCount');
const exportExcelBtn = document.getElementById('exportExcelBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const exportWordBtn = document.getElementById('exportWordBtn');

// Modal elements
const addEventBtn = document.getElementById('addEventBtn');
const addEventModal = document.getElementById('addEventModal');
const addEventForm = document.getElementById('addEventForm');
const eventTitleInput = document.getElementById('eventTitle');
const eventDescriptionInput = document.getElementById('eventDescription');
const eventDateInput = document.getElementById('eventDate');
const eventFlyerInput = document.getElementById('eventFlyer');
const eventFlyerPreview = document.getElementById('eventFlyerPreview');

// Question modal elements
const addQuestionBtn = document.getElementById('addQuestionBtn');
const addQuestionModal = document.getElementById('addQuestionModal');
const addQuestionForm = document.getElementById('addQuestionForm');
const questionsList = document.getElementById('questionsList');
const optionsGroup = document.getElementById('optionsGroup');

// Debug: Check if external libraries and classes are loaded
console.log('📚 Checking Libraries:');
console.log('  - XLSX:', typeof window.XLSX !== 'undefined' ? '✅' : '❌');
console.log('  - jspdf:', typeof window.jspdf !== 'undefined' ? '✅' : '❌');
console.log('  - docx:', typeof window.docx !== 'undefined' ? '✅' : '❌');
console.log('  - ExportUtils:', typeof ExportUtils !== 'undefined' ? '✅' : '❌');
console.log('  - supabase-js loaded:', typeof supabase !== 'undefined' ? '✅' : '❌');
console.log('  - supabaseClient:', typeof supabaseClient !== 'undefined' ? '✅' : '❌');

let allEvents = [];
let selectedEventId = null;
let selectedEventData = null;
let allResponses = [];
let allQuestions = [];
let tempEventQuestions = []; // Temporary storage for questions before publishing
let editingQuestionId = null;

async function apiRequest(path, { method = 'GET', token, body } = {}) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const r = await fetch(path, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined
    });

    const text = await r.text().catch(() => '');
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = null;
    }

    if (!r.ok) {
        const msg = data?.error || data?.message || text || `${r.status} ${r.statusText}`;
        throw new Error(msg);
    }

    return data;
}

// 🔹 EVENT CREATION FUNCTIONS
function openAddEventModal() {
    addEventModal.style.display = 'flex';
    addEventForm.reset();
    tempEventQuestions = []; // Reset questions
    displayTempQuestions();
    if (eventFlyerPreview) {
        eventFlyerPreview.style.display = 'none';
        eventFlyerPreview.src = '';
    }

    // Set date to tomorrow by default (datetime-local format)
    if (eventDateInput && eventDateInput.type === 'datetime-local') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Format for datetime-local input: YYYY-MM-DDTHH:mm
        const year = tomorrow.getFullYear();
        const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const day = String(tomorrow.getDate()).padStart(2, '0');
        const hours = String(tomorrow.getHours()).padStart(2, '0');
        const minutes = String(tomorrow.getMinutes()).padStart(2, '0');

        eventDateInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
    }
}

function closeAddEventModal() {
    addEventModal.style.display = 'none';
    addEventForm.reset();
    tempEventQuestions = [];
    if (eventFlyerPreview) {
        eventFlyerPreview.style.display = 'none';
        eventFlyerPreview.src = '';
    }
}

if (eventFlyerInput && eventFlyerPreview) {
    eventFlyerInput.addEventListener('change', () => {
        const file = eventFlyerInput.files && eventFlyerInput.files[0] ? eventFlyerInput.files[0] : null;
        if (!file) {
            eventFlyerPreview.style.display = 'none';
            eventFlyerPreview.src = '';
            return;
        }
        eventFlyerPreview.src = URL.createObjectURL(file);
        eventFlyerPreview.style.display = 'block';
    });
}

async function uploadFlyerIfAny() {
    const file = eventFlyerInput && eventFlyerInput.files && eventFlyerInput.files[0] ? eventFlyerInput.files[0] : null;
    if (!file) return null;

    const client = await window.waitForSupabaseClient();
    if (!client.storage) throw new Error('Supabase Storage not available');

    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

    const { error: uploadError } = await client
        .storage
        .from('flyers')
        .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) throw uploadError;

    const { data } = client.storage.from('flyers').getPublicUrl(path);
    return data?.publicUrl || null;
}

// Display temporary questions in the modal
function displayTempQuestions() {
    const container = document.getElementById('eventQuestionsList');

    if (tempEventQuestions.length === 0) {
        container.innerHTML = '<p style="color: #999; font-size: 13px; text-align: center; padding: 20px;">No questions added yet. Click "+ Add Question" to add one.</p>';
        return;
    }

    container.innerHTML = tempEventQuestions.map((q, index) => `
        <div style="background: #f9f9f9; padding: 12px; border-radius: 5px; margin-bottom: 10px; border-left: 3px solid #667eea;">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <p style="margin: 0 0 5px 0; color: #1a2a44; font-weight: 600; font-size: 13px;">${escapeHtml(q.question)}</p>
                    <p style="margin: 0 0 5px 0; color: #999; font-size: 12px;">
                        <span style="background: #e8eaf6; padding: 3px 8px; border-radius: 3px;">${q.type}</span>
                        ${q.options ? ` • Options: ${q.options.join(', ')}` : ''}
                    </p>
                    <p style="margin: 0; color: #999; font-size: 12px;">
                        ${q.required ? '✓ Required' : '○ Optional'}
                    </p>
                </div>
                <button type="button" class="btn-delete" onclick="removeQuestionFromList(${index})" style="padding: 5px 10px; font-size: 12px;">Delete</button>
            </div>
        </div>
    `).join('');
}

// 🔹 QUICK QUESTION FORM HANDLERS
function openQuestionFormModal() {
    const quickQuestionModal = document.getElementById('quickQuestionModal');
    const quickQuestionForm = document.getElementById('quickQuestionForm');

    if (quickQuestionModal && quickQuestionForm) {
        quickQuestionModal.style.display = 'flex';
        quickQuestionForm.reset();
        document.getElementById('quickOptionsGroup').style.display = 'none';
        console.log('✅ Question form opened');
    }
}

function closeQuestionFormModal() {
    const quickQuestionModal = document.getElementById('quickQuestionModal');
    const quickQuestionForm = document.getElementById('quickQuestionForm');

    if (quickQuestionModal) {
        quickQuestionModal.style.display = 'none';
    }
    if (quickQuestionForm) {
        quickQuestionForm.reset();
    }
}

// Show/hide options field based on question type
function updateQuickQuestionTypeDisplay() {
    const type = document.getElementById('quickQuestionType').value;
    const optionsGroup = document.getElementById('quickOptionsGroup');

    if (['select', 'radio', 'checkbox'].includes(type)) {
        optionsGroup.style.display = 'block';
    } else {
        optionsGroup.style.display = 'none';
    }
}

// Remove question from temporary list
function removeQuestionFromList(index) {
    tempEventQuestions.splice(index, 1);
    displayTempQuestions();
    console.log('🗑️  Question removed. Total:', tempEventQuestions.length);
}

// Close modal when clicking outside
addEventModal.addEventListener('click', (e) => {
    if (e.target === addEventModal) {
        closeAddEventModal();
    }
});

// Handle event creation form submission - Batch create event + questions
addEventForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = eventTitleInput.value.trim();
    const description = eventDescriptionInput.value.trim();
    const dateString = eventDateInput.value;

    if (!title || !dateString) {
        alert('Please fill in required fields');
        return;
    }

    try {
        const client = await window.waitForSupabaseClient();
        const { data: sessionData } = await client.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) throw new Error('Not authenticated');

        // Convert datetime-local to ISO format
        const date = new Date(dateString).toISOString();

        addEventBtn.disabled = true;
        addEventBtn.textContent = '⏳ Publishing...';

        console.log('📝 Creating event:', { title, description, date });

        // Upload flyer (optional)
        let flyer_url = null;
        try {
            flyer_url = await uploadFlyerIfAny();
        } catch (flyerErr) {
            console.error('Flyer upload error:', flyerErr);
            alert(`⚠️ Flyer upload failed (event will still publish): ${flyerErr?.message || flyerErr}`);
            flyer_url = null;
        }

        // 1. Create event via admin API (service role; secure)
        const payload = { title, description, date, flyer_url };
        const out = await apiRequest('/api/admin/events', { method: 'POST', token, body: payload });
        const newEvent = out?.event;
        if (!newEvent || !newEvent.id) {
            throw new Error('Could not retrieve created event ID');
        }

        console.log('🆔 New event ID:', newEvent.id);

        // 2. Create all questions via admin API (bulk insert)
        let questionsCreated = 0;
        if (tempEventQuestions.length > 0) {
            const questionsPayload = tempEventQuestions.map(q => ({
                event_id: newEvent.id,
                question: q.question,
                type: q.type,
                options: q.options || null,
                required: !!q.required
            }));

            await apiRequest('/api/admin/questions', { method: 'POST', token, body: { questions: questionsPayload } });
            questionsCreated = tempEventQuestions.length;
        }

        // Show success message
        const message = questionsCreated > 0
            ? `✓ Event published with ${questionsCreated} question${questionsCreated !== 1 ? 's' : ''}!`
            : '✓ Event published! (No questions added)';

        alert(message);

        // Close modal
        closeAddEventModal();

        // Reload events
        await loadEvents();

        addEventBtn.disabled = false;
        addEventBtn.textContent = '➕';
    } catch (error) {
        console.error('Error publishing event:', error);
        alert('❌ Failed to publish event: ' + error.message);
        addEventBtn.disabled = false;
        addEventBtn.textContent = '➕';
    }
});

// Add event listener to button
addEventBtn.addEventListener('click', openAddEventModal);

// 🔹 QUESTION MANAGEMENT FUNCTIONS
function openAddQuestionModal() {
    if (!selectedEventId) {
        alert('Please select an event first');
        return;
    }
    openQuestionModal('add');
}

function openQuestionModal(mode, question) {
    if (!addQuestionModal || !addQuestionForm) return;

    editingQuestionId = mode === 'edit' && question ? String(question.id) : null;
    addQuestionModal.style.display = 'flex';
    addQuestionForm.reset();
    optionsGroup.style.display = 'none';

    const titleEl = addQuestionModal.querySelector('.modal-header h2');
    const submitBtn = addQuestionForm.querySelector('button[type="submit"]');

    if (mode === 'edit' && question) {
        if (titleEl) titleEl.textContent = 'Edit Question';
        if (submitBtn) submitBtn.textContent = 'Save Changes';

        document.getElementById('questionText').value = question.question || '';
        document.getElementById('questionType').value = question.type || '';
        document.getElementById('questionRequired').checked = question.required !== false;
        document.getElementById('questionOptions').value = Array.isArray(question.options) ? question.options.join(', ') : '';
        updateQuestionTypeDisplay();
    } else {
        if (titleEl) titleEl.textContent = 'Add Question to Event';
        if (submitBtn) submitBtn.textContent = 'Add Question';
        document.getElementById('questionRequired').checked = true;
    }
}

function closeAddQuestionModal() {
    addQuestionModal.style.display = 'none';
    addQuestionForm.reset();
    optionsGroup.style.display = 'none';
    editingQuestionId = null;
    const titleEl = addQuestionModal.querySelector('.modal-header h2');
    const submitBtn = addQuestionForm.querySelector('button[type="submit"]');
    if (titleEl) titleEl.textContent = 'Add Question to Event';
    if (submitBtn) submitBtn.textContent = 'Add Question';
}

function updateQuestionTypeDisplay() {
    const type = document.getElementById('questionType').value;
    if (['select', 'radio', 'checkbox'].includes(type)) {
        optionsGroup.style.display = 'block';
    } else {
        optionsGroup.style.display = 'none';
    }
}

// Add question modal close on background click
addQuestionModal.addEventListener('click', (e) => {
    if (e.target === addQuestionModal) {
        closeAddQuestionModal();
    }
});

// Handle add question form submission
addQuestionForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const questionText = document.getElementById('questionText').value.trim();
    const questionType = document.getElementById('questionType').value;
    const questionOptions = document.getElementById('questionOptions').value.trim();
    const isRequired = document.getElementById('questionRequired').checked;

    if (!questionText || !questionType) {
        alert('Please fill in all required fields');
        return;
    }

    // Validate options for select/radio/checkbox
    if (['select', 'radio', 'checkbox'].includes(questionType)) {
        if (!questionOptions) {
            alert('Please add options for this question type');
            return;
        }
    }

    try {
        const client = await window.waitForSupabaseClient();
        const { data: sessionData } = await client.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) throw new Error('Not authenticated');

        addQuestionBtn.disabled = true;
        addQuestionBtn.textContent = '⏳';

        // Parse options
        let optionsArray = null;
        if (questionOptions) {
            optionsArray = questionOptions.split(',').map(opt => opt.trim()).filter(opt => opt);
        }

        // Create question via admin API
        await apiRequest('/api/admin/questions', {
            method: 'POST',
            token,
            body: {
                questions: [{
                    event_id: selectedEventId,
                    question: questionText,
                    type: questionType,
                    options: optionsArray || null,
                    required: !!isRequired
                }]
            }
        });

        alert('✓ Question added successfully!');
        closeAddQuestionModal();

        // Reload questions
        loadEventQuestions(selectedEventId);

        addQuestionBtn.disabled = false;
        addQuestionBtn.textContent = '➕ Add Question';
    } catch (error) {
        console.error('Error adding question:', error);
        alert('❌ Failed to add question: ' + error.message);
        addQuestionBtn.disabled = false;
        addQuestionBtn.textContent = '➕ Add Question';
    }
});

// 🔹 TAB MANAGEMENT
addQuestionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();

    const questionText = document.getElementById('questionText').value.trim();
    const questionType = document.getElementById('questionType').value;
    const questionOptions = document.getElementById('questionOptions').value.trim();
    const isRequired = document.getElementById('questionRequired').checked;

    if (!questionText || !questionType) {
        alert('Please fill in all required fields');
        return;
    }

    if (['select', 'radio', 'checkbox'].includes(questionType) && !questionOptions) {
        alert('Please add options for this question type');
        return;
    }

    try {
        const client = await window.waitForSupabaseClient();
        const { data: sessionData } = await client.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) throw new Error('Not authenticated');

        addQuestionBtn.disabled = true;
        addQuestionBtn.textContent = 'â³';

        const optionsArray = questionOptions
            ? questionOptions.split(',').map(opt => opt.trim()).filter(Boolean)
            : null;

        if (editingQuestionId) {
            await apiRequest(`/api/admin/questions?id=${encodeURIComponent(editingQuestionId)}`, {
                method: 'PATCH',
                token,
                body: {
                    question: questionText,
                    type: questionType,
                    options: optionsArray || null,
                    required: !!isRequired
                }
            });
            alert('âœ“ Question updated successfully!');
        } else {
            await apiRequest('/api/admin/questions', {
                method: 'POST',
                token,
                body: {
                    questions: [{
                        event_id: selectedEventId,
                        question: questionText,
                        type: questionType,
                        options: optionsArray || null,
                        required: !!isRequired
                    }]
                }
            });
            alert('âœ“ Question added successfully!');
        }

        closeAddQuestionModal();
        await loadEventQuestions(selectedEventId);
        editingQuestionId = null;
    } catch (error) {
        console.error('Error saving question:', error);
        alert('âŒ Failed to save question: ' + error.message);
    } finally {
        if (addQuestionBtn) {
            addQuestionBtn.disabled = false;
            addQuestionBtn.textContent = 'âž• Add Question';
        }
    }
}, true);

function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
        tab.style.display = 'none';
    });

    // Remove active state from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    const tabElement = document.getElementById(tabName + 'Tab');
    if (tabElement) {
        tabElement.classList.add('active');
        tabElement.style.display = 'block';
    }

    // Activate button
    event.target.classList.add('active');

    // Load questions if switching to questions tab
    if (tabName === 'questions' && selectedEventId) {
        loadEventQuestions(selectedEventId);
    }
}

// 🔹 LOAD AND DISPLAY QUESTIONS
async function loadEventQuestions(eventId) {
    try {
        const r = await fetch(`/api/public-questions?event_id=${encodeURIComponent(eventId)}`, { cache: 'no-store' });
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error(data?.error || 'Failed to fetch questions');
        displayQuestions(data?.questions || []);
    } catch (error) {
        console.error('Error loading questions:', error);
        questionsList.innerHTML = '<div class="error">Failed to load questions</div>';
    }
}

function displayQuestions(questions) {
    if (questions.length === 0) {
        questionsList.innerHTML = '<div class="no-responses">No questions added yet. Add one to get started!</div>';
        return;
    }

    const html = questions.map(q => `
        <div class="question-card">
            <div class="question-details">
                <h4>${escapeHtml(q.question)}</h4>
                <p><span class="question-type">${q.type}</span></p>
                ${q.options ? `<div class="question-options">Options: ${escapeHtml(q.options.join(', '))}</div>` : ''}
                <p style="margin-top: 8px; font-size: 12px; color: #999;">
                    ${q.required ? '✓ Required' : '○ Optional'}
                </p>
            </div>
            <div class="question-actions">
                <button class="btn-secondary" onclick="openEditQuestionModal('${escapeJsString(String(q.id))}')">Edit</button>
                <button class="btn-delete" onclick="deleteQuestion('${escapeJsString(String(q.id))}')">Delete</button>
            </div>
        </div>
    `).join('');

    questionsList.innerHTML = html;
}

// 🔹 DELETE QUESTION
async function deleteQuestion(questionId) {
    if (!confirm('Are you sure you want to delete this question?')) {
        return;
    }

    try {
        const client = await window.waitForSupabaseClient();
        const { data: sessionData } = await client.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) throw new Error('Not authenticated');

        await apiRequest(`/api/admin/questions?id=${encodeURIComponent(questionId)}`, { method: 'DELETE', token });
        alert('✓ Question deleted successfully!');
        loadEventQuestions(selectedEventId);
    } catch (error) {
        console.error('Error deleting question:', error);
        alert('❌ Failed to delete question: ' + error.message);
    }
}

function openEditQuestionModal(questionId) {
    const question = allQuestions.find(q => String(q.id) === String(questionId));
    if (!question) {
        alert('Question not found');
        return;
    }
    openQuestionModal('edit', question);
}

// Add event listeners with proper debug logging
if (addEventBtn) {
    addEventBtn.addEventListener('click', openAddEventModal);
    console.log('✅ Add Event button listener attached');
} else {
    console.error('❌ Add Event button not found');
}

if (addQuestionBtn) {
    addQuestionBtn.addEventListener('click', openAddQuestionModal);
    console.log('✅ Add Question button listener attached');
} else {
    console.error('❌ Add Question button not found');
}

if (exportExcelBtn) {
    console.log('✅ Export Excel button found');
} else {
    console.error('❌ Export Excel button not found');
}

if (exportPdfBtn) {
    console.log('✅ Export PDF button found');
} else {
    console.error('❌ Export PDF button not found');
}

if (exportWordBtn) {
    console.log('✅ Export Word button found');
} else {
    console.error('❌ Export Word button not found');
}

async function loadEvents() {
    try {
        const r = await fetch('/api/public-events', { cache: 'no-store' });
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error(data?.error || 'Failed to fetch events');

        allEvents = data?.events || [];

        if (allEvents.length === 0) {
            eventsList.innerHTML = '<p class="loading">No events available</p>';
            return;
        }

        displayEventsList();
    } catch (error) {
        console.error('Error loading events:', error);
        eventsList.innerHTML = '<div class="error">Failed to load events</div>';
    }
}

// Display events in sidebar
function displayEventsList() {
    eventsList.innerHTML = allEvents.map(event => `
        <div class="event-item" onclick="selectEvent('${escapeJsString(String(event.id))}', '${escapeJsString(event.title)}', this)">
            <div class="event-item-title">${escapeHtml(event.title)}</div>
            <div class="event-item-count">Responses: <span id="count-${event.id}">-</span></div>
        </div>
    `).join('');

    // Load response counts
    allEvents.forEach(event => {
        loadResponseCount(event.id);
    });

    // Add non-UI delete option:
    // - Right click (context menu) on an event item
    // - Or Shift+Click on an event item
    document.querySelectorAll('.event-item').forEach((itemEl, index) => {
        const evt = allEvents[index];
        if (!evt) return;

        itemEl.addEventListener('contextmenu', async (e) => {
            e.preventDefault();
            await deleteEvent(evt.id, evt.title);
        });

        itemEl.addEventListener('click', async (e) => {
            if (!e.shiftKey) return;
            e.preventDefault();
            e.stopPropagation();
            await deleteEvent(evt.id, evt.title);
        }, true);
    });
}

async function deleteEvent(eventId, title) {
    if (!eventId) return;

    const ok = confirm(`Delete event "${title || eventId}"?\n\nThis will also delete its questions and responses.`);
    if (!ok) return;

    try {
        const client = await window.waitForSupabaseClient();
        const { data } = await client.auth.getSession();
        const token = data?.session?.access_token;
        if (!token) throw new Error('Not authenticated');

        await apiRequest(`/api/admin/events?id=${encodeURIComponent(eventId)}`, { method: 'DELETE', token });

        // Reset selection if we deleted the active event
        if (selectedEventId === eventId) {
            selectedEventId = null;
            selectedEventData = null;
            allQuestions = [];
            allResponses = [];
            responsesTable.innerHTML = '';
            responseCount.textContent = '';
            selectedEventTitle.textContent = '';
            responsesSection.style.display = 'none';
            noSelection.style.display = 'block';
            if (addQuestionBtn) addQuestionBtn.disabled = true;
        }

        alert('✅ Event deleted');
        await loadEvents();
    } catch (error) {
        console.error('Error deleting event:', error);
        alert('❌ Failed to delete event: ' + (error?.message || String(error)));
    }
}

// Load response count for each event
async function loadResponseCount(eventId) {
    try {
        const client = await window.waitForSupabaseClient();
        const { data } = await client.auth.getSession();
        const token = data?.session?.access_token;
        if (!token) return;

        const out = await apiRequest(`/api/admin/response-count?event_id=${encodeURIComponent(eventId)}`, { token });
        const count = out.count;
        const countElement = document.getElementById(`count-${eventId}`);
        if (countElement) {
            countElement.textContent = count;
        }
    } catch (error) {
        console.error('Error loading response count:', error);
    }
}

// Select event and load responses
async function selectEvent(eventId, eventTitle, itemEl) {
    selectedEventId = eventId;
    noSelection.style.display = 'none';
    responsesSection.style.display = 'block';
    selectedEventTitle.textContent = eventTitle;

    try {
        const client = await window.waitForSupabaseClient();
        // Update active state
        document.querySelectorAll('.event-item').forEach(item => {
            item.classList.remove('active');
        });
        if (itemEl && itemEl.classList) {
            itemEl.classList.add('active');
        }

        selectedEventData = allEvents.find(evt => String(evt.id) === String(eventId)) || null;
        if (!selectedEventData) throw new Error('Event not found');

        const questionRes = await fetch(`/api/public-questions?event_id=${encodeURIComponent(eventId)}`, { cache: 'no-store' });
        const questionData = await questionRes.json().catch(() => null);
        if (!questionRes.ok) throw new Error(questionData?.error || 'Failed to fetch questions');
        allQuestions = questionData?.questions || [];

        // Show questions immediately, even if response loading fails later.
        displayQuestions(allQuestions);

        // Fetch responses via admin API (responses table is not public-readable)
        try {
            const { data: sessionData } = await client.auth.getSession();
            const token = sessionData?.session?.access_token;
            if (!token) throw new Error('Not authenticated');

            const out = await apiRequest(`/api/admin/responses?event_id=${encodeURIComponent(eventId)}`, { token });
            allResponses = out.responses || [];
        } catch (responseError) {
            console.error('Error loading responses:', responseError);
            allResponses = [];
        }

        // Display responses even if empty or unavailable.
        displayResponses(allResponses);

        // Update response count
        responseCount.textContent = `${allResponses.length} response${allResponses.length !== 1 ? 's' : ''}`;

        // Enable the add question button
        if (addQuestionBtn) {
            addQuestionBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error loading event details:', error);
        displayQuestions([]);
        responsesTable.innerHTML = '<div class="error">Failed to load responses</div>';
        if (addQuestionBtn) {
            addQuestionBtn.disabled = true;
        }
    }
}

// Display responses in table
function displayResponses(responses) {
    if (responses.length === 0) {
        responsesTable.innerHTML = '<div class="no-responses">No responses yet</div>';
        return;
    }

    const tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Submitted At</th>
                    ${allQuestions.map(q => `<th>${escapeHtml(q.question)}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${responses.map(response => `
                    <tr>
                        <td>${String(response.id).substring(0, 8)}</td>
                        <td>${new Date(response.created_at).toLocaleString()}</td>
                        ${allQuestions.map(question => {
        const answer = response.answers[question.id];
        const displayValue = Array.isArray(answer) ? answer.join(', ') : (answer || '');
        return `<td class="answer-cell" title="${escapeHtml(displayValue)}">${escapeHtml(displayValue)}</td>`;
    }).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    responsesTable.innerHTML = tableHTML;
}

// Filter responses
filterInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();

    if (!searchTerm) {
        displayResponses(allResponses);
        return;
    }

    const filtered = allResponses.filter(response => {
        const responseStr = JSON.stringify(response.answers).toLowerCase();
        return responseStr.includes(searchTerm);
    });

    displayResponses(filtered);
});

// 🔹 EXPORT HANDLERS INITIALIZATION
function initializeExportHandlers() {
    console.log('🔧 Initializing export handlers...');

    // Re-get buttons in case DOM changed
    const excelBtn = document.getElementById('exportExcelBtn');
    const pdfBtn = document.getElementById('exportPdfBtn');
    const wordBtn = document.getElementById('exportWordBtn');

    console.log('  - Excel button:', excelBtn ? '✅' : '❌');
    console.log('  - PDF button:', pdfBtn ? '✅' : '❌');
    console.log('  - Word button:', wordBtn ? '✅' : '❌');

    // Excel Export Handler
    if (excelBtn) {
        excelBtn.addEventListener('click', async () => {
            if (!selectedEventId) {
                alert('⚠️  Please select an event first');
                return;
            }

            if (typeof window.XLSX === 'undefined') {
                alert('❌ Excel library not loaded. Please refresh the page.');
                console.error('XLSX library not available:', {
                    XLSX: typeof window.XLSX,
                    location: 'window.XLSX',
                    windowKeys: Object.keys(window).filter(k => k.toLowerCase().includes('xlsx') || k.toLowerCase().includes('excel'))
                });
                return;
            }

            try {
                excelBtn.disabled = true;
                excelBtn.textContent = '⏳ Exporting...';

                if (!selectedEventData || !allResponses) {
                    throw new Error('Event data or responses not loaded');
                }

                await ExportUtils.exportToExcel(
                    selectedEventData,
                    allQuestions,
                    allResponses,
                    `${selectedEventData.title}_Responses`
                );

                excelBtn.textContent = '✓ Downloaded!';
                setTimeout(() => {
                    excelBtn.textContent = '📥 Excel';
                    excelBtn.disabled = false;
                }, 2000);
                console.log('✅ Excel export successful');
            } catch (error) {
                console.error('Export error:', error);
                alert('❌ Excel export failed: ' + error.message);
                excelBtn.textContent = '❌ Error';
                setTimeout(() => {
                    excelBtn.textContent = '📥 Excel';
                    excelBtn.disabled = false;
                }, 2000);
            }
        });
    }

    // PDF Export Handler
    if (pdfBtn) {
        pdfBtn.addEventListener('click', async () => {
            if (!selectedEventId) {
                alert('⚠️  Please select an event first');
                return;
            }

            if (typeof jspdf === 'undefined' && !window.jspdf) {
                alert('❌ PDF library not loaded. Please refresh the page.');
                console.error('jsPDF library not available');
                return;
            }

            try {
                pdfBtn.disabled = true;
                pdfBtn.textContent = '⏳ Exporting...';

                if (!selectedEventData || !allResponses) {
                    throw new Error('Event data or responses not loaded');
                }

                await ExportUtils.exportToPDF(
                    selectedEventData,
                    allQuestions,
                    allResponses,
                    `${selectedEventData.title}_Responses`
                );

                pdfBtn.textContent = '✓ Downloaded!';
                setTimeout(() => {
                    pdfBtn.textContent = '📄 PDF';
                    pdfBtn.disabled = false;
                }, 2000);
                console.log('✅ PDF export successful');
            } catch (error) {
                console.error('Export error:', error);
                alert('❌ PDF export failed: ' + error.message);
                pdfBtn.textContent = '❌ Error';
                setTimeout(() => {
                    pdfBtn.textContent = '📄 PDF';
                    pdfBtn.disabled = false;
                }, 2000);
            }
        });
    }

    // Word Export Handler
    if (wordBtn) {
        wordBtn.addEventListener('click', async () => {
            if (!selectedEventId) {
                alert('⚠️  Please select an event first');
                return;
            }

            if (typeof window.docx === 'undefined') {
                alert('❌ Word library not loaded. Please refresh the page.');
                console.error('docx library not available');
                return;
            }

            try {
                wordBtn.disabled = true;
                wordBtn.textContent = '⏳ Exporting...';

                if (!selectedEventData || !allResponses) {
                    throw new Error('Event data or responses not loaded');
                }

                await ExportUtils.exportToWord(
                    selectedEventData,
                    allQuestions,
                    allResponses,
                    `${selectedEventData.title}_Responses`
                );

                wordBtn.textContent = '✓ Downloaded!';
                setTimeout(() => {
                    wordBtn.textContent = '📝 Word';
                    wordBtn.disabled = false;
                }, 2000);
                console.log('✅ Word export successful');
            } catch (error) {
                console.error('Export error:', error);
                alert('❌ Word export failed: ' + error.message);
                wordBtn.textContent = '❌ Error';
                setTimeout(() => {
                    wordBtn.textContent = '📝 Word';
                    wordBtn.disabled = false;
                }, 2000);
            }
        });
    }

    console.log('✅ Export handlers initialized');
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

function escapeJsString(text) {
    if (text == null) return '';
    return String(text)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\r/g, '\\r')
        .replace(/\n/g, '\\n');
}

// Global functions for HTML onclick handlers
function toggleMenu() {
    document.getElementById("navLinks").classList.toggle("active");
}

function closeAddEventModal() {
    addEventModal.style.display = 'none';
    addEventForm.reset();
    tempEventQuestions = [];
    if (eventFlyerPreview) {
        eventFlyerPreview.style.display = 'none';
        eventFlyerPreview.src = '';
    }
}

// Initialize quick question form listeners
function initializeQuickQuestionForm() {
    const quickQuestionForm = document.getElementById('quickQuestionForm');
    const quickQuestionModal = document.getElementById('quickQuestionModal');

    if (quickQuestionModal) {
        quickQuestionModal.addEventListener('click', (e) => {
            if (e.target === quickQuestionModal) {
                closeQuestionFormModal();
            }
        });
        console.log('✅ Quick question modal click handler attached');
    }

    if (quickQuestionForm) {
        quickQuestionForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const questionText = document.getElementById('quickQuestionText').value.trim();
            const questionType = document.getElementById('quickQuestionType').value;
            const questionOptions = document.getElementById('quickQuestionOptions').value.trim();
            const isRequired = document.getElementById('quickQuestionRequired').checked;

            if (!questionText || !questionType) {
                alert('❌ Please fill in all required fields');
                return;
            }

            // Validate options for select/radio/checkbox
            if (['select', 'radio', 'checkbox'].includes(questionType)) {
                if (!questionOptions) {
                    alert('❌ Please add options for this question type');
                    return;
                }
            }

            try {
                // Parse options
                let optionsArray = null;
                if (questionOptions) {
                    optionsArray = questionOptions.split(',').map(opt => opt.trim()).filter(opt => opt);
                }

                // Add to temporary questions
                tempEventQuestions.push({
                    question: questionText,
                    type: questionType,
                    options: optionsArray,
                    required: isRequired
                });

                console.log('✅ Question added. Total:', tempEventQuestions.length);
                displayTempQuestions();
                closeQuestionFormModal();

                // Show success feedback
                alert(`✓ Question added! (${tempEventQuestions.length} total)`);
            } catch (error) {
                console.error('Error adding question:', error);
                alert('❌ Error: ' + error.message);
            }
        });
        console.log('✅ Quick question form submit handler attached');
    }
}

// Load events when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 DOMContentLoaded complete - Initializing handlers...');
    loadEvents();
    initializeQuickQuestionForm();
    initializeExportHandlers();
    console.log('✅ All handlers initialized!');
});
