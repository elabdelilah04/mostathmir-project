document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://localhost:5000';
    const projectsGrid = document.getElementById('projectsGrid');
    const token = localStorage.getItem('user_token');
    
    if (!token) {
        alert("يرجى تسجيل الدخول كمسؤول.");
        // window.location.href = '/admin-login.html';
        return;
    }

    let allProjects = [];
    let currentProject = null;
    let pendingAction = {};

    // --- عناصر التحكم ---
    const statusFilter = document.getElementById('statusFilter');
    const sortFilter = document.getElementById('sortFilter');
    const searchInput = document.getElementById('searchInput');

    /**
     * جلب الإحصائيات وتحديث الواجهة
     */
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
        } catch (error) {
            console.error("Failed to update stats:", error);
        }
    }

    /**
     * جلب المشاريع بناءً على الفلاتر
     */
    async function loadProjects() {
        projectsGrid.innerHTML = '<p>جاري تحميل المشاريع...</p>';
        
        const params = new URLSearchParams();
        if (statusFilter.value) {
            // "pending" في الواجهة الأمامية يعني "under-review" في الخلفية
            const statusValue = statusFilter.value === 'pending' ? 'under-review' : statusFilter.value;
            params.append('status', statusValue);
        }
        if (sortFilter.value) params.append('sort', sortFilter.value);
        if (searchInput.value) params.append('keyword', searchInput.value);

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/projects?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                 const err = await response.json();
                 throw new Error(err.message || 'فشل جلب المشاريع.');
            }
            allProjects = await response.json();
            renderProjects(allProjects);
        } catch (error) {
            projectsGrid.innerHTML = `<p style="color: red;">${error.message}</p>`;
        }
    }

    /**
     * عرض المشاريع في الواجهة
     */
    function renderProjects(projects) {
        if (projects.length === 0) {
            projectsGrid.innerHTML = `<div><h3>لا توجد مشاريع تطابق بحثك.</h3></div>`;
            return;
        }
        projectsGrid.innerHTML = projects.map(createProjectCard).join('');
    }

    /**
     * إنشاء بطاقة مشروع
     */
    function createProjectCard(project) {
        const statusMap = { 'under-review': 'في انتظار المراجعة', 'published': 'تم القبول', 'closed': 'تم الرفض', 'needs-revision': 'يحتاج مراجعة' };
        const statusText = statusMap[project.status] || project.status;

        return `
            <div class="project-card" data-id="${project._id}">
                <div class="project-header">
                    <h3 class="project-title">${project.projectName}</h3>
                    <span class="project-status status-${project.status.replace('_', '-')}">${statusText}</span>
                </div>
                <div class="project-info">
                    <div class="info-row"><span class="info-label">صاحب المشروع:</span><span class="info-value">${project.owner ? project.owner.fullName : 'غير معروف'}</span></div>
                    <div class="info-row"><span class="info-label">تاريخ التقديم:</span><span class="info-value">${new Date(project.createdAt).toLocaleDateString('ar-SA')}</span></div>
                    <div class="info-row"><span class="info-label">التمويل المطلوب:</span><span class="info-value">$${(project.fundingGoal.amount || 0).toLocaleString()}</span></div>
                </div>
                <div class="project-description">${(project.projectDescription || '').substring(0, 100)}...</div>
                <div class="project-actions">
                    <button class="action-btn btn-primary" onclick="openApprovalModal('${project._id}')"><i class="fas fa-eye"></i> مراجعة المشروع</button>
                </div>
            </div>`;
    }

    // --- وظائف النوافذ المنبثقة (Modals) ---
    window.openApprovalModal = (projectId) => {
        currentProject = allProjects.find(p => p._id === projectId);
        if (!currentProject) return;

        // --- 1. تعبئة البيانات الأساسية (الكود الحالي) ---
        document.getElementById('modalTitle').textContent = `مراجعة: ${currentProject.projectName}`;
        document.getElementById('detailTitle').textContent = currentProject.projectName;
        document.getElementById('detailOwner').textContent = currentProject.owner ? currentProject.owner.fullName : 'غير معروف';
        document.getElementById('detailSubmissionDate').textContent = new Date(currentProject.createdAt).toLocaleDateString('ar-SA');
        document.getElementById('detailFunding').textContent = `$${(currentProject.fundingGoal.amount || 0).toLocaleString()} ${currentProject.fundingGoal.currency || ''}`;
        document.getElementById('detailCategory').textContent = currentProject.projectCategory || '-';
        document.getElementById('detailLocation').textContent = currentProject.projectLocation || '-';
        document.getElementById('detailBriefDescription').textContent = (currentProject.projectDescription || '-').substring(0, 100) + '...';
        document.getElementById('detailChallenges').textContent = (currentProject.projectNeeds ? currentProject.projectNeeds.join(', ') : '-') || '-';
        document.getElementById('detailVisibility').textContent = currentProject.visibility || '-';
        document.getElementById('detailDescription').innerHTML = (currentProject.projectDescription || '-').replace(/\n/g, '<br>');
        document.getElementById('adminNotes').value = currentProject.adminNotes || '';

        // --- 2. الإضافة الجديدة: تعبئة رابط الفيديو ---
        const videoLinkSpan = document.getElementById('detailVideoLink');
        if (currentProject.videoLink) {
            videoLinkSpan.innerHTML = `<a href="${currentProject.videoLink}" target="_blank">${currentProject.videoLink}</a>`;
        } else {
            videoLinkSpan.textContent = '-';
        }

        // --- 3. الإضافة الجديدة: تعبئة تفاصيل الإنفاق ---
        const fundingDetailsSpan = document.getElementById('detailFundingDetails');
        if (currentProject.fundingDetails && currentProject.fundingDetails.length > 0 && currentProject.fundingDetails[0].item) {
            let detailsHTML = '<ul>';
            currentProject.fundingDetails.forEach(detail => {
                detailsHTML += `<li><strong>${detail.item}:</strong> ${detail.percentage}%</li>`;
            });
            detailsHTML += '</ul>';
            fundingDetailsSpan.innerHTML = detailsHTML;
        } else {
            fundingDetailsSpan.textContent = '-';
        }
        
        // --- 4. الإضافة الجديدة: تعبئة المرفقات وجعلها قابلة للنقر ---
        const attachmentsList = document.getElementById('detailAttachments');
        const API_BASE_URL = 'http://localhost:5000';
        attachmentsList.innerHTML = ''; // تفريغ القائمة
        if (currentProject.supportFiles && currentProject.supportFiles.length > 0) {
            currentProject.supportFiles.forEach(filePath => {
                const fileName = filePath.split('/').pop();
                const fileType = fileName.split('.').pop().toLowerCase();
                const iconClass = getFileIconClass(fileType); // دالة مساعدة لتحديد الأيقونة

                const attachmentItem = document.createElement('div');
                attachmentItem.className = 'attachment-item';
                attachmentItem.innerHTML = `
                    <i class="fas ${iconClass}"></i>
                    <span>${fileName}</span>
                    <a href="${API_BASE_URL}${filePath}" target="_blank" class="view-btn">عرض</a>
                `;
                attachmentsList.appendChild(attachmentItem);
            });
        } else {
            attachmentsList.innerHTML = '<p>لا توجد مرفقات.</p>';
        }

        // فتح المودال
        document.getElementById('approvalModal').classList.add('show');
    };

    // --- أضف هذه الدالة المساعدة الجديدة في نهاية الملف ---
    function getFileIconClass(extension) {
        switch (extension) {
            case 'pdf': return 'fa-file-pdf';
            case 'doc':
            case 'docx': return 'fa-file-word';
            case 'xls':
            case 'xlsx': return 'fa-file-excel';
            case 'ppt':
            case 'pptx': return 'fa-file-powerpoint';
            case 'zip':
            case 'rar': return 'fa-file-archive';
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif': return 'fa-file-image';
            default: return 'fa-file-alt'; // أيقونة افتراضية
        }
    }

    window.closeApprovalModal = () => document.getElementById('approvalModal').classList.remove('show');
    window.closeConfirmModal = () => document.getElementById('confirmModal').classList.remove('show');

    // --- وظائف إجراءات المراجعة ---
    window.approveProject = () => showConfirmModal('published', 'تأكيد قبول المشروع', 'هل أنت متأكد من قبول هذا المشروع ونشره؟');
    window.rejectProject = () => showConfirmModal('closed', 'تأكيد رفض المشروع', 'هل أنت متأكد من رفض هذا المشروع؟');
    window.requestRevision = () => showConfirmModal('needs-revision', 'تأكيد طلب المراجعة', 'هل أنت متأكد من طلب مراجعة؟');
    
    function showConfirmModal(status, title, message) {
        pendingAction = { status };
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        document.getElementById('confirmModal').classList.add('show');
    }

    window.executeAction = async () => {
        if (!currentProject || !pendingAction) return;
        
        const adminNotes = document.getElementById('adminNotes').value;
        const status = pendingAction.status;

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/projects/${currentProject._id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: status, adminNotes: adminNotes })
            });
            if (!response.ok) throw new Error('فشل تحديث حالة المشروع.');
            
            closeConfirmModal();
            closeApprovalModal();
            loadProjects(); // إعادة تحميل قائمة المشاريع
            updateStats(); // إعادة تحميل الإحصائيات
            alert('تم تحديث حالة المشروع بنجاح!');
        } catch (error) {
            alert(error.message);
        }
    };

    // --- ربط الأحداث ---
    statusFilter.addEventListener("change", loadProjects);
    sortFilter.addEventListener("change", loadProjects);
    searchInput.addEventListener("input", () => {
        clearTimeout(window.adminSearchTimeout);
        window.adminSearchTimeout = setTimeout(loadProjects, 500);
    });

    // --- أول تحميل للصفحة ---
    loadProjects();
    updateStats();
});