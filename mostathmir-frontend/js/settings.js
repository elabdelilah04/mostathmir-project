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
    // 1. منطق التنقل الجانبي (Tab Switching)
    // ==========================================
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.settings-tab-content');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-target');

            // 1. تحديث شكل الأزرار في القائمة
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // 2. تبديل المحتوى المرئي
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetId) {
                    content.classList.add('active');
                }
            });

            // التمرير للأعلى عند تغيير التبويب (للموبايل)
            if (window.innerWidth < 992) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });

    // ==========================================
    // 2. منطق تحقق رقم الهاتف (0000)
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
            if (phoneVerifiedBadge) phoneVerifiedBadge.style.display = 'flex';
            btnStartVerify.style.display = 'none';
            if (phoneInput) {
                phoneInput.disabled = true;
                phoneInput.style.backgroundColor = "#f3f4f6";
            }
        } else {
            if (phoneVerifiedBadge) phoneVerifiedBadge.style.display = 'none';
            btnStartVerify.style.display = 'block';
        }

        // الضغط على "تأكيد الرقم"
        btnStartVerify.onclick = (e) => {
            e.preventDefault();
            const currentPhone = phoneInput.value || user.phone || 'المسجل';
            otpSentMessage.textContent = `${t('js-phone-otp-sent-prefix')} ${currentPhone}`;
            otpSection.style.display = 'block';
            btnStartVerify.style.display = 'none';
        };

        // الضغط على زر "تأكيد" الكود
        btnConfirmOTP.onclick = async (e) => {
            e.preventDefault();
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
                        if (phoneVerifiedBadge) phoneVerifiedBadge.style.display = 'flex';
                        user.isPhoneVerified = true;
                        if (phoneInput) {
                            phoneInput.disabled = true;
                            phoneInput.style.backgroundColor = "#f3f4f6";
                        }
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

    setupPhoneVerification(user);


    // ==========================================
    // 3. منطق الدول والمدن
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
    // 4. إدارة وضع التعديل (Edit Mode)
    // ==========================================

    // تعريف مفاتيح الخصوصية
    const showEmailPublicly = document.getElementById('showEmailPublicly');
    const showPhonePublicly = document.getElementById('showPhonePublicly');

    const inputsToToggle = [
        settingsForm.querySelector('#fullName'),
        settingsForm.querySelector('#bio'),
        settingsForm.querySelector('#profileTitle'),
        showEmailPublicly,
        showPhonePublicly,
        document.getElementById('notifications'),
        document.getElementById('privacy')
    ];

    const editButton = settingsForm.querySelector('[data-i18n-key="settings-account-info-edit"]');
    const saveButton = settingsForm.querySelector('[data-i18n-key="settings-save-changes"]');

    function toggleEditMode(enable) {
        // تفعيل/تعطيل الحقول العادية والمفاتيح
        inputsToToggle.forEach(input => {
            if (input) {
                input.disabled = !enable;
                // حل مشكلة تفاعل الأيقونات عبر pointer-events
                const container = input.closest('.switch-toggle');
                if (container) {
                    container.style.pointerEvents = enable ? 'auto' : 'none';
                    container.style.opacity = enable ? '1' : '0.6';
                }
            }
        });

        const countrySelect = document.getElementById('country');
        const citySelect = document.getElementById('city');
        if (countrySelect) countrySelect.disabled = !enable;
        if (citySelect) citySelect.disabled = !enable;

        // تفعيل أزرار الإضافة والحذف في كل الكروت
        document.querySelectorAll('.settings-card button:not([type="submit"])').forEach(btn => {
            if (btn.id !== 'btnStartVerify' && btn.id !== 'btnConfirmOTP') btn.disabled = !enable;
        });

        // منطق حماية رقم الهاتف الموثق
        const phoneInput = document.getElementById('phone');
        if (phoneInput) {
            if (user.isPhoneVerified) {
                phoneInput.disabled = true;
                phoneInput.style.backgroundColor = "#f3f4f6";
                phoneInput.style.cursor = "not-allowed";
            } else {
                phoneInput.disabled = !enable;
                phoneInput.style.backgroundColor = "";
                phoneInput.style.cursor = "";
            }
        }

        // الإيميل يبقى للقراءة فقط دائماً
        const emailInput = document.getElementById('email');
        if (emailInput) emailInput.disabled = true;

        settingsForm.classList.toggle('is-editing', enable);
    }

    if (editButton) editButton.addEventListener('click', (e) => {
        e.preventDefault();
        toggleEditMode(true);
    });

    // ==========================================
    // 5. تعبئة البيانات والمصفوفات
    // ==========================================

    // تعبئة البيانات الأساسية
    settingsForm.querySelector('#email').value = user.email || '';
    settingsForm.querySelector('#fullName').value = user.fullName || '';
    settingsForm.querySelector('#phone').value = user.phone || '';
    settingsForm.querySelector('#bio').value = user.bio || '';
    settingsForm.querySelector('#profileTitle').value = user.profileTitle || '';

    // تعبئة حالة الخصوصية
    if (showEmailPublicly) showEmailPublicly.checked = !!user.showEmailPublicly;
    if (showPhonePublicly) showPhonePublicly.checked = !!user.showPhonePublicly;

    initCountryCityDropdowns(user.location);

    // إدارة المهارات
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

    // الخبرات والتعليم والشهادات
    function createRow(templateId, containerId, data, populateFn) {
        const template = document.getElementById(templateId);
        const container = document.getElementById(containerId);
        if (!template || !container) return;
        const content = template.content.cloneNode(true);
        if (data) populateFn(content, data);
        container.appendChild(content);
    }

    if (user.professionalExperience) {
        user.professionalExperience.forEach(exp => createRow('experienceTemplate', 'experienceFormContainer', exp, (c, d) => {
            c.querySelector('.exp-title').value = d.title;
            c.querySelector('.exp-company').value = d.company;
            c.querySelector('.exp-period').value = d.period;
            c.querySelector('.exp-description').value = d.description;
        }));
    }
    if (user.education) {
        user.education.forEach(edu => createRow('educationTemplate', 'educationFormContainer', edu, (c, d) => {
            c.querySelector('.edu-degree').value = d.degree;
            c.querySelector('.edu-institution').value = d.institution;
            c.querySelector('.edu-details').value = d.details;
        }));
    }
    if (user.achievements) {
        user.achievements.forEach(ach => createRow('achievementTemplate', 'achievementsFormContainer', ach, (c, d) => {
            c.querySelector('.ach-title').value = d.title;
            c.querySelector('.ach-issuer').value = d.issuer;
            c.querySelector('.ach-year').value = d.year;
        }));
    }
    if (user.socialLinks) {
        const socialContainer = document.getElementById('socialLinksContainer');
        user.socialLinks.forEach(link => createRow('socialLinkTemplate', 'socialLinksContainer', link, (c, d) => {
            c.querySelector('.social-platform').value = d.platform;
            c.querySelector('.social-url').value = d.url;
        }));
    }

    // ربط أزرار الإضافة
    document.getElementById('addExperienceBtn').onclick = () => createRow('experienceTemplate', 'experienceFormContainer', null, () => { });
    document.getElementById('addEducationBtn').onclick = () => createRow('educationTemplate', 'educationFormContainer', null, () => { });
    document.getElementById('addAchievementBtn').onclick = () => createRow('achievementTemplate', 'achievementsFormContainer', null, () => { });
    document.getElementById('addSocialLinkBtn').onclick = () => createRow('socialLinkTemplate', 'socialLinksContainer', null, () => { });

    // منطق الحذف
    settingsForm.addEventListener('click', e => {
        const row = e.target.closest('.social-link-row, .achievement-form-row, .dynamic-form-row, .skill-row');
        if (e.target.closest('.remove-link-btn, .remove-ach-btn, .remove-row-btn') && row) {
            row.remove();
        }
    });

    // ==========================================
    // 6. حفظ البيانات (Submit)
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
            showEmailPublicly: showEmailPublicly.checked,
            showPhonePublicly: showPhonePublicly.checked,
            skills: Array.from(document.querySelectorAll('.skill-row')).map(r => ({
                name: r.querySelector('.skill-name').value,
                level: r.querySelector('.skill-level').value
            })).filter(s => s.name),
            socialLinks: Array.from(document.querySelectorAll('.social-link-row')).map(r => ({
                platform: r.querySelector('.social-platform').value,
                url: r.querySelector('.social-url').value
            })).filter(l => l.url),
            professionalExperience: Array.from(document.querySelectorAll('#experienceFormContainer .dynamic-form-row')).map(r => ({
                title: r.querySelector('.exp-title').value,
                company: r.querySelector('.exp-company').value,
                period: r.querySelector('.exp-period').value,
                description: r.querySelector('.exp-description').value
            })),
            education: Array.from(document.querySelectorAll('#educationFormContainer .dynamic-form-row')).map(r => ({
                degree: r.querySelector('.edu-degree').value,
                institution: r.querySelector('.edu-institution').value,
                details: r.querySelector('.edu-details').value
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
            alert('Error saving data');
        }
    });

    // الحالة الابتدائية
    toggleEditMode(false);
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}