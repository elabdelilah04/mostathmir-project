document.addEventListener('DOMContentLoaded', async () => {
    initFAQAccordion();

    const userData = localStorage.getItem('user_data');
    const user = userData ? JSON.parse(userData) : null;

    if (user) {
        const nameInput = document.getElementById('supportName');
        const emailInput = document.getElementById('supportEmail');
        if (nameInput) {
            nameInput.value = user.fullName;
            nameInput.readOnly = true;
            nameInput.style.backgroundColor = "#f3f4f6";
        }
        if (emailInput) {
            emailInput.value = user.email;
            emailInput.readOnly = true;
            emailInput.style.backgroundColor = "#f3f4f6";
        }
    }

    const supportForm = document.getElementById('supportForm');
    if (supportForm) {
        supportForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = supportForm.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            const token = localStorage.getItem('user_token');

            const formData = {
                name: document.getElementById('supportName').value,
                email: document.getElementById('supportEmail').value,
                type: document.getElementById('supportType').value,
                message: document.getElementById('supportMessage').value
            };

            btn.disabled = true;
            btn.textContent = t('js-script-please-wait') || '...';

            try {
                const response = await fetch(`${API_BASE_URL}/api/admin/support/submit`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token ? `Bearer ${token}` : ''
                    },
                    body: JSON.stringify(formData)
                });

                if (response.ok) {
                    alert('✅ تم استلام رسالتك بنجاح! سيتواصل معك فريق الدعم قريباً.');
                    document.getElementById('supportMessage').value = "";
                    document.getElementById('supportType').selectedIndex = 0;
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.message);
                }
            } catch (error) {
                alert('❌ عذراً، فشل إرسال الرسالة. يرجى المحاولة مرة أخرى لاحقاً.');
            } finally {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });
    }
});

function initFAQAccordion() {
    const headers = document.querySelectorAll('.accordion-header');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            document.querySelectorAll('.accordion-item').forEach(other => {
                if (other !== item) {
                    other.classList.remove('active');
                    const content = other.querySelector('.accordion-content');
                    if (content) content.style.maxHeight = null;
                }
            });
            item.classList.toggle('active');
            const content = item.querySelector('.accordion-content');
            if (content) {
                content.style.maxHeight = item.classList.contains('active') ? content.scrollHeight + "px" : null;
            }
        });
    });
}