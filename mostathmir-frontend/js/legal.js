// تبديل التبويبات (شروط / خصوصية)
function switchLegalTab(tabName) {
    // 1. الأزرار
    const btnTerms = document.getElementById('tab-btn-terms');
    const btnPrivacy = document.getElementById('tab-btn-privacy');

    // 2. المحتوى
    const contentTerms = document.getElementById('content-terms');
    const contentPrivacy = document.getElementById('content-privacy');

    // 3. القائمة الجانبية
    const navTerms = document.getElementById('nav-terms');
    const navPrivacy = document.getElementById('nav-privacy');

    if (tabName === 'terms') {
        // تفعيل زر الشروط
        btnTerms.classList.add('border-[#1E3A8A]', 'text-[#1E3A8A]', 'bg-blue-50');
        btnTerms.classList.remove('border-transparent', 'text-gray-500');

        btnPrivacy.classList.remove('border-[#1E3A8A]', 'text-[#1E3A8A]', 'bg-blue-50');
        btnPrivacy.classList.add('border-transparent', 'text-gray-500');

        // عرض المحتوى
        contentTerms.classList.remove('hidden');
        contentTerms.classList.add('fade-in');
        contentPrivacy.classList.add('hidden');

        // تبديل القائمة الجانبية
        navTerms.classList.remove('hidden');
        navPrivacy.classList.add('hidden');

    } else {
        // تفعيل زر الخصوصية
        btnPrivacy.classList.add('border-[#1E3A8A]', 'text-[#1E3A8A]', 'bg-blue-50');
        btnPrivacy.classList.remove('border-transparent', 'text-gray-500');

        btnTerms.classList.remove('border-[#1E3A8A]', 'text-[#1E3A8A]', 'bg-blue-50');
        btnTerms.classList.add('border-transparent', 'text-gray-500');

        // عرض المحتوى
        contentPrivacy.classList.remove('hidden');
        contentPrivacy.classList.add('fade-in');
        contentTerms.classList.add('hidden');

        // تبديل القائمة الجانبية
        navPrivacy.classList.remove('hidden');
        navTerms.classList.add('hidden');
    }

    // إعادة التمرير للأعلى
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// تمييز القسم النشط عند التمرير (Scroll Spy)
document.addEventListener('DOMContentLoaded', () => {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.5 // عندما يظهر 50% من القسم
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                // إزالة التفعيل من الكل
                document.querySelectorAll('.legal-nav-link').forEach(link => {
                    link.classList.remove('active');
                });
                // تفعيل الرابط الحالي
                const activeLink = document.querySelector(`.legal-nav-link[href="#${id}"]`);
                if (activeLink) activeLink.classList.add('active');
            }
        });
    }, observerOptions);

    // مراقبة كل المقالات
    document.querySelectorAll('.legal-article').forEach(section => {
        observer.observe(section);
    });
});