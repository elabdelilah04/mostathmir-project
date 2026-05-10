/**
 * MOSTATHMIR - ADMIN PROPOSALS MANAGEMENT (Official Version)
 * إدارة عروض الشراكة والمقترحات - لوحة تحكم الإدارة
 */

// الرابط الأساسي للـ API (يتغير حسب بيئة العمل)
// const API_BASE_URL = 'https://mostathmir-api.onrender.com';

let allProposals = []; // لتخزين البيانات الأصلية للفلترة السريعة

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('user_token');

    // 1. حماية المسار
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // 2. جلب البيانات الأولية
    await fetchAllProposals();

    // 3. ربط الفلاتر والبحث
    setupEventListeners();
});

/**
 * جلب كافة العروض من السيرفر
 */
async function fetchAllProposals() {
    const grid = document.getElementById('adminProposalsGrid');
    const token = localStorage.getItem('user_token');

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/proposals`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('فشل جلب البيانات');

        allProposals = await response.json();

        // عرض البيانات فور وصولها
        applyFiltersAndRender();

    } catch (error) {
        console.error("Fetch Error:", error);
        if (grid) {
            grid.innerHTML = `<div class="col-span-full text-center py-20 text-red-500">⚠️ خطأ في تحميل البيانات: ${error.message}</div>`;
        }
    }
}

/**
 * المحرك الموحد: بحث + حالة + ترتيب
 */
function applyFiltersAndRender() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const sortFilter = document.getElementById('sortFilter');

    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const statusVal = statusFilter ? statusFilter.value : 'all';
    const sortVal = sortFilter ? sortFilter.value : 'newest';

    // أ. التصفية بناءً على النص والحالة
    let filtered = allProposals.filter(prop => {
        const investorName = prop.investorId?.fullName || '';
        const projectName = prop.projectId?.projectName || '';

        const matchesSearch = investorName.toLowerCase().includes(searchTerm) ||
            projectName.toLowerCase().includes(searchTerm);

        const matchesStatus = (statusVal === 'all') ? true : (prop.status === statusVal);

        return matchesSearch && matchesStatus;
    });

    // ب. الترتيب الزمني
    filtered.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return (sortVal === 'newest') ? dateB - dateA : dateA - dateB;
    });

    // ج. الرسم في الصفحة
    renderProposals(filtered);
}

/**
 * بناء بطاقات العروض
 */
function renderProposals(proposals) {
    const grid = document.getElementById('adminProposalsGrid');
    if (!grid) return;

    if (proposals.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-20">
                <i class="fas fa-search text-5xl text-gray-200 mb-4"></i>
                <h3 class="text-gray-400">لا توجد نتائج تطابق معايير البحث.</h3>
            </div>`;
        return;
    }

    grid.innerHTML = proposals.map(prop => createProposalCard(prop)).join('');
}

/**
 * هيكل البطاقة الفردية (مع الروابط وأيقونة المعاينة)
 */
function createProposalCard(prop) {
    const statusMap = {
        'pending': { text: 'قيد الانتظار', class: 'status-pending' },
        'accepted': { text: 'تم القبول', class: 'status-approved' },
        'rejected': { text: 'تم الرفض', class: 'status-rejected' }
    };
    const status = statusMap[prop.status] || { text: prop.status, class: '' };

    const investorId = prop.investorId?._id;
    const ownerId = prop.projectId?.owner?._id;
    const projectId = prop.projectId?._id;

    return `
        <div class="project-card reveal fade-up">
            <div class="project-header">
                <h3 class="project-title">
                    من: <a href="public-profile.html?id=${investorId}" target="_blank" class="admin-user-link" title="عرض ملف المستثمر">
                        ${escapeHTML(prop.investorId?.fullName || 'مستثمر')}
                    </a>
                </h3>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <a href="project-view.html?id=${projectId}" target="_blank" class="view-project-icon" title="مشاهدة صفحة المشروع">
                        <i class="fas fa-external-link-alt"></i>
                    </a>
                    <span class="project-status ${status.class}">${status.text}</span>
                </div>
            </div>
            <div class="project-info">
                <div class="info-row">
                    <span class="label">المشروع المستهدف:</span>
                    <span class="value font-bold">${escapeHTML(prop.projectId?.projectName || 'مشروع محذوف')}</span>
                </div>
                <div class="info-row">
                    <span class="label">صاحب المشروع:</span>
                    <span class="value">
                        <a href="public-profile.html?id=${ownerId}" target="_blank" class="admin-user-link">
                            ${escapeHTML(prop.projectId?.owner?.fullName || 'غير معروف')}
                        </a>
                    </span>
                </div>
                <div class="info-row highlight">
                    <span class="label">نوع الشراكة:</span>
                    <span class="value font-bold">${prop.partnershipType}</span>
                </div>
                <div class="info-row">
                    <span class="label">تاريخ العرض:</span>
                    <span class="value">${new Date(prop.createdAt).toLocaleDateString('ar-SA')}</span>
                </div>
            </div>
            <div class="project-actions">
                <button class="action-btn btn-primary" onclick="openProposalModal('${prop._id}')">
                    <i class="fas fa-search-plus"></i> التفاصيل والخبرات
                </button>
            </div>
        </div>
    `;
}

/**
 * فتح المودال مع إجراءات الآدمن (إيميل وحذف)
 */
window.openProposalModal = (proposalId) => {
    const prop = allProposals.find(p => p._id === proposalId);
    if (!prop) return;

    const modal = document.getElementById('proposalDetailModal');
    const modalBody = document.getElementById('modalBody');

    let expertiseHTML = (prop.expertiseAreas && prop.expertiseAreas.length > 0)
        ? prop.expertiseAreas.map(area => `<span class="skill-tag">${area}</span>`).join('')
        : '<span class="text-gray-400">لم يتم تحديد خبرات</span>';

    modalBody.innerHTML = `
        <div class="proposal-full-details">
            <div class="detail-section" style="background: #f1f5f9; border: none;">
                <h4 style="margin-bottom:15px;"><i class="fas fa-user-shield"></i> إجراءات إدارية</h4>
                <div style="display: flex; gap: 12px;">
                    <a href="mailto:${prop.investorId?.email}" class="action-btn btn-secondary" style="background: #fff;">
                        <i class="fas fa-envelope"></i> مراسلة المستثمر
                    </a>
                    <button class="action-btn btn-danger" onclick="handleDeleteProposal('${prop._id}')">
                        <i class="fas fa-trash"></i> حذف العرض (Spam)
                    </button>
                </div>
            </div>

            <div class="detail-section">
                <h4><i class="fas fa-award"></i> مجالات القيمة المضافة</h4>
                <div class="skills-container-public mt-2" style="display:flex; flex-wrap:wrap; gap:8px;">
                    ${expertiseHTML}
                </div>
            </div>

            <div class="detail-section">
                <h4><i class="fas fa-file-alt"></i> نص العرض والشروط المقترحة</h4>
                <div class="description-box" style="white-space: pre-wrap; background: #fff; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    ${escapeHTML(prop.proposedTerms)}
                </div>
            </div>

            ${prop.responseMessage ? `
            <div class="detail-section" style="border-right: 4px solid #10b981; background: #f0fdf4;">
                <h4><i class="fas fa-reply"></i> رد صاحب المشروع</h4>
                <p style="padding:10px 0;">${escapeHTML(prop.responseMessage)}</p>
            </div>` : ''}
        </div>
    `;

    modal.classList.add('show');
}

/**
 * إجراء الحذف (تنبيه)
 */
window.handleDeleteProposal = async (id) => {
    if (confirm("تحذير: هل أنت متأكد من حذف هذا العرض نهائياً من النظام؟ لا يمكن التراجع.")) {
        // هنا يمكن ربط الـ API الخاص بالحذف مستقبلاً
        alert("تم إرسال طلب الحذف (قيد البرمجة في Backend)");
    }
}

window.closeModal = () => {
    document.getElementById('proposalDetailModal').classList.remove('show');
}

function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', applyFiltersAndRender);
    document.getElementById('statusFilter').addEventListener('change', applyFiltersAndRender);
    document.getElementById('sortFilter').addEventListener('change', applyFiltersAndRender);

    // إغلاق عند الضغط خارج المودال
    window.onclick = (e) => {
        const modal = document.getElementById('proposalDetailModal');
        if (e.target === modal) closeModal();
    };
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}