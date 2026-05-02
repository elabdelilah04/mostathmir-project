/* ============================================================
   MOSTATHMIR PLATFORM - SETTINGS ENGINE (TRANSLATED VERSION)
   ============================================================ */

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
        if (!response.ok) throw new Error('Auth Failed');
        const user = await response.json();

        initSettingsPage(user);

        if (window.translatePage) window.translatePage();
    } catch (error) {
        console.error("Critical Load Error:", error);
        alert(t('js-settings-error-load'));
    }
});

async function initSettingsPage(user) {
    const settingsForm = document.getElementById('settingsForm');
    const API_BASE_URL = "https://mostathmir-api.onrender.com";
    const token = localStorage.getItem('user_token');

    // 1. منطق التنقل الجانبي (Side Tabs)
    const stLinks = document.querySelectorAll('.st-nav-link');
    const stContents = document.querySelectorAll('.st-tab-content');

    stLinks.forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            stLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            stContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetId) content.classList.add('active');
            });
        };
    });

    // 2. إدارة حالة الهاتف (التحقق المترجم)
    const phoneInput = document.getElementById('phone');
    const btnStartVerify = document.getElementById('btnStartVerify');
    const otpSection = document.getElementById('otpSection');
    const phoneVerifiedBadge = document.getElementById('phoneVerifiedBadge');

    function updatePhoneUI() {
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
    updatePhoneUI();

    if (btnStartVerify) {
        btnStartVerify.onclick = (e) => {
            e.preventDefault();
            const currentNum = phoneInput.value || user.phone || '...';
            document.getElementById('otpSentMessage').textContent = `${t('js-phone-otp-sent-prefix')} ${currentNum}`;
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
                try {
                    const res = await fetch(`${API_BASE_URL}/api/users/verify-phone-manual`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        alert(t('js-phone-verify-success'));
                        user.isPhoneVerified = true;
                        updatePhoneUI();
                    }
                } catch (err) { alert(t('js-auth-server-error')); }
            } else {
                alert(t('js-phone-otp-error'));
            }
        };
    }

    // 3. دالة التحكم في وضع التعديل
    function toggleEditMode(enable) {
        const allInputs = settingsForm.querySelectorAll('input, select, textarea, button:not([type="submit"]):not(#editBtnGlobal)');
        allInputs.forEach(input => {
            if (input.id === 'email') return;
            if (input.id === 'phone' && user.isPhoneVerified) {
                input.disabled = true;
                return;
            }
            if (input.id === 'otpInput' || input.id === 'btnConfirmOTP') return;
            input.disabled = !enable;
            const switchCont = input.closest('.switch-toggle');
            if (switchCont) {
                switchCont.style.opacity = enable ? '1' : '0.6';
                switchCont.style.pointerEvents = enable ? 'auto' : 'none';
            }
        });
        if (btnStartVerify && !user.isPhoneVerified) btnStartVerify.style.display = 'block';
        settingsForm.classList.toggle('is-editing', enable);
    }

    document.getElementById('editBtnGlobal').onclick = (e) => {
        e.preventDefault();
        toggleEditMode(true);
    };

    // 4. تعبئة البيانات (منع التكرار)
    function populateFields() {
        document.getElementById('email').value = user.email || '';
        document.getElementById('fullName').value = user.fullName || '';
        document.getElementById('phone').value = user.phone || '';
        document.getElementById('bio').value = user.bio || '';
        document.getElementById('profileTitle').value = user.profileTitle || '';

        if (document.getElementById('showEmailPublicly'))
            document.getElementById('showEmailPublicly').checked = !!user.showEmailPublicly;
        if (document.getElementById('showPhonePublicly'))
            document.getElementById('showPhonePublicly').checked = !!user.showPhonePublicly;

        const containers = ['skillsFormContainer', 'experienceFormContainer', 'educationFormContainer', 'socialLinksContainer', 'achievementsFormContainer'];
        containers.forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = ''; });

        if (user.skills) user.skills.forEach(s => createRow('skillTemplate', 'skillsFormContainer', s, (c, d) => {
            c.querySelector('.skill-name').value = d.name;
            c.querySelector('.skill-level').value = d.level;
            c.querySelector('.skill-level-value').textContent = `${d.level}%`;
        }));

        if (user.professionalExperience) user.professionalExperience.forEach(e => createRow('experienceTemplate', 'experienceFormContainer', e, (c, d) => {
            c.querySelector('.exp-title').value = d.title; c.querySelector('.exp-company').value = d.company;
            c.querySelector('.exp-period').value = d.period; c.querySelector('.exp-description').value = d.description;
        }));

        if (user.education) user.education.forEach(edu => createRow('educationTemplate', 'educationFormContainer', edu, (c, d) => {
            c.querySelector('.edu-degree').value = d.degree; c.querySelector('.edu-institution').value = d.institution;
            c.querySelector('.edu-details').value = d.details;
        }));

        if (user.socialLinks) user.socialLinks.forEach(l => createRow('socialLinkTemplate', 'socialLinksContainer', l, (c, d) => {
            c.querySelector('.social-platform').value = d.platform; c.querySelector('.social-url').value = d.url;
        }));
    }

    function createRow(templateId, containerId, data, populateFn) {
        const template = document.getElementById(templateId);
        const container = document.getElementById(containerId);
        if (!template || !container) return;
        const content = template.content.cloneNode(true);
        if (data) populateFn(content, data);
        container.appendChild(content);
    }

    const bindBtn = (id, temp, cont) => {
        const b = document.getElementById(id);
        if (b) b.onclick = (e) => { e.preventDefault(); createRow(temp, cont, null, () => { }); };
    };
    bindBtn('addSkillBtn', 'skillTemplate', 'skillsFormContainer');
    bindBtn('addExperienceBtn', 'experienceTemplate', 'experienceFormContainer');
    bindBtn('addEducationBtn', 'educationTemplate', 'educationFormContainer');
    bindBtn('addSocialLinkBtn', 'socialLinkTemplate', 'socialLinksContainer');

    settingsForm.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.remove-row-btn, .remove-link-btn, .remove-ach-btn');
        if (delBtn) {
            e.preventDefault();
            delBtn.closest('.dynamic-form-row, .social-link-row, .skill-row').remove();
        }
    });

    settingsForm.addEventListener('input', (e) => {
        if (e.target.classList.contains('skill-level')) {
            e.target.parentElement.querySelector('.skill-level-value').textContent = `${e.target.value}%`;
        }
    });

    // 5. القائمة الكاملة للدول والمدن
    const arabCountries = { [t('js-country-morocco')]: [t('js-city-rabat'), t('js-city-casablanca'), t('js-city-marrakech')], [t('js-country-saudi')]: [t('js-city-riyadh'), t('js-city-jeddah')], [t('js-country-uae')]: [t('js-city-dubai'), t('js-city-abudhabi')], [t('js-country-egypt')]: [t('js-city-cairo'), t('js-city-alexandria')] };

    function initLocation(currentLoc) {
        const countrySel = document.getElementById("country");
        const citySel = document.getElementById("city");
        if (!countrySel || !citySel) return;
        let initialCountry = '', initialCity = '';
        if (currentLoc && currentLoc.includes(', ')) { const parts = currentLoc.split(', '); initialCity = parts[0]; initialCountry = parts[1]; }
        countrySel.innerHTML = `<option value="">${t('settings-country-select')}</option>`;
        Object.keys(arabCountries).forEach(c => {
            const opt = new Option(c, c); if (c === initialCountry) opt.selected = true;
            countrySel.appendChild(opt);
        });
        const fillCities = (country, city) => {
            citySel.innerHTML = `<option value="">${t('js-settings-select-city')}</option>`;
            if (country && arabCountries[country]) {
                arabCountries[country].forEach(cn => {
                    const opt = new Option(cn, cn); if (cn === city) opt.selected = true;
                    citySel.appendChild(opt);
                });
            }
        };
        fillCities(initialCountry, initialCity);
        countrySel.onchange = function () { fillCities(this.value, null); };
    }

    // 6. حفظ البيانات النهائي المترجم
    settingsForm.onsubmit = async (e) => {
        e.preventDefault();
        const country = document.getElementById('country').value;
        const city = document.getElementById('city').value;
        if (!country || !city) return alert(t('js-settings-alert-select-country-city'));

        const saveBtn = document.getElementById('saveAllBtn') || e.submitter;
        const originalText = saveBtn.textContent;
        if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = t('js-settings-saving'); }

        const updatedData = {
            fullName: document.getElementById('fullName').value,
            phone: document.getElementById('phone').value,
            location: `${city}, ${country}`,
            bio: document.getElementById('bio').value,
            profileTitle: document.getElementById('profileTitle').value,
            showEmailPublicly: document.getElementById('showEmailPublicly').checked,
            showPhonePublicly: document.getElementById('showPhonePublicly').checked,
            skills: Array.from(document.querySelectorAll('.skill-row')).map(r => ({ name: r.querySelector('.skill-name').value, level: r.querySelector('.skill-level').value })).filter(s => s.name),
            socialLinks: Array.from(document.querySelectorAll('.social-link-row')).map(r => ({ platform: r.querySelector('.social-platform').value, url: r.querySelector('.social-url').value })).filter(l => l.url),
            professionalExperience: Array.from(document.querySelectorAll('#experienceFormContainer .dynamic-form-row')).map(r => ({ title: r.querySelector('.exp-title').value, company: r.querySelector('.exp-company').value, period: r.querySelector('.exp-period').value, description: r.querySelector('.exp-description').value })),
            education: Array.from(document.querySelectorAll('#educationFormContainer .dynamic-form-row')).map(r => ({ degree: r.querySelector('.edu-degree').value, institution: r.querySelector('.edu-institution').value, details: r.querySelector('.edu-details').value }))
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
            } else {
                alert(t('js-settings-error-save'));
            }
        } catch (err) { alert(t('js-auth-server-error')); }
        finally { if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = originalText; } }
    };

    populateFields();
    initLocation(user.location);
    toggleEditMode(false);
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}