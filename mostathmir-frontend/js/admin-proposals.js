/**
 * MOSTATHMIR - ADMIN PROPOSALS MANAGEMENT (Official Final Version)
 * نظام إدارة عروض الشراكة - لوحة تحكم الإدارة
 */

let allProposals = []; // مخزن البيانات الرئيسي للفلترة السريعة

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('user_token');

    // 1. التحقق من الصلاحيات (الحماية)
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // 2. انطلاق جلب البيانات
    await fetchAllProposals();

    // 3. ربط أحداث الفلاتر (البحث، الحالة، الترتيب)
    setupEventListeners();
});

/**
 * جلب كافة عروض الشراكة من السيرفر (Backend API)
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

        // الرسم الأولي للبيانات
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
 * المحرك الموحد: يقوم بالبحث والفلترة والترتيب في آن واحد
 */
function applyFiltersAndRender() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const sortFilter = document.getElementById('sortFilter');

    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const statusVal = statusFilter ? statusFilter.value : 'all';
    const sortVal = sortFilter ? sortFilter.value : 'newest';

    // أ. مرحلة التصفية (البحث في الأسماء + الحالة)
    let filtered = allProposals.filter(p => {
        const investorName = p.investorId?.fullName || '';
        const projectName = p.projectId?.projectName || '';
        
        const matchesSearch = investorName.toLowerCase().includes(searchTerm) || 
                              projectName.toLowerCase().includes(searchTerm);
        
        const matchesStatus = (statusVal === 'all') ? true : (p.status === statusVal);
        
        return matchesSearch && matchesStatus;
    });

    // ب. مرحلة الترتيب (الأحدث/الأقدم)
    filtered.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return (sortVal === 'newest') ? dateB - dateA : dateA - dateB;
    });

    // ج. مرحلة العرض النهائي
    renderProposals(filtered);
}

/**
 * حقن بطاقات العروض في حاوية الشبكة (Grid)
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

    grid.innerHTML = proposals.map(p => createProposalCard(p)).join('');
}

/**
 * بناء هيكل بطاقة العرض الفردية
 */
function createProposalCard(prop) {
    const statusMap = {
        'pending': { text: 'قيد الانتظار', class: 'status-pending' },
        'accepted': { text: 'تم القبول', class: 'status-approved' },
        'rejected': { text: 'تم الرفض', class: 'status-rejected' }
    };
    const status = statusMap[prop.status] || { text: prop.status, class: '' };
    
    // روابط الحسابات والمشروع
    const investorId = prop.investorId?._id;
    const ownerId = prop.projectId?.owner?._id;
    const projectId = prop.projectId?._id;
    const projectLink = `project-view.html?id=${projectId}`;

    return `
        <div class="project-card reveal fade-up">
            <div class="project-header">
                <h3 class="project-title">
                    من: <a href="public-profile.html?id=${investorId}" target="_blank" class="admin-user-link">
                        ${escapeHTML(prop.investorId?.fullName || 'مستثمر')}
                    </a>
                </h3>
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
                    <span class="value font-bold text-blue-600">${escapeHTML(prop.projectId?.projectName || 'محذوف')}</span>
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
                    <span class="value font-bold">${prop.partnershipType || 'مخصصة'}</span>
                </div>
                <div class="info-row">
                    <span class="label">تاريخ التقديم:</span>
                    <span class="value">${new Date(prop.createdAt).toLocaleDateString('ar-SA')}</span>
                </div>
            </div>
            <div class="project-actions">
                <button class="action-btn btn-primary" onclick="openProposalModal('${prop._id}')">
                    <i class="fas fa-tools"></i> تفاصيل العرض والإجراءات الإدارية
                </button>
            </div>
        </div>`;
}

/**
 * فتح المودال مع لوحة تحكم إدارية كاملة (إشعارات رسمية + حذف)
 */
window.openProposalModal = (proposalId) => {
    const prop = allProposals.find(p => p._id === proposalId);
    if (!prop) return;

    const modal = document.getElementById('proposalDetailModal');
    const modalBody = document.getElementById('modalBody');

    // تجهيز مجالات الخبرة
    let expertiseHTML = (prop.expertiseAreas && prop.expertiseAreas.length > 0) 
        ? prop.expertiseAreas.map(area => `<span class="skill-tag">${area}</span>`).join('') 
        : '<span class="text-gray-400 font-normal">لم يتم تحديد خبرات مضافة</span>';

    modalBody.innerHTML = `
        <div class="proposal-full-details">
            <!-- 1. لوحة تحكم الإدارة (توجيه إشعارات رسمية) -->
            <div class="detail-section" style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px;">
                <h4 style="color:#1e3a8a; margin-bottom:15px;"><i class="fas fa-bullhorn"></i> توجيه إشعار رسمي بخصوص العرض</h4>
                <textarea id="adminNoteText" placeholder="اكتب ملاحظة الإدارة هنا (ستظهر بوضوح تحت عنوان الإشعار)..." 
                    style="width:100%; padding:12px; border-radius:8px; border:1px solid #cbd5e1; margin-bottom:15px; min-height:80px;"></textarea>
                
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button class="action-btn btn-primary" style="flex:1" onclick="sendAdminNotice('${prop.investorId?._id}', '${prop._id}', '${prop.projectId?.projectName}', '${prop.projectId?._id}')">
                        <i class="fas fa-paper-plane"></i> إشعار للمستثمر
                    </button>
                    <button class="action-btn btn-success" style="flex:1" onclick="sendAdminNotice('${prop.projectId?.owner?._id}', '${prop._id}', '${prop.projectId?.projectName}', '${prop.projectId?._id}')">
                        <i class="fas fa-paper-plane"></i> إشعار للمؤسس
                    </button>
                    <button class="action-btn btn-danger" onclick="deleteProposalProcess('${prop._id}')">
                        <i class="fas fa-trash"></i> حذف الاقتراح
                    </button>
                </div>
            </div>

            <!-- 2. تفاصيل مقترح الشراكة -->
            <div class="detail-section mt-6">
                <h4><i class="fas fa-file-contract"></i> بنود مقترح الشراكة</h4>
                <div class="description-box" style="white-space: pre-wrap; background: #fff; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    ${escapeHTML(prop.proposedTerms)}
                </div>
                <div class="mt-4">
                    <h5 class="text-sm font-bold text-gray-500 mb-2">مجالات الخبرة المقترحة:</h5>
                    <div style="display:flex; flex-wrap:wrap; gap:8px;">${expertiseHTML}</div>
                </div>
            </div>

            <!-- 3. تتبع رد صاحب المشروع (إن وجد) -->
            ${prop.responseMessage ? `
            <div class="detail-section" style="border-right: 4px solid #10b981; background: #f0fdf4;">
                <h4><i class="fas fa-reply"></i> رد صاحب المشروع النهائي</h4>
                <p style="padding:10px 0; color: #166534; font-weight: 500;">${escapeHTML(prop.responseMessage)}</p>
                <span class="text-xs text-gray-500">بتاريخ: ${new Date(prop.respondedAt).toLocaleDateString('ar-SA')}</span>
            </div>` : ''}
        </div>
    `;

    modal.classList.add('show');
}

/**
 * إرسال الإشعار الرسمي المنسق للسيرفر
 */
window.sendAdminNotice = async (userId, propId, projectName, projId) => {
    const adminNote = document.getElementById('adminNoteText').value.trim();
    if (!adminNote) return alert("يرجى كتابة نص الملاحظة المراد إرسالها.");

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
                adminNote: adminNote, 
                proposalId: propId, 
                projectName: projectName, 
                projectId: projId 
            })
        });

        if (response.ok) {
            alert(`✅ تم توجيه الإشعار بنجاح.\nبخصوص مشروع: ${projectName}`);
            document.getElementById('adminNoteText').value = ""; // مسح النص
        } else {
            const errData = await response.json();
            throw new Error(errData.message || "فشل الإرسال");
        }
    } catch (err) {
        alert("⚠️ خطأ في السيرفر: " + err.message);
    }
}

/**
 * إجراء الحذف النهائي للاقتراح
 */
window.deleteProposalProcess = async (id) => {
    if (!confirm("تحذير نهائي: هل أنت متأكد من حذف هذا الاقتراح؟ سيتم مسحه تماماً من النظام.")) return;
    
    const token = localStorage.getItem('user_token');
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/proposals/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            alert("✅ تم حذف الاقتراح بنجاح.");
            closeModal();
            fetchAllProposals(); // تحديث القائمة
        } else {
            throw new Error("فشل الحذف.");
        }
    } catch (err) {
        alert("⚠️ خطأ في عملية الحذف: " + err.message);
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
 * تهيئة مستمعي الأحداث
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
 * دالة حماية من هجمات XSS
 */
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
}