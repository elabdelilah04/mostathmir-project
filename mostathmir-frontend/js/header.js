(function () {
    function ProfileDropdown() {
        this.trigger = document.getElementById('profileTrigger');
        this.dropdown = document.getElementById('profileDropdown');
        if (!this.trigger || !this.dropdown) return;
        this.isOpen = false;
        this.overlay = document.createElement('div');
        this.overlay.className = 'dropdown-overlay';
        document.body.appendChild(this.overlay);
        var self = this;
        this.trigger.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            self.toggle();
        });
        document.addEventListener('click', function (e) {
            if (self.isOpen && !self.trigger.contains(e.target) && !self.dropdown.contains(e.target)) {
                self.close();
            }
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && self.isOpen) {
                self.close();
            }
        });
        this.overlay.addEventListener('click', function () { self.close(); });
        this.close();
    }
    ProfileDropdown.prototype.toggle = function () { this.isOpen ? this.close() : this.open(); };
    ProfileDropdown.prototype.open = function () {
        if (this.isOpen) return;
        this.isOpen = true;
        this.trigger.classList.add('active');
        this.dropdown.classList.add('show');
        this.overlay.classList.add('show');
    };
    ProfileDropdown.prototype.close = function () {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.trigger.classList.remove('active');
        this.dropdown.classList.remove('show');
        this.overlay.classList.remove('show');
    };

    function initMobileMenu() {
        var toggleButton = document.querySelector('.mobile-menu-toggle');
        var mainNav = document.querySelector('.main-nav');
        if (toggleButton && mainNav) {
            toggleButton.addEventListener('click', function () {
                mainNav.classList.toggle('is-open');
            });
        }
    }

    function populateHeader(user, baseUrl) {
        var headerProfileName = document.getElementById('headerProfileName');
        if (headerProfileName) headerProfileName.textContent = user.fullName || '';

        var headerAvatarImage = document.getElementById('headerAvatarImage');
        var headerAvatarInitials = document.getElementById('headerAvatarInitials');
        if (headerAvatarImage && headerAvatarInitials) {
            var hasProfilePic = user.profilePicture && user.profilePicture !== 'default-avatar.png';
            var parts = user.fullName ? user.fullName.trim().split(' ') : [];
            var initials = parts.length > 1
                ? (parts[0][0] + parts[1][0]).toUpperCase()
                : (user.fullName || '').trim().substring(0, 2).toUpperCase();

            headerAvatarImage.src = hasProfilePic ? user.profilePicture : ''; 
            headerAvatarImage.style.display = hasProfilePic ? 'block' : 'none';
            headerAvatarInitials.textContent = initials;
            headerAvatarInitials.style.display = hasProfilePic ? 'none' : 'block';
        }

        var dropdown = document.getElementById('profileDropdown');
        if (dropdown) {
            var dropdownUserName = dropdown.querySelector('.user-name');
            if (dropdownUserName) dropdownUserName.textContent = user.fullName || '';
            var dropdownUserRole = dropdown.querySelector('.user-role');
            if (dropdownUserRole) {
                dropdownUserRole.textContent = user.accountType === 'investor' ? t('js-header-role-investor') : t('js-header-role-ideaholder');
            }
            var viewProfileAnchor = dropdown.querySelector('.btn-view-profile .Myprofil') || dropdown.querySelector('.btn-view-profile');
            if (viewProfileAnchor) viewProfileAnchor.href = user.accountType === 'investor' ? 'investor-profile.html' : 'profile.html';
        }
    }

    if (!window.fetchCurrentUser) {
        window.fetchCurrentUser = async function () {
            var token = localStorage.getItem('user_token');
            if (!token) {
                var protectedPages = ['page-title-profile', 'page-title-investor-profile', 'page-title-settings'];
                if (protectedPages.includes(document.body.dataset.pageKey)) {
                    window.location.href = 'login.html';
                }
                return null;
            }
            try {
                var response = await fetch('https://mostathmir-api.onrender.com/api/users/profile', { headers: { 'Authorization': 'Bearer ' + token } });
                if (!response.ok) {
                    localStorage.removeItem('user_token');
                    localStorage.removeItem('user_data');
                    window.location.href = 'login.html';
                    return null;
                }
                var user = await response.json();
                localStorage.setItem('user_data', JSON.stringify(user));
                return user;
            } catch (e) {
                return null;
            }
        };
    }

    if (!window.logoutUser) {
        window.logoutUser = function () {
            localStorage.removeItem('user_token');
            localStorage.removeItem('user_data');
            alert(t('js-header-logout-success'));
            window.location.href = 'login.html';
        };
    }

    function setupHeaderIcons() {
        var msgBtn = document.getElementById('headerMessagesBtn');
        var notiBtn = document.getElementById('headerNotificationsBtn');

        if (msgBtn) {
            msgBtn.addEventListener('click', function () {
                window.location.href = 'messages.html#messages';
            });
        }
        if (notiBtn) {
            notiBtn.addEventListener('click', function () {
                window.location.href = 'messages.html#notifications';
            });
        }
    }

    // ---------- Robust refreshHeaderBadges (updated) ----------
    async function refreshHeaderBadges() {
        var token = localStorage.getItem('user_token');
        var baseUrl = 'https://mostathmir-api.onrender.com';

        var msgBadge = document.getElementById('headerMessagesBadge');
        var notiBadge = document.getElementById('headerNotificationsBadge');
        if (!msgBadge && !notiBadge) return;

        // If not logged in: hide both badges
        if (!token) {
            if (msgBadge) { msgBadge.style.display = 'none'; msgBadge.textContent = '0'; }
            if (notiBadge) { notiBadge.style.display = 'none'; notiBadge.textContent = '0'; }
            return;
        }

        try {
            // ----- MESSAGES -----
            var unreadMessages = 0;
            try {
                var resMsg = await fetch(baseUrl + '/api/messages', { headers: { 'Authorization': 'Bearer ' + token } });
                if (resMsg.ok) {
                    var msgBody = await resMsg.json();

                    // Case A: API returns conversations array with unreadCount property per conversation
                    if (Array.isArray(msgBody) && msgBody.length > 0 && typeof msgBody[0].unreadCount !== 'undefined') {
                        unreadMessages = (msgBody || []).reduce(function (sum, c) { return sum + (parseInt(c.unreadCount, 10) || 0); }, 0);
                    }
                    // Case B: API returns array of message objects (each message has 'recipient' and 'read')
                    else if (Array.isArray(msgBody) && msgBody.length > 0 && typeof msgBody[0].read !== 'undefined') {
                        var currentUser = JSON.parse(localStorage.getItem('user_data') || 'null');
                        var currentUserId = currentUser && currentUser._id ? currentUser._id.toString() : null;
                        if (currentUserId) {
                            unreadMessages = (msgBody || []).filter(function (m) {
                                try {
                                    return (!m.read) && (m.recipient && (m.recipient.toString ? m.recipient.toString() : m.recipient) === currentUserId);
                                } catch (e) {
                                    return false;
                                }
                            }).length;
                        } else {
                            // fallback: count messages with read === false
                            unreadMessages = (msgBody || []).filter(function (m) { return !m.read; }).length;
                        }
                    }
                    // Case C: empty array or unexpected structure
                    else if (Array.isArray(msgBody) && msgBody.length === 0) {
                        unreadMessages = 0;
                    } else {
                        // unexpected shape: try to handle gracefully
                        console.warn('refreshHeaderBadges: unexpected /api/messages response shape', msgBody);
                        unreadMessages = 0;
                    }
                } else {
                    console.warn('refreshHeaderBadges: /api/messages responded with status', resMsg.status);
                }
            } catch (e) {
                console.warn('refreshHeaderBadges: fetching /api/messages failed', e);
            }

            // ----- NOTIFICATIONS -----
            var unreadNotifications = 0;
            try {
                var resNoti = await fetch(baseUrl + '/api/notifications', { headers: { 'Authorization': 'Bearer ' + token } });
                if (resNoti.ok) {
                    var notifications = await resNoti.json();
                    if (Array.isArray(notifications)) {
                        unreadNotifications = (notifications || []).filter(function (n) { return !n.read; }).length;
                    } else {
                        console.warn('refreshHeaderBadges: unexpected /api/notifications response shape', notifications);
                    }
                } else {
                    console.warn('refreshHeaderBadges: /api/notifications responded with status', resNoti.status);
                }
            } catch (e) {
                console.warn('refreshHeaderBadges: fetching /api/notifications failed', e);
            }

            // Update DOM badges
            if (msgBadge) {
                if (unreadMessages > 0) {
                    msgBadge.textContent = unreadMessages;
                    msgBadge.style.display = 'block';
                } else {
                    msgBadge.style.display = 'none';
                    msgBadge.textContent = '0';
                }
            }
            if (notiBadge) {
                if (unreadNotifications > 0) {
                    notiBadge.textContent = unreadNotifications;
                    notiBadge.style.display = 'block';
                } else {
                    notiBadge.style.display = 'none';
                    notiBadge.textContent = '0';
                }
            }

            document.dispatchEvent(new CustomEvent('header:badges-updated', {
                detail: { unreadMessages: unreadMessages, unreadNotifications: unreadNotifications }
            }));
        } catch (ex) {
            console.warn('refreshHeaderBadges: unexpected error', ex);
        }
    }
    // ---------- end refreshHeaderBadges ----------

    function relocateLanguageForMobile() {
        var switcher = document.getElementById('languageSwitcher');
        if (!switcher) return;

        var mainNav = document.querySelector('.main-nav');
        var navList = mainNav ? (mainNav.querySelector('ul, .nav-list, nav') || mainNav) : null;

        var topBarContainer =
            document.getElementById('header-icons') ||
            document.querySelector('.header-icons') ||
            document.querySelector('.header-actions') ||
            document.querySelector('.topbar-actions') ||
            document.getElementById('header-actions') ||
            (document.getElementById('header-placeholder') ? document.getElementById('header-placeholder').parentElement : null);

        var existingLi = document.getElementById('languageSwitcherNavItem');
        var mobile = window.matchMedia('(max-width: 1024px)').matches;

        if (mobile && navList) {
            if (!existingLi) {
                existingLi = document.createElement('li');
                existingLi.id = 'languageSwitcherNavItem';
                existingLi.className = 'nav-item language-item';
            }
            existingLi.innerHTML = '';
            existingLi.appendChild(switcher);
            if (!existingLi.parentElement) {
                navList.appendChild(existingLi);
            }
        } else {
            if (topBarContainer && !topBarContainer.contains(switcher)) {
                topBarContainer.appendChild(switcher);
            }
            if (existingLi && existingLi.parentElement) {
                existingLi.parentElement.removeChild(existingLi);
            }
        }
    }

    function bindRelocateOnResize() {
        var handler = function () { relocateLanguageForMobile(); };
        window.addEventListener('resize', handler);
        var toggleButton = document.querySelector('.mobile-menu-toggle');
        if (toggleButton) {
            toggleButton.addEventListener('click', handler);
        }
    }

    async function loadAndSetupHeader() {
        var placeholder = document.getElementById('header-placeholder');
        if (!placeholder) return;
        try {
            var res = await fetch('header.html');
            if (!res.ok) throw new Error();
            var html = await res.text();
            placeholder.innerHTML = html;

            initMobileMenu();

            var languageOptions = document.querySelectorAll('.language-option');
            languageOptions.forEach(function (option) {
                option.addEventListener('click', function () {
                    if (window.updateLanguage) window.updateLanguage(this.dataset.lang);
                });
            });

            relocateLanguageForMobile();
            bindRelocateOnResize();

            var user = await window.fetchCurrentUser();

            if (user) {
                var vBtns = document.getElementById('auth-buttons-visitor');
                var pCont = document.getElementById('profile-dropdown-container');
                if (vBtns) vBtns.style.display = 'none';
                if (pCont) pCont.style.display = 'inline-block';

                populateHeader(user, 'https://mostathmir-api.onrender.com');
                new ProfileDropdown();

                var a = document.getElementById('nav-about');
                var h = document.getElementById('nav-how');
                if (a) a.style.display = 'none';
                if (h) h.style.display = 'none';

                if (user.accountType === 'ideaHolder') {
                    var mp = document.getElementById('nav-my-projects');
                    var mi = document.getElementById('nav-my-investments');
                    if (mp) mp.style.display = 'list-item';
                    if (mi) mi.style.display = 'none';

                    var vp1 = document.querySelector('.btn-view-profile');
                    var vp2 = document.querySelector('.Myprofil');
                    if (vp1) vp1.href = 'profile.html';
                    if (vp2) vp2.href = 'profile.html';

                } else if (user.accountType === 'investor') {
                    var mp2 = document.getElementById('nav-my-projects');
                    var mi2 = document.getElementById('nav-my-investments');
                    if (mp2) mp2.style.display = 'none';
                    if (mi2) mi2.style.display = 'list-item';

                    var vp3 = document.querySelector('.btn-view-profile');
                    var vp4 = document.querySelector('.Myprofil');
                    if (vp3) vp3.href = 'investor-profile.html';
                    if (vp4) vp4.href = 'investor-profile.html';
                }

                var logoutButton = document.querySelector('.dropdown-link.sign-out');
                if (logoutButton) {
                    logoutButton.addEventListener('click', function (e) {
                        e.preventDefault();
                        window.logoutUser();
                    });
                }

                setupHeaderIcons();
                refreshHeaderBadges();

            } else {
                var vBtns2 = document.getElementById('auth-buttons-visitor');
                var pCont2 = document.getElementById('profile-dropdown-container');
                if (vBtns2) vBtns2.style.display = 'flex';
                if (pCont2) pCont2.style.display = 'none';

                var b = document.getElementById('nav-browse-projects');
                var mp3 = document.getElementById('nav-my-projects');
                var mi3 = document.getElementById('nav-my-investments');
                if (b) b.style.display = 'none';
                if (mp3) mp3.style.display = 'none';
                if (mi3) mi3.style.display = 'none';

                var msgBtn = document.getElementById('headerMessagesBtn');
                var notiBtn = document.getElementById('headerNotificationsBtn');
                if (msgBtn) msgBtn.style.display = 'none';
                if (notiBtn) notiBtn.style.display = 'none';
                const myProfileLink = document.getElementById('Myprofile');
                if (myProfileLink) myProfileLink.style.display = 'none';

                var langSwitcher = document.getElementById('languageSwitcher');
                if (langSwitcher) langSwitcher.style.display = 'flex';
            }

            var currentLang = localStorage.getItem('preferred_language') || 'ar';
            if (window.updateLanguage) window.updateLanguage(currentLang);

            document.dispatchEvent(new CustomEvent('header:ready', { detail: { loaded: true } }));

        } catch (e) {
            placeholder.innerHTML = `<p style="color:red; text-align:center;">${t('js-header-error-load-failed')}</p>`;
        }
    }

    window.initHeader = async function () { await loadAndSetupHeader(); };
    window.loadAndSetupHeader = window.initHeader;

    window.populateHeader = populateHeader;
    window.ProfileDropdown = ProfileDropdown;
    window.initMobileMenu = initMobileMenu;

    window.addEventListener('storage', function (e) {
        if (e.key === 'user_token' || e.key === 'user_data') {
            refreshHeaderBadges();
        }
    });
})();
