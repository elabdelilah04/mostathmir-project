document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE_URL = 'https://mostathmir-api.onrender.com';
    const token = localStorage.getItem('user_token');
    if (!token) {
        alert(t('js-investor-profile-login-required'));
        window.location.href = 'login.html';
        return;
    }

    let allInvestments = [];
    let followedProjects = [];
    let allProposals = [];
    let currentUserData = null;
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
    const profileTabButton = document.getElementById('profileTabButton');
    const dashboardTabButton = document.getElementById('dashboardTabButton');
    const profileTabView = document.getElementById('profileTabView');
    const dashboardTabView = document.getElementById('dashboardTabView');

    const proposalModal = document.getElementById('proposalDetailsModal');
    const closeProposalModalBtn = document.getElementById('closeProposalModalBtn');

    const followModal = document.getElementById('followModal');
    const closeFollowModalBtn = document.getElementById('closeFollowModalBtn');
    const followingStatBtn = document.getElementById('following-stat-button');
    const followingTabBtn = document.getElementById('followingTabBtn');
    const followersTabBtn = document.getElementById('followersTabBtn');
    const followingContent = document.getElementById('followingContent');
    const followersContent = document.getElementById('followersContent');

    const partnersModal = document.getElementById('partnersModal');
    const closePartnersModalBtn = document.getElementById('closePartnersModalBtn');
    const partnersStatBtn = document.getElementById('partners-stat-button');

    function switchTab(tabToShow) {
        if (tabToShow === 'profile') {
            if (profileTabView) profileTabView.style.display = 'block';
            if (dashboardTabView) dashboardTabView.style.display = 'none';
            if (profileTabButton) profileTabButton.classList.add('active');
            if (dashboardTabButton) dashboardTabButton.classList.remove('active');
        } else {
            if (profileTabView) profileTabView.style.display = 'none';
            if (dashboardTabView) dashboardTabView.style.display = 'block';
            if (profileTabButton) profileTabButton.classList.remove('active');
            if (dashboardTabButton) dashboardTabButton.classList.add('active');
        }
    }

    function populateSidebarStats(stats, investments, user) {
        const totalInvestmentEl = document.getElementById('stat-total-investment-amount');
        const avgReturnEl = document.getElementById('stat-avg-return');
        const partnersEl = document.getElementById('stat-partners-count');
        const followingEl = document.getElementById('stat-following-count');

        if (totalInvestmentEl) {
            const amount = stats.totalInvestment || 0;
            if (amount >= 1000000) {
                totalInvestmentEl.textContent = `${(amount / 1000000).toFixed(1)}M`;
            } else if (amount >= 1000) {
                totalInvestmentEl.textContent = `${(amount / 1000).toFixed(0)}K`;
            } else {
                totalInvestmentEl.textContent = amount.toLocaleString();
            }
            totalInvestmentEl.textContent += ` ${stats.investmentCurrency || 'USD'}`;
        }

        if (avgReturnEl) {
            avgReturnEl.textContent = `${(stats.averageExpectedReturn || 0).toFixed(1)}%`;
        }

        if (partnersEl && investments) {
            const uniquePartners = new Set(investments.map(inv => inv.project.owner._id));
            partnersEl.textContent = uniquePartners.size;
        }

        if (followingEl && user && user.following) {
            followingEl.textContent = user.following.length;
        }
    }

    function openFollowModal(followers, following) {
        if (!followModal) return;
        renderFollowList(following, 'followingContent', 'js-investor-profile-not-following-anyone');
        renderFollowList(followers, 'followersContent', 'js-investor-profile-no-followers');
        switchFollowTab('following');
        followModal.classList.remove('hidden');
    }

    function closeFollowModal() {
        if (followModal) followModal.classList.add('hidden');
    }

    function switchFollowTab(tabName) {
        if (tabName === 'following') {
            followingTabBtn.classList.add('active');
            followersTabBtn.classList.remove('active');
            followingContent.classList.remove('hidden');
            followersContent.classList.add('hidden');
        } else {
            followingTabBtn.classList.remove('active');
            followersTabBtn.classList.add('active');
            followingContent.classList.add('hidden');
            followersContent.classList.remove('hidden');
        }
    }

    function renderFollowList(userList, containerId, emptyMessageKey) {
        const container = document.getElementById(containerId);
        if (!container) return;
        if (!userList || userList.length === 0) {
            container.innerHTML = `<p class="text-center text-gray-500 py-4">${t(emptyMessageKey)}</p>`;
            return;
        }
        container.innerHTML = userList.map(user => createFollowerCardHTML(user)).join('');
    }

    function openPartnersModal(investments) {
        if (!partnersModal) return;
        const partnersBody = document.getElementById('partnersModalBody');
        if (!partnersBody) return;

        const uniquePartnersMap = new Map();
        investments.forEach(inv => {
            if (inv.project && inv.project.owner) {
                uniquePartnersMap.set(inv.project.owner._id, inv.project.owner);
            }
        });
        const uniquePartners = Array.from(uniquePartnersMap.values());

        if (uniquePartners.length === 0) {
            partnersBody.innerHTML = `<p class="text-center text-gray-500 py-4">${t('js-investor-profile-no-investments-yet')}</p>`;
        } else {
            partnersBody.innerHTML = uniquePartners.map(user => createFollowerCardHTML(user)).join('');
        }

        partnersModal.classList.remove('hidden');
    }

    function closePartnersModal() {
        if (partnersModal) partnersModal.classList.add('hidden');
    }

    function createFollowerCardHTML(user) {
        let avatarHTML = '';
        if (user.profilePicture && user.profilePicture !== 'default-avatar.png' && user.profilePicture.startsWith('http')) {
            avatarHTML = `<div class="follower-avatar"><img src="${user.profilePicture}" alt="${user.fullName}"></div>`;
        } else {
            const initial = user.fullName ? user.fullName.charAt(0).toUpperCase() : '?';
            const colors = ['bg-blue-600', 'bg-green-600', 'bg-purple-600'];
            const colorClass = colors[user.fullName.charCodeAt(0) % colors.length];
            avatarHTML = `<div class="follower-avatar ${colorClass}">${initial}</div>`;
        }
        const accountType = user.accountType === 'investor' ? t('js-investor-profile-role-investor') : t('js-investor-profile-role-ideaholder');
        const profileTitle = user.profileTitle || accountType;
        return `
            <a href="public-profile.html?id=${user._id}" target="_blank" class="follow-list-card">
                <div class="follower-info">
                    <h4 class="follower-name">${escapeHTML(user.fullName)}</h4>
                    <p class="follower-title">${escapeHTML(profileTitle)}</p>
                </div>
                ${avatarHTML}
            </a>
        `;
    }

    async function fetchAndPopulateData() {
        try {
            const [profileRes, investmentsRes, followedRes, proposalsRes, statsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/users/profile`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/api/users/portfolio/investments`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/api/users/portfolio/followed`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/api/users/portfolio/proposals`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/api/users/portfolio/stats`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            if (!profileRes.ok || !investmentsRes.ok || !followedRes.ok || !proposalsRes.ok || !statsRes.ok) {
                throw new Error(t('js-investor-profile-error-fetch-failed'));
            }
            const user = await profileRes.json();
            currentUserData = user;
            allInvestments = await investmentsRes.json();
            followedProjects = await followedRes.json();
            allProposals = await proposalsRes.json();
            const stats = await statsRes.json();
            populateSidebarStats(stats, allInvestments, user);
            populateProfileView(user, API_BASE_URL);
            initializeDashboard(stats);

            if (window.translatePage) window.translatePage();

        } catch (error) {
            console.error("Error fetching data:", error);
            alert(error.message);
        }
    }

    function populateProfileView(user, baseUrl) {
        const avatarContainer = document.getElementById('avatarContainer');
        if (avatarContainer) {
            if (user.profilePicture && user.profilePicture !== 'default-avatar.png' && user.profilePicture.startsWith('http')) {
                avatarContainer.innerHTML = `<img src="${user.profilePicture}" alt="${user.fullName}" class="w-full h-full object-cover rounded-full">`;
            } else {
                avatarContainer.textContent = user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U';
            }
        }
        document.getElementById('fullName').textContent = user.fullName || t('js-investor-profile-username-placeholder');
        document.getElementById('profileTitle').textContent = user.profileTitle || t('js-investor-profile-add-title');
        document.getElementById('location').textContent = user.location || t('js-investor-profile-location-not-set');
        document.getElementById('email').textContent = user.email || '';
        document.getElementById('phone').textContent = user.phone || t('js-investor-profile-add-phone');
        const socialLinksContainer = document.getElementById('socialLinksContainer');
        if (socialLinksContainer) {
            socialLinksContainer.innerHTML = '';
            if (user.socialLinks && user.socialLinks.length > 0) {
                const iconMap = {
                    linkedin: 'fab fa-linkedin-in', twitter: 'fab fa-twitter', facebook: 'fab fa-facebook-f',
                    instagram: 'fab fa-instagram', github: 'fab fa-github', website: 'fas fa-globe'
                };
                user.socialLinks.forEach(link => {
                    const linkElement = document.createElement('a');
                    linkElement.href = link.url.startsWith('http') ? link.url : `https://${link.url}`;
                    linkElement.target = '_blank';
                    linkElement.rel = 'noopener noreferrer';
                    linkElement.className = 'w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-colors';
                    linkElement.innerHTML = `<i class="${iconMap[link.platform] || 'fas fa-link'}"></i>`;
                    socialLinksContainer.appendChild(linkElement);
                });
            }
        }
        const completeProfileSection = document.getElementById('completeProfileSection');
        const stepsContainer = document.getElementById('completionStepsContainer');
        const stepsLeftEl = document.getElementById('stepsLeft');
        if (stepsContainer && stepsLeftEl && completeProfileSection) {
            stepsContainer.innerHTML = '';
            const profileSteps = [
                {
                    check: () => user.bio && user.bio.trim().length > 20,
                    title: t('js-investor-profile-step-bio-title'), description: t('js-investor-profile-step-bio-desc'),
                    icon: '✎', link: 'settings.html',
                    container: document.getElementById('bioCard')
                },
                {
                    check: () => user.professionalExperience && user.professionalExperience.length > 0,
                    title: t('js-investor-profile-step-experience-title'), description: t('js-investor-profile-step-experience-desc'),
                    icon: '💼', link: 'settings.html',
                    container: document.getElementById('experienceCard')
                },
                {
                    check: () => user.education && user.education.length > 0,
                    title: t('js-investor-profile-step-education-title'), description: t('js-investor-profile-step-education-desc'),
                    icon: '🎓', link: 'settings.html',
                    container: document.getElementById('educationFormContainer')
                },
                {
                    check: () => user.skills && user.skills.length > 0,
                    title: t('js-investor-profile-step-skills-title'), description: t('js-investor-profile-step-skills-desc'),
                    icon: '★', link: 'settings.html',
                    container: document.getElementById('skillsCard')
                },
                {
                    check: () => user.achievements && user.achievements.length > 0,
                    title: t('js-investor-profile-step-achievements-title'), description: t('js-investor-profile-step-achievements-desc'),
                    icon: '💪', link: 'settings.html',
                    container: document.getElementById('keyAchievementsContainer')?.parentElement
                }
            ];
            let stepsLeftCount = 0;
            profileSteps.forEach(step => {
                const isCompleted = step.check();
                if (isCompleted) {
                    if (step.container) step.container.style.display = 'block';
                } else {
                    stepsLeftCount++;
                    if (step.container) step.container.style.display = 'none';
                    const card = document.createElement('div');
                    card.className = 'step-card';
                    card.innerHTML = `
                    <div class="icon-wrapper"><span>${step.icon}</span></div>
                    <h3>${step.title}</h3>
                    <p>${step.description}</p>
                    <a href="${step.link}" class="action-button add">${t('js-investor-profile-step-add-btn')}</a>
                    `;
                    stepsContainer.appendChild(card);
                }
            });

            if (stepsLeftCount > 0) {
                completeProfileSection.style.display = 'block';
                stepsLeftEl.textContent = `${stepsLeftCount} ${t('js-investor-profile-steps-remaining')}`;
            } else {
                completeProfileSection.style.display = 'none';
            }
        }
        if (user.bio && user.bio.trim()) {
            document.getElementById('bioContainer').innerHTML = user.bio.replace(/\n/g, '<p>');
        }
        if (user.professionalExperience && user.professionalExperience.length > 0) {
            document.getElementById('experienceContainer').innerHTML = user.professionalExperience.map(exp => `
            <div class="flex gap-4">
                <div class="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0 shadow-lg">${exp.company ? exp.company.substring(0, 2).toUpperCase() : '🏢'}</div>
                <div class="flex-1">
                    <h3 class="font-semibold text-slate-800">${escapeHTML(exp.title)}</h3>
                    <p class="text-emerald-600 font-semibold">${escapeHTML(exp.company)}</p>
                    <p class="text-sm text-slate-600 mb-2">${escapeHTML(exp.period)}</p>
                    <p class="text-slate-600 text-sm">${escapeHTML(exp.description)}</p>
                </div>
            </div>
        `).join('');
        }
        if (user.education && user.education.length > 0) {
            const eduContainer = document.getElementById('educationCard');
            if (eduContainer) {
                eduContainer.style.display = 'block';
                document.getElementById('educationContainer').innerHTML = user.education.map(edu => `
                <div class="flex gap-4">
                    <div class="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0 shadow-lg">🎓</div>
                    <div>
                        <h3 class="font-semibold text-slate-800">${escapeHTML(edu.degree)}</h3>
                        <p class="text-emerald-600 font-semibold">${escapeHTML(edu.institution)}</p>
                        <p class="text-sm text-slate-600">${escapeHTML(edu.details)}</p>
                    </div>
                </div>
            `).join('');
            }
        } else {
            const eduContainer = document.getElementById('educationCard');
            if (eduContainer) eduContainer.style.display = 'none';
        }
        if (user.skills && user.skills.length > 0) {
            document.getElementById('skillsContainer').innerHTML = user.skills.map(skill => `
            <div>
                <div class="flex justify-between mb-1">
                    <span class="text-sm text-slate-700 font-medium">${escapeHTML(skill.name || skill)}</span>
                    <span class="text-sm text-emerald-600 font-semibold">${skill.level || 90}%</span>
                </div>
                <div class="w-full bg-slate-200 rounded-full h-2.5">
                    <div class="skill-bar h-2.5 rounded-full" style="width: ${skill.level || 90}%"></div>
                </div>
            </div>
        `).join('');
        }
        if (user.achievements && user.achievements.length > 0) {
            const achievementsCard = document.getElementById('achievementsCard');
            if (achievementsCard) {
                achievementsCard.style.display = 'block';
                document.getElementById('achievementsContainer').innerHTML = user.achievements.map(ach => `
                <div class="investment-card p-3 rounded-lg">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 achievement-badge rounded-lg flex items-center justify-center text-white text-sm font-bold">${ach.icon || '🏆'}</div>
                        <div>
                            <div class="font-semibold text-slate-800 text-sm">${escapeHTML(ach.title)}</div>
                            <div class="text-xs text-emerald-600 font-medium">${escapeHTML(ach.issuer)}</div>
                        </div>
                    </div>
                </div>
            `).join('');
            }
        } else {
            const achievementsCard = document.getElementById('achievementsCard');
            if (achievementsCard) achievementsCard.style.display = 'none';
        }
    }

    function populateDashboardStats(stats) {
        const totalProjectsEl = document.getElementById('dashboard-total-projects');
        const totalInvestmentEl = document.getElementById('dashboard-total-investment');
        const avgCompletionEl = document.getElementById('dashboard-avg-completion');
        const avgReturnEl = document.getElementById('dashboard-avg-return');
        if (stats && totalProjectsEl && totalInvestmentEl && avgCompletionEl && avgReturnEl) {
            totalProjectsEl.textContent = stats.totalInvestedProjects || 0;
            totalInvestmentEl.textContent = `${(stats.totalInvestment || 0).toLocaleString()} ${stats.investmentCurrency || 'USD'}`;
            avgCompletionEl.textContent = `${stats.averageProjectCompletion || 0}%`;
            avgReturnEl.textContent = `${stats.averageExpectedReturn || 0}%`;
        }
    }

    function createInvestmentCard(investment) {
        if (!investment || !investment.project) return '';
        const { project, amount, createdAt, investmentType, currency, amountPaidNow, amountRemaining } = investment;
        const goal = project.fundingGoal?.amount || 0;
        const raised = project.fundingAmountRaised || 0;
        const progress = goal > 0 ? Math.round((raised / goal) * 100) : 0;
        const projectStatus = project.status;
        const categoryKey = categoryTranslationKeys[project.projectCategory] || 'js-investor-profile-category-general';
        const projectCategory = t(categoryKey); let statusText = t('js-investor-profile-status-not-specified');
        let statusClass = 'status-pending';
        if (projectStatus === 'published') {
            statusText = t('js-investor-profile-status-funding');
            statusClass = 'status-pending';
        } else if (['funded', 'completed'].includes(projectStatus)) {
            statusText = t('js-investor-profile-status-funded');
            statusClass = 'status-active';
        }
        let investmentTypeText = '';
        let investmentTypeClass = '';
        if (investmentType === 'reservation') {
            investmentTypeText = t('js-investor-profile-type-reservation');
            investmentTypeClass = 'bg-yellow-100 text-yellow-800';
        } else if (investmentType === 'full') {
            investmentTypeText = t('js-investor-profile-type-full');
            investmentTypeClass = 'bg-green-100 text-green-800';
        }

        let reservationDetailsHTML = '';
        if (investmentType === 'reservation' && (amountPaidNow || amountRemaining)) {
            reservationDetailsHTML = `
            <div class="mt-2 text-xs text-gray-500 flex justify-end gap-4">
                <span>${t('js-investor-profile-reservation-paid')}: <strong class="text-gray-700">${(amountPaidNow || 0).toLocaleString()} ${currency || ''}</strong></span>
                <span>${t('js-investor-profile-reservation-due')}: <strong class="text-red-600">${(amountRemaining || 0).toLocaleString()} ${currency || ''}</strong></span>
            </div>
        `;
        }

        return `
        <div class="card p-6" data-status="${projectStatus}" data-category="${projectCategory}">
            <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-4">
                    <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                        ${project.projectName ? project.projectName.charAt(0) : 'P'}
                    </div>
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <h3 class="text-lg font-bold text-gray-900">${escapeHTML(project.projectName)}</h3>
                            <span class="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-700 rounded-full">${escapeHTML(projectCategory)}</span>
                        </div>
                        <p class="text-sm text-gray-600">${escapeHTML(project.projectDescription.substring(0, 50))}...</p>
                        <div class="flex items-center gap-4 mt-2">
                            <span class="investment-status ${statusClass}">${statusText}</span>
                            ${investmentTypeText ? `<span class="text-xs font-semibold px-2 py-1 rounded-full ${investmentTypeClass}">${investmentTypeText}</span>` : ''}
                            <span class="text-xs text-gray-500">| ${t('js-investor-profile-invested-on')}: ${new Date(createdAt).toLocaleDateString('en-us')}</span>
                        </div>
                    </div>
                </div>
                <a href="project-view.html?id=${project._id}" target="_blank" class="secondary-button px-4 py-2 text-sm">
                    ${t('js-investor-profile-view-details-btn')}
                </a>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div class="text-center p-3 bg-blue-50 rounded-lg">
                    <div class="text-lg font-bold text-blue-600">${amount.toLocaleString()}</div>
                    <div class="text-xs text-gray-600">${t('js-investor-profile-your-investment')} (${currency || 'SAR'})</div>
                </div>
                 <div class="text-center p-3 bg-gray-50 rounded-lg">
                    <div class="text-lg font-bold text-gray-600">${(project.expectedReturn || 0)}%</div>
                    <div class="text-xs text-gray-600">${t('js-investor-profile-expected-return')}</div>
                </div>
                <div class="text-center p-3 bg-green-50 rounded-lg">
                    <div class="text-lg font-bold text-green-600">${raised.toLocaleString()}</div>
                    <div class="text-xs text-gray-600">${t('js-investor-profile-amount-raised')}</div>
                </div>
                <div class="text-center p-3 bg-purple-50 rounded-lg">
                    <div class="text-lg font-bold text-purple-600">${goal.toLocaleString()}</div>
                    <div class="text-xs text-gray-600">${t('js-investor-profile-funding-goal')}</div>
                </div>
            </div>
            <div class="mb-4">
                <div class="flex justify-between text-sm mb-2">
                    <span class="text-gray-600">${t('js-investor-profile-project-progress')}</span>
                    <span class="font-medium text-blue-600">${progress}% ${t('js-investor-profile-completed')}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full" style="width: ${progress}%"></div>
                </div>
                ${reservationDetailsHTML}
            </div>
        </div>
    `;
    }

    function renderAndSortInvestments() {
        const container = document.querySelector('#My-investments .space-y-6');
        if (!container) return;
        const statusTypeFilter = document.getElementById('statusTypeFilter').value;
        const categoryFilter = document.getElementById('categoryFilter').value;
        const sortByFilter = document.getElementById('sortByFilter').value;
        let processedInvestments = [...allInvestments];
        if (statusTypeFilter.startsWith('status_')) {
            const status = statusTypeFilter.replace('status_', '');
            processedInvestments = processedInvestments.filter(inv => inv.project && (status === 'completed' ? ['funded', 'completed'].includes(inv.project.status) : inv.project.status === status));
        } else if (statusTypeFilter.startsWith('type_')) {
            processedInvestments = processedInvestments.filter(inv => inv.investmentType === statusTypeFilter.replace('type_', ''));
        }
        if (categoryFilter !== 'all') {
            processedInvestments = processedInvestments.filter(inv => inv.project && inv.project.projectCategory === categoryFilter);
        }
        switch (sortByFilter) {
            case 'newest': processedInvestments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
            case 'oldest': processedInvestments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
            case 'highest_funded': processedInvestments.sort((a, b) => (b.project?.fundingAmountRaised || 0) - (a.project?.fundingAmountRaised || 0)); break;
            case 'my_highest_investment': processedInvestments.sort((a, b) => (b.amount || 0) - (a.amount || 0)); break;
        }
        const limitedInvestments = processedInvestments.slice(0, 4);
        if (limitedInvestments.length === 0) {
            container.innerHTML = `<p class="text-center text-gray-500 py-8">${t('js-investor-profile-no-investments-display')}</p>`;
            return;
        }
        container.innerHTML = limitedInvestments.map(createInvestmentCard).join('');
        if (processedInvestments.length > 4) {
            container.innerHTML += `<div class="text-center mt-4"><a href="investor-portfolio.html" class="elegant-button px-6 py-2">${t('js-investor-profile-view-all-investments-btn')}</a></div>`;
        }
    }

    function createFollowedProjectCard(project) {
        if (!project) return '';
        const goal = project.fundingGoal?.amount || 0;
        const currency = project.fundingGoal?.currency || 'USD';
        const categoryKey = categoryTranslationKeys[project.projectCategory] || 'js-investor-profile-category-general';

        return `
            <div class="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200">
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                        ${project.projectName ? project.projectName.charAt(0) : 'P'}
                    </div>
                    <div>
                        <div class="font-bold text-gray-900">${escapeHTML(project.projectName)}</div>
                        <div class="text-sm text-gray-600">${escapeHTML(t(categoryKey))}</div>
                    </div>
                </div>
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span class="text-sm text-gray-600">${t('js-investor-profile-funding-goal-label')}:</span>
                        <span class="font-bold">${goal.toLocaleString()} ${currency}</span>
                    </div>
                </div>
                <div class="mt-4 text-right">
                     <a href="project-view.html?id=${project._id}" target="_blank" class="text-purple-600 font-semibold hover:underline">
                        ${t('js-investor-profile-view-details-btn')} →
                    </a>
                </div>
            </div>
        `;
    }

    function populateFollowedProjects() {
        const container = document.getElementById('followedProjectsContainer');
        if (!container) return;
        const limitedProjects = followedProjects.slice(0, 3);
        if (limitedProjects.length === 0) {
            container.innerHTML = `<p class="text-center text-gray-500 py-4 col-span-full">${t('js-investor-profile-not-following-projects')}</p>`;
            return;
        }
        container.innerHTML = limitedProjects.map(createFollowedProjectCard).join('');
        if (followedProjects.length > 3) {
            container.innerHTML += `<div class="text-center mt-4"><a href="investor-portfolio.html" class="elegant-button px-6 py-2">${t('js-investor-profile-view-all-followed-btn')}</a></div>`;
        }
    }

    function createProposalCard(proposal) {
        if (!proposal || !proposal.projectId) return '';
        const typeMap = {
            strategic: { text: t('js-investor-profile-proposal-type-strategic'), color: 'green', icon: '💰' },
            expertise: { text: t('js-investor-profile-proposal-type-expertise'), color: 'blue', icon: '🚀' },
            advisory: { text: t('js-investor-profile-proposal-type-advisory'), color: 'purple', icon: '🤝' },
            hybrid: { text: t('js-investor-profile-proposal-type-hybrid'), color: 'yellow', icon: '✨' }
        };
        const proposalType = typeMap[proposal.partnershipType] || { text: t('js-investor-profile-proposal-type-custom'), color: 'gray', icon: '📋' };
        const date = new Date(proposal.createdAt).toLocaleDateString('en-us', { day: 'numeric', month: 'short', year: 'numeric' });
        let statusBadge = '';
        if (proposal.status === 'accepted') {
            statusBadge = `<span class="text-xs font-bold text-green-700">${t('js-investor-profile-proposal-status-accepted')}</span>`;
        } else if (proposal.status === 'rejected') {
            statusBadge = `<span class="text-xs font-bold text-red-700">${t('js-investor-profile-proposal-status-rejected')}</span>`;
        } else {
            statusBadge = `<span class="text-xs font-bold text-yellow-700">${t('js-investor-profile-proposal-status-pending')}</span>`;
        }
        return `
            <div class="flex items-center gap-4 p-4 bg-${proposalType.color}-50 rounded-lg border border-${proposalType.color}-200">
                <div class="w-10 h-10 bg-${proposalType.color}-500 rounded-full flex items-center justify-center text-white text-sm">${proposalType.icon}</div>
                <div class="flex-1">
                    <div class="font-medium text-gray-900 flex items-center gap-2">${proposalType.text} ${statusBadge}</div>
                    <div class="text-sm text-gray-600">
                        ${t('js-investor-profile-proposal-for-project')} <a href="project-view.html?id=${proposal.projectId._id}" target="_blank" class="font-semibold text-${proposalType.color}-700">${escapeHTML(proposal.projectId.projectName)}</a>
                    </div>
                    <div class="text-xs text-gray-500">${t('js-investor-profile-proposal-sent-on')}: ${date}</div>
                </div>
                <div class="text-${proposalType.color}-600 font-bold cursor-pointer hover:underline" onclick="viewProposalDetails('${proposal._id}')">${t('js-investor-profile-details-btn')}</div>
            </div>
        `;
    }

    function populatePendingProposals() {
        const container = document.getElementById('pendingProposalsContainer');
        if (!container) return;
        const limitedProposals = allProposals.slice(0, 3);
        if (limitedProposals.length === 0) {
            container.innerHTML = `<p class="text-center text-gray-500 py-4">${t('js-investor-profile-no-proposals-sent')}</p>`;
            return;
        }
        container.innerHTML = limitedProposals.map(createProposalCard).join('');
        if (allProposals.length > 3) {
            container.innerHTML += `<div class="text-center mt-4"><a href="investor-portfolio.html" class="elegant-button px-6 py-2">${t('js-investor-profile-view-all-proposals-btn')}</a></div>`;
        }
    }

    function openProposalModal(proposalId) {
        const proposal = allProposals.find(p => p._id === proposalId);
        if (!proposal || !proposalModal) return;
        const typeMap = {
            strategic: t('js-investor-profile-proposal-type-strategic'), expertise: t('js-investor-profile-proposal-type-expertise'),
            advisory: t('js-investor-profile-proposal-type-advisory'), hybrid: t('js-investor-profile-proposal-type-hybrid')
        };
        document.getElementById('modalProposalProjectName').textContent = proposal.projectId.projectName;
        document.getElementById('modalProposalType').textContent = typeMap[proposal.partnershipType] || t('js-investor-profile-proposal-type-custom');
        document.getElementById('modalProposalTerms').textContent = proposal.proposedTerms;
        const expertiseWrapper = document.getElementById('modalExpertiseWrapper');
        const expertiseContainer = document.getElementById('modalProposalExpertise');
        if (proposal.expertiseAreas && proposal.expertiseAreas.length > 0) {
            expertiseWrapper.style.display = 'block';
            expertiseContainer.innerHTML = proposal.expertiseAreas.map(area => `<span class="text-xs font-semibold px-2 py-1 bg-slate-200 text-slate-700 rounded-full">${escapeHTML(area)}</span>`).join('');
        } else {
            expertiseWrapper.style.display = 'none';
        }
        const responseContainer = document.getElementById('modalProposalResponseContainer');
        if (proposal.responseMessage) {
            responseContainer.style.display = 'block';
            document.getElementById('modalProposalResponseMessage').textContent = proposal.responseMessage;
            document.getElementById('modalProposalResponseDate').textContent = `${t('js-investor-profile-response-date')}: ${new Date(proposal.respondedAt).toLocaleDateString('en-us')}`;
            const statusEl = document.getElementById('modalProposalResponseStatus');
            const contentEl = document.getElementById('modalProposalResponseContent');
            if (proposal.status === 'accepted') {
                statusEl.textContent = t('js-investor-profile-proposal-status-accepted');
                contentEl.className = 'p-4 rounded-lg bg-green-50 border border-green-200';
                statusEl.className = 'font-semibold text-sm px-3 py-1 rounded-full bg-green-200 text-green-800';
            } else {
                statusEl.textContent = t('js-investor-profile-proposal-status-rejected');
                contentEl.className = 'p-4 rounded-lg bg-red-50 border border-red-200';
                statusEl.className = 'font-semibold text-sm px-3 py-1 rounded-full bg-red-200 text-red-800';
            }
        } else {
            responseContainer.style.display = 'none';
        }
        proposalModal.classList.remove('hidden');
        proposalModal.classList.add('flex');
    }

    function closeProposalModal() {
        if (proposalModal) {
            proposalModal.classList.add('hidden');
            proposalModal.classList.remove('flex');
        }
    }

    window.viewProposalDetails = (proposalId) => {
        openProposalModal(proposalId);
    };

    function populateSectorAllocation() {
        const container = document.getElementById('sectorAllocationContainer');
        if (!container) return;
        if (allInvestments.length === 0) {
            container.innerHTML = `<p class="text-sm text-gray-500">${t('js-investor-profile-no-investments-for-distribution')}</p>`;
            return;
        }
        const sectorTotals = {};
        let totalInvestment = 0;
        allInvestments.forEach(inv => {
            const category = inv.project?.projectCategory || t('js-investor-profile-unclassified');
            const amount = inv.amount || 0;
            sectorTotals[category] = (sectorTotals[category] || 0) + amount;
            totalInvestment += amount;
        });
        const sectorData = Object.keys(sectorTotals).map(category => {
            const amount = sectorTotals[category];
            const percentage = totalInvestment > 0 ? (amount / totalInvestment) * 100 : 0;
            return { category, percentage };
        });
        sectorData.sort((a, b) => b.percentage - a.percentage);
        const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500'];
        container.innerHTML = sectorData.map((item, index) => {
            const colorClass = colors[index % colors.length];
            return `
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <div class="w-4 h-4 ${colorClass} rounded"></div>
                        <span class="text-sm">${escapeHTML(item.category)}</span>
                    </div>
                    <span class="text-sm font-medium">${item.percentage.toFixed(1)}%</span>
                </div>
            `;
        }).join('');
    }

    function populateInvestmentStatusAnalytics() {
        if (allInvestments.length === 0) return;
        let completedCount = 0;
        let inProgressCount = 0;
        let fullCount = 0;
        let reservationCount = 0;
        allInvestments.forEach(inv => {
            if (inv.project) {
                if (['funded', 'completed'].includes(inv.project.status)) {
                    completedCount++;
                } else if (inv.project.status === 'published') {
                    inProgressCount++;
                }
            }
            if (inv.investmentType === 'full') {
                fullCount++;
            } else if (inv.investmentType === 'reservation') {
                reservationCount++;
            }
        });
        const completedEl = document.getElementById('stat-completed-investments');
        const inProgressEl = document.getElementById('stat-inprogress-investments');
        const fullEl = document.getElementById('stat-full-investments');
        const reservationEl = document.getElementById('stat-reservation-investments');
        if (completedEl) completedEl.textContent = completedCount;
        if (inProgressEl) inProgressEl.textContent = inProgressCount;
        if (fullEl) fullEl.textContent = fullCount;
        if (reservationEl) reservationEl.textContent = reservationCount;
    }

    function initializeDashboard(stats) {
        populateDashboardStats(stats);
        const statusTypeFilter = document.getElementById('statusTypeFilter');
        const categoryFilter = document.getElementById('categoryFilter');
        const sortByFilter = document.getElementById('sortByFilter');
        if (categoryFilter) {
            const categories = [...new Set(allInvestments.map(inv => inv.project?.projectCategory).filter(Boolean))];
            categoryFilter.innerHTML = `<option value="all">${t('investor-profile-filter-all-sectors')}</option>`;
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                // ترجمة النص قبل إضافته
                const translationKey = categoryTranslationKeys[category];
                option.textContent = translationKey ? t(translationKey) : category;
                categoryFilter.appendChild(option);
            });
        }
        if (statusTypeFilter) statusTypeFilter.addEventListener('change', renderAndSortInvestments);
        if (categoryFilter) categoryFilter.addEventListener('change', renderAndSortInvestments);
        if (sortByFilter) sortByFilter.addEventListener('change', renderAndSortInvestments);
        renderAndSortInvestments();
        populateFollowedProjects();
        populatePendingProposals();
        populateSectorAllocation();
        populateInvestmentStatusAnalytics();
    }

    if (profileTabButton) profileTabButton.addEventListener('click', () => switchTab('profile'));
    if (dashboardTabButton) dashboardTabButton.addEventListener('click', () => switchTab('dashboard'));
    if (closeProposalModalBtn) closeProposalModalBtn.addEventListener('click', closeProposalModal);

    if (followingStatBtn) {
        followingStatBtn.addEventListener('click', () => {
            if (currentUserData) {
                openFollowModal(currentUserData.followers, currentUserData.following);
            }
        });
    }
    if (closeFollowModalBtn) closeFollowModalBtn.addEventListener('click', closeFollowModal);
    if (followModal) followModal.addEventListener('click', (e) => {
        if (e.target.id === 'followModal') closeFollowModal();
    });
    if (followingTabBtn) followingTabBtn.addEventListener('click', () => switchFollowTab('following'));
    if (followersTabBtn) followersTabBtn.addEventListener('click', () => switchFollowTab('followers'));

    if (partnersStatBtn) {
        partnersStatBtn.addEventListener('click', () => {
            if (allInvestments) {
                openPartnersModal(allInvestments);
            }
        });
    }
    if (closePartnersModalBtn) closePartnersModalBtn.addEventListener('click', closePartnersModal);
    if (partnersModal) partnersModal.addEventListener('click', (e) => {
        if (e.target.id === 'partnersModal') closePartnersModal();
    });

    fetchAndPopulateData();
});

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match]));
}