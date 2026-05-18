/**
 * MOSTATHMIR - ADMIN SUPPORT MANAGEMENT
 * نظام إدارة تذاكر الدعم - النسخة الاحترافية المحدثة
 */

let allTickets = [];

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('user_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    await fetchTickets();

    // ربط فلاتر البحث والتصفية
    document.getElementById('typeFilter')?.addEventListener('change', applyFilters);
    document.getElementById('statusFilter')?.addEventListener('change', applyFilters);
});

/**
 * جلب التذاكر مع بيانات المستخدمين من السيرفر
 */
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
        console.error("Error fetching tickets:", error);
        if (grid) grid.innerHTML = `<p class="text-center text-red-500">حدث خطأ أثناء تحميل البيانات</p>`;
    }
}

/**
 * رسم التذاكر مع التمييز بين المستخدم المسجل والزائر
 */
function renderTickets(tickets) {
    const grid = document.getElementById('ticketsGrid');
    if (!grid) return;

    if (tickets.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-20"><h3 class="text-gray-400">لا توجد طلبات دعم حالياً.</h3></div>`;
        return;
    }

    grid.innerHTML = tickets.map(t => {
        // فحص: هل الحساب مسجل؟ (إذا كان حقل user يحتوي على بيانات كائن)
        const isRegistered = t.user && typeof t.user === 'object' && t.user._id;
        
        // إعداد الشارة والاسم
        const userTypeBadge = isRegistered 
            ? `<span class="user-type-badge registered">مسجل</span>` 
            : `<span class="user-type-badge guest">زائر</span>`;
        
        const nameDisplay = isRegistered 
            ? `<a href="public-profile.html?id=${t.user._id}" target="_blank" class="admin-sender-link" title="عرض الملف الشخصي">${escapeHTML(t.name)}</a>`
            : escapeHTML(t.name);

        return `
        <div class="project-card reveal fade-up">
            <div class="project-header">
                <h3 class="project-title">${nameDisplay} ${userTypeBadge}</h3>
                <span class="project-status ${t.status === 'pending' ? 'status-pending' : 'status-approved'}">
                    ${t.status === 'pending' ? 'قيد الانتظار' : 'مغلق'}
                </span>
            </div>
            <div class="project-info">
                <div class="info-row"><span class="label">البريد الإلكتروني:</span> <span class="value">${t.email}</span></div>
                <div class="info-row"><span class="label">نوع الطلب:</span> <span class="value">${getTranslateType(t.type)}</span></div>
                <div class="info-row"><span class="label">تاريخ الإرسال:</span> <span class="value">${new Date(t.createdAt).toLocaleDateString('ar-SA')}</span></div>
            </div>
            <div class="project-description">
                <strong>الرسالة:</strong> ${escapeHTML(t.message.substring(0, 80))}...
            </div>
            <div class="project-actions">
                <button class="action-btn btn-primary" onclick="openTicket('${t._id}')">
                    <i class="fas fa-envelope-open-text"></i> عرض التفاصيل
                </button>
                <button class="action-btn btn-danger" onclick="deleteTicket('${t._id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>`;
    }).join('');
}

/**
 * فتح المودال لعرض الرسالة الكاملة والرد
 */
window.openTicket = (id) => {
    const t = allTickets.find(ticket => ticket._id === id);
    if (!t) return;

    const modalBody = document.getElementById('modalBody');
    const modal = document.getElementById('ticketModal');
    
    modalBody.innerHTML = `
        <div class="detail-section">
            <h4 style="margin-bottom:10px;"><i class="fas fa-comment-alt"></i> نص الرسالة الواردة:</h4>
            <div class="description-box" style="white-space: pre-wrap; background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px;">
                ${escapeHTML(t.message)}
            </div>
        </div>
        <div class="approval-actions" style="margin-top:25px; display: flex; gap: 10px;">
            <a href="mailto:${t.email}?subject=رد من إدارة منصة مستثمر" class="action-btn btn-success" style="text-decoration:none;">
                <i class="fas fa-reply"></i> الرد عبر الإيميل
            </a>
            ${t.status === 'pending' ? `
                <button class="action-btn btn-secondary" onclick="updateTicketStatus('${t._id}', 'closed')">
                    <i class="fas fa-check-double"></i> إغلاق التذكرة
                </button>
            ` : ''}
        </div>
    `;
    modal.classList.add('show');
}

/**
 * تحديث حالة التذكرة (إغلاق)
 */
window.updateTicketStatus = async (id, status) => {
    const token = localStorage.getItem('user_token');
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/support/tickets/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ status })
        });
        if (res.ok) {
            closeModal();
            fetchTickets();
        }
    } catch (err) { console.error(err); }
}

/**
 * حذف التذكرة نهائياً
 */
window.deleteTicket = async (id) => {
    if (!confirm("هل أنت متأكد من حذف هذه الرسالة؟")) return;
    const token = localStorage.getItem('user_token');
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/support/tickets/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) fetchTickets();
    } catch (err) { console.error(err); }
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

window.closeModal = () => document.getElementById('ticketModal').classList.remove('show');

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}