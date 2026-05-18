/**
 * MOSTATHMIR - ADMIN SUPPORT MANAGEMENT
 */

let allTickets = [];

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('user_token');
    if (!token) return window.location.href = 'login.html';

    await fetchTickets();

    document.getElementById('typeFilter').addEventListener('change', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
});

async function fetchTickets() {
    const token = localStorage.getItem('user_token');
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/support/tickets`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        allTickets = await response.json();
        renderTickets(allTickets);
    } catch (error) {
        console.error("Error:", error);
    }
}

function renderTickets(tickets) {
    const grid = document.getElementById('ticketsGrid');
    grid.innerHTML = tickets.map(t => {
        // تحديد ما إذا كان الحساب مسجلاً أم زائراً
        const isRegistered = t.user !== null;
        const userTypeBadge = isRegistered 
            ? `<span class="user-badge-registered">مسجل</span>` 
            : `<span class="user-badge-guest">زائر</span>`;
        
        // جعل الاسم قابلاً للنقر إذا كان مسجلاً
        const nameDisplay = isRegistered 
            ? `<a href="public-profile.html?id=${t.user._id}" target="_blank" class="admin-user-link">${escapeHTML(t.name)}</a>`
            : escapeHTML(t.name);

        return `
        <div class="project-card">
            <div class="project-header">
                <h3 class="project-title">${nameDisplay} ${userTypeBadge}</h3>
                <span class="project-status ${t.status === 'pending' ? 'status-pending' : 'status-approved'}">
                    ${t.status === 'pending' ? 'قيد الانتظار' : 'محلولة'}
                </span>
            </div>
            <div class="project-info">
                <div class="info-row"><span class="label">البريد:</span> <span class="value">${t.email}</span></div>
                <div class="info-row"><span class="label">النوع:</span> <span class="value">${getTranslateType(t.type)}</span></div>
                <div class="info-row"><span class="label">التاريخ:</span> <span class="value">${new Date(t.createdAt).toLocaleDateString('ar-SA')}</span></div>
            </div>
            <p class="project-description">${escapeHTML(t.message.substring(0, 80))}...</p>
            <div class="project-actions">
                <button class="action-btn btn-primary" onclick="openTicket('${t._id}')">فتح الطلب</button>
                <button class="action-btn btn-danger" onclick="deleteTicket('${t._id}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    }).join('');
}

function getTranslateType(type) {
    const types = { tech: 'دعم تقني', inquiry: 'استفسار', suggestion: 'اقتراح', other: 'غير ذلك' };
    return types[type] || type;
}

function applyFilters() {
    const type = document.getElementById('typeFilter').value;
    const status = document.getElementById('statusFilter').value;

    let filtered = allTickets.filter(t => {
        const matchType = (type === 'all') || (t.type === type);
        const matchStatus = (status === 'all') || (t.status === status);
        return matchType && matchStatus;
    });

    renderTickets(filtered);
}

window.openTicket = (id) => {
    const t = allTickets.find(ticket => ticket._id === id);
    const modalBody = document.getElementById('modalBody');

    modalBody.innerHTML = `
        <div class="detail-section">
            <p><strong>الرسالة الكاملة:</strong></p>
            <div class="description-box" style="margin-top:10px;">${escapeHTML(t.message)}</div>
        </div>
        <div class="approval-actions" style="margin-top:20px;">
            <a href="mailto:${t.email}?subject=رد من منصة مستثمر" class="action-btn btn-success">الرد عبر الإيميل</a>
            <button class="action-btn btn-secondary" onclick="updateStatus('${t._id}', 'closed')">إغلاق التذكرة</button>
        </div>
    `;
    document.getElementById('ticketModal').classList.add('show');
}

window.updateStatus = async (id, status) => {
    const token = localStorage.getItem('user_token');
    await fetch(`${API_BASE_URL}/api/admin/support/tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status })
    });
    alert("تم تحديث الحالة");
    window.location.reload();
}

window.deleteTicket = async (id) => {
    if (!confirm("حذف الرسالة؟")) return;
    const token = localStorage.getItem('user_token');
    await fetch(`${API_BASE_URL}/api/admin/support/tickets/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    window.location.reload();
}

function closeModal() { document.getElementById('ticketModal').classList.remove('show'); }

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}