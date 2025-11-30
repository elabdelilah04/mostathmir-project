/**
 * ============================================================================
 * 1. GLOBAL CONFIGURATION & UTILITIES
 * إعدادات عامة وأدوات مساعدة
 * ============================================================================
 */

const API_BASE_URL = (typeof window.CONFIG !== 'undefined' && window.CONFIG.API_BASE_URL) 
    ? window.CONFIG.API_BASE_URL 
    : 'https://mostathmir-api.onrender.com';

// أسعار صرف تقريبية للتحويل إلى الدرهم المغربي
const EXCHANGE_RATES_TO_MAD = {
    'MAD': 1,
    'USD': 10.0,
    'SAR': 2.66,
    'EUR': 10.8,
    'AED': 2.72,
    'QAR': 2.74,
    'KWD': 32.5,
    'BHD': 26.5,
    'OMR': 26.0
};

// دالة لمنع هجمات XSS عند عرض النصوص
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, match => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[match]));
}

// دالة مساعدة للتحويل المالي
function convertToMAD(amount, currency) {
    const rate = EXCHANGE_RATES_TO_MAD[currency] || 1; // الافتراضي 1 إذا لم توجد العملة
    return amount * rate;
}

/**
 * ============================================================================
 * 2. AUTHENTICATION & USER MANAGEMENT
 * إدارة المصادقة والمستخدمين
 * ============================================================================
 */

// جلب بيانات المستخدم الحالي
async function fetchCurrentUser() {
    const token = localStorage.getItem('user_token');
    if (!token) {
        // الصفحات التي تتطلب تسجيل دخول
        const protectedPages = ['page-title-profile', 'page-title-investor-profile', 'page-title-settings'];
        if (protectedPages.includes(document.body.dataset.pageKey)) {
            window.location.href = 'login.html';
        }
        return null;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.status === 401) {
            logoutUser(); // التوكن منتهي الصلاحية
            return null;
        }

        if (!response.ok) {
            throw new Error('Failed to fetch profile');
        }

        const user = await response.json();
        localStorage.setItem('user_data', JSON.stringify(user));
        if(user._id) localStorage.setItem('user_id', user._id);
        return user;
    } catch (error) {
        console.error("Auth Error:", error);
        return null;
    }
}

// معالجة طلبات API مع إدارة حالة الزر
async function handleApiRequest(url, options, form) {
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton ? submitButton.textContent : '';
    
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = t('js-script-please-wait');
    }

    try {
        const response = await fetch(url, options);
        const data = await response.json();
        const messageToDisplay = data.messageKey ? t(data.messageKey) : data.message;

        if (!response.ok) {
            const error = new Error(messageToDisplay || data.message || t('js-script-unexpected-error'));
            error.data = data;
            throw error;
        }

        if (messageToDisplay) {
            alert(messageToDisplay);
        }
        return data;

    } catch (error) {
        alert(error.message);
        throw error;
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    }
}

// تسجيل الخروج
function logoutUser() {
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('user_id');
    alert(t('js-header-logout-success'));
    window.location.href = 'login.html';
}

// التوجيه إذا كان المستخدم مسجلاً
function redirectIfLoggedIn() {
    const pageKey = document.body.dataset.pageKey;
    if (pageKey === 'page-title-login' || pageKey === 'page-title-signup') {
        const token = localStorage.getItem('user_token');
        if (token) {
            const userData = JSON.parse(localStorage.getItem('user_data') || 'null');
            if (userData && userData.accountType) {
                const destination = userData.accountType === 'investor' ? 'investor-profile.html' : 'profile.html';
                window.location.href = destination;
            } else {
                window.location.href = 'index.html';
            }
        }
    }
}

/**
 * ============================================================================
 * 3. HOME PAGE LOGIC (Landing Page)
 * منطق الصفحة الرئيسية
 * ============================================================================
 */

// 3.1. تبديل قسم "كيف تعمل المنصة"
function switchHowItWorks(type) {
    const btnEntrepreneur = document.getElementById('btn-entrepreneur');
    const btnInvestor = document.getElementById('btn-investor');
    const contentEntrepreneur = document.getElementById('content-entrepreneur');
    const contentInvestor = document.getElementById('content-investor');
    const sectionTitle = document.getElementById('section-title');

    if (type === 'entrepreneur') {
        // تفعيل رواد الأعمال (أصفر)
        btnEntrepreneur.className = "px-8 py-3 rounded-full text-sm font-bold transition-all duration-300 bg-yellow-500 text-white shadow-md";
        btnInvestor.className = "px-8 py-3 rounded-full text-sm font-bold text-gray-500 hover:text-gray-700 transition-all duration-300";
        
        sectionTitle.classList.remove('text-green-600');
        sectionTitle.classList.add('text-yellow-500');

        contentEntrepreneur.classList.remove('hidden');
        contentEntrepreneur.classList.add('grid');
        contentInvestor.classList.add('hidden');
        contentInvestor.classList.remove('grid');
    } else {
        // تفعيل المستثمرين (أخضر)
        btnInvestor.className = "px-8 py-3 rounded-full text-sm font-bold transition-all duration-300 bg-green-500 text-white shadow-md";
        btnEntrepreneur.className = "px-8 py-3 rounded-full text-sm font-bold text-gray-500 hover:text-gray-700 transition-all duration-300";
        
        sectionTitle.classList.remove('text-yellow-500');
        sectionTitle.classList.add('text-green-600');

        contentInvestor.classList.remove('hidden');
        contentInvestor.classList.add('grid');
        contentEntrepreneur.classList.add('hidden');
        contentEntrepreneur.classList.remove('grid');
    }
}

// 3.2. تحميل المشاريع المميزة
async function loadFeaturedProjects() {
    const grid = document.getElementById('featuredProjectsGrid');
    if (!grid) return;

    try {
        grid.innerHTML = `<div class="text-center col-span-full"><i class="fas fa-circle-notch fa-spin text-blue-600 text-2xl"></i><p>${t('featured-loading')}</p></div>`;
        
        const response = await fetch(`${API_BASE_URL}/api/projects/public`);
        if (!response.ok) throw new Error('Failed to fetch projects');
        
        let projects = await response.json();
        // تصفية المشاريع النشطة فقط
        projects = projects.filter(p => ['published', 'funded', 'funding'].includes(p.status));
        
        // الترتيب حسب الأكثر متابعة
        projects.sort((a, b) => (b.followers?.length || 0) - (a.followers?.length || 0));
        
        const featuredProjects = projects.slice(0, 3);

        if (featuredProjects.length === 0) {
            grid.innerHTML = `<p class="text-center text-gray-500 col-span-full">${t('featured-no-projects')}</p>`;
            return;
        }

        grid.innerHTML = featuredProjects.map(project => {
            const goal = project.fundingGoal?.amount || 0;
            const raised = project.fundingAmountRaised || 0;
            const progress = goal > 0 ? Math.round((raised / goal) * 100) : 0;
            const clampedProgress = Math.min(progress, 100);
            
            let imageSrc = project.mainImage && project.mainImage.startsWith('http') 
                ? project.mainImage 
                : 'https://via.placeholder.com/400x250?text=Mostathmir+Project';

            const category = project.projectCategory || t('js-browse-category-general');
            const description = project.projectDescription ? project.projectDescription.substring(0, 100) + '...' : '';
            const investorsCount = project.followers ? project.followers.length : 0;
            const viewsCount = project.views || 0;

            return `
                <div class="project-card relative bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group">
                    <div class="project-image h-48 bg-cover bg-center relative" style="background-image: url('${imageSrc}');">
                        <div class="absolute top-4 right-4 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                            ${t(category) || category}
                        </div>
                        <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300"></div>
                    </div>
                    <div class="p-6">
                        <h3 class="text-xl font-bold text-gray-800 mb-2 line-clamp-1">${escapeHTML(project.projectName)}</h3>
                        <p class="text-gray-500 text-sm mb-4 line-clamp-2 h-10">${escapeHTML(description)}</p>
                        
                        <div class="flex justify-between items-center mb-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                            <div class="flex items-center gap-1" title="${t('featured-views')}">
                                <i class="far fa-eye text-blue-500"></i>
                                <span>${viewsCount}</span>
                            </div>
                            <div class="flex items-center gap-1" title="${t('featured-investors-interested')}">
                                <i class="fas fa-user-tie text-purple-500"></i>
                                <span>${investorsCount}</span>
                            </div>
                        </div>

                        <div class="mb-5">
                            <div class="flex justify-between text-xs mb-1 font-semibold">
                                <span class="text-gray-500">${t('featured-funding-progress')}</span>
                                <span class="text-green-600">${progress}%</span>
                            </div>
                            <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div class="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-1000 ease-out" style="width: ${clampedProgress}%"></div>
                            </div>
                        </div>

                        <a href="project-view.html?id=${project._id}" class="block w-full py-3 text-center bg-[#1E3A8A] text-white rounded-xl font-bold hover:bg-blue-800 transition-colors shadow-md hover:shadow-lg">
                            ${t('featured-view-details')}
                        </a>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error("Error loading featured projects:", error);
        grid.innerHTML = `<p class="text-center text-red-500 col-span-full">حدث خطأ أثناء تحميل البيانات.</p>`;
    }
}

// 3.3. جلب الإحصائيات الحقيقية
async function fetchPlatformStats() {
    const statsSection = document.getElementById('stats-section');
    if (!statsSection) return;

    try {
        // جلب البيانات بالتوازي (المشاريع + عدد المستثمرين الكلي)
        const [projectsRes, statsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/projects/public`),
            fetch(`${API_BASE_URL}/api/users/platform-stats`) // Endpoint الجديد
        ]);

        if (!projectsRes.ok) throw new Error('Failed to fetch projects');
        
        const projects = await projectsRes.json();
        const statsData = statsRes.ok ? await statsRes.json() : { investorCount: 0 };

        // 1. المشاريع المسجلة
        const totalProjects = projects.length;
        
        // 2. الفرص النشطة (قيد التمويل + المكتملة)
        const activeOpportunities = projects.filter(p => 
            ['funded', 'completed', 'published'].includes(p.status)
        ).length;

        // 3. حجم الاستثمار (بالدرهم المغربي)
        let totalCapitalMAD = 0;
        projects.forEach(p => {
            const amount = p.fundingAmountRaised || 0;
            const currency = p.fundingGoal?.currency || 'USD'; 
            totalCapitalMAD += convertToMAD(amount, currency);
        });
        const capitalInMillions = (totalCapitalMAD / 1000000).toFixed(1);

        // 4. عدد المستثمرين (الكلي)
        const totalInvestors = statsData.investorCount || 0;

        // تحديث العدادات في HTML
        const statElements = document.querySelectorAll('.stat-item .font-mono');
        if(statElements.length >= 4) {
            statElements[0].setAttribute('data-target', totalProjects);
            statElements[1].setAttribute('data-target', totalInvestors);
            statElements[2].setAttribute('data-target', activeOpportunities);
            statElements[3].setAttribute('data-target', capitalInMillions);
        }

        startStatsCounter();

    } catch (error) {
        console.error("Error fetching stats:", error);
        startStatsCounter(); // تشغيل حتى مع الأصفار
    }
}

// 3.4. تحريك العدادات
function startStatsCounter() {
    const statsSection = document.getElementById('stats-section');
    if (!statsSection) return;

    const counters = document.querySelectorAll('.stat-item [data-target]');
    let started = false;

    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !started) {
            started = true;
            counters.forEach(counter => {
                const target = parseFloat(counter.getAttribute('data-target'));
                const isFloat = target % 1 !== 0;
                if (target === 0) { counter.innerText = "0"; return; }

                const duration = 2000; 
                const increment = target / (duration / 16);
                
                let current = 0;
                const updateCounter = () => {
                    current += increment;
                    if (current < target) {
                        counter.innerText = isFloat ? current.toFixed(1) : Math.ceil(current);
                        requestAnimationFrame(updateCounter);
                    } else {
                        counter.innerText = target;
                    }
                };
                updateCounter();
            });
        }
    }, { threshold: 0.5 });

    observer.observe(statsSection);
}

/**
 * ============================================================================
 * 4. PROFILE & UI LOGIC
 * منطق الصفحات الشخصية والواجهة
 * ============================================================================
 */

// رفع صورة الملف الشخصي
async function uploadProfilePicture(file) {
    const token = localStorage.getItem('user_token');
    if (!token) return;
    const formData = new FormData();
    formData.append('profilePicture', file);
    alert(t('js-script-uploading-image'));
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/profile/picture`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || t('js-script-upload-failed'));
        alert(t('js-script-upload-success'));
        window.location.reload();
    } catch (error) {
        alert(error.message);
    }
}

// تعبئة البيانات المشتركة للملف الشخصي
function populateCommonProfileFields(user, baseUrl) {
    document.querySelectorAll('.profile-name, .user-name').forEach(el => { el.textContent = user.fullName || ''; });
    
    const profileBio = document.querySelector('.profile-bio');
    if (profileBio) profileBio.textContent = user.bio || t('js-script-add-bio');
    
    const profileLocation = document.querySelector('.profile-location span');
    if (profileLocation) profileLocation.textContent = user.location || t('js-script-location-not-set');

    const contactEmail = document.querySelector('.profile-contact .contact-item:nth-child(1) span');
    if (contactEmail) contactEmail.textContent = user.email || '';

    const contactPhone = document.querySelector('.profile-contact .contact-item:nth-child(2) span');
    if (contactPhone) contactPhone.textContent = user.phone || t('js-script-no-phone');

    // معالجة الصورة الرمزية
    const mainAvatarImage = document.getElementById('avatarImage');
    const mainAvatarInitials = document.getElementById('avatarInitials');
    const hasProfilePic = user.profilePicture && user.profilePicture !== 'default-avatar.png';
    
    const parts = user.fullName ? user.fullName.trim().split(' ') : [];
    const initials = parts.length > 1 
        ? (parts[0][0] + parts[1][0]).toUpperCase() 
        : (user.fullName || '').trim().substring(0, 2).toUpperCase();

    if (mainAvatarImage) {
        mainAvatarImage.src = hasProfilePic && user.profilePicture.startsWith('http') ? user.profilePicture : '';
        mainAvatarImage.style.display = hasProfilePic ? 'block' : 'none';
    }
    if (mainAvatarInitials) {
        mainAvatarInitials.textContent = initials;
        mainAvatarInitials.style.display = hasProfilePic ? 'none' : 'block';
    }

    // زر رفع الصورة
    const avatarAddButton = document.getElementById('avatarAddButton');
    const avatarUploadInput = document.getElementById('avatarUploadInput');
    if (avatarAddButton && avatarUploadInput) {
        avatarAddButton.style.display = 'block';
        avatarAddButton.addEventListener('click', () => avatarUploadInput.click());
        avatarUploadInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) uploadProfilePicture(file);
        });
    }

    // روابط التواصل الاجتماعي
    const iconsContainer = document.getElementById('profileSocialIconsContainer');
    if (iconsContainer && user.socialLinks && user.socialLinks.length > 0) {
        const linkDisplayContainer = document.getElementById('profileSocialLinkDisplay');
        const linkDisplayText = document.getElementById('socialLinkText');
        const linkDisplayIcon = document.getElementById('socialLinkIcon');
        
        iconsContainer.innerHTML = '';
        if(linkDisplayContainer) linkDisplayContainer.style.display = 'none';

        const svgIcons = {
            linkedin: '<i class="fab fa-linkedin-in"></i>',
            twitter: '<i class="fab fa-twitter"></i>',
            facebook: '<i class="fab fa-facebook-f"></i>',
            instagram: '<i class="fab fa-instagram"></i>',
            github: '<i class="fab fa-github"></i>',
            website: '<i class="fas fa-globe"></i>',
            youtube: '<i class="fab fa-youtube"></i>'
        };

        user.socialLinks.forEach(link => {
            const iconButton = document.createElement('button');
            iconButton.type = 'button';
            iconButton.className = 'social-icon-button';
            iconButton.innerHTML = svgIcons[link.platform] || svgIcons.website;
            
            iconButton.addEventListener('click', () => {
                const isAlreadyActive = iconButton.classList.contains('active');
                iconsContainer.querySelectorAll('.social-icon-button').forEach(btn => btn.classList.remove('active'));
                
                if (isAlreadyActive) {
                    if(linkDisplayContainer) linkDisplayContainer.style.display = 'none';
                } else {
                    iconButton.classList.add('active');
                    if(linkDisplayText) linkDisplayText.textContent = link.url;
                    if(linkDisplayIcon) linkDisplayIcon.innerHTML = svgIcons[link.platform] || svgIcons.website;
                    if(linkDisplayContainer) {
                        linkDisplayContainer.style.display = 'flex';
                        linkDisplayContainer.onclick = () => {
                            const fullUrl = link.url.startsWith('http') ? link.url : `https://${link.platform}.com/${link.url}`;
                            window.open(fullUrl, '_blank');
                        };
                        linkDisplayContainer.style.cursor = 'pointer';
                    }
                }
            });
            iconsContainer.appendChild(iconButton);
        });
    }

    // الاهتمامات
    const interestsContainer = document.getElementById('profileInterestsContainer');
    if (interestsContainer) {
        interestsContainer.innerHTML = '';
        if (user.interests && user.interests.length > 0) {
            user.interests.forEach(interestText => {
                const tagElement = document.createElement('span');
                tagElement.className = 'tag';
                tagElement.textContent = interestText;
                interestsContainer.appendChild(tagElement);
            });
        } else {
            interestsContainer.innerHTML = `<p style="font-size:13px;color:#6b7280;">${t('js-script-define-interests')}</p>`;
        }
    }
}

// تهيئة صفحة صاحب المشروع
function initProfilePage(user, baseUrl) {
    if (user.accountType !== 'ideaHolder') {
        window.location.href = 'investor-profile.html';
        return;
    }
    populateCommonProfileFields(user, baseUrl);
    setupInteractiveStats('profile-stats-interactive', 'profile-dynamic-content');
    initProjectsPortfolio();
    
    const token = localStorage.getItem('user_token');
    fetch(`${baseUrl}/api/projects/myprojects`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(projects => {
            const totalProjectsStat = document.getElementById('stat-total-projects');
            if (totalProjectsStat) totalProjectsStat.textContent = projects.length;
        })
        .catch(console.error);
}

// تهيئة صفحة المستثمر
function initInvestorProfilePage(user, baseUrl) {
    if (user.accountType !== 'investor') {
        window.location.href = 'profile.html';
        return;
    }
    populateCommonProfileFields(user, baseUrl);
    setupInteractiveStats('profile-stats-interactive', 'profile-dynamic-content');
}

// إعداد الإحصائيات التفاعلية (للتبديل بين التبويبات)
function setupInteractiveStats(gridId, contentAreaId) {
    const statsGrid = document.getElementById(gridId);
    const dynamicContentArea = document.getElementById(contentAreaId);
    if (!statsGrid || !dynamicContentArea) return;
    
    const statButtons = statsGrid.querySelectorAll('[data-target]');
    const contentPanels = dynamicContentArea.querySelectorAll('.content-panel');
    
    statsGrid.addEventListener('click', (e) => {
        const clickedButton = e.target.closest('[data-target]');
        if (!clickedButton) return;
        
        const targetId = clickedButton.dataset.target;
        const targetPanel = document.getElementById(targetId);
        
        statButtons.forEach(btn => btn.classList.remove('active'));
        contentPanels.forEach(panel => panel.classList.remove('visible'));
        
        clickedButton.classList.add('active');
        if (targetPanel) {
            targetPanel.classList.add('visible');
            dynamicContentArea.classList.add('visible');
        }
    });
}

function initProjectsPortfolio() {
    // يمكن إضافة كود رسم الـ Canvas هنا إذا لزم الأمر
}

/**
 * ============================================================================
 * 5. CHAT MODAL & MISC
 * نافذة الدردشة والمحفوظات
 * ============================================================================
 */

function setupChatModal() {
    const openChatBtn = document.getElementById('openChatBtn');
    const closeChatBtn = document.getElementById('closeChatBtn');
    const chatModal = document.getElementById('chatModal');
    const chatModalOverlay = document.getElementById('chatModalOverlay');
    const chatForm = document.getElementById('chatForm');

    function openChat() {
        if (chatModal && chatModalOverlay) {
            chatModal.classList.add('is-visible');
            chatModalOverlay.classList.add('is-visible');
        }
    }
    function closeChat() {
        if (chatModal && chatModalOverlay) {
            chatModal.classList.remove('is-visible');
            chatModalOverlay.classList.remove('is-visible');
        }
    }

    if (openChatBtn) openChatBtn.addEventListener('click', openChat);
    if (closeChatBtn) closeChatBtn.addEventListener('click', closeChat);
    if (chatModalOverlay) chatModalOverlay.addEventListener('click', closeChat);
    
    if (chatForm) {
        chatForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const input = e.target.querySelector('input');
            if (!input || input.value.trim() === '') return;
            
            const messagesContainer = document.querySelector('.chat-messages');
            if (messagesContainer) {
                const newMessage = document.createElement('div');
                newMessage.classList.add('message', 'sent');
                newMessage.innerHTML = `<p>${escapeHTML(input.value.trim())}</p>`;
                messagesContainer.appendChild(newMessage);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
            input.value = '';
        });
    }
}

/**
 * ============================================================================
 * 6. MAIN INITIALIZATION
 * التهيئة الرئيسية عند تحميل الصفحة
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. تهيئة الهيدر
    if (window.initHeader) await window.initHeader();

    // 2. التحقق من تسجيل الدخول (لإخفاء صفحات الدخول/التسجيل)
    redirectIfLoggedIn();

    // 3. جلب المستخدم الحالي
    const user = await fetchCurrentUser();

    // 4. توجيه المنطق حسب الصفحة
    if (user) {
        const pageKey = document.body.dataset.pageKey;
        if (window.populateHeader) window.populateHeader(user, API_BASE_URL);

        switch (pageKey) {
            case 'page-title-profile':
                initProfilePage(user, API_BASE_URL);
                break;
            case 'page-title-investor-profile':
                initInvestorProfilePage(user, API_BASE_URL);
                break;
            case 'page-title-settings':
                if (typeof initSettingsPage === 'function') initSettingsPage(user);
                break;
        }
    }

    // 5. تهيئة الصفحة الرئيسية (Landing Page)
    if (document.body.dataset.pageKey === 'page-title-main') {
        loadFeaturedProjects();
        fetchPlatformStats();
    }

    // 6. تهيئة نموذج تسجيل الدخول (إذا وجد)
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = {
                email: (loginForm.querySelector('#emailOrPhone') || {}).value || '',
                password: (loginForm.querySelector('#password') || {}).value || ''
            };
            try {
                const data = await handleApiRequest(`${API_BASE_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                }, loginForm);
                
                if(data.token) {
                    localStorage.setItem('user_token', data.token);
                    window.location.href = data.accountType === 'investor' ? 'investor-profile.html' : 'profile.html';
                }
            } catch {
                // Error handled by handleApiRequest alert
            }
        });
    }

    // 7. تهيئة نافذة الدردشة
    setupChatModal();
});