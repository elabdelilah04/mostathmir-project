const API_BASE_URL = 'http://localhost:5000';

let allProjectsData = [];
const projectsGrid = document.getElementById('projectsGrid');
const token = localStorage.getItem('user_token');

const categoryTranslationKeys = {
    "تقنية": "addproject-category-tech",
    "تجارة إلكترونية": "addproject-category-ecommerce",
    "تطبيقات جوال": "addproject-category-mobile-apps",
    "ذكاء اصطناعي": "addproject-category-ai",
    "تقنيات مالية": "addproject-category-fintech",
    "صحة": "addproject-category-health",
    "تعليم": "addproject-category-education",
    "أخرى": "addproject-category-other"
};
function getAvatarColor(initial) {
    const colors = ['bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600', 'bg-red-600', 'bg-indigo-600'];
    const charCode = initial.charCodeAt(0);
    return colors[charCode % colors.length];
}

function createProjectCardHTML(project) {
    const goal = project.fundingGoal ? project.fundingGoal.amount || 0 : 0;
    const raised = project.fundingAmountRaised || 0;
    const progress = goal > 0 ? Math.round((raised / goal) * 100) : 0;
    const currency = project.fundingGoal ? project.fundingGoal.currency : 'USD';
    const categoryKey = categoryTranslationKeys[project.projectCategory] || 'js-browse-category-general';
    const ownerId = project.owner?._id || 'default';
    const ownerName = project.owner?.fullName || t('js-browse-entrepreneur');
    const ownerInitial = ownerName.charAt(0);
    const avatarColor = getAvatarColor(ownerInitial);
    const ownerLink = `./public-profile.html?id=${ownerId}`;

    let statusClass = 'status-funding';
    let statusLabel = t('js-browse-status-seeking');
    if (progress >= 100) {
        statusClass = 'status-completed';
        statusLabel = t('js-browse-status-funded');
    } else if (project.status === 'published' && progress > 0) {
        statusClass = 'status-active';
        statusLabel = t('js-browse-status-active');
    } else if (project.status === 'draft') {
        statusLabel = t('js-browse-status-draft');
    }

    return `
        <div class="project-card p-6 cursor-pointer" 
             data-category="${project.projectCategory || 'other'}" 
             data-status="${project.status}"
             data-progress="${progress}"
             data-funding="${goal}"
             onclick='window.openProjectDetails(${JSON.stringify(project)})'>
            <div class="flex justify-between items-start mb-4">
<div class="category-tag">${t(categoryKey)}</div>
                <div class="status-badge ${statusClass}">${statusLabel}</div>
            </div>
            
            <h3 class="text-xl font-bold text-gray-900 mb-3">${project.projectName || t('js-browse-untitled-project')}</h3>
            <p class="text-gray-600 text-sm mb-4 leading-relaxed">
                ${(project.projectDescription || '').substring(0, 80)}...
            </p>
            
            <div class="mb-4">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-sm font-medium text-gray-700">${t('js-browse-funding-goal')}</span>
                    <span class="text-sm font-bold text-blue-600">${goal.toLocaleString()} ${currency}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="progress-bar h-2 rounded-full" style="width: ${progress}%"></div>
                </div>
                <div class="flex justify-between items-center mt-2">
                    <span class="text-xs text-gray-600">${progress}% ${t('js-browse-completed')}</span>
                    <span class="text-xs font-medium text-green-600">${raised.toLocaleString()} ${currency} ${t('js-browse-raised')}</span>
                </div>
            </div>
            
            <div class="flex justify-between items-center">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 ${avatarColor} rounded-full flex items-center justify-center text-white text-sm font-bold">
                        ${ownerInitial}
                    </div>
                    <a href="${ownerLink}" target="_blank" class="text-sm text-gray-700 hover:text-blue-600 font-semibold transition-colors">
                        ${ownerName}
                    </a>
                </div>
                <div class="text-right">
                    <div class="text-sm font-medium text-gray-900">${project.views || 0}</div>
                    <div class="text-xs text-gray-600">${t('js-browse-views')}</div>
                </div>
            </div>
        </div>
    `;
}

function renderProjects(projectsToRender) {
    projectsGrid.innerHTML = '';

    if (projectsToRender.length === 0) {
        projectsGrid.innerHTML = `<p class="col-span-full text-center text-xl text-gray-500 py-10">${t('js-browse-no-projects-found')}</p>`;
        return;
    }

    projectsToRender.forEach(project => {
        projectsGrid.innerHTML += createProjectCardHTML(project);
    });
}

async function fetchProjects() {
    if (!token) {
        projectsGrid.innerHTML = `<p class="col-span-full text-center text-xl text-red-500 py-10">${t('js-browse-login-required')}</p>`;
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/projects/public`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: t('js-browse-error-server') }));
            throw new Error(errorData.message || t('js-browse-error-fetch-failed'));
        }

        const data = await response.json();
        allProjectsData = data.filter(p => p.status === 'published' || p.status === 'funding');
        window.allProjectsData = allProjectsData;

        renderProjects(allProjectsData);
        if (window.translatePage) window.translatePage();

    } catch (error) {
        console.error('Fetch Projects Error:', error);
        projectsGrid.innerHTML = `<p class="col-span-full text-center text-xl text-red-500 py-10">${error.message}</p>`;
    }
}

function applyFiltersAndSearch() {
    let filtered = [...allProjectsData];

    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(p =>
            (p.projectName && p.projectName.toLowerCase().includes(searchTerm)) ||
            (p.projectDescription && p.projectDescription.toLowerCase().includes(searchTerm))
        );
    }

    const activeFilterBtn = document.querySelector('.filter-btn.active');
    const quickFilter = activeFilterBtn ? activeFilterBtn.getAttribute('data-filter') : 'all';

    if (quickFilter !== 'all') {
        filtered = filtered.filter(p => (p.projectCategory || t('js-browse-category-other')).toLowerCase() === quickFilter.toLowerCase());
    }

    const advancedFilters = getAdvancedFilterValues();

    if (advancedFilters.fundingRanges.length > 0 || advancedFilters.statuses.length > 0 || advancedFilters.progressRanges.length > 0) {
        filtered = filtered.filter(project => {
            const goal = project.fundingGoal ? project.fundingGoal.amount || 0 : 0;
            const progress = goal > 0 ? Math.round((project.fundingAmountRaised / goal) * 100) : 0;
            const status = project.status || 'draft';
            let passesFilter = true;

            if (advancedFilters.fundingRanges.length > 0) {
                let matchesFunding = false;
                if (advancedFilters.fundingRanges.includes('low') && goal < 100000) matchesFunding = true;
                if (advancedFilters.fundingRanges.includes('medium') && goal >= 100000 && goal <= 200000) matchesFunding = true;
                if (advancedFilters.fundingRanges.includes('high') && goal > 200000) matchesFunding = true;
                if (!matchesFunding) passesFilter = false;
            }

            if (passesFilter && advancedFilters.statuses.length > 0) {
                let matchesStatus = false;
                if (advancedFilters.statuses.includes('active') && (status === 'published' || status === 'funding')) matchesStatus = true;
                if (advancedFilters.statuses.includes('funding') && status === 'funding') matchesStatus = true;
                if (advancedFilters.statuses.includes('completed') && status === 'completed') matchesStatus = true;

                if (!matchesStatus) passesFilter = false;
            }

            if (passesFilter && advancedFilters.progressRanges.length > 0) {
                let matchesProgress = false;
                if (advancedFilters.progressRanges.includes('0-25') && progress >= 0 && progress <= 25) matchesProgress = true;
                if (advancedFilters.progressRanges.includes('26-50') && progress >= 26 && progress <= 50) matchesProgress = true;
                if (advancedFilters.progressRanges.includes('51-75') && progress >= 51 && progress <= 75) matchesProgress = true;
                if (advancedFilters.progressRanges.includes('76-100') && progress >= 76 && progress <= 100) matchesProgress = true;
                if (!matchesProgress) passesFilter = false;
            }

            return passesFilter;
        });
    }

    const sortBy = document.getElementById('sortBy')?.value;

    if (sortBy) {
        filtered.sort((a, b) => {
            const goalA = a.fundingGoal ? a.fundingGoal.amount || 0 : 0;
            const raisedA = a.fundingAmountRaised || 0;
            const progressA = goalA > 0 ? (raisedA / goalA) : 0;
            const viewsA = a.views || 0;
            const dateA = new Date(a.createdAt);

            const goalB = b.fundingGoal ? b.fundingGoal.amount || 0 : 0;
            const raisedB = b.fundingAmountRaised || 0;
            const progressB = goalB > 0 ? (raisedB / goalB) : 0;
            const viewsB = b.views || 0;
            const dateB = new Date(b.createdAt);

            switch (sortBy) {
                case 'newest': return dateB - dateA;
                case 'oldest': return dateA - dateB;
                case 'funding-high': return goalB - goalA;
                case 'funding-low': return goalA - goalB;
                case 'progress-high': return progressB - progressA;
                case 'progress-low': return progressA - progressB;
                case 'views-high': return viewsB - viewsA;
                default: return 0;
            }
        });
    }

    renderProjects(filtered);
}

function getAdvancedFilterValues() {
    const fundingRanges = [];
    if (document.getElementById('range1')?.checked) fundingRanges.push('low');
    if (document.getElementById('range2')?.checked) fundingRanges.push('medium');
    if (document.getElementById('range3')?.checked) fundingRanges.push('high');

    const statuses = [];
    if (document.getElementById('status1')?.checked) statuses.push('active');
    if (document.getElementById('status2')?.checked) statuses.push('funding');
    if (document.getElementById('status3')?.checked) statuses.push('completed');

    const progressRanges = [];
    if (document.getElementById('progress1')?.checked) progressRanges.push('0-25');
    if (document.getElementById('progress2')?.checked) progressRanges.push('26-50');
    if (document.getElementById('progress3')?.checked) progressRanges.push('51-75');
    if (document.getElementById('progress4')?.checked) progressRanges.push('76-100');

    return { fundingRanges, statuses, progressRanges };
}

window.applyAdvancedFilter = function () {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.filter-btn[data-filter="all"]')?.classList.add('active');
    applyFiltersAndSearch();
    window.closeAdvancedFilter();

    const successMsg = document.createElement('div');
    successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    successMsg.textContent = t('js-browse-success-filters-applied');
    document.body.appendChild(successMsg);
    setTimeout(() => successMsg.remove(), 3000);
}

window.resetAdvancedFilter = function () {
    document.querySelectorAll('#advancedFilterModal input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    if (document.getElementById('sortBy')) {
        document.getElementById('sortBy').value = 'newest';
    }
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.filter-btn[data-filter="all"]')?.classList.add('active');
    applyFiltersAndSearch();
    window.closeAdvancedFilter();

    const resetMsg = document.createElement('div');
    resetMsg.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    resetMsg.textContent = t('js-browse-success-filters-reset');
    document.body.appendChild(resetMsg);
    setTimeout(() => resetMsg.remove(), 3000);
}

window.openAdvancedFilter = function () {
    document.getElementById('advancedFilterModal').classList.remove('hidden');
}

window.closeAdvancedFilter = function () {
    document.getElementById('advancedFilterModal').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    fetchProjects();
    document.querySelectorAll('.filter-btn').forEach(button => {
        button.addEventListener('click', function () {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            applyFiltersAndSearch();
        });
    });
    document.getElementById('searchInput').addEventListener('input', applyFiltersAndSearch);
    document.addEventListener('click', function (e) {
        if (e.target.id === 'advancedFilterModal' && e.target.classList.contains('modal')) {
            window.closeAdvancedFilter();
        }
    });
});
function getAvatarColor(initial) {
    const colors = ['bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600', 'bg-red-600', 'bg-indigo-600'];
    const charCode = initial.charCodeAt(0);
    return colors[charCode % colors.length];
}


window.openProjectDetails = function (project) {
    if (!project) return;
    window.currentProject = project;

    document.getElementById('modalTitle').textContent = project.projectName || t('js-modal-untitled-project');
    const categoryKey = categoryTranslationKeys[project.projectCategory] || 'js-modal-category-general';
    document.getElementById('modalCategory').textContent = t(categoryKey); document.getElementById('modalDescription').textContent = (project.projectDescription || '').substring(0, 200) + '...';

    const goal = project.fundingGoal ? project.fundingGoal.amount || 0 : 0;
    const raised = project.fundingAmountRaised || 0;
    const progress = goal > 0 ? Math.round((raised / goal) * 100) : 0;
    const currency = project.fundingGoal ? project.fundingGoal.currency : 'USD';

    document.getElementById('modalTargetAmount').textContent = `${goal.toLocaleString()} ${currency}`;
    document.getElementById('modalRaisedAmount').textContent = `${raised.toLocaleString()} ${currency} ${t('js-modal-raised')}`;
    document.getElementById('modalProgress').textContent = `${progress}% ${t('js-modal-completed')}`;
    document.getElementById('modalProgressBar').style.width = `${progress}%`;

    const ownerId = project.owner?._id || 'default';
    const ownerName = project.owner?.fullName || t('js-modal-entrepreneur');

    let ownerTitle = project.owner?.profileTitle;
    if (!ownerTitle) {
        ownerTitle = project.owner?.accountType === 'investor' ? t('js-modal-role-investor') : t('js-modal-role-ideaholder');
    }

    const ownerInitial = ownerName.charAt(0);
    const avatarColor = getAvatarColor(ownerInitial);
    const ownerLink = `./public-profile.html?id=${ownerId}`;

    document.getElementById('modalOwnerName').innerHTML = `<a href="${ownerLink}" target="_blank" class="hover:text-blue-600">${ownerName}</a>`;
    const modalOwnerTitleElement = document.getElementById('modalOwnerTitle');
    if (modalOwnerTitleElement) modalOwnerTitleElement.textContent = ownerTitle;

    document.getElementById('modalOwnerAvatar').textContent = ownerInitial;
    document.getElementById('modalOwnerAvatar').className = `w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${avatarColor}`;

    const fullDetailsButton = document.getElementById('btnOpenFullDetails');
    if (fullDetailsButton) {
        fullDetailsButton.href = `project-view.html?id=${project._id}`;
    }
    const investButton = document.getElementById('btnInvestInProject');
    if (investButton) {
        investButton.href = `invest.html?id=${project._id}`;
    }

    document.getElementById('projectModal').classList.remove('hidden');
}

window.closeProjectModal = function () {
    document.getElementById('projectModal').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('projectModal').addEventListener('click', (e) => {
        if (e.target.id === 'projectModal' || e.target.classList.contains('modal')) {
            window.closeProjectModal();
        }
    });
});