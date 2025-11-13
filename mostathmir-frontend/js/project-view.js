const API_BASE_URL = 'https://mostathmir-api.onrender.com';
let currentProject = null;
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
document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('id');
    const token = localStorage.getItem('user_token');

    if (!projectId) {
        document.body.innerHTML = `<h1>${t('js-project-view-error-not-found')}</h1>`;
        return;
    }

    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const projectRes = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, { headers });

        if (!projectRes.ok) {
            const err = await projectRes.json();
            throw new Error(err.message || t('js-project-view-error-fetch-failed'));
        }

        const project = await projectRes.json();

        populatePage(project, API_BASE_URL);
        setupShareButton(project);
        fetchAndRenderSimilarProjects(project.projectCategory, projectId, API_BASE_URL);

        // Force re-translation after dynamic content is added
        if (window.translatePage) {
            window.translatePage();
        }

    } catch (error) {
        console.error(error);
        document.body.innerHTML = `<h1>${error.message}</h1>`;
    }

    const videoHeader = document.getElementById('videoAccordionHeader');
    if (videoHeader) {
        videoHeader.addEventListener('click', () => {
            const body = document.getElementById('videoAccordionBody');
            const icon = document.getElementById('videoAccordionIcon');
            const isHidden = body.style.display === 'none';
            body.style.display = isHidden ? 'block' : 'none';
            icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        });
    }

    const closeStatsModalBtn = document.getElementById('closeStatsModalBtn');
    const statsModalOverlay = document.getElementById('statsModalOverlay');
    if (closeStatsModalBtn) closeStatsModalBtn.addEventListener('click', closeModal);
    if (statsModalOverlay) statsModalOverlay.addEventListener('click', closeModal);
});

function populatePage(project, baseUrl) {
    currentProject = project;
    document.title = `${project.projectName} - ${t('js-project-view-page-title-suffix')}`;

    const currentUser = JSON.parse(localStorage.getItem('user_data'));
    const isOwner = currentUser && project.owner && currentUser._id === project.owner._id;

    const investorsCountEl = document.querySelector('#investorsCount');
    if (investorsCountEl) {
        investorsCountEl.textContent = project.investorsCount || 0;
    }

    const investorsCountWrapper = document.getElementById('investorsCountWrapper');
    if (investorsCountWrapper) {
        if (isOwner && project.investorDetails && project.investorDetails.length > 0) {
            investorsCountWrapper.classList.add('clickable');
            investorsCountWrapper.onclick = () => populateParticipatingInvestorsModal(project.investorDetails);
        } else {
            investorsCountWrapper.classList.remove('clickable');
            investorsCountWrapper.onclick = null;
        }
    }

    const followButton = document.getElementById('followButton');
    if (followButton) {
        if (currentUser && currentUser.accountType === 'investor') {
            followButton.style.display = 'flex';
            const isFollowing = project.followers && project.followers.includes(currentUser._id);
            updateFollowButtonState(isFollowing, project.followers.length);
        } else {
            followButton.style.display = 'none';
        }
    }

    const investButton = document.getElementById('investNowButton');
    const statusBadge = document.querySelector('.hero-gradient .bg-green-500');

    const isFunded = project.status === 'funded' || project.status === 'completed';

    if (statusBadge) {
        if (isFunded) {
            statusBadge.textContent = t('js-project-view-status-funded');
            statusBadge.classList.remove('bg-green-500');
            statusBadge.classList.add('bg-purple-600');
        } else {
            statusBadge.textContent = t('js-project-view-status-available');
            statusBadge.classList.remove('bg-purple-600');
            statusBadge.classList.add('bg-green-500');
        }
    }

    if (investButton) {
        if (isFunded) {
            investButton.textContent = t('js-project-view-btn-funded');
            investButton.disabled = true;
            investButton.style.backgroundColor = '#6b7280';
            investButton.style.cursor = 'not-allowed';
            investButton.onclick = null;
        } else if (isOwner) {
            if (project.status === 'draft' || project.status === 'needs-revision') {
                investButton.textContent = t('js-project-view-btn-complete-data');
            } else {
                investButton.textContent = t('js-project-view-btn-edit-project');
            }
            investButton.onclick = () => {
                window.location.href = `add-project-new.html?id=${project._id}`;
            };
        } else {
            investButton.textContent = t('js-project-view-btn-invest-now');
            investButton.disabled = false;
            investButton.onclick = () => {
                window.location.href = `invest.html?id=${project._id}`;
            };
        }
    }

    const heroTitle = document.querySelector('.hero-gradient h1');
    if (heroTitle) heroTitle.textContent = project.projectName;

    const heroDesc = document.querySelector('.hero-gradient p.text-xl');
    if (heroDesc) heroDesc.textContent = project.projectDescription;

    const heroOwner = document.getElementById('heroProjectOwner');
    if (heroOwner && project.owner) heroOwner.textContent = project.owner.fullName;

    const heroLocation = document.getElementById('heroProjectLocation');
    if (heroLocation && project.projectLocation) {
        heroLocation.textContent = `${project.projectLocation.city}, ${project.projectLocation.country}`;
    }

    const heroCategory = document.querySelector('.hero-gradient .bg-opacity-20');
    if (heroCategory && project.projectCategory) {
        // ابحث عن مفتاح الترجمة المطابق لقيمة الفئة
        const translationKey = categoryTranslationKeys[project.projectCategory];
        // استخدم الدالة t() لترجمة المفتاح، أو اعرض القيمة الأصلية إذا لم يتم العثور على مفتاح
        heroCategory.textContent = translationKey ? t(translationKey) : project.projectCategory;
    }

    const fundingGoal = project.fundingGoal ? project.fundingGoal.amount || 0 : 0;
    const currency = project.fundingGoal ? project.fundingGoal.currency || 'USD' : 'USD';
    const amountRaised = project.fundingAmountRaised || 0;
    const progressPercent = fundingGoal > 0 ? Math.round((amountRaised / fundingGoal) * 100) : 0;

    const heroFundingGoal = document.querySelector('.hero-gradient .text-3xl.font-bold');
    if (heroFundingGoal) heroFundingGoal.textContent = `${fundingGoal.toLocaleString()} ${currency}`;

    const heroFundingRaised = document.querySelector('.hero-gradient .flex.justify-between span:last-child');
    if (heroFundingRaised) heroFundingRaised.textContent = `${amountRaised.toLocaleString()} ${currency} (${progressPercent}%)`;

    const progressBar = document.querySelector('.funding-progress');
    if (progressBar) {
        setTimeout(() => { progressBar.style.width = `${progressPercent}%`; }, 300);
    }

    const heroReturn = document.getElementById('hero-expected-return');
    if (heroReturn) heroReturn.textContent = `${project.expectedReturn || 0}%`;

    const mainDesc = document.querySelector('.prose p:first-of-type');
    if (mainDesc) mainDesc.textContent = project.detailedDescription || project.projectDescription;

    const featuresContainer = document.getElementById('keyFeaturesContainer');
    if (featuresContainer && project.keyFeatures && project.keyFeatures.length > 0) {
        featuresContainer.innerHTML = project.keyFeatures.map(feature => `
            <div class="feature-card p-6 border rounded-lg">
                <div class="text-blue-600 text-3xl mb-4"></div>
                <h3 class="font-semibold text-gray-800 mb-2">${escapeHTML(feature)}</h3>
            </div>
        `).join('');
    } else if (featuresContainer) {
        featuresContainer.innerHTML = `<p class="text-gray-500">${t('js-project-view-no-features')}</p>`;
    }

    const heroProjectStage = document.getElementById('heroProjectStage');
    const stageMap = {
        'idea': t('js-project-view-stage-idea'),
        'in-progress': t('js-project-view-stage-in-progress'),
        'established': t('js-project-view-stage-established')
    };
    if (heroProjectStage && project.projectStage) {
        heroProjectStage.textContent = stageMap[project.projectStage];
    }

    const statusDetailsSection = document.getElementById('projectStatusDetailsSection');
    if (statusDetailsSection) {
        const statusDetailsContent = document.getElementById('projectStatusDetailsContent');
        if (project.projectStage === 'in-progress' && (project.completionPercentage != null || project.progressDetails)) {
            statusDetailsSection.style.display = 'block';
            let stageHTML = ``;
            if (project.completionPercentage != null) {
                stageHTML += `
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">${t('js-project-view-completion-rate')}</label>
                        <div class="w-full bg-gray-200 rounded-full h-4">
                            <div class="bg-blue-600 h-4 rounded-full text-center text-white text-xs leading-4" style="width: ${project.completionPercentage}%">${project.completionPercentage}%</div>
                        </div>
                    </div>`;
            }
            if (project.progressDetails) {
                stageHTML += `
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">${t('js-project-view-current-stage-details')}</label>
                        <p class="text-gray-600">${escapeHTML(project.progressDetails)}</p>
                    </div>`;
            }
            statusDetailsContent.innerHTML = stageHTML;
        } else {
            statusDetailsSection.style.display = 'none';
        }
    }

    const pastFinancialsSection = document.getElementById('pastFinancialsSection');
    const pastFinancialsTableBody = document.getElementById('pastFinancialsTableBody');
    if (project.projectStage === 'established' && project.pastFinancials && project.pastFinancials.length > 0) {
        pastFinancialsSection.style.display = 'block';
        pastFinancialsTableBody.innerHTML = project.pastFinancials.map(proj => `
            <tr class="border-b">
                <td class="py-3 font-medium">${escapeHTML(proj.year)}</td>
                <td class="py-3 text-green-600">${(proj.revenue || 0).toLocaleString()} ${currency}</td>
                <td class="py-3 text-red-600">${(proj.expenses || 0).toLocaleString()} ${currency}</td>
                <td class="py-3 font-semibold">${(proj.profit || 0).toLocaleString()} ${currency}</td>
            </tr>
        `).join('');
    }

    const financialsTableBody = document.getElementById('financialProjectionsTableBody');
    if (financialsTableBody && project.financialProjections && project.financialProjections.length > 0) {
        financialsTableBody.innerHTML = project.financialProjections.map(proj => `
            <tr class="border-b">
                <td class="py-3 font-medium">${t('js-project-view-year')} ${proj.year}</td>
                <td class="py-3 text-green-600">${(proj.revenue || 0).toLocaleString()} ${currency}</td>
                <td class="py-3 text-red-600">${(proj.expenses || 0).toLocaleString()} ${currency}</td>
                <td class="py-3 font-semibold">${(proj.profit || 0).toLocaleString()} ${currency}</td>
            </tr>
        `).join('');
    }

    const budgetContainer = document.getElementById('budgetBreakdownDisplayContainer');
    if (budgetContainer) {
        budgetContainer.innerHTML = '';
        if (project.fundingDetails && project.fundingDetails.length > 0 && project.fundingDetails[0].item) {
            project.fundingDetails.forEach(detail => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'budget-display-item mb-4';
                itemDiv.innerHTML = `
                    <div class="flex justify-between font-medium text-gray-700 mb-1">
                        <span>${escapeHTML(detail.item)}</span>
                        <span>${detail.percentage}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2.5">
                        <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${detail.percentage}%"></div>
                    </div>
                `;
                budgetContainer.appendChild(itemDiv);
            });
        } else {
            budgetContainer.innerHTML = `<p class="text-gray-500">${t('js-project-view-no-budget')}</p>`;
        }
    }

    if (project.owner) {
        const ownerNameEl = document.querySelector('.founder-card .font-semibold');
        const ownerProfileTitleEl = document.getElementById('founderProfileTitle');
        const ownerBioEl = document.getElementById('founderBio');
        const ownerAvatarEl = document.querySelector('.founder-card .w-16.h-16');
        const ownerSocialsEl = document.getElementById('founderSocialLinks');

        if (ownerNameEl) ownerNameEl.innerHTML = `<a href="./public-profile.html?id=${project.owner._id}" class="hover:underline">${project.owner.fullName}</a>`;
        if (ownerProfileTitleEl) ownerProfileTitleEl.textContent = project.owner.profileTitle || t('js-project-view-entrepreneur');
        if (ownerBioEl) ownerBioEl.textContent = project.owner.bio || '';

        if (ownerAvatarEl) {
            if (project.owner.profilePicture && project.owner.profilePicture !== 'default-avatar.png' && project.owner.profilePicture.startsWith('http')) {
                ownerAvatarEl.innerHTML = `<img src="${project.owner.profilePicture}" alt="${project.owner.fullName}" class="w-full h-full object-cover rounded-full">`;
            } else {
                ownerAvatarEl.textContent = project.owner.fullName.charAt(0);
            }
        }

        if (ownerSocialsEl) {
            ownerSocialsEl.innerHTML = '';
            if (project.owner.socialLinks && project.owner.socialLinks.length > 0) {
                project.owner.socialLinks.forEach(link => {
                    ownerSocialsEl.innerHTML += `<a href="https://${link.platform}.com/${link.url}" target="_blank" class="bg-white bg-opacity-20 px-2 py-1 rounded text-xs hover:bg-opacity-30">${link.platform}</a>`;
                });
            }
        }
    }

    document.getElementById('minInvestment').textContent = `${(project.minInvestment || 0).toLocaleString()} ${currency}`;
    document.getElementById('investmentPeriod').textContent = `${project.investmentPeriod || 12} ${t('js-project-view-months')}`;
    if (project.equityOffered != null) {
        document.getElementById('equityOffered').textContent = `${project.equityOffered}%`;
    } else {
        document.getElementById('equityOffered').textContent = t('js-project-view-not-specified');
    }

    const videoWrapper = document.getElementById('projectVideoWrapper');
    if (project.videoLink && videoWrapper) {
        videoWrapper.style.display = 'block';
        const videoContainer = document.getElementById('projectVideoContainer');
        const videoId = getYouTubeVideoId(project.videoLink);
        if (videoId && videoContainer) {
            videoContainer.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        }
    }

    populateFiles(project, baseUrl);
    setupCountdown(project);
}

function populateFiles(project, baseUrl) {
    const container = document.getElementById('projectFilesContainer');
    if (!container) return;
    container.innerHTML = '';
    let filesAvailable = false;
    if (project.businessPlan) {
        container.innerHTML += createFileLink(baseUrl + project.businessPlan, t('js-project-view-business-plan'));
        filesAvailable = true;
    }
    if (project.presentation) {
        container.innerHTML += createFileLink(baseUrl + project.presentation, t('js-project-view-presentation'));
        filesAvailable = true;
    }
    if (!filesAvailable) {
        container.innerHTML = `<p class="text-gray-500">${t('js-project-view-no-files')}</p>`;
    }
}

function createFileLink(url, name) {
    if (!url) return '';

    const fileName = url.split('/').pop();
    let finalUrl = url;

    if (!url.startsWith('http')) {
        finalUrl = `${API_BASE_URL}${url}`;
    }

    return `
        <a href="${finalUrl}" target="_blank" class="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
            <div class="text-red-500 text-2xl">📄</div>
            <div>
                <div class="font-semibold text-gray-800">${name}</div>
                <div class="text-sm text-gray-500">${fileName}</div>
            </div>
        </a>
    `;
}

function setupCountdown(project) {
    const timerElement = document.getElementById('countdown');
    if (!timerElement) return;

    if (project.createdAt && project.campaignDuration) {
        const startDate = new Date(project.createdAt);
        const endDate = new Date(startDate.setDate(startDate.getDate() + project.campaignDuration)).getTime();
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const distance = endDate - now;
            if (distance < 0) {
                clearInterval(interval);
                timerElement.textContent = "0";
                const timerLabel = timerElement.nextElementSibling;
                if (timerLabel) timerLabel.textContent = t('js-project-view-campaign-ended');
                return;
            }
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            timerElement.textContent = days;
        }, 1000);
    } else {
        timerElement.textContent = "N/A";
    }
}

async function fetchAndRenderSimilarProjects(category, currentProjectId, baseUrl) {
    const container = document.getElementById('similarProjectsContainer');
    if (!container) return;
    try {
        const response = await fetch(`${baseUrl}/api/projects/public`);
        if (!response.ok) return;
        let projects = await response.json();

        projects = projects.filter(p => p.projectCategory === category && p._id !== currentProjectId).slice(0, 2);

        if (projects.length > 0) {
            container.innerHTML = projects.map(p => `
                <a href="?id=${p._id}" class="block bg-gray-50 p-4 rounded-lg hover:bg-gray-100">
                    <h4 class="font-bold text-gray-800">${p.projectName}</h4>
                    <p class="text-sm text-gray-600">${p.projectDescription.substring(0, 50)}...</p>
                </a>
            `).join('');
        } else {
            container.innerHTML = `<p class="text-gray-500">${t('js-project-view-no-similar-projects')}</p>`;
        }
    } catch (error) {
        console.error("Failed to fetch similar projects:", error);
    }
}

function setupShareButton(project) {
    const shareButton = document.getElementById('shareButton');
    if (!shareButton) return;

    shareButton.addEventListener('click', async () => {
        const shareData = {
            title: `${t('js-project-view-share-title-prefix')}: ${project.projectName}`,
            text: `${t('js-project-view-share-text-prefix')}: ${project.projectDescription}`,
            url: window.location.href
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(window.location.href);
                alert(t('js-project-view-share-copied'));
            }
        } catch (err) {
            console.error("Error sharing:", err);
            try {
                await navigator.clipboard.writeText(window.location.href);
                alert(t('js-project-view-share-copied'));
            } catch (copyErr) {
                alert(t('js-project-view-share-error'));
            }
        }
    });
}

function goBack() {
    window.history.back();
}

function getYouTubeVideoId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match]));
}

async function handleFollowClick() {
    const token = localStorage.getItem('user_token');
    if (!token || !currentProject) return;

    const followButton = document.getElementById('followButton');
    followButton.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/api/projects/${currentProject._id}/follow`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || t('js-project-view-error-follow-failed'));

        updateFollowButtonState(data.isFollowing, data.followersCount);

    } catch (error) {
        alert(error.message);
    } finally {
        followButton.disabled = false;
    }
}

function updateFollowButtonState(isFollowing, count) {
    const followButtonText = document.getElementById('followButtonText');
    const followButtonIcon = document.getElementById('followButtonIcon');
    const followersCountSpan = document.getElementById('followersCount'); // Make sure you have this element in HTML if needed

    if (followersCountSpan) {
        followersCountSpan.textContent = count;
    }

    if (!followButtonText || !followButtonIcon) return;

    if (isFollowing) {
        followButtonText.textContent = t('js-project-view-unfollow-btn');
        followButtonIcon.textContent = '♥';
        followButtonIcon.style.color = '#f5576c';
    } else {
        followButtonText.textContent = t('js-project-view-follow-btn');
        followButtonIcon.textContent = '♡';
        followButtonIcon.style.color = 'white';
    }
}

function openModal() {
    const statsModal = document.getElementById('statsModal');
    const statsModalOverlay = document.getElementById('statsModalOverlay');
    if (statsModal && statsModalOverlay) {
        statsModal.style.display = 'block';
        statsModalOverlay.style.display = 'block';
    }
}

function closeModal() {
    const statsModal = document.getElementById('statsModal');
    const statsModalOverlay = document.getElementById('statsModalOverlay');
    if (statsModal && statsModalOverlay) {
        statsModal.style.display = 'none';
        statsModalOverlay.style.display = 'none';
    }
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
    const currency = project.fundingGoal?.currency || 'USD';
    const date = new Date(createdAt).toLocaleDateString('en-us', { day: 'numeric', month: 'long', year: 'numeric' });
    const accountType = investor.accountType === 'investor' ? t('js-public-profile-role-investor') : t('js-public-profile-role-ideaholder');
    let financialDetailsHTML = '';
    if (investmentType === 'reservation') {
        financialDetailsHTML = `
            <div class="text-xs text-blue-700 font-semibold mb-2">${t('js-project-view-investor-card-type-reservation')}</div>
            <div class="grid grid-cols-3 gap-2 text-center text-xs">
                <div class="bg-gray-100 p-2 rounded"><div class="text-gray-600">${t('js-project-view-investor-card-total')}</div><div class="font-bold text-gray-800">${amount.toLocaleString()} ${currency}</div></div>
                <div class="bg-green-100 p-2 rounded"><div class="text-green-800">${t('js-project-view-investor-card-paid')}</div><div class="font-bold text-green-800">${(amountPaidNow || 0).toLocaleString()} ${currency}</div></div>
                <div class="bg-red-100 p-2 rounded"><div class="text-red-800">${t('js-project-view-investor-card-remaining')}</div><div class="font-bold text-red-800">${(amountRemaining || 0).toLocaleString()} ${currency}</div></div>
            </div>`;
    } else {
        financialDetailsHTML = `
            <div class="text-xs text-green-700 font-semibold mb-2">${t('js-project-view-investor-card-type-full')}</div>
            <div class="bg-gray-100 p-3 rounded-lg text-center">
                <div class="text-xs text-gray-600">${t('js-project-view-investor-card-amount')}</div>
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
                <p class="text-xs text-gray-500 mb-2">${t('js-project-view-investor-card-invested-in')}: <a href="project-view.html?id=${project._id}" target="_blank" class="font-semibold text-blue-600">${escapeHTML(project.projectName)}</a></p>
                ${financialDetailsHTML}
             </div>
        </div>`;
}

function renderSortedInvestors(investorsToProcess) {
    const modalBody = document.getElementById('statsModalBody');
    const sortValue = document.getElementById('modalInvestorsSortFilter').value;
    const typeValue = document.getElementById('investmentTypeFilter').value;

    let filteredInvestors = [...investorsToProcess];
    if (typeValue !== 'all') {
        filteredInvestors = filteredInvestors.filter(inv => inv.investmentType === typeValue);
    }

    if (sortValue === 'highest') {
        filteredInvestors.sort((a, b) => b.amount - a.amount);
    } else if (sortValue === 'lowest') {
        filteredInvestors.sort((a, b) => a.amount - b.amount);
    } else {
        filteredInvestors.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    if (filteredInvestors.length === 0) {
        modalBody.innerHTML = `<p class="text-center text-gray-500 py-4">${t('js-project-view-empty-investors')}</p>`;
        return;
    }
    modalBody.innerHTML = `<div class="modal-projects-grid">${filteredInvestors.map(inv => createInvestorCard(inv, API_BASE_URL)).join('')}</div>`;
}

function populateParticipatingInvestorsModal(investors) {
    const modalTitle = document.getElementById('statsModalTitle');
    const investorSortContainer = document.getElementById('investorSortContainer');
    const modalInvestorsSortFilter = document.getElementById('modalInvestorsSortFilter');
    const investmentTypeFilter = document.getElementById('investmentTypeFilter');

    if (investorSortContainer) investorSortContainer.style.display = 'flex';
    if (modalTitle) modalTitle.textContent = t('js-project-view-modal-investors-title');

    renderSortedInvestors(investors);

    modalInvestorsSortFilter.onchange = () => renderSortedInvestors(investors);
    investmentTypeFilter.onchange = () => renderSortedInvestors(investors);

    openModal();
}