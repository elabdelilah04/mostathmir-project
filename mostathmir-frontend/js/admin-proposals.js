/**
 * MOSTATHMIR - ADMIN PROPOSALS MANAGEMENT
 * نظام إدارة عروض الشراكة - لوحة تحكم الإدارة
 */

// const API_BASE_URL = 'https://mostathmir-api.onrender.com';
let allProposals = [];

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('user_token');

    // 1. التحقق من الصلاحيات (يجب أن يكون آدمن)
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // 2. جلب البيانات الأولية
    await fetchAllProposals();

    // 3. ربط أحداث الفلاتر والبحث
    setupEventListeners();
});

/**
 * جلب كافة عروض الشراكة من السيرفر
 */
async function fetchAllProposals() {
    const grid = document.getElementById('adminProposalsGrid');
    const token = localStorage.getItem('user_token');

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/proposals`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('فشل جلب البيانات من السيرفر');

        allProposals = await response.json();
        renderProposals(allProposals);

    } catch (error) {
        console.error("Fetch Error:", error);
        grid.innerHTML = `<div class="error-msg">⚠️ حدث خطأ: ${error.message}</div>`;
    }
}

/**
 * رص بطاقات العروض في الصفحة
 */
function renderProposals(proposals) {
    const grid = document.getElementById('adminProposalsGrid');

    if (proposals.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-20">
                <i class="fas fa-folder-open text-5xl text-gray-300 mb-4"></i>
                <h3 class="text-gray-500">لا توجد عروض شراكة مطابقة للبحث حالياً.</h3>
            </div>`;
        return;
    }

    grid.innerHTML = proposals.map(prop => createProposalCard(prop)).join('');
}

/**
 * إنشاء هيكل بطاقة العرض الواحدة
 */
function createProposalCard(prop) {
    const statusMap = {
        'pending': { text: 'قيد الانتظار', class: 'status-pending' },
        'accepted': { text: 'تم القبول', class: 'status-approved' },
        'rejected': { text: 'تم الرفض', class: 'status-rejected' }
    };

    const typeMap = {
        'strategic': 'شراكة استراتيجية',
        'expertise': 'مساهمة بالخبرة',
        'advisory': 'مستشار تنفيذي',
        'hybrid': 'شراكة مختلطة'
    };

    const status = statusMap[prop.status] || { text: prop.status, class: '' };
    const date = new Date(prop.createdAt).toLocaleDateString('ar-SA');

    return `
        <div class="project-card reveal fade-up">
            <div class="project-header">
                <h3 class="project-title">من: ${escapeHTML(prop.investorId?.fullName || 'مستثمر')}</h3>
                <span class="project-status ${status.class}">${status.text}</span>
            </div>
            <div class="project-info">
                <div class="info-row">
                    <span class="label">المشروع:</span>
                    <span class="value text-blue-600">${escapeHTML(prop.projectId?.projectName || 'مشروع محذوف')}</span>
                </div>
                <div class="info-row">
                    <span class="label">صاحب الفكرة:</span>
                    <span class="value">${escapeHTML(prop.projectId?.owner?.fullName || 'غير معروف')}</span>
                </div>
                <div class="info-row">
                    <span class="label">تاريخ العرض:</span>
                    <span class="value">${date}</span>
                </div>
                <div class="info-row highlight">
                    <span class="label">نوع الشراكة:</span>
                    <span class="value font-bold">${typeMap[prop.partnershipType] || 'مخصصة'}</span>
                </div>
            </div>
            <div class="project-description">
                <strong>مخلص الشروط:</strong> ${escapeHTML(prop.proposedTerms.substring(0, 80))}...
            </div>
            <div class="project-actions">
                <button class="action-btn btn-primary" onclick="openProposalModal('${prop._id}')">
                    <i class="fas fa-search-plus"></i> عرض التفاصيل الكاملة
                </button>
            </div>
        </div>
    `;
}

/**
 * فتح النافذة المنبثقة لعرض التفاصيل العميقة
 */
window.openProposalModal = (proposalId) => {
    const prop = allProposals.find(p => p._id === proposalId);
    if (!prop) return;

    const modal = document.getElementById('proposalDetailModal');
    const modalBody = document.getElementById('modalBody');

    // إعداد الـ HTML داخل المودال
    let expertiseHTML = (prop.expertiseAreas && prop.expertiseAreas.length > 0)
        ? prop.expertiseAreas.map(area => `<span class="skill-tag">${area}</span>`).join('')
        : '<span class="text-gray-400">لم يتم تحديد خبرات معينة</span>';

    modalBody.innerHTML = `
        <div class="proposal-full-details">
            <div class="detail-section">
                <h4><i class="fas fa-user-tie"></i> بيانات الأطراف</h4>
                <div class="detail-grid">
                    <div class="detail-item"><label>المستثمر:</label> <span>${prop.investorId?.fullName} (${prop.investorId?.email})</span></div>
                    <div class="detail-item"><label>صاحب المشروع:</label> <span>${prop.projectId?.owner?.fullName} (${prop.projectId?.owner?.email})</span></div>
                </div>
            </div>

            <div class="detail-section">
                <h4><i class="fas fa-award"></i> مجالات الخبرة المقترحة</h4>
                <div class="skills-container-public mt-2">${expertiseHTML}</div>
            </div>

            <div class="detail-section">
                <h4><i class="fas fa-file-alt"></i> نص العرض والشروط الكاملة</h4>
                <div class="description-box" style="white-space: pre-wrap;">${escapeHTML(prop.proposedTerms)}</div>
            </div>

            ${prop.responseMessage ? `
            <div class="detail-section" style="border-right: 4px solid #10b981; background: #f0fdf4;">
                <h4><i class="fas fa-reply"></i> رد صاحب المشروع</h4>
                <div class="description-box">${escapeHTML(prop.responseMessage)}</div>
            </div>` : ''}
        </div>
    `;

    modal.classList.add('show');
}

/**
 * إغلاق المودال
 */
window.closeModal = () => {
    document.getElementById('proposalDetailModal').classList.remove('show');
}

/**
 * إعداد الفلاتر والبحث
 */
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allProposals.filter(p =>
                p.investorId?.fullName.toLowerCase().includes(term) ||
                p.projectId?.projectName.toLowerCase().includes(term)
            );
            renderProposals(filtered);
        });
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            const val = e.target.value;
            const filtered = val ? allProposals.filter(p => p.status === val) : allProposals;
            renderProposals(filtered);
        });
    }
}

// دالة حماية النصوص
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}