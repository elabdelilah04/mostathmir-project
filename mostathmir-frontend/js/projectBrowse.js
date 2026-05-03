// const API_BASE_URL = 'https://mostathmir-api.onrender.com';

let allProjectsData = [];
const projectsGrid = document.getElementById('projectsGrid');
const token = localStorage.getItem('user_token');

// const categoryTranslationKeys = {
//     "تقنية": "addproject-category-tech",
//     "تجارة إلكترونية": "addproject-category-ecommerce",
//     "تطبيقات جوال": "addproject-category-mobile-apps",
//     "ذكاء اصطناعي": "addproject-category-ai",
//     "تقنيات مالية": "addproject-category-fintech",
//     "صحة": "addproject-category-health",
//     "تعليم": "addproject-category-education",
//     "أخرى": "addproject-category-other"
// };
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
        renderBrowsePlaceholder();
        applyBrowseLock();
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

function getAdvancedFilterValues() {
    return {
        fundingRanges: [
            document.getElementById('range1')?.checked ? 'low' : null,
            document.getElementById('range2')?.checked ? 'medium' : null,
            document.getElementById('range3')?.checked ? 'high' : null
        ].filter(Boolean),

        statuses: [
            document.getElementById('status1')?.checked ? 'active_invested' : null,
            document.getElementById('status2')?.checked ? 'zero_funding' : null,
            document.getElementById('status3')?.checked ? 'completed_funding' : null
        ].filter(Boolean),

        progressRanges: [
            document.getElementById('progress1')?.checked ? '0-25' : null,
            document.getElementById('progress2')?.checked ? '26-50' : null,
            document.getElementById('progress3')?.checked ? '51-75' : null,
            document.getElementById('progress4')?.checked ? '76-100' : null
        ].filter(Boolean)
    };
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
    // جلب المشاريع عند التحميل
    fetchProjects();

    // 1. الاستماع للتغيير في القوائم المنسدلة الجديدة
    const categoryFilter = document.getElementById('categoryFilter');
    const sortByFilter = document.getElementById('sortBy');
    const searchInput = document.getElementById('searchInput');

    if (categoryFilter) categoryFilter.addEventListener('change', applyFiltersAndSearch);
    if (sortByFilter) sortByFilter.addEventListener('change', applyFiltersAndSearch);
    if (searchInput) searchInput.addEventListener('input', applyFiltersAndSearch);

    // 2. إغلاق المودال عند النقر خارجه
    document.addEventListener('click', (e) => {
        const modal = document.getElementById('advancedFilterModal');
        if (e.target === modal) {
            window.closeAdvancedFilter();
        }
    });
});

// تحديث دالة الفلترة لتقرأ من القوائم المنسدلة
function applyFiltersAndSearch() {
    let filtered = [...allProjectsData];

    // 1. البحث النصي
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(p =>
            (p.projectName && p.projectName.toLowerCase().includes(searchTerm)) ||
            (p.projectDescription && p.projectDescription.toLowerCase().includes(searchTerm))
        );
    }

    // 2. فلتر التصنيف المنسدل
    const categoryValue = document.getElementById('categoryFilter')?.value;
    if (categoryValue && categoryValue !== 'all') {
        filtered = filtered.filter(p =>
            (p.projectCategory || '').toLowerCase() === categoryValue.toLowerCase()
        );
    }

    // 3. تطبيق الفلترة المتقدمة
    const advanced = getAdvancedFilterValues();

    filtered = filtered.filter(project => {
        const goal = project.fundingGoal?.amount || 0;
        const raised = project.fundingAmountRaised || 0;
        const progress = goal > 0 ? (raised / goal) * 100 : 0;
        const status = project.status; // مثل 'published', 'funded'

        // أ- فحص نطاق التمويل
        if (advanced.fundingRanges.length > 0) {
            let match = false;
            if (advanced.fundingRanges.includes('low') && goal < 100000) match = true;
            if (advanced.fundingRanges.includes('medium') && goal >= 100000 && goal <= 200000) match = true;
            if (advanced.fundingRanges.includes('high') && goal > 200000) match = true;
            if (!match) return false; // إذا لم يطابق النطاق المختار، استبعد المشروع
        }

        // ب- فحص حالة المشروع (التفرقة الدقيقة بين نشط ويبحث عن تمويل)
        if (advanced.statuses.length > 0) {
            let match = false;

            // 1. "نشط" - قيد التمويل (تم نشر المشروع وحصل فعلاً على استثمارات > 0 لكن لم يكتمل بعد)
            if (advanced.statuses.includes('active_invested') &&
                status === 'published' && raised > 0 && raised < goal) {
                match = true;
            }

            // 2. "يبحث عن تمويل" - (تم نشر المشروع لكنه لا يزال عند 0 تمويل)
            if (advanced.statuses.includes('zero_funding') &&
                status === 'published' && (raised === 0 || !raised)) {
                match = true;
            }

            // 3. "مكتمل التمويل" - (وصل للهدف أو تم إغلاقه كمكتمل)
            if (advanced.statuses.includes('completed_funding') &&
                (status === 'funded' || status === 'completed' || raised >= goal)) {
                match = true;
            }

            if (!match) return false;
        }

        // ج- فحص نسبة الإنجاز
        if (advanced.progressRanges.length > 0) {
            let match = false;
            if (advanced.progressRanges.includes('0-25') && progress <= 25) match = true;
            if (advanced.progressRanges.includes('26-50') && progress > 25 && progress <= 50) match = true;
            if (advanced.progressRanges.includes('51-75') && progress > 50 && progress <= 75) match = true;
            if (advanced.progressRanges.includes('76-100') && progress > 75) match = true;

            if (!match) return false;
        }

        return true; // إذا اجتاز كل الفلاتر
    });

    // 4. الترتيب النهائي
    const sortBy = document.getElementById('sortBy')?.value;
    if (sortBy) {
        filtered.sort((a, b) => {
            const goalA = a.fundingGoal?.amount || 0;
            const goalB = b.fundingGoal?.amount || 0;
            const dateA = new Date(a.createdAt);
            const dateB = new Date(b.createdAt);
            const viewsA = a.views || 0;
            const viewsB = b.views || 0;

            switch (sortBy) {
                case 'newest': return dateB - dateA;
                case 'oldest': return dateA - dateB;
                case 'funding-high': return goalB - goalA;
                case 'funding-low': return goalA - goalB;
                case 'views-high': return viewsB - viewsA;
                default: return 0;
            }
        });
    }

    renderProjects(filtered);
}

function getAvatarColor(initial) {
    const colors = ['bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600', 'bg-red-600', 'bg-indigo-600'];
    const charCode = initial.charCodeAt(0);
    return colors[charCode % colors.length];
}

window.openProjectDetails = function (project) {
    if (!project) return;
    window.currentProject = project;

    // 1. تعبئة بيانات المشروع الأساسية
    document.getElementById('modalTitle').textContent = project.projectName || t('js-modal-untitled-project');
    const categoryKey = categoryTranslationKeys[project.projectCategory] || 'js-modal-category-general';
    document.getElementById('modalCategory').textContent = t(categoryKey);
    document.getElementById('modalDescription').textContent = (project.projectDescription || '').substring(0, 200) + '...';

    const goal = project.fundingGoal ? project.fundingGoal.amount || 0 : 0;
    const raised = project.fundingAmountRaised || 0;
    const progress = goal > 0 ? Math.round((raised / goal) * 100) : 0;
    const currency = project.fundingGoal ? project.fundingGoal.currency : 'USD';

    document.getElementById('modalTargetAmount').textContent = `${goal.toLocaleString()} ${currency}`;
    document.getElementById('modalRaisedAmount').textContent = `${raised.toLocaleString()} ${currency} ${t('js-modal-raised')}`;
    document.getElementById('modalProgress').textContent = `${progress}% ${t('js-modal-completed')}`;
    document.getElementById('modalProgressBar').style.width = `${progress}%`;

    // 2. تعبئة بيانات صاحب المشروع
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

    // 3. إعداد أزرار الإجراءات (التفاصيل والاستثمار)
    const fullDetailsButton = document.getElementById('btnOpenFullDetails');
    if (fullDetailsButton) {
        fullDetailsButton.href = `project-view.html?id=${project._id}`;
    }

    // --- التعديل الجديد: إخفاء زر الاستثمار لحسابات أصحاب الأفكار ---
    const investButton = document.getElementById('btnInvestInProject');
    const currentUser = JSON.parse(localStorage.getItem('user_data'));

    if (investButton) {
        // التحقق مما إذا كان المستخدم مسجل الدخول ونوع حسابه "صاحب فكرة"
        if (currentUser && currentUser.accountType === 'ideaHolder') {
            investButton.style.display = 'none'; // إخفاء الزر
        } else {
            investButton.style.display = 'block'; // إظهاره للمستثمرين والزوار
            investButton.href = `invest.html?id=${project._id}`;
        }
    }

    // إظهار المودال
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

function renderBrowsePlaceholder() {
    projectsGrid.innerHTML = Array(6).fill(0).map((_, i) => `
        <div class="project-card p-6">

            <div class="flex justify-between items-start mb-4">
                <div class="category-tag bg-indigo-100 text-indigo-600">تقنية</div>
                <div class="status-badge status-active">نشط</div>
            </div>

            <div class="fake-text-lg mb-3"></div>
            <div class="fake-text-sm mb-4"></div>

            <div class="mb-4">
                <div class="flex justify-between mb-2">
                    <div class="fake-text-xs w-20"></div>
                    <div class="fake-text-xs w-16"></div>
                </div>

                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 w-1/2"></div>
                </div>

                <div class="flex justify-between mt-2">
                    <div class="fake-text-xs w-12"></div>
                    <div class="fake-text-xs w-16"></div>
                </div>
            </div>

            <div class="flex justify-between items-center">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600"></div>
                    <div class="fake-text-xs w-16"></div>
                </div>
                <div class="fake-text-xs w-10"></div>
            </div>

        </div>
    `).join('');
}

function applyBrowseLock() {
    const grid = document.getElementById('projectsGrid');
    if (!grid) return;

    if (grid.parentElement.querySelector('.browse-overlay')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'browse-wrapper';

    grid.parentNode.insertBefore(wrapper, grid);
    wrapper.appendChild(grid);
    grid.classList.add('blurred');
    const overlay = document.createElement('div');
    overlay.className = 'browse-overlay';

    overlay.innerHTML = `
        <div class="overlay-content">
            <h3 class="text-xl font-bold mb-2">${t('browse-overlay-title')}   </h3>
            <p class="text-gray-500 mb-4"> ${t('browse-overlay-desc')}  </p>
            <a href="login.html" class="">${t('browse-overlay-btn')}</a>
        </div>
    `;

    wrapper.appendChild(overlay);
}