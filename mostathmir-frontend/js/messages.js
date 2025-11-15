let currentTab = 'messages';
let currentFilter = 'all';
const API_BASE_URL = 'https://mostathmir-api.onrender.com';
let allConversations = [];
let allNotifications = [];
(function () {
    function applyInitialTabFromHash() {
        const h = (location.hash || '').replace('#', '');
        if (h === 'notifications') {
            switchTab('notifications');
        } else {
            switchTab('messages');
        }
    }
    window.addEventListener('hashchange', applyInitialTabFromHash);
    document.addEventListener('DOMContentLoaded', applyInitialTabFromHash);
})();


function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tab + 'Tab').classList.add('active');
    if (tab === 'messages') {
        document.getElementById('messagesSection').classList.remove('hidden');
        document.getElementById('notificationsSection').classList.add('hidden');
    } else {
        document.getElementById('messagesSection').classList.add('hidden');
        document.getElementById('notificationsSection').classList.remove('hidden');
    }
    filterContent();
}

function filterByStatus(status) {
    currentFilter = status;
    document.querySelectorAll('.filter-chip').forEach(chip => chip.classList.remove('active'));
    document.querySelector(`[data-filter="${status}"]`).classList.add('active');
    filterContent();
}

function filterContent() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const items = currentTab === 'messages' ?
        document.querySelectorAll('#messagesList .message-card') :
        document.querySelectorAll('#notificationsList .notification-card');

    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        const matchesSearch = text.includes(searchTerm);
        let matchesFilter = true;
        if (currentFilter === 'unread') {
            matchesFilter = item.dataset.status === 'unread';
        }
        item.style.display = matchesSearch && matchesFilter ? 'block' : 'none';
    });
}

async function fetchAndRenderMessages() {
    const token = localStorage.getItem('user_token');
    const messagesList = document.getElementById('messagesList');
    if (!token || !messagesList) return;
    messagesList.innerHTML = `<p class="text-center text-gray-500 py-8">${t('js-messages-loading-messages')}</p>`;
    try {
        const response = await fetch(`${API_BASE_URL}/api/messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(t('js-messages-error-fetch-messages'));
        allConversations = await response.json();
        if (allConversations.length === 0) {
            messagesList.innerHTML = `<p class="text-center text-gray-500 py-8">${t('js-messages-no-messages')}</p>`;
        } else {
            messagesList.innerHTML = allConversations.map(createConversationCard).join('');
        }
        updateStats();
        if (window.translatePage) window.translatePage();
    } catch (error) {
        console.error(error);
        messagesList.innerHTML = `<p class="text-center text-red-500 py-8">${error.message}</p>`;
    }
}

function createConversationCard(conv) {
    const { otherUser, lastMessage, unreadCount } = conv;
    const isUnread = unreadCount > 0;
    let avatarHTML = '';
    if (otherUser.profilePicture && otherUser.profilePicture !== 'default-avatar.png' && otherUser.profilePicture.startsWith('http')) {
        avatarHTML = `<img src="${otherUser.profilePicture}" alt="${otherUser.fullName}" class="w-12 h-12 rounded-full object-cover">`;
    } else {
        const initial = otherUser.fullName ? otherUser.fullName.charAt(0) : '?';
        avatarHTML = `<div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">${initial}</div>`;
    }
    const timeAgo = new Date(lastMessage.createdAt).toLocaleDateString('en-us', { day: 'numeric', month: 'short' });
    const profileLink = `./public-profile.html?id=${otherUser._id}`;

    let subjectHTML = '';
    if (lastMessage.subject && lastMessage.subject !== t('js-messages-subject-general-val')) {
        subjectHTML = `<span class="message-subject-badge">${lastMessage.subject}</span>`;
    }

    return `
        <div class="message-card ${isUnread ? 'unread' : ''} p-6" data-status="${isUnread ? 'unread' : 'read'}" data-id="${otherUser._id}">
             <i class="fas fa-trash delete-icon" title="${t('js-messages-delete-conversation-title')}" onclick="deleteSingleItem(event, 'messages', '${otherUser._id}')"></i>
            <div class="flex items-start gap-4" onclick="openMessage('${otherUser._id}')">
                ${avatarHTML}
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-2">
                        <h3 class="font-bold text-gray-900 truncate">
                            <a href="${profileLink}" onclick="event.stopPropagation()" class="hover:underline">${otherUser.fullName}</a>
                        </h3>
                        <div class="flex items-center gap-2 text-sm text-gray-500"><span>${timeAgo}</span></div>
                    </div>
                    <p class="text-sm text-gray-600 mb-2 line-clamp-1">${lastMessage.content}</p>
                    ${subjectHTML}
                    ${unreadCount > 0 ? `<div class="absolute bottom-4 left-4 text-xs bg-red-500 text-white font-bold rounded-full w-6 h-6 flex items-center justify-center">${unreadCount}</div>` : ''}
                </div>
            </div>
        </div>`;
}

async function fetchAndRenderNotifications() {
    const token = localStorage.getItem('user_token');
    const notificationsList = document.getElementById('notificationsList');
    if (!token || !notificationsList) return;
    notificationsList.innerHTML = `<p class="text-center text-gray-500 py-8">${t('js-messages-loading-notifications')}</p>`;
    try {
        const response = await fetch(`${API_BASE_URL}/api/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(t('js-messages-error-fetch-notifications'));
        allNotifications = await response.json();
        if (allNotifications.length === 0) {
            notificationsList.innerHTML = `<p class="text-center text-gray-500 py-8">${t('js-messages-no-notifications')}</p>`;
        } else {
            notificationsList.innerHTML = allNotifications.map(createNotificationCard).join('');
        }
        updateStats();
        if (window.translatePage) window.translatePage();
    } catch (error) {
        console.error(error);
        notificationsList.innerHTML = `<p class="text-center text-red-500 py-8">${error.message}</p>`;
    }
}

function createNotificationCard(notification) {
    const isUnread = !notification.read;
    const timeAgo = new Date(notification.createdAt).toLocaleString('en-us');
    const iconMap = {
        'PROJECT_STATUS_UPDATE': 'fas fa-clipboard-check text-blue-500',
        'NEW_INVESTMENT': 'fas fa-hand-holding-usd text-green-500',
        'NEW_FOLLOWER': 'fas fa-heart text-pink-500',
        'PROJECT_UNFOLLOW': 'fas fa-heart-broken text-gray-500',
        'NEW_USER_FOLLOWER': 'fas fa-user-plus text-blue-500',
        'USER_UNFOLLOW': 'fas fa-user-minus text-gray-500',
        'NEW_PROPOSAL': 'fas fa-file-signature text-purple-500',
        'PROPOSAL_RESPONSE': 'fas fa-reply text-blue-500',
        'FUNDING_GOAL_REACHED': 'fas fa-trophy text-yellow-500',
        'CAMPAIGN_ENDING_SOON': 'fas fa-hourglass-half text-orange-500'
    };
    const iconClass = iconMap[notification.type] || 'fas fa-bell text-gray-500';

    let messageText;
    if (notification.messageKey) {
        messageText = t(notification.messageKey);
        if (notification.messageParams) {
            Object.keys(notification.messageParams).forEach(key => {
                const regex = new RegExp(`{${key}}`, 'g');
                let paramValue = notification.messageParams[key];
                if (key === 'statusKey') {
                    paramValue = t(paramValue);
                }
                messageText = messageText.replace(regex, paramValue);
            });
        }
    } else {
        messageText = notification.message; // Fallback for old notifications
    }

    let messageHTML = messageText;
    if (notification.sender && notification.sender.fullName) {
        const senderLink = `./public-profile.html?id=${notification.sender._id}`;
        const userNameParam = notification.messageParams?.userName || notification.sender.fullName;
        const userRegex = new RegExp(userNameParam.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
        messageHTML = messageHTML.replace(userRegex, `<a href="${senderLink}" class="font-bold text-blue-600 hover:underline" onclick="event.stopPropagation()">${userNameParam}</a>`);
    }
    if (notification.projectId && notification.projectId.projectName) {
        const projectLink = `./project-view.html?id=${notification.projectId._id}`;
        const projectNameParam = notification.messageParams?.projectName || `"${notification.projectId.projectName}"`;
        const projectRegex = new RegExp(projectNameParam.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
        messageHTML = messageHTML.replace(projectRegex, `<a href="${projectLink}" class="font-bold text-purple-600 hover:underline" onclick="event.stopPropagation()">${projectNameParam}</a>`);
    }

    let actionButton = '';
    if (notification.note && notification.note.trim() !== '') {
        actionButton = `<button class="secondary-button px-3 py-1 text-xs" onclick="showAdminNoteModal('${notification.note.replace(/'/g, "\\'")}')">${t('js-messages-view-note-btn')}</button>`;
    } else if (['NEW_INVESTMENT', 'NEW_PROPOSAL', 'PROPOSAL_RESPONSE'].includes(notification.type)) {
        actionButton = `<button class="secondary-button px-3 py-1 text-xs" onclick="openNotificationDetails('${notification._id}', event)">${t('js-messages-view-details-btn')}</button>`;
    }

    return `
        <div class="notification-card ${isUnread ? 'unread' : ''} p-6" data-status="${isUnread ? 'unread' : 'read'}" data-id="${notification._id}" data-link="${notification.link}">
            <i class="fas fa-trash delete-icon" title="${t('js-messages-delete-notification-title')}" onclick="deleteSingleItem(event, 'notifications', '${notification._id}')"></i>
            <div class="flex items-start gap-4">
                <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl flex-shrink-0">
                    <i class="${iconClass}"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class=" items-center justify-between mb-2">
                        <p class="text-sm text-gray-700 mb-1" onclick="handleNotificationClick(event)">${messageHTML}</p>
                        <span class="text-xs text-gray-500 flex-shrink-0 ml-2">${timeAgo}</span>
                    </div>
                    <div class="mt-2">
                        ${actionButton}
                    </div>
                </div>
            </div>
        </div>`;
}

async function handleNotificationAction(event, notificationId, action) {
    event.stopPropagation();
    const notification = allNotifications.find(n => n._id === notificationId);
    if (!notification) return;

    if (action === 'show_note') {
        showAdminNoteModal(notification.note);
    } else if (action === 'show_details') {
        openNotificationDetails(notificationId, event);
    }
}

async function handleNotificationClick(event) {
    if (event.target.tagName === 'A' || event.target.dataset.note || event.target.closest('button') || event.target.classList.contains('delete-icon')) {
        return;
    }

    const card = event.currentTarget.closest('.notification-card');
    const notificationId = card.dataset.id;
    const link = card.dataset.link;
    const token = localStorage.getItem('user_token');

    try {
        await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        card.classList.remove('unread');
        card.dataset.status = 'read';
        updateStats();
        if (link && link !== 'undefined') {
            window.location.href = `.${link}`;
        }
    } catch (error) {
        console.error('Failed to mark notification as read:', error);
    }
}

function showAdminNoteModal(note) {
    const modal = document.getElementById('adminNoteModal');
    const content = document.getElementById('adminNoteContent');
    if (modal && content) {
        content.textContent = note;
        modal.classList.remove('hidden');
    }
}

function closeAdminNoteModal() {
    const modal = document.getElementById('adminNoteModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function openNotificationDetails(notificationId, event) {
    event.stopPropagation();
    const token = localStorage.getItem('user_token');
    const notification = allNotifications.find(n => n._id === notificationId);
    if (!notification) return;

    const modal = document.getElementById('notificationDetailsModal');
    const modalTitle = modal.querySelector('h2');
    const contentEl = document.getElementById('notificationDetailContent');
    const linkEl = document.getElementById('notificationDetailLink');
    const responseSection = document.getElementById('proposalResponseSection');

    const typeMap = {
        'PROJECT_STATUS_UPDATE': t('js-messages-notification-type-status-update'),
        'NEW_INVESTMENT': t('js-messages-notification-type-new-investment'),
        'NEW_FOLLOWER': t('js-messages-notification-type-new-follower'),
        'NEW_PROPOSAL': t('js-messages-notification-type-new-proposal'),
        'PROPOSAL_RESPONSE': t('js-messages-notification-type-proposal-response'),
        'FUNDING_GOAL_REACHED': t('js-messages-notification-type-goal-reached')
    };
    modalTitle.textContent = typeMap[notification.type] || t('messages-notification-details-title');

    let detailsHTML = '';
    responseSection.style.display = 'none';

    let messageText;
    // Fallback for old notifications that only have a direct `message`
    if (!notification.messageKey) {
        messageText = notification.message;
    } else {
        messageText = t(notification.messageKey);
        if (notification.messageParams) {
            Object.keys(notification.messageParams).forEach(key => {
                const regex = new RegExp(`{${key}}`, 'g');
                let paramValue = notification.messageParams[key];

                // *** التعديل المهم هنا ***
                // إذا كان اسم المتغير هو 'statusKey'، قم بترجمة قيمته أولاً
                if (key === 'statusKey' && typeof paramValue === 'string') {
                    paramValue = t(paramValue);
                }

                messageText = messageText.replace(regex, paramValue);
            });
        }
    }

    if (notification.sender) {
        let avatarHTML = '';
        if (notification.sender.profilePicture && notification.sender.profilePicture !== 'default-avatar.png' && notification.sender.profilePicture.startsWith('http')) {
            avatarHTML = `<img src="${notification.sender.profilePicture}" alt="${notification.sender.fullName}" class="sender-avatar">`;
        } else {
            const initial = notification.sender.fullName ? notification.sender.fullName.charAt(0) : '?';
            avatarHTML = `<div class="sender-avatar-initials">${initial}</div>`;
        }

        const senderRole = notification.sender.profileTitle || (notification.sender.accountType === 'investor' ? t('js-messages-role-investor') : t('js-messages-role-ideaholder'));
        const formattedDate = new Date(notification.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const senderProfileLink = `./public-profile.html?id=${notification.sender._id}`;

        detailsHTML += `
        <div class="notification-details-card">
            <div class="sender-info-grid">
                <a href="${senderProfileLink}" class="sender-avatar-wrapper" onclick="event.stopPropagation()">${avatarHTML}</a>
                <a href="${senderProfileLink}" class="sender-name" onclick="event.stopPropagation()">${notification.sender.fullName}</a>
                <div class="sender-title">${senderRole}</div>
                <div class="notification-date">${formattedDate}</div>
            </div>
            <p class="notification-main-message">${messageText.replace(/<a[^>]*>(.*?)<\/a>/g, '$1')}</p>`;

        if (notification.projectId) {
            detailsHTML += `<div class="project-link"><span>${t('js-messages-project-label')}:</span><a href="./project-view.html?id=${notification.projectId._id}">${notification.projectId.projectName}</a></div>`;
        }
        detailsHTML += '</div>';
    } else {
        detailsHTML += `<p>${messageText}</p>`;
    }


    if (notification.type === 'NEW_INVESTMENT') {
        const currency = notification.currency || '';
        if (notification.investmentType === 'reservation') {
            detailsHTML += `
                <div class="mt-4 border-t pt-4">
                    <h4 class="font-bold text-gray-800 mb-2">${t('js-messages-reservation-details-title')}:</h4>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between p-2 bg-gray-100 rounded"><span>${t('js-messages-total-label')}:</span><span class="font-semibold">${(notification.amount || 0).toLocaleString()} ${currency}</span></div>
                        <div class="flex justify-between p-2 bg-green-100 rounded"><span>${t('js-messages-paid-now-label')}:</span><span class="font-semibold text-green-700">${(notification.amountPaidNow || 0).toLocaleString()} ${currency}</span></div>
                        <div class="flex justify-between p-2 bg-red-100 rounded"><span>${t('js-messages-remaining-label')}:</span><span class="font-semibold text-red-700">${(notification.amountRemaining || 0).toLocaleString()} ${currency}</span></div>
                    </div>
                </div>`;
        } else {
            detailsHTML += `
                <div class="mt-4 border-t pt-4">
                    <h4 class="font-bold text-gray-800 mb-2">${t('js-messages-full-funding-details-title')}:</h4>
                    <div class="p-3 bg-green-100 rounded text-center">
                        <span class="text-sm text-green-800">${t('js-messages-investment-amount-label')}</span>
                        <div class="text-xl font-bold text-green-700">${(notification.amount || 0).toLocaleString()} ${currency}</div>
                    </div>
                </div>`;
        }
    } else if (notification.type === 'NEW_PROPOSAL') {
        responseSection.style.display = 'block';
        const proposalId = notification.referenceId;
        document.getElementById('acceptProposalBtn').onclick = () => handleProposalResponse(proposalId, 'accepted');
        document.getElementById('rejectProposalBtn').onclick = () => handleProposalResponse(proposalId, 'rejected');
        document.getElementById('responseForm').onsubmit = (e) => { e.preventDefault(); handleProposalResponse(proposalId, 'rejected'); };

    } else if (notification.type === 'PROPOSAL_RESPONSE') {
        detailsHTML += `<div class="border-t pt-4">`;

        const statusClass = notification.responseStatus === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
        const statusText = notification.responseStatus === 'accepted' ? t('js-messages-status-accepted') : t('js-messages-status-rejected');
        detailsHTML += `
            <h4 class="font-bold text-gray-800 mt-4 mb-2">${t('js-messages-response-from-owner-title')}:</h4>
            <div class="flex justify-between items-center mb-2">
                <span class="font-semibold">${t('js-messages-status-label')}:</span> 
                <span class="px-3 py-1 rounded-full text-sm font-bold ${statusClass}">${statusText}</span>
            </div>
            <p class="p-3 bg-gray-100 border rounded text-gray-700">${notification.responseMessage || t('js-messages-no-response-message')}</p>
        </div>`;
    }

    contentEl.innerHTML = detailsHTML;
    if (notification.projectId) {
        linkEl.href = `./project-view.html?id=${notification.projectId._id}`;
        linkEl.style.display = 'inline-flex';
    } else if (notification.link && notification.link !== 'undefined') {
        linkEl.href = `.${notification.link}`;
        linkEl.style.display = 'inline-flex';
    } else {
        linkEl.style.display = 'none';
    }

    modal.classList.remove('hidden');

    if (!notification.read) {
        try {
            await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const card = document.querySelector(`.notification-card[data-id='${notificationId}']`);
            if (card) {
                card.classList.remove('unread');
                card.dataset.status = 'read';
            }
            notification.read = true;
            updateStats();
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    }
}

async function handleProposalResponse(proposalId, status) {
    const token = localStorage.getItem('user_token');
    const responseMessage = document.getElementById('responseMessageText').value;

    const btnId = status === 'accepted' ? 'acceptProposalBtn' : 'rejectProposalBtn';
    const actionButton = document.getElementById(btnId);
    const originalText = actionButton.innerHTML;
    actionButton.disabled = true;
    actionButton.innerHTML = t('js-messages-sending-text');

    try {
        const response = await fetch(`${API_BASE_URL}/api/proposals/${proposalId}/respond`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ status, responseMessage })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || t('js-messages-error-response-failed'));
        }

        alert(t('js-messages-success-response-sent'));
        closeNotificationDetailsModal();
        fetchAndRenderNotifications();

    } catch (error) {
        alert(`${t('js-messages-error-prefix')}: ${error.message}`);
    } finally {
        actionButton.disabled = false;
        actionButton.innerHTML = originalText;
    }
}

function closeNotificationDetailsModal() {
    document.getElementById('notificationDetailsModal').classList.add('hidden');
    document.getElementById('responseMessageText').value = '';
}

async function markAllAsRead(type) {
    const token = localStorage.getItem('user_token');
    const endpoint = type === 'messages' ? '/api/messages/read-all' : '/api/notifications/read-all';
    const method = 'PUT';

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: method,
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(t('js-messages-error-mark-all-read-failed'));

        if (type === 'messages') {
            document.querySelectorAll('.message-card.unread').forEach(card => card.classList.remove('unread'));
            fetchAndRenderMessages();
        } else {
            document.querySelectorAll('.notification-card.unread').forEach(card => {
                card.classList.remove('unread');
                card.dataset.status = 'read';
            });
            allNotifications.forEach(n => n.read = true);
        }
        updateStats();
        showSuccessMessage(t('js-messages-success-mark-all-read'));
    } catch (error) {
        console.error(`Failed to mark all ${type} as read:`, error);
        alert(error.message);
    }
}

async function deleteAll(type) {
    const confirmMessage = type === 'messages' ? t('js-messages-confirm-delete-all-messages') : t('js-messages-confirm-delete-all-notifications');
    if (!confirm(confirmMessage)) return;

    const token = localStorage.getItem('user_token');
    const endpoint = type === 'messages' ? '/api/messages' : '/api/notifications';

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(t('js-messages-error-delete-all-failed'));

        if (type === 'messages') {
            document.getElementById('messagesList').innerHTML = `<p class="text-center text-gray-500 py-8">${t('js-messages-no-messages')}</p>`;
            allConversations = [];
        } else {
            document.getElementById('notificationsList').innerHTML = `<p class="text-center text-gray-500 py-8">${t('js-messages-no-notifications')}</p>`;
            allNotifications = [];
        }
        updateStats();
        showSuccessMessage(t('js-messages-success-delete-all'));
    } catch (error) {
        console.error(`Failed to delete all ${type}:`, error);
        alert(error.message);
    }
}

async function deleteSingleItem(event, type, id) {
    event.stopPropagation();
    const confirmMessage = type === 'messages' ? t('js-messages-confirm-delete-conversation') : t('js-messages-confirm-delete-notification');
    if (!confirm(confirmMessage)) return;

    const token = localStorage.getItem('user_token');
    const endpoint = type === 'messages' ? `/api/messages/conversation/${id}` : `/api/notifications/${id}`;

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(t('js-messages-error-delete-item-failed'));

        const cardToRemove = document.querySelector(`[data-id="${id}"]`);
        if (cardToRemove) {
            cardToRemove.remove();
        }

        if (type === 'messages') {
            allConversations = allConversations.filter(c => c.otherUser._id !== id);
        } else {
            allNotifications = allNotifications.filter(n => n._id !== id);
        }
        updateStats();
        showSuccessMessage(t('js-messages-success-delete-item'));

    } catch (error) {
        console.error(`Failed to delete item:`, error);
        alert(error.message);
    }
}

async function openMessage(otherUserId) {
    const token = localStorage.getItem('user_token');
    const modal = document.getElementById('messageModal');
    const modalHeader = document.getElementById('modalHeader');
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');

    modalHeader.innerHTML = `<p>${t('js-messages-loading-conversation')}</p>`;
    modalBody.innerHTML = '';
    modalFooter.innerHTML = '';
    modal.classList.remove('hidden');

    try {
        const response = await fetch(`${API_BASE_URL}/api/messages/conversation/${otherUserId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(t('js-messages-error-fetch-conversation'));
        const messages = await response.json();

        const otherUser = allConversations.find(c => c.otherUser._id === otherUserId).otherUser;
        const currentUserId = localStorage.getItem('user_id');

        let avatarHTML = '';
        if (otherUser.profilePicture && otherUser.profilePicture !== 'default-avatar.png' && otherUser.profilePicture.startsWith('http')) {
            avatarHTML = `<img src="${otherUser.profilePicture}" alt="${otherUser.fullName}" class="w-12 h-12 rounded-full object-cover">`;
        } else {
            const initial = otherUser.fullName ? otherUser.fullName.charAt(0) : '?';
            avatarHTML = `<div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">${initial}</div>`;
        }

        const accountTypeDisplay = otherUser.accountType === 'ideaHolder' ? t('js-messages-role-ideaholder') : t('js-messages-role-investor');

        modalHeader.innerHTML = `
            <div class="flex items-center justify-between w-full">
                <div class="flex items-center gap-4">
                    ${avatarHTML}
                    <div>
                        <h3 class="font-bold text-gray-900">${otherUser.fullName}</h3>
                        <p class="text-sm text-gray-500">${otherUser.profileTitle || accountTypeDisplay}</p>
                    </div>
                </div>
                <button onclick="closeMessageModal()" class="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>`;

        modalBody.innerHTML = messages.map(msg => {
            const isSentByMe = msg.sender._id.toString() === currentUserId;
            let subjectHTML = '';
            if (msg.subject && msg.subject !== t('js-messages-subject-general-val')) {
                if (msg.subject === t('js-messages-subject-investment-val') && msg.relatedProject) {
                    subjectHTML = `<div class="message-subject project">${t('js-messages-subject-regarding-project')}: <a href="./project-view.html?id=${msg.relatedProject._id}" onclick="event.stopPropagation()">${msg.relatedProject.projectName}</a></div>`;
                } else {
                    subjectHTML = `<div class="message-subject">${msg.subject}</div>`;
                }
            }
            return `
                <div class="reply-bubble ${isSentByMe ? 'investor' : 'entrepreneur'}">
                    ${subjectHTML}
                    <p class="text-gray-700 text-sm leading-relaxed">${msg.content}</p>
                    <div class="time-stamp text-right">${new Date(msg.createdAt).toLocaleTimeString('en-us', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>`;
        }).join('');

        modalFooter.innerHTML = `
            <form onsubmit="sendReply(event, '${otherUserId}')">
                <div class="flex items-center gap-2">
                    <textarea id="replyTextarea" class="search-input flex-1" rows="1" placeholder="${t('js-messages-reply-placeholder')}" required></textarea>
                    <button type="submit" class="elegant-button p-3 rounded-full">
                        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path></svg>
                    </button>
                </div>
            </form>`;

        modalBody.scrollTop = modalBody.scrollHeight;
        fetchAndRenderMessages();

    } catch (error) {
        modalHeader.innerHTML = `<p class="text-red-500">${error.message}</p>`;
    }
}

async function sendReply(event, recipientId) {
    event.preventDefault();
    const textarea = document.getElementById('replyTextarea');
    const content = textarea.value.trim();
    const token = localStorage.getItem('user_token');
    if (!content) return;

    const submitButton = event.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/api/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ recipientId, content })
        });
        if (!response.ok) throw new Error(t('js-messages-error-reply-failed'));

        const newMessage = await response.json();

        const modalBody = document.getElementById('modalBody');
        const currentUserId = localStorage.getItem('user_id');
        const isSentByMe = newMessage.data.sender._id.toString() === currentUserId;
        const messageBubble = document.createElement('div');
        messageBubble.className = `reply-bubble ${isSentByMe ? 'investor' : 'entrepreneur'}`;
        messageBubble.innerHTML = `
            <p class="text-gray-700 text-sm leading-relaxed">${newMessage.data.content}</p>
            <div class="time-stamp text-right">${new Date(newMessage.data.createdAt).toLocaleTimeString('en-us', { hour: '2-digit', minute: '2-digit' })}</div>
        `;
        modalBody.appendChild(messageBubble);
        modalBody.scrollTop = modalBody.scrollHeight;
        textarea.value = '';
        fetchAndRenderMessages();
    } catch (error) {
        alert(error.message);
    } finally {
        submitButton.disabled = false;
    }
}

function closeMessageModal() {
    document.getElementById('messageModal').classList.add('hidden');
}

function updateStats() {
    const unreadMessages = allConversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
    const unreadNotifications = allNotifications.filter(n => !n.read).length;

    // Page-local badges (in messages.html)
    const messagesBadge = document.getElementById('messagesBadge');
    const notificationsBadge = document.getElementById('notificationsBadge');

    if (messagesBadge) {
        messagesBadge.textContent = unreadMessages;
        messagesBadge.style.display = unreadMessages > 0 ? 'block' : 'none';
    }

    if (notificationsBadge) {
        notificationsBadge.textContent = unreadNotifications;
        notificationsBadge.style.display = unreadNotifications > 0 ? 'block' : 'none';
    }

    // Header badges (global, in header.html) — ensure header shows correct counts too
    const headerMsgBadge = document.getElementById('headerMessagesBadge');
    const headerNotiBadge = document.getElementById('headerNotificationsBadge');

    if (headerMsgBadge) {
        headerMsgBadge.textContent = unreadMessages;
        headerMsgBadge.style.display = unreadMessages > 0 ? 'block' : 'none';
    }
    if (headerNotiBadge) {
        headerNotiBadge.textContent = unreadNotifications;
        headerNotiBadge.style.display = unreadNotifications > 0 ? 'block' : 'none';
    }

    // Also notify other scripts (header.js listens for this event pattern)
    document.dispatchEvent(new CustomEvent('header:badges-updated', {
        detail: { unreadMessages, unreadNotifications }
    }));
}

function showSuccessMessage(message) {
    const existingMessage = document.querySelector('.success-message');
    if (existingMessage) { existingMessage.remove(); }
    const messageDiv = document.createElement('div');
    messageDiv.className = 'success-message fixed top-4 left-4 z-50 p-4 bg-green-100 border border-green-300 text-green-800 rounded-lg shadow-lg max-w-sm slide-up';
    messageDiv.innerHTML = `<div class="flex items-center gap-3"><span class="text-lg">✅</span><span class="flex-1">${message}</span><button onclick="this.parentElement.parentElement.remove()" class="text-gray-500 hover:text-gray-700">×</button></div>`;
    document.body.appendChild(messageDiv);
    setTimeout(() => { if (messageDiv.parentElement) { messageDiv.remove(); } }, 5000);
}

document.addEventListener('DOMContentLoaded', function () {
    if (window.initHeader) {
        window.initHeader();
    } else {
        document.addEventListener('header:ready', () => fetchAndRenderNotifications());
    }
    fetchAndRenderMessages();
    fetchAndRenderNotifications();
    document.addEventListener('click', function (event) {
        if (event.target.id === 'messageModal') { closeMessageModal(); }
    });
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') { closeMessageModal(); }
    });
});
