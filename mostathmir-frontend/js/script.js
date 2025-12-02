/**
 * ============================================================================
 * MOSTATHMIR PLATFORM - MAIN SCRIPT
 * ============================================================================
 * Contains logic for:
 * 1. Global Config & Utilities
 * 2. Authentication (Login/Logout/User Fetch)
 * 3. Home Page Sections (Hero, Stats, How-to, Featured, Elite)
 * 4. Profile & UI Interactions
 * 5. Initialization
 */

/* ============================================================================
   1. GLOBAL CONFIGURATION & UTILITIES
   ============================================================================ */

// API Base URL
const API_BASE_URL = (typeof window.CONFIG !== 'undefined' && window.CONFIG.API_BASE_URL)
    ? window.CONFIG.API_BASE_URL
    : 'https://mostathmir-api.onrender.com';

// Exchange Rates (Approximate to MAD)
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

/**
 * Prevent XSS attacks by escaping HTML characters.
 */
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, match => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[match]));
}

/**
 * Convert any currency amount to Moroccan Dirham (MAD).
 */
function convertToMAD(amount, currency) {
    const rate = EXCHANGE_RATES_TO_MAD[currency] || 1;
    return amount * rate;
}

/* ============================================================================
   2. AUTHENTICATION & USER MANAGEMENT
   ============================================================================ */

/**
 * Fetch currently logged-in user profile.
 * Redirects to login if token is invalid on protected pages.
 */
async function fetchCurrentUser() {
    const token = localStorage.getItem('user_token');
    const protectedPages = ['page-title-profile', 'page-title-investor-profile', 'page-title-settings'];

    if (!token) {
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
            logoutUser(); // Token expired
            return null;
        }

        if (!response.ok) throw new Error('Failed to fetch profile');

        const user = await response.json();
        localStorage.setItem('user_data', JSON.stringify(user));
        if (user._id) localStorage.setItem('user_id', user._id);
        return user;

    } catch (error) {
        console.error("Auth Error:", error);
        return null;
    }
}

/**
 * Wrapper for API requests dealing with Forms (handles button loading state).
 */
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

        if (messageToDisplay) alert(messageToDisplay);
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

function logoutUser() {
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('user_id');
    alert(t('js-header-logout-success'));
    window.location.href = 'login.html';
}

function redirectIfLoggedIn() {
    const pageKey = document.body.dataset.pageKey;
    if (pageKey === 'page-title-login' || pageKey === 'page-title-signup') {
        const token = localStorage.getItem('user_token');
        if (token) {
            const userData = JSON.parse(localStorage.getItem('user_data') || 'null');
            if (userData && userData.accountType) {
                window.location.href = userData.accountType === 'investor' ? 'investor-profile.html' : 'profile.html';
            } else {
                window.location.href = 'index.html';
            }
        }
    }
}

/* ============================================================================
   3. HOME PAGE SECTIONS LOGIC
   ============================================================================ */

// --- 3.1. How It Works Section (Toggle) ---
function switchHowItWorks(type) {
    const btnEntrepreneur = document.getElementById('btn-entrepreneur');
    const btnInvestor = document.getElementById('btn-investor');
    const contentEntrepreneur = document.getElementById('content-entrepreneur');
    const contentInvestor = document.getElementById('content-investor');
    const sectionTitle = document.getElementById('section-title');

    if (type === 'entrepreneur') {
        // Active: Entrepreneur (Yellow)
        btnEntrepreneur.className = "px-8 py-3 rounded-full text-sm font-bold transition-all duration-300 bg-yellow-500 text-white shadow-md";
        btnInvestor.className = "px-8 py-3 rounded-full text-sm font-bold text-gray-500 hover:text-gray-700 transition-all duration-300";
        sectionTitle.classList.remove('text-green-600');
        sectionTitle.classList.add('text-yellow-500');

        contentEntrepreneur.classList.remove('hidden');
        contentEntrepreneur.classList.add('grid');
        contentInvestor.classList.add('hidden');
        contentInvestor.classList.remove('grid');
    } else {
        // Active: Investor (Green)
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

// --- 3.2. Featured Projects Section ---
async function loadFeaturedProjects() {
    const grid = document.getElementById('featuredProjectsGrid');
    if (!grid) return;

    // تعيين كلاس الشبكة لتقليص المسافات (gap-5)
    grid.className = "grid grid-cols-1 md:grid-cols-3 gap-5 transition-opacity duration-500";

    try {
        // Loader
        grid.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-10">
                <div class="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-3"></div>
            </div>`;

        const response = await fetch(`${API_BASE_URL}/api/projects/public`);
        if (!response.ok) throw new Error('Failed to fetch projects');

        let projects = await response.json();
        // Filter active projects only
        projects = projects.filter(p => ['published', 'funded', 'funding'].includes(p.status));

        // Sort by funding progress (highest first)
        projects.sort((a, b) => {
            const progressA = (a.fundingAmountRaised / a.fundingGoal.amount);
            const progressB = (b.fundingAmountRaised / b.fundingGoal.amount);
            return progressB - progressA;
        });

        // Take top 3
        const featuredProjects = projects.slice(0, 3);

        if (featuredProjects.length === 0) {
            grid.innerHTML = `<p class="text-center text-gray-500 col-span-full py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">${t('featured-no-projects')}</p>`;
            return;
        }

        // === التصحيح: إضافة (project, index) هنا ===
        grid.innerHTML = featuredProjects.map((project, index) => {
            const goal = project.fundingGoal?.amount || 0;
            const raised = project.fundingAmountRaised || 0;
            const currency = project.fundingGoal?.currency || 'USD'; // للحصول على العملة
            const progress = goal > 0 ? Math.round((raised / goal) * 100) : 0;
            const clampedProgress = Math.min(progress, 100);

            let imageSrc = project.mainImage && project.mainImage.startsWith('http')
                ? project.mainImage
                : 'https://via.placeholder.com/600x400?text=Project';

            const category = project.projectCategory || t('js-browse-category-general');
            const description = project.projectDescription ? project.projectDescription.substring(0, 70) + '...' : '';
            const investorsCount = project.followers ? project.followers.length : 0;
            const viewsCount = project.views || 0;
            const ownerName = project.owner?.fullName || t('js-browse-entrepreneur');

            // الآن المتغير index معرف بشكل صحيح
            return `
                <div class="reveal fade-up group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1 flex flex-col h-full max-w-[350px] mx-auto w-full" style="transition-delay: ${index * 100}ms">
                    
                    <!-- Image Header -->
                    <div class="relative h-44 overflow-hidden">
                        <div class="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style="background-image: url('${imageSrc}');"></div>
                        <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                        
                        <div class="absolute top-3 right-3">
                            <span class="bg-white/90 backdrop-blur text-[#1E3A8A] text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">
                                ${t(category) || category}
                            </span>
                        </div>
                        <div class="absolute bottom-2 left-3 text-white text-xs font-medium drop-shadow-md flex items-center gap-1">
                            <i class="fas fa-user-circle text-sm"></i> ${escapeHTML(ownerName)}
                        </div>
                    </div>

                    <!-- Body Content -->
                    <div class="p-4 flex-1 flex flex-col">
                        <h3 class="text-base font-bold text-gray-900 mb-1.5 leading-tight line-clamp-1 group-hover:text-[#1E3A8A] transition-colors">
                            ${escapeHTML(project.projectName)}
                        </h3>
                        <p class="text-gray-500 text-[11px] mb-3 line-clamp-2 leading-relaxed h-8 overflow-hidden">
                            ${escapeHTML(description)}
                        </p>
                        
                        <!-- Financial Grid -->
                        <div class="grid grid-cols-2 gap-2 mb-3">
                            <div class="bg-green-50/80 rounded-lg p-2 text-center border border-green-100">
                                <div class="text-[10px] text-gray-500">${t('featured-raised')}</div>
                                <div class="text-green-700 font-bold text-xs">${raised.toLocaleString()} <span class="text-[9px]">${currency}</span></div>
                            </div>
                            <div class="bg-gray-50 rounded-lg p-2 text-center border border-gray-100">
                                <div class="text-[10px] text-gray-500">${t('featured-goal')}</div>
                                <div class="text-gray-700 font-bold text-xs">${goal.toLocaleString()} <span class="text-[9px]">${currency}</span></div>
                            </div>
                        </div>

                        <!-- Progress Bar -->
                        <div class="mb-3">
                            <div class="flex justify-between text-[10px] font-bold mb-1">
                                <span class="text-gray-400">${t('featured-funding-progress')}</span>
                                <span class="text-[#1E3A8A]">${progress}%</span>
                            </div>
                            <div class="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div class="bg-gradient-to-r from-blue-500 to-[#1E3A8A] h-full rounded-full transition-all duration-1000 ease-out relative" style="width: ${clampedProgress}%"></div>
                            </div>
                        </div>

                        <!-- Social Stats -->
                        <div class="flex justify-between items-center mb-4 pt-2 border-t border-gray-50 px-1">
                            <div class="flex items-center gap-1 text-[11px] text-gray-500" title="${t('featured-views')}">
                                <i class="far fa-eye text-blue-400"></i>
                                <span>${viewsCount}</span>
                            </div>
                            <div class="flex items-center gap-1 text-[11px] text-gray-500" title="${t('featured-investors-interested')}">
                                <i class="fas fa-heart text-pink-400"></i>
                                <span>${investorsCount} ${t('featured-investors-interested')}</span>
                            </div>
                        </div>

                        <!-- Button -->
                        <a href="project-view.html?id=${project._id}" class="block w-full py-2.5 text-center rounded-lg font-bold text-xs transition-all duration-300 bg-gray-900 text-white hover:bg-[#1E3A8A] hover:shadow-lg">
                            ${t('featured-view-details')} 
                        </a>
                    </div>
                </div>
            `;
        }).join('');

        setTimeout(() => {
            observeScrollElements();
        }, 100);

        // تشغيل دالة مراقبة التمرير لإظهار العناصر
        if (typeof observeScrollElements === 'function') {
            observeScrollElements();
        }

    } catch (error) {
        console.error("Error loading featured projects:", error);
        grid.innerHTML = `<p class="text-center text-red-500 col-span-full">خطأ في التحميل</p>`;
    }
}

// --- 3.3. Elite Community Section ---
async function loadEliteCommunity() {
    const container = document.getElementById('elite-container');
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/users/elite`);
        if (!response.ok) throw new Error('Failed to fetch elite members');

        const eliteUsers = await response.json();

        if (eliteUsers.length === 0) {
            container.innerHTML = `<div class="text-center w-full py-8 text-gray-400">مجتمعنا ينمو...</div>`;
            return;
        }

        // استخدام index هنا ضروري لحساب التوقيت الزمني
        container.innerHTML = eliteUsers.map((user, index) => {
            let avatarHTML = '';
            if (user.profilePicture && user.profilePicture.startsWith('http')) {
                avatarHTML = `<img src="${user.profilePicture}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="${user.fullName}">`;
            } else {
                const initial = (user.fullName || 'U').charAt(0).toUpperCase();
                const colors = ['bg-[#1E3A8A]', 'bg-[#D4AF37]', 'bg-purple-800', 'bg-slate-800'];
                const bg = colors[index % colors.length];
                avatarHTML = `<div class="w-full h-full ${bg} flex items-center justify-center text-white text-3xl font-serif font-bold">${initial}</div>`;
            }

            const roleKey = user.accountType === 'investor' ? 'elite-role-investor' : 'elite-role-entrepreneur';
            const roleColor = user.accountType === 'investor' ? 'text-[#D4AF37]' : 'text-blue-600';
            const roleIcon = user.accountType === 'investor' ? 'fa-hand-holding-usd' : 'fa-lightbulb';
            const verifiedBadge = user.isVerified
                ? `<i class="fas fa-check-circle text-blue-500 absolute bottom-0 right-0 bg-white rounded-full border-2 border-white text-xl shadow-sm z-20" title="${t('elite-tag-verified')}"></i>`
                : '';
            const tagKey = user.accountType === 'investor' ? 'elite-tag-active' : 'elite-tag-innovator';

            // حساب التأخير الزمني
            const delay = index * 100;

            return `
                <div class="reveal zoom-in min-w-[240px] max-w-[240px] pt-8 pb-2 px-2 snap-center cursor-pointer group" onclick="window.location.href='public-profile.html?id=${user._id}'" style="transition-delay: ${delay}ms">
                    <div class="relative bg-white rounded-2xl p-6 pt-10 text-center border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] group-hover:border-blue-100">
                        
                        <!-- Avatar Section -->
                        <div class="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20">
                            <div class="w-full h-full rounded-full p-1 bg-white shadow-md relative z-10 group-hover:shadow-lg transition-shadow">
                                <div class="w-full h-full rounded-full overflow-hidden border-[3px] ${user.accountType === 'investor' ? 'border-[#D4AF37]' : 'border-blue-500'}">
                                    ${avatarHTML}
                                </div>
                            </div>
                            ${verifiedBadge}
                        </div>

                        <!-- Info -->
                        <h3 class="mt-4 text-lg font-bold text-gray-800 truncate group-hover:text-[#1E3A8A] transition-colors">${escapeHTML(user.fullName)}</h3>
                        
                        <div class="flex items-center justify-center gap-2 mt-1 mb-3">
                            <i class="fas ${roleIcon} ${roleColor} text-xs"></i>
                            <span class="text-xs font-semibold uppercase tracking-wide text-gray-500">${t(roleKey)}</span>
                        </div>

                        <p class="text-xs text-gray-400 mb-4 line-clamp-1 h-4">${escapeHTML(user.profileTitle || '')}</p>

                        <!-- Tag -->
                        <div class="border-t border-gray-50 pt-3">
                            <span class="inline-block px-3 py-1 bg-gray-50 text-gray-600 text-[10px] font-bold rounded-full border border-gray-100 group-hover:bg-[#1E3A8A] group-hover:text-white group-hover:border-[#1E3A8A] transition-all duration-300">${t(tagKey)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        setTimeout(() => {
            observeScrollElements();
        }, 100);
        // هام: تشغيل مراقب التمرير لإظهار العناصر
        if (typeof observeScrollElements === 'function') {
            observeScrollElements();
        }

    } catch (error) {
        console.error("Error loading elite:", error);
        container.innerHTML = `<div class="text-center w-full py-8 text-red-400">حدث خطأ في تحميل البيانات</div>`;
    }
}

// Elite Section Scrolling
window.scrollElite = function (direction) {
    const container = document.getElementById('elite-container');
    if (!container) return;
    const scrollAmount = 300;
    if (direction === 'left') {
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
};

/* --- Scroll Animation Function --- */
function observeScrollElements() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target); // إيقاف المراقبة بعد الظهور لتحسين الأداء
            }
        });
    }, observerOptions);

    // مراقبة جميع العناصر التي تحمل كلاس reveal ولم تظهر بعد (ليس لديها active)
    document.querySelectorAll('.reveal:not(.active)').forEach(el => {
        observer.observe(el);
    });
}
// --- 3.4. Platform Stats Section (Real Data) ---
async function fetchPlatformStats() {
    const statsSection = document.getElementById('stats-section');
    if (!statsSection) return;

    try {
        const [projectsRes, statsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/projects/public`),
            fetch(`${API_BASE_URL}/api/users/platform-stats`)
        ]);

        if (!projectsRes.ok) throw new Error('Failed to fetch data');

        const projects = await projectsRes.json();
        const statsData = statsRes.ok ? await statsRes.json() : { investorCount: 0 };

        // Calculations
        const totalProjects = projects.length;
        const activeOpportunities = projects.filter(p => ['funded', 'completed', 'published'].includes(p.status)).length;

        let totalCapitalMAD = 0;
        projects.forEach(p => {
            const amount = p.fundingAmountRaised || 0;
            const currency = p.fundingGoal?.currency || 'USD';
            totalCapitalMAD += convertToMAD(amount, currency);
        });
        const capitalInMillions = (totalCapitalMAD / 1000000).toFixed(1);
        const totalInvestors = statsData.investorCount || 0;

        // Update DOM
        const statElements = document.querySelectorAll('.stat-item .font-mono');
        if (statElements.length >= 4) {
            statElements[0].setAttribute('data-target', totalProjects);
            statElements[1].setAttribute('data-target', totalInvestors);
            statElements[2].setAttribute('data-target', activeOpportunities);
            statElements[3].setAttribute('data-target', capitalInMillions);
        }

        startStatsCounter();
    } catch (error) {
        console.error("Stats Error:", error);
        startStatsCounter(); // Run with zeros if error
    }
}

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

// --- 3.5. Mobile Scroll Effects ---
function initMobileScrollEffects() {
    if (window.innerWidth >= 1024) return;

    const cardObserverOptions = { root: null, rootMargin: '-15% 0px -15% 0px', threshold: 0.6 };

    const howCardsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const card = entry.target;
            const isEntrepreneur = card.closest('#content-entrepreneur');
            if (entry.isIntersecting) {
                if (isEntrepreneur) card.classList.add('mobile-active-yellow');
                else card.classList.add('mobile-active-green');
            } else {
                card.classList.remove('mobile-active-yellow', 'mobile-active-green');
            }
        });
    }, cardObserverOptions);

    document.querySelectorAll('#how-it-works .grid > div').forEach(card => {
        howCardsObserver.observe(card);
    });

    const eliteObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const navButtons = entry.target.querySelectorAll('button');
            if (entry.isIntersecting) {
                navButtons.forEach(btn => btn.classList.add('mobile-nav-visible'));
            } else {
                navButtons.forEach(btn => btn.classList.remove('mobile-nav-visible'));
            }
        });
    }, { threshold: 0.5 });

    const eliteSection = document.getElementById('elite-section');
    if (eliteSection) eliteObserver.observe(eliteSection);
}

/* ============================================================================
   4. PROFILE & UI LOGIC
   ============================================================================ */

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

function initProfilePage(user, baseUrl) {
    if (user.accountType !== 'ideaHolder') {
        window.location.href = 'investor-profile.html';
        return;
    }
    populateCommonProfileFields(user, baseUrl);
    setupInteractiveStats('profile-stats-interactive', 'profile-dynamic-content');

    const token = localStorage.getItem('user_token');
    fetch(`${baseUrl}/api/projects/myprojects`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(projects => {
            const totalProjectsStat = document.getElementById('stat-total-projects');
            if (totalProjectsStat) totalProjectsStat.textContent = projects.length;
        })
        .catch(console.error);
}

function initInvestorProfilePage(user, baseUrl) {
    if (user.accountType !== 'investor') {
        window.location.href = 'profile.html';
        return;
    }
    populateCommonProfileFields(user, baseUrl);
    setupInteractiveStats('profile-stats-interactive', 'profile-dynamic-content');
}

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
 *  5.SCROLL ANIMATION LOGIC
 * منطق حركات الظهور عند التمرير
 * ============================================================================
 */
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.15, // تبدأ الحركة عندما يظهر 15% من العنصر
        rootMargin: "0px 0px -50px 0px" // إزاحة لضمان أن العنصر دخل الشاشة فعلاً
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');

                // للتعامل مع العدادات في قسم الإحصائيات إذا كانت تحمل كلاس reveal
                if (entry.target.classList.contains('stat-item')) {
                    // منطق العدادات موجود في دالة أخرى، لكن هذا يضمن ظهور الكارد نفسه
                }

                observer.unobserve(entry.target); // إيقاف المراقبة بعد الظهور لمرة واحدة
            }
        });
    }, observerOptions);

    // 1. مراقبة كل العناصر التي تحمل كلاس .reveal
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    // 2. إضافة تأثير التتابع التلقائي (Stagger) لأي حاوية تحمل كلاس .stagger-container
    // هذا مفيد جداً لشبكات البطاقات (Grid)
    document.querySelectorAll('.stagger-container').forEach(container => {
        const children = container.children;
        Array.from(children).forEach((child, index) => {
            child.classList.add('reveal', 'fade-up'); // إضافة الحركة الافتراضية
            child.style.transitionDelay = `${index * 150}ms`; // تأخير زمني بناءً على الترتيب
            observer.observe(child);
        });
    });
}

/* ============================================================================
  6. MAIN INITIALIZATION
   ============================================================================ */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Header Init
    if (window.initHeader) await window.initHeader();

    // 2. Login Check
    redirectIfLoggedIn();
    // 3. Fetch User
    const user = await fetchCurrentUser();

    // 4. Route Logic
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

    // 5. Home Page Logic
    if (document.body.dataset.pageKey === 'page-title-main') {
        loadFeaturedProjects();
        loadEliteCommunity();
        fetchPlatformStats();
        initMobileScrollEffects();
    }

    // 6. Login Form Logic
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
                // Error handled by wrapper
            }
        });
    }

    // Helper to select account type based on URL
    const urlParams = new URLSearchParams(window.location.search);
    const accountTypeParam = urlParams.get('type');
    const accountTypeSelect = document.getElementById('accountType');

    if (accountTypeParam && accountTypeSelect) {
        accountTypeSelect.value = accountTypeParam;
    }

    // 7. Chat Modal
    setupChatModal();

    // تشغيل الأنيميشن
    initScrollAnimations();

});