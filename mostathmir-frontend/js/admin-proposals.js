/**
 * MOSTATHMIR - ADMIN PROPOSALS MANAGEMENT (Official Final Version)
 * نظام إدارة عروض الشراكة - لوحة تحكم الإدارة
 */

// الرابط الأساسي للـ API (يُفترض أنه معرف عالمياً في سكريبت خارجي أو استبدله بالرابط المباشر)
// const API_BASE_URL = 'https://mostathmir-api.onrender.com';

let allProposals = []; // مخزن البيانات للفلترة اللحظية

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('user_token');

    // 1. حماية المسار (تأكد أن المستخدم سجل دخوله)
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // 2. جلب البيانات الأولية من السيرفر
    await fetchAllProposals();

    // 3. ربط أحداث الفلاتر والبحث
    setupEventListeners();
});

/**
 * جلب كافة عروض الشراكة مع بيانات الأطراف والمشاريع
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
 * المحرك الموحد للتصفية والبحث والترتيب
 */
function applyFiltersAndRender() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const sortFilter = document.getElementById('sortFilter');

    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const statusVal = statusFilter ? statusFilter.value : 'all';
    const sortVal = sortFilter ? sortFilter.value : 'newest';

    // 1. التصفية (البحث في اسم المستثمر أو المشروع + الحالة)
    let filtered = allProposals.filter(p => {
        const investorName = p.investorId?.fullName || '';
        const projectName = p.projectId?.projectName || '';

        const matchesSearch = investorName.toLowerCase().includes(searchTerm) ||
            projectName.toLowerCase().includes(searchTerm);

        const matchesStatus = (statusVal === 'all') ? true : (p.status === statusVal);

        return matchesSearch && matchesStatus;
    });

    // 2. الترتيب الزمني
    filtered.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return (sortVal === 'newest') ? dateB - dateA : dateA - dateB;
    });

    // 3. الرسم في الصفحة
    renderProposals(filtered);
}

/**
 * حقن بطاقات العروض في حاوية الشبكة
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

    grid.innerHTML = proposals.map(p => createProposalCard(p)).join('');
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
                    <span class="value font-bold text-blue-600">${escapeHTML(prop.projectId?.projectName || 'مشروع محذوف')}</span>
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
                    <span class="label">تاريخ التقديم:</span>
                    <span class="value">${new Date(prop.createdAt).toLocaleDateString('ar-SA')}</span>
                </div>
            </div>
            <div class="project-actions">
                <button class="action-btn btn-primary" onclick="openProposalModal('${prop._id}')">
                    <i class="fas fa-tools"></i> إجراءات الإدارة والتفاصيل
                </button>
            </div>
        </div>
    `;
}

/**
 * فتح المودال مع لوحة التحكم في العرض (إرسال إشعارات رسمية + حذف)
 */
window.openProposalModal = (proposalId) => {
    const prop = allProposals.find(p => p._id === proposalId);
    if (!prop) return;

    const modal = document.getElementById('proposalDetailModal');
    const modalBody = document.getElementById('modalBody');

    let expertiseHTML = (prop.expertiseAreas && prop.expertiseAreas.length > 0)
        ? prop.expertiseAreas.map(area => `<span class="skill-tag">${area}</span>`).join('')
        : '<span class="text-gray-400 font-normal">لم يتم تحديد مجالات خبرة معينة</span>';

    modalBody.innerHTML = `
        <div class="proposal-full-details">
            <!-- 1. لوحة تحكم الإدارة (رسائل رسمية وحذف) -->
            <div class="detail-section" style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px;">
                <h4 style="color:#1e3a8a; margin-bottom:15px;"><i class="fas fa-bullhorn"></i> توجيه إشعار رسمي بخصوص هذا العرض</h4>
                <textarea id="adminNote" placeholder="اكتب ملاحظة الإدارة هنا..." 
                    style="width:100%; padding:12px; border-radius:8px; border:1px solid #cbd5e1; margin-bottom:15px; min-height:80px;"></textarea>
                
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button class="action-btn btn-primary" style="flex:1" onclick="sendAdminNotice('${prop.investorId?._id}', '${prop._id}', '${prop.projectId?.projectName}', '${prop.projectId?._id}')">
                        <i class="fas fa-paper-plane"></i> إشعار للمستثمر
                    </button>
                    <button class="action-btn btn-success" style="flex:1" onclick="sendAdminNotice('${prop.projectId?.owner?._id}', '${prop._id}', '${prop.projectId?.projectName}', '${prop.projectId?._id}')">
                        <i class="fas fa-paper-plane"></i> إشعار للمؤسس
                    </button>
                    <button class="action-btn btn-danger" style="padding: 10px 20px;" onclick="deleteProposalProcess('${prop._id}')">
                        <i class="fas fa-trash"></i> حذف العرض
                    </button>
                </div>
            </div>

            <!-- 2. تفاصيل العرض والخبرات -->
            <div class="detail-section mt-6">
                <h4><i class="fas fa-file-contract"></i> بنود مقترح الشراكة</h4>
                <div class="description-box" style="white-space: pre-wrap; background: #fff; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    ${escapeHTML(prop.proposedTerms)}
                </div>
                <div class="mt-4">
                    <h5 class="text-sm font-bold text-gray-500 mb-2">مجالات القيمة المضافة المقترحة:</h5>
                    <div style="display:flex; flex-wrap:wrap; gap:8px;">${expertiseHTML}</div>
                </div>
            </div>

            <!-- 3. تتبع الرد (إن وجد) -->
            ${prop.responseMessage ? `
            <div class="detail-section" style="border-right: 4px solid #10b981; background: #f0fdf4;">
                <h4><i class="fas fa-reply"></i> رد صاحب المشروع النهائي</h4>
                <p style="padding:10px 0; color: #166534;">${escapeHTML(prop.responseMessage)}</p>
            </div>` : ''}
        </div>
    `;

    modal.classList.add('show');
}

/**
 * إرسال الإشعار الرسمي المنسق للسيرفر
 */
window.sendAdminNotice = async (userId, propId, projectName, projId) => {
    const adminNote = document.getElementById('adminNote').value.trim();
    if (!adminNote) return alert("يرجى كتابة الملاحظة المراد إرسالها.");

    const token = localStorage.getItem('user_token');

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/proposals/notify`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                recipientId: userId,
                adminNote,
                proposalId: propId,
                projectName: projectName,
                projectId: projId
            })
        });

        if (response.ok) {
            alert(`✅ تم توجيه الإشعار بنجاح بخصوص مشروع: ${projectName}`);
            document.getElementById('adminNote').value = ""; // مسح النص بعد الإرسال
        } else {
            throw new Error("فشل إرسال الإشعار من السيرفر.");
        }
    } catch (err) {
        alert("⚠️ خطأ: " + err.message);
    }
}

/**
 * إجراء الحذف النهائي للاقتراح
 */
window.deleteProposalProcess = async (id) => {
    if (!confirm("تحذير: هل أنت متأكد من حذف هذا الاقتراح نهائياً؟ لا يمكن التراجع عن هذا الإجراء.")) return;

    const token = localStorage.getItem('user_token');
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/proposals/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            alert("✅ تم حذف الاقتراح بنجاح من النظام.");
            closeModal();
            fetchAllProposals(); // إعادة تحميل القائمة بعد الحذف
        } else {
            throw new Error("فشل الحذف.");
        }
    } catch (err) {
        alert("⚠️ خطأ في عملية الحذف.");
    }
}

/**
 * إغلاق المودال
 */
window.closeModal = () => {
    const modal = document.getElementById('proposalDetailModal');
    if (modal) modal.classList.remove('show');
}

/**
 * تهيئة مستمعي الأحداث للفلاتر والبحث
 */
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const sortFilter = document.getElementById('sortFilter');

    if (searchInput) searchInput.addEventListener('input', applyFiltersAndRender);
    if (statusFilter) statusFilter.addEventListener('change', applyFiltersAndRender);
    if (sortFilter) sortFilter.addEventListener('change', applyFiltersAndRender);

    // إغلاق المودال عند الضغط خارجه
    window.onclick = (e) => {
        const modal = document.getElementById('proposalDetailModal');
        if (e.target === modal) closeModal();
    };
}

/**
 * دالة حماية من هجمات XSS عبر تعقيم النصوص
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