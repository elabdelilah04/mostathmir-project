document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://mostathmir-api.onrender.com';
    const grid = document.getElementById('featuredGrid');
    const featuredCountEl = document.getElementById('featuredCount');
    const token = localStorage.getItem('user_token');

    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const featuredStatusFilter = document.getElementById('featuredStatusFilter');

    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    let allPublishedProjects = [];

    async function loadProjects() {
        try {
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

    function renderProjects() {
        const searchTerm = searchInput.value.toLowerCase();
        const categoryValue = categoryFilter.value;
        const statusValue = featuredStatusFilter.value;

        const filtered = allPublishedProjects.filter(project => {
            const matchesSearch = project.projectName.toLowerCase().includes(searchTerm);
            const matchesCategory = (categoryValue === 'all' || project.projectCategory === categoryValue);
            
            let matchesStatus = true;
            if (statusValue === 'only-featured') matchesStatus = project.isFeatured === true;
            if (statusValue === 'not-featured') matchesStatus = !project.isFeatured;

            return matchesSearch && matchesCategory && matchesStatus;
        });

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                    <i class="fas fa-search-minus fa-3x" style="color: #cbd5e1; margin-bottom: 15px;"></i>
                    <h3 style="color: #64748b;">لا توجد مشاريع تطابق خيارات التصفية.</h3>
                </div>`;
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
                        <span class="info-label">التصنيف:</span>
                        <span class="info-value bg-blue-50 px-2 py-1 rounded text-blue-700" style="font-size: 12px;">
                            ${project.projectCategory || 'عام'}
                        </span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">صاحب المشروع:</span>
                        <span class="info-value">${project.owner?.fullName || 'غير معروف'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">المبلغ المحقق:</span>
                        <span class="info-value text-green-600 font-bold">
                            ${(project.fundingAmountRaised || 0).toLocaleString()} ${project.fundingGoal?.currency || 'MAD'}
                        </span>
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

    searchInput.addEventListener('input', renderProjects);
    categoryFilter.addEventListener('change', renderProjects);
    featuredStatusFilter.addEventListener('change', renderProjects);

    loadProjects();
});