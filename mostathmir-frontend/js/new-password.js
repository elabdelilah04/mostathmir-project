document.addEventListener('DOMContentLoaded', () => {
    const newPasswordForm = document.getElementById('newPasswordForm');
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const API_BASE_URL = 'https://mostathmir-api.onrender.com'; // تأكد من وجود هذا المتغير

    if (!token) {
        // استخدام مفتاح ترجمة موجود بالفعل
        alert(t('auth_invalid_or_expired_token'));
        window.location.href = 'login.html';
        return;
    }

    newPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            // استخدام مفتاح ترجمة موجود بالفعل
            return alert(t('js-auth-passwords-mismatch'));
        }

        if (password.length < 6) {
            // إضافة تحقق بسيط لطول كلمة السر
            return alert('يجب أن تتكون كلمة السر من 6 أحرف على الأقل.');
        }

        const submitButton = newPasswordForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'جاري التغيير...';

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/reset-password/${token}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            const data = await response.json();
            // تحديد الرسالة الصحيحة بناءً على وجود messageKey
            const messageToDisplay = data.messageKey ? t(data.messageKey) : data.message;

            // عرض الرسالة دائماً
            alert(messageToDisplay);

            if (!response.ok) {
                // إذا فشلت العملية، أوقف التنفيذ هنا بعد عرض رسالة الخطأ
                throw new Error(messageToDisplay);
            }

            // إذا نجحت العملية، قم بتسجيل الدخول والتوجيه
            localStorage.setItem('user_token', data.token);
            window.location.href = 'profile.html';

        } catch (error) {
            // هذا الجزء سيلتقط الخطأ ويمنع ظهور أي تنبيهات إضافية
            console.error('Password reset failed:', error);
            // إعادة الزر إلى حالته الأصلية فقط في حالة الفشل
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });
});