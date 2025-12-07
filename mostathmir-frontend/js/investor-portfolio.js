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
    if (grid) grid.innerHTML = `<div class="col-span-full text-center py-10"><i class="fas fa-circle-notch fa-spin text-blue-600 text-2xl"></i><p class="mt-2 text-gray-500">${t('js-portfolio-loading-portfolio')}</p></div>`;

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

        const groupedInvestments = {};

        filtered.forEach(inv => {
            if (!inv.project) return;
            const projectId = inv.project._id;

            if (!groupedInvestments[projectId]) {
                groupedInvestments[projectId] = {
                    project: inv.project,
                    totalAmount: 0,
                    totalEquity: 0,
                    currency: inv.currency,
                    transactionsCount: 0,
                    lastInvestmentDate: inv.createdAt
                };
            }

            let equity = inv.equityObtained;
            if (equity === undefined || equity === null) {
                const goal = inv.project.fundingGoal?.amount || 1;
                const totalOffered = inv.project.equityOffered || 0;
                equity = (inv.amount / goal) * totalOffered;
            }

            groupedInvestments[projectId].totalAmount += inv.amount;
            groupedInvestments[projectId].totalEquity += equity;
            groupedInvestments[projectId].transactionsCount += 1;

            if (new Date(inv.createdAt) > new Date(groupedInvestments[projectId].lastInvestmentDate)) {
                groupedInvestments[projectId].lastInvestmentDate = inv.createdAt;
            }
        });

        itemsToRender = Object.values(groupedInvestments);

    } else if (currentFilterType === 'proposals') {
        let filtered = [...allProposals];
        const status = document.getElementById('proposalStatusFilter').value;
        const type = document.getElementById('proposalTypeFilter').value;

        if (status !== 'all') filtered = filtered.filter(item => item.status === status);
        if (type !== 'all') filtered = filtered.filter(item => item.partnershipType === type);
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

    itemsToRender.sort((a, b) => {
        if (fundingSort) {
            const valA = currentFilterType === 'investments' ? a.totalAmount : (a.fundingGoal?.amount || 0);
            const valB = currentFilterType === 'investments' ? b.totalAmount : (b.fundingGoal?.amount || 0);
            return fundingSort === 'highest' ? valB - valA : valA - valB;
        }

        const dateA = currentFilterType === 'investments' ? a.lastInvestmentDate : a.createdAt;
        const dateB = currentFilterType === 'investments' ? b.lastInvestmentDate : b.createdAt;

        if (sortBy === 'oldest') {
            return new Date(dateA) - new Date(dateB);
        }
        return new Date(dateB) - new Date(dateA);
    });

    renderItems(itemsToRender);
}

function renderItems(items) {
    const grid = document.getElementById('projectsGrid');
    if (!grid) return;

    if (items.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <i class="fas fa-folder-open text-4xl text-gray-300 mb-3"></i>
            <p class="text-gray-500">${t('js-portfolio-no-items-match-filter')}</p>
        </div>`;
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

function createInvestmentCard(groupedItem) {
    if (!groupedItem.project) return '';

    const { project, totalAmount, totalEquity, transactionsCount, currency, lastInvestmentDate } = groupedItem;
    const statusText = project.status === 'published' ? t('js-portfolio-status-funding') : t('js-portfolio-status-funded');
    const statusClass = project.status === 'published' ? 'status-published' : 'status-funded';
    // التحقق من حالة الظهور
    const isVisible = investment.isVisible !== false; // الافتراضي true
    const eyeIconClass = isVisible ? 'fa-eye' : 'fa-eye-slash';
    const visibilityTitle = isVisible ? 'مرئي للعامة' : 'مخفي من الملف العام';
    const visibilityColor = isVisible ? 'text-gray-500 hover:text-blue-600' : 'text-red-500 hover:text-red-700';

    return `
        <div class="investment-card" onclick="openModal('${project._id}')">

            <button onclick="toggleVisibility('${investment._id}', event)" 
                    class="absolute top-4 left-4 z-10 p-2 bg-white rounded-full shadow-sm border border-gray-200 transition-colors ${visibilityColor}"
                    title="${visibilityTitle}">
                <i class="fas ${eyeIconClass}"></i>
            </button>

            <div class="card-header">
                <h3 class="card-title line-clamp-1" title="${escapeHTML(project.projectName)}">${escapeHTML(project.projectName)}</h3>
                <span class="card-status ${statusClass}">${statusText}</span>
            </div>
            <div class="card-body">
                <p class="line-clamp-2 h-10 mb-4">${escapeHTML(project.projectDescription)}</p>
                
                <div class="flex justify-between items-center text-xs text-gray-500 mb-2 bg-gray-50 p-2 rounded">
                    <span>${t('js-portfolio-investment-date')}: ${new Date(lastInvestmentDate).toLocaleDateString('en-us')}</span>
                    <span class="font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">${transactionsCount} ${t('js-portfolio-card-transactions')}</span>
                </div>

                <div class="flex justify-between items-center mt-3 pt-3 border-t border-gray-100 border-dashed">
                    <div class="text-center">
                        <span class="text-xs text-gray-400 block">${t('js-portfolio-your-investment')}</span>
                        <span class="text-lg font-bold text-green-700">${totalAmount.toLocaleString()} <span class="text-xs">${currency}</span></span>
                    </div>
                    <div class="text-center pl-4 border-l border-gray-100">
                        <span class="text-xs text-gray-400 block">${t('js-portfolio-card-equity-share')}</span>
                        <span class="text-lg font-bold text-purple-700">${totalEquity.toFixed(2)}%</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}
// دالة لتبديل حالة الظهور
window.toggleVisibility = async (investmentId, event) => {
    // منع فتح المودال عند الضغط على الزر
    event.stopPropagation();

    const token = localStorage.getItem('user_token');
    const button = event.currentTarget;
    const icon = button.querySelector('i');

    try {
        // تغيير الأيقونة مؤقتاً لتدل على التحميل
        icon.className = 'fas fa-spinner fa-spin';

        const response = await fetch(`${API_BASE_URL}/api/investments/${investmentId}/visibility`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('فشل تحديث الحالة');

        const data = await response.json();

        // تحديث الأيقونة بناءً على الحالة الجديدة
        if (data.isVisible) {
            icon.className = 'fas fa-eye';
            button.className = button.className.replace('text-red-500', 'text-gray-500').replace('hover:text-red-700', 'hover:text-blue-600');
            button.title = 'مرئي للعامة';
            // showInlineMessage('تم إظهار المشروع في ملفك العام', 'success'); // دالة اختيارية
        } else {
            icon.className = 'fas fa-eye-slash';
            button.className = button.className.replace('text-gray-500', 'text-red-500').replace('hover:text-blue-600', 'hover:text-red-700');
            button.title = 'مخفي من الملف العام';
            // showInlineMessage('تم إخفاء المشروع من ملفك العام', 'success');
        }

    } catch (error) {
        console.error(error);
        alert('حدث خطأ أثناء تحديث الحالة');
        // إعادة الأيقونة لحالتها السابقة في حال الخطأ
        // (يمكن تحسين هذا بإعادة تحميل البيانات)
    }
};

function createProposalCard(proposal) {
    if (!proposal.projectId) return '';
    const { _id, status, partnershipType, proposedTerms, createdAt, projectId } = proposal;

    const statusMap = {
        pending: { text: t('js-portfolio-status-pending'), class: 'status-pending' },
        accepted: { text: t('js-portfolio-status-accepted'), class: 'status-accepted' },
        rejected: { text: t('js-portfolio-status-rejected'), class: 'status-rejected' }
    };
    const statusInfo = statusMap[status] || { text: status, class: '' };
    const typeMap = {
        'strategic': t('js-portfolio-type-strategic'),
        'expertise': t('js-portfolio-type-expertise'),
        'advisory': t('js-portfolio-type-advisory'),
        'hybrid': t('js-portfolio-type-hybrid')
    };

    return `
        <div class="proposal-card" onclick="openModal('${_id}')">
            <div class="card-header">
                <h3 class="card-title line-clamp-1">${escapeHTML(projectId.projectName)}</h3>
                <span class="card-status ${statusInfo.class}">${statusInfo.text}</span>
            </div>
            <div class="card-body">
                 <p class="line-clamp-3 h-16">${escapeHTML(proposedTerms)}</p>
                 <div class="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-50">${t('js-portfolio-sent-date')}: ${new Date(createdAt).toLocaleDateString('en-us')}</div>
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
                <h3 class="card-title line-clamp-1">${escapeHTML(projectName)}</h3>
                <span class="card-status status-published">${progress}% ${t('js-portfolio-completed')}</span>
            </div>
            <div class="card-body">
                 <p class="line-clamp-2 h-10">${escapeHTML(projectDescription)}</p>
                 <div class="text-xs text-gray-500 mt-2">${t('js-portfolio-followed-date')}: ${new Date(createdAt).toLocaleDateString('en-us')}</div>
            </div>
            <div class="card-footer">
                 <span>${t('js-portfolio-funding-goal')}: <strong>${goal.toLocaleString()} ${currency}</strong></span>
            </div>
        </div>
    `;
}

function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-us', { year: 'numeric', month: 'long', day: 'numeric' });
}

window.openModal = (itemId) => {
    const modal = document.getElementById('projectModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const modalLink = document.getElementById('modalFullDetailsLink');
    if (!modal || !modalTitle || !modalContent || !modalLink) return;

    let contentHTML = '';

    // ============================================================
    // CASE 1: INVESTMENTS (استثمارات)
    // ============================================================
    if (currentFilterType === 'investments') {
        const projectInvestments = allInvestments.filter(inv => inv.project && inv.project._id === itemId);

        if (projectInvestments.length === 0) return;

        const project = projectInvestments[0].project;

        const projectGoal = project.fundingGoal?.amount || 0;
        const projectRaised = project.fundingAmountRaised || 0;
        const projectEquityOffered = project.equityOffered || 0;
        const currency = projectInvestments[0].currency;

        const projectProgress = projectGoal > 0 ? Math.round((projectRaised / projectGoal) * 100) : 0;

        const totalInvested = projectInvestments.reduce((sum, inv) => sum + inv.amount, 0);

        let totalEquity = 0;
        projectInvestments.forEach(inv => {
            let eq = inv.equityObtained;
            if (eq === undefined || eq === null) {
                const goal = project.fundingGoal?.amount || 1;
                const totalOffered = project.equityOffered || 0;
                eq = (inv.amount / goal) * totalOffered;
            }
            totalEquity += eq;
        });

        modalTitle.textContent = `${t('js-portfolio-modal-investment-title')}: ${project.projectName}`;

        const rowsHTML = projectInvestments.map(inv => {
            const typeText = inv.investmentType === 'full' ? t('js-portfolio-type-full') : t('js-portfolio-type-reservation');

            let rowEquity = inv.equityObtained;
            if (rowEquity === undefined || rowEquity === null) {
                const goal = project.fundingGoal?.amount || 1;
                const totalOffered = project.equityOffered || 0;
                rowEquity = (inv.amount / goal) * totalOffered;
            }

            return `
                <tr class="border-b hover:bg-gray-50 transition-colors">
                    <td class="py-3 font-bold text-gray-800">${inv.amount.toLocaleString()} <span class="text-xs text-gray-500">${inv.currency}</span></td>
                    <td class="py-3 text-purple-600 font-semibold">${rowEquity.toFixed(2)}%</td>
                    <td class="py-3 text-blue-600 text-sm"><span class="bg-blue-50 px-2 py-1 rounded">${typeText}</span></td>
                    <td class="py-3 text-gray-500 text-sm">${formatDate(inv.createdAt)}</td>
                </tr>
            `;
        }).join('');

        contentHTML = `
            <div class="bg-gray-50 rounded-lg p-3 mb-5 border border-gray-100">
                <div class="grid grid-cols-4 gap-2 text-center text-xs divide-x divide-x-reverse divide-gray-200">
                    <div>
                        <span class="block text-gray-400 mb-1">${t('js-portfolio-project-context-goal')}</span>
                        <span class="font-bold text-gray-700">${projectGoal.toLocaleString()} <span class="text-[9px]">${currency}</span></span>
                    </div>
                    <div>
                        <span class="block text-gray-400 mb-1">${t('js-portfolio-project-context-raised')}</span>
                        <span class="font-bold text-green-600">${projectRaised.toLocaleString()} <span class="text-[9px]">${currency}</span></span>
                    </div>
                    <div>
                        <span class="block text-gray-400 mb-1">${t('project-view-equity-label')}</span>
                        <span class="font-bold text-purple-600">${projectEquityOffered}%</span>
                    </div>
                    <!-- العمود الجديد: نسبة التقدم -->
                    <div>
                        <span class="block text-gray-400 mb-1">${t('js-portfolio-project-context-progress')}</span>
                        <span class="font-bold text-blue-600">${projectProgress}%</span>
                    </div>
                </div>
            </div>

            <div class="overflow-x-auto rounded-lg border border-gray-200">
                <table class="w-full text-right" style="direction: rtl;">
                    <thead class="bg-gray-50">
                        <tr class="text-gray-600 text-sm">
                            <th class="py-3 px-4">${t('js-portfolio-table-header-amount')}</th>
                            <th class="py-3 px-4">${t('js-portfolio-table-header-equity')}</th>
                            <th class="py-3 px-4">${t('js-portfolio-table-header-type')}</th>
                            <th class="py-3 px-4">${t('js-portfolio-table-header-date')}</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        ${rowsHTML}
                    </tbody>
                    <tfoot class="bg-green-50 border-t-2 border-green-100">
                        <tr>
                            <td class="py-4 px-4 font-bold text-green-800">${totalInvested.toLocaleString()} ${currency}</td>
                            <td class="py-4 px-4 font-bold text-purple-800">${totalEquity.toFixed(2)}%</td>
                            <td colspan="2" class="py-4 px-4 font-bold text-gray-600 text-left pl-6">${t('js-portfolio-modal-total-portfolio')}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div class="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800 border border-blue-100 flex items-center gap-2">
                <i class="fas fa-info-circle"></i>
                <span>يتم تحديث نسب الملكية والعوائد بناءً على أداء المشروع ومراحل التمويل.</span>
            </div>
        `;
        modalLink.href = `project-view.html?id=${project._id}`;

        // ============================================================
        // CASE 2: PROPOSALS (المقترحات)
        // ============================================================
    } else if (currentFilterType === 'proposals') {
        const item = allProposals.find(p => p._id === itemId);
        if (!item) return;
        const project = item.projectId;
        modalTitle.textContent = `${t('js-portfolio-modal-proposal-title')}: ${project.projectName}`;

        const typeMap = { 'strategic': t('js-portfolio-type-strategic'), 'expertise': t('js-portfolio-type-expertise'), 'advisory': t('js-portfolio-type-advisory'), 'hybrid': t('js-portfolio-type-hybrid') };

        let responseBg = 'bg-gray-50';
        let responseBorder = 'border-gray-200';
        if (item.status === 'accepted') { responseBg = 'bg-green-50'; responseBorder = 'border-green-200'; }
        else if (item.status === 'rejected') { responseBg = 'bg-red-50'; responseBorder = 'border-red-200'; }

        contentHTML = `
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div class="summary-box bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div class="label text-xs text-gray-500 mb-1">${t('js-portfolio-modal-partnership-type')}</div>
                    <div class="value font-semibold text-purple-700">${typeMap[item.partnershipType] || t('js-portfolio-type-custom')}</div>
                </div>
                <div class="summary-box bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div class="label text-xs text-gray-500 mb-1">${t('js-portfolio-modal-status')}</div>
                    <div class="value font-semibold">${item.status}</div>
                </div>
            </div>

            <!-- الشروط المقترحة -->
            <h4 class="text-sm font-bold text-gray-700 mt-4 mb-2 flex items-center gap-2">
                <i class="fas fa-file-contract"></i> ${t('js-portfolio-modal-proposed-terms')}:
            </h4>
            <div class="p-4 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 leading-relaxed shadow-sm mb-4">
                ${escapeHTML(item.proposedTerms)}
            </div>

            <!-- --- التعديل 3: عرض الرد إذا وجد --- -->
            ${item.responseMessage ? `
                <div class="mt-6 pt-4 border-t border-gray-100">
                    <h4 class="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                        <i class="fas fa-reply"></i> ${t('js-portfolio-modal-response-message')}:
                    </h4>
                    <div class="p-4 ${responseBg} border ${responseBorder} rounded-lg text-sm text-gray-800 leading-relaxed relative">
                        <i class="fas fa-quote-right absolute top-2 left-2 text-gray-300 opacity-50 text-xl"></i>
                        ${escapeHTML(item.responseMessage)}
                    </div>
                </div>
            ` : ''}
            `;

        modalLink.href = `project-view.html?id=${project._id}`;

        // ============================================================
        // CASE 3: FOLLOWED PROJECTS (المشاريع المتابعة)
        // ============================================================
    } else if (currentFilterType === 'followed') {
        const item = followedProjects.find(p => p._id === itemId);
        if (!item) return;
        modalTitle.textContent = `${t('js-portfolio-modal-project-details')}: ${item.projectName}`;
        const goal = item.fundingGoal?.amount || 0;
        const raised = item.fundingAmountRaised || 0;
        const progress = goal > 0 ? Math.round((raised / goal) * 100) : 0;

        contentHTML = `
             <div class="investment-summary-grid grid grid-cols-3 gap-3 text-center">
                <div class="summary-box bg-gray-50 p-3 rounded-lg border">
                    <div class="label text-xs text-gray-500">${t('js-portfolio-modal-funding-goal')}</div>
                    <div class="value font-bold text-gray-800">${goal.toLocaleString()} <span class="text-xs">${item.fundingGoal?.currency}</span></div>
                </div>
                <div class="summary-box bg-green-50 p-3 rounded-lg border border-green-100">
                    <div class="label text-xs text-green-600">${t('js-portfolio-modal-funding-raised')}</div>
                    <div class="value font-bold text-green-700">${raised.toLocaleString()} <span class="text-xs">${item.fundingGoal?.currency}</span></div>
                </div>
                <div class="summary-box bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <div class="label text-xs text-blue-600">${t('js-portfolio-modal-progress')}</div>
                    <div class="value font-bold text-blue-700">${progress}%</div>
                </div>
            </div>
            <div class="mt-4">
                <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div class="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-1000" style="width: ${progress}%"></div>
                </div>
            </div>`;

        modalLink.href = `project-view.html?id=${item._id}`;
    }

    modalContent.innerHTML = contentHTML;
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