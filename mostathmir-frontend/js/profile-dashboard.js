document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE_URL = 'http://localhost:5000';
    const token = localStorage.getItem('user_token');
    if (!token) {
        alert(t('js-dashboard-login-required'));
        window.location.href = 'login.html';
        return;
    }

    let allProjects = [];
    let participatingInvestorsData = [];
    let receivedProposalsData = [];
    let currentModalProjects = [];

    const profileTabButton = document.getElementById('profileTabButton');
    const dashboardTabButton = document.getElementById('dashboardTabButton');
    const profileTabView = document.getElementById('profileTabView');
    const dashboardTabView = document.getElementById('dashboardTabView');
    const modalSortFilter = document.getElementById('modalSortFilter');
    const modalInvestorsSortFilter = document.getElementById('modalInvestorsSortFilter');
    const investmentTypeFilter = document.getElementById('investmentTypeFilter');
    const statsModal = document.getElementById('statsModal');
    const statsModalOverlay = document.getElementById('statsModalOverlay');
    const closeStatsModalBtn = document.getElementById('closeStatsModalBtn');
    const followersModal = document.getElementById('followersModal');
    const closeFollowersModalBtn = document.getElementById('closeFollowersModal');
    const proposalResponseModal = document.getElementById('proposalResponseModal');
    const closeResponseModalBtn = document.getElementById('closeResponseModalBtn');

    const projectSortContainer = document.getElementById('projectSortContainer');
    const investorSortContainer = document.getElementById('investorSortContainer');
    const proposalFilterContainer = document.getElementById('proposalFilterContainer');

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

    function openModal() {
        if (statsModal && statsModalOverlay) {
            statsModal.style.display = 'block';
            statsModalOverlay.style.display = 'block';
        }
    }

    function closeModal() {
        if (statsModal && statsModalOverlay) {
            statsModal.style.display = 'none';
            statsModalOverlay.style.display = 'none';
        }
    }

    async function fetchData() {
        try {
            const [dashboardRes, profileRes, projectsRes, investmentsRes, proposalsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/users/dashboard`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/api/users/profile`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/api/projects/myprojects`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/api/projects/my-investments`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/api/users/dashboard/proposals`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (!dashboardRes.ok || !profileRes.ok || !projectsRes.ok || !investmentsRes.ok || !proposalsRes.ok) {
                throw new Error(t('js-dashboard-error-fetch'));
            }

            const dashboardData = await dashboardRes.json();
            const profileData = await profileRes.json();
            allProjects = await projectsRes.json();
            participatingInvestorsData = await investmentsRes.json();
            receivedProposalsData = await proposalsRes.json();

            populateDashboard(dashboardData);
            populateMyProfileView(profileData, allProjects, API_BASE_URL);
            bindProjectStatusCards();
            bindInteractionCards();

            // Force re-translation after dynamic content is added
            if (window.translatePage) {
                window.translatePage();
            }

        } catch (error) {
            console.error("Error fetching page data:", error);
            alert(error.message);
        }
    }

    function populateDashboard(stats) {
        document.getElementById('stat-active-projects').textContent = stats.projectsByStatus.active || 0;
        document.getElementById('stat-total-funding-goal').textContent = (stats.totalFundingGoal || 0).toLocaleString();
        document.getElementById('stat-total-funding-raised').textContent = (stats.totalFundingRaised || 0).toLocaleString();
        document.getElementById('stat-total-projects').textContent = stats.totalProjects || 0;
        document.getElementById('stat-published-unfunded').textContent = stats.projectsByStatus.publishedUnfunded || 0;
        document.getElementById('stat-funding-inprogress').textContent = stats.projectsByStatus.fundingInProgress || 0;
        document.getElementById('stat-funded-completed').textContent = stats.projectsByStatus.fundedOrCompleted || 0;
        document.getElementById('stat-draft-projects').textContent = stats.projectsByStatus.draft || 0;
        document.getElementById('stat-review-projects').textContent = stats.projectsByStatus['under-review'] || 0;
        document.getElementById('stat-closed-projects').textContent = stats.projectsByStatus.closed || 0;
        document.getElementById('stat-total-views').textContent = stats.totalViews || 0;
        document.getElementById('stat-total-followers').textContent = stats.totalFollowers || 0;
        const investorsCountEl = document.getElementById('stat-investors-count');
        if (investorsCountEl) {
            const uniqueInvestors = new Set(participatingInvestorsData.map(inv => inv.investor._id));
            investorsCountEl.textContent = uniqueInvestors.size;
        }
        const proposalsCountEl = document.getElementById('stat-proposals-count');
        if (proposalsCountEl) {
            proposalsCountEl.textContent = receivedProposalsData.length;
        }
    }

    function populateStarRating(testimonials) {
        const ratingContainer = document.getElementById('profile-rating-stars');
        if (!ratingContainer) return;
        if (!testimonials || testimonials.length === 0) {
            ratingContainer.innerHTML = `
                <div class="flex items-center justify-center gap-1 text-gray-300">
                    <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>
                </div>
                <span class="text-xs text-gray-500 ml-2"> (${t('js-dashboard-no-ratings')})</span>`;
            return;
        }
        const totalRating = testimonials.reduce((sum, t) => sum + t.rating, 0);
        const averageRating = totalRating / testimonials.length;
        const roundedAverage = Math.round(averageRating * 2) / 2;
        let starsHTML = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= roundedAverage) {
                starsHTML += `<i class="fas fa-star text-yellow-400"></i>`;
            } else if (i - 0.5 === roundedAverage) {
                starsHTML += `<i class="fas fa-star-half-alt text-yellow-400"></i>`;
            } else {
                starsHTML += `<i class="far fa-star text-gray-300"></i>`;
            }
        }
        ratingContainer.innerHTML = `
            <div class="flex items-center justify-center gap-1">${starsHTML}</div>
            <span class="text-sm text-gray-600 font-semibold ml-2">
                ${averageRating.toFixed(1)} 
                <span class="text-xs text-gray-500 font-normal">(${testimonials.length} ${t('js-dashboard-ratings-count')})</span>
            </span>`;
    }

    function populateMyProfileView(user, projects, baseUrl) {
        const avatarContainer = document.getElementById('avatarContainer');
        if (avatarContainer) {
            if (user.profilePicture && user.profilePicture !== 'default-avatar.png' && user.profilePicture.startsWith('http')) {
                avatarContainer.innerHTML = `<img src="${user.profilePicture}" alt="${user.fullName}" class="w-full h-full object-cover rounded-full">`;
            } else {
                avatarContainer.textContent = user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U';
            }
        }
        document.getElementById('fullName').textContent = user.fullName || '';
        document.getElementById('profileTitle').textContent = user.profileTitle || t('js-dashboard-add-title');
        document.getElementById('location').textContent = user.location || t('js-dashboard-add-location');
        document.getElementById('email').textContent = user.email || '';
        document.getElementById('phone').textContent = user.phone || t('js-dashboard-add-phone');

        populateStarRating(user.testimonials);

        const socialContainer = document.getElementById('publicSocialLinksContainer');
        if (socialContainer) {
            socialContainer.innerHTML = '';
            if (user.socialLinks && user.socialLinks.length > 0) {
                const iconMap = {
                    linkedin: 'fab fa-linkedin-in', twitter: 'fab fa-twitter', facebook: 'fab fa-facebook-f',
                    instagram: 'fab fa-instagram', github: 'fab fa-github', website: 'fas fa-globe'
                };
                user.socialLinks.forEach(link => {
                    const iconClass = iconMap[link.platform] || 'fas fa-link';
                    const linkElement = document.createElement('a');
                    linkElement.href = link.url.startsWith('http') ? link.url : `https://${link.platform}.com/${link.url}`;
                    linkElement.target = '_blank';
                    linkElement.rel = 'noopener noreferrer';
                    linkElement.className = 'w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-colors';
                    linkElement.innerHTML = `<i class="${iconClass}"></i>`;
                    socialContainer.appendChild(linkElement);
                });
            }
        }

        const statsContainer = document.getElementById('sidebarStats');
        if (statsContainer) {
            const projectsCount = allProjects.filter(p => ['published', 'funded', 'completed'].includes(p.status)).length;
            const followersCount = user.followers ? user.followers.length : 0;
            const uniqueInvestors = new Set();
            if (participatingInvestorsData && Array.isArray(participatingInvestorsData)) {
                participatingInvestorsData.forEach(inv => {
                    if (inv.investor) {
                        uniqueInvestors.add(inv.investor._id.toString());
                    }
                });
            }
            const investorsCount = uniqueInvestors.size;
            const projectsStatCard = document.getElementById('projectsStatCard');
            const followersStatCard = document.getElementById('followersStatCard');
            const investorsStatCard = document.getElementById('investorsStatCard');
            if (projectsStatCard) projectsStatCard.querySelector('.text-xl').textContent = projectsCount;
            if (followersStatCard) followersStatCard.querySelector('.text-xl').textContent = followersCount;
            if (investorsStatCard) investorsStatCard.querySelector('.text-xl').textContent = investorsCount;
            if (followersStatCard) followersStatCard.addEventListener('click', () => openFollowersModal(user.followers, baseUrl));
            if (projectsStatCard) projectsStatCard.addEventListener('click', () => switchTab('dashboard'));
            if (investorsStatCard) investorsStatCard.addEventListener('click', () => switchTab('dashboard'));
        }

        const completeProfileSection = document.getElementById('completeProfileSection');
        const stepsContainer = document.getElementById('completionStepsContainer');
        const stepsLeftEl = document.getElementById('stepsLeft');

        if (stepsContainer && stepsLeftEl && completeProfileSection) {
            stepsContainer.innerHTML = '';
            const profileSteps = [
                {
                    check: () => user.bio && user.bio.trim().length > 20,
                    title: t('js-dashboard-step-bio-title'), description: t('js-dashboard-step-bio-desc'), icon: '✎', link: 'settings.html',
                    container: document.getElementById('bioContainer')?.parentElement
                },
                {
                    check: () => user.professionalExperience && user.professionalExperience.length > 0,
                    title: t('js-dashboard-step-experience-title'), description: t('js-dashboard-step-experience-desc'), icon: '💼', link: 'settings.html',
                    container: document.getElementById('experienceContainer')?.parentElement
                },
                {
                    check: () => user.education && user.education.length > 0,
                    title: t('js-dashboard-step-education-title'), description: t('js-dashboard-step-education-desc'), icon: '🎓', link: 'settings.html',
                    container: document.getElementById('educationContainer')?.parentElement
                },
                {
                    check: () => user.skills && user.skills.length > 0,
                    title: t('js-dashboard-step-skills-title'), description: t('js-dashboard-step-skills-desc'), icon: '★', link: 'settings.html',
                    container: document.getElementById('skillsContainer')?.parentElement
                },
                {
                    check: () => user.achievements && user.achievements.length > 0,
                    title: t('js-dashboard-step-achievements-title'), description: t('js-dashboard-step-achievements-desc'),
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
                        <a href="${step.link}" class="action-button add">${t('js-dashboard-step-add-btn')}</a>
                    `;
                    stepsContainer.appendChild(card);
                }
            });
            if (stepsLeftCount > 0) {
                completeProfileSection.style.display = 'block';
                stepsLeftEl.textContent = `${stepsLeftCount} ${t('js-dashboard-steps-remaining')}`;
            } else {
                completeProfileSection.style.display = 'none';
            }
        }

        if (user.bio && user.bio.trim()) {
            const bioContainer = document.getElementById('bioContainer');
            if (bioContainer) bioContainer.innerHTML = user.bio.replace(/\n/g, '<p>');
        }

        if (user.professionalExperience && user.professionalExperience.length > 0) {
            const expContainer = document.getElementById('experienceContainer');
            if (expContainer) expContainer.innerHTML = user.professionalExperience.map(exp => `<div class="flex gap-4"><div class="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0 shadow-lg">${exp.company ? exp.company.substring(0, 2).toUpperCase() : '🏢'}</div><div class="flex-1"><h3 class="font-semibold text-slate-800">${escapeHTML(exp.title)}</h3><p class="text-emerald-600 font-semibold">${escapeHTML(exp.company)}</p><p class="text-sm text-slate-600 mb-2">${escapeHTML(exp.period)}</p><p class="text-slate-600 text-sm">${escapeHTML(exp.description)}</p></div></div>`).join('');
        }

        if (user.education && user.education.length > 0) {
            const eduContainer = document.getElementById('educationContainer');
            if (eduContainer) eduContainer.innerHTML = user.education.map(edu => `<div class="flex gap-4"><div class="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0 shadow-lg">🎓</div><div><h3 class="font-semibold text-slate-800">${escapeHTML(edu.degree)}</h3><p class="text-emerald-600 font-semibold">${escapeHTML(edu.institution)}</p><p class="text-sm text-slate-600">${escapeHTML(edu.details)}</p></div></div>`).join('');
        }

        const skillsContainer = document.getElementById('skillsContainer');
        if (skillsContainer) {
            if (user.skills && user.skills.length > 0) {
                skillsContainer.innerHTML = user.skills.map(skill => `
                    <div>
                        <div class="flex justify-between mb-1">
                            <span class="text-sm text-slate-700 font-medium">${escapeHTML(skill.name)}</span>
                            <span class="text-sm text-emerald-600 font-semibold">${skill.level || 0}%</span>
                        </div>
                        <div class="w-full bg-slate-200 rounded-full h-2.5">
                            <div class="skill-bar h-2.5 rounded-full" style="width: ${skill.level || 0}%"></div>
                        </div>
                    </div>
                `).join('');
            }
        }

        const achievementsContainer = document.getElementById('keyAchievementsContainer');
        if (achievementsContainer) {
            if (user.achievements && user.achievements.length > 0) {
                achievementsContainer.parentElement.style.display = 'block';
                achievementsContainer.innerHTML = user.achievements.map(ach => `<div class="investment-card p-3 rounded-lg"><div class="flex items-center gap-3"><div class="w-10 h-10 achievement-badge rounded-lg flex items-center justify-center text-white text-sm font-bold">${ach.icon || '🏆'}</div><div><div class="font-semibold text-slate-800 text-sm">${escapeHTML(ach.title)}</div><div class="text-xs text-emerald-600 font-medium">${escapeHTML(ach.issuer)}</div></div></div></div>`).join('');
            } else {
                achievementsContainer.parentElement.style.display = 'none';
            }
        }
    }

    function createDashboardProjectCard(project) {
        const goal = project.fundingGoal?.amount || 0;
        const raised = project.fundingAmountRaised || 0;
        const currency = project.fundingGoal?.currency || t('js-currency-sar-symbol');
        const statusColors = {
            'draft': '#9ca3af', 'under-review': '#f59e0b', 'published': '#3b82f6',
            'funded': '#10b981', 'completed': '#10b981', 'closed': '#ef4444'
        };
        const borderColor = statusColors[project.status] || '#6b7280';
        let adminNoteHTML = '';
        if (project.status === 'closed' && project.adminNotes) {
            adminNoteHTML = `<div class="admin-note-display"><p><strong>${t('js-dashboard-project-card-reason')}:</strong> ${escapeHTML(project.adminNotes)}</p></div>`;
        }
        return `
            <div class="modal-project-card" style="border-left-color: ${borderColor};">
                <div>
                    <h5>${escapeHTML(project.projectName)}</h5>
                    <div class="funding-info project-funding">
                        <span>${t('js-dashboard-project-card-raised')}: <strong class="funding-value">${raised.toLocaleString()} ${currency}</strong></span> /
                        <span>${t('js-dashboard-project-card-goal')}: <strong class="funding-value" style="color: #059669;" >${goal.toLocaleString()} ${currency}</strong></span>
                    </div>
                    ${adminNoteHTML}
                </div>
                <div class="project-card-footer" style="margin-top: 1rem; text-align: end;">
                    <a href="project-view.html?id=${project._id}"
                     target="_blank"
                      class="text-blue-600 hover:text-blue-800 text-sm font-semibold">
                        ${t('view-details')}
                    </a>
                </div>
            </div>
        `;
    }

    function renderSortedModalProjects() {
        const modalBody = document.getElementById('statsModalBody');
        const sortValue = document.getElementById('modalSortFilter').value;
        const projectsToSort = [...currentModalProjects];
        if (sortValue === 'highest') {
            projectsToSort.sort((a, b) => (b.fundingAmountRaised || 0) - (a.fundingAmountRaised || 0));
        } else if (sortValue === 'lowest') {
            projectsToSort.sort((a, b) => (a.fundingAmountRaised || 0) - (b.fundingAmountRaised || 0));
        }
        if (projectsToSort.length === 0) {
            modalBody.innerHTML = `<p class="text-center text-gray-500 py-4">${t('js-dashboard-empty-projects')}</p>`;
            return;
        }
        modalBody.innerHTML = `<div class="modal-projects-grid">${projectsToSort.map(createDashboardProjectCard).join('')}</div>`;
    }

    function populateProjectDetailsModal(statusKey, statusLabel) {
        const modalTitle = document.getElementById('statsModalTitle');
        const sortFilter = document.getElementById('modalSortFilter');
        const keysToShowFundingSort = ['all', 'allActive', 'publishedUnfunded', 'fundingInProgress', 'fundedOrCompleted'];
        const shouldShowFundingSort = keysToShowFundingSort.includes(statusKey);
        if (projectSortContainer) projectSortContainer.style.display = shouldShowFundingSort ? 'flex' : 'none';
        if (investorSortContainer) investorSortContainer.style.display = 'none';
        if (proposalFilterContainer) proposalFilterContainer.style.display = 'none';
        if (!modalTitle || !sortFilter) return;
        modalTitle.textContent = `${t('js-dashboard-modal-project-list')}: ${statusLabel}`;
        sortFilter.value = 'default';
        let filteredProjects;
        if (statusKey === 'publishedUnfunded') {
            filteredProjects = allProjects.filter(p => p.status === 'published' && (p.fundingAmountRaised || 0) === 0);
        } else if (statusKey === 'fundingInProgress') {
            filteredProjects = allProjects.filter(p => p.status === 'published' && (p.fundingAmountRaised || 0) > 0);
        } else if (statusKey === 'fundedOrCompleted') {
            filteredProjects = allProjects.filter(p => ['funded', 'completed'].includes(p.status));
        } else if (statusKey === 'all') {
            filteredProjects = allProjects;
        } else if (statusKey === 'allActive') {
            const activeStatuses = ['published', 'funded', 'completed'];
            filteredProjects = allProjects.filter(p => activeStatuses.includes(p.status));
        } else {
            filteredProjects = allProjects.filter(p => p.status === statusKey);
        }
        currentModalProjects = filteredProjects;
        renderSortedModalProjects();
    }

    function bindProjectStatusCards() {
        const statusDataMap = {
            'stat-total-projects': { key: 'all', label: t('js-dashboard-label-total-projects') },
            'stat-published-unfunded': { key: 'publishedUnfunded', label: t('js-dashboard-label-published-unfunded') },
            'stat-funding-inprogress': { key: 'fundingInProgress', label: t('js-dashboard-label-funding-inprogress') },
            'stat-funded-completed': { key: 'fundedOrCompleted', label: t('js-dashboard-label-funded-completed') },
            'stat-draft-projects': { key: 'draft', label: t('js-dashboard-label-draft') },
            'stat-review-projects': { key: 'under-review', label: t('js-dashboard-label-review') },
            'stat-closed-projects': { key: 'closed', label: t('js-dashboard-label-closed') },
        };
        Object.keys(statusDataMap).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                const card = element.closest('.stat-card');
                if (card) {
                    card.style.cursor = 'pointer';
                    card.dataset.statusKey = statusDataMap[id].key;
                    card.dataset.statusLabel = statusDataMap[id].label;
                    card.addEventListener('click', () => {
                        populateProjectDetailsModal(card.dataset.statusKey, card.dataset.statusLabel);
                        openModal();
                    });
                }
            }
        });
    }

    function bindInteractionCards() {
        const topStatCards = {
            'activeProjectsCard': { key: 'allActive', label: t('js-dashboard-label-active-projects-details') },
            'fundingGoalCard': { key: 'allActive', label: t('js-dashboard-label-funding-details') },
            'fundingRaisedCard': { key: 'allActive', label: t('js-dashboard-label-funding-details') }
        };
        Object.keys(topStatCards).forEach(cardId => {
            const cardElement = document.getElementById(cardId);
            if (cardElement) {
                cardElement.style.cursor = 'pointer';
                cardElement.addEventListener('click', () => {
                    populateProjectDetailsModal(topStatCards[cardId].key, topStatCards[cardId].label);
                    openModal();
                });
            }
        });
        document.getElementById('participatingInvestorsCard')?.addEventListener('click', () => {
            populateParticipatingInvestorsModal();
            openModal();
        });
        document.getElementById('proposalsCard')?.addEventListener('click', () => {
            populateProposalsModal();
            openModal();
        });
        document.getElementById('viewsCard')?.addEventListener('click', () => { populateViewsModal(); openModal(); });
        document.getElementById('followersCard')?.addEventListener('click', () => { populateFollowersModal(); openModal(); });
    }

    function createProposalCard(proposal) {
        const { _id, investorId, projectId, partnershipType, proposedTerms, createdAt, status } = proposal;
        if (!investorId || !projectId) return '';
        let avatarHTML = '';
        if (investorId.profilePicture && investorId.profilePicture !== 'default-avatar.png' && investorId.profilePicture.startsWith('http')) {
            avatarHTML = `<img src="${investorId.profilePicture}" alt="${investorId.fullName}" class="w-12 h-12 rounded-full object-cover">`;
        } else {
            const initial = investorId.fullName ? investorId.fullName.charAt(0) : '?';
            avatarHTML = `<div class="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">${initial}</div>`;
        }
        const date = new Date(createdAt).toLocaleDateString('en-us', { day: 'numeric', month: 'long' });
        const typeMap = { 'strategic': t('js-dashboard-proposal-type-strategic'), 'expertise': t('js-dashboard-proposal-type-expertise'), 'advisory': t('js-dashboard-proposal-type-advisory'), 'hybrid': t('js-dashboard-proposal-type-hybrid') };

        const statusMap = {
            pending: { text: t('js-dashboard-proposal-status-pending'), class: 'status-pending' },
            accepted: { text: t('js-dashboard-proposal-status-accepted'), class: 'status-accepted' },
            rejected: { text: t('js-dashboard-proposal-status-rejected'), class: 'status-rejected' }
        };
        const statusInfo = statusMap[status] || { text: status, class: '' };

        let actionButton = '';
        if (status === 'pending') {
            actionButton = `<button class="respond-btn" onclick="openProposalResponseModal('${_id}', '${investorId._id}')">${t('js-dashboard-proposal-respond-btn')}</button>`;
        }

        return `
            <div class="proposal-card">
                <div class="flex items-start gap-4">
                    ${avatarHTML}
                    <div class="flex-1">
                        <div class="flex justify-between items-start">
                            <div>
                                <a href="public-profile.html?id=${investorId._id}" target="_blank" class="font-bold text-slate-800 hover:underline">${escapeHTML(investorId.fullName)}</a>
                                <p class="text-sm text-slate-600">${escapeHTML(investorId.profileTitle) || t('js-dashboard-investor-role')}</p>
                            </div>
                            <span class="proposal-status ${statusInfo.class}">${statusInfo.text}</span>
                        </div>
                        <span class="text-xs text-gray-500">${date}</span>
                    </div>
                </div>
                <div class="proposal-details">
                    <p class="text-xs text-gray-500 mb-2">${t('js-dashboard-proposal-for-project')}: <a href="project-view.html?id=${projectId._id}" target="_blank" class="font-semibold text-blue-600">${escapeHTML(projectId.projectName)}</a></p>
                    <div class="p-3 bg-slate-50 border rounded-lg">
                        <div class="text-sm font-semibold text-purple-800 mb-1">${t('js-dashboard-proposal-type-label')}: ${typeMap[partnershipType] || t('js-dashboard-proposal-type-custom')}</div>
                        <p class="text-xs text-gray-700">${escapeHTML(proposedTerms)}</p>
                    </div>
                    <div class="proposal-actions">
                        ${actionButton}
                    </div>
                </div>
            </div>`;
    }

    function renderFilteredProposals() {
        const modalBody = document.getElementById('statsModalBody');
        const filterValue = document.querySelector('#proposalFilterContainer .filter-btn.active').dataset.filter;

        let filteredProposals = receivedProposalsData;
        if (filterValue !== 'all') {
            filteredProposals = receivedProposalsData.filter(p => p.status === filterValue);
        }

        if (filteredProposals.length === 0) {
            modalBody.innerHTML = `<p class="text-center text-gray-500 py-4">${t('js-dashboard-empty-proposals')}</p>`;
            return;
        }
        modalBody.innerHTML = `<div class="modal-projects-grid">${filteredProposals.map(createProposalCard).join('')}</div>`;
    }

    function populateProposalsModal() {
        if (projectSortContainer) projectSortContainer.style.display = 'none';
        if (investorSortContainer) investorSortContainer.style.display = 'none';
        if (proposalFilterContainer) proposalFilterContainer.style.display = 'flex';

        const modalTitle = document.getElementById('statsModalTitle');
        modalTitle.textContent = t('js-dashboard-modal-proposals-title');

        document.querySelectorAll('#proposalFilterContainer .filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === 'all') {
                btn.classList.add('active');
            }
            btn.onclick = () => {
                document.querySelectorAll('#proposalFilterContainer .filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderFilteredProposals();
            };
        });

        renderFilteredProposals();
    }

    window.openProposalResponseModal = (proposalId, investorId) => {
        if (!proposalResponseModal) return;

        document.getElementById('acceptProposalBtn').onclick = () => handleProposalResponse(proposalId, 'accepted');
        document.getElementById('rejectProposalBtn').onclick = () => handleProposalResponse(proposalId, 'rejected');
        document.getElementById('requestInfoBtn').onclick = () => {
            window.location.href = `messages.html?userId=${investorId}`;
        };
        const responseForm = document.getElementById('responseForm');
        responseForm.onsubmit = (e) => e.preventDefault();

        closeModal();
        setTimeout(() => {
            proposalResponseModal.style.display = 'flex';
        }, 300);
    };

    async function handleProposalResponse(proposalId, status) {
        const responseMessage = document.getElementById('responseMessageText').value;
        const acceptBtn = document.getElementById('acceptProposalBtn');
        const rejectBtn = document.getElementById('rejectProposalBtn');
        const requestBtn = document.getElementById('requestInfoBtn');

        const clickedButton = status === 'accepted' ? acceptBtn : rejectBtn;
        const originalText = clickedButton.innerHTML;

        acceptBtn.disabled = true;
        rejectBtn.disabled = true;
        if (requestBtn) requestBtn.disabled = true;
        clickedButton.innerHTML = t('js-dashboard-sending-text');

        try {
            const response = await fetch(`${API_BASE_URL}/api/proposals/${proposalId}/respond`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status, responseMessage })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || t('js-dashboard-error-response-failed'));
            }
            alert(t('js-dashboard-success-response'));
            window.location.reload();
        } catch (error) {
            alert(`${t('js-dashboard-error-prefix')}: ${error.message}`);
            acceptBtn.disabled = false;
            rejectBtn.disabled = false;
            if (requestBtn) requestBtn.disabled = false;
            clickedButton.innerHTML = originalText;
        }
    }

    function closeResponseModal() {
        if (proposalResponseModal) {
            proposalResponseModal.style.display = 'none';
            document.getElementById('responseMessageText').value = '';
        }
    }

    if (closeResponseModalBtn) {
        closeResponseModalBtn.addEventListener('click', closeResponseModal);
    }

    function createInvestorCard(investment, baseUrl) {
        const { investor, project, amount, createdAt, investmentType, amountPaidNow, amountRemaining } = investment;
        if (!investor || !project) return '';
        let avatarHTML = '';
        if (investor.profilePicture && investor.profilePicture !== 'default-avatar.png' && investor.profilePicture.startsWith('http')) {
            avatarHTML = `<img src="${investor.profilePicture}" alt="${investor.fullName}" class="w-12 h-12 rounded-full object-cover">`;
        } else {
            const initial = investor.fullName ? investor.fullName.charAt(0) : '?';
            avatarHTML = `<div class="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">${initial}</div>`;
        }
        const currency = project.fundingGoal?.currency || t('js-currency-sar-symbol');
        const date = new Date(createdAt).toLocaleDateString('en-EN', { day: 'numeric', month: 'long', year: 'numeric' });
        const accountType = investor.accountType === 'investor' ? t('js-dashboard-investor-role') : t('js-dashboard-ideaholder-role');
        let financialDetailsHTML = '';
        if (investmentType === 'reservation') {
            financialDetailsHTML = `
                <div class="text-xs text-blue-700 font-semibold mb-2">${t('js-dashboard-investor-card-type-reservation')}</div>
                <div class="grid grid-cols-3 gap-2 text-center text-xs">
                    <div class="bg-gray-100 p-2 rounded">
                        <div class="text-gray-600">${t('js-dashboard-investor-card-total')}</div>
                        <div class="font-bold text-gray-800">${amount.toLocaleString()} ${currency}</div>
                    </div>
                    <div class="bg-green-100 p-2 rounded">
                        <div class="text-green-800">${t('js-dashboard-investor-card-paid')}</div>
                        <div class="font-bold text-green-800">${(amountPaidNow || 0).toLocaleString()} ${currency}</div>
                    </div>
                    <div class="bg-red-100 p-2 rounded">
                        <div class="text-red-800">${t('js-dashboard-investor-card-remaining')}</div>
                        <div class="font-bold text-red-800">${(amountRemaining || 0).toLocaleString()} ${currency}</div>
                    </div>
                </div>`;
        } else {
            financialDetailsHTML = `
                <div class="text-xs text-green-700 font-semibold mb-2">${t('js-dashboard-investor-card-type-full')}</div>
                <div class="bg-gray-100 p-3 rounded-lg text-center">
                    <div class="text-xs text-gray-600">${t('js-dashboard-investor-card-amount')}</div>
                    <div class="font-bold text-lg text-green-700">${amount.toLocaleString()} ${currency}</div>
                </div>`;
        }
        return `
            <div class="modal-project-card" style="border-left-color: #16a34a;">
                <div class="flex items-start gap-4">
                    ${avatarHTML}
                    <div class="flex-1">
                        <a href="public-profile.html?id=${investor._id}" target="_blank" class="font-bold text-slate-800 hover:underline">${escapeHTML(investor.fullName)}</a>
                        <p class="text-sm text-slate-600">${escapeHTML(investor.profileTitle) || accountType}</p>
                    </div>
                    <span class="text-xs text-gray-500">${date}</span>
                </div>
                 <div class="mt-4 border-t pt-3">
                    <p class="text-xs text-gray-500 mb-2">${t('js-dashboard-investor-card-invested-in')}: <a href="project-view.html?id=${project._id}" target="_blank" class="font-semibold text-blue-600">${escapeHTML(project.projectName)}</a></p>
                    ${financialDetailsHTML}
                 </div>
            </div>`;
    }

    function renderSortedInvestors() {
        const modalBody = document.getElementById('statsModalBody');
        const sortValue = document.getElementById('modalInvestorsSortFilter').value;
        const typeValue = document.getElementById('investmentTypeFilter').value;
        let investorsToProcess = [...participatingInvestorsData];
        if (typeValue !== 'all') {
            investorsToProcess = investorsToProcess.filter(inv => inv.investmentType === typeValue);
        }
        if (sortValue === 'highest') {
            investorsToProcess.sort((a, b) => b.amount - a.amount);
        } else if (sortValue === 'lowest') {
            investorsToProcess.sort((a, b) => a.amount - b.amount);
        } else {
            investorsToProcess.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        if (investorsToProcess.length === 0) {
            modalBody.innerHTML = `<p class="text-center text-gray-500 py-4">${t('js-dashboard-empty-investors')}</p>`;
            return;
        }
        modalBody.innerHTML = `<div class="modal-projects-grid">${investorsToProcess.map(inv => createInvestorCard(inv, API_BASE_URL)).join('')}</div>`;
    }

    function populateParticipatingInvestorsModal() {
        if (projectSortContainer) projectSortContainer.style.display = 'none';
        if (investorSortContainer) investorSortContainer.style.display = 'flex';
        if (proposalFilterContainer) proposalFilterContainer.style.display = 'none';
        const modalTitle = document.getElementById('statsModalTitle');
        const sortFilter = document.getElementById('modalInvestorsSortFilter');
        const typeFilter = document.getElementById('investmentTypeFilter');
        if (!modalTitle || !sortFilter || !typeFilter) return;
        modalTitle.textContent = t('js-dashboard-modal-investors-title');
        sortFilter.value = 'newest';
        typeFilter.value = 'all';
        renderSortedInvestors();
    }

    function populateViewsModal() {
        if (projectSortContainer) projectSortContainer.style.display = 'none';
        if (investorSortContainer) investorSortContainer.style.display = 'none';
        if (proposalFilterContainer) proposalFilterContainer.style.display = 'none';
        const modalBody = document.getElementById('statsModalBody');
        const modalTitle = document.getElementById('statsModalTitle');
        if (!modalBody || !modalTitle) return;
        modalTitle.textContent = t('js-dashboard-modal-views-title');
        modalBody.innerHTML = '';
        if (allProjects.length === 0) {
            modalBody.innerHTML = `<p>${t('js-dashboard-empty-projects-views')}</p>`;
            return;
        }
        let sortAscending = false;
        function renderTable(projects) {
            modalBody.innerHTML = `<table class="views-table"><thead><tr><th>${t('js-dashboard-views-table-project')}</th><th id="viewsSortHeader" class="sortable-header">${t('js-dashboard-views-table-views')} <span>↓</span></th></tr></thead><tbody>${projects.map(p => `<tr><td>${escapeHTML(p.projectName || t('js-dashboard-untitled'))}</td><td>${p.views || 0}</td></tr>`).join('')}</tbody></table>`;
            const sortHeader = document.getElementById('viewsSortHeader');
            if (sortHeader) {
                sortHeader.addEventListener('click', () => {
                    sortAscending = !sortAscending;
                    const sortedProjects = [...allProjects].sort((a, b) => sortAscending ? (a.views || 0) - (b.views || 0) : (b.views || 0) - (a.views || 0));
                    sortHeader.querySelector('span').textContent = sortAscending ? '↑' : '↓';
                    renderTable(sortedProjects);
                });
            }
        }
        const initialSortedProjects = [...allProjects].sort((a, b) => (b.views || 0) - (a.views || 0));
        renderTable(initialSortedProjects);
    }

    function populateFollowersModal() {
        if (projectSortContainer) projectSortContainer.style.display = 'none';
        if (investorSortContainer) investorSortContainer.style.display = 'none';
        if (proposalFilterContainer) proposalFilterContainer.style.display = 'none';
        const modalBody = document.getElementById('statsModalBody');
        const modalTitle = document.getElementById('statsModalTitle');
        if (!modalBody || !modalTitle) return;
        modalTitle.textContent = t('js-dashboard-modal-followers-title');
        modalBody.innerHTML = '';
        const projectsWithFollowers = allProjects.filter(p => p.followers && p.followers.length > 0);
        if (projectsWithFollowers.length === 0) {
            modalBody.innerHTML = `<p class="text-center text-gray-500 py-4">${t('js-dashboard-empty-followers')}</p>`;
            return;
        }
        const accordionContainer = document.createElement('div');
        accordionContainer.className = 'accordion-container';
        projectsWithFollowers.forEach(project => {
            const item = document.createElement('div');
            item.className = 'accordion-item';
            const followersHTML = project.followers.map(followerUser => createFollowerCard(followerUser, API_BASE_URL)).join('');
            item.innerHTML = `
                <div class="accordion-header">
                    <span class="project-title">${escapeHTML(project.projectName)}</span>
                    <div class="header-details">
                        <span class="follower-count">${project.followers.length} ${t('js-dashboard-follower-count-label')}</span>
                        <span class="accordion-icon">▼</span>
                    </div>
                </div>
                <div class="accordion-body">
                    <div class="modal-projects-grid">${followersHTML}</div>
                </div>
            `;
            accordionContainer.appendChild(item);
        });
        modalBody.appendChild(accordionContainer);
        accordionContainer.querySelectorAll('.accordion-header').forEach(header => {
            header.addEventListener('click', () => {
                const item = header.parentElement;
                const body = header.nextElementSibling;
                const icon = header.querySelector('.accordion-icon');
                const isActive = item.classList.contains('active');
                accordionContainer.querySelectorAll('.accordion-item').forEach(other => {
                    if (other !== item) {
                        other.classList.remove('active');
                        other.querySelector('.accordion-body').style.maxHeight = null;
                        other.querySelector('.accordion-icon').style.transform = 'rotate(0deg)';
                    }
                });
                if (!isActive) {
                    item.classList.add('active');
                    body.style.maxHeight = `${body.scrollHeight}px`;
                    icon.style.transform = 'rotate(180deg)';
                } else {
                    item.classList.remove('active');
                    body.style.maxHeight = null;
                    icon.style.transform = 'rotate(0deg)';
                }
            });
        });
    }

    function createFollowerCard(followerUser, baseUrl) {
        if (!followerUser) return '';
        const accountType = followerUser.accountType === 'investor' ? t('js-dashboard-investor-role') : t('js-dashboard-ideaholder-role');
        let avatarHTML = '';
        if (followerUser.profilePicture && followerUser.profilePicture !== 'default-avatar.png' && followerUser.profilePicture.startsWith('http')) {
            avatarHTML = `<img src="${followerUser.profilePicture}" alt="${followerUser.fullName}" class="w-12 h-12 rounded-full object-cover">`;
        } else {
            const initial = followerUser.fullName ? followerUser.fullName.charAt(0) : '?';
            avatarHTML = `<div class="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">${initial}</div>`;
        }
        return `
            <div class="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                ${avatarHTML}
                <div class="flex-1">
                    <a href="public-profile.html?id=${followerUser._id}" target="_blank" class="font-bold text-slate-800 hover:underline">${escapeHTML(followerUser.fullName)}</a>
                    <p class="text-sm text-slate-600">${escapeHTML(followerUser.profileTitle) || accountType}</p>
                </div>
            </div>
        `;
    }

    function openFollowersModal(followers, baseUrl) {
        const modalBody = document.getElementById('followersModalBody');
        if (!modalBody || !followersModal) return;
        if (!followers || followers.length === 0) {
            modalBody.innerHTML = `<p class="text-center text-gray-500">${t('js-dashboard-empty-followers-profile')}</p>`;
        } else {
            modalBody.innerHTML = followers.map(followerUser => createFollowerCard(followerUser, baseUrl)).join('');
        }
        followersModal.classList.remove('hidden');
    }

    function closeFollowersModal() {
        if (followersModal) followersModal.classList.add('hidden');
    }

    if (closeFollowersModalBtn) closeFollowersModalBtn.addEventListener('click', closeFollowersModal);
    if (followersModal) {
        followersModal.addEventListener('click', (e) => {
            if (e.target.id === 'followersModal') {
                closeFollowersModal();
            }
        });
    }
    if (profileTabButton) profileTabButton.addEventListener('click', () => switchTab('profile'));
    if (dashboardTabButton) dashboardTabButton.addEventListener('click', () => switchTab('dashboard'));
    if (closeStatsModalBtn) closeStatsModalBtn.addEventListener('click', closeModal);
    if (statsModalOverlay) statsModalOverlay.addEventListener('click', closeModal);
    if (modalSortFilter) modalSortFilter.addEventListener('change', renderSortedModalProjects);
    if (modalInvestorsSortFilter) modalInvestorsSortFilter.addEventListener('change', renderSortedInvestors);
    if (investmentTypeFilter) investmentTypeFilter.addEventListener('change', renderSortedInvestors);

    fetchData();
});

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match]));
}