document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://mostathmir-api.onrender.com';
    const grid = document.getElementById('featuredGrid');
    const featuredCountEl = document.getElementById('featuredCount');
    const token = localStorage.getItem('user_token');

    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    let allPublishedProjects = [];

    // 1. جلب المشاريع المنشورة فقط
    async function loadProjects() {
        try {
            // نستخدم نفس الرابط السابق للآدمن مع فلترة الحالة المنشورة
            const response = await fetch(`${API_BASE_URL}/api/admin/projects?status=published`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('فشل جلب المشاريع');

            allPublishedProjects = await response.json();
            renderProjects();
            updateFeaturedStats();
        } catch (error) {
            grid.innerHTML = `<p style="color:red; text-align:center;">${error.message}</p>`;
        }
    }

    // 2. عرض المشاريع
    function renderProjects() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const filtered = allPublishedProjects.filter(p =>
            p.projectName.toLowerCase().includes(searchTerm)
        );

        if (filtered.length === 0) {
            grid.innerHTML = '<p class="text-center">لا توجد مشاريع منشورة حالياً.</p>';
            return;
        }

        grid.innerHTML = filtered.map(project => `
            <div class="project-card ${project.isFeatured ? 'is-featured' : ''}">
                <div class="project-header">
                    <h3 class="project-title">${project.projectName}</h3>
                    <button class="star-btn ${project.isFeatured ? 'active' : ''}" 
                            onclick="toggleFeatured('${project._id}')" 
                            title="${project.isFeatured ? 'إزالة من المميزة' : 'إضافة للمميزة'}">
                        <i class="fas fa-star"></i>
                    </button>
                </div>
                <div class="project-info">
                    <div class="info-row">
                        <span class="info-label">صاحب المشروع:</span>
                        <span class="info-value">${project.owner?.fullName || 'غير معروف'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">المبلغ المحقق:</span>
                        <span class="info-value text-green-600">${(project.fundingAmountRaised || 0).toLocaleString()} ${project.fundingGoal.currency}</span>
                    </div>
                </div>
                <div class="project-actions">
                    <a href="/project-view.html?id=${project._id}" target="_blank" class="action-btn btn-secondary">
                        <i class="fas fa-external-link-alt"></i> معاينة العرض
                    </a>
                </div>
            </div>
        `).join('');
    }

    // 3. دالة التبديل (Toggle)
    window.toggleFeatured = async (projectId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/projects/${projectId}/featured`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (response.ok) {
                // تحديث البيانات محلياً لتجنب إعادة التحميل الكاملة
                const project = allPublishedProjects.find(p => p._id === projectId);
                if (project) project.isFeatured = data.isFeatured;

                renderProjects();
                updateFeaturedStats();
            } else {
                alert(data.message);
            }
        } catch (error) {
            alert('حدث خطأ أثناء الاتصال بالسيرفر');
        }
    };

    function updateFeaturedStats() {
        const count = allPublishedProjects.filter(p => p.isFeatured).length;
        featuredCountEl.textContent = count;
    }

    // البحث الديناميكي
    document.getElementById('searchInput').addEventListener('input', renderProjects);

    loadProjects();
});