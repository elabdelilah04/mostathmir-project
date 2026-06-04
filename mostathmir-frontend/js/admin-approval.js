/* ==========================================================================
   ADMIN APPROVAL SCRIPT (Final Version with PDF & Full Details)
   محدث: يدعم مقارنة التعديلات وإحصائيات التحديثات المعلقة
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
     * جلب إحصائيات لوحة التحكم
     */
    async function updateStats() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                console.error("Stats API error:", response.status);
                return;
            }
            const stats = await response.json();

            // تسجيل البيانات في الكونسول للتأكد من وصولها (Diagnostic Log)
            console.log("Stats received from server:", stats);

            // تحديث العدادات في الواجهة (استخدام الأسماء المطابقة للباك إند)
            document.getElementById('pendingCount').textContent = stats.pendingCount || 0;
            document.getElementById('approvedToday').textContent = stats.approvedToday || 0;
            document.getElementById('rejectedToday').textContent = stats.rejectedToday || 0;

            // تحديث عداد التحديثات المعلقة
            const updatesCounter = document.getElementById('updatesPendingCount');
            if (updatesCounter) {
                // نتحقق من اسم الحقل القادم من السيرفر
                updatesCounter.textContent = stats.updatesPendingCount || 0;
            }
        } catch (error) {
            console.error("Failed to update stats:", error);
        }
    }

    /**
     * جلب قائمة المشاريع من السيرفر
     */
    async function loadProjects() {
        projectsGrid.innerHTML = '<div style="text-align:center; padding:20px;">جاري تحميل المشاريع...</div>';

        const params = new URLSearchParams();
        if (statusFilter.value) {
            // "pending" في الواجهة الأمامية يقابل "under-review" في قاعدة البيانات
            // "updates-pending" يتم التعامل معها في دالة getProjectsForAdmin المحدثة
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
            projectsGrid.innerHTML = `<p style="color: red; text-align:center;">${error.message}</p>`;
        }
    }

    /**
     * رسم بطاقات المشاريع في الشبكة
     */
    function renderProjects(projects) {
        if (projects.length === 0) {
            projectsGrid.innerHTML = `<div style="text-align:center; padding:50px; width:100%; grid-column: 1 / -1;"><h3>لا توجد مشاريع تطابق بحثك حالياً.</h3></div>`;
            return;
        }
        projectsGrid.innerHTML = projects.map(createProjectCard).join('');
    }

    function createProjectCard(project) {
        const statusMap = {
            'under-review': 'في انتظار المراجعة',
            'published': 'تم القبول',
            'closed': 'تم الرفض',
            'needs-revision': 'يحتاج مراجعة'
        };
        let statusText = statusMap[project.status] || project.status;
        const statusClass = `status-${project.status.replace('_', '-')}`;

        // شارة التحديث المعلق
        let updateBadge = "";
        if (project.hasPendingChanges) {
            updateBadge = `<span class="update-badge" style="background:#f59e0b; color:white; padding:2px 8px; border-radius:4px; font-size:10px; margin-left:10px; font-weight:bold;"><i class="fas fa-sync-alt"></i> تحديث معلق</span>`;
            statusText = "مراجعة تعديلات";
        }

        return `
            <div class="project-card" data-id="${project._id}">
                <div class="project-header">
                    <h3 class="project-title">${project.projectName}</h3>
                    <div style="display:flex; align-items:center;">
                        ${updateBadge}
                        <span class="project-status ${statusClass}">${statusText}</span>
                    </div>
                </div>
                <div class="project-info">
                    <div class="info-row"><span class="info-label">صاحب المشروع:</span><span class="info-value">${project.owner ? project.owner.fullName : 'غير معروف'}</span></div>
                    <div class="info-row"><span class="info-label">تاريخ التقديم:</span><span class="info-value">${new Date(project.createdAt).toLocaleDateString('ar-SA')}</span></div>
                    <div class="info-row"><span class="info-label">التمويل المطلوب:</span><span class="info-value">${(project.fundingGoal.amount || 0).toLocaleString()} ${project.fundingGoal.currency || 'USD'}</span></div>
                </div>
                <div class="project-description">${(project.projectDescription || '').substring(0, 100)}...</div>
                <div class="project-actions">
                    <button class="action-btn btn-primary" onclick="openApprovalModal('${project._id}')"><i class="fas fa-eye"></i> مراجعة التفاصيل والقرار</button>
                </div>
            </div>`;
    }

    // ==========================================
    // 2. وظائف المودال (عرض التفاصيل وال PDF)
    // ==========================================

    window.openApprovalModal = (projectId) => {
        currentProject = allProjects.find(p => p._id === projectId);
        if (!currentProject) return;

        // رأس المودال
        document.getElementById('modalTitle').textContent = `مراجعة: ${currentProject.projectName}`;

        // إعداد الروابط
        const viewLink = document.getElementById('viewProjectLink');
        if (viewLink) viewLink.href = `/project-view.html?id=${currentProject._id}`;

        const pdfBtn = document.getElementById('downloadPdfBtn');
        if (pdfBtn) pdfBtn.onclick = () => downloadProjectPDF(currentProject);

        // --- إضافة جدول المقارنة إذا وجد تحديث معلق ---
        const detailContainer = document.getElementById('project-details-content');
        const oldComp = document.getElementById('comparison-box-wrapper');
        if (oldComp) oldComp.remove();

        if (currentProject.hasPendingChanges && currentProject.pendingChanges) {
            const comparisonHTML = `
                <div id="comparison-box-wrapper" class="detail-section" style="background: #fff8e1; border: 2px solid #ffc107; margin-bottom: 25px; padding: 20px; border-radius: 12px;">
                    <h3 style="color: #856404; margin-bottom: 15px; border-bottom: 1px solid #ffe082; padding-bottom: 10px;">
                        <i class="fas fa-exchange-alt"></i> مقارنة التعديلات الجديدة المطلوبة
                    </h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: right;">
                        <thead>
                            <tr style="background: #fef3c7;">
                                <th style="padding: 10px; border: 1px solid #fde68a;">الحقل</th>
                                <th style="padding: 10px; border: 1px solid #fde68a;">الحالي (منشور)</th>
                                <th style="padding: 10px; border: 1px solid #fde68a; color: #166534;">المقترح الجديد</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${generateComparisonRows(currentProject, currentProject.pendingChanges)}
                        </tbody>
                    </table>
                    <p style="font-size: 11px; color: #b45309; margin-top: 10px;">* ملاحظة: الموافقة ستؤدي لاستبدال البيانات القديمة بالجديدة فوراً.</p>
                </div>
            `;
            detailContainer.insertAdjacentHTML('afterbegin', comparisonHTML);
        }

        // المعلومات الأساسية
        document.getElementById('detailTitle').textContent = currentProject.projectName;
        document.getElementById('detailOwner').textContent = currentProject.owner ? currentProject.owner.fullName : 'غير معروف';
        document.getElementById('detailSubmissionDate').textContent = new Date(currentProject.createdAt).toLocaleDateString('ar-SA');
        document.getElementById('detailCategory').textContent = currentProject.projectCategory || '-';

        const loc = currentProject.projectLocation || {};
        document.getElementById('detailLocation').textContent = loc.country ? `${loc.city || ''}, ${loc.country}` : '-';

        const stageMap = { 'idea': 'فكرة', 'in-progress': 'قيد التنفيذ', 'established': 'قائم' };
        document.getElementById('detailStage').textContent = stageMap[currentProject.projectStage] || currentProject.projectStage;

        // البيانات المالية
        const currency = currentProject.fundingGoal?.currency || 'USD';
        document.getElementById('detailFundingGoal').textContent = `${(currentProject.fundingGoal?.amount || 0).toLocaleString()} ${currency}`;
        document.getElementById('detailMinInvestment').textContent = `${(currentProject.minInvestment || 0).toLocaleString()} ${currency}`;
        document.getElementById('detailEquity').textContent = currentProject.equityOffered ? `${currentProject.equityOffered}%` : 'غير محدد';
        document.getElementById('detailDuration').textContent = currentProject.campaignDuration ? `${currentProject.campaignDuration} يوم` : '-';

        // عرض تفاصيل الميزانية
        const fundingDetailsDiv = document.getElementById('detailFundingDetails');
        if (currentProject.fundingDetails && currentProject.fundingDetails.length > 0) {
            fundingDetailsDiv.innerHTML = `<ul style="list-style: disc; padding-right: 20px;">` +
                currentProject.fundingDetails.map(d => `<li><strong>${d.item}:</strong> ${d.percentage}%</li>`).join('') +
                `</ul>`;
        } else {
            fundingDetailsDiv.textContent = 'لا يوجد تفاصيل للميزانية.';
        }

        // عرض التوقعات المالية
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

        // الوصف والفريق
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

        // المرفقات والصور
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
        return count > 0 ? rows : '<tr><td colspan="3" style="text-align:center; padding:15px; color:#666;">تغييرات في الصور أو المرفقات.</td></tr>';
    }

    // ==========================================
    // 3. وظيفة تحميل PDF
    // ==========================================

    window.downloadProjectPDF = (project) => {
        const element = document.getElementById('project-details-content');
        const opt = {
            margin: 10,
            filename: `Project_${project.projectName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    };

    // ==========================================
    // 4. وظائف الإغلاق والتأكيد
    // ==========================================

    window.closeApprovalModal = () => {
        document.getElementById('approvalModal').classList.remove('show');
        const oldComp = document.getElementById('comparison-box-wrapper');
        if (oldComp) oldComp.remove();
    };

    window.closeConfirmModal = () => document.getElementById('confirmModal').classList.remove('show');

    // نوافذ التأكيد
    window.approveProject = () => showConfirmModal('published', 'تأكيد القبول', 'هل أنت متأكد من قبول هذا المشروع ونشره (أو اعتماد التعديلات الجديدة)؟');
    window.rejectProject = () => showConfirmModal('closed', 'تأكيد الرفض', 'هل أنت متأكد من رفض هذا المشروع؟');
    window.requestRevision = () => showConfirmModal('needs-revision', 'تأكيد طلب المراجعة', 'هل أنت متأكد من طلب مراجعة؟');

    function showConfirmModal(status, title, message) {
        pendingAction = { status };
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        document.getElementById('confirmModal').classList.add('show');
    }

    /**
     * تنفيذ الإجراء (API Call)
     */
    window.executeAction = async () => {
        if (!currentProject || !pendingAction) return;
        const adminNotes = document.getElementById('adminNotes').value;
        const status = pendingAction.status;
        const confirmBtn = document.getElementById('confirmBtn');
        confirmBtn.disabled = true; confirmBtn.textContent = 'جاري التنفيذ...';

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/projects/${currentProject._id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: status, adminNotes: adminNotes })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'فشل تحديث حالة المشروع.');
            }

            alert(`تم تنفيذ الإجراء بنجاح!`);
            location.reload();
        } catch (error) {
            alert(error.message);
            confirmBtn.disabled = false; confirmBtn.textContent = 'تأكيد';
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