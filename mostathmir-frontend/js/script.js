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
        if (user._id) localStorage.setItem('user_id', user._id);
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

// 3.2. تحميل المشاريع المميزة (تحديث: التركيز على البيانات المالية)
async function loadFeaturedProjects() {
    const grid = document.getElementById('featuredProjectsGrid');
    if (!grid) return;

    try {
        // عرض مؤشر التحميل
        grid.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-12">
                <div class="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <p class="text-gray-500 font-medium animate-pulse">${t('featured-loading')}</p>
            </div>`;

        const response = await fetch(`${API_BASE_URL}/api/projects/public`);
        if (!response.ok) throw new Error('Failed to fetch projects');

        let projects = await response.json();

        // التصفية والترتيب
        projects = projects.filter(p => ['published', 'funded', 'funding'].includes(p.status));
        projects.sort((a, b) => {
            const progressA = (a.fundingAmountRaised / a.fundingGoal.amount);
            const progressB = (b.fundingAmountRaised / b.fundingGoal.amount);
            return progressB - progressA;
        });

        const featuredProjects = projects.slice(0, 3);

        if (featuredProjects.length === 0) {
            grid.innerHTML = `<p class="text-center text-gray-500 col-span-full py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-300">${t('featured-no-projects')}</p>`;
            return;
        }

        grid.innerHTML = featuredProjects.map(project => {
            // الحسابات والبيانات
            const goal = project.fundingGoal?.amount || 0;
            const raised = project.fundingAmountRaised || 0;
            const currency = project.fundingGoal?.currency || 'USD';
            const progress = goal > 0 ? Math.round((raised / goal) * 100) : 0;
            const clampedProgress = Math.min(progress, 100);

            let imageSrc = project.mainImage && project.mainImage.startsWith('http')
                ? project.mainImage
                : 'https://via.placeholder.com/800x600?text=Mostathmir+Project';

            const category = project.projectCategory || t('js-browse-category-general');
            const description = project.projectDescription ? project.projectDescription.substring(0, 90) + '...' : '';
            const investorsCount = project.followers ? project.followers.length : 0;
            const viewsCount = project.views || 0;

            // بيانات المالك
            const ownerName = project.owner?.fullName || t('js-browse-entrepreneur');
            let ownerAvatar = '';
            if (project.owner?.profilePicture && project.owner.profilePicture.startsWith('http')) {
                ownerAvatar = `<img src="${project.owner.profilePicture}" class="w-full h-full object-cover" alt="${ownerName}">`;
            } else {
                const initial = ownerName.charAt(0).toUpperCase();
                ownerAvatar = `<div class="w-full h-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">${initial}</div>`;
            }
            return `
                <div class="group bg-white rounded-[18px] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1 flex flex-col h-full max-w-[340px] mx-auto w-full">
                    
                    <!-- 1. Image Header (ارتفاع أقل h-48 -> h-44) -->
                    <div class="relative h-44 overflow-hidden">
                        <div class="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style="background-image: url('${imageSrc}');"></div>
                        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90"></div>
                        
                        <div class="absolute top-3 right-3">
                            <span class="bg-white/90 backdrop-blur text-[#1E3A8A] text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                                ${t(category) || category}
                            </span>
                        </div>

                        <div class="absolute bottom-3 left-3 right-3 flex items-center gap-2">
                            <div class="w-8 h-8 rounded-full border border-white/60 shadow-sm overflow-hidden bg-gray-200">
                                ${ownerAvatar}
                            </div>
                            <div class="text-white truncate">
                                <p class="text-[10px] text-gray-200 font-light leading-tight">${t('project_owner')}</p>
                                <p class="text-xs font-bold leading-tight text-white truncate">${ownerName}</p>
                            </div>
                        </div>
                    </div>

                    <!-- 2. Body Content (padding أقل) -->
                    <div class="p-5 flex-1 flex flex-col">
                        <h3 class="text-lg font-bold text-gray-900 mb-2 leading-tight group-hover:text-[#1E3A8A] transition-colors line-clamp-1" title="${project.projectName}">
                            ${escapeHTML(project.projectName)}
                        </h3>
                        <p class="text-gray-500 text-xs mb-4 line-clamp-2 leading-relaxed flex-grow h-8">
                            ${escapeHTML(description)}
                        </p>
                        
                        <!-- Financial Grid -->
                        <div class="grid grid-cols-2 gap-2 mb-3">
                            <div class="bg-green-50 rounded-lg p-2 text-center border border-green-100">
                                <div class="text-[10px] text-gray-500 mb-0.5">${t('featured-raised')}</div>
                                <div class="text-green-700 font-bold text-xs">${raised.toLocaleString()}</div>
                            </div>
                            <div class="bg-gray-50 rounded-lg p-2 text-center border border-gray-100">
                                <div class="text-[10px] text-gray-500 mb-0.5">${t('featured-goal')}</div>
                                <div class="text-gray-700 font-bold text-xs">${goal.toLocaleString()}</div>
                            </div>
                        </div>

                        <!-- Progress Bar -->
                        <div class="mb-3">
                            <div class="flex justify-between text-[10px] font-bold mb-1">
                                <span class="text-gray-400">${t('featured-funding-progress')}</span>
                                <span class="text-[#1E3A8A]">${progress}%</span>
                            </div>
                            <div class="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div class="bg-gradient-to-r from-blue-500 to-[#1E3A8A] h-full rounded-full transition-all duration-1000 ease-out" style="width: ${clampedProgress}%"></div>
                            </div>
                        </div>

                        <!-- Button -->
                        <a href="project-view.html?id=${project._id}" class="block w-full py-2.5 text-center rounded-lg font-bold text-xs transition-all duration-300 bg-[#1E3A8A] text-white shadow hover:bg-blue-800 hover:shadow-md">
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
        if (statElements.length >= 4) {
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
        if (linkDisplayContainer) linkDisplayContainer.style.display = 'none';

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
                    if (linkDisplayContainer) linkDisplayContainer.style.display = 'none';
                } else {
                    iconButton.classList.add('active');
                    if (linkDisplayText) linkDisplayText.textContent = link.url;
                    if (linkDisplayIcon) linkDisplayIcon.innerHTML = svgIcons[link.platform] || svgIcons.website;
                    if (linkDisplayContainer) {
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


// 3.5. تحميل وعرض نخبة المجتمع
async function loadEliteCommunity() {
    const container = document.getElementById('elite-container');
    if (!container) return;

    try {
        // بما أننا لا نملك API عام للمستخدمين، سنجلب المشاريع ونستخرج منها الملاك
        // هذا حل ذكي للواجهة الأمامية لعرض مستخدمين حقيقيين لديهم نشاط
        const response = await fetch(`${API_BASE_URL}/api/projects/public`);
        if (!response.ok) throw new Error('Failed to fetch data');

        const projects = await response.json();

        // استخراج المستخدمين الفريدين (أصحاب المشاريع)
        const uniqueUsers = new Map();

        projects.forEach(p => {
            if (p.owner && !uniqueUsers.has(p.owner._id)) {
                uniqueUsers.set(p.owner._id, p.owner);
            }
        });

        // تحويل Map إلى Array وأخذ عينة (مثلاً أول 8)
        const eliteUsers = Array.from(uniqueUsers.values()).slice(0, 10);

        if (eliteUsers.length === 0) {
            container.innerHTML = `<p class="text-center w-full text-gray-400">جاري بناء المجتمع...</p>`;
            return;
        }

        container.innerHTML = eliteUsers.map((user, index) => {
            // تحديد الصورة (أو الحرف الأول)
            let avatarHTML = '';
            if (user.profilePicture && user.profilePicture.startsWith('http')) {
                avatarHTML = `<img src="${user.profilePicture}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="${user.fullName}">`;
            } else {
                const initial = (user.fullName || 'U').charAt(0).toUpperCase();
                // ألوان عشوائية للخلفية
                const colors = ['bg-blue-600', 'bg-purple-600', 'bg-indigo-600', 'bg-teal-600'];
                const bg = colors[index % colors.length];
                avatarHTML = `<div class="w-full h-full ${bg} flex items-center justify-center text-white text-4xl font-bold">${initial}</div>`;
            }

            // تحديد الرتبة والتسميات
            const roleKey = user.accountType === 'investor' ? 'elite-role-investor' : 'elite-role-entrepreneur';
            const tagKey = index % 2 === 0 ? 'elite-tag-top' : 'elite-tag-innovator'; // تنويع عشوائي للتاقات

            return `
                <div class="min-w-[250px] snap-center flex flex-col items-center group cursor-pointer" onclick="window.location.href='public-profile.html?id=${user._id}'">
                    
                    <!-- Avatar Circle with Gold Border & Effect -->
                    <div class="relative w-32 h-32 mb-6">
                        <div class="absolute inset-0 rounded-full border-4 border-[#D4AF37] shadow-lg overflow-hidden z-10 bg-white">
                            ${avatarHTML}
                        </div>
                        
                        <!-- Decorative Ring (Spinning on hover) -->
                        <div class="absolute -inset-2 rounded-full border border-[#D4AF37]/30 border-dashed animate-[spin_10s_linear_infinite] group-hover:animate-[spin_3s_linear_infinite]"></div>
                        
                        <!-- Verified Badge -->
                        <div class="absolute bottom-1 right-1 z-20 bg-white rounded-full p-1 shadow-md">
                            <i class="fas fa-check-circle text-green-500 text-xl"></i>
                        </div>
                    </div>

                    <!-- Info -->
                    <h3 class="text-lg font-bold text-gray-900 mb-1 group-hover:text-[#1E3A8A] transition-colors text-center">
                        ${escapeHTML(user.fullName)}
                    </h3>
                    
                    <p class="text-[#D4AF37] font-medium text-sm mb-4 text-center">
                        ${t(roleKey)}
                    </p>

                    <!-- Tags -->
                    <div class="flex gap-2 justify-center">
                        <span class="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg border border-gray-200 font-medium">
                            ${t(tagKey)}
                        </span>
                        <span class="px-3 py-1 bg-blue-50 text-blue-600 text-xs rounded-lg border border-blue-100 font-medium">
                            ${t('elite-tag-verified')}
                        </span>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error("Error loading elite:", error);
        container.innerHTML = '';
    }
}

// 3.6. دالة التمرير للأزرار (Left/Right)
window.scrollElite = function (direction) {
    const container = document.getElementById('elite-container');
    if (!container) return;

    // حساب مسافة التمرير (عرض البطاقة + المسافة)
    const scrollAmount = 300;
    const currentScroll = container.scrollLeft;

    // في وضع RTL (العربية)، الاتجاهات تكون معكوسة منطقياً في بعض المتصفحات
    // لكن scrollBy with negative value يذهب لليسار دائماً

    if (direction === 'left') {
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
};

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

                if (data.token) {
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
    loadEliteCommunity();

});