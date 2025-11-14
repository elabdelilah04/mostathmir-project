async function fetchCurrentUser() {
    const token = localStorage.getItem('user_token');
    if (!token) {
        const protectedPages = ['page-title-profile', 'page-title-investor-profile', 'page-title-settings'];
        if (protectedPages.includes(document.body.dataset.pageKey)) {
            window.location.href = 'login.html';
        }
        return null;
    }
    try {
        const response = await fetch('https://mostathmir-api.onrender.com/api/users/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            localStorage.removeItem('user_token');
            localStorage.removeItem('user_data');
            window.location.href = 'login.html';
            return null;
        }
        const user = await response.json();
        localStorage.setItem('user_data', JSON.stringify(user));
        return user;
    } catch {
        return null;
    }
}

async function handleApiRequest(url, options, form) {
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton ? submitButton.textContent : '';
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = t('js-script-please-wait');
    }
    try {
        const response = await fetch(url, options);
        const data = await response.json();

        const messageToDisplay = data.messageKey ? t(data.messageKey) : data.message;

        if (!response.ok) {
            const error = new Error(messageToDisplay || data.message || t('js-script-unexpected-error'));
            error.data = data;
            throw error;
        }

        if (messageToDisplay) {
            alert(messageToDisplay);
        }
        return data;

    } catch (error) {
        alert(error.message);
        throw error;
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    }
}

function logoutUser() {
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_data');
    alert(t('js-header-logout-success'));
    window.location.href = 'login.html';
}

function redirectIfLoggedIn() {
    const pageKey = document.body.dataset.pageKey;
    if (pageKey === 'page-title-login' || pageKey === 'page-title-signup') {
        const token = localStorage.getItem('user_token');
        if (token) {
            const userData = JSON.parse(localStorage.getItem('user_data') || 'null');
            if (userData && userData.accountType) {
                const destination = userData.accountType === 'investor' ? 'investor-profile.html' : 'profile.html';
                window.location.href = destination;
            } else {
                window.location.href = 'index.html';
            }
        }
    }
}

async function uploadProfilePicture(file) {
    const token = localStorage.getItem('user_token');
    if (!token) return;
    const formData = new FormData();
    formData.append('profilePicture', file);
    alert(t('js-script-uploading-image'));
    try {
        const response = await fetch('https://mostathmir-api.onrender.com/api/users/profile/picture', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || t('js-script-upload-failed'));
        alert(t('js-script-upload-success'));
        window.location.reload();
    } catch (error) {
        alert(error.message);
    }
}

function populateCommonProfileFields(user, baseUrl) {
    document.querySelectorAll('.profile-name, .user-name').forEach(el => { el.textContent = user.fullName || ''; });

    const profileBio = document.querySelector('.profile-bio');
    if (profileBio) profileBio.textContent = user.bio || t('js-script-add-bio');

    const profileLocation = document.querySelector('.profile-location span');
    if (profileLocation && user.location) {
        profileLocation.textContent = user.location;
    } else if (profileLocation) {
        profileLocation.textContent = t('js-script-location-not-set');
    }

    const contactEmail = document.querySelector('.profile-contact .contact-item:nth-child(1) span');
    if (contactEmail) contactEmail.textContent = user.email || '';

    const contactPhone = document.querySelector('.profile-contact .contact-item:nth-child(2) span');
    if (contactPhone) contactPhone.textContent = user.phone || t('js-script-no-phone');

    const mainAvatarImage = document.getElementById('avatarImage');
    const mainAvatarInitials = document.getElementById('avatarInitials');
    const hasProfilePic = user.profilePicture && user.profilePicture !== 'default-avatar.png';
    const parts = user.fullName ? user.fullName.trim().split(' ') : [];
    const initials = parts.length > 1
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : (user.fullName || '').trim().substring(0, 2).toUpperCase();

    if (mainAvatarImage) {
        mainAvatarImage.src = hasProfilePic && user.profilePicture.startsWith('http') ? user.profilePicture : '';
        mainAvatarImage.style.display = hasProfilePic ? 'block' : 'none';
    }
    if (mainAvatarInitials) {
        mainAvatarInitials.textContent = initials;
        mainAvatarInitials.style.display = hasProfilePic ? 'none' : 'block';
    }

    const avatarAddButton = document.getElementById('avatarAddButton');
    const avatarUploadInput = document.getElementById('avatarUploadInput');
    if (avatarAddButton && avatarUploadInput) {
        avatarAddButton.style.display = 'block';
        avatarAddButton.addEventListener('click', () => avatarUploadInput.click());
        avatarUploadInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) uploadProfilePicture(file);
        });
    }

    const iconsContainer = document.getElementById('profileSocialIconsContainer');
    const linkDisplayContainer = document.getElementById('profileSocialLinkDisplay');
    const linkDisplayText = document.getElementById('socialLinkText');
    const linkDisplayIcon = document.getElementById('socialLinkIcon');

    if (iconsContainer && linkDisplayContainer && linkDisplayText && linkDisplayIcon) {
        iconsContainer.innerHTML = '';
        linkDisplayContainer.style.display = 'none';
        const svgIcons = {
            linkedin: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>',
            instagram: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>',
            twitter: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>',
            facebook: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>',
            youtube: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>',
            github: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>',
            website: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>'
        };
        if (user.socialLinks && user.socialLinks.length > 0) {
            user.socialLinks.forEach(link => {
                const iconButton = document.createElement('button');
                iconButton.type = 'button';
                iconButton.className = 'social-icon-button';
                iconButton.innerHTML = svgIcons[link.platform] || svgIcons.website;
                iconButton.addEventListener('click', () => {
                    const isAlreadyActive = iconButton.classList.contains('active');
                    iconsContainer.querySelectorAll('.social-icon-button').forEach(btn => btn.classList.remove('active'));
                    if (isAlreadyActive) {
                        linkDisplayContainer.style.display = 'none';
                    } else {
                        iconButton.classList.add('active');
                        linkDisplayText.textContent = link.url;
                        linkDisplayIcon.innerHTML = svgIcons[link.platform] || svgIcons.website;
                        linkDisplayContainer.style.display = 'flex';
                        linkDisplayContainer.onclick = () => {
                            const fullUrl = link.url.startsWith('http') ? link.url : `https://${link.platform}.com/${link.url}`;
                            window.open(fullUrl, '_blank');
                        };
                        linkDisplayContainer.style.cursor = 'pointer';
                    }
                });
                iconsContainer.appendChild(iconButton);
            });
        }
    }

    const interestsContainer = document.getElementById('profileInterestsContainer');
    if (interestsContainer) {
        interestsContainer.innerHTML = '';
        if (user.interests && user.interests.length > 0) {
            user.interests.forEach(interestText => {
                const tagElement = document.createElement('span');
                tagElement.className = 'tag';
                tagElement.textContent = interestText;
                interestsContainer.appendChild(tagElement);
            });
        } else {
            interestsContainer.innerHTML = `<p style="font-size:13px;color:#6b7280;" data-i18n-key="interest">${t('js-script-define-interests')}</p>`;
        }
    }
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function setupInteractiveStats(gridId, contentAreaId) {
    const statsGrid = document.getElementById(gridId);
    if (!statsGrid) return;
    const dynamicContentArea = document.getElementById(contentAreaId);
    if (!dynamicContentArea) return;
    const statButtons = statsGrid.querySelectorAll('[data-target]');
    const contentPanels = dynamicContentArea.querySelectorAll('.content-panel');
    statsGrid.addEventListener('click', (e) => {
        const clickedButton = e.target.closest('[data-target]');
        if (!clickedButton) return;
        const targetId = clickedButton.dataset.target;
        const targetPanel = document.getElementById(targetId);
        statButtons.forEach(btn => btn.classList.remove('active'));
        contentPanels.forEach(panel => panel.classList.remove('visible'));
        clickedButton.classList.add('active');
        if (targetPanel) {
            targetPanel.classList.add('visible');
            dynamicContentArea.classList.add('visible');
        }
    });
}

function initProjectsPortfolio() {
    const canvas = document.getElementById('projectsChart');
    if (canvas && canvas.getContext) {
        const ctx = canvas.getContext('2d');
        const data = [{ value: 3, color: '#3b82f6' }, { value: 2, color: '#f59e0b' }, { value: 4, color: '#10b981' }, { value: 2, color: '#8b5cf6' }, { value: 1, color: '#06b6d4' }];
        const total = data.reduce((sum, item) => sum + item.value, 0);
        let currentAngle = -Math.PI / 2;
        data.forEach(item => {
            const sliceAngle = (item.value / total) * 2 * Math.PI;
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2, canvas.height / 2);
            ctx.arc(canvas.width / 2, canvas.height / 2, 80, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = item.color;
            ctx.fill();
            currentAngle += sliceAngle;
        });
    }
    const filterButtons = document.querySelectorAll('.projects-filter .filter-btn');
    const projectCards = document.querySelectorAll('.projects-cards .project-card');
    if (filterButtons.length > 0) {
        filterButtons.forEach(button => {
            button.addEventListener('click', function () {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                const filter = this.dataset.filter;
                projectCards.forEach(card => {
                    card.style.display = (filter === 'all' || card.dataset.status === filter) ? 'block' : 'none';
                });
            });
        });
    }
}

function initProfilePage(user, baseUrl) {
    if (user.accountType !== 'ideaHolder') {
        window.location.href = 'investor-profile.html';
        return;
    }
    populateCommonProfileFields(user, baseUrl);
    setupInteractiveStats('profile-stats-interactive', 'profile-dynamic-content');
    initProjectsPortfolio();
    const token = localStorage.getItem('user_token');
    fetch(`${baseUrl}/api/projects/myprojects`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => {
            if (!res.ok) throw new Error(t('js-script-fetch-projects-failed'));
            return res.json();
        })
        .then(projects => {
            const totalProjectsStat = document.getElementById('stat-total-projects');
            if (totalProjectsStat) totalProjectsStat.textContent = projects.length;
            const recentProjectsList = document.getElementById('recent-projects-list');
            if (recentProjectsList) {
                recentProjectsList.innerHTML = '';
                const projectsToShow = projects.slice(0, 2);
                if (projectsToShow.length > 0) {
                    projectsToShow.forEach(project => {
                        const listItem = document.createElement('li');
                        listItem.innerHTML = `<a href="project-details.html?id=${project._id}">${escapeHTML(project.projectName || t('js-script-untitled-project'))}</a>`;
                        recentProjectsList.appendChild(listItem);
                    });
                } else {
                    recentProjectsList.innerHTML = `<li>${t('js-script-no-projects-yet')}</li>`;
                }
            }
        })
        .catch(() => {
            const recentProjectsList = document.getElementById('recent-projects-list');
            if (recentProjectsList) recentProjectsList.innerHTML = `<li>${t('js-script-error-loading-projects')}</li>`;
        });
}

function initInvestorProfilePage(user, baseUrl) {
    if (user.accountType !== 'investor') {
        window.location.href = 'profile.html';
        return;
    }
    populateCommonProfileFields(user, baseUrl);
    setupInteractiveStats('profile-stats-interactive', 'profile-dynamic-content');
}

async function initSettingsPage(user) {
    const settingsForm = document.getElementById('settingsForm');
    if (!settingsForm) return;

    function initCountryCityDropdowns(currentLocation) {
        const countrySelect = document.getElementById("country");
        const citySelect = document.getElementById("city");
        if (!countrySelect || !citySelect) return;

        let initialCountry = '';
        let initialCity = '';
        if (currentLocation && currentLocation.includes(', ')) {
            const parts = currentLocation.split(', ');
            initialCity = parts[0];
            initialCountry = parts[1];
        } else {
            initialCountry = currentLocation || '';
        }

        const arabCountries = {
            [t('js-country-morocco')]: [t('js-city-rabat'), t('js-city-casablanca'), t('js-city-marrakech'), t('js-city-fes'), t('js-city-tanger'), t('js-city-agadir')],
            [t('js-country-algeria')]: [t('js-city-algiers'), t('js-city-oran'), t('js-city-constantine'), t('js-city-annaba')],
            [t('js-country-tunisia')]: [t('js-city-tunis'), t('js-city-sfax'), t('js-city-sousse'), t('js-city-bizerte')],
            [t('js-country-egypt')]: [t('js-city-cairo'), t('js-city-alexandria'), t('js-city-giza'), t('js-city-portsaid'), t('js-city-mansoura')],
            [t('js-country-saudi')]: [t('js-city-riyadh'), t('js-city-jeddah'), t('js-city-mecca'), t('js-city-medina'), t('js-city-dammam')],
            [t('js-country-uae')]: [t('js-city-dubai'), t('js-city-abudhabi'), t('js-city-sharjah'), t('js-city-alain')],
            [t('js-country-qatar')]: [t('js-city-doha'), t('js-city-alrayyan'), t('js-city-alwakrah')],
            [t('js-country-kuwait')]: [t('js-city-kuwait_city'), t('js-city-alfarwaniyah'), t('js-city-hawalli'), t('js-city-alahmadi')],
            [t('js-country-bahrain')]: [t('js-city-manama'), t('js-city-muharraq'), t('js-city-sitra')],
            [t('js-country-oman')]: [t('js-city-muscat'), t('js-city-salalah'), t('js-city-sohar')],
            [t('js-country-jordan')]: [t('js-city-amman'), t('js-city-irbid'), t('js-city-zarqa')],
            [t('js-country-lebanon')]: [t('js-city-beirut'), t('js-city-tripoli'), t('js-city-sidon')],
            [t('js-country-iraq')]: [t('js-city-baghdad'), t('js-city-basra'), t('js-city-mosul'), t('js-city-erbil')],
            [t('js-country-palestine')]: [t('js-city-jerusalem'), t('js-city-ramallah'), t('js-city-gaza'), t('js-city-nablus'), t('js-city-hebron')],
            [t('js-country-yemen')]: [t('js-city-sanaa'), t('js-city-aden'), t('js-city-taiz'), t('js-city-alhodeidah'), t('js-city-ibb')],
            [t('js-country-sudan')]: [t('js-city-khartoum'), t('js-city-omdurman'), t('js-city-portsudan')]
        };

        Object.keys(arabCountries).forEach(country => {
            const option = document.createElement("option");
            option.value = country;
            option.textContent = country;
            if (country === initialCountry) option.selected = true;
            countrySelect.appendChild(option);
        });

        const populateCities = (selectedCountry, selectedCity) => {
            citySelect.innerHTML = `<option value="">${t('js-settings-select-city')}</option>`;
            if (selectedCountry && arabCountries[selectedCountry]) {
                arabCountries[selectedCountry].forEach(city => {
                    const option = document.createElement("option");
                    option.value = city;
                    option.textContent = city;
                    if (city === selectedCity) option.selected = true;
                    citySelect.appendChild(option);
                });
            }
        };

        populateCities(initialCountry, initialCity);
        countrySelect.addEventListener("change", function () { populateCities(this.value, null); });

        countrySelect.disabled = true;
        citySelect.disabled = true;
    }

    const token = localStorage.getItem('user_token');
    let latestUser;
    try {
        const response = await fetch('https://mostathmir-api.onrender.com/api/users/profile', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Failed to fetch latest user data');
        latestUser = await response.json();
    } catch {
        latestUser = user;
    }

    const inputsToToggle = [
        settingsForm.querySelector('#fullName'),
        settingsForm.querySelector('#phone'),
        settingsForm.querySelector('#bio'),
        settingsForm.querySelector('#userSkills'),
        settingsForm.querySelector('#profileTitle')
    ];

    const editButton = settingsForm.querySelector('[data-i18n-key="settings-account-info-edit"]');
    const saveButton = settingsForm.querySelector('[data-i18n-key="settings-save-changes"]');

    const socialLinksContainer = document.getElementById('socialLinksContainer');
    const addSocialLinkBtn = document.getElementById('addSocialLinkBtn');
    const socialLinkTemplate = document.getElementById('socialLinkTemplate');

    const interestsContainer = document.getElementById('interestsContainer');
    const availableInterests = [t('js-settings-interest-social'), t('js-settings-interest-productivity'), t('js-settings-interest-photo'), t('js-settings-interest-communication'), t('js-settings-interest-travel'), t('js-settings-interest-entertainment'), t('js-settings-interest-tech'), t('js-settings-interest-education'), t('js-settings-interest-health'), t('js-settings-interest-ecommerce')];

    const achievementsContainer = document.getElementById('achievementsFormContainer');
    const addAchievementBtn = document.getElementById('addAchievementBtn');
    const achievementTemplate = document.getElementById('achievementTemplate');

    const experienceContainer = document.getElementById('experienceFormContainer');
    const addExperienceBtn = document.getElementById('addExperienceBtn');
    const experienceTemplate = document.getElementById('experienceTemplate');

    const educationContainer = document.getElementById('educationFormContainer');
    const addEducationBtn = document.getElementById('addEducationBtn');
    const educationTemplate = document.getElementById('educationTemplate');

    function toggleEditMode(enable) {
        inputsToToggle.forEach(input => { if (input) input.disabled = !enable; });
        const countrySelect = document.getElementById('country');
        const citySelect = document.getElementById('city');
        if (countrySelect) countrySelect.disabled = !enable;
        if (citySelect) citySelect.disabled = !enable;
        if (socialLinksContainer) socialLinksContainer.querySelectorAll('input, select, button').forEach(el => el.disabled = !enable);
        if (addSocialLinkBtn) addSocialLinkBtn.disabled = !enable;
        if (interestsContainer) {
            interestsContainer.querySelectorAll('.interest-tag').forEach(tag => {
                tag.style.pointerEvents = enable ? 'auto' : 'none';
                tag.style.opacity = enable ? '1' : '0.7';
            });
        }
        if (achievementsContainer) achievementsContainer.querySelectorAll('input, button').forEach(el => el.disabled = !enable);
        if (addAchievementBtn) addAchievementBtn.disabled = !enable;
        if (experienceContainer) experienceContainer.querySelectorAll('input, textarea, button').forEach(el => el.disabled = !enable);
        if (addExperienceBtn) addExperienceBtn.disabled = !enable;
        if (educationContainer) educationContainer.querySelectorAll('input, button').forEach(el => el.disabled = !enable);
        if (addEducationBtn) addEducationBtn.disabled = !enable;
        settingsForm.classList.toggle('is-editing', enable);
    }

    function createRow(template, container, data, populateFn) {
        if (!template || !container) return;
        const content = template.content.cloneNode(true);
        if (data && typeof populateFn === 'function') populateFn(content, data);
        container.appendChild(content);
    }

    const emailInput = settingsForm.querySelector('#email');
    if (emailInput) emailInput.value = latestUser.email || '';
    const fullNameInput = settingsForm.querySelector('#fullName');
    if (fullNameInput) fullNameInput.value = latestUser.fullName || '';
    const phoneInput = settingsForm.querySelector('#phone');
    if (phoneInput) phoneInput.value = latestUser.phone || '';
    const bioInput = settingsForm.querySelector('#bio');
    if (bioInput) bioInput.value = latestUser.bio || '';
    const titleInput = settingsForm.querySelector('#profileTitle');
    if (titleInput) titleInput.value = latestUser.profileTitle || '';
    const skillsInput = document.getElementById('userSkills');
    if (skillsInput) skillsInput.value = latestUser.skills ? latestUser.skills.join(', ') : '';

    initCountryCityDropdowns(latestUser.location);

    if (socialLinksContainer) {
        socialLinksContainer.innerHTML = '';
        if (latestUser.socialLinks && latestUser.socialLinks.length > 0) {
            latestUser.socialLinks.forEach(link => createRow(socialLinkTemplate, socialLinksContainer, link, (content, data) => {
                const platformEl = content.querySelector('.social-platform');
                const urlEl = content.querySelector('.social-url');
                if (platformEl) platformEl.value = data.platform || '';
                if (urlEl) urlEl.value = data.url || '';
            }));
        }
    }

    if (interestsContainer) {
        interestsContainer.innerHTML = '';
        availableInterests.forEach(interestText => {
            const tag = document.createElement('button');
            tag.type = 'button';
            tag.className = 'interest-tag';
            tag.textContent = interestText;
            tag.dataset.interest = interestText;
            const plusIcon = document.createElement('span');
            plusIcon.className = 'plus-icon';
            plusIcon.textContent = '+';
            tag.prepend(plusIcon);
            if (latestUser.interests && latestUser.interests.includes(interestText)) tag.classList.add('selected');
            tag.addEventListener('click', () => tag.classList.toggle('selected'));
            interestsContainer.appendChild(tag);
        });
    }

    if (achievementsContainer) {
        achievementsContainer.innerHTML = '';
        if (latestUser.achievements && latestUser.achievements.length > 0) {
            latestUser.achievements.forEach(ach => createRow(achievementTemplate, achievementsContainer, ach, (content, data) => {
                const t = content.querySelector('.ach-title');
                const i = content.querySelector('.ach-issuer');
                const y = content.querySelector('.ach-year');
                if (t) t.value = data.title || '';
                if (i) i.value = data.issuer || '';
                if (y) y.value = data.year || '';
            }));
        }
    }

    if (experienceContainer && latestUser.professionalExperience) {
        experienceContainer.innerHTML = '';
        latestUser.professionalExperience.forEach(exp => createRow(experienceTemplate, experienceContainer, exp, (content, data) => {
            const t = content.querySelector('.exp-title');
            const c = content.querySelector('.exp-company');
            const p = content.querySelector('.exp-period');
            const d = content.querySelector('.exp-description');
            if (t) t.value = data.title || '';
            if (c) c.value = data.company || '';
            if (p) p.value = data.period || '';
            if (d) d.value = data.description || '';
        }));
    }

    if (educationContainer && latestUser.education) {
        educationContainer.innerHTML = '';
        latestUser.education.forEach(edu => createRow(educationTemplate, educationContainer, edu, (content, data) => {
            const deg = content.querySelector('.edu-degree');
            const inst = content.querySelector('.edu-institution');
            const det = content.querySelector('.edu-details');
            if (deg) deg.value = data.degree || '';
            if (inst) inst.value = data.institution || '';
            if (det) det.value = data.details || '';
        }));
    }

    if (editButton) editButton.addEventListener('click', () => toggleEditMode(true));
    if (addSocialLinkBtn) addSocialLinkBtn.addEventListener('click', () => createRow(socialLinkTemplate, socialLinksContainer, null, () => { }));
    if (addAchievementBtn) addAchievementBtn.addEventListener('click', () => createRow(achievementTemplate, achievementsContainer, null, () => { }));
    if (addExperienceBtn) addExperienceBtn.addEventListener('click', () => createRow(experienceTemplate, experienceContainer, null, () => { }));
    if (addEducationBtn) addEducationBtn.addEventListener('click', () => createRow(educationTemplate, educationContainer, null, () => { }));

    settingsForm.addEventListener('click', e => {
        const row = e.target.closest('.social-link-row, .achievement-form-row, .dynamic-form-row');
        if (e.target.closest('.remove-link-btn, .remove-ach-btn, .remove-row-btn') && row) row.remove();
    });

    if (settingsForm && saveButton) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const countryEl = settingsForm.querySelector('#country');
            const cityEl = settingsForm.querySelector('#city');
            const newCountry = countryEl ? countryEl.value : '';
            const newCity = cityEl ? cityEl.value : '';
            const newLocation = newCountry && newCity ? `${newCity}, ${newCountry}` : '';
            if (!newCountry || !newCity) return alert(t('js-settings-alert-select-country-city'));

            const updatedData = {
                fullName: (settingsForm.querySelector('#fullName') || {}).value || '',
                phone: (settingsForm.querySelector('#phone') || {}).value || '',
                location: newLocation,
                bio: (settingsForm.querySelector('#bio') || {}).value || '',
                skills: (settingsForm.querySelector('#userSkills') || {}).value || '',
                profileTitle: (document.getElementById('profileTitle') || {}).value || '',
                socialLinks: Array.from(document.querySelectorAll('#socialLinksContainer .social-link-row')).map(row => ({
                    platform: (row.querySelector('.social-platform') || {}).value || '',
                    url: (row.querySelector('.social-url') || {}).value.trim()
                })).filter(link => link.url),
                interests: Array.from(document.querySelectorAll('#interestsContainer .interest-tag.selected')).map(tag => tag.dataset.interest),
                achievements: Array.from(document.querySelectorAll('#achievementsFormContainer .achievement-form-row')).map(row => ({
                    title: (row.querySelector('.ach-title') || {}).value.trim(),
                    issuer: (row.querySelector('.ach-issuer') || {}).value.trim(),
                    year: (row.querySelector('.ach-year') || {}).value.trim()
                })).filter(ach => ach.title),
                professionalExperience: Array.from((document.getElementById('experienceFormContainer') || document.createElement('div')).querySelectorAll('.dynamic-form-row')).map(row => ({
                    title: (row.querySelector('.exp-title') || {}).value || '',
                    company: (row.querySelector('.exp-company') || {}).value || '',
                    period: (row.querySelector('.exp-period') || {}).value || '',
                    description: (row.querySelector('.exp-description') || {}).value || ''
                })),
                education: Array.from((document.getElementById('educationContainer') || document.createElement('div')).querySelectorAll('.dynamic-form-row')).map(row => ({
                    degree: (row.querySelector('.edu-degree') || {}).value || '',
                    institution: (row.querySelector('.edu-institution') || {}).value || '',
                    details: (row.querySelector('.edu-details') || {}).value || ''
                }))
            };

            try {
                const token2 = localStorage.getItem('user_token');
                const response = await fetch('https://mostathmir-api.onrender.com/api/users/profile', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token2}` },
                    body: JSON.stringify(updatedData)
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || t('js-settings-error-update-failed'));
                alert(t('js-settings-success-update'));
                localStorage.setItem('user_data', JSON.stringify(data));
                window.location.reload();
            } catch (error) {
                alert(error.message);
            } finally {
                toggleEditMode(false);
            }
        });
    }

    toggleEditMode(false);
}

document.addEventListener('DOMContentLoaded', async () => {
    if (window.initHeader) await window.initHeader();

    redirectIfLoggedIn();

    const API_BASE_URL = 'https://mostathmir-api.onrender.com';
    const user = await fetchCurrentUser();

    if (user) {
        const pageKey = document.body.dataset.pageKey;
        if (window.populateHeader) window.populateHeader(user, API_BASE_URL);

        switch (pageKey) {
            case 'page-title-profile':
                initProfilePage(user, API_BASE_URL);
                break;
            case 'page-title-investor-profile':
                initInvestorProfilePage(user, API_BASE_URL);
                break;
            case 'page-title-settings':
                initSettingsPage(user);
                break;
        }
    }

    // const signupForm = document.getElementById('signupForm');
    // if (signupForm) {
    //     signupForm.addEventListener('submit', async (e) => {
    //         e.preventDefault();
    //         const formData = {
    //             fullName: (signupForm.querySelector('#fullName') || {}).value || '',
    //             email: (signupForm.querySelector('#email') || {}).value || '',
    //             phone: (signupForm.querySelector('#phone') || {}).value || '',
    //             password: (signupForm.querySelector('#password') || {}).value || '',
    //             accountType: (signupForm.querySelector('#accountType') || {}).value || '',
    //             location: (signupForm.querySelector('#location') || {}).value || '',
    //             bio: (signupForm.querySelector('#bio') || {}).value || ''
    //         };
    //         try {
    //             const data = await handleApiRequest(`${API_BASE_URL}/api/auth/register`, {
    //                 method: 'POST',
    //                 headers: { 'Content-Type': 'application/json' },
    //                 body: JSON.stringify(formData)
    //             }, signupForm);
    //             if (data) {
    //                 window.location.href = 'login.html';
    //             }
    //         } catch {
    //             // Error is handled by handleApiRequest's alert
    //         }
    //     });
    // }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = {
                email: (loginForm.querySelector('#emailOrPhone') || {}).value || '',
                password: (loginForm.querySelector('#password') || {}).value || ''
            };
            try {
                const data = await handleApiRequest(`${API_BASE_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                }, loginForm);
                localStorage.setItem('user_token', data.token);
                window.location.href = data.accountType === 'investor' ? 'investor-profile.html' : 'profile.html';
            } catch {
                // Error is handled by handleApiRequest's alert
            }
        });
    }

    const openChatBtn = document.getElementById('openChatBtn');
    const closeChatBtn = document.getElementById('closeChatBtn');
    const chatModal = document.getElementById('chatModal');
    const chatModalOverlay = document.getElementById('chatModalOverlay');
    const chatForm = document.getElementById('chatForm');

    function openChatModal() {
        if (chatModal && chatModalOverlay) {
            chatModal.classList.add('is-visible');
            chatModalOverlay.classList.add('is-visible');
        }
    }
    function closeChatModal() {
        if (chatModal && chatModalOverlay) {
            chatModal.classList.remove('is-visible');
            chatModalOverlay.classList.remove('is-visible');
        }
    }
    if (openChatBtn) openChatBtn.addEventListener('click', openChatModal);
    if (closeChatBtn) closeChatBtn.addEventListener('click', closeChatModal);
    if (chatModalOverlay) chatModalOverlay.addEventListener('click', closeChatModal);
    if (chatForm) {
        chatForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const input = e.target.querySelector('input');
            if (!input || input.value.trim() === '') return;
            const messagesContainer = document.querySelector('.chat-messages');
            if (!messagesContainer) return;
            const newMessage = document.createElement('div');
            newMessage.classList.add('message', 'sent');
            newMessage.innerHTML = `<p>${escapeHTML(input.value.trim())}</p>`;
            messagesContainer.appendChild(newMessage);
            input.value = '';
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
    }
});