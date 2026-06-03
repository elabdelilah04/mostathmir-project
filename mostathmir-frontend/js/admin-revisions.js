/**
 * MOSTATHMIR - ADMIN REVISIONS MANAGEMENT
 * النسخة النهائية: تشمل الإحصائيات، الفلترة، الروابط الحية، والمودال المطور
 */

let allRequests = [];
let currentRequestId = null;
const token = localStorage.getItem('user_token');

document.addEventListener('DOMContentLoaded', async () => {
    // 1. التحقق من وجود التوكن
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // 2. التشغيل الأولي للبيانات والإحصائيات
    await updateRevisionStats();
    await fetchRevisions();

    // 3. ربط أحداث الفلاتر والبحث
    setupFilterListeners();
});

/**
 * جلب إحصائيات طلبات التعديل (العدادات العلوية)
 */
async function updateRevisionStats() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/revisions/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        
        const stats = await res.json();
        
        // تحديث أرقام العدادات في الواجهة
        document.getElementById('pendingCount').textContent = stats.pendingCount || 0;
        document.getElementById('approvedToday').textContent = stats.approvedToday || 0;
        document.getElementById('rejectedToday').textContent = stats.rejectedToday || 0;
        
    } catch (error) {
        console.error("Stats Update Error:", error);
    }
}

/**
 * جلب قائمة الطلبات من السيرفر
 */
async function fetchRevisions() {
    const grid = document.getElementById('revisionsGrid');
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/revisions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('Failed to fetch requests');
        
        allRequests = await res.json();
        applyFilters(); // عرض البيانات مع الترتيب الافتراضي

    } catch (error) {
        console.error("Fetch Error:", error);
        grid.innerHTML = `<p style="color:red; text-align:center;">فشل تحميل البيانات من السيرفر.</p>`;
    }
}

/**
 * منطق الفلترة والترتيب (Client-side)
 */
function applyFilters() {
    const statusVal = document.getElementById('statusFilter').value;
    const sectionVal = document.getElementById('sectionFilter').value;
    const sortVal = document.getElementById('sortFilter').value;

    let filtered = [...allRequests];

    // فلترة الحالة
    if (statusVal !== 'all') {
        filtered = filtered.filter(r => r.status === statusVal);
    }

    // فلترة الأقسام
    if (sectionVal !== 'all') {
        filtered = filtered.filter(r => r.sections.includes(sectionVal));
    }

    // الترتيب الزمني
    filtered.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return sortVal === 'newest' ? dateB - dateA : dateA - dateB;
    });

    renderRevisions(filtered);
}

/**
 * رسم بطاقات الطلبات في الصفحة
 */
function renderRevisions(requests) {
    const grid = document.getElementById('revisionsGrid');
    if (!grid) return;

    if (requests.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 50px;">
                <i class="fas fa-inbox fa-3x" style="color: #cbd5e1; margin-bottom: 15px;"></i>
                <h3 style="color: #64748b;">لا توجد طلبات حالياً تطابق هذا البحث</h3>
            </div>`;
        return;
    }

    grid.innerHTML = requests.map(req => {
        const dateStr = new Date(req.createdAt).toLocaleDateString('ar-SA', { 
            day: 'numeric', month: 'short', year: 'numeric' 
        });
        
        const statusMap = {
            'pending': { text: 'قيد الانتظار', class: 'status-pending' },
            'approved': { text: 'تمت الموافقة', class: 'status-approved' },
            'rejected': { text: 'مرفوض', class: 'status-rejected' }
        };
        const status = statusMap[req.status] || { text: req.status, class: '' };

        return `
        <div class="project-card reveal fade-up">
            <div class="project-header">
                <!-- اسم المشروع رابط حي -->
                <h3 class="project-title">
                    <a href="/project-view.html?id=${req.project?._id}" target="_blank" title="مشاهدة المشروع على الموقع">
                        <i class="fas fa-external-link-alt" style="font-size: 0.8rem;"></i> ${escapeHTML(req.project?.projectName || 'مشروع محذوف')}
                    </a>
                </h3>
                <span class="project-status ${status.class}">${status.text}</span>
            </div>
            
            <div class="project-info">
                <!-- اسم المالك رابط حي -->
                <div class="info-row">
                    <span class="label">صاحب المشروع:</span> 
                    <span class="value">
                        <a href="/public-profile.html?id=${req.user?._id}" target="_blank" class="text-blue-600 font-bold">
                            ${escapeHTML(req.user?.fullName || 'مستخدم غير معروف')}
                        </a>
                    </span>
                </div>
                <div class="info-row">
                    <span class="label">تاريخ الإرسال:</span> 
                    <span class="value">${dateStr}</span>
                </div>
                <div class="info-row">
                    <span class="label">الأقسام المطلوبة:</span> 
                    <div class="value">
                        ${req.sections.map(s => `<span class="section-tag" style="background:#eef2ff; color:#4338ca; padding:2px 8px; border-radius:4px; font-size:0.75rem; margin-left:4px;">${s}</span>`).join('')}
                    </div>
                </div>
            </div>

            <div class="project-description" style="background:#f8fafc; padding:12px; border-radius:8px; margin:15px 0; font-size:0.9rem; border-right:3px solid #cbd5e1;">
                <strong>سبب التعديل:</strong> ${escapeHTML(req.reason)}
            </div>

            <div class="project-actions">
                <button class="action-btn btn-primary" onclick="openDecisionModal('${req._id}')">
                    <i class="fas fa-gavel"></i> مراجعة واتخاذ قرار
                </button>
            </div>
        </div>`;
    }).join('');
}

/**
 * فتح المودال مع التفاصيل الكاملة
 */
window.openDecisionModal = (id) => {
    currentRequestId = id;
    const req = allRequests.find(r => r._id === id);
    if (!req) return;

    const modal = document.getElementById('decisionModal');
    const modalBody = document.getElementById('modalBody');
    document.getElementById('modalTitle').textContent = `مراجعة طلب: ${req.project?.projectName}`;

    modalBody.innerHTML = `
        <div style="background: #f1f5f9; padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
            <p style="margin-bottom: 12px;"><strong><i class="fas fa-user-circle"></i> المقدم:</strong> ${req.user?.fullName} (${req.user?.email})</p>
            <p style="margin-bottom: 12px;"><strong><i class="fas fa-th-large"></i> الأقسام المستهدفة:</strong> 
                ${req.sections.join(' ، ')}
            </p>
            <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 15px 0;">
            <p style="font-weight: bold; margin-bottom: 8px;"><i class="fas fa-quote-right"></i> شرح المستخدم للطلب:</p>
            <p style="white-space: pre-wrap; color: #475569; font-style: italic;">"${req.reason}"</p>
        </div>

        <div class="form-group">
            <label style="font-weight: bold; display: block; margin-bottom: 10px;">ملاحظة الإدارة الرسمية (ستظهر للمستخدم):</label>
            <textarea id="adminNoteText" rows="4" class="form-control" style="width:100%; border:2px solid #e2e8f0; border-radius:10px; padding:12px;" placeholder="اكتب تعليماتك للمستخدم هنا..."></textarea>
        </div>

        <div class="approval-actions" style="display: flex; gap: 12px; margin-top: 25px;">
            <button class="action-btn btn-success" onclick="processDecision('approved')">
                <i class="fas fa-check"></i> قبول وفتح التعديل
            </button>
            <button class="action-btn btn-danger" onclick="processDecision('rejected')">
                <i class="fas fa-times"></i> رفض الطلب
            </button>
        </div>
    `;

    modal.classList.add('show');
};

/**
 * تنفيذ القرار (قبول/رفض) وإرساله للسيرفر
 */
async function processDecision(decision) {
    const adminNote = document.getElementById('adminNoteText').value;
    const btn = event.currentTarget;
    const originalContent = btn.innerHTML;

    // تعطيل الزر لمنع تكرار الطلب
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...`;

    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/revisions/decision`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ requestId: currentRequestId, decision, adminNote })
        });

        if (res.ok) {
            const statusMsg = decision === 'approved' ? 'تم القبول بنجاح' : 'تم رفض الطلب بنجاح';
            alert(`✅ ${statusMsg}. سيتم إشعار المستخدم فوراً.`);
            location.reload(); // تحديث الصفحة لرؤية النتائج الجديدة والإحصائيات
        } else {
            throw new Error('Server Error');
        }

    } catch (error) {
        alert("❌ حدث خطأ أثناء تنفيذ الإجراء. يرجى المحاولة لاحقاً.");
        btn.disabled = false;
        btn.innerHTML = originalContent;
    }
}

/**
 * وظائف مساعدة
 */
function setupFilterListeners() {
    ['statusFilter', 'sectionFilter', 'sortFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.onchange = applyFilters;
    });
}

window.closeModal = () => {
    document.getElementById('decisionModal').classList.remove('show');
};

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
}