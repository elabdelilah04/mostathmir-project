/**
 * MOSTATHMIR - HELP CENTER & SUPPORT LOGIC
 */

document.addEventListener('DOMContentLoaded', async () => {
    initFAQAccordion();

    // جلب بيانات المستخدم لملء النموذج
    const user = await getLoggedInUser();
    autoFillSupportForm(user);

    handleSupportForm();
});

/**
 * 1. جلب بيانات المستخدم من التخزين المحلي
 */
async function getLoggedInUser() {
    const userData = localStorage.getItem('user_data');
    if (userData) {
        return JSON.parse(userData);
    }
    return null;
}

/**
 * 2. ملء النموذج تلقائياً
 */
function autoFillSupportForm(user) {
    if (!user) return;

    const nameInput = document.getElementById('supportName');
    const emailInput = document.getElementById('supportEmail');

    if (nameInput && user.fullName) {
        nameInput.value = user.fullName;
        // جعل الحقل للقراءة فقط لضمان إرسال البيانات الصحيحة للحساب
        nameInput.readOnly = true;
        nameInput.style.backgroundColor = "#f3f4f6"; // تمييز بصري
    }

    if (emailInput && user.email) {
        emailInput.value = user.email;
        emailInput.readOnly = true;
        emailInput.style.backgroundColor = "#f3f4f6";
    }
}

/**
 * 3. منطق الأكورديون للأسئلة الشائعة
 */
function initFAQAccordion() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');

    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;

            document.querySelectorAll('.accordion-item').forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                    const otherContent = otherItem.querySelector('.accordion-content');
                    if (otherContent) otherContent.style.maxHeight = null;
                }
            });

            item.classList.toggle('active');
            const content = item.querySelector('.accordion-content');

            if (item.classList.contains('active')) {
                content.style.maxHeight = content.scrollHeight + "px";
            } else {
                content.style.maxHeight = null;
            }
        });
    });
}

/**
 * 4. منطق إرسال نموذج الدعم الفني
 */
function handleSupportForm() {
    const supportForm = document.getElementById('supportForm');
    if (!supportForm) return;

    supportForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = supportForm.querySelector('button[type="submit"]');
        const originalText = btn.textContent;

        const formData = {
            name: document.getElementById('supportName').value,
            email: document.getElementById('supportEmail').value,
            type: document.getElementById('supportType').value,
            message: document.getElementById('supportMessage').value
        };

        btn.disabled = true;
        btn.textContent = 'جاري الإرسال...';

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/support/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                alert('✅ تم استلام رسالتك بنجاح! سيتواصل معك فريق الدعم قريباً.');
                // تفريغ الرسالة والنوع فقط، وترك الاسم والإيميل كما هما للمستخدم المسجل
                document.getElementById('supportMessage').value = "";
                document.getElementById('supportType').selectedIndex = 0;
            } else {
                throw new Error();
            }
        } catch (error) {
            alert('❌ عذراً، فشل إرسال الرسالة. يرجى المحاولة مرة أخرى لاحقاً.');
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    });
}