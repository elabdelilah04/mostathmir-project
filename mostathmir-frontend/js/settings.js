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

    // ============================================================
    // 1. منطق التنقل الجانبي الجديد (Tab Switching) - كلاسات فريدة
    // ============================================================
    const stLinks = document.querySelectorAll('.st-nav-link');
    const stContents = document.querySelectorAll('.st-tab-content');

    stLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');

            stLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            stContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetId) {
                    content.classList.add('active');
                }
            });

            if (window.innerWidth < 992) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });

    // ============================================================
    // 2. منطق تحقق رقم الهاتف (إصلاح شامل لعدم الاختفاء والعمل)
    // ============================================================
    const btnStartVerify = document.getElementById('btnStartVerify');
    const otpSection = document.getElementById('otpSection');
    const phoneVerifiedBadge = document.getElementById('phoneVerifiedBadge');
    const phoneInput = document.getElementById('phone');

    function refreshPhoneUI() {
        if (user.isPhoneVerified) {
            if (phoneVerifiedBadge) phoneVerifiedBadge.style.display = 'flex';
            if (btnStartVerify) btnStartVerify.style.display = 'none';
            if (otpSection) otpSection.style.display = 'none';
            if (phoneInput) {
                phoneInput.disabled = true;
                phoneInput.style.backgroundColor = "#f3f4f6";
            }
        } else {
            if (phoneVerifiedBadge) phoneVerifiedBadge.style.display = 'none';
            if (btnStartVerify) btnStartVerify.style.display = 'block';
        }
    }
    refreshPhoneUI();

    if (btnStartVerify) {
        btnStartVerify.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation(); // منع تداخل الأحداث
            const currentPhone = phoneInput.value || user.phone || '...';
            document.getElementById('otpSentMessage').textContent = `${t('js-phone-otp-sent-prefix')} ${currentPhone}`;
            otpSection.style.display = 'block';
            btnStartVerify.style.display = 'none';
        };
    }

    const btnConfirmOTP = document.getElementById('btnConfirmOTP');
    if (btnConfirmOTP) {
        btnConfirmOTP.onclick = async (e) => {
            e.preventDefault();
            const otpVal = document.getElementById('otpInput').value;
            if (otpVal === '0000') {
                btnConfirmOTP.disabled = true;
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
                        user.isPhoneVerified = true;
                        refreshPhoneUI();
                    }
                } catch (err) {
                    alert('Error');
                } finally {
                    btnConfirmOTP.disabled = false;
                }
            } else {
                alert(t('js-phone-otp-error'));
            }
        };
    }

    // ==========================================
    // 3. القائمة الكاملة للدول والمدن
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
        let initialCountry = '', initialCity = '';
        if (currentLocation && currentLocation.includes(', ')) {
            const parts = currentLocation.split(', ');
            initialCity = parts[0]; initialCountry = parts[1];
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
        countrySelect.onchange = function () { populateCities(this.value, null); };
        countrySelect.disabled = true; citySelect.disabled = true;
    }

    // ==========================================
    // 4. إدارة وضع التعديل (Edit Mode)
    // ==========================================
    function toggleEditMode(enable) {
        // استهداف كافة الحقول في الفورم لضمان فتح التبويبات المخفية أيضاً
        const allInputs = settingsForm.querySelectorAll('input, select, textarea, button:not([type="submit"]):not(#editBtnGlobal)');

        allInputs.forEach(input => {
            if (input.id === 'email') return;
            if (input.id === 'phone' && user.isPhoneVerified) {
                input.disabled = true;
                return;
            }
            if (input.id === 'otpInput') return; // حقل الـ OTP يظل مفعلاً عند ظهوره

            input.disabled = !enable;

            const switchContainer = input.closest('.switch-toggle');
            if (switchContainer) {
                switchContainer.style.opacity = enable ? '1' : '0.6';
                switchContainer.style.pointerEvents = enable ? 'auto' : 'none';
            }
        });

        // التأكد من أن زر التأكيد لا يختفي إلا إذا كان الهاتف موثقاً
        if (btnStartVerify) {
            btnStartVerify.style.display = (user.isPhoneVerified) ? 'none' : 'block';
        }

        settingsForm.classList.toggle('is-editing', enable);
    }

    const editButton = document.getElementById('editBtnGlobal');
    if (editButton) {
        editButton.onclick = (e) => {
            e.preventDefault();
            toggleEditMode(true);
        };
    }

    // ============================================================
    // 5. تعبئة البيانات والمصفوفات (مع إفراغ الحاويات لمنع التكرار)
    // ============================================================
    document.getElementById('email').value = user.email || '';
    document.getElementById('fullName').value = user.fullName || '';
    document.getElementById('phone').value = user.phone || '';
    document.getElementById('bio').value = user.bio || '';
    document.getElementById('profileTitle').value = user.profileTitle || '';

    const showEmailCheck = document.getElementById('showEmailPublicly');
    const showPhoneCheck = document.getElementById('showPhonePublicly');
    if (showEmailCheck) showEmailCheck.checked = !!user.showEmailPublicly;
    if (showPhoneCheck) showPhoneCheck.checked = !!user.showPhonePublicly;

    initCountryCityDropdowns(user.location);

    function createRow(templateId, containerId, data, populateFn) {
        const template = document.getElementById(templateId);
        const container = document.getElementById(containerId);
        if (!template || !container) return;
        const content = template.content.cloneNode(true);
        if (data) populateFn(content, data);
        container.appendChild(content);
    }

    // إفراغ الحاويات قبل التعبئة لمنع تكرار البيانات عند التحميل
    const containers = ['skillsFormContainer', 'experienceFormContainer', 'educationFormContainer', 'socialLinksContainer'];
    containers.forEach(id => { const c = document.getElementById(id); if (c) c.innerHTML = ''; });

    if (user.skills) user.skills.forEach(s => createRow('skillTemplate', 'skillsFormContainer', s, (c, d) => {
        c.querySelector('.skill-name').value = d.name;
        c.querySelector('.skill-level').value = d.level;
        c.querySelector('.skill-level-value').textContent = `${d.level}%`;
    }));

    if (user.professionalExperience) user.professionalExperience.forEach(e => createRow('experienceTemplate', 'experienceFormContainer', e, (c, d) => {
        c.querySelector('.exp-title').value = d.title;
        c.querySelector('.exp-company').value = d.company;
        c.querySelector('.exp-period').value = d.period;
        c.querySelector('.exp-description').value = d.description;
    }));

    if (user.education) user.education.forEach(edu => createRow('educationTemplate', 'educationFormContainer', edu, (c, d) => {
        c.querySelector('.edu-degree').value = d.degree;
        c.querySelector('.edu-institution').value = d.institution;
        c.querySelector('.edu-details').value = d.details;
    }));

    if (user.socialLinks) user.socialLinks.forEach(l => createRow('socialLinkTemplate', 'socialLinksContainer', l, (c, d) => {
        c.querySelector('.social-platform').value = d.platform;
        c.querySelector('.social-url').value = d.url;
    }));

    // أزرار الإضافة
    document.getElementById('addSkillBtn').onclick = (e) => { e.preventDefault(); createRow('skillTemplate', 'skillsFormContainer', null, () => { }); };
    document.getElementById('addExperienceBtn').onclick = (e) => { e.preventDefault(); createRow('experienceTemplate', 'experienceFormContainer', null, () => { }); };
    document.getElementById('addEducationBtn').onclick = (e) => { e.preventDefault(); createRow('educationTemplate', 'educationFormContainer', null, () => { }); };
    document.getElementById('addSocialLinkBtn').onclick = (e) => { e.preventDefault(); createRow('socialLinkTemplate', 'socialLinksContainer', null, () => { }); };

    // ============================================================
    // 6. منطق الحذف وتحديث نسبة المهارة (إصلاح مستمع الأحداث)
    // ============================================================
    settingsForm.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.remove-row-btn, .remove-link-btn, .remove-ach-btn');
        if (delBtn) {
            e.preventDefault();
            const row = delBtn.closest('.dynamic-form-row, .social-link-row, .skill-row');
            if (row) row.remove();
        }
    });

    settingsForm.addEventListener('input', (e) => {
        if (e.target.classList.contains('skill-level')) {
            const valSpan = e.target.parentElement.querySelector('.skill-level-value');
            if (valSpan) valSpan.textContent = `${e.target.value}%`;
        }
    });

    // ============================================================
    // 7. حفظ البيانات (إصلاح التكرار: جمع شامل لمرة واحدة فقط)
    // ============================================================
    settingsForm.onsubmit = async (e) => {
        e.preventDefault();

        // التحقق من الموقع
        const country = document.getElementById('country').value;
        const city = document.getElementById('city').value;
        if (!country || !city) return alert(t('js-settings-alert-select-country-city'));

        // جمع البيانات من العناصر الموجودة حالياً في الـ DOM حصراً
        const updatedData = {
            fullName: document.getElementById('fullName').value,
            phone: document.getElementById('phone').value,
            location: `${city}, ${country}`,
            bio: document.getElementById('bio').value,
            profileTitle: document.getElementById('profileTitle').value,
            showEmailPublicly: document.getElementById('showEmailPublicly').checked,
            showPhonePublicly: document.getElementById('showPhonePublicly').checked,

            // جمع المهارات الحالية فقط
            skills: Array.from(document.querySelectorAll('.skill-row')).map(r => ({
                name: r.querySelector('.skill-name').value,
                level: r.querySelector('.skill-level').value
            })).filter(s => s.name),

            // جمع الروابط الاجتماعية الحالية فقط
            socialLinks: Array.from(document.querySelectorAll('.social-link-row')).map(r => ({
                platform: r.querySelector('.social-platform').value,
                url: r.querySelector('.social-url').value
            })).filter(l => l.url),

            // جمع الخبرات الحالية فقط
            professionalExperience: Array.from(document.querySelectorAll('#experienceFormContainer .dynamic-form-row')).map(r => ({
                title: r.querySelector('.exp-title').value,
                company: r.querySelector('.exp-company').value,
                period: r.querySelector('.exp-period').value,
                description: r.querySelector('.exp-description').value
            })),

            // جمع التعليم الحالي فقط
            education: Array.from(document.querySelectorAll('#educationFormContainer .dynamic-form-row')).map(r => ({
                degree: r.querySelector('.edu-degree').value,
                institution: r.querySelector('.edu-institution').value,
                details: r.querySelector('.edu-details').value
            }))
        };

        const saveBtn = document.getElementById('saveAllBtn');
        saveBtn.disabled = true;
        saveBtn.textContent = '...';

        try {
            const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(updatedData)
            });
            if (res.ok) {
                alert(t('js-settings-success-update'));
                window.location.reload();
            } else {
                alert('Error saving data');
            }
        } catch (err) {
            console.error(err);
        } finally {
            saveBtn.disabled = false;
        }
    };

    // التشغيل الأولي: قفل كل شيء
    toggleEditMode(false);
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}