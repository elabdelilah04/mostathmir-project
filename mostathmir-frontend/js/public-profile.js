// const API_BASE_URL = 'https://mostathmir-api.onrender.com';
let currentProfileUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('id');

    // التأكد من وجود دالة الترجمة قبل أي شيء آخر
    if (typeof t !== 'function') {
        console.error('Translation function t() is not available. Make sure translation.js is loaded correctly and before this script.');
        // عرض رسالة خطأ للمستخدم في حال عدم وجود الترجمة
        document.body.innerHTML = "<div class='container mx-auto p-8 text-center'><h1>Error: Translation library failed to load.</h1></div>";
        return;
    }

    if (!userId) {
        document.body.innerHTML = `<div class='container mx-auto p-8 text-center'><h1>${t('js-public-profile-error-user-not-found')}</h1></div>`;
        return;
    }

    try {
        const token = localStorage.getItem('user_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}/api/users/${userId}/public`, { headers });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || t('js-public-profile-error-fetch-failed'));
        }

        const data = await response.json();
        const { user, projects, investorsCount, canAddTestimonial, investorData } = data;
        currentProfileUser = user;

        document.title = `${user.fullName} - ${t('js-public-profile-page-title-suffix')}`;

        populatePage(user, projects, investorsCount, API_BASE_URL, investorData);
        setupFollowButton(user);
        setupContactButton(user);

        if (canAddTestimonial) {
            setupTestimonialForm(userId);
        }

        // Force re-translation after dynamic content is added
        if (window.translatePage) {
            window.translatePage();
        }

    } catch (error) {
        console.error(error);
        document.body.innerHTML = `<div class='container mx-auto p-8 text-center'><h1>${t('js-public-profile-error-generic')}: ${error.message}</h1></div>`;
    }
});

async function openContactModal() {
    const modal = document.getElementById('contactModal');
    const overlay = document.getElementById('contactModalOverlay');
    const title = document.getElementById('contactModalTitle');
    const subjectSelect = document.getElementById('contactSubject');
    const projectsContainer = document.getElementById('projectsSelectContainer');
    const projectsSelect = document.getElementById('relatedProject');
    const investmentOption = subjectSelect.querySelector('option[value="اقتراح استثمار"]');

    if (!modal || !overlay || !title || !subjectSelect || !projectsContainer || !projectsSelect || !investmentOption) return;

    title.textContent = `${t('js-public-profile-contact-modal-title')} ${currentProfileUser.fullName}`;
    projectsContainer.style.display = 'none';
    projectsSelect.innerHTML = `<option value="">${t('js-public-profile-contact-select-project')}</option>`;

    const currentUser = JSON.parse(localStorage.getItem('user_data'));

    if (currentUser && currentUser.accountType === 'ideaHolder' && currentProfileUser.accountType === 'investor') {
        investmentOption.style.display = 'block';
        const token = localStorage.getItem('user_token');
        try {
            const response = await fetch(`${API_BASE_URL}/api/projects/myprojects`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const myProjects = await response.json();
                if (myProjects.length > 0) {
                    myProjects.forEach(p => {
                        const option = new Option(p.projectName, p._id);
                        projectsSelect.add(option);
                    });
                }
            }
        } catch (error) {
            console.error("Failed to fetch user's projects:", error);
        }
    } else {
        investmentOption.style.display = 'none';
    }

    subjectSelect.onchange = () => {
        if (subjectSelect.value === 'اقتراح استثمار') { // لا يزال يعتمد على القيمة الخام هنا
            projectsContainer.style.display = 'block';
        } else {
            projectsContainer.style.display = 'none';
        }
    };

    modal.style.display = 'block';
    overlay.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('visible');
        overlay.classList.add('visible');
    }, 10);
}

function closeContactModal() {
    const modal = document.getElementById('contactModal');
    const overlay = document.getElementById('contactModalOverlay');
    if (modal && overlay) {
        modal.classList.remove('visible');
        overlay.classList.remove('visible');
        setTimeout(() => {
            modal.style.display = 'none';
            overlay.style.display = 'none';
            document.getElementById('contactMessage').value = '';
            document.getElementById('contactSubject').value = 'عام'; // القيمة الخام
            document.getElementById('projectsSelectContainer').style.display = 'none';
        }, 300);
    }
}

async function handleSendMessage(event) {
    event.preventDefault();
    const messageText = document.getElementById('contactMessage').value;
    const subject = document.getElementById('contactSubject').value;
    const relatedProject = document.getElementById('relatedProject').value;
    const token = localStorage.getItem('user_token');

    if (!token) {
        alert(t('js-public-profile-alert-login-required'));
        window.location.href = './login.html';
        return;
    }

    if (!messageText.trim()) {
        alert(t('js-public-profile-alert-write-message'));
        return;
    }

    if (subject === 'اقتراح استثمار' && !relatedProject) { // القيمة الخام
        alert(t('js-public-profile-alert-select-project'));
        return;
    }

    const submitButton = document.querySelector('#contactForm button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = t('js-public-profile-sending-text');

    try {
        const response = await fetch(`${API_BASE_URL}/api/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                recipientId: currentProfileUser._id,
                content: messageText,
                subject: subject,
                relatedProject: subject === 'اقتراح استثمار' ? relatedProject : null
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || t('js-public-profile-error-send-failed'));
        }

        alert(t('js-public-profile-success-message-sent'));
        closeContactModal();

    } catch (error) {
        alert(`${t('js-public-profile-error-generic')}: ${error.message}`);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    }
}

function setupContactButton(profileUser) {
    const contactButton = document.getElementById('contactUserButton');
    if (!contactButton) return;
    const currentUserId = localStorage.getItem('user_id');
    if (currentUserId && currentUserId === profileUser._id) {
        contactButton.style.display = 'none';
        return;
    }
    contactButton.addEventListener('click', openContactModal);
    document.getElementById('closeContactModal').addEventListener('click', closeContactModal);
    document.getElementById('cancelContact').addEventListener('click', closeContactModal);
    document.getElementById('contactModalOverlay').addEventListener('click', closeContactModal);
    document.getElementById('contactForm').addEventListener('submit', handleSendMessage);
}

function populateStarRating(testimonials) {
    const ratingContainer = document.getElementById('profile-rating-stars');
    if (!ratingContainer) return;

    if (!testimonials || testimonials.length === 0) {
        ratingContainer.innerHTML = `
            <div class="flex items-center gap-1 text-gray-300">
                <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>
            </div>
            <span class="text-xs text-gray-500 ml-2"> (${t('js-public-profile-no-ratings')})</span>
        `;
        return;
    }

    const totalRating = testimonials.reduce((sum, t) => sum + t.rating, 0);
    const averageRating = totalRating / testimonials.length;
    const roundedAverage = Math.round(averageRating * 2) / 2;
    let starsHTML = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= roundedAverage) { starsHTML += `<i class="fas fa-star text-yellow-400"></i>`; }
        else if (i - 0.5 === roundedAverage) { starsHTML += `<i class="fas fa-star-half-alt text-yellow-400"></i>`; }
        else { starsHTML += `<i class="far fa-star text-gray-300"></i>`; }
    }
    ratingContainer.innerHTML = `
        <div class="flex items-center gap-1">${starsHTML}</div>
        <span class="text-sm text-gray-600 font-semibold ml-2">
            ${averageRating.toFixed(1)} 
            <span class="text-xs text-gray-500 font-normal">(${testimonials.length} ${t('js-public-profile-ratings-count')})</span>
        </span>`;
}

async function populatePage(user, projects, investorsCount, baseUrl, investorData) {
    const avatarContainer = document.getElementById('avatarContainer');
    if (avatarContainer) {
        if (user.profilePicture && user.profilePicture !== 'default-avatar.png' && user.profilePicture.startsWith('http')) {
            avatarContainer.innerHTML = `<img src="${user.profilePicture}" alt="${user.fullName}" class="w-full h-full object-cover rounded-full">`;
        } else {
            avatarContainer.textContent = user.fullName ? user.fullName.charAt(0) : 'U';
        }
    }

    document.getElementById('fullName').textContent = user.fullName || '';
    document.getElementById('profileTitle').textContent = user.profileTitle || '';

    const accountTypeEl = document.getElementById('accountType');
    if (accountTypeEl) {
        accountTypeEl.textContent = user.accountType === 'investor' ? t('js-public-profile-role-investor') : t('js-public-profile-role-ideaholder');
    }

    document.getElementById('location').textContent = user.location || '';

    const ideaHolderStats = document.getElementById('ideaHolderStatsContainer');
    const investorStats = document.getElementById('investorStatsContainer');
    const ideaHolderProjects = document.getElementById('ideaHolderProjectsSection');
    const investorProjects = document.getElementById('investorProjectsSection');
    const testimonialsSection = document.getElementById('testimonialsSection');
    const emptySectionMessage = (messageKey) => `<div class="text-center p-4 bg-slate-50 rounded-lg"><p class="text-slate-500 text-sm">${t(messageKey)}</p></div>`;

    if (user.accountType === 'investor') {
        ideaHolderStats.style.display = 'none';
        investorStats.style.display = 'grid';
        ideaHolderProjects.style.display = 'none';
        investorProjects.style.display = 'block';
        testimonialsSection.style.display = 'none';

        if (investorData && investorData.stats) {
            const stats = investorData.stats;
            const groupedInvestments = investorData.investments; 

            document.getElementById('public-stat-investments').textContent = stats.investmentsCount || 0;
            document.getElementById('public-stat-partners').textContent = stats.partnersCount || 0;

            const investmentsGrid = document.getElementById('investmentsGrid');
            
            if (groupedInvestments && groupedInvestments.length > 0) {
                investmentsGrid.innerHTML = groupedInvestments.map(item => createGroupedInvestmentCard(item)).join('');
            } else {
                investmentsGrid.innerHTML = emptySectionMessage('js-public-profile-empty-investments');
            }
        }
    } else {
        ideaHolderStats.style.display = 'grid';
        investorStats.style.display = 'none';
        ideaHolderProjects.style.display = 'block';
        investorProjects.style.display = 'none';
        testimonialsSection.style.display = 'block';

        document.getElementById('projectsCountStat').textContent = projects ? projects.length : 0;
        document.getElementById('investorsCountStat').textContent = investorsCount || 0;
        document.getElementById('followersCountStat').textContent = user.followers ? user.followers.length : 0;
        populateStarRating(user.testimonials);
        renderTestimonials(user.testimonials);

        if (projects && projects.length > 0) {
            const fundingProjects = projects.filter(p => p.status === 'published');
            const completedProjects = projects.filter(p => p.status === 'funded' || p.status === 'completed');
            const fundingSection = document.getElementById('fundingProjectsSection');
            const completedSection = document.getElementById('completedProjectsSection');
            const fundingGrid = document.getElementById('fundingProjectsGrid');
            const completedGrid = document.getElementById('completedProjectsGrid');
            if (fundingProjects.length > 0) {
                fundingGrid.innerHTML = fundingProjects.map(p => createPublicProjectCard(p, baseUrl)).join('');
                fundingSection.style.display = 'block';
            }
            if (completedProjects.length > 0) {
                completedGrid.innerHTML = completedProjects.map(p => createPublicProjectCard(p, baseUrl)).join('');
                completedSection.style.display = 'block';
            }
            if (fundingProjects.length === 0 && completedProjects.length === 0) {
                if (ideaHolderProjects) ideaHolderProjects.innerHTML += emptySectionMessage('js-public-profile-empty-projects-ideaholder');
            }
        } else {
            if (ideaHolderProjects) ideaHolderProjects.innerHTML += emptySectionMessage('js-public-profile-empty-projects-ideaholder');
        }
    }

    const socialContainer = document.getElementById('publicSocialLinksContainer');
    if (socialContainer) {
        socialContainer.innerHTML = '';
        if (user.socialLinks && user.socialLinks.length > 0) {
            const iconMap = { linkedin: 'fab fa-linkedin-in', twitter: 'fab fa-twitter', facebook: 'fab fa-facebook-f', instagram: 'fab fa-instagram', github: 'fab fa-github', website: 'fas fa-globe' };
            user.socialLinks.forEach(link => {
                const linkElement = document.createElement('a');
                linkElement.href = link.url.startsWith('http') ? link.url : `https://${link.platform}.com/${link.url}`;
                linkElement.target = '_blank';
                linkElement.rel = 'noopener noreferrer';
                linkElement.className = 'w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-colors';
                linkElement.innerHTML = `<i class="${iconMap[link.platform] || 'fas fa-link'}"></i>`;
                socialContainer.appendChild(linkElement);
            });
        }
    }

    const bioContainer = document.getElementById('bioContainer');
    if (bioContainer) {
        if (user.bio && user.bio.trim()) bioContainer.innerHTML = user.bio.replace(/\n/g, '<p>');
        else bioContainer.innerHTML = emptySectionMessage('js-public-profile-empty-bio');
    }
    const experienceContainer = document.getElementById('experienceContainer');
    if (experienceContainer) {
        if (user.professionalExperience && user.professionalExperience.length > 0) {
            experienceContainer.innerHTML = user.professionalExperience.map(exp => `<div class="flex gap-4"><div class="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0 shadow-lg">${exp.company ? exp.company.substring(0, 2).toUpperCase() : '🏢'}</div><div class="flex-1"><h3 class="font-semibold text-slate-800">${escapeHTML(exp.title)}</h3><p class="text-emerald-600 font-semibold">${escapeHTML(exp.company)}</p><p class="text-sm text-slate-600 mb-2">${escapeHTML(exp.period)}</p><p class="text-slate-600 text-sm">${escapeHTML(exp.description)}</p></div></div>`).join('');
        } else {
            experienceContainer.innerHTML = emptySectionMessage('js-public-profile-empty-experience');
        }
    }
    const educationContainer = document.getElementById('educationContainer');
    if (educationContainer) {
        if (user.education && user.education.length > 0) {
            educationContainer.innerHTML = user.education.map(edu => `<div class="flex gap-4"><div class="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0 shadow-lg">🎓</div><div><h3 class="font-semibold text-slate-800">${escapeHTML(edu.degree)}</h3><p class="text-emerald-600 font-semibold">${escapeHTML(edu.institution)}</p><p class="text-sm text-slate-600">${escapeHTML(edu.details)}</p></div></div>`).join('');
        } else {
            educationContainer.innerHTML = emptySectionMessage('js-public-profile-empty-education');
        }
    }
    const skillsContainer = document.querySelector('#skillsContainer');
    if (skillsContainer) {
        if (user.skills && user.skills.length > 0) {
            skillsContainer.innerHTML = user.skills.map(skill => `<div><div class="flex justify-between mb-1"><span class="text-sm text-slate-700 font-medium">${escapeHTML(skill.name)}</span><span class="text-sm text-emerald-600 font-semibold">${skill.level || 0}%</span></div><div class="w-full bg-slate-200 rounded-full h-2.5"><div class="skill-bar h-2.5 rounded-full" style="width: ${skill.level || 0}%"></div></div></div>`).join('');
        } else {
            skillsContainer.innerHTML = emptySectionMessage('js-public-profile-empty-skills');
        }
    }
    const achievementsContainer = document.getElementById('keyAchievementsContainer');
    if (achievementsContainer) {
        if (user.achievements && user.achievements.length > 0) {
            achievementsContainer.innerHTML = user.achievements.map(ach => `<div class="investment-card p-3 rounded-lg"><div class="flex items-center gap-3"><div class="w-10 h-10 achievement-badge rounded-lg flex items-center justify-center text-white text-sm font-bold">${ach.icon || '🏆'}</div><div><div class="font-semibold text-slate-800 text-sm">${escapeHTML(ach.title)}</div><div class="text-xs text-emerald-600 font-medium">${escapeHTML(ach.issuer)}</div></div></div></div>`).join('');
        } else {
            achievementsContainer.innerHTML = emptySectionMessage('js-public-profile-empty-achievements');
        }
    }
}

function createGroupedInvestmentCard(item) {
    const { 
        projectId, 
        projectName, 
        projectDescription, 
        projectStatus, 
        totalAmount, 
        count, 
        lastDate, 
        currency,
        fundingGoal,
        equityOffered 
    } = item;
    
    const dateStr = new Date(lastDate).toLocaleDateString('en-EG');
    const statusText = projectStatus === 'published' ? t('js-public-profile-project-status-funding') : t('js-public-profile-project-status-completed');
    const borderClass = projectStatus === 'published' ? 'border-l-blue-500' : 'border-l-emerald-500';

    // حساب نسبة الملكية (بسيط الآن لأن الأرقام جاهزة)
    let totalEquity = 0;
    if (fundingGoal > 0 && equityOffered > 0) {
        totalEquity = (totalAmount / fundingGoal) * equityOffered;
    }

    return `
    <a href="./project-view.html?id=${projectId}" target="_blank" class="block h-full">
        <div class="public-invest-card ${borderClass}">
            
            <!-- الصف العلوي -->
            <div class=" phonewidth flex justify-between items-start mb-3">
                <span class="status-badge-soft">${statusText}</span>
                <h3 class="font-bold text-gray-800 text-lg text-right truncate w-2/3" title="${escapeHTML(projectName)}">
                    ${escapeHTML(projectName)}
                </h3>
            </div>

            <!-- الوصف -->
            <p class="text-gray-500 text-sm mb-4 text-right line-clamp-2 h-10">
                ${escapeHTML(projectDescription)}
            </p>

            <!-- الصف الأوسط -->
            <div class="flex justify-between items-center mb-4 bg-gray-50 p-2 rounded-lg">
                <span class="text-xs text-gray-500">${t('js-portfolio-investment-date')}: ${dateStr}</span>
                <span class="ops-badge">${count} عمليات</span>
            </div>

            <div class="border-t border-dashed border-gray-300 my-3"></div>

            <!-- الصف السفلي -->
            <div class="flex justify-between items-end">
                <div class="text-left">
                    <span class="block text-xs text-gray-400 mb-1">حصة الملكية</span>
                    <span class="text-lg font-bold text-purple-600">${totalEquity.toFixed(2)}%</span>
                </div>
                <div class="text-right">
                    <span class="block text-xs text-gray-400 mb-1">إجمالي استثمارك</span>
                    <span class="text-lg font-bold text-emerald-600">
                        ${currency} ${totalAmount.toLocaleString()}
                    </span>
                </div>
            </div>
        </div>
    </a>
    `;
}

function renderTestimonials(testimonials) {
    const testimonialsContainer = document.getElementById('testimonialsContainer');
    const emptySectionMessage = (messageKey) => `<div class="text-center p-4 bg-slate-50 rounded-lg"><p class="text-slate-500 text-sm">${t(messageKey)}</p></div>`;
    const currentUserId = localStorage.getItem('user_id');
    if (testimonials && testimonials.length > 0) {
        testimonialsContainer.innerHTML = testimonials.map(testimonial => { // *** التعديل هنا: تغيير 't' إلى 'testimonial' ***
            let starsHTML = '';
            for (let i = 1; i <= 5; i++) {
                starsHTML += `<i class="fas fa-star ${i <= testimonial.rating ? 'text-yellow-400' : 'text-gray-300'}"></i>`;
            }
            const isAuthor = currentUserId && currentUserId === testimonial.authorId;
            const authorControlsHTML = isAuthor ? `
                <div class="testimonial-controls">
                    <button class="control-btn edit-btn" title="${t('js-public-profile-edit-testimonial')}" onclick="handleEditTestimonial('${testimonial._id}')"><i class="fas fa-edit"></i></button>
                    <button class="control-btn delete-btn" title="${t('js-public-profile-delete-testimonial')}" onclick="handleDeleteTestimonial('${testimonial._id}')"><i class="fas fa-trash"></i></button>
                </div>
            ` : '';
            return `
            <div id="testimonial-${testimonial._id}" class="testimonial-card border-r-4 border-emerald-500 pr-4 bg-slate-50 p-4 rounded-lg relative">
                ${authorControlsHTML}
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center text-white font-medium shadow-lg">${testimonial.authorName.charAt(0)}</div>
                        <div>
                            <div class="font-semibold text-slate-800">${escapeHTML(testimonial.authorName)}</div>
                            <div class="text-xs text-emerald-600 font-medium">${escapeHTML(testimonial.authorRole)}</div>
                        </div>
                    </div>
                    <div class="testimonial-rating text-sm">${starsHTML}</div>
                </div>
                <p class="text-slate-600 text-sm leading-relaxed">"${escapeHTML(testimonial.quote)}"</p>
            </div>
        `;
        }).join('');
    } else {
        testimonialsContainer.innerHTML = emptySectionMessage('js-public-profile-empty-testimonials');
    }
}

function setupTestimonialForm(userId) {
    const container = document.getElementById('addTestimonialContainer');
    const form = document.getElementById('addTestimonialForm');
    const ratingContainer = document.getElementById('rating-input-container');
    const stars = ratingContainer.querySelectorAll('i');

    if (!container || !form || !ratingContainer) return;

    container.style.display = 'block';

    stars.forEach(star => {
        star.addEventListener('mouseover', () => {
            const ratingValue = star.dataset.value;
            stars.forEach(s => {
                s.classList.toggle('text-yellow-400', s.dataset.value <= ratingValue);
                s.classList.toggle('text-gray-300', s.dataset.value > ratingValue);
            });
        });

        star.addEventListener('mouseout', () => {
            const currentRating = ratingContainer.dataset.rating;
            stars.forEach(s => {
                s.classList.toggle('text-yellow-400', s.dataset.value <= currentRating);
                s.classList.toggle('text-gray-300', s.dataset.value > currentRating);
            });
        });

        star.addEventListener('click', () => {
            ratingContainer.dataset.rating = star.dataset.value;
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const quoteTextarea = document.getElementById('testimonialQuote');
        const quote = quoteTextarea.value.trim();
        const rating = parseInt(ratingContainer.dataset.rating, 10);
        const token = localStorage.getItem('user_token');

        if (!quote) {
            alert(t('js-public-profile-alert-write-testimonial'));
            return;
        }
        if (rating === 0) {
            alert(t('js-public-profile-alert-select-rating'));
            return;
        }

        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = t('js-public-profile-sending-text');

        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${userId}/testimonials`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ quote, rating })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || t('js-public-profile-error-testimonial-failed'));
            }

            const updatedTestimonials = await response.json();
            renderTestimonials(updatedTestimonials);
            quoteTextarea.value = '';
            ratingContainer.dataset.rating = 0;
            stars.forEach(s => s.classList.replace('text-yellow-400', 'text-gray-300'));
            alert(t('js-public-profile-success-testimonial-added'));

        } catch (error) {
            alert(`${t('js-public-profile-error-generic')}: ${error.message}`);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });
}

async function handleDeleteTestimonial(testimonialId) {
    if (!testimonialId || testimonialId === 'undefined') {
        console.error("Invalid testimonial ID:", testimonialId);
        alert(t('js-public-profile-error-invalid-testimonial-id'));
        return;
    }
    if (!confirm(t('js-public-profile-confirm-delete-testimonial'))) {
        return;
    }
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('id');
    const token = localStorage.getItem('user_token');
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/${userId}/testimonials/${testimonialId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || t('js-public-profile-error-delete-testimonial-failed'));
        }

        const updatedTestimonials = await response.json();
        renderTestimonials(updatedTestimonials);
        alert(t('js-public-profile-success-testimonial-deleted'));

    } catch (error) {
        alert(`${t('js-public-profile-error-generic')}: ${error.message}`);
    }
}

function handleEditTestimonial(testimonialId) {
    const card = document.getElementById(`testimonial-${testimonialId}`);
    if (!card || card.classList.contains('editing')) return;

    const currentQuote = card.querySelector('p').innerText.replace(/"/g, '');
    const currentRating = card.querySelectorAll('.fa-star.text-yellow-400').length;

    const originalContent = card.innerHTML;

    card.classList.add('editing');
    card.innerHTML = `
        <div class="mb-2">
            <div class="edit-rating-stars text-3xl text-gray-300 cursor-pointer" data-rating="${currentRating}">
                ${[1, 2, 3, 4, 5].map(i => `<i class="fas fa-star ${i <= currentRating ? 'text-yellow-400' : ''}" data-value="${i}"></i>`).join('')}
            </div>
        </div>
        <textarea class="w-full p-2 border rounded-lg">${currentQuote}</textarea>
        <div class="edit-actions">
            <button onclick="cancelEdit('${testimonialId}')" class="cancel-btn">${t('js-public-profile-cancel-btn')}</button>
            <button onclick="handleSaveTestimonial('${testimonialId}')" class="save-btn">${t('js-public-profile-save-btn')}</button>
        </div>
    `;

    card.originalInnerHTML = originalContent;

    const stars = card.querySelectorAll('.edit-rating-stars i');
    const ratingContainer = card.querySelector('.edit-rating-stars');
    stars.forEach(star => {
        star.addEventListener('mouseover', () => {
            const ratingValue = star.dataset.value;
            stars.forEach(s => s.classList.toggle('text-yellow-400', s.dataset.value <= ratingValue));
        });
        star.addEventListener('mouseout', () => {
            const currentRating = ratingContainer.dataset.rating;
            stars.forEach(s => s.classList.toggle('text-yellow-400', s.dataset.value <= currentRating));
        });
        star.addEventListener('click', () => {
            ratingContainer.dataset.rating = star.dataset.value;
        });
    });
}

function cancelEdit(testimonialId) {
    const card = document.getElementById(`testimonial-${testimonialId}`);
    if (card && card.originalInnerHTML) {
        card.classList.remove('editing');
        card.innerHTML = card.originalInnerHTML;
    }
}

async function handleSaveTestimonial(testimonialId) {
    const card = document.getElementById(`testimonial-${testimonialId}`);
    const userId = new URLSearchParams(window.location.search).get('id');
    const token = localStorage.getItem('user_token');

    const newQuote = card.querySelector('textarea').value;
    const newRating = card.querySelector('.edit-rating-stars').dataset.rating;

    try {
        const response = await fetch(`${API_BASE_URL}/api/users/${userId}/testimonials/${testimonialId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ quote: newQuote, rating: newRating })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || t('js-public-profile-error-update-testimonial-failed'));
        }

        const updatedTestimonials = await response.json();
        renderTestimonials(updatedTestimonials);
        alert(t('js-public-profile-success-testimonial-updated'));

    } catch (error) {
        alert(`${t('js-public-profile-error-generic')}: ${error.message}`);
    }
}

function createPublicProjectCard(project, baseUrl) {
    const progress = (project.fundingGoal && project.fundingGoal.amount > 0) ? Math.round((project.fundingAmountRaised / project.fundingGoal.amount) * 100) : 0;
    let statusText = t('js-public-profile-project-status-funding');
    let borderColorClass = 'border-blue-500';
    if (project.status === 'funded' || project.status === 'completed') {
        statusText = t('js-public-profile-project-status-completed');
        borderColorClass = 'border-emerald-500';
    }
    return `
    <a href="./project-view.html?id=${project._id}" target="_blank">
        <div class="project-card rounded-lg p-4 cursor-pointer bg-white border-l-4 ${borderColorClass}">
            <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-white font-bold">${project.projectCategory ? project.projectCategory.charAt(0) : 'P'}</div>
                <div>
                    <h3 class="font-semibold text-slate-800">${escapeHTML(project.projectName)}</h3>
                    <p class="text-xs text-gray-500 font-medium">${statusText}</p>
                </div>
            </div>
            <p class="text-sm text-slate-600 mb-3">${escapeHTML(project.projectDescription.substring(0, 50))}...</p>
            <div class="flex justify-between items-center">
                <span class="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-medium">${t('js-public-profile-completed-prefix')} ${progress}%</span>
                <span class="text-gray-600 text-sm font-semibold">${(project.fundingGoal.amount || 0).toLocaleString()} ${project.fundingGoal.currency}</span>
            </div>
            </div>
        </a>
    `;
}

function setupFollowButton(profileUser) {
    const followButton = document.getElementById('followUserButton');
    const token = localStorage.getItem('user_token');
    const currentUserId = localStorage.getItem('user_id');

    if (!followButton) return;

    if (currentUserId && currentUserId === profileUser._id) {
        followButton.textContent = t('js-public-profile-edit-profile-btn');
        followButton.className = 'financial-highlight text-white px-6 py-2.5 rounded-lg font-semibold';
        followButton.onclick = () => { window.location.href = './settings.html'; };
        followButton.style.display = 'block';
        return;
    }

    if (!token || !currentUserId) {
        followButton.style.display = 'none';
        return;
    }

    followButton.style.display = 'block';
    fetch(`${API_BASE_URL}/api/users/profile`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(fullCurrentUser => {
            const isFollowing = fullCurrentUser.following && fullCurrentUser.following.some(followedUser => followedUser._id === profileUser._id);
            updateFollowButtonState(isFollowing);
        });

    followButton.addEventListener('click', async () => {
        followButton.disabled = true;
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${profileUser._id}/follow`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || t('js-public-profile-error-follow-failed'));

            updateFollowButtonState(data.isFollowing);

            const followersCountEl = document.getElementById('followersCountStat');
            if (followersCountEl) {
                followersCountEl.textContent = data.followersCount;
            }

        } catch (error) {
            alert(error.message);
        } finally {
            followButton.disabled = false;
        }
    });
}

function updateFollowButtonState(isFollowing) {
    const followButton = document.getElementById('followUserButton');
    if (isFollowing) {
        followButton.textContent = t('js-public-profile-unfollow-btn');
        followButton.className = 'bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg font-semibold transition-colors hover:bg-gray-300';
    } else {
        followButton.textContent = t('js-public-profile-follow-btn');
        followButton.className = 'border-2 border-emerald-600 hover:bg-emerald-50 text-emerald-700 px-6 py-2.5 rounded-lg font-semibold transition-colors';
    }
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match]));
}