const associationMembersGrid = document.getElementById('associationMembersGrid');

const fallbackMembers = [
    { name: 'Niddhi Gupta', role: 'President' },
    { name: 'Anushka Mote', role: 'Vice President' },
    { name: 'Samruddhi Ghodke', role: 'Secretary' },
    { name: 'Pranav Patil', role: 'Treasurer' },
    { name: 'Khushi Kalekar', role: 'Technical Secretary' },
    { name: 'Nandini Yeole', role: 'Technical Secretary' },
    { name: 'Parita Solanki', role: 'Cultural Secretary' },
    { name: 'Shantanu Kadu', role: 'Cultural Secretary' },
    { name: 'Aditya Raskonda', role: 'Sports Coordinator' },
    { name: 'Sarika Kapse', role: 'Sports Coordinator' }
];

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

function renderAssociationMembers(members) {
    if (!associationMembersGrid) return;

    associationMembersGrid.innerHTML = members.map((member) => {
        const image = member.image_url
            ? `<img class="member-photo" src="${escapeHtml(member.image_url)}" alt="${escapeHtml(member.name)}">`
            : `<div class="member-icon">${getAssociationIcon(member.role)}</div>`;

        return `
            <div class="member-card">
                <div class="member-visual">${image}</div>
                <h3>${escapeHtml(member.name)}</h3>
                <p class="role">${escapeHtml(member.role)}</p>
            </div>
        `;
    }).join('');
}

async function loadAssociationMembers() {
    if (!associationMembersGrid) return;

    try {
        const response = await fetch('/api/public-association-members', { cache: 'no-store' });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || 'Failed to load association members');

        const members = data?.members?.length ? data.members : fallbackMembers;
        renderAssociationMembers(members);
    } catch (error) {
        console.error('Failed to load association members:', error);
        renderAssociationMembers(fallbackMembers);
    }
}

document.addEventListener('DOMContentLoaded', loadAssociationMembers);
