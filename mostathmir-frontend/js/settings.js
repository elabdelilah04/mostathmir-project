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

    // ==========================================
    // 1. نظام تحقق رقم الهاتف (0000)
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

        btnStartVerify.onclick = (e) => {
            e.preventDefault();
            const currentPhone = phoneInput ? phoneInput.value : (user.phone || '...');
            if (otpSentMessage) otpSentMessage.textContent = `${t('js-phone-otp-sent-prefix')} ${currentPhone}`;
            otpSection.style.display = 'block';
            btnStartVerify.style.display = 'none';
        };

        if (btnConfirmOTP) {
            btnConfirmOTP.onclick = async (e) => {
                e.preventDefault();
                if (otpInput.value === '0000') {
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
                            otpSection.style.display = 'none';
                            if (phoneVerifiedBadge) phoneVerifiedBadge.style.display = 'flex';
                            user.isPhoneVerified = true;
                            if (phoneInput) {
                                phoneInput.disabled = true;
                                phoneInput.style.backgroundColor = "#f3f4f6";
                            }
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
    }

    setupPhoneVerification(user);

    // ==========================================
    // 2. إدارة وضع التعديل (إصلاح زر التعديل)
    // ==========================================
    
    // اختيار كل أزرار التعديل الموجودة في الصفحة
    const editButtons = document.querySelectorAll('[data-i18n-key="settings-account-info-edit"]');
    
    function toggleEditMode(enable) {
        // تحديد الحقول المراد تفعيلها
        const fieldIds = ['fullName', 'bio', 'profileTitle', 'country', 'city'];
        fieldIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = !enable;
        });

        // منطق الهاتف الموثق (ممنوع التعديل إذا كانVerified)
        const phoneInput = document.getElementById('phone');
        if (phoneInput) {
            if (user.isPhoneVerified) {
                phoneInput.disabled = true;
                phoneInput.style.backgroundColor = "#f3f4f6";
            } else {
                phoneInput.disabled = !enable;
            }
        }

        // الإيميل دائماً معطل
        const emailInput = document.getElementById('email');
        if (emailInput) emailInput.disabled = true;

        // تفعيل أزرار الإضافة (مهارات، خبرات...)
        const actionButtons = document.querySelectorAll('.settings-card button:not([type="submit"])');
        actionButtons.forEach(btn => {
            if (btn.id !== 'btnStartVerify' && btn.id !== 'btnConfirmOTP') {
                btn.disabled = !enable;
            }
        });

        // زر التحقق يختفي في وضع التعديل لترك مساحة
        const btnStartVerify = document.getElementById('btnStartVerify');
        if (btnStartVerify && !user.isPhoneVerified) {
            btnStartVerify.style.display = enable ? 'none' : 'block';
        }

        settingsForm.classList.toggle('is-editing', enable);
    }

    // ربط الحدث بكل أزرار التعديل
    editButtons.forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            toggleEditMode(true);
            console.log("Edit mode enabled");
        };
    });

    // ==========================================
    // 3. تعبئة البيانات والمصفوفات
    // ==========================================
    const basicFields = ['email', 'fullName', 'phone', 'bio', 'profileTitle'];
    basicFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = user[id] || '';
    });

    // دالة إنشاء الصفوف
    function createRow(templateId, containerId, data, populateFn) {
        const template = document.getElementById(templateId);
        const container = document.getElementById(containerId);
        if (!template || !container) return;
        const content = template.content.cloneNode(true);
        if (data) populateFn(content, data);
        container.appendChild(content);
    }

    // مهارات
    if (user.skills) {
        const container = document.getElementById('skillsFormContainer');
        if (container) {
            container.innerHTML = '';
            user.skills.forEach(s => createRow('skillTemplate', 'skillsFormContainer', s, (c, d) => {
                c.querySelector('.skill-name').value = d.name;
                c.querySelector('.skill-level').value = d.level;
                c.querySelector('.skill-level-value').textContent = `${d.level}%`;
            }));
        }
    }

    // خبرات
    if (user.professionalExperience) {
        const container = document.getElementById('experienceFormContainer');
        if (container) {
            container.innerHTML = '';
            user.professionalExperience.forEach(e => createRow('experienceTemplate', 'experienceFormContainer', e, (c, d) => {
                c.querySelector('.exp-title').value = d.title;
                c.querySelector('.exp-company').value = d.company;
                c.querySelector('.exp-period').value = d.period;
                c.querySelector('.exp-description').value = d.description;
            }));
        }
    }

    // تعليم
    if (user.education) {
        const container = document.getElementById('educationFormContainer');
        if (container) {
            container.innerHTML = '';
            user.education.forEach(e => createRow('educationTemplate', 'educationFormContainer', e, (c, d) => {
                c.querySelector('.edu-degree').value = d.degree;
                c.querySelector('.edu-institution').value = d.institution;
                c.querySelector('.edu-details').value = d.details;
            }));
        }
    }

    // اجتماعي
    if (user.socialLinks) {
        const container = document.getElementById('socialLinksContainer');
        if (container) {
            container.innerHTML = '';
            user.socialLinks.forEach(l => createRow('socialLinkTemplate', 'socialLinksContainer', l, (c, d) => {
                c.querySelector('.social-platform').value = d.platform;
                c.querySelector('.social-url').value = d.url;
            }));
        }
    }

    // ربط أزرار الإضافة
    const btnAddSkill = document.getElementById('addSkillBtn');
    if (btnAddSkill) btnAddSkill.onclick = () => createRow('skillTemplate', 'skillsFormContainer', null, () => {});
    
    const btnAddExp = document.getElementById('addExperienceBtn');
    if (btnAddExp) btnAddExp.onclick = () => createRow('experienceTemplate', 'experienceFormContainer', null, () => {});
    
    const btnAddEdu = document.getElementById('addEducationBtn');
    if (btnAddEdu) btnAddEdu.onclick = () => createRow('educationTemplate', 'educationFormContainer', null, () => {});
    
    const btnAddSocial = document.getElementById('addSocialLinkBtn');
    if (btnAddSocial) btnAddSocial.onclick = () => createRow('socialLinkTemplate', 'socialLinksContainer', null, () => {});

    // الحذف والتحكم في المهارات
    settingsForm.addEventListener('input', e => {
        if (e.target.classList.contains('skill-level')) {
            const valSpan = e.target.parentElement.querySelector('.skill-level-value');
            if (valSpan) valSpan.textContent = `${e.target.value}%`;
        }
    });

    settingsForm.addEventListener('click', e => {
        const delBtn = e.target.closest('.remove-row-btn, .remove-ach-btn, .remove-link-btn');
        if (delBtn) {
            const row = delBtn.closest('.dynamic-form-row, .achievement-form-row, .social-link-row, .skill-row');
            if (row) row.remove();
        }
    });

    // ==========================================
    // 4. حفظ البيانات (Submit)
    // ==========================================
    settingsForm.onsubmit = async (e) => {
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
    };

    // وضع القراءة فقط عند التحميل
    toggleEditMode(false);
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}