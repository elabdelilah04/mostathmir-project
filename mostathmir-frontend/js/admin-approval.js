/* ==========================================================================
   ADMIN APPROVAL SCRIPT (Full Professional Version)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // تعريف الرابط الأساسي
    const API_BASE_URL = 'https://mostathmir-api.onrender.com';
    const projectsGrid = document.getElementById('projectsGrid');
    const token = localStorage.getItem('user_token');

    // التحقق من الصلاحيات
    if (!token) {
        alert("يرجى تسجيل الدخول كمسؤول.");
        return;
    }

    let allProjects = [];
    let currentProject = null;
    let pendingAction = {};

    // --- عناصر التحكم ---
    const statusFilter = document.getElementById('statusFilter');
    const sortFilter = document.getElementById('sortFilter');
    const searchInput = document.getElementById('searchInput');

    // ==========================================
    // 1. الوظائف الأساسية (جلب وعرض البيانات)
    // ==========================================

    /**
     * جلب إحصائيات لوحة التحكم المحدثة
     */
    async function updateStats() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) return;
            const stats = await response.json();

            // تحديث العدادات الأساسية
            document.getElementById('pendingCount').textContent = stats.pendingCount || 0;
            document.getElementById('approvedToday').textContent = stats.approvedToday || 0;
            document.getElementById('rejectedToday').textContent = stats.rejectedToday || 0;

            // --- الإضافة: تحديث عداد التحديثات المعلقة للمشاريع المنشورة ---
            const updatesCounter = document.getElementById('updatesPendingCount');
            if (updatesCounter) {
                updatesCounter.textContent = stats.updatesPendingCount || 0;
            }
        } catch (error) {
            console.error("Failed to update stats:", error);
        }
    }

    /**
     * جلب قائمة المشاريع من السيرفر مع دعم الفلاتر الجديدة
     */
    async function loadProjects() {
        projectsGrid.innerHTML = '<div style="text-align:center; padding:50px;"><i class="fas fa-spinner fa-spin fa-2x"></i><p style="margin-top:10px;">جاري تحميل المشاريع...</p></div>';

        const params = new URLSearchParams();
        if (statusFilter.value) {
            // التعامل مع الفلتر المخصص للتحديثات المعلقة
            params.append('status', statusFilter.value);
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
            projectsGrid.innerHTML = `<p style="color: red; text-align:center;">${error.message}</p>`;
        }
    }

    /**
     * رسم بطاقات المشاريع في الشبكة
     */
    function renderProjects(projects) {
        if (projects.length === 0) {
            projectsGrid.innerHTML = `
                <div style="text-align:center; padding:50px; width:100%; grid-column: 1 / -1;">
                    <i class="fas fa-folder-open fa-3x" style="color:#cbd5e1; margin-bottom:15px;"></i>
                    <h3>لا توجد مشاريع تطابق خيارات التصفية الحالية.</h3>
                </div>`;
            return;
        }
        projectsGrid.innerHTML = projects.map(createProjectCard).join('');
    }

    /**
     * إنشاء كرت المشروع مع شارة التحديث المعلق
     */
    function createProjectCard(project) {
        const statusMap = {
            'under-review': 'في انتظار المراجعة',
            'published': 'منشور',
            'closed': 'تم الرفض',
            'needs-revision': 'يحتاج مراجعة'
        };

        let statusText = statusMap[project.status] || project.status;
        const statusClass = `status-${project.status.replace('_', '-')}`;

        // --- إضافة شارة التحديثات المعلقة إذا وجدت ---
        let updateBadge = "";
        if (project.hasPendingChanges) {
            updateBadge = `
                <span class="update-badge" style="background:#f59e0b; color:white; padding:4px 10px; border-radius:4px; font-size:10px; margin-left:10px; font-weight:bold; display:inline-flex; align-items:center; gap:5px;">
                    <i class="fas fa-sync-alt animate-spin-slow"></i> تحديث بانتظار المراجعة
                </span>`;
            statusText = "مراجعة تعديلات";
        }

        return `
            <div class="project-card" data-id="${project._id}">
                <div class="project-header">
                    <h3 class="project-title">
                        <a href="/project-view.html?id=${project._id}" target="_blank" style="text-decoration:none; color:inherit;">
                            ${project.projectName} <i class="fas fa-external-link-alt" style="font-size:10px; color:#3b82f6;"></i>
                        </a>
                    </h3>
                    <div style="display:flex; align-items:center;">
                        ${updateBadge}
                        <span class="project-status ${statusClass}">${statusText}</span>
                    </div>
                </div>
                <div class="project-info">
                    <div class="info-row">
                        <span class="info-label">صاحب المشروع:</span>
                        <span class="info-value">
                            <a href="/public-profile.html?id=${project.owner?._id}" target="_blank" class="text-blue-600 font-bold" style="text-decoration:none;">
                                ${project.owner ? project.owner.fullName : 'غير معروف'}
                            </a>
                        </span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">تاريخ التقديم:</span>
                        <span class="info-value">${new Date(project.createdAt).toLocaleDateString('ar-SA')}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">التمويل المطلوب:</span>
                        <span class="info-value">${(project.fundingGoal.amount || 0).toLocaleString()} ${project.fundingGoal.currency || 'USD'}</span>
                    </div>
                </div>
                <div class="project-description">${(project.projectDescription || '').substring(0, 100)}...</div>
                <div class="project-actions">
                    <button class="action-btn btn-primary" onclick="openApprovalModal('${project._id}')">
                        <i class="fas fa-gavel"></i> مراجعة والقرار النهائي
                    </button>
                </div>
            </div>`;
    }

    // ==========================================
    // 2. وظائف المودال (المراجعة والمقارنة)
    // ==========================================

    window.openApprovalModal = (projectId) => {
        currentProject = allProjects.find(p => p._id === projectId);
        if (!currentProject) return;

        // --- أ. رأس المودال والأزرار ---
        document.getElementById('modalTitle').textContent = `فحص المشروع: ${currentProject.projectName}`;

        const viewLink = document.getElementById('viewProjectLink');
        if (viewLink) viewLink.href = `/project-view.html?id=${currentProject._id}`;

        const pdfBtn = document.getElementById('downloadPdfBtn');
        if (pdfBtn) pdfBtn.onclick = () => downloadProjectPDF(currentProject);

        // --- ب. إضافة جدول المقارنة في حالة وجود تحديثات معلقة ---
        const detailContainer = document.getElementById('project-details-content');

        // إزالة أي جدول مقارنة قديم لمنع التكرار عند فتح مودال آخر
        const oldComp = document.getElementById('comparison-box-wrapper');
        if (oldComp) oldComp.remove();

        if (currentProject.hasPendingChanges && currentProject.pendingChanges) {
            const comparisonHTML = `
                <div id="comparison-box-wrapper" class="detail-section" style="background: #fff8e1; border: 2px solid #ffc107; margin-bottom: 25px; padding: 20px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                    <h3 style="color: #856404; margin-bottom: 15px; border-bottom: 1px solid #ffe082; padding-bottom: 10px; display:block; width:100%;">
                        <i class="fas fa-exchange-alt"></i> جدول مقارنة التعديلات المطلوبة (قديم vs جديد)
                    </h3>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: right;">
                            <thead style="background: #fef3c7;">
                                <tr>
                                    <th style="padding: 10px; border: 1px solid #fde68a;">الحقل المراد تعديله</th>
                                    <th style="padding: 10px; border: 1px solid #fde68a;">البيانات المنشورة حالياً</th>
                                    <th style="padding: 10px; border: 1px solid #fde68a; color: #166534;">المقترح الجديد للموافقة</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${generateComparisonRows(currentProject, currentProject.pendingChanges)}
                            </tbody>
                        </table>
                    </div>
                    <p style="font-size: 11px; color: #b45309; margin-top: 15px;">* تنبيه: الضغط على "قبول" سيقوم بتحديث بيانات المشروع المنشور فوراً بالقيم الجديدة المقترحة.</p>
                </div>
            `;
            detailContainer.insertAdjacentHTML('afterbegin', comparisonHTML);
        }

        // --- ج. المعلومات الأساسية ---
        document.getElementById('detailTitle').textContent = currentProject.projectName;
        document.getElementById('detailOwner').textContent = currentProject.owner ? currentProject.owner.fullName : 'غير معروف';
        document.getElementById('detailSubmissionDate').textContent = new Date(currentProject.createdAt).toLocaleDateString('ar-SA');
        document.getElementById('detailCategory').textContent = currentProject.projectCategory || '-';

        const loc = currentProject.projectLocation || {};
        document.getElementById('detailLocation').textContent = loc.country ? `${loc.city || ''}, ${loc.country}` : '-';

        const stageMap = { 'idea': 'فكرة', 'in-progress': 'قيد التنفيذ', 'established': 'قائم' };
        document.getElementById('detailStage').textContent = stageMap[currentProject.projectStage] || currentProject.projectStage;

        // --- د. البيانات المالية ---
        const currency = currentProject.fundingGoal?.currency || 'USD';
        document.getElementById('detailFundingGoal').textContent = `${(currentProject.fundingGoal?.amount || 0).toLocaleString()} ${currency}`;
        document.getElementById('detailMinInvestment').textContent = `${(currentProject.minInvestment || 0).toLocaleString()} ${currency}`;
        document.getElementById('detailEquity').textContent = currentProject.equityOffered ? `${currentProject.equityOffered}%` : 'غير محدد';
        document.getElementById('detailDuration').textContent = currentProject.campaignDuration ? `${currentProject.campaignDuration} يوم` : '-';

        const fundingDetailsDiv = document.getElementById('detailFundingDetails');
        if (currentProject.fundingDetails && currentProject.fundingDetails.length > 0) {
            fundingDetailsDiv.innerHTML = `<ul style="list-style: disc; padding-right: 20px;">` +
                currentProject.fundingDetails.map(d => `<li><strong>${d.item}:</strong> ${d.percentage}%</li>`).join('') +
                `</ul>`;
        } else {
            fundingDetailsDiv.textContent = 'لا يوجد تفاصيل للميزانية.';
        }

        const projectionsDiv = document.getElementById('detailFinancialProjections');
        if (currentProject.financialProjections && currentProject.financialProjections.length > 0) {
            projectionsDiv.innerHTML = `
                <table style="width:100%; border-collapse: collapse; margin-top: 10px; font-size: 0.9em; text-align: center;">
                    <thead style="background: #f1f5f9;">
                        <tr>
                            <th style="border: 1px solid #ddd; padding: 8px;">السنة</th>
                            <th style="border: 1px solid #ddd; padding: 8px;">الإيرادات</th>
                            <th style="border: 1px solid #ddd; padding: 8px;">المصروفات</th>
                            <th style="border: 1px solid #ddd; padding: 8px;">الربح</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${currentProject.financialProjections.map(p => `
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 8px;">${p.year}</td>
                                <td style="border: 1px solid #ddd; padding: 8px; color: #166534;">${(p.revenue || 0).toLocaleString()}</td>
                                <td style="border: 1px solid #ddd; padding: 8px; color: #dc2626;">${(p.expenses || 0).toLocaleString()}</td>
                                <td style="border: 1px solid #ddd; padding: 8px; font-weight:bold;">${(p.profit || 0).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>`;
        } else {
            projectionsDiv.textContent = 'لا يوجد توقعات مالية.';
        }

        // --- هـ. الوصف والفريق والمرفقات ---
        document.getElementById('detailBriefDescription').textContent = currentProject.projectDescription || '-';
        document.getElementById('detailDescription').innerHTML = (currentProject.detailedDescription || '-').replace(/\n/g, '<br>');

        const teamDiv = document.getElementById('detailTeamMembers');
        if (currentProject.teamMembers && currentProject.teamMembers.length > 0) {
            teamDiv.innerHTML = currentProject.teamMembers.map(m => `
                <div style="background: #f8fafc; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <strong style="display:block;">${m.name}</strong>
                    <span style="font-size: 0.85em; color: #64748b;">${m.role}</span>
                </div>
            `).join('');
        } else {
            teamDiv.textContent = 'لا يوجد أعضاء فريق مسجلين.';
        }

        const videoLinkSpan = document.getElementById('detailVideoLink');
        if (currentProject.videoLink) {
            videoLinkSpan.innerHTML = `<a href="${currentProject.videoLink}" target="_blank" style="color:#1d4ed8; text-decoration:underline;">${currentProject.videoLink}</a>`;
        } else {
            videoLinkSpan.textContent = '-';
        }

        const attachmentsList = document.getElementById('detailAttachments');
        attachmentsList.innerHTML = '';
        const filesToCheck = [
            { url: currentProject.businessPlan, label: 'خطة العمل (PDF)', type: 'pdf' },
            { url: currentProject.presentation, label: 'العرض التقديمي (PDF)', type: 'pdf' }
        ];

        filesToCheck.forEach(file => {
            if (file.url) {
                const fileName = file.url.split('/').pop();
                const item = document.createElement('div');
                item.className = 'attachment-item';
                item.innerHTML = `
                    <i class="fas fa-file-${file.type}"></i>
                    <span>${file.label}: ${fileName}</span>
                    <a href="${file.url}" target="_blank" class="view-btn">تحميل</a>
                `;
                attachmentsList.appendChild(item);
            }
        });

        const imagesDiv = document.getElementById('detailImages');
        imagesDiv.innerHTML = '';
        if (currentProject.projectImages && currentProject.projectImages.length > 0) {
            currentProject.projectImages.forEach(img => {
                imagesDiv.innerHTML += `<a href="${img}" target="_blank"><img src="${img}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd; cursor:pointer;" title="اضغط للتكبير"></a>`;
            });
        } else {
            imagesDiv.innerHTML = '<p>لا توجد صور إضافية.</p>';
        }

        document.getElementById('adminNotes').value = currentProject.adminNotes || '';
        document.getElementById('approvalModal').classList.add('show');
    };

    /**
     * دالة مساعدة لمقارنة الحقول وإظهار الفوارق فقط
     */
    function generateComparisonRows(oldData, newData) {
        const labels = {
            projectName: 'عنوان المشروع',
            projectDescription: 'الوصف المختصر',
            detailedDescription: 'الوصف التفصيلي',
            equityOffered: 'نسبة الملكية %',
            completionPercentage: 'نسبة الإنجاز %',
            projectCategory: 'الفئة'
        };

        let rows = '';
        let count = 0;
        for (let key in labels) {
            // نتحقق إذا كان الحقل موجود في البيانات الجديدة ومختلف عن القديمة
            if (newData[key] !== undefined && String(newData[key]) !== String(oldData[key])) {
                count++;
                rows += `
                    <tr style="border-bottom: 1px solid #fde68a;">
                        <td style="padding: 10px; font-weight: bold; background: #fffde7; border: 1px solid #fde68a;">${labels[key]}</td>
                        <td style="padding: 10px; color: #d32f2f; border: 1px solid #fde68a;">${oldData[key] || '---'}</td>
                        <td style="padding: 10px; color: #2e7d32; font-weight: bold; background: #f1f8e9; border: 1px solid #fde68a;">${newData[key]}</td>
                    </tr>
                `;
            }
        }
        return count > 0 ? rows : '<tr><td colspan="3" style="text-align:center; padding:15px; color:#666;">تغييرات في الصور أو المرفقات أو حقول أخرى لم تُدرج في الجدول.</td></tr>';
    }

    // ==========================================
    // 3. وظيفة تحميل PDF ووظائف الإغلاق
    // ==========================================

    window.downloadProjectPDF = (project) => {
        const element = document.getElementById('project-details-content');
        const opt = {
            margin: 10,
            filename: `Project_${project.projectName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    };

    window.closeApprovalModal = () => {
        document.getElementById('approvalModal').classList.remove('show');
        const oldComp = document.getElementById('comparison-box-wrapper');
        if (oldComp) oldComp.remove();
    };

    window.closeConfirmModal = () => document.getElementById('confirmModal').classList.remove('show');

    // --- نوافذ التأكيد والقرار ---
    window.approveProject = () => showConfirmModal('published', 'تأكيد القبول', 'هل توافق على نشر هذا المشروع أو اعتماد تعديلاته الجديدة؟');
    window.rejectProject = () => showConfirmModal('closed', 'تأكيد الرفض', 'هل أنت متأكد من رفض هذا الطلب بالكامل؟');
    window.requestRevision = () => showConfirmModal('needs-revision', 'طلب مراجعة', 'هل تود إعادة المشروع لصاحبه لإجراء تعديلات إضافية؟');

    function showConfirmModal(status, title, message) {
        pendingAction = { status };
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        document.getElementById('confirmModal').classList.add('show');
    }

    /**
     * تنفيذ الإجراء النهائي وإرساله للسيرفر
     */
    window.executeAction = async () => {
        if (!currentProject || !pendingAction) return;

        const adminNotes = document.getElementById('adminNotes').value;
        const status = pendingAction.status;
        const confirmBtn = document.getElementById('confirmBtn');

        confirmBtn.disabled = true;
        confirmBtn.textContent = 'جاري المعالجة...';

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/projects/${currentProject._id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: status, adminNotes: adminNotes })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'فشل التحديث.');
            }

            alert(`تم تنفيذ القرار بنجاح!`);
            location.reload();

        } catch (error) {
            alert(error.message);
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'تأكيد';
        }
    };

    // --- ربط الأحداث ---
    statusFilter.addEventListener("change", loadProjects);
    sortFilter.addEventListener("change", loadProjects);
    searchInput.addEventListener("input", () => {
        clearTimeout(window.adminSearchTimeout);
        window.adminSearchTimeout = setTimeout(loadProjects, 500);
    });

    window.onclick = function (event) {
        const modal = document.getElementById('approvalModal');
        const confirmModal = document.getElementById('confirmModal');
        if (event.target == modal) closeApprovalModal();
        if (event.target == confirmModal) closeConfirmModal();
    }

    // --- التشغيل الأولي ---
    loadProjects();
    updateStats();
});