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
                toggleButton.classList.toggle('is-active');
            });
        }
    }

    function populateHeader(user, baseUrl) {
        var hasProfilePic = user.profilePicture && user.profilePicture !== 'default-avatar.png' && user.profilePicture.startsWith('http');
        var parts = user.fullName ? user.fullName.trim().split(' ') : [];
        var initials = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : (user.fullName || '').trim().substring(0, 2).toUpperCase();
        var profileUrl = user.accountType === 'investor' ? '/investor-profile.html' : '/profile.html';

        // Populate Desktop Dropdown
        var headerAvatarImage = document.getElementById('headerAvatarImage');
        var headerAvatarInitials = document.getElementById('headerAvatarInitials');
        if (headerAvatarImage && headerAvatarInitials) {
            headerAvatarImage.src = hasProfilePic ? user.profilePicture : '';
            headerAvatarImage.style.display = hasProfilePic ? 'block' : 'none';
            headerAvatarInitials.textContent = initials;
            headerAvatarInitials.style.display = hasProfilePic ? 'none' : 'block';
        }
        var dropdown = document.getElementById('profileDropdown');
        if (dropdown) {
            dropdown.querySelector('.user-name').textContent = user.fullName || '';
            dropdown.querySelector('.user-role').textContent = user.accountType === 'investor' ? t('js-header-role-investor') : t('js-header-role-ideaholder');
            dropdown.querySelector('.btn-view-profile').href = profileUrl;
        }

        // Populate Mobile Menu
        var mobileAvatarImage = document.getElementById('mobile-header-avatar-image');
        var mobileAvatarInitials = document.getElementById('mobile-header-avatar-initials');
        if (mobileAvatarImage && mobileAvatarInitials) {
            mobileAvatarImage.src = hasProfilePic ? user.profilePicture : '';
            mobileAvatarImage.style.display = hasProfilePic ? 'block' : 'none';
            mobileAvatarInitials.textContent = initials;
            mobileAvatarInitials.style.display = hasProfilePic ? 'none' : 'block';
        }
        var mobileUserName = document.getElementById('mobile-user-name');
        if (mobileUserName) mobileUserName.textContent = user.fullName || '';
        var mobileUserRole = document.getElementById('mobile-user-role');
        if (mobileUserRole) mobileUserRole.textContent = user.accountType === 'investor' ? t('js-header-role-investor') : t('js-header-role-ideaholder');

        var mobileSignoutLink = document.getElementById('mobile-signout-link');
        if (mobileSignoutLink) {
            mobileSignoutLink.addEventListener('click', function (e) {
                e.preventDefault();
                window.logoutUser();
            });
        }
    }

    if (!window.fetchCurrentUser) {
        window.fetchCurrentUser = async function () {
            var token = localStorage.getItem('user_token');
            if (!token) {
                var protectedPages = ['page-title-profile', 'page-title-investor-profile', 'page-title-settings'];
                if (protectedPages.includes(document.body.dataset.pageKey)) {
                    window.location.href = '/login.html';
                }
                return null;
            }
            try {
                var response = await fetch('https://mostathmir-api.onrender.com/api/users/profile', { headers: { 'Authorization': 'Bearer ' + token } });
                if (!response.ok) {
                    localStorage.removeItem('user_token');
                    localStorage.removeItem('user_data');
                    localStorage.removeItem('user_id');
                    window.location.href = '/login.html';
                    return null;
                }
                var user = await response.json();
                if (user._id) {
                    localStorage.setItem('user_id', user._id);
                }
                localStorage.setItem('user_data', JSON.stringify(user));
                return user;
            } catch (e) {
                console.error("Fetch current user failed:", e);
                return null;
            }
        };
    }

    if (!window.logoutUser) {
        window.logoutUser = function () {
            localStorage.removeItem('user_token');
            localStorage.removeItem('user_data');
            localStorage.removeItem('user_id');
            alert(t('js-header-logout-success'));
            window.location.href = '/login.html';
        };
    }

    function setupHeaderIcons() {
        function setupListeners(containerId) {
            var container = document.getElementById(containerId);
            if (!container) return;

            var msgBtn = container.querySelector('#headerMessagesBtn');
            var notiBtn = container.querySelector('#headerNotificationsBtn');

            if (msgBtn) {
                msgBtn.addEventListener('click', function () { window.location.href = '/messages.html#messages'; });
            }
            if (notiBtn) {
                notiBtn.addEventListener('click', function () { window.location.href = '/messages.html#notifications'; });
            }
        }
        setupListeners('header-icons');
        setupListeners('header-icons-mobile');
    }

    async function refreshHeaderBadges() {
        const token = localStorage.getItem('user_token');
        const baseUrl = 'https://mostathmir-api.onrender.com';

        const msgBadges = document.querySelectorAll('#headerMessagesBadge');
        const notiBadges = document.querySelectorAll('#headerNotificationsBadge');
        if (msgBadges.length === 0 && notiBadges.length === 0) return;

        if (!token) {
            msgBadges.forEach(badge => { badge.style.display = 'none'; });
            notiBadges.forEach(badge => { badge.style.display = 'none'; });
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
            } catch (e) { console.warn('refreshHeaderBadges: fetching messages failed', e); }

            let unreadNotifications = 0;
            try {
                const resNoti = await fetch(`${baseUrl}/api/notifications`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (resNoti.ok) {
                    const notifications = await resNoti.json();
                    if (Array.isArray(notifications)) {
                        unreadNotifications = notifications.filter(n => !n.read).length;
                    }
                }
            } catch (e) { console.warn('refreshHeaderBadges: fetching notifications failed', e); }

            msgBadges.forEach(badge => {
                if (unreadMessages > 0) {
                    badge.textContent = unreadMessages;
                    badge.style.display = 'flex';
                } else {
                    badge.style.display = 'none';
                }
            });

            notiBadges.forEach(badge => {
                if (unreadNotifications > 0) {
                    badge.textContent = unreadNotifications;
                    badge.style.display = 'flex';
                } else {
                    badge.style.display = 'none';
                }
            });

            document.dispatchEvent(new CustomEvent('header:badges-updated', { detail: { unreadMessages, unreadNotifications } }));
        } catch (ex) { console.warn('refreshHeaderBadges: unexpected error', ex); }
    }

    function relocateLanguageForMobile() {
        const switcher = document.getElementById('languageSwitcher');
        const mobileContainer = document.getElementById('language-switcher-mobile-container');
        const desktopContainer = document.querySelector('.header-content > .flex');

        if (!switcher || !desktopContainer) return;

        const isMobile = window.matchMedia("(max-width: 992px)").matches;

        if (isMobile && mobileContainer) {
            if (!mobileContainer.contains(switcher)) {
                mobileContainer.appendChild(switcher);
            }
        } else if (!isMobile) {
            if (!desktopContainer.contains(switcher)) {
                desktopContainer.insertBefore(switcher, desktopContainer.querySelector('.mobile-menu-toggle'));
            }
        }
    }

    function bindRelocateOnResize() {
        window.addEventListener('resize', relocateLanguageForMobile);
    }

    async function loadAndSetupHeader() {
        const placeholder = document.getElementById('header-placeholder');
        if (!placeholder) return;
        try {
            const res = await fetch('/header.html');
            if (!res.ok) throw new Error('Failed to fetch header');
            const html = await res.text();
            placeholder.innerHTML = html;

            const headerElement = document.querySelector('.header');

            initMobileMenu();

            document.querySelectorAll('.language-option').forEach(option => {
                option.addEventListener('click', function () {
                    if (window.updateLanguage) window.updateLanguage(this.dataset.lang);
                });
            });

            const user = await window.fetchCurrentUser();

            if (user) {
                document.getElementById('auth-buttons-visitor').style.display = 'none';
                document.getElementById('profile-dropdown-container').style.display = 'flex';
                document.getElementById('nav-about').style.display = 'none';
                document.getElementById('nav-how').style.display = 'none';

                populateHeader(user, 'https://mostathmir-api.onrender.com');
                new ProfileDropdown();

                document.getElementById('nav-my-projects').style.display = user.accountType === 'ideaHolder' ? 'list-item' : 'none';
                document.getElementById('nav-my-investments').style.display = user.accountType === 'investor' ? 'list-item' : 'none';

                const myProfileLink = document.getElementById('Myprofile');
                if (myProfileLink) {
                    myProfileLink.style.display = 'list-item';
                    myProfileLink.querySelector('a').href = user.accountType === 'investor' ? '/investor-profile.html' : '/profile.html';
                }

                document.querySelector('.dropdown-link.sign-out').addEventListener('click', function (e) {
                    e.preventDefault();
                    window.logoutUser();
                });

                const headerIcons = document.getElementById('header-icons');
                const mobileIconsContainer = document.getElementById('header-icons-mobile');
                if (headerIcons && mobileIconsContainer) {
                    mobileIconsContainer.innerHTML = headerIcons.innerHTML;
                }

                setupHeaderIcons();
                refreshHeaderBadges();
            } else {
                document.getElementById('auth-buttons-visitor').style.display = 'flex';
                document.getElementById('profile-dropdown-container').style.display = 'none';
                document.getElementById('nav-browse-projects').style.display = 'none';
                document.getElementById('nav-my-projects').style.display = 'none';
                document.getElementById('nav-my-investments').style.display = 'none';
                document.getElementById('Myprofile').style.display = 'none';
                document.getElementById('header-icons').style.display = 'none';
            }

            relocateLanguageForMobile();
            bindRelocateOnResize();

            const currentLang = localStorage.getItem('preferred_language') || 'ar';
            if (window.updateLanguage) window.updateLanguage(currentLang);

            if (headerElement) {
                headerElement.classList.add('header-ready');
            }

            document.dispatchEvent(new CustomEvent('header:ready', { detail: { loaded: true } }));
        } catch (e) {
            placeholder.innerHTML = `<p style="color:red; text-align:center;">${t('js-header-error-load-failed')}</p>`;
        }
    }

    window.initHeader = loadAndSetupHeader;

    window.addEventListener('storage', function (e) {
        if (e.key === 'user_token' || e.key === 'user_data') {
            refreshHeaderBadges();
        }
    });

    document.addEventListener('DOMContentLoaded', window.initHeader);

})();