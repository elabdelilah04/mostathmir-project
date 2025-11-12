document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://localhost:5000';
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

            // Force re-translation after dynamic content is added
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
                    <p data-i18n-key="js-my-projects-no-projects-suggestion">${t('js-my-projects-no-projects-suggestion').replace('<a href="add-project-new.html">', '<a href="add-project-new.html">')}</p>
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

        let actionButtonsHTML = '';
        const isCompleted = project.status === 'funded' || project.status === 'completed';

        if (isCompleted) {
            actionButtonsHTML = `
                <a href="project-view.html?id=${project._id}" class="action-btn btn-primary"><i class="fas fa-chart-line"></i><span>${t('js-my-projects-view-performance-btn')}</span></a>
                <div class="action-btn btn-completed">
                    <i class="fas fa-check-circle"></i>
                    <span>${t('js-my-projects-completed-btn')}</span>
                </div>
            `;
        } else if (project.status === 'draft' || project.status === 'needs-revision') {
            const previewText = project.status === 'needs-revision' ? t('js-my-projects-view-notes-btn') : t('js-my-projects-preview-btn');
            const editText = project.status === 'draft' ? t('js-my-projects-complete-project-btn') : t('js-my-projects-edit-btn');
            actionButtonsHTML = `
                <a href="project-view.html?id=${project._id}" class="action-btn btn-secondary"><i class="fas fa-eye"></i> ${previewText}</a>
                <a href="add-project-new.html?id=${project._id}" class="action-btn btn-success"><i class="fas fa-edit"></i> ${editText}</a>
                <button class="action-btn btn-danger" onclick="deleteProject('${project._id}')"><i class="fas fa-trash"></i> ${t('js-my-projects-delete-btn')}</button>
            `;
        } else {
            actionButtonsHTML = `
                <a href="project-view.html?id=${project._id}" class="action-btn btn-primary"><i class="fas fa-eye"></i><span>${t('my-projects-view-details')}</span></a>
                <a href="add-project-new.html?id=${project._id}" class="action-btn btn-secondary"><i class="fas fa-edit"></i><span>${t('my-projects-edit')}</span></a>
                <button class="action-btn btn-danger" onclick="deleteProject('${project._id}')"><i class="fas fa-trash"></i><span>${t('my-projects-delete')}</span></button>
            `;
        }

        const notesIndicatorHTML = project.adminNotes ? `
        <span class="admin-notes-indicator" data-notes="${escapeHTML(project.adminNotes)}">
            <i class="fas fa-comment-alt"></i>
        </span>
    ` : '';

        return `
        <div class="project-card" data-id="${project._id}">
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
                        <div class="funding-label" data-i18n-key="funding-required">${t('funding-required')}</div>
                        <div class="funding-value required">${project.fundingGoal.amount.toLocaleString()} ${project.fundingGoal.currency}</div>
                    </div>
                    <div class="funding-item">
                        <div class="funding-label" data-i18n-key="funding-received">${t('funding-received')}</div>
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

    fetchAndRenderProjects();
});

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
    }
});

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, match => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[match]));
}