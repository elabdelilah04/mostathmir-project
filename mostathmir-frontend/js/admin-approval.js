/* ==========================================================================
   ADMIN APPROVAL SCRIPT - المراجعة والمقارنة الذكية
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
            document.getElementById('updatesPendingCount').textContent = stats.updatesPendingCountCount || stats.updatesPendingCount || 0;

        } catch (error) {
            console.error("Failed to update stats:", error);
        }
    }

    async function loadProjects() {
        projectsGrid.innerHTML = '<div style="text-align:center; padding:20px;">جاري تحميل المشاريع...</div>';

        const params = new URLSearchParams();
        if (statusFilter.value) {
            // "pending" في الواجهة تعني "under-review" في القاعدة
            const statusValue = statusFilter.value === 'pending' ? 'under-review' : statusFilter.value;
            params.append('status', statusValue);
        }
        if (sortFilter.value) params.append('sort', sortFilter.value);
        if (searchInput.value) params.append('keyword', searchInput.value);

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/projects?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            allProjects = await response.json();
            renderProjects(allProjects);
        } catch (error) {
            projectsGrid.innerHTML = `<p style="color: red; text-align:center;">فشل التحميل</p>`;
        }
    }

    // ==========================================
    // 2. عرض البطاقات مع شارة "التعديلات"
    // ==========================================

    function renderProjects(projects) {
        if (projects.length === 0) {
            projectsGrid.innerHTML = `<div style="text-align:center; padding:50px; width:100%;"><h3>لا توجد طلبات حالياً.</h3></div>`;
            return;
        }
        projectsGrid.innerHTML = projects.map(createProjectCard).join('');
    }

    function createProjectCard(project) {
        const statusMap = { 'under-review': 'قيد المراجعة', 'published': 'منشور', 'closed': 'مرفوض', 'needs-revision': 'يحتاج تعديل' };
        let statusText = statusMap[project.status] || project.status;

        let updateBadge = "";
        if (project.hasPendingChanges) {
            updateBadge = `<span style="background:#f59e0b; color:white; padding:2px 8px; border-radius:4px; font-size:11px; margin-left:10px;"><i class="fas fa-sync"></i> تعديلات معلقة</span>`;
            statusText = "مراجعة تحديث";
        }

        return `
            <div class="project-card">
                <div class="project-header">
                    <h3 class="project-title">${project.projectName}</h3>
                    <div>${updateBadge}<span class="project-status status-${project.status}">${statusText}</span></div>
                </div>
                <div class="project-info">
                    <div class="info-row"><span class="label">صاحب المشروع:</span><span class="info-value">${project.owner?.fullName}</span></div>
                    <div class="info-row"><span class="label">التمويل:</span><span class="info-value">${(project.fundingGoal.amount || 0).toLocaleString()} ${project.fundingGoal.currency}</span></div>
                </div>
                <div class="project-actions">
                    <button class="action-btn btn-primary" onclick="openApprovalModal('${project._id}')"><i class="fas fa-eye"></i> مراجعة والقرار</button>
                </div>
            </div>`;
    }

    // ==========================================
    // 3. المودال المطور (المقارنة بأسلوب Old vs New)
    // ==========================================

    window.openApprovalModal = (projectId) => {
        currentProject = allProjects.find(p => p._id === projectId);
        if (!currentProject) return;

        // تنظيف محتوى المودال السابق
        const existingComparison = document.getElementById('comparison-section');
        if (existingComparison) existingComparison.remove();

        // إعداد المقارنة
        let comparisonHTML = '';
        if (currentProject.hasPendingChanges && currentProject.pendingChanges) {
            comparisonHTML = `
                <div id="comparison-section" class="detail-section" style="background: #fff8e1; border: 2px solid #ffc107; margin-bottom: 25px; padding: 20px; border-radius: 12px;">
                    <h3 style="color: #856404; margin-bottom: 15px;"><i class="fas fa-exchange-alt"></i> مقارنة البيانات (القديمة مقابل الجديدة)</h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: right;">
                        <tr style="background: #fef3c7;">
                            <th style="padding: 10px; border: 1px solid #fde68a;">الحقل</th>
                            <th style="padding: 10px; border: 1px solid #fde68a;">الحالي (منشور)</th>
                            <th style="padding: 10px; border: 1px solid #fde68a; color: #166534;">المقترح الجديد</th>
                        </tr>
                        ${generateComparisonRows(currentProject, currentProject.pendingChanges)}
                    </table>
                </div>
            `;
        }

        // ملء البيانات الأساسية
        document.getElementById('detailTitle').textContent = currentProject.projectName;
        document.getElementById('detailOwner').textContent = currentProject.owner?.fullName;
        document.getElementById('detailSubmissionDate').textContent = new Date(currentProject.createdAt).toLocaleDateString('ar-SA');
        document.getElementById('detailFundingGoal').textContent = `${currentProject.fundingGoal.amount.toLocaleString()} ${currentProject.fundingGoal.currency}`;
        document.getElementById('detailEquity').textContent = `${currentProject.equityOffered}%`;
        document.getElementById('adminNotes').value = currentProject.adminNotes || '';

        // حقن المقارنة في أعلى المودال
        const detailsContainer = document.getElementById('project-details-content');
        detailsContainer.insertAdjacentHTML('afterbegin', comparisonHTML);

        document.getElementById('approvalModal').classList.add('show');
    };

    function generateComparisonRows(oldData, newData) {
        const fields = {
            projectName: 'عنوان المشروع',
            projectDescription: 'وصف مختصر',
            detailedDescription: 'وصف تفصيلي',
            equityOffered: 'الملكية المعروضة %',
            projectCategory: 'الفئة'
        };
        let rows = '';
        for (let key in fields) {
            if (newData[key] !== undefined && String(newData[key]) !== String(oldData[key])) {
                rows += `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 10px; font-weight: bold;">${fields[key]}</td>
                        <td style="padding: 10px; color: #d32f2f;">${oldData[key] || 'فارغ'}</td>
                        <td style="padding: 10px; color: #2e7d32; font-weight: bold; background: #f1f8e9;">${newData[key]}</td>
                    </tr>
                `;
            }
        }
        return rows || '<tr><td colspan="3" style="text-align:center; padding:10px;">تغييرات في الصور أو ملفات أخرى.</td></tr>';
    }

    // ==========================================
    // 4. تنفيذ القرار (مزامنة البيانات)
    // ==========================================

    window.executeAction = async () => {
        const adminNotes = document.getElementById('adminNotes').value;
        const status = pendingAction.status;

        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/projects/${currentProject._id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status, adminNotes })
            });
            if (res.ok) {
                alert("تم التحديث بنجاح");
                location.reload();
            }
        } catch (error) { alert("خطأ في التحديث"); }
    };

    window.closeApprovalModal = () => document.getElementById('approvalModal').classList.remove('show');
    window.closeConfirmModal = () => document.getElementById('confirmModal').classList.remove('show');
    window.approveProject = () => showConfirm('published', 'موافقة', 'هل تؤكد نشر هذه النسخة من المشروع؟');
    window.rejectProject = () => showConfirm('closed', 'رفض', 'هل أنت متأكد من رفض هذا الطلب؟');
    window.requestRevision = () => showConfirm('needs-revision', 'طلب تعديل', 'إعادة المشروع للمستخدم للتعديل؟');

    function showConfirm(status, title, msg) {
        pendingAction = { status };
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = msg;
        document.getElementById('confirmModal').classList.add('show');
    }

    statusFilter.onchange = loadProjects;
    sortFilter.onchange = loadProjects;
    searchInput.oninput = () => { clearTimeout(window.sT); window.searchT = setTimeout(loadProjects, 500); };

    updateStats();
    loadProjects();
});