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
const pdfOptionsPanel = document.getElementById('pdfOptionsPanel');
const pdfColumnChecklist = document.getElementById('pdfColumnChecklist');
const pdfBlankColumnInput = document.getElementById('pdfBlankColumnInput');
const pdfAddBlankColumnBtn = document.getElementById('pdfAddBlankColumnBtn');
const pdfBlankColumnsList = document.getElementById('pdfBlankColumnsList');
const pdfGenerateBtn = document.getElementById('pdfGenerateBtn');
const pdfCloseBtn = document.getElementById('pdfCloseBtn');
const pdfHeadingInput = document.getElementById('pdfHeadingInput');
const wordOptionsPanel = document.getElementById('wordOptionsPanel');
const wordColumnChecklist = document.getElementById('wordColumnChecklist');
const wordBlankColumnInput = document.getElementById('wordBlankColumnInput');
const wordAddBlankColumnBtn = document.getElementById('wordAddBlankColumnBtn');
const wordBlankColumnsList = document.getElementById('wordBlankColumnsList');
const wordGenerateBtn = document.getElementById('wordGenerateBtn');
const wordCloseBtn = document.getElementById('wordCloseBtn');
const wordHeadingInput = document.getElementById('wordHeadingInput');

// Modal elements
const addEventBtn = document.getElementById('addEventBtn');
const addEventModal = document.getElementById('addEventModal');
const addEventForm = document.getElementById('addEventForm');
const eventTitleInput = document.getElementById('eventTitle');
const eventDescriptionInput = document.getElementById('eventDescription');
const eventDateInput = document.getElementById('eventDate');
const eventFlyerInput = document.getElementById('eventFlyer');
const eventFlyerPreview = document.getElementById('eventFlyerPreview');
const associationMembersAdminList = document.getElementById('associationMembersAdminList');
const associationMembersSection = document.getElementById('associationMembersSection');
const addAssociationMemberBtn = document.getElementById('addAssociationMemberBtn');
const toggleAssociationPanelBtn = document.getElementById('toggleAssociationPanelBtn');
const associationMemberModal = document.getElementById('associationMemberModal');
const associationMemberModalTitle = document.getElementById('associationMemberModalTitle');
const associationMemberForm = document.getElementById('associationMemberForm');
const associationMemberIdInput = document.getElementById('associationMemberId');
const associationMemberNameInput = document.getElementById('associationMemberName');
const associationMemberRoleInput = document.getElementById('associationMemberRole');
const associationMemberOrderInput = document.getElementById('associationMemberOrder');
const associationMemberImageInput = document.getElementById('associationMemberImage');
const associationMemberImagePreview = document.getElementById('associationMemberImagePreview');

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
let associationMembers = [];
let editingAssociationMemberImageUrl = '';
let isAssociationPanelOpen = false;
let pdfColumnSelectionState = {};
let pdfBlankColumns = [];
let wordColumnSelectionState = {};
let wordBlankColumns = [];

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

function resetPdfOptions() {
    pdfColumnSelectionState = {};
    pdfBlankColumns = [];
    if (pdfHeadingInput) pdfHeadingInput.value = '';
    document.querySelectorAll('input[name="pdfOrientation"]').forEach(radio => {
        radio.checked = radio.value === 'portrait';
    });
    renderPdfOptionsPanel();
}

function resetWordOptions() {
    wordColumnSelectionState = {};
    wordBlankColumns = [];
    if (wordHeadingInput) wordHeadingInput.value = '';
    renderWordOptionsPanel();
}

function openPdfOptionsPanel() {
    if (!selectedEventId) {
        alert('Please select an event first');
        return;
    }

    if (pdfOptionsPanel) {
        closeWordOptionsPanel();
        pdfOptionsPanel.style.display = 'block';
        if (pdfHeadingInput && !pdfHeadingInput.value.trim()) {
            pdfHeadingInput.value = selectedEventData?.title || selectedEventTitle?.textContent || '';
        }
        renderPdfOptionsPanel();
        pdfOptionsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function closePdfOptionsPanel() {
    if (pdfOptionsPanel) {
        pdfOptionsPanel.style.display = 'none';
    }
}

function openWordOptionsPanel() {
    if (!selectedEventId) {
        alert('Please select an event first');
        return;
    }

    if (wordOptionsPanel) {
        closePdfOptionsPanel();
        wordOptionsPanel.style.display = 'block';
        if (wordHeadingInput && !wordHeadingInput.value.trim()) {
            wordHeadingInput.value = selectedEventData?.title || selectedEventTitle?.textContent || '';
        }
        renderWordOptionsPanel();
        wordOptionsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function closeWordOptionsPanel() {
    if (wordOptionsPanel) {
        wordOptionsPanel.style.display = 'none';
    }
}

function addPdfBlankColumnFromInput() {
    if (!pdfBlankColumnInput) return;

    const name = pdfBlankColumnInput.value.trim();
    if (!name) return;

    const exists = pdfBlankColumns.some(item => item.toLowerCase() === name.toLowerCase());
    if (exists) {
        alert('That blank column already exists.');
        return;
    }

    pdfBlankColumns.push(name);
    pdfBlankColumnInput.value = '';
    renderPdfOptionsPanel();
}

function removePdfBlankColumn(index) {
    if (index < 0 || index >= pdfBlankColumns.length) return;
    pdfBlankColumns.splice(index, 1);
    renderPdfOptionsPanel();
}

function addWordBlankColumnFromInput() {
    if (!wordBlankColumnInput) return;

    const name = wordBlankColumnInput.value.trim();
    if (!name) return;

    const exists = wordBlankColumns.some(item => item.toLowerCase() === name.toLowerCase());
    if (exists) {
        alert('That blank column already exists.');
        return;
    }

    wordBlankColumns.push(name);
    wordBlankColumnInput.value = '';
    renderWordOptionsPanel();
}

function removeWordBlankColumn(index) {
    if (index < 0 || index >= wordBlankColumns.length) return;
    wordBlankColumns.splice(index, 1);
    renderWordOptionsPanel();
}

function getExportQuestionColumns(question) {
    const questionId = String(question.id);
    const questionLabel = capitalizeFirstLetter(question.question || `Question ${questionId}`);

    if (question.type === 'group_members') {
        return [
            {
                kind: 'question',
                questionId,
                questionPart: 'member_names',
                stateKey: `${questionId}:member_names`,
                label: questionLabel
            },
            {
                kind: 'question',
                questionId,
                questionPart: 'group_size',
                stateKey: `${questionId}:group_size`,
                label: `No. of ${questionLabel}`
            }
        ];
    }

    return [{
        kind: 'question',
        questionId,
        questionPart: null,
        stateKey: questionId,
        label: questionLabel
    }];
}

function renderExportColumnItem(column, state, checkboxClass, inputClass) {
    const stateKey = column.stateKey;
    const current = state[stateKey];
    const checked = current ? !!current.checked : true;
    const label = current?.label || column.label;

    if (!current) {
        state[stateKey] = {
            checked: true,
            label: column.label
        };
    }

    return `
        <label style="display:grid; grid-template-columns:auto 1fr; gap:10px 12px; align-items:start; padding:10px 12px; border:1px solid #e5e7eb; border-radius:8px; background:#fff;">
            <input type="checkbox" class="${checkboxClass}" data-column-key="${escapeHtml(stateKey)}" ${checked ? 'checked' : ''} style="margin-top:3px;">
            <div style="display:grid; gap:6px; width:100%;">
                <span style="font-size:13px; color:#1f2937; line-height:1.4;">${escapeHtml(column.label)}</span>
                <input type="text" class="${inputClass} search-box" data-column-key="${escapeHtml(stateKey)}" value="${escapeHtml(label)}" placeholder="Column name" style="width:100%; min-width:0; color:#1f2937; background:#fff;">
            </div>
        </label>
    `;
}

function renderPdfOptionsPanel() {
    if (!pdfColumnChecklist || !pdfBlankColumnsList) return;

    const questionItems = allQuestions
        .flatMap((question) => getExportQuestionColumns(question))
        .map((column) => renderExportColumnItem(column, pdfColumnSelectionState, 'pdf-column-checkbox', 'pdf-column-label-input'))
        .join('');

    pdfColumnChecklist.innerHTML = `
        <label style="display:flex; gap:10px; align-items:flex-start; padding:10px 12px; border:1px solid #d7def3; border-radius:8px; background:#f8faff;">
            <input type="checkbox" checked disabled style="margin-top:3px;">
            <div style="display:grid; gap:6px; width:100%;">
                <span style="font-size:13px; color:#1f2937; line-height:1.4;">Sr No</span>
                <input type="text" class="search-box" value="Sr No" disabled style="width:100%; min-width:0; color:#1f2937; background:#f8faff;">
            </div>
        </label>
        ${questionItems || '<div style="padding:8px 0; color:#667085; font-size:13px;">No questions available for this event.</div>'}
    `;

    const blankItems = pdfBlankColumns.map((name, index) => `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; padding:10px 12px; border:1px solid #e5e7eb; border-radius:8px; background:#fff; margin-top:8px;">
            <span style="font-size:13px; color:#1f2937;">Blank: ${escapeHtml(capitalizeFirstLetter(name))}</span>
            <button type="button" class="btn btn-secondary pdf-remove-blank-column" data-index="${index}" style="padding:6px 10px; font-size:12px;">Remove</button>
        </div>
    `).join('');

    pdfBlankColumnsList.innerHTML = blankItems || '<div style="padding:8px 0; color:#667085; font-size:13px;">No custom blank columns added.</div>';
}

function renderWordOptionsPanel() {
    if (!wordColumnChecklist || !wordBlankColumnsList) return;

    const questionItems = allQuestions
        .flatMap((question) => getExportQuestionColumns(question))
        .map((column) => renderExportColumnItem(column, wordColumnSelectionState, 'word-column-checkbox', 'word-column-label-input'))
        .join('');

    wordColumnChecklist.innerHTML = `
        <label style="display:flex; gap:10px; align-items:flex-start; padding:10px 12px; border:1px solid #d7def3; border-radius:8px; background:#f8faff;">
            <input type="checkbox" checked disabled style="margin-top:3px;">
            <div style="display:grid; gap:6px; width:100%;">
                <span style="font-size:13px; color:#1f2937; line-height:1.4;">Sr No</span>
                <input type="text" class="search-box" value="Sr No" disabled style="width:100%; min-width:0; color:#1f2937; background:#f8faff;">
            </div>
        </label>
        ${questionItems || '<div style="padding:8px 0; color:#667085; font-size:13px;">No questions available for this event.</div>'}
    `;

    const blankItems = wordBlankColumns.map((name, index) => `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; padding:10px 12px; border:1px solid #e5e7eb; border-radius:8px; background:#fff; margin-top:8px;">
            <span style="font-size:13px; color:#1f2937;">Blank: ${escapeHtml(capitalizeFirstLetter(name))}</span>
            <button type="button" class="btn btn-secondary word-remove-blank-column" data-index="${index}" style="padding:6px 10px; font-size:12px;">Remove</button>
        </div>
    `).join('');

    wordBlankColumnsList.innerHTML = blankItems || '<div style="padding:8px 0; color:#667085; font-size:13px;">No custom blank columns added.</div>';
}

function collectPdfColumns() {
    const columns = [{ kind: 'serial', label: 'Sr No' }];
    const selectedKeys = new Set();

    document.querySelectorAll('.pdf-column-checkbox').forEach((checkbox) => {
        const columnKey = String(checkbox.dataset.columnKey || '');
        if (!columnKey) return;
        const current = pdfColumnSelectionState[columnKey] || {};
        pdfColumnSelectionState[columnKey] = {
            ...current,
            checked: checkbox.checked
        };
        if (checkbox.checked) selectedKeys.add(columnKey);
    });

    document.querySelectorAll('.pdf-column-label-input').forEach((input) => {
        const columnKey = String(input.dataset.columnKey || '');
        if (!columnKey) return;
        const current = pdfColumnSelectionState[columnKey] || {};
        pdfColumnSelectionState[columnKey] = {
            ...current,
            label: input.value.trim() || current.label || ''
        };
    });

    allQuestions
        .flatMap((question) => getExportQuestionColumns(question))
        .forEach((column) => {
            if (!selectedKeys.has(column.stateKey)) return;
            const current = pdfColumnSelectionState[column.stateKey] || {};
            columns.push({
                kind: 'question',
                questionId: column.questionId,
                questionPart: column.questionPart,
                label: current.label || column.label
            });
        });

    pdfBlankColumns.forEach((name) => {
        columns.push({
            kind: 'blank',
            label: capitalizeFirstLetter(name)
        });
    });

    return columns;
}

function collectWordColumns() {
    const columns = [{ kind: 'serial', label: 'Sr No' }];
    const selectedKeys = new Set();

    document.querySelectorAll('.word-column-checkbox').forEach((checkbox) => {
        const columnKey = String(checkbox.dataset.columnKey || '');
        if (!columnKey) return;
        const current = wordColumnSelectionState[columnKey] || {};
        wordColumnSelectionState[columnKey] = {
            ...current,
            checked: checkbox.checked
        };
        if (checkbox.checked) selectedKeys.add(columnKey);
    });

    document.querySelectorAll('.word-column-label-input').forEach((input) => {
        const columnKey = String(input.dataset.columnKey || '');
        if (!columnKey) return;
        const current = wordColumnSelectionState[columnKey] || {};
        wordColumnSelectionState[columnKey] = {
            ...current,
            label: input.value.trim() || current.label || ''
        };
    });

    allQuestions
        .flatMap((question) => getExportQuestionColumns(question))
        .forEach((column) => {
            if (!selectedKeys.has(column.stateKey)) return;
            const current = wordColumnSelectionState[column.stateKey] || {};
            columns.push({
                kind: 'question',
                questionId: column.questionId,
                questionPart: column.questionPart,
                label: current.label || column.label
            });
        });

    wordBlankColumns.forEach((name) => {
        columns.push({
            kind: 'blank',
            label: capitalizeFirstLetter(name)
        });
    });

    return columns;
}

function capitalizeFirstLetter(text) {
    const value = String(text ?? '').trim();
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function getPdfOrientation() {
    const checked = document.querySelector('input[name="pdfOrientation"]:checked');
    return checked ? checked.value : 'portrait';
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

if (associationMemberImageInput && associationMemberImagePreview) {
    associationMemberImageInput.addEventListener('change', () => {
        const file = associationMemberImageInput.files && associationMemberImageInput.files[0]
            ? associationMemberImageInput.files[0]
            : null;

        if (!file) {
            if (editingAssociationMemberImageUrl) {
                associationMemberImagePreview.src = editingAssociationMemberImageUrl;
                associationMemberImagePreview.style.display = 'block';
            } else {
                associationMemberImagePreview.style.display = 'none';
                associationMemberImagePreview.src = '';
            }
            return;
        }

        associationMemberImagePreview.src = URL.createObjectURL(file);
        associationMemberImagePreview.style.display = 'block';
    });
}

async function uploadFlyerIfAny() {
    const file = eventFlyerInput && eventFlyerInput.files && eventFlyerInput.files[0] ? eventFlyerInput.files[0] : null;
    if (!file) return null;

    const client = await window.waitForSupabaseClient();
    const { data: sessionData } = await client.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error('Not authenticated');

    const dataBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result || '');
            const i = result.indexOf(',');
            resolve(i >= 0 ? result.slice(i + 1) : result);
        };
        reader.onerror = () => reject(reader.error || new Error('Failed to read flyer file'));
        reader.readAsDataURL(file);
    });

    const out = await apiRequest('/api/admin/upload-flyer', {
        method: 'POST',
        token,
        body: {
            filename: file.name,
            contentType: file.type || 'application/octet-stream',
            dataBase64
        }
    });

    return out?.url || null;
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
    const optionsLabel = document.querySelector('label[for="quickQuestionOptions"]');
    const optionsInput = document.getElementById('quickQuestionOptions');

    if (['select', 'radio', 'checkbox', 'group_members'].includes(type)) {
        optionsGroup.style.display = 'block';
        if (type === 'group_members') {
            if (optionsLabel) optionsLabel.textContent = 'Maximum Members (1-10)';
            if (optionsInput) optionsInput.placeholder = 'Enter max group members, for example 4';
        } else {
            if (optionsLabel) optionsLabel.textContent = 'Options (comma-separated)';
            if (optionsInput) optionsInput.placeholder = 'Option 1, Option 2, Option 3';
        }
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
    const optionsLabel = document.querySelector('label[for="questionOptions"]');
    const optionsInput = document.getElementById('questionOptions');

    if (['select', 'radio', 'checkbox', 'group_members'].includes(type)) {
        optionsGroup.style.display = 'block';
        if (type === 'group_members') {
            if (optionsLabel) optionsLabel.textContent = 'Maximum Members (1-10)';
            if (optionsInput) optionsInput.placeholder = 'Enter max group members, for example 4';
        } else {
            if (optionsLabel) optionsLabel.textContent = 'Options (comma-separated)';
            if (optionsInput) optionsInput.placeholder = 'Option 1, Option 2, Option 3';
        }
    } else {
        optionsGroup.style.display = 'none';
    }
}

function parseQuestionOptions(questionType, rawOptions) {
    const value = String(rawOptions || '').trim();

    if (!value) return null;

    if (questionType === 'group_members') {
        const maxMembers = Number.parseInt(value, 10);
        if (!Number.isInteger(maxMembers) || maxMembers < 1 || maxMembers > 10) {
            throw new Error('For Group Members, enter a maximum member limit between 1 and 10');
        }
        return [String(maxMembers)];
    }

    return value.split(',').map(opt => opt.trim()).filter(opt => opt);
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
    if (['select', 'radio', 'checkbox', 'group_members'].includes(questionType)) {
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
        const optionsArray = parseQuestionOptions(questionType, questionOptions);

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

    if (['select', 'radio', 'checkbox', 'group_members'].includes(questionType) && !questionOptions) {
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

        const optionsArray = parseQuestionOptions(questionType, questionOptions);

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
        allQuestions = data?.questions || [];
        displayQuestions(allQuestions);
        renderPdfOptionsPanel();
        renderWordOptionsPanel();
    } catch (error) {
        console.error('Error loading questions:', error);
        allQuestions = [];
        questionsList.innerHTML = '<div class="error">Failed to load questions</div>';
        renderPdfOptionsPanel();
        renderWordOptionsPanel();
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
            <div class="event-item-actions">
                <button type="button" class="event-action-btn event-action-share" onclick="shareEventLink('${escapeJsString(String(event.id))}', event)">
                    Share
                </button>
                <button type="button" class="event-action-btn event-action-delete" onclick="deleteEvent('${escapeJsString(String(event.id))}', '${escapeJsString(event.title)}', event)">
                    Delete
                </button>
            </div>
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

async function loadAssociationMembers() {
    if (!associationMembersAdminList) return;

    try {
        const client = await window.waitForSupabaseClient();
        const { data } = await client.auth.getSession();
        const token = data?.session?.access_token;
        if (!token) throw new Error('Not authenticated');

        const out = await apiRequest('/api/admin/association-members', { token });
        associationMembers = out.members || [];
        displayAssociationMembersAdminList();
    } catch (error) {
        console.error('Error loading association members:', error);
        associationMembersAdminList.innerHTML = '<div class="error">Failed to load association members</div>';
    }
}

function displayAssociationMembersAdminList() {
    if (!associationMembersAdminList) return;

    if (associationMembers.length === 0) {
        associationMembersAdminList.innerHTML = '<div class="no-responses">No association members added yet</div>';
        return;
    }

    associationMembersAdminList.innerHTML = associationMembers.map((member) => `
        <div class="question-card">
            <div class="question-details" style="display:flex; gap:14px; align-items:center;">
                <div style="width:64px; height:64px; border-radius:50%; overflow:hidden; background:#eef2ff; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:28px;">
                    ${member.image_url
            ? `<img src="${escapeHtml(member.image_url)}" alt="${escapeHtml(member.name)}" style="width:100%; height:100%; object-fit:cover;">`
            : escapeHtml(getAssociationIcon(member.role))}
                </div>
                <div>
                    <h4>${escapeHtml(member.name)}</h4>
                    <p>${escapeHtml(member.role)}</p>
                    <p>Display order: ${member.display_order ?? '-'}</p>
                </div>
            </div>
            <div class="question-actions">
                <button type="button" class="btn btn-secondary btn-small" onclick="openAssociationMemberModal('${escapeJsString(String(member.id))}')">Edit</button>
                <button type="button" class="btn-delete" onclick="deleteAssociationMember('${escapeJsString(String(member.id))}', '${escapeJsString(member.name)}')">Delete</button>
            </div>
        </div>
    `).join('');
}

function setAssociationPanelOpen(isOpen) {
    isAssociationPanelOpen = !!isOpen;

    if (associationMembersSection) {
        associationMembersSection.style.display = isAssociationPanelOpen ? 'block' : 'none';
    }

    if (toggleAssociationPanelBtn) {
        toggleAssociationPanelBtn.classList.toggle('active', isAssociationPanelOpen);
        toggleAssociationPanelBtn.setAttribute('aria-expanded', String(isAssociationPanelOpen));
        toggleAssociationPanelBtn.textContent = isAssociationPanelOpen
            ? 'Hide Association Members'
            : 'Association Members';
    }
}

function toggleAssociationPanel() {
    setAssociationPanelOpen(!isAssociationPanelOpen);
}

function resetAssociationMemberForm() {
    if (!associationMemberForm) return;
    associationMemberForm.reset();
    if (associationMemberIdInput) associationMemberIdInput.value = '';
    editingAssociationMemberImageUrl = '';
    if (associationMemberImagePreview) {
        associationMemberImagePreview.style.display = 'none';
        associationMemberImagePreview.src = '';
    }
}

function openAssociationMemberModal(memberId = '') {
    if (!associationMemberModal) return;

    resetAssociationMemberForm();

    if (memberId) {
        const member = associationMembers.find((item) => String(item.id) === String(memberId));
        if (!member) return;

        associationMemberModalTitle.textContent = 'Edit Association Member';
        associationMemberIdInput.value = member.id;
        associationMemberNameInput.value = member.name || '';
        associationMemberRoleInput.value = member.role || '';
        associationMemberOrderInput.value = member.display_order ?? '';
        editingAssociationMemberImageUrl = member.image_url || '';

        if (editingAssociationMemberImageUrl && associationMemberImagePreview) {
            associationMemberImagePreview.src = editingAssociationMemberImageUrl;
            associationMemberImagePreview.style.display = 'block';
        }
    } else {
        associationMemberModalTitle.textContent = 'Add Association Member';
    }

    associationMemberModal.style.display = 'flex';
}

function closeAssociationMemberModal() {
    if (!associationMemberModal) return;
    associationMemberModal.style.display = 'none';
    resetAssociationMemberForm();
}

async function uploadAssociationMemberImageIfAny() {
    const file = associationMemberImageInput && associationMemberImageInput.files && associationMemberImageInput.files[0]
        ? associationMemberImageInput.files[0]
        : null;

    if (!file) return editingAssociationMemberImageUrl || null;

    const client = await window.waitForSupabaseClient();
    const { data: sessionData } = await client.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error('Not authenticated');

    const dataBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result || '');
            const index = result.indexOf(',');
            resolve(index >= 0 ? result.slice(index + 1) : result);
        };
        reader.onerror = () => reject(reader.error || new Error('Failed to read image file'));
        reader.readAsDataURL(file);
    });

    const out = await apiRequest('/api/admin/upload-association-image', {
        method: 'POST',
        token,
        body: {
            filename: file.name,
            contentType: file.type || 'application/octet-stream',
            dataBase64
        }
    });

    return out?.url || null;
}

async function saveAssociationMember(event) {
    event.preventDefault();

    try {
        const client = await window.waitForSupabaseClient();
        const { data } = await client.auth.getSession();
        const token = data?.session?.access_token;
        if (!token) throw new Error('Not authenticated');

        const imageUrl = await uploadAssociationMemberImageIfAny();
        const payload = {
            name: associationMemberNameInput.value.trim(),
            role: associationMemberRoleInput.value.trim(),
            display_order: associationMemberOrderInput.value.trim(),
            image_url: imageUrl
        };

        if (!payload.name || !payload.role) {
            throw new Error('Name and role are required');
        }

        const memberId = associationMemberIdInput.value.trim();
        if (memberId) {
            await apiRequest(`/api/admin/association-members?id=${encodeURIComponent(memberId)}`, {
                method: 'PUT',
                token,
                body: payload
            });
        } else {
            await apiRequest('/api/admin/association-members', {
                method: 'POST',
                token,
                body: payload
            });
        }

        closeAssociationMemberModal();
        await loadAssociationMembers();
    } catch (error) {
        console.error('Error saving association member:', error);
        alert(`Failed to save association member: ${error?.message || error}`);
    }
}

async function deleteAssociationMember(memberId, memberName) {
    const ok = confirm(`Delete association member "${memberName || memberId}"?`);
    if (!ok) return;

    try {
        const client = await window.waitForSupabaseClient();
        const { data } = await client.auth.getSession();
        const token = data?.session?.access_token;
        if (!token) throw new Error('Not authenticated');

        await apiRequest(`/api/admin/association-members?id=${encodeURIComponent(memberId)}`, {
            method: 'DELETE',
            token
        });

        await loadAssociationMembers();
    } catch (error) {
        console.error('Error deleting association member:', error);
        alert(`Failed to delete association member: ${error?.message || error}`);
    }
}

async function shareEventLink(eventId, clickEvent) {
    if (clickEvent) {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
    }

    const eventUrl = `${window.location.origin}${window.location.pathname.replace(/admin\.html$/i, 'event.html')}?event_id=${encodeURIComponent(eventId)}`;

    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(eventUrl);
        } else {
            const input = document.createElement('input');
            input.value = eventUrl;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
        }

        alert('Event link copied successfully');
    } catch (error) {
        console.error('Share link error:', error);
        alert(`Failed to copy event link: ${error?.message || error}`);
    }
}

async function deleteEvent(eventId, title, clickEvent) {
    if (clickEvent) {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
    }

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
            resetPdfOptions();
            resetWordOptions();
            closePdfOptionsPanel();
            closeWordOptionsPanel();
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
    closePdfOptionsPanel();
    closeWordOptionsPanel();
    pdfColumnSelectionState = {};
    pdfBlankColumns = [];
    if (pdfHeadingInput) pdfHeadingInput.value = eventTitle || '';
    document.querySelectorAll('input[name="pdfOrientation"]').forEach(radio => {
        radio.checked = radio.value === 'portrait';
    });
    wordColumnSelectionState = {};
    wordBlankColumns = [];
    if (wordHeadingInput) wordHeadingInput.value = eventTitle || '';

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
        renderPdfOptionsPanel();
        renderWordOptionsPanel();

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
        allQuestions = [];
        renderPdfOptionsPanel();
        renderWordOptionsPanel();
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

    const formatAnswerForDisplay = (answer) => {
        if (answer == null || answer === '') {
            return { text: '', html: '' };
        }

        if (Array.isArray(answer)) {
            const values = answer.filter((item) => item != null && item !== '').map((item) => String(item));
            const text = values.join(', ');
            return {
                text,
                html: values.map((item) => escapeHtml(item)).join('<br>')
            };
        }

        if (typeof answer === 'object') {
            const memberNames = Array.isArray(answer.member_names)
                ? answer.member_names
                    .filter((name) => name != null && String(name).trim() !== '')
                    .map((name) => String(name).trim())
                : [];

            if (memberNames.length > 0) {
                return {
                    text: memberNames.join('\n'),
                    html: memberNames.map((name) => escapeHtml(name)).join('<br>')
                };
            }

            if (answer.group_size) {
                const text = `Group size: ${answer.group_size}`;
                return { text, html: escapeHtml(text) };
            }

            const text = JSON.stringify(answer);
            return { text, html: escapeHtml(text) };
        }

        const text = String(answer);
        return { text, html: escapeHtml(text) };
    };

    const tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Sr No</th>
                    ${allQuestions.map(q => `<th>${escapeHtml(q.question)}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${responses.map((response, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        ${allQuestions.map(question => {
        const answer = response.answers[question.id];
        const displayValue = formatAnswerForDisplay(answer);
        return `<td class="answer-cell" title="${escapeHtml(displayValue.text)}">${displayValue.html}</td>`;
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

if (pdfColumnChecklist && !pdfColumnChecklist.__bound) {
    pdfColumnChecklist.__bound = true;
    pdfColumnChecklist.addEventListener('change', (e) => {
        const input = e.target;
        if (!input || !input.classList || !input.classList.contains('pdf-column-checkbox')) return;
        const columnKey = String(input.dataset.columnKey || '');
        if (!columnKey) return;
        const current = pdfColumnSelectionState[columnKey] || {};
        pdfColumnSelectionState[columnKey] = {
            ...current,
            checked: input.checked
        };
    });
    pdfColumnChecklist.addEventListener('input', (e) => {
        const input = e.target;
        if (!input || !input.classList || !input.classList.contains('pdf-column-label-input')) return;
        const columnKey = String(input.dataset.columnKey || '');
        if (!columnKey) return;
        const current = pdfColumnSelectionState[columnKey] || {};
        pdfColumnSelectionState[columnKey] = {
            ...current,
            label: input.value
        };
    });
}

if (pdfBlankColumnsList && !pdfBlankColumnsList.__bound) {
    pdfBlankColumnsList.__bound = true;
    pdfBlankColumnsList.addEventListener('click', (e) => {
        const button = e.target.closest?.('.pdf-remove-blank-column');
        if (!button) return;
        const index = Number(button.dataset.index);
        if (Number.isNaN(index)) return;
        removePdfBlankColumn(index);
    });
}

if (wordColumnChecklist && !wordColumnChecklist.__bound) {
    wordColumnChecklist.__bound = true;
    wordColumnChecklist.addEventListener('change', (e) => {
        const input = e.target;
        if (!input || !input.classList || !input.classList.contains('word-column-checkbox')) return;
        const columnKey = String(input.dataset.columnKey || '');
        if (!columnKey) return;
        const current = wordColumnSelectionState[columnKey] || {};
        wordColumnSelectionState[columnKey] = {
            ...current,
            checked: input.checked
        };
    });
    wordColumnChecklist.addEventListener('input', (e) => {
        const input = e.target;
        if (!input || !input.classList || !input.classList.contains('word-column-label-input')) return;
        const columnKey = String(input.dataset.columnKey || '');
        if (!columnKey) return;
        const current = wordColumnSelectionState[columnKey] || {};
        wordColumnSelectionState[columnKey] = {
            ...current,
            label: input.value
        };
    });
}

if (wordBlankColumnsList && !wordBlankColumnsList.__bound) {
    wordBlankColumnsList.__bound = true;
    wordBlankColumnsList.addEventListener('click', (e) => {
        const button = e.target.closest?.('.word-remove-blank-column');
        if (!button) return;
        const index = Number(button.dataset.index);
        if (Number.isNaN(index)) return;
        removeWordBlankColumn(index);
    });
}

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
                alert('❌ Excel export failed: ' + (error?.message || String(error)));
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
        pdfBtn.addEventListener('click', openPdfOptionsPanel);
    }

    if (pdfGenerateBtn) {
        pdfGenerateBtn.addEventListener('click', async () => {
            if (!selectedEventId) {
                alert('⚠️  Please select an event first');
                return;
            }

            try {
                pdfGenerateBtn.disabled = true;
                pdfGenerateBtn.textContent = '⏳ Generating...';

                if (!selectedEventData || !allResponses) {
                    throw new Error('Event data or responses not loaded');
                }

                const columns = collectPdfColumns();
                const pdfHeading = pdfHeadingInput && pdfHeadingInput.value.trim()
                    ? pdfHeadingInput.value.trim()
                    : (selectedEventData?.title || selectedEventTitle.textContent || '');
                const pdfOrientation = getPdfOrientation();
                await ExportUtils.exportToPDF(
                    selectedEventData,
                    allQuestions,
                    allResponses,
                    `${selectedEventData.title}_Responses`,
                    {
                        columns,
                        heading: pdfHeading,
                        orientation: pdfOrientation,
                        letterheadUrls: ['lh.jpg', 'lh.jpeg', 'collegeheader.jpeg']
                    }
                );

                pdfGenerateBtn.textContent = '✓ Downloaded!';
                setTimeout(() => {
                    pdfGenerateBtn.textContent = 'Generate PDF';
                    pdfGenerateBtn.disabled = false;
                }, 2000);
                console.log('✅ PDF export successful');
            } catch (error) {
                console.error('Export error:', error);
                alert('❌ PDF export failed: ' + error.message);
                pdfGenerateBtn.textContent = '❌ Error';
                setTimeout(() => {
                    pdfGenerateBtn.textContent = 'Generate PDF';
                    pdfGenerateBtn.disabled = false;
                }, 2000);
            }
        });
    }

    if (pdfCloseBtn) {
        pdfCloseBtn.addEventListener('click', closePdfOptionsPanel);
    }

    if (pdfAddBlankColumnBtn) {
        pdfAddBlankColumnBtn.addEventListener('click', addPdfBlankColumnFromInput);
    }

    if (pdfBlankColumnInput) {
        pdfBlankColumnInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addPdfBlankColumnFromInput();
            }
        });
    }

    if (wordBtn) {
        wordBtn.addEventListener('click', openWordOptionsPanel);
    }

    if (wordCloseBtn) {
        wordCloseBtn.addEventListener('click', closeWordOptionsPanel);
    }

    if (wordAddBlankColumnBtn) {
        wordAddBlankColumnBtn.addEventListener('click', addWordBlankColumnFromInput);
    }

    if (wordBlankColumnInput) {
        wordBlankColumnInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addWordBlankColumnFromInput();
            }
        });
    }

    // Word Export Handler (independent settings)
    if (wordGenerateBtn) {
        wordGenerateBtn.addEventListener('click', async () => {
            if (!selectedEventId) {
                alert('⚠️  Please select an event first');
                return;
            }

            try {
                wordGenerateBtn.disabled = true;
                wordGenerateBtn.textContent = '⏳ Generating...';

                if (!selectedEventData || !allResponses) {
                    throw new Error('Event data or responses not loaded');
                }

                const columns = collectWordColumns();
                const wordHeading = wordHeadingInput && wordHeadingInput.value.trim()
                    ? wordHeadingInput.value.trim()
                    : (selectedEventData?.title || selectedEventTitle.textContent || '');
                await ExportUtils.exportToWord(
                    selectedEventData,
                    allQuestions,
                    allResponses,
                    `${selectedEventData.title}_Responses`,
                    {
                        columns,
                        heading: wordHeading,
                        letterheadUrls: ['lh.jpg', 'lh.jpeg', 'collegeheader.jpeg']
                    }
                );

                wordGenerateBtn.textContent = '✓ Downloaded!';
                setTimeout(() => {
                    wordGenerateBtn.textContent = 'Generate Word';
                    wordGenerateBtn.disabled = false;
                }, 2000);
                console.log('✅ Word export successful');
            } catch (error) {
                console.error('Export error:', error);
                alert('❌ Word export failed: ' + error.message);
                wordGenerateBtn.textContent = '❌ Error';
                setTimeout(() => {
                    wordGenerateBtn.textContent = 'Generate Word';
                    wordGenerateBtn.disabled = false;
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

function getAssociationIcon(role) {
    const value = String(role || '').toLowerCase();
    if (value.includes('president')) return '👑';
    if (value.includes('vice')) return '⭐';
    if (value.includes('secretary')) return value.includes('technical') ? '💻' : value.includes('cultural') ? '🎭' : '📝';
    if (value.includes('treasurer')) return '💰';
    if (value.includes('sport')) return '🏅';
    if (value.includes('coordinator')) return '🎯';
    return '✨';
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
            if (['select', 'radio', 'checkbox', 'group_members'].includes(questionType)) {
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

function initializeAssociationMemberControls() {
    if (toggleAssociationPanelBtn && !toggleAssociationPanelBtn.__bound) {
        toggleAssociationPanelBtn.__bound = true;
        toggleAssociationPanelBtn.addEventListener('click', toggleAssociationPanel);
    }

    if (addAssociationMemberBtn && !addAssociationMemberBtn.__bound) {
        addAssociationMemberBtn.__bound = true;
        addAssociationMemberBtn.addEventListener('click', () => openAssociationMemberModal());
    }

    if (associationMemberForm && !associationMemberForm.__bound) {
        associationMemberForm.__bound = true;
        associationMemberForm.addEventListener('submit', saveAssociationMember);
    }

    if (associationMemberModal && !associationMemberModal.__bound) {
        associationMemberModal.__bound = true;
        associationMemberModal.addEventListener('click', (event) => {
            if (event.target === associationMemberModal) {
                closeAssociationMemberModal();
            }
        });
    }

    setAssociationPanelOpen(false);
}

// Load events when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 DOMContentLoaded complete - Initializing handlers...');
    loadEvents();
    initializeQuickQuestionForm();
    initializeExportHandlers();
    console.log('✅ All handlers initialized!');
});
let adminDashboardInitialized = false;

async function initializeAdminDashboard() {
    if (adminDashboardInitialized) return;
    adminDashboardInitialized = true;

    console.log('Admin dashboard authenticated - initializing handlers...');
    initializeAssociationMemberControls();
    initializeQuickQuestionForm();
    initializeExportHandlers();
    await loadAssociationMembers();
    await loadEvents();
    console.log('Admin dashboard ready');
}

window.initializeAdminDashboard = initializeAdminDashboard;
