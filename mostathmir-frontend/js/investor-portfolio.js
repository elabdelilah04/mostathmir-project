const API_BASE_URL = 'http://localhost:5000';
let allInvestments = [];
let allProposals = [];
let followedProjects = [];
let currentFilterType = 'investments';

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('user_token');
    if (!token) {
        alert(t('js-portfolio-login-required'));
        window.location.href = 'login.html';
        return;
    }

    await fetchPortfolioData();
    setupFilters();
    applyFiltersAndRender();

    const closeBtn = document.querySelector('#projectModal .text-3xl');
    const modalOverlay = document.getElementById('projectModal');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', (e) => {
        if (e.target.id === 'projectModal') {
            closeModal();
        }
    });
});

async function fetchPortfolioData() {
    const grid = document.getElementById('projectsGrid');
    if (grid) grid.innerHTML = `<p class="text-center col-span-full">${t('js-portfolio-loading-portfolio')}</p>`;
    const token = localStorage.getItem('user_token');

    try {
        const [investmentRes, proposalsRes, followedRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/users/portfolio/investments`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE_URL}/api/users/portfolio/proposals`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE_URL}/api/users/portfolio/followed`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (!investmentRes.ok || !proposalsRes.ok || !followedRes.ok) {
            throw new Error(t('js-portfolio-error-fetch-failed'));
        }

        allInvestments = await investmentRes.json();
        allProposals = await proposalsRes.json();
        followedProjects = await followedRes.json();

        // Force re-translation after data is ready
        if (window.translatePage) {
            window.translatePage();
        }

    } catch (error) {
        if (grid) grid.innerHTML = `<p class="text-center col-span-full text-red-500">${t('js-portfolio-error-generic')}: ${error.message}</p>`;
    }
}

function setupFilters() {
    const mainFilterButtons = document.querySelectorAll('.main-filter-btn');
    mainFilterButtons.forEach(button => {
        button.addEventListener('click', () => switchFilterType(button.dataset.filter));
    });

    const allSubFilters = document.querySelectorAll('.sub-filters-container select, .sub-filters-container input');
    allSubFilters.forEach(filter => {
        filter.addEventListener('change', applyFiltersAndRender);
        if (filter.type === 'number' || filter.type === 'text') {
            filter.addEventListener('keyup', applyFiltersAndRender);
        }
    });
}

function switchFilterType(filterType) {
    currentFilterType = filterType;

    document.querySelectorAll('.main-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filterType);
    });

    document.querySelectorAll('.sub-filter-group').forEach(group => {
        group.classList.toggle('active', group.id === `${filterType}-filters`);
    });

    applyFiltersAndRender();
}

function applyFiltersAndRender() {
    let itemsToRender = [];

    if (currentFilterType === 'investments') {
        let filtered = [...allInvestments];
        const status = document.getElementById('investmentStatusFilter').value;
        const type = document.getElementById('investmentTypeFilter').value;
        const progress = document.getElementById('investmentProgressFilter').value;

        if (status !== 'all') {
            filtered = filtered.filter(item => item.project && (status === 'funded' ? ['funded', 'completed'].includes(item.project.status) : item.project.status === status));
        }
        if (type !== 'all') {
            filtered = filtered.filter(item => item.investmentType === type);
        }
        if (progress !== 'all') {
            const [min, max] = progress.split('-').map(Number);
            filtered = filtered.filter(item => {
                const goal = item.project?.fundingGoal?.amount || 0;
                const raised = item.project?.fundingAmountRaised || 0;
                const p = goal > 0 ? (raised / goal) * 100 : 0;
                return p >= min && p <= max;
            });
        }
        itemsToRender = filtered;

    } else if (currentFilterType === 'proposals') {
        let filtered = [...allProposals];
        const status = document.getElementById('proposalStatusFilter').value;
        const type = document.getElementById('proposalTypeFilter').value;

        if (status !== 'all') {
            filtered = filtered.filter(item => item.status === status);
        }
        if (type !== 'all') {
            filtered = filtered.filter(item => item.partnershipType === type);
        }
        itemsToRender = filtered;

    } else if (currentFilterType === 'followed') {
        let filtered = [...followedProjects];
        const progress = document.getElementById('followedProgressFilter').value;

        if (progress !== 'all') {
            const [min, max] = progress.split('-').map(Number);
            filtered = filtered.filter(item => {
                const goal = item.fundingGoal?.amount || 0;
                const raised = item.fundingAmountRaised || 0;
                const p = goal > 0 ? (raised / goal) * 100 : 0;
                return p >= min && p <= max;
            });
        }
        itemsToRender = filtered;
    }

    const sortBy = document.getElementById('sortBy').value;
    const fundingSort = currentFilterType === 'investments'
        ? document.getElementById('fundingSortFilter').value
        : document.getElementById('followedFundingSortFilter').value;

    if (fundingSort) {
        itemsToRender.sort((a, b) => {
            const goalA = (currentFilterType === 'investments' ? a.project?.fundingGoal?.amount : a.fundingGoal?.amount) || 0;
            const goalB = (currentFilterType === 'investments' ? b.project?.fundingGoal?.amount : b.fundingGoal?.amount) || 0;
            return fundingSort === 'highest' ? goalB - goalA : goalA - goalB;
        });
    } else {
        itemsToRender.sort((a, b) => {
            if (sortBy === 'oldest') {
                return new Date(a.createdAt) - new Date(b.createdAt);
            }
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    }

    renderItems(itemsToRender);
}

function renderItems(items) {
    const grid = document.getElementById('projectsGrid');
    if (!grid) return;

    if (items.length === 0) {
        grid.innerHTML = `<p class="text-center text-gray-500 col-span-full py-10">${t('js-portfolio-no-items-match-filter')}</p>`;
        return;
    }

    let html = '';
    if (currentFilterType === 'investments') {
        html = items.map(createInvestmentCard).join('');
    } else if (currentFilterType === 'proposals') {
        html = items.map(createProposalCard).join('');
    } else if (currentFilterType === 'followed') {
        html = items.map(createFollowedCard).join('');
    }
    grid.innerHTML = html;
}

function createInvestmentCard(investment) {
    if (!investment.project) return '';
    const { project, amount, createdAt, investmentType, currency } = investment;
    const statusText = project.status === 'published' ? t('js-portfolio-status-funding') : t('js-portfolio-status-funded');
    const statusClass = project.status === 'published' ? 'status-published' : 'status-funded';

    return `
        <div class="investment-card" onclick="openModal('${investment._id}')">
            <div class="card-header">
                <h3 class="card-title">${escapeHTML(project.projectName)}</h3>
                <span class="card-status ${statusClass}">${statusText}</span>
            </div>
            <div class="card-body">
                <p>${escapeHTML(project.projectDescription.substring(0, 100))}...</p>
                <div class="text-xs text-gray-500 mb-2">${t('js-portfolio-investment-date')}: ${new Date(createdAt).toLocaleDateString('en-us')}</div>
            </div>
            <div class="card-footer">
                <span>${t('js-portfolio-investment-amount')}: <strong>${amount.toLocaleString()} ${currency}</strong></span>
                <span>${t('js-portfolio-investment-type')}: <strong>${investmentType === 'full' ? t('js-portfolio-type-full') : t('js-portfolio-type-reservation')}</strong></span>
            </div>
        </div>
    `;
}

function createProposalCard(proposal) {
    if (!proposal.projectId) return '';
    const { _id, status, partnershipType, proposedTerms, createdAt, projectId } = proposal;
    const statusMap = {
        pending: { text: t('js-portfolio-status-pending'), class: 'status-pending' },
        accepted: { text: t('js-portfolio-status-accepted'), class: 'status-accepted' },
        rejected: { text: t('js-portfolio-status-rejected'), class: 'status-rejected' }
    };
    const statusInfo = statusMap[status] || { text: status, class: '' };
    const typeMap = { 'strategic': t('js-portfolio-type-strategic'), 'expertise': t('js-portfolio-type-expertise'), 'advisory': t('js-portfolio-type-advisory'), 'hybrid': t('js-portfolio-type-hybrid') };

    return `
        <div class="proposal-card" onclick="openModal('${_id}')">
            <div class="card-header">
                <h3 class="card-title">${escapeHTML(projectId.projectName)}</h3>
                <span class="card-status ${statusInfo.class}">${statusInfo.text}</span>
            </div>
            <div class="card-body">
                 <p>${escapeHTML(proposedTerms.substring(0, 100))}...</p>
                 <div class="text-xs text-gray-500 mb-2">${t('js-portfolio-sent-date')}: ${new Date(createdAt).toLocaleDateString('en-us')}</div>
            </div>
            <div class="card-footer">
                 <span>${t('js-portfolio-partnership-type')}: <strong>${typeMap[partnershipType] || t('js-portfolio-type-custom')}</strong></span>
            </div>
        </div>
    `;
}

function createFollowedCard(project) {
    const { _id, projectName, projectDescription, fundingGoal, fundingAmountRaised, createdAt } = project;
    const goal = fundingGoal?.amount || 0;
    const raised = fundingAmountRaised || 0;
    const progress = goal > 0 ? Math.round((raised / goal) * 100) : 0;
    const currency = fundingGoal?.currency || 'USD';

    return `
        <div class="followed-card" onclick="openModal('${_id}')">
             <div class="card-header">
                <h3 class="card-title">${escapeHTML(projectName)}</h3>
                <span class="card-status status-published">${progress}% ${t('js-portfolio-completed')}</span>
            </div>
            <div class="card-body">
                 <p>${escapeHTML(projectDescription.substring(0, 100))}...</p>
                 <div class="text-xs text-gray-500 mb-2">${t('js-portfolio-followed-date')}: ${new Date(createdAt).toLocaleDateString('en-us')}</div>
            </div>
            <div class="card-footer">
                 <span>${t('js-portfolio-funding-goal')}: <strong>${goal.toLocaleString()} ${currency}</strong></span>
            </div>
        </div>
    `;
}

function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-us', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

window.openModal = (itemId) => {
    const modal = document.getElementById('projectModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const modalLink = document.getElementById('modalFullDetailsLink');
    if (!modal || !modalTitle || !modalContent || !modalLink) return;

    let contentHTML = '';
    let item, project;

    if (currentFilterType === 'investments') {
        item = allInvestments.find(i => i._id === itemId);
        if (!item) return;
        project = item.project;
        modalTitle.textContent = `${t('js-portfolio-modal-investment-title')}: ${project.projectName}`;
        contentHTML = `
            <div class="investment-summary-grid">
                <div class="summary-box"><div class="label">${t('js-portfolio-modal-investment-amount')}</div><div class="value text-green-600">${item.amount.toLocaleString()} ${item.currency}</div></div>
                <div class="summary-box"><div class="label">${t('js-portfolio-modal-investment-type')}</div><div class="value">${item.investmentType === 'full' ? t('js-portfolio-type-full') : t('js-portfolio-type-reservation')}</div></div>
                <div class="summary-box"><div class="label">${t('js-portfolio-modal-investment-date')}</div><div class="value text-sm">${formatDate(item.createdAt)}</div></div>
            </div>`;
        if (item.investmentType === 'reservation') {
            contentHTML += `<div class="transaction-list">
                <div class="transaction-item"><div>${t('js-portfolio-modal-paid-now')}</div><div class="amount">${(item.amountPaidNow || 0).toLocaleString()} ${item.currency}</div></div>
                <div class="transaction-item"><div>${t('js-portfolio-modal-remaining')}</div><div class="amount text-red-600">${(item.amountRemaining || 0).toLocaleString()} ${item.currency}</div></div>
            </div>`;
        }
    } else if (currentFilterType === 'proposals') {
        item = allProposals.find(p => p._id === itemId);
        if (!item) return;
        project = item.projectId;
        modalTitle.textContent = `${t('js-portfolio-modal-proposal-title')}: ${project.projectName}`;
        const typeMap = { 'strategic': t('js-portfolio-type-strategic'), 'expertise': t('js-portfolio-type-expertise'), 'advisory': t('js-portfolio-type-advisory'), 'hybrid': t('js-portfolio-type-hybrid') };
        contentHTML = `
            <div class="investment-summary-grid">
                <div class="summary-box"><div class="label">${t('js-portfolio-modal-partnership-type')}</div><div class="value">${typeMap[item.partnershipType] || t('js-portfolio-type-custom')}</div></div>
                <div class="summary-box"><div class="label">${t('js-portfolio-modal-status')}</div><div class="value">${item.status}</div></div>
            </div>
            <h4 class="text-md font-bold text-gray-700 mt-4 mb-2">${t('js-portfolio-modal-proposed-terms')}:</h4>
            <p class="p-3 bg-gray-100 rounded-lg text-sm">${item.proposedTerms}</p>`;
    } else if (currentFilterType === 'followed') {
        item = followedProjects.find(p => p._id === itemId);
        if (!item) return;
        project = item;
        modalTitle.textContent = `${t('js-portfolio-modal-project-details')}: ${project.projectName}`;
        const goal = project.fundingGoal?.amount || 0;
        const raised = project.fundingAmountRaised || 0;
        const progress = goal > 0 ? Math.round((raised / goal) * 100) : 0;
        contentHTML = `
             <div class="investment-summary-grid">
                <div class="summary-box"><div class="label">${t('js-portfolio-modal-funding-goal')}</div><div class="value">${goal.toLocaleString()} ${project.fundingGoal?.currency}</div></div>
                <div class="summary-box"><div class="label">${t('js-portfolio-modal-funding-raised')}</div><div class="value text-green-600">${raised.toLocaleString()} ${project.fundingGoal?.currency}</div></div>
                <div class="summary-box"><div class="label">${t('js-portfolio-modal-progress')}</div><div class="value">${progress}%</div></div>
            </div>`;
    }

    modalContent.innerHTML = contentHTML;
    modalLink.href = `project-view.html?id=${project._id}`;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.closeModal = () => {
    const modal = document.getElementById('projectModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match]));
}