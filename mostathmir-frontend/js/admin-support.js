let allTickets = [];

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('user_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    await fetchTickets();
    document.getElementById('typeFilter')?.addEventListener('change', applyFilters);
    document.getElementById('statusFilter')?.addEventListener('change', applyFilters);
});

async function fetchTickets() {
    const grid = document.getElementById('ticketsGrid');
    const token = localStorage.getItem('user_token');
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/support/tickets`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch');
        allTickets = await response.json();
        renderTickets(allTickets);
    } catch (error) {
        if (grid) grid.innerHTML = `<p class="text-center text-red-500">حدث خطأ أثناء تحميل البيانات</p>`;
    }
}

function renderTickets(tickets) {
    const grid = document.getElementById('ticketsGrid');
    if (!grid) return;
    if (tickets.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-20"><h3 class="text-gray-400">لا توجد طلبات دعم حالياً.</h3></div>`;
        return;
    }
    grid.innerHTML = tickets.map(t => {
        const isRegistered = t.user && typeof t.user === 'object' && t.user._id;
        const statusMap = { 'pending': 'قيد الانتظار', 'replied': 'تم الرد', 'closed': 'مغلق' };

        return `
        <div class="project-card reveal fade-up">
            <div class="project-header">
                <h3 class="project-title">${escapeHTML(t.name)} ${isRegistered ? '<span class="user-type-badge registered">مسجل</span>' : '<span class="user-type-badge guest">زائر</span>'}</h3>
                <span class="project-status status-${t.status}">
                    ${statusMap[t.status] || t.status}
                </span>
            </div>
            <div class="project-info">
                <div class="info-row"><span class="label">البريد:</span> <span class="value">${t.email}</span></div>
                <div class="info-row"><span class="label">النوع:</span> <span class="value">${t.type}</span></div>
                <div class="info-row"><span class="label">التاريخ:</span> <span class="value">${new Date(t.createdAt).toLocaleDateString('EN-EN')}</span></div>
            </div>
            <div class="project-description">
                <strong>الرسالة:</strong> ${escapeHTML(t.message.substring(0, 60))}...
            </div>
            <div class="project-actions">
                <button class="action-btn btn-primary" onclick="openTicket('${t._id}')">عرض والتفاعل</button>
                <button class="action-btn btn-danger" onclick="deleteTicket('${t._id}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    }).join('');
}

window.openTicket = (id) => {
    const t = allTickets.find(ticket => ticket._id === id);
    if (!t) return;

    const modalBody = document.getElementById('modalBody');
    const modal = document.getElementById('ticketModal');
    const isRegistered = t.user && typeof t.user === 'object';

    modalBody.innerHTML = `
        <div class="detail-section">
            <h4 style="margin-bottom:10px;">رسالة ${t.name}:</h4>
            <div class="description-box" style="white-space: pre-wrap; background: #f8fafc; padding: 15px; border-radius: 8px;">
                ${escapeHTML(t.message)}
            </div>
        </div>
        
        <div class="reply-container" style="margin-top:20px; border-top:1px solid #eee; padding-top:15px;">
            <label style="font-weight:bold; display:block; margin-bottom:8px;">اكتب رد الإدارة:</label>
            <textarea id="adminReplyText" class="form-control" rows="4" style="width:100%; border:1px solid #ddd; padding:10px;" placeholder="اكتب ردك هنا..."></textarea>
            
            <div style="display:flex; gap:10px; margin-top:15px;">
                <button class="action-btn btn-success" onclick="handleReplyAction('${t._id}', 'email')">
                    <i class="fas fa-envelope"></i> الرد عبر الإيميل
                </button>
                ${isRegistered ? `
                <button id="directReplyBtn" class="action-btn btn-primary" onclick="handleReplyAction('${t._id}', 'platform')">
                    <i class="fas fa-comments"></i> رد مباشر في المنصة
                </button>` : ''}
            </div>
        </div>
    `;
    modal.classList.add('show');
}

window.handleReplyAction = async (ticketId, method) => {
    const replyText = document.getElementById('adminReplyText').value;
    if (!replyText.trim()) return alert("يرجى كتابة نص الرد أولاً.");

    const ticket = allTickets.find(t => t._id === ticketId);
    const token = localStorage.getItem('user_token');

    if (method === 'email') {
        // فتح تطبيق الإيميل
        window.location.href = `mailto:${ticket.email}?subject=رد من إدارة مستثمر&body=${encodeURIComponent(replyText)}`;
        // تحديث الحالة لـ Replied
        await fetch(`${API_BASE_URL}/api/admin/support/tickets/${ticketId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ status: 'replied' })
        });
        closeModal(); fetchTickets();
    } else {
        // رد مباشر عبر الـ API
        const btn = document.getElementById('directReplyBtn');
        btn.disabled = true; btn.textContent = "...";
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/support/reply-direct`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ticketId, replyMessage: replyText })
            });
            if (res.ok) {
                alert("تم إرسال الرد وإشعار المستخدم بنجاح.");
                closeModal(); fetchTickets();
            }
        } catch (err) { console.error(err); }
    }
}

window.deleteTicket = async (id) => {
    if (!confirm("حذف هذه الرسالة؟")) return;
    const token = localStorage.getItem('user_token');
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/support/tickets/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) fetchTickets();
    } catch (err) { console.error(err); }
}

function applyFilters() {
    const type = document.getElementById('typeFilter').value;
    const status = document.getElementById('statusFilter').value;
    let filtered = allTickets.filter(t => (type === 'all' || t.type === type) && (status === 'all' || t.status === status));
    renderTickets(filtered);
}

window.closeModal = () => document.getElementById('ticketModal').classList.remove('show');
function escapeHTML(str) { return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }