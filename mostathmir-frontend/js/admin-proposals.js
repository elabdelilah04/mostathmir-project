/**
 * MOSTATHMIR - ADMIN PROPOSALS MANAGEMENT (Final Version)
 * نظام إدارة عروض الشراكة - لوحة تحكم الإدارة
 */

// الرابط الأساسي للـ API (يُفضل تعريفه في ملف خارجي أو تركه إذا كان معرفاً عالمياً)
// const API_BASE_URL = 'https://mostathmir-api.onrender.com';

let allProposals = []; // لتخزين البيانات الأصلية القادمة من السيرفر

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('user_token');

    // 1. التحقق من وجود التوكن (الحماية)
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // 2. جلب كافة البيانات من السيرفر
    await fetchAllProposals();

    // 3. ربط مستمعي الأحداث للفلاتر والبحث
    setupEventListeners();
});

/**
 * جلب عروض الشراكة من السيرفر مع بيانات المستثمر والمشروع والمؤسس
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

        if (!response.ok) throw new Error('فشل جلب البيانات من السيرفر');

        allProposals = await response.json();

        // رسم البيانات لأول مرة بناءً على الفلاتر الافتراضية
        applyFiltersAndRender();

    } catch (error) {
        console.error("Fetch Error:", error);
        if (grid) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-20 text-red-500">
                    <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                    <p>تعذر تحميل البيانات: ${error.message}</p>
                </div>`;
        }
    }
}

/**
 * المحرك الرئيسي للفلترة: يجمع بين البحث، الحالة، والترتيب
 */
function applyFiltersAndRender() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const sortFilter = document.getElementById('sortFilter');

    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const statusVal = statusFilter ? statusFilter.value : 'all';
    const sortVal = sortFilter ? sortFilter.value : 'newest';

    // أ. مرحلة التصفية (Filtering)
    let filtered = allProposals.filter(prop => {
        // البحث في اسم المستثمر أو اسم المشروع
        const matchesSearch =
            (prop.investorId?.fullName || '').toLowerCase().includes(searchTerm) ||
            (prop.projectId?.projectName || '').toLowerCase().includes(searchTerm);

        // التصفية حسب الحالة
        const matchesStatus = (statusVal === 'all') ? true : (prop.status === statusVal);

        return matchesSearch && matchesStatus;
    });

    // ب. مرحلة الترتيب (Sorting)
    filtered.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return (sortVal === 'newest') ? dateB - dateA : dateA - dateB;
    });

    // ج. مرحلة العرض (Rendering)
    renderProposals(filtered);
}

/**
 * حقن بطاقات العروض المفلترة في حاوية الشبكة
 */
function renderProposals(proposals) {
    const grid = document.getElementById('adminProposalsGrid');
    if (!grid) return;

    if (proposals.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-20">
                <i class="fas fa-search text-5xl text-gray-200 mb-4"></i>
                <h3 class="text-gray-400">لا توجد نتائج تطابق معايير البحث الحالية.</h3>
            </div>`;
        return;
    }

    grid.innerHTML = proposals.map(prop => createProposalCard(prop)).join('');
}

/**
 * بناء هيكل بطاقة العرض الواحدة
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
    const projectLink = `project-view.html?id=${prop.projectId?._id}`;

    return `
        <div class="project-card reveal fade-up">
            <div class="project-header">
                <h3 class="project-title">من: ${escapeHTML(prop.investorId?.fullName || 'مستثمر')}</h3>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <a href="${projectLink}" target="_blank" class="view-project-icon" title="مشاهدة صفحة المشروع">
                        <i class="fas fa-external-link-alt"></i>
                    </a>
                    <span class="project-status ${status.class}">${status.text}</span>
                </div>
            </div>
            <div class="project-info">
                <div class="info-row">
                    <span class="label">المشروع المستهدف:</span>
                    <span class="value text-blue-600">${escapeHTML(prop.projectId?.projectName || 'مشروع محذوف')}</span>
                </div>
                <div class="info-row">
                    <span class="label">صاحب الفكرة:</span>
                    <span class="value">${escapeHTML(prop.projectId?.owner?.fullName || 'غير معروف')}</span>
                </div>
                <div class="info-row highlight">
                    <span class="label">نوع الشراكة:</span>
                    <span class="value font-bold">${typeMap[prop.partnershipType] || 'مخصصة'}</span>
                </div>
                <div class="info-row">
                    <span class="label">تاريخ التقديم:</span>
                    <span class="value">${date}</span>
                </div>
            </div>
            <div class="project-description">
                <strong>ملخص الشروط:</strong> ${escapeHTML(prop.proposedTerms.substring(0, 80))}...
            </div>
            <div class="project-actions">
                <button class="action-btn btn-primary" onclick="openProposalModal('${prop._id}')">
                    <i class="fas fa-info-circle"></i> عرض التفاصيل والخبرات
                </button>
            </div>
        </div>
    `;
}

/**
 * فتح النافذة المنبثقة لعرض التفاصيل الكاملة والخبرات
 */
window.openProposalModal = (proposalId) => {
    const prop = allProposals.find(p => p._id === proposalId);
    if (!prop) return;

    const modal = document.getElementById('proposalDetailModal');
    const modalBody = document.getElementById('modalBody');

    // تجهيز مجالات الخبرة
    let expertiseHTML = (prop.expertiseAreas && prop.expertiseAreas.length > 0)
        ? prop.expertiseAreas.map(area => `<span class="skill-tag">${area}</span>`).join('')
        : '<span class="text-gray-400 font-normal">لم يتم تحديد مجالات خبرة معينة</span>';

    modalBody.innerHTML = `
        <div class="proposal-full-details">
            <div class="detail-section">
                <h3><i class="fas fa-user-tie"></i> بيانات الأطراف المتعاقدة</h3>
                <div class="detail-grid">
                    <div class="detail-item"><label>المستثمر المقترح:</label> <span>${prop.investorId?.fullName} (${prop.investorId?.email || 'بدون بريد'})</span></div>
                    <div class="detail-item"><label>صاحب المشروع:</label> <span>${prop.projectId?.owner?.fullName || 'غير متوفر'} (${prop.projectId?.owner?.email || ''})</span></div>
                </div>
            </div>

            <div class="detail-section">
                <h3><i class="fas fa-award"></i> مهارات القيمة المضافة</h3>
                <div class="skills-container-public mt-2" style="display:flex; flex-wrap:wrap; gap:8px;">
                    ${expertiseHTML}
                </div>
            </div>

            <div class="detail-section">
                <h3><i class="fas fa-file-alt"></i> البنود والمقترحات التفصيلية</h3>
                <div class="description-box" style="white-space: pre-wrap; background: #fff; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px;">
                    ${escapeHTML(prop.proposedTerms)}
                </div>
            </div>

            ${prop.responseMessage ? `
            <div class="detail-section" style="border-right: 4px solid #10b981; background: #f0fdf4;">
                <h3><i class="fas fa-reply"></i> رد صاحب المشروع</h3>
                <div class="description-box" style="background:transparent; border:none; padding:0;">
                    ${escapeHTML(prop.responseMessage)}
                </div>
            </div>` : ''}
        </div>
    `;

    modal.classList.add('show');
}

/**
 * إغلاق المودال
 */
window.closeModal = () => {
    const modal = document.getElementById('proposalDetailModal');
    if (modal) modal.classList.remove('show');
}

/**
 * إعداد مستمعي الأحداث للفلاتر
 */
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const sortFilter = document.getElementById('sortFilter');

    if (searchInput) searchInput.addEventListener('input', applyFiltersAndRender);
    if (statusFilter) statusFilter.addEventListener('change', applyFiltersAndRender);
    if (sortFilter) sortFilter.addEventListener('change', applyFiltersAndRender);

    // إغلاق المودال عند النقر خارجه
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('proposalDetailModal');
        if (event.target === modal) closeModal();
    });
}

/**
 * دالة حماية من هجمات XSS
 */
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[m]));
}