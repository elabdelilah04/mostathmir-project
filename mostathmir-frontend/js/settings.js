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

        // تشغيل الصفحة بالبيانات المستلمة
        initSettingsPage(user);

        // تحديث النصوص إذا تم تغيير اللغة
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
    // 1. منطق تحقق رقم الهاتف (التعديل الجديد)
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

        // الحالة الأولية من قاعدة البيانات
        if (user.isPhoneVerified) {
            phoneVerifiedBadge.style.display = 'flex';
            btnStartVerify.style.display = 'none';
        } else {
            phoneVerifiedBadge.style.display = 'none';
            btnStartVerify.style.display = 'block';
        }

        // الضغط على "تأكيد الرقم"
        btnStartVerify.onclick = () => {
            const currentPhone = phoneInput.value || user.phone || 'المسجل';
            otpSentMessage.textContent = `${t('js-phone-otp-sent-prefix')} ${currentPhone}`;
            otpSection.style.display = 'block';
            btnStartVerify.style.display = 'none';
        };

        // الضغط على زر "تأكيد" الكود
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
                        alert('✅ تم تأكيد رقم الهاتف بنجاح!');
                        otpSection.style.display = 'none';
                        phoneVerifiedBadge.style.display = 'flex';
                        user.isPhoneVerified = true;
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
                alert('⚠️ الكود خاطئ! أدخل 0000 للتجربة.');
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

        countrySelect.innerHTML = `<option value="">${t('settings-country-select')}</option>`;
        Object.keys(arabCountries).forEach(country => {
            const option = new Option(country, country);
            if (country === initialCountry) option.selected = true;
            countrySelect.appendChild(option);
        });

        const populateCities = (selectedCountry, selectedCity) => {
            citySelect.innerHTML = `<option value="">${t('js-settings-select-city')}</option>`;
            if (selectedCountry && arabCountries[selectedCountry]) {
                arabCountries[selectedCountry].forEach(city => {
                    const option = new Option(city, city);
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

    // ==========================================
    // 3. إدارة التعديل والحقول
    // ==========================================
    const inputsToToggle = [
        settingsForm.querySelector('#fullName'),
        settingsForm.querySelector('#phone'),
        settingsForm.querySelector('#bio'),
        settingsForm.querySelector('#profileTitle')
    ];
    const editButton = settingsForm.querySelector('[data-i18n-key="settings-account-info-edit"]');
    const saveButton = settingsForm.querySelector('[data-i18n-key="settings-save-changes"]');

    function toggleEditMode(enable) {
        inputsToToggle.forEach(input => { if (input) input.disabled = !enable; });
        document.getElementById('country').disabled = !enable;
        document.getElementById('city').disabled = !enable;
        if (!user.isPhoneVerified) {
            document.getElementById('btnStartVerify').style.display = enable ? 'none' : 'block';
        }

        // تفعيل/تعطيل الأزرار الإضافية
        document.querySelectorAll('.settings-card button:not([type="submit"])').forEach(btn => {
            if (btn.id !== 'btnStartVerify' && btn.id !== 'btnConfirmOTP') btn.disabled = !enable;
        });

        settingsForm.classList.toggle('is-editing', enable);
    }

    // تعبئة البيانات الأساسية
    settingsForm.querySelector('#email').value = user.email || '';
    settingsForm.querySelector('#fullName').value = user.fullName || '';
    settingsForm.querySelector('#phone').value = user.phone || '';
    settingsForm.querySelector('#bio').value = user.bio || '';
    settingsForm.querySelector('#profileTitle').value = user.profileTitle || '';

    initCountryCityDropdowns(user.location);

    // ==========================================
    // 4. إدارة المهارات، الخبرات، التعليم (بناءً على الكود الأصلي)
    // ==========================================
    const skillsContainer = document.getElementById('skillsFormContainer');
    const skillTemplate = document.getElementById('skillTemplate');
    const addSkillBtn = document.getElementById('addSkillBtn');

    function createSkillRow(data = { name: '', level: 80 }) {
        if (!skillTemplate || !skillsContainer) return;
        const content = skillTemplate.content.cloneNode(true);
        const nameInput = content.querySelector('.skill-name');
        const levelInput = content.querySelector('.skill-level');
        const levelValue = content.querySelector('.skill-level-value');
        nameInput.value = data.name;
        levelInput.value = data.level;
        levelValue.textContent = `${data.level}%`;
        levelInput.addEventListener('input', () => { levelValue.textContent = `${levelInput.value}%`; });
        skillsContainer.appendChild(content);
    }

    if (user.skills) user.skills.forEach(skill => createSkillRow(skill));
    if (addSkillBtn) addSkillBtn.addEventListener('click', () => createSkillRow());

    // الخبرات والتعليم والشهادات (استخدام دالة createRow الموحدة)
    function createRow(templateId, containerId, data, populateFn) {
        const template = document.getElementById(templateId);
        const container = document.getElementById(containerId);
        if (!template || !container) return;
        const content = template.content.cloneNode(true);
        if (data) populateFn(content, data);
        container.appendChild(content);
    }

    if (user.professionalExperience) {
        user.professionalExperience.forEach(exp => createRow('experienceTemplate', 'experienceFormContainer', exp, (content, d) => {
            content.querySelector('.exp-title').value = d.title;
            content.querySelector('.exp-company').value = d.company;
            content.querySelector('.exp-period').value = d.period;
            content.querySelector('.exp-description').value = d.description;
        }));
    }

    if (user.education) {
        user.education.forEach(edu => createRow('educationTemplate', 'educationFormContainer', edu, (content, d) => {
            content.querySelector('.edu-degree').value = d.degree;
            content.querySelector('.edu-institution').value = d.institution;
            content.querySelector('.edu-details').value = d.details;
        }));
    }

    if (user.achievements) {
        user.achievements.forEach(ach => createRow('achievementTemplate', 'achievementsFormContainer', ach, (content, d) => {
            content.querySelector('.ach-title').value = d.title;
            content.querySelector('.ach-issuer').value = d.issuer;
            content.querySelector('.ach-year').value = d.year;
        }));
    }

    // روابط التواصل
    const socialLinksContainer = document.getElementById('socialLinksContainer');
    if (user.socialLinks) {
        user.socialLinks.forEach(link => createRow('socialLinkTemplate', 'socialLinksContainer', link, (content, d) => {
            content.querySelector('.social-platform').value = d.platform;
            content.querySelector('.social-url').value = d.url;
        }));
    }

    // ==========================================
    // 5. حفظ التغييرات (Submit)
    // ==========================================
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
                name: row.querySelector('.skill-name').value,
                level: row.querySelector('.skill-level').value
            })),
            professionalExperience: Array.from(document.querySelectorAll('#experienceFormContainer .dynamic-form-row')).map(row => ({
                title: row.querySelector('.exp-title').value,
                company: row.querySelector('.exp-company').value,
                period: row.querySelector('.exp-period').value,
                description: row.querySelector('.exp-description').value
            })),
            socialLinks: Array.from(document.querySelectorAll('.social-link-row')).map(row => ({
                platform: row.querySelector('.social-platform').value,
                url: row.querySelector('.social-url').value
            }))
        };

        try {
            const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(updatedData)
            });
            if (res.ok) {
                alert(t('js-settings-success-update'));
                window.location.reload();
            }
        } catch (err) {
            alert('خطأ أثناء حفظ البيانات');
        }
    });

    // تفعيل أزرار الإضافة والحذف
    if (editButton) editButton.onclick = () => toggleEditMode(true);
    document.getElementById('addExperienceBtn').onclick = () => createRow('experienceTemplate', 'experienceFormContainer', null, () => { });
    document.getElementById('addEducationBtn').onclick = () => createRow('educationTemplate', 'educationFormContainer', null, () => { });
    document.getElementById('addAchievementBtn').onclick = () => createRow('achievementTemplate', 'achievementsFormContainer', null, () => { });
    document.getElementById('addSocialLinkBtn').onclick = () => createRow('socialLinkTemplate', 'socialLinksContainer', null, () => { });

    // حذف الصفوف ديناميكياً
    settingsForm.addEventListener('click', e => {
        if (e.target.closest('.remove-row-btn, .remove-ach-btn, .remove-link-btn')) {
            e.target.closest('.dynamic-form-row, .achievement-form-row, .social-link-row').remove();
        }
    });

    toggleEditMode(false);
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}