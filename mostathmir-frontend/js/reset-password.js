document.addEventListener('DOMContentLoaded', () => {
    const resetForm = document.getElementById('resetForm');

    function validateEmailOrPhone(input) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^\+?[0-9]{7,}$/;
        return emailRegex.test(input) || phoneRegex.test(input);
    }

    resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailOrPhoneInput = document.getElementById('emailOrPhone');
        const emailOrPhoneValue = emailOrPhoneInput.value.trim();

        if (!emailOrPhoneValue) {
            alert(t('js-reset-enter-email-phone'));
            return;
        }

        if (!validateEmailOrPhone(emailOrPhoneValue)) {
            alert(t('js-reset-invalid-email-phone'));
            emailOrPhoneInput.focus();
            return;
        }

        const submitButton = resetForm.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;

        submitButton.disabled = true;
        submitButton.textContent = t('js-verify-sending-text');

        try {
            const response = await fetch('https://mostathmir-api.onrender.com/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailOrPhoneValue })
            });

            const data = await response.json();
            const messageToDisplay = data.messageKey ? t(data.messageKey) : data.message;

            alert(messageToDisplay);
            resetForm.innerHTML = `<p class="reset-subtitle" style="text-align: center;">${messageToDisplay}</p>`;

        } catch (error) {
            alert(t('js-reset-server-error'));
        }
    });
});