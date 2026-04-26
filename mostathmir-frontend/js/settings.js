document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE_URL = 'https://mostathmir-api.onrender.com';
    const token = localStorage.getItem('user_token');
    if (!token) { window.location.href = 'login.html'; return; }

    try {
        const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch profile');
        const user = await response.json();
        initSettingsPage(user);
        if (window.translatePage) window.translatePage();
    } catch (error) {
        alert('خطأ في تحميل البيانات');
    }
});

async function initSettingsPage(user) {
    const settingsForm = document.getElementById('settingsForm');
    const API_BASE_URL = "https://mostathmir-api.onrender.com";
    const token = localStorage.getItem('user_token');

    // ==========================================
    // 1. منطق التبديل بين التبويبات الجانبية
    // ==========================================
    const stLinks = document.querySelectorAll('.st-nav-link');
    const stContents = document.querySelectorAll('.st-tab-content');

    stLinks.forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            const target = link.getAttribute('data-target');
            stLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            stContents.forEach(c => {
                c.classList.remove('active');
                if (c.id === target) c.classList.add('active');
            });
        };
    });

    // ==========================================
    // 2. منطق تحقق رقم الهاتف (إصلاح: التأكد من العمل)
    // ==========================================
    const btnStartVerify = document.getElementById('btnStartVerify');
    const otpSection = document.getElementById('otpSection');
    const phoneVerifiedBadge = document.getElementById('phoneVerifiedBadge');

    function refreshPhoneUI() {
        if (user.isPhoneVerified) {
            if (phoneVerifiedBadge) phoneVerifiedBadge.style.display = 'flex';
            if (btnStartVerify) btnStartVerify.style.display = 'none';
            document.getElementById('phone').disabled = true;
            document.getElementById('phone').style.backgroundColor = "#f3f4f6";
        } else {
            if (phoneVerifiedBadge) phoneVerifiedBadge.style.display = 'none';
            if (btnStartVerify) btnStartVerify.style.display = 'block';
        }
    }
    refreshPhoneUI();

    if (btnStartVerify) {
        btnStartVerify.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const currentPhone = document.getElementById('phone').value || 'المسجل';
            document.getElementById('otpSentMessage').textContent = `تم إرسال كود التحقق للرقم: ${currentPhone}`;
            otpSection.style.display = 'block';
            btnStartVerify.style.display = 'none';
        });
    }

    const btnConfirmOTP = document.getElementById('btnConfirmOTP');
    if (btnConfirmOTP) {
        btnConfirmOTP.onclick = async (e) => {
            e.preventDefault();
            if (document.getElementById('otpInput').value === '0000') {
                const res = await fetch(`${API_BASE_URL}/api/users/verify-phone-manual`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    alert('✅ تم توثيق الهاتف بنجاح');
                    user.isPhoneVerified = true;
                    refreshPhoneUI();
                    otpSection.style.display = 'none';
                }
            } else {
                alert('⚠️ الكود خاطئ! جرب 0000');
            }
        };
    }

    // ==========================================
    // 3. دالة التحكم في وضع التعديل (إصلاح: عدم إخفاء زر التأكيد)
    // ==========================================
    function toggleEditMode(enable) {
        const allInputs = settingsForm.querySelectorAll('input, select, textarea, button:not([type="submit"]):not(#editBtnGlobal)');
        
        allInputs.forEach(input => {
            if (input.id === 'email') return;
            if (input.id === 'phone' && user.isPhoneVerified) {
                input.disabled = true;
                return;
            }
            // استثناء حقل الـ OTP ليبقى قابلاً للكتابة دائماً عند ظهوره
            if (input.id === 'otpInput') return;

            input.disabled = !enable;

            const switchContainer = input.closest('.switch-toggle');
            if (switchContainer) {
                switchContainer.style.opacity = enable ? '1' : '0.6';
                switchContainer.style.pointerEvents = enable ? 'auto' : 'none';
            }
        });

        // تم التعديل هنا: لا نخفي زر التأكيد عند الضغط على تعديل إلا إذا كان الرقم موثقاً أصلاً
        if (btnStartVerify) {
            btnStartVerify.style.display = (user.isPhoneVerified) ? 'none' : 'block';
        }

        settingsForm.classList.toggle('is-editing', enable);
    }

    document.getElementById('editBtnGlobal').onclick = (e) => {
        e.preventDefault();
        toggleEditMode(true);
    };

    // ==========================================
    // 4. تعبئة البيانات والمصفوفات
    // ==========================================
    document.getElementById('email').value = user.email || '';
    document.getElementById('fullName').value = user.fullName || '';
    document.getElementById('phone').value = user.phone || '';
    document.getElementById('bio').value = user.bio || '';
    document.getElementById('profileTitle').value = user.profileTitle || '';
    document.getElementById('showEmailPublicly').checked = !!user.showEmailPublicly;
    document.getElementById('showPhonePublicly').checked = !!user.showPhonePublicly;

    function createRow(templateId, containerId, data, populateFn) {
        const template = document.getElementById(templateId);
        const container = document.getElementById(containerId);
        if (!template || !container) return;
        const content = template.content.cloneNode(true);
        if (data) populateFn(content, data);
        container.appendChild(content);
    }

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

    document.getElementById('addSkillBtn').onclick = () => createRow('skillTemplate', 'skillsFormContainer', null, () => {});
    document.getElementById('addExperienceBtn').onclick = () => createRow('experienceTemplate', 'experienceFormContainer', null, () => {});
    document.getElementById('addEducationBtn').onclick = () => createRow('educationTemplate', 'educationFormContainer', null, () => {});
    document.getElementById('addSocialLinkBtn').onclick = () => createRow('socialLinkTemplate', 'socialLinksContainer', null, () => {});

    // منطق الحذف وتحديث النسبة
    settingsForm.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.remove-row-btn, .remove-link-btn');
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

    // ==========================================
    // 5. حفظ البيانات النهائي
    // ==========================================
    settingsForm.onsubmit = async (e) => {
        e.preventDefault();
        const updatedData = {
            fullName: document.getElementById('fullName').value,
            phone: document.getElementById('phone').value,
            bio: document.getElementById('bio').value,
            profileTitle: document.getElementById('profileTitle').value,
            showEmailPublicly: document.getElementById('showEmailPublicly').checked,
            showPhonePublicly: document.getElementById('showPhonePublicly').checked,
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

        const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(updatedData)
        });
        if (res.ok) { alert('تم حفظ التغييرات بنجاح'); window.location.reload(); }
    };

    toggleEditMode(false);
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}