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
        // window.location.href = '/login.html'; // يمكن تفعيل هذا السطر للتوجيه
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
            if (!response.ok) return;
            const stats = await response.json();
            document.getElementById('pendingCount').textContent = stats.pendingCount || 0;
            document.getElementById('approvedToday').textContent = stats.approvedToday || 0;
            document.getElementById('rejectedToday').textContent = stats.rejectedToday || 0;
            
            // --- الإضافة الجديدة: تحديث عداد التحديثات المعلقة ---
            const updatesCounter = document.getElementById('updatesPendingCount');
            if (updatesCounter) {
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
            // "updates-pending" يتم معالجتها في السيرفر لجلب المشاريع التي لديها hasPendingChanges
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
            projectsGrid.innerHTML = `<div style="text-align:center; padding:20px; width:100%;"><h3>لا توجد مشاريع تطابق بحثك.</h3></div>`;
            return;
        }
        projectsGrid.innerHTML = projects.map(createProjectCard).join('');
    }

    function createProjectCard(project) {
        const statusMap = { 'under-review': 'في انتظار المراجعة', 'published': 'تم القبول', 'closed': 'تم الرفض', 'needs-revision': 'يحتاج مراجعة' };
        let statusText = statusMap[project.status] || project.status;
        const statusClass = `status-${project.status.replace('_', '-')}`; // لتنسيق الألوان حسب الحالة

        // --- الإضافة الجديدة: شارة التحديثات المعلقة ---
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
                    <button class="action-btn btn-primary" onclick="openApprovalModal('${project._id}')"><i class="fas fa-eye"></i> مراجعة التفاصيل</button>
                </div>
            </div>`;
    }

    // ==========================================
    // 2. وظائف المودال (عرض التفاصيل وال PDF)
    // ==========================================

    window.openApprovalModal = (projectId) => {
        currentProject = allProjects.find(p => p._id === projectId);
        if (!currentProject) return;

        // --- أ. رأس المودال والأزرار ---
        document.getElementById('modalTitle').textContent = `مراجعة: ${currentProject.projectName}`;

        // إعداد رابط "عرض في الموقع"
        const viewLink = document.getElementById('viewProjectLink');
        if (viewLink) viewLink.href = `/project-view.html?id=${currentProject._id}`;

        // إعداد زر PDF
        const pdfBtn = document.getElementById('downloadPdfBtn');
        if (pdfBtn) pdfBtn.onclick = () => downloadProjectPDF(currentProject);

        // --- الإضافة الجديدة: إنشاء جدول المقارنة إذا وجد تحديث معلق ---
        const detailContainer = document.getElementById('project-details-content');
        
        // إزالة أي جدول مقارنة قديم
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
                                <th style="padding: 10px; border: 1px solid #fde68a;">البيانات الحالية</th>
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

        // --- ب. المعلومات الأساسية ---
        document.getElementById('detailTitle').textContent = currentProject.projectName;
        document.getElementById('detailOwner').textContent = currentProject.owner ? currentProject.owner.fullName : 'غير معروف';
        document.getElementById('detailSubmissionDate').textContent = new Date(currentProject.createdAt).toLocaleDateString('ar-SA');
        document.getElementById('detailCategory').textContent = currentProject.projectCategory || '-';

        const loc = currentProject.projectLocation || {};
        document.getElementById('detailLocation').textContent = loc.country ? `${loc.city || ''}, ${loc.country}` : '-';

        const stageMap = { 'idea': 'فكرة', 'in-progress': 'قيد التنفيذ', 'established': 'قائم' };
        document.getElementById('detailStage').textContent = stageMap[currentProject.projectStage] || currentProject.projectStage;

        // --- ج. البيانات المالية ---
        const currency = currentProject.fundingGoal?.currency || 'USD';
        document.getElementById('detailFundingGoal').textContent = `${(currentProject.fundingGoal?.amount || 0).toLocaleString()} ${currency}`;
        document.getElementById('detailMinInvestment').textContent = `${(currentProject.minInvestment || 0).toLocaleString()} ${currency}`;
        document.getElementById('detailEquity').textContent = currentProject.equityOffered ? `${currentProject.equityOffered}%` : 'غير محدد';
        document.getElementById('detailDuration').textContent = currentProject.campaignDuration ? `${currentProject.campaignDuration} يوم` : '-';

        // عرض تفاصيل الميزانية (List)
        const fundingDetailsDiv = document.getElementById('detailFundingDetails');
        if (currentProject.fundingDetails && currentProject.fundingDetails.length > 0) {
            fundingDetailsDiv.innerHTML = `<ul style="list-style: disc; padding-right: 20px;">` +
                currentProject.fundingDetails.map(d => `<li><strong>${d.item}:</strong> ${d.percentage}%</li>`).join('') +
                `</ul>`;
        } else {
            fundingDetailsDiv.textContent = 'لا يوجد تفاصيل للميزانية.';
        }

        // عرض التوقعات المالية (Table)
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

        // --- د. الوصف والفريق ---
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

        // --- هـ. المرفقات والصور ---
        // رابط الفيديو
        const videoLinkSpan = document.getElementById('detailVideoLink');
        if (currentProject.videoLink) {
            videoLinkSpan.innerHTML = `<a href="${currentProject.videoLink}" target="_blank" style="color:#1d4ed8; text-decoration:underline;">${currentProject.videoLink}</a>`;
        } else {
            videoLinkSpan.textContent = '-';
        }

        // المرفقات
        const attachmentsList = document.getElementById('detailAttachments');
        attachmentsList.innerHTML = '';
        const filesToCheck = [
            { url: currentProject.businessPlan, label: 'خطة العمل (PDF)', type: 'pdf' },
            { url: currentProject.presentation, label: 'العرض التقديمي (PDF)', type: 'pdf' }
        ];

        let hasAttachments = false;
        filesToCheck.forEach(file => {
            if (file.url) {
                hasAttachments = true;
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
        if (!hasAttachments) attachmentsList.innerHTML = '<p>لا توجد ملفات مرفقة.</p>';

        // الصور
        const imagesDiv = document.getElementById('detailImages');
        imagesDiv.innerHTML = '';
        if (currentProject.projectImages && currentProject.projectImages.length > 0) {
            currentProject.projectImages.forEach(img => {
                imagesDiv.innerHTML += `<a href="${img}" target="_blank"><img src="${img}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd; cursor:pointer;" title="اضغط للتكبير"></a>`;
            });
        } else {
            imagesDiv.innerHTML = '<p>لا توجد صور إضافية.</p>';
        }

        // --- و. تعبئة ملاحظات الإدارة السابقة ---
        document.getElementById('adminNotes').value = currentProject.adminNotes || '';

        // فتح المودال
        document.getElementById('approvalModal').classList.add('show');
    };

    // --- الإضافة الجديدة: دالة مساعدة لمقارنة الحقول النصية ---
    function generateComparisonRows(oldData, newData) {
        const labels = {
            projectName: 'عنوان المشروع',
            projectDescription: 'الوصف المختصر',
            detailedDescription: 'الوصف التفصيلي',
            equityOffered: 'الملكية المعروضة %',
            completionPercentage: 'نسبة الإنجاز %',
            projectCategory: 'الفئة'
        };

        let rows = '';
        let changesFound = false;

        for (let key in labels) {
            if (newData[key] !== undefined && String(newData[key]) !== String(oldData[key])) {
                changesFound = true;
                rows += `
                    <tr style="border-bottom: 1px solid #ffe082;">
                        <td style="padding: 10px; font-weight: bold; background: #fffde7; border: 1px solid #fde68a;">${labels[key]}</td>
                        <td style="padding: 10px; color: #d32f2f; border: 1px solid #fde68a;">${oldData[key] || '---'}</td>
                        <td style="padding: 10px; color: #2e7d32; font-weight: bold; background: #f1f8e9; border: 1px solid #fde68a;">${newData[key]}</td>
                    </tr>
                `;
            }
        }
        return changesFound ? rows : '<tr><td colspan="3" style="text-align:center; padding:15px; color:#666;">تعديلات في الصور أو المرفقات أو حقول أخرى.</td></tr>';
    }

    // ==========================================
    // 3. وظيفة تحميل PDF
    // ==========================================

    window.downloadProjectPDF = (project) => {
        // العنصر الذي يحتوي على التفاصيل داخل المودال
        const element = document.getElementById('project-details-content');

        // خيارات التوليد
        const opt = {
            margin: 10,
            filename: `Project_${project.projectName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // تغيير بسيط في الستايل قبل الطباعة لضمان ظهور الجداول بشكل جيد
        const originalStyle = element.getAttribute('style');
        element.style.background = 'white';
        element.style.padding = '20px';
        element.style.color = 'black';

        // إنشاء الـ PDF
        html2pdf().set(opt).from(element).save().then(() => {
            // إعادة الستايل كما كان
            if (originalStyle) element.setAttribute('style', originalStyle);
            else element.removeAttribute('style');
        });
    };

    // ==========================================
    // 4. وظائف الإغلاق والتأكيد
    // ==========================================

    window.closeApprovalModal = () => {
        document.getElementById('approvalModal').classList.remove('show');
        // تفريغ المودال من جدول المقارنة عند الإغلاق لضمان عدم ظهوره في المشروع التالي بالخطأ
        const oldComp = document.getElementById('comparison-box-wrapper');
        if (oldComp) oldComp.remove();
    };
    window.closeConfirmModal = () => document.getElementById('confirmModal').classList.remove('show');

    // --- نوافذ التأكيد ---
    window.approveProject = () => showConfirmModal('published', 'تأكيد قبول المشروع', 'هل أنت متأكد من قبول هذا المشروع ونشره (أو اعتماد التعديلات الجديدة)؟');
    window.rejectProject = () => showConfirmModal('closed', 'تأكيد رفض المشروع', 'هل أنت متأكد من رفض هذا المشروع؟');
    window.requestRevision = () => showConfirmModal('needs-revision', 'تأكيد طلب المراجعة', 'هل أنت متأكد من طلب مراجعة؟');

    function showConfirmModal(status, title, message) {
        pendingAction = { status };
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        document.getElementById('confirmModal').classList.add('show');
    }

    // --- تنفيذ الإجراء (API Call) ---
    window.executeAction = async () => {
        if (!currentProject || !pendingAction) return;

        const adminNotes = document.getElementById('adminNotes').value;
        const status = pendingAction.status;

        // تغيير نص الزر ليدل على التحميل
        const confirmBtn = document.getElementById('confirmBtn');
        const originalText = confirmBtn.textContent;
        confirmBtn.textContent = 'جاري التنفيذ...';
        confirmBtn.disabled = true;

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

            closeConfirmModal();
            closeApprovalModal();
            loadProjects(); // إعادة تحميل القائمة
            updateStats();  // إعادة تحميل الإحصائيات
            alert(`تم تنفيذ الإجراء بنجاح!`);

        } catch (error) {
            alert(error.message);
        } finally {
            confirmBtn.textContent = originalText;
            confirmBtn.disabled = false;
        }
    };

    // دالة مساعدة لتحديد أيقونة الملف (للاستخدام المستقبلي إن لزم الأمر)
    function getFileIconClass(extension) {
        switch (extension) {
            case 'pdf': return 'fa-file-pdf';
            case 'doc': case 'docx': return 'fa-file-word';
            case 'xls': case 'xlsx': return 'fa-file-excel';
            case 'ppt': case 'pptx': return 'fa-file-powerpoint';
            case 'zip': case 'rar': return 'fa-file-archive';
            case 'jpg': case 'jpeg': case 'png': return 'fa-file-image';
            default: return 'fa-file-alt';
        }
    }

    // --- ربط الأحداث ---
    statusFilter.addEventListener("change", loadProjects);
    sortFilter.addEventListener("change", loadProjects);
    searchInput.addEventListener("input", () => {
        clearTimeout(window.adminSearchTimeout);
        window.adminSearchTimeout = setTimeout(loadProjects, 500);
    });

    // إغلاق المودال عند النقر خارجه
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