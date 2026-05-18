/**
 * MOSTATHMIR - HELP CENTER & SUPPORT LOGIC
 */

document.addEventListener('DOMContentLoaded', () => {
    initFAQAccordion();
    handleSupportForm();
});

/**
 * 1. منطق الأكورديون للأسئلة الشائعة
 */
function initFAQAccordion() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    
    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            
            // إغلاق باقي الأسئلة لتركيز تجربة المستخدم
            document.querySelectorAll('.accordion-item').forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                    const otherContent = otherItem.querySelector('.accordion-content');
                    if (otherContent) otherContent.style.maxHeight = null;
                }
            });

            // تبديل حالة السؤال الحالي
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
 * 2. منطق إرسال نموذج الدعم الفني
 */
function handleSupportForm() {
    const supportForm = document.getElementById('supportForm');
    if (!supportForm) return;

    supportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = supportForm.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        
        // جمع البيانات
        const formData = {
            name: document.getElementById('supportName').value,
            email: document.getElementById('supportEmail').value,
            type: document.getElementById('supportType').value,
            message: document.getElementById('supportMessage').value
        };

        // حالة التحميل
        btn.disabled = true;
        btn.textContent = t('js-script-please-wait') || 'جاري الإرسال...';

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/support/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                alert('✅ تم استلام رسالتك بنجاح! سيتواصل معك فريق الدعم قريباً.');
                supportForm.reset(); // تفريغ الحقول
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message);
            }
        } catch (error) {
            console.error("Support Submission Error:", error);
            alert('❌ عذراً، فشل إرسال الرسالة. يرجى المحاولة مرة أخرى لاحقاً.');
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    });
}