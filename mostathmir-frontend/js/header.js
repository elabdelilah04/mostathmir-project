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
            var hasProfilePic = user.profilePicture && user.profilePicture !== 'default-avatar.png' && user.profilePicture.startsWith('http');
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
            var viewProfileAnchor = dropdown.querySelector('.btn-view-profile');
            if (viewProfileAnchor) {
                viewProfileAnchor.href = user.accountType === 'investor' ? 'investor-profile.html' : 'profile.html';
            }
            var myProfileLink = document.getElementById('Myprofile');
            if (myProfileLink) {
                myProfileLink.querySelector('a').href = user.accountType === 'investor' ? 'investor-profile.html' : 'profile.html';
            }
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

    async function refreshHeaderBadges() {
        const token = localStorage.getItem('user_token');
        const baseUrl = 'https://mostathmir-api.onrender.com';

        const msgBadge = document.getElementById('headerMessagesBadge');
        const notiBadge = document.getElementById('headerNotificationsBadge');
        if (!msgBadge || !notiBadge) return;

        if (!token) {
            msgBadge.style.display = 'none';
            notiBadge.style.display = 'none';
            return;
        }

        try {
            let unreadMessages = 0;
            try {
                const resMsg = await fetch(`${baseUrl}/api/messages`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (resMsg.ok) {
                    const conversations = await resMsg.json();
                    if (Array.isArray(conversations)) {
                        unreadMessages = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
                    }
                }
            } catch (e) {
                console.warn('refreshHeaderBadges: fetching messages failed', e);
            }

            let unreadNotifications = 0;
            try {
                const resNoti = await fetch(`${baseUrl}/api/notifications`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (resNoti.ok) {
                    const notifications = await resNoti.json();
                    if (Array.isArray(notifications)) {
                        unreadNotifications = notifications.filter(n => !n.read).length;
                    }
                }
            } catch (e) {
                console.warn('refreshHeaderBadges: fetching notifications failed', e);
            }

            if (unreadMessages > 0) {
                msgBadge.textContent = unreadMessages;
                msgBadge.style.display = 'block';
            } else {
                msgBadge.style.display = 'none';
            }

            if (unreadNotifications > 0) {
                notiBadge.textContent = unreadNotifications;
                notiBadge.style.display = 'block';
            } else {
                notiBadge.style.display = 'none';
            }

            document.dispatchEvent(new CustomEvent('header:badges-updated', {
                detail: { unreadMessages, unreadNotifications }
            }));

        } catch (ex) {
            console.warn('refreshHeaderBadges: unexpected error', ex);
        }
    }

    function relocateLanguageForMobile() {
        var switcher = document.getElementById('languageSwitcher');
        if (!switcher) return;

        var mainNav = document.querySelector('.main-nav');
        var navList = mainNav ? (mainNav.querySelector('ul, .nav-list, nav') || mainNav) : null;

        var topBarContainer =
            document.querySelector('.header-content > div:last-child');

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
                topBarContainer.insertBefore(switcher, document.querySelector('.mobile-menu-toggle'));
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
            var res = await fetch('/header.html');
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
                if (pCont) pCont.style.display = 'flex';

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
                } else if (user.accountType === 'investor') {
                    var mp2 = document.getElementById('nav-my-projects');
                    var mi2 = document.getElementById('nav-my-investments');
                    if (mp2) mp2.style.display = 'none';
                    if (mi2) mi2.style.display = 'list-item';
                }

                const myProfileLink = document.getElementById('Myprofile');
                if (myProfileLink) {
                    myProfileLink.style.display = 'list-item';
                    myProfileLink.querySelector('a').href = user.accountType === 'investor' ? 'investor-profile.html' : 'profile.html';
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
                var myp = document.getElementById('Myprofile');
                if (b) b.style.display = 'none';
                if (mp3) mp3.style.display = 'none';
                if (mi3) mi3.style.display = 'none';
                if (myp) myp.style.display = 'none';

                var icons = document.getElementById('header-icons');
                if (icons) icons.style.display = 'none';
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

    window.addEventListener('storage', function (e) {
        if (e.key === 'user_token' || e.key === 'user_data') {
            refreshHeaderBadges();
        }
    });

    // Initialize header on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', window.initHeader);

})();