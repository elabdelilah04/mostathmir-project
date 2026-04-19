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

        // Force re-translation after dynamic content is added
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

    // ==========================================
    // 1. منطق تحقق رقم الهاتف (النسخة النهائية)
    // ==========================================
    function setupPhoneVerification(user) {
        const btnStartVerify = document.getElementById('btnStartVerify');
        const otpSection = document.getElementById('otpSection');
        const otpInput = document.getElementById('otpInput');
        const btnConfirmOTP = document.getElementById('btnConfirmOTP');
        const phoneVerifiedBadge = document.getElementById('phoneVerifiedBadge');
        const otpSentMessage = document.getElementById('otpSentMessage');
        const phoneInput = document.getElementById('phone');

        if (!btnStartVerify || !otpSection) return;

        // الحالة الأولية بناءً على قاعدة البيانات
        if (user.isPhoneVerified) {
            if (phoneVerifiedBadge) phoneVerifiedBadge.style.display = 'flex';
            btnStartVerify.style.display = 'none';
        } else {
            if (phoneVerifiedBadge) phoneVerifiedBadge.style.display = 'none';
            btnStartVerify.style.display = 'block';
        }

        // عند الضغط على "تأكيد الرقم"
        btnStartVerify.onclick = () => {
            const currentPhone = phoneInput.value || user.phone || '...';
            otpSentMessage.textContent = `${t('js-phone-otp-sent-prefix')} ${currentPhone}`;
            otpSection.style.display = 'block';
            btnStartVerify.style.display = 'none';
            otpInput.focus();
        };

        // عند الضغط على زر "تأكيد" الكود
        btnConfirmOTP.onclick = async () => {
            if (otpInput.value === '0000') {
                btnConfirmOTP.disabled = true;
                btnConfirmOTP.textContent = '...';

                try {
                    const res = await fetch(`${API_BASE_URL}/api/users/verify-phone-manual`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (res.ok) {
                        alert(t('js-phone-verify-success'));
                        otpSection.style.display = 'none';
                        if (phoneVerifiedBadge) phoneVerifiedBadge.style.display = 'flex';
                        user.isPhoneVerified = true;
                        // تطبيق حالة القراءة فقط فوراً
                        phoneInput.disabled = true;
                        phoneInput.style.backgroundColor = "#f3f4f6";
                    } else {
                        alert('❌ فشل التحديث في السيرفر');
                    }
                } catch (err) {
                    alert('❌ خطأ في الاتصال بالسيرفر');
                } finally {
                    btnConfirmOTP.disabled = false;
                    btnConfirmOTP.textContent = 'تأكيد';
                }
            } else {
                alert(t('js-phone-otp-error'));
            }
        };
    }

    // تشغيل نظام التحقق
    setupPhoneVerification(user);

    // ==========================================
    // 2. منطق الدول والمدن
    // ==========================================
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
            initialCountry = currentLocation;
        }
        Object.keys(arabCountries).forEach(country => {
            const option = document.createElement("option");
            option.value = country;
            option.textContent = country;
            if (country === initialCountry) {
                option.selected = true;
            }
            countrySelect.appendChild(option);
        });
        const populateCities = (selectedCountry, selectedCity) => {
            citySelect.innerHTML = `<option value="">${t('js-settings-select-city')}</option>`;
            if (selectedCountry && arabCountries[selectedCountry]) {
                arabCountries[selectedCountry].forEach(city => {
                    const option = document.createElement("option");
                    option.value = city;
                    option.textContent = city;
                    if (city === selectedCity) {
                        option.selected = true;
                    }
                    citySelect.appendChild(option);
                });
            }
        };
        populateCities(initialCountry, initialCity);
        countrySelect.addEventListener("change", function () {
            populateCities(this.value, null);
        });
        countrySelect.disabled = true;
        citySelect.disabled = true;
    }

    // ==========================================
    // 3. إدارة وضع التعديل (Edit Mode)
    // ==========================================
    const inputsToToggle = [
        settingsForm.querySelector('#fullName'),
        settingsForm.querySelector('#bio'),
        settingsForm.querySelector('#profileTitle')
    ];
    const editButton = settingsForm.querySelector('[data-i18n-key="settings-account-info-edit"]');
    const saveButton = settingsForm.querySelector('[data-i18n-key="settings-save-changes"]');

    function toggleEditMode(enable) {
        // الحقول العادية
        inputsToToggle.forEach(input => { if (input) input.disabled = !enable; });
        
        // القوائم
        document.getElementById('country').disabled = !enable;
        document.getElementById('city').disabled = !enable;

        // منطق الهاتف الموثق (يبقى disabled دائماً إذا كان Verified)
        const phoneInput = document.getElementById('phone');
        if (phoneInput) {
            if (user.isPhoneVerified) {
                phoneInput.disabled = true;
                phoneInput.style.backgroundColor = "#f3f4f6";
            } else {
                phoneInput.disabled = !enable;
                phoneInput.style.backgroundColor = "";
            }
        }

        // الإيميل لا يعدل أبداً
        const emailInput = document.getElementById('email');
        if (emailInput) emailInput.disabled = true;

        // زر التحقق يختفي عند التعديل ويظهر عند الانتهاء (إذا لم يكن موثقاً)
        const btnStartVerify = document.getElementById('btnStartVerify');
        if (btnStartVerify && !user.isPhoneVerified) {
            btnStartVerify.style.display = enable ? 'none' : 'block';
        }

        // تفعيل أزرار الإضافة في البطاقات
        document.querySelectorAll('.settings-card button:not([type="submit"])').forEach(btn => {
            if(btn.id !== 'btnStartVerify' && btn.id !== 'btnConfirmOTP') btn.disabled = !enable;
        });

        settingsForm.classList.toggle('is-editing', enable);
    }

    if (editButton) {
        editButton.onclick = (e) => {
            e.preventDefault();
            toggleEditMode(true);
        };
    }

    // تعبئة القيم المبدئية
    settingsForm.querySelector('#email').value = user.email || '';
    settingsForm.querySelector('#fullName').value = user.fullName || '';
    settingsForm.querySelector('#phone').value = user.phone || '';
    settingsForm.querySelector('#bio').value = user.bio || '';
    settingsForm.querySelector('#profileTitle').value = user.profileTitle || '';

    initCountryCityDropdowns(user.location);

    // ==========================================
    // 4. إدارة المهارات والخبرات والتعليم
    // ==========================================
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

    if (addSkillBtn) addSkillBtn.addEventListener('click', () => createSkillRow());

    function createRow(template, container, data, populateFn) {
        if (!template || !container) return;
        const content = template.content.cloneNode(true);
        if (data) populateFn(content, data);
        container.appendChild(content);
    }

    // تعبئة البيانات الأخرى
    if (socialLinksContainer && user.socialLinks) {
        user.socialLinks.forEach(link => createRow(socialLinkTemplate, socialLinksContainer, link, (content, data) => {
            content.querySelector('.social-platform').value = data.platform;
            content.querySelector('.social-url').value = data.url;
        }));
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
            if (user.interests && user.interests.includes(interestText)) tag.classList.add('selected');
            tag.addEventListener('click', () => tag.classList.toggle('selected'));
            interestsContainer.appendChild(tag);
        });
    }

    if (user.achievements) {
        user.achievements.forEach(ach => createRow(achievementTemplate, achievementsContainer, ach, (content, data) => {
            content.querySelector('.ach-title').value = data.title;
            content.querySelector('.ach-issuer').value = data.issuer;
            content.querySelector('.ach-year').value = data.year;
        }));
    }

    if (user.professionalExperience) {
        user.professionalExperience.forEach(exp => createRow(experienceTemplate, experienceContainer, exp, (content, data) => {
            content.querySelector('.exp-title').value = data.title;
            content.querySelector('.exp-company').value = data.company;
            content.querySelector('.exp-period').value = data.period;
            content.querySelector('.exp-description').value = data.description;
        }));
    }

    if (user.education) {
        user.education.forEach(edu => createRow(educationTemplate, educationContainer, edu, (content, data) => {
            content.querySelector('.edu-degree').value = data.degree;
            content.querySelector('.edu-institution').value = data.institution;
            content.querySelector('.edu-details').value = data.details;
        }));
    }

    // تفعيل أزرار الإضافة
    if (addSocialLinkBtn) addSocialLinkBtn.onclick = () => createRow(socialLinkTemplate, socialLinksContainer, null, () => { });
    if (addAchievementBtn) addAchievementBtn.onclick = () => createRow(achievementTemplate, achievementsContainer, null, () => { });
    if (addExperienceBtn) addExperienceBtn.onclick = () => createRow(experienceTemplate, experienceContainer, null, () => { });
    if (addEducationBtn) addEducationBtn.onclick = () => createRow(educationTemplate, educationContainer, null, () => { });

    // الحذف الديناميكي
    settingsForm.addEventListener('click', e => {
        const row = e.target.closest('.social-link-row, .achievement-form-row, .dynamic-form-row, .skill-row');
        if (e.target.closest('.remove-link-btn, .remove-ach-btn, .remove-row-btn') && row) row.remove();
    });

    // ==========================================
    // 5. حفظ البيانات (Submit)
    // ==========================================
    if (settingsForm && saveButton) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const country = document.getElementById('country').value;
            const city = document.getElementById('city').value;
            if (!country || !city) return alert(t('js-settings-alert-select-country-city'));

            const updatedData = {
                fullName: document.getElementById('fullName').value,
                phone: document.getElementById('phone').value,
                location: `${city}, ${country}`,
                bio: document.getElementById('bio').value,
                profileTitle: document.getElementById('profileTitle').value,
                skills: Array.from(document.querySelectorAll('.skill-row')).map(row => ({
                    name: row.querySelector('.skill-name').value.trim(),
                    level: parseInt(row.querySelector('.skill-level').value, 10)
                })).filter(s => s.name),
                socialLinks: Array.from(document.querySelectorAll('.social-link-row')).map(row => ({
                    platform: row.querySelector('.social-platform').value,
                    url: row.querySelector('.social-url').value.trim()
                })).filter(l => l.url),
                interests: Array.from(document.querySelectorAll('.interest-tag.selected')).map(tag => tag.dataset.interest),
                professionalExperience: Array.from(document.querySelectorAll('#experienceFormContainer .dynamic-form-row')).map(row => ({
                    title: row.querySelector('.exp-title').value,
                    company: row.querySelector('.exp-company').value,
                    period: row.querySelector('.exp-period').value,
                    description: row.querySelector('.exp-description').value,
                })),
                education: Array.from(document.querySelectorAll('#educationFormContainer .dynamic-form-row')).map(row => ({
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
            }
        });
    }

    toggleEditMode(false);
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match]));
}