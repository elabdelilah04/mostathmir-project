/**
 * MOSTATHMIR - MY PROJECTS MANAGEMENT
 */

document.addEventListener('DOMContentLoaded', () => {
    // const API_BASE_URL = 'https://mostathmir-api.onrender.com';
    const projectsGrid = document.getElementById('projectsGrid');
    if (!projectsGrid) return;

    const token = localStorage.getItem('user_token');
    if (!token) {
        alert(t('js-my-projects-login-required'));
        window.location.href = 'login.html';
        return;
    }

    const statusFilter = document.getElementById('statusFilter');
    const sortFilter = document.getElementById('sortFilter');
    const searchInput = document.getElementById('searchInput');

    let filters = {
        status: '',
        sort: 'newest',
        keyword: ''
    };

    // ==========================================
    // 1. منطق جلب وعرض المشاريع
    // ==========================================
    async function fetchAndRenderProjects() {
        projectsGrid.innerHTML = `<p class="loading-text">${t('js-my-projects-loading')}</p>`;

        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.sort) params.append('sort', filters.sort);
        if (filters.keyword) params.append('keyword', filters.keyword);

        try {
            const response = await fetch(`${API_BASE_URL}/api/projects/myprojects?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || t('js-my-projects-error-fetch-failed'));
            }

            const projects = await response.json();
            renderProjects(projects);

            if (window.translatePage) {
                window.translatePage();
            }

        } catch (error) {
            projectsGrid.innerHTML = `<p class="error-text">${error.message}</p>`;
        }
    }

    function renderProjects(projects) {
        projectsGrid.innerHTML = '';
        if (projects.length === 0) {
            projectsGrid.innerHTML = `
                <div class="no-projects-placeholder">
                    <i class="fas fa-folder-open"></i>
                    <h3 data-i18n-key="js-my-projects-no-projects-found">${t('js-my-projects-no-projects-found')}</h3>
                    <p data-i18n-key="js-my-projects-no-projects-suggestion">${t('js-my-projects-no-projects-suggestion')}</p>
                </div>`;
            return;
        }
        projectsGrid.innerHTML = projects.map(createProjectCard).join('');
    }

    function createProjectCard(project) {
        const fundingProgress = (project.fundingGoal && project.fundingGoal.amount > 0)
            ? Math.round(((project.fundingAmountRaised || 0) / project.fundingGoal.amount) * 100)
            : 0;

        const statusMap = {
            draft: t('js-my-projects-status-draft'),
            'under-review': t('js-my-projects-status-under-review'),
            published: t('js-my-projects-status-published'),
            funded: t('js-my-projects-status-funded'),
            completed: t('js-my-projects-status-completed'),
            closed: t('js-my-projects-status-closed'),
            'needs-revision': t('js-my-projects-status-needs-revision')
        };

        const statusText = statusMap[project.status] || project.status;
        const projectName = project.projectName || t('js-my-projects-untitled-draft');
        const description = project.projectDescription ? project.projectDescription.substring(0, 150) + '...' : t('js-my-projects-no-description');

        const formattedDate = new Date(project.createdAt).toLocaleDateString("en-us", {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // --- إضافة منطق التنبيه للتعديلات المعلقة ---
        let pendingUpdatesNotice = '';
        if (project.hasPendingChanges) {
            pendingUpdatesNotice = `
                <div class="pending-updates-alert" style="background: #fffbeb; color: #9a3412; padding: 10px; border-radius: 8px; border: 1px solid #fde68a; margin-bottom: 12px; font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-history animate-pulse"></i>
                    <span>المشروع منشور، ولكن هناك تعديلات جديدة قيد المراجعة حالياً من قبل الإدارة.</span>
                </div>
            `;
        }

        let actionButtonsHTML = '';
        const hasInvestment = (project.fundingAmountRaised || 0) > 0;
        const isLocked = hasInvestment || project.status === 'funded' || project.status === 'completed';

        if (isLocked) {
            // التحقق إذا كان مسموحاً له بالتعديل استثنائياً من الإدارة
            if (project.isRevisionAllowed) {
                actionButtonsHTML = `
                    <a href="project-view.html?id=${project._id}" class="action-btn btn-primary">
                        <i class="fas fa-chart-line"></i><span>${t('js-my-projects-view-performance-btn')}</span>
                    </a>
                    <a href="add-project-new.html?id=${project._id}" class="action-btn btn-success">
                        <i class="fas fa-edit"></i> <span>تعديل البيانات المسموح بها</span>
                    </a>
                `;
            } else {
                actionButtonsHTML = `
                <a href="project-view.html?id=${project._id}" class="action-btn btn-primary">
                    <i class="fas fa-chart-line"></i><span>${t('js-my-projects-view-performance-btn')}</span>
                </a>
                <button class="action-btn btn-warning" onclick="openRevisionModal('${project._id}', '${escapeHTML(projectName)}')">
                    <i class="fas fa-edit"></i> <span>${t('js-my-projects-request-edit-btn') || 'طلب تعديل'}</span>
                </button>
                <div style="flex-basis: 100%; text-align: center; margin-top: 10px; font-size: 0.75rem; color: #ef4444; font-weight: 600;">
                    <i class="fas fa-lock"></i> ${t('js-my-projects-edit-locked-funded')}
                </div>
            `;
            }
        } else {
            const previewText = project.status === 'needs-revision' ? t('js-my-projects-view-notes-btn') : t('js-my-projects-preview-btn');
            const editText = (project.status === 'draft') ? t('js-my-projects-complete-project-btn') : t('js-my-projects-edit-btn');

            actionButtonsHTML = `
            <a href="project-view.html?id=${project._id}" class="action-btn btn-secondary"><i class="fas fa-eye"></i> ${previewText}</a>
            <a href="add-project-new.html?id=${project._id}" class="action-btn btn-success"><i class="fas fa-edit"></i> ${editText}</a>
            <button class="action-btn btn-danger" onclick="deleteProject('${project._id}')"><i class="fas fa-trash"></i> ${t('js-my-projects-delete-btn')}</button>
        `;
        }

        const notesIndicatorHTML = project.adminNotes ? `
            <span class="admin-notes-indicator" data-notes="${escapeHTML(project.adminNotes)}">
                <i class="fas fa-comment-alt"></i>
            </span>
        ` : '';

        return `
        <div class="project-card" data-id="${project._id}">
            ${pendingUpdatesNotice} <!-- عرض التنبيه هنا في أعلى الكرت -->
            <div class="project-header">
                <h3 class="project-title">${escapeHTML(projectName)}</h3>
                <div class="header-indicators">
                    ${notesIndicatorHTML}
                    <span class="project-status status-${project.status.replace('_', '-')}">${statusText}</span>
                </div>
            </div>
            <p class="project-description">${escapeHTML(description)}</p>
            ${(project.fundingGoal && project.fundingGoal.amount > 0) ? `
                <div class="project-funding">
                    <div class="funding-item">
                        <div class="funding-label">${t('funding-required')}</div>
                        <div class="funding-value required">${project.fundingGoal.amount.toLocaleString()} ${project.fundingGoal.currency}</div>
                    </div>
                    <div class="funding-item">
                        <div class="funding-label">${t('funding-received')}</div>
                        <div class="funding-value collected">${(project.fundingAmountRaised || 0).toLocaleString()} ${project.fundingGoal.currency}</div>
                    </div>
                </div>
                <div class="progress-bar"><div class="progress-fill" style="width: ${fundingProgress}%"></div></div>
            ` : ""}
            <div class="project-meta">
                <span><i class="fas fa-calendar"></i> ${formattedDate}</span>
            </div>
            <div class="project-actions">
                ${actionButtonsHTML}
            </div>
        </div>
        `;
    }

    // ==========================================
    // 2. منطق مودال طلب التعديل (Revision Modal)
    // ==========================================
    window.openRevisionModal = (projectId, projectName) => {
        const modal = document.getElementById('revisionModal');
        const idInput = document.getElementById('revisionProjectId');
        const nameInput = document.getElementById('revisionProjectName');

        if (modal && idInput && nameInput) {
            idInput.value = projectId;
            nameInput.value = projectName;
            modal.style.display = 'flex';
        }
    };

    window.closeRevisionModal = () => {
        const modal = document.getElementById('revisionModal');
        if (modal) {
            modal.style.display = 'none';
            document.getElementById('revisionForm')?.reset();
        }
    };

    // معالجة إرسال طلب التعديل الفعلي
    document.getElementById('revisionForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const projectId = document.getElementById('revisionProjectId').value;
        const reason = document.getElementById('revisionDetails').value;

        // 1. جمع الأقسام المختارة من الـ Checkboxes
        const checkboxes = document.querySelectorAll('.sections-selection-grid input:checked');
        const selectedSections = Array.from(checkboxes).map(cb => cb.value);

        if (selectedSections.length === 0) {
            return alert("يرجى تحديد قسم واحد على الأقل تود تعديله.");
        }

        const btn = document.getElementById('btnSendRevision');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = "...";

        // 2. تجهيز البيانات للإرسال للموديل الجديد
        const payload = {
            projectId: projectId,
            sections: selectedSections, // نرسل المصفوفة مباشرة
            reason: reason
        };

        try {
            const token = localStorage.getItem('user_token');
            const response = await fetch(`${API_BASE_URL}/api/users/revisions/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert('✅ تم إيداع طلب التعديل بنجاح. سيتم مراجعته من قبل الإدارة وإشعارك بالقرار.');
                closeRevisionModal(); // إغلاق النافذة
            } else {
                const err = await response.json();
                throw new Error(err.message);
            }
        } catch (error) {
            alert('❌ فشل إرسال الطلب: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    });

    // ==========================================
    // 3. باقي الوظائف (حذف، تصفية، ملاحظات)
    // ==========================================
    window.deleteProject = async (projectId) => {
        if (!confirm(t('js-my-projects-confirm-delete'))) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || t('js-my-projects-error-delete-failed'));
            }
            fetchAndRenderProjects();
        } catch (error) {
            alert(error.message);
        }
    };

    statusFilter.addEventListener("change", (e) => {
        filters.status = e.target.value;
        fetchAndRenderProjects();
    });
    sortFilter.addEventListener("change", (e) => {
        filters.sort = e.target.value;
        fetchAndRenderProjects();
    });
    searchInput.addEventListener("input", () => {
        clearTimeout(window.searchTimeout);
        window.searchTimeout = setTimeout(() => {
            filters.keyword = searchInput.value;
            fetchAndRenderProjects();
        }, 500);
    });

    // التشغيل الأولي
    fetchAndRenderProjects();
});

// مصفوفة إدارة ملاحظات الإدارة
if (!document.getElementById('notesModal')) {
    const modalHTML = `
        <div id="notesModal" class="modal-overlay" style="display:none;">
            <div class="modal-box">
                <span class="modal-close">&times;</span>
                <h3 class="modal-title" data-i18n-key="js-my-projects-admin-notes-title">${t('js-my-projects-admin-notes-title')}</h3>
                <p id="modalNotesContent"></p>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

document.addEventListener('click', (e) => {
    const icon = e.target.closest('.admin-notes-indicator');
    if (icon) {
        const notes = icon.getAttribute('data-notes');
        document.getElementById('modalNotesContent').textContent = notes;
        document.getElementById('notesModal').style.display = 'flex';
    }
});

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-close')) {
        document.getElementById('notesModal').style.display = 'none';
        document.getElementById('revisionModal').style.display = 'none';
    }
});

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, match => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[match]));
}