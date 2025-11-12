document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://mostathmir-api.onrender.com';
    const verifyForm = document.getElementById('verifyForm');
    const emailDisplay = document.getElementById('user-email-display');
    const resendLink = document.getElementById('resend-token-link');

    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');

    if (!email) {
        alert(t('js-verify-email-not-specified'));
        window.location.href = 'signup.html';
        return;
    }

    if (emailDisplay) {
        emailDisplay.textContent = email;
    }

    if (verifyForm) {
        verifyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const tokenInput = document.getElementById('verificationToken');
            const token = tokenInput.value;

            const submitButton = verifyForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = t('js-verify-verifying-text');

            try {
                const response = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, token })
                });

                const data = await response.json();

                // --- بداية التعديل ---
                const messageToDisplay = data.messageKey ? t(data.messageKey) : data.message;

                if (!response.ok) {
                    // استخدم الرسالة المترجمة في حالة الخطأ
                    throw new Error(messageToDisplay || t('js-verify-error-verification-failed'));
                }

                localStorage.setItem('user_token', data.token);
                // استخدم الرسالة المترجمة في حالة النجاح
                alert(messageToDisplay);
                window.location.href = 'profile.html';
                // --- نهاية التعديل ---

            } catch (error) {
                // عرض رسالة الخطأ المترجمة
                alert(`${t('js-verify-error-prefix')}: ${error.message}`);
                tokenInput.value = '';
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        });
    }

    if (resendLink) {
        resendLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const originalText = resendLink.textContent;
            resendLink.style.pointerEvents = 'none';
            resendLink.textContent = t('js-verify-sending-text');

            try {
                const response = await fetch(`${API_BASE_URL}/api/auth/resend-token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                const data = await response.json();

                // --- بداية التعديل ---
                const messageToDisplay = data.messageKey ? t(data.messageKey) : data.message;

                if (!response.ok) {
                    throw new Error(messageToDisplay || t('js-verify-error-resend-failed'));
                }
                alert(messageToDisplay);
                // --- نهاية التعديل ---

            } catch (error) {
                alert(`${t('js-verify-error-prefix')}: ${error.message}`);
            } finally {
                resendLink.textContent = t('js-verify-sent-wait-text');
                setTimeout(() => {
                    resendLink.textContent = originalText;
                    resendLink.style.pointerEvents = 'auto';
                }, 60000);
            }
        });
    }
});