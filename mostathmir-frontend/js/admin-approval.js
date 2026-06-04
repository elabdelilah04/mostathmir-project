/* ==========================================================================
   ADMIN APPROVAL SCRIPT - UPDATED VERSION (With Comparison & Stats)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://mostathmir-api.onrender.com';
    const projectsGrid = document.getElementById('projectsGrid');
    const token = localStorage.getItem('user_token');

    if (!token) {
        alert("يرجى تسجيل الدخول كمسؤول.");
        return;
    }

    let allProjects = [];
    let currentProject = null;
    let pendingAction = {};

    const statusFilter = document.getElementById('statusFilter');
    const sortFilter = document.getElementById('sortFilter');
    const searchInput = document.getElementById('searchInput');

    // ==========================================
    // 1. جلب البيانات والإحصائيات
    // ==========================================

    async function updateStats() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) return;
            const stats = await response.json();
            
            document.getElementById('pendingCount').textContent = stats.pendingCount || 0;
            document.getElementById('approvedToday').textContent = stats.approvedToday || 0;
            document.getElementById('rejectedToday').textContent = stats.rejectedToday || 0;
            
            // إضافة عداد التحديثات المعلقة (تأكد من وجود العنصر في HTML بالـ ID: updatesPendingCount)
            const updatesCounter = document.getElementById('updatesPendingCount');
            if (updatesCounter) updatesCounter.textContent = stats.updatesPendingCount || 0;

        } catch (error) {
            console.error("Failed to update stats:", error);
        }
    }

    async function loadProjects() {
        projectsGrid.innerHTML = '<div style="text-align:center; padding:20px;">جاري تحميل المشاريع...</div>';

        const params = new URLSearchParams();
        if (statusFilter.value) {
            // التعامل مع فلتر "تحديثات معلقة" الجديد
            const statusValue = statusFilter.value === 'pending' ? 'under-review' : statusFilter.value;
            params.append('status', statusValue);
        }
        if (sortFilter.value) params.append('sort', sortFilter.value);
        if (searchInput.value) params.append('keyword', searchInput.value);

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/projects?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('فشل جلب المشاريع.');
            
            allProjects = await response.json();
            renderProjects(allProjects);
        } catch (error) {
            projectsGrid.innerHTML = `<p style="color: red; text-align:center;">${error.message}</p>`;
        }
    }

    // ==========================================
    // 2. عرض البطاقات (Cards)
    // ==========================================

    function renderProjects(projects) {
        if (projects.length === 0) {
            projectsGrid.innerHTML = `<div style="text-align:center; padding:50px; width:100%;"><h3>لا توجد مشاريع حالياً.</h3></div>`;
            return;
        }
        projectsGrid.innerHTML = projects.map(createProjectCard).join('');
    }

    function createProjectCard(project) {
        const statusMap = { 
            'under-review': 'مراجعة أولية', 
            'published': 'منشور', 
            'closed': 'مرفوض', 
            'needs-revision': 'بانتظار تعديل المستخدم' 
        };
        
        let statusText = statusMap[project.status] || project.status;
        let statusClass = `status-${project.status}`;

        // إذا كان المشروع منشوراً وبه تحديثات معلقة، نعطيه شارة مميزة
        let updateBadge = "";
        if (project.hasPendingChanges) {
            updateBadge = `<span class="update-badge" style="background:#f59e0b; color:white; padding:2px 8px; border-radius:4px; font-size:10px; margin-right:10px;"><i class="fas fa-sync-alt"></i> تحديث معلق</span>`;
            statusText = "مراجعة تعديلات";
        }

        return `
            <div class="project-card" data-id="${project._id}">
                <div class="project-header">
                    <h3 class="project-title">
                        <a href="/project-view.html?id=${project._id}" target="_blank" style="text-decoration:none; color:inherit;">
                            ${project.projectName} <i class="fas fa-external-link-alt" style="font-size:12px; color:#3b82f6;"></i>
                        </a>
                    </h3>
                    <div>${updateBadge}<span class="project-status ${statusClass}">${statusText}</span></div>
                </div>
                <div class="project-info">
                    <div class="info-row">
                        <span class="info-label">صاحب المشروع:</span>
                        <span class="info-value">
                            <a href="/public-profile.html?id=${project.owner?._id}" target="_blank" class="text-blue-600 font-bold">
                                ${project.owner ? project.owner.fullName : 'غير معروف'}
                            </a>
                        </span>
                    </div>
                    <div class="info-row"><span class="info-label">المبلغ المطلوب:</span><span class="info-value">${(project.fundingGoal.amount || 0).toLocaleString()} ${project.fundingGoal.currency}</span></div>
                </div>
                <div class="project-actions">
                    <button class="action-btn btn-primary" onclick="openApprovalModal('${project._id}')"><i class="fas fa-check-circle"></i> مراجعة والقرار</button>
                </div>
            </div>`;
    }

    // ==========================================
    // 3. المودال المطور (جدول المقارنة)
    // ==========================================

    window.openApprovalModal = (projectId) => {
        currentProject = allProjects.find(p => p._id === projectId);
        if (!currentProject) return;

        // إخفاء المودال القديم أولاً إذا كان مفتوحاً لتجنب التراكم
        const detailContainer = document.getElementById('project-details-content');
        
        // --- بناء جدول المقارنة إذا وجد تحديث معلق ---
        let comparisonHTML = '';
        if (currentProject.hasPendingChanges && currentProject.pendingChanges) {
            comparisonHTML = `
                <div class="comparison-box" style="background: #fffbeb; border: 2px solid #f59e0b; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
                    <h3 style="color: #9a3412; margin-bottom: 15px; border-bottom: 1px solid #fde68a; padding-bottom: 10px;">
                        <i class="fas fa-balance-scale"></i> مقارنة التعديلات الجديدة المطلوبة
                    </h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: right;">
                        <thead>
                            <tr style="background: #fef3c7;">
                                <th style="padding: 8px; border: 1px solid #fde68a;">الحقل</th>
                                <th style="padding: 8px; border: 1px solid #fde68a;">البيانات الحالية</th>
                                <th style="padding: 8px; border: 1px solid #fde68a; color: #166534;">المقترح الجديد</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${generateComparisonRows(currentProject, currentProject.pendingChanges)}
                        </tbody>
                    </table>
                    <p style="font-size: 11px; color: #b45309; margin-top: 10px;">* ملاحظة: الموافقة (Accept) ستؤدي لاستبدال البيانات القديمة بالجديدة فوراً.</p>
                </div>
            `;
        }

        // ملء البيانات الأساسية في المودال
        document.getElementById('modalTitle').textContent = `فحص: ${currentProject.projectName}`;
        document.getElementById('detailTitle').textContent = currentProject.projectName;
        document.getElementById('detailOwner').innerHTML = `<a href="/public-profile.html?id=${currentProject.owner?._id}" target="_blank">${currentProject.owner?.fullName}</a>`;
        document.getElementById('detailFundingGoal').textContent = `${(currentProject.fundingGoal?.amount || 0).toLocaleString()} ${currentProject.fundingGoal?.currency}`;
        document.getElementById('detailEquity').textContent = `${currentProject.equityOffered}%`;
        document.getElementById('adminNotes').value = currentProject.adminNotes || '';

        // حقن جدول المقارنة في بداية تفاصيل المشروع
        detailContainer.innerHTML = comparisonHTML + detailContainer.innerHTML;

        document.getElementById('approvalModal').classList.add('show');
    };

    // دالة مساعدة للمقارنة
    function generateComparisonRows(oldData, newData) {
        const labels = {
            projectName: 'عنوان المشروع',
            projectDescription: 'الوصف المختصر',
            detailedDescription: 'الوصف التفصيلي',
            equityOffered: 'الملكية المعروضة %',
            projectCategory: 'الفئة'
        };

        let rows = '';
        for (let key in labels) {
            if (newData[key] && newData[key] !== oldData[key]) {
                rows += `
                    <tr>
                        <td style="padding: 8px; border: 1px solid #fde68a; font-weight:bold;">${labels[key]}</td>
                        <td style="padding: 8px; border: 1px solid #fde68a; color: #991b1b;">${oldData[key] || '---'}</td>
                        <td style="padding: 8px; border: 1px solid #fde68a; color: #166534; font-weight:bold;">${newData[key]}</td>
                    </tr>
                `;
            }
        }
        return rows || '<tr><td colspan="3" style="text-align:center; padding:10px;">تغييرات في الصور أو المرفقات فقط.</td></tr>';
    }

    // ==========================================
    // 4. تنفيذ القرار (المزامنة)
    // ==========================================

    window.executeAction = async () => {
        if (!currentProject || !pendingAction) return;

        const adminNotes = document.getElementById('adminNotes').value;
        const status = pendingAction.status;
        const confirmBtn = document.getElementById('confirmBtn');

        confirmBtn.disabled = true;
        confirmBtn.textContent = 'جاري الحفظ...';

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/projects/${currentProject._id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: status, adminNotes: adminNotes })
            });

            if (!response.ok) throw new Error('فشل التحديث.');

            alert("تم تنفيذ القرار وتحديث حالة المشروع بنجاح.");
            location.reload();

        } catch (error) {
            alert(error.message);
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'تأكيد';
        }
    };

    // الدوال المساعدة للإغلاق والتأكيد
    window.closeApprovalModal = () => {
        document.getElementById('approvalModal').classList.remove('show');
        location.reload(); // لإعادة تصفير المودال من محتوى المقارنة
    };
    window.closeConfirmModal = () => document.getElementById('confirmModal').classList.remove('show');
    window.approveProject = () => showConfirmModal('published', 'تأكيد القبول', 'هل توافق على نشر المشروع (أو التعديلات الجديدة)؟');
    window.rejectProject = () => showConfirmModal('closed', 'تأكيد الرفض', 'هل تريد رفض هذا المشروع/التعديل؟');
    window.requestRevision = () => showConfirmModal('needs-revision', 'طلب مراجعة', 'هل تود طلب تعديلات من المستخدم؟');

    function showConfirmModal(status, title, message) {
        pendingAction = { status };
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        document.getElementById('confirmModal').classList.add('show');
    }

    // ربط الفلاتر
    statusFilter.addEventListener("change", loadProjects);
    sortFilter.addEventListener("change", loadProjects);
    searchInput.addEventListener("input", () => {
        clearTimeout(window.searchT);
        window.searchT = setTimeout(loadProjects, 500);
    });

    // التشغيل الأولي
    updateStats();
    loadProjects();
});