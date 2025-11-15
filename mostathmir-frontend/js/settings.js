document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE_URL = 'https://mostathmir-api.onrender.com';
    const token = localStorage.getItem('user_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            throw new Error(t('js-settings-error-fetch-failed'));
        }
        const user = await response.json();
        initSettingsPage(user);

        if (window.translatePage) {
            window.translatePage();
        }

    } catch (error) {
        console.error(error);
        alert(t('js-settings-error-loading-settings'));
    }
});

async function initSettingsPage(user) {
    const settingsForm = document.getElementById('settingsForm');
    if (!settingsForm) return;

    const API_BASE_URL = "https://mostathmir-api.onrender.com";
    const token = localStorage.getItem('user_token');

    const countriesData = {
        "ma": { nameKey: "js-country-morocco", cities: ["rabat", "casablanca", "marrakech", "fes", "tanger", "agadir"] },
        "dz": { nameKey: "js-country-algeria", cities: ["algiers", "oran", "constantine", "annaba"] },
        "tn": { nameKey: "js-country-tunisia", cities: ["tunis", "sfax", "sousse", "bizerte"] },
        "eg": { nameKey: "js-country-egypt", cities: ["cairo", "alexandria", "giza", "portsaid", "mansoura"] },
        "sa": { nameKey: "js-country-saudi", cities: ["riyadh", "jeddah", "mecca", "medina", "dammam"] },
        "ae": { nameKey: "js-country-uae", cities: ["dubai", "abudhabi", "sharjah", "alain"] },
        "qa": { nameKey: "js-country-qatar", cities: ["doha", "alrayyan", "alwakrah"] },
        "kw": { nameKey: "js-country-kuwait", cities: ["kuwait_city", "alfarwaniyah", "hawalli", "alahmadi"] },
        "bh": { nameKey: "js-country-bahrain", cities: ["manama", "muharraq", "sitra"] },
        "om": { nameKey: "js-country-oman", cities: ["muscat", "salalah", "sohar"] },
        "jo": { nameKey: "js-country-jordan", cities: ["amman", "irbid", "zarqa"] },
        "lb": { nameKey: "js-country-lebanon", cities: ["beirut", "tripoli", "sidon"] },
        "iq": { nameKey: "js-country-iraq", cities: ["baghdad", "basra", "mosul", "erbil"] },
        "ps": { nameKey: "js-country-palestine", cities: ["jerusalem", "ramallah", "gaza", "nablus", "hebron"] },
        "ye": { nameKey: "js-country-yemen", cities: ["sanaa", "aden", "taiz", "alhodeidah", "ibb"] },
        "sd": { nameKey: "js-country-sudan", cities: ["khartoum", "omdurman", "portsudan"] }
    };

    function initCountryCityDropdowns(currentLocation) {
        const countrySelect = document.getElementById("country");
        const citySelect = document.getElementById("city");
        if (!countrySelect || !citySelect) return;

        countrySelect.innerHTML = `<option value="">${t('settings-country-select')}</option>`;
        citySelect.innerHTML = `<option value="">${t('settings-city-select')}</option>`;

        let initialCountryKey = '';
        let initialCityText = '';

        if (currentLocation && currentLocation.includes(', ')) {
            const parts = currentLocation.split(', ');
            initialCityText = parts[0];
            const savedCountryText = parts[1];
            initialCountryKey = Object.keys(countriesData).find(key => t(countriesData[key].nameKey) === savedCountryText);
        }

        Object.keys(countriesData).forEach(countryKey => {
            const option = document.createElement("option");
            option.value = countryKey;
            option.textContent = t(countriesData[countryKey].nameKey);
            if (countryKey === initialCountryKey) {
                option.selected = true;
            }
            countrySelect.appendChild(option);
        });

        const populateCities = (countryKey, selectedCityText) => {
            citySelect.innerHTML = `<option value="">${t('settings-city-select')}</option>`;
            citySelect.disabled = true;

            if (countryKey && countriesData[countryKey]) {
                citySelect.disabled = false;
                countriesData[countryKey].cities.forEach(cityKey => {
                    const option = document.createElement("option");
                    const cityText = t(`js-city-${cityKey}`);
                    option.value = cityText;
                    option.textContent = cityText;
                    if (cityText === selectedCityText) {
                        option.selected = true;
                    }
                    citySelect.appendChild(option);
                });
            }
        };

        if (initialCountryKey) {
            populateCities(initialCountryKey, initialCityText);
        }

        countrySelect.addEventListener("change", function () {
            populateCities(this.value, null);
        });
    }
    
    const inputsToToggle = [
        settingsForm.querySelector('#fullName'),
        settingsForm.querySelector('#phone'),
        settingsForm.querySelector('#bio'),
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
    const skillsContainer = document.getElementById('skillsFormContainer');
    const addSkillBtn = document.getElementById('addSkillBtn');
    const skillTemplate = document.getElementById('skillTemplate');

    function createSkillRow(data = { name: '', level: 80 }) {
        if (!skillTemplate || !skillsContainer) return;
        const content = skillTemplate.content.cloneNode(true);
        const nameInput = content.querySelector('.skill-name');
        const levelInput = content.querySelector('.skill-level');
        const levelValue = content.querySelector('.skill-level-value');
        nameInput.value = data.name;
        levelInput.value = data.level;
        levelValue.textContent = `${data.level}%`;
        levelInput.addEventListener('input', () => {
            levelValue.textContent = `${levelInput.value}%`;
        });
        skillsContainer.appendChild(content);
    }

    if (skillsContainer) {
        skillsContainer.innerHTML = '';
        if (user.skills && user.skills.length > 0) {
            user.skills.forEach(skill => createSkillRow(skill));
        }
    }

    if (addSkillBtn) {
        addSkillBtn.addEventListener('click', () => createSkillRow());
    }

    settingsForm.addEventListener('click', e => {
        if (e.target.closest('.remove-row-btn')) {
            const row = e.target.closest('.skill-row');
            if (row) row.remove();
        }
    });

    function toggleEditMode(enable) {
        inputsToToggle.forEach(input => { if (input) input.disabled = !enable; });
        const countrySelect = document.getElementById('country');
        const citySelect = document.getElementById('city');
        if (countrySelect) countrySelect.disabled = !enable;
        if (citySelect) citySelect.disabled = !enable;
        if (skillsContainer) skillsContainer.querySelectorAll('input, button').forEach(el => el.disabled = !enable);
        if (addSkillBtn) addSkillBtn.disabled = !enable;
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
        if (data) populateFn(content, data);
        container.appendChild(content);
    }

    settingsForm.querySelector('#email').value = user.email || '';
    settingsForm.querySelector('#fullName').value = user.fullName || '';
    settingsForm.querySelector('#phone').value = user.phone || '';
    settingsForm.querySelector('#bio').value = user.bio || '';
    settingsForm.querySelector('#profileTitle').value = user.profileTitle || '';

    initCountryCityDropdowns(user.location);

    if (socialLinksContainer) {
        socialLinksContainer.innerHTML = '';
        if (user.socialLinks && user.socialLinks.length > 0) {
            user.socialLinks.forEach(link => createRow(socialLinkTemplate, socialLinksContainer, link, (content, data) => {
                content.querySelector('.social-platform').value = data.platform;
                content.querySelector('.social-url').value = data.url;
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
            if (user.interests && user.interests.includes(interestText)) {
                tag.classList.add('selected');
            }
            tag.addEventListener('click', () => tag.classList.toggle('selected'));
            interestsContainer.appendChild(tag);
        });
    }

    if (achievementsContainer) {
        achievementsContainer.innerHTML = '';
        if (user.achievements && user.achievements.length > 0) {
            user.achievements.forEach(ach => createRow(achievementTemplate, achievementsContainer, ach, (content, data) => {
                content.querySelector('.ach-title').value = data.title;
                content.querySelector('.ach-issuer').value = data.issuer;
                content.querySelector('.ach-year').value = data.year;
            }));
        }
    }

    if (experienceContainer && user.professionalExperience) {
        experienceContainer.innerHTML = '';
        user.professionalExperience.forEach(exp => createRow(experienceTemplate, experienceContainer, exp, (content, data) => {
            content.querySelector('.exp-title').value = data.title;
            content.querySelector('.exp-company').value = data.company;
            content.querySelector('.exp-period').value = data.period;
            content.querySelector('.exp-description').value = data.description;
        }));
    }

    if (educationContainer && user.education) {
        educationContainer.innerHTML = '';
        user.education.forEach(edu => createRow(educationTemplate, educationContainer, edu, (content, data) => {
            content.querySelector('.edu-degree').value = data.degree;
            content.querySelector('.edu-institution').value = data.institution;
            content.querySelector('.edu-details').value = data.details;
        }));
    }

    if (editButton) editButton.addEventListener('click', () => toggleEditMode(true));
    if (addSocialLinkBtn) addSocialLinkBtn.addEventListener('click', () => createRow(socialLinkTemplate, socialLinksContainer, null, () => { }));
    if (addAchievementBtn) addAchievementBtn.addEventListener('click', () => createRow(achievementTemplate, achievementsContainer, null, () => { }));
    if (addExperienceBtn) addExperienceBtn.addEventListener('click', () => createRow(experienceTemplate, experienceContainer, null, () => { }));
    if (addEducationBtn) addEducationBtn.addEventListener('click', () => createRow(educationTemplate, educationContainer, null, () => { }));

    settingsForm.addEventListener('click', e => {
        const row = e.target.closest('.social-link-row, .achievement-form-row, .dynamic-form-row');
        if (e.target.closest('.remove-link-btn, .remove-ach-btn, .remove-row-btn') && row) {
            row.remove();
        }
    });

    if (settingsForm && saveButton) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const countrySelect = document.getElementById('country');
            const citySelect = document.getElementById('city');

            if (!countrySelect.value || !citySelect.value) {
                return alert(t('js-settings-alert-select-country-city'));
            }

            const selectedCountryOption = countrySelect.options[countrySelect.selectedIndex];
            const countryText = selectedCountryOption.textContent;
            const cityText = citySelect.value;
            const newLocation = `${cityText}, ${countryText}`;

            const updatedSkills = Array.from(document.querySelectorAll('#skillsFormContainer .skill-row')).map(row => ({
                name: row.querySelector('.skill-name').value.trim(),
                level: parseInt(row.querySelector('.skill-level').value, 10)
            })).filter(skill => skill.name);

            const updatedData = {
                fullName: settingsForm.querySelector('#fullName').value,
                phone: settingsForm.querySelector('#phone').value,
                location: newLocation,
                bio: settingsForm.querySelector('#bio').value,
                skills: updatedSkills,
                profileTitle: document.getElementById('profileTitle').value,
                socialLinks: Array.from(document.querySelectorAll('#socialLinksContainer .social-link-row')).map(row => ({
                    platform: row.querySelector('.social-platform').value,
                    url: row.querySelector('.social-url').value.trim()
                })).filter(link => link.url),
                interests: Array.from(document.querySelectorAll('#interestsContainer .interest-tag.selected')).map(tag => tag.dataset.interest),
                achievements: Array.from(document.querySelectorAll('#achievementsFormContainer .achievement-form-row')).map(row => ({
                    title: row.querySelector('.ach-title').value.trim(),
                    issuer: row.querySelector('.ach-issuer').value.trim(),
                    year: row.querySelector('.ach-year').value.trim()
                })).filter(ach => ach.title),
                professionalExperience: Array.from(experienceContainer.querySelectorAll('.dynamic-form-row')).map(row => ({
                    title: row.querySelector('.exp-title').value,
                    company: row.querySelector('.exp-company').value,
                    period: row.querySelector('.exp-period').value,
                    description: row.querySelector('.exp-description').value,
                })),
                education: Array.from(educationContainer.querySelectorAll('.dynamic-form-row')).map(row => ({
                    degree: row.querySelector('.edu-degree').value,
                    institution: row.querySelector('.edu-institution').value,
                    details: row.querySelector('.edu-details').value,
                }))
            };
            try {
                const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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