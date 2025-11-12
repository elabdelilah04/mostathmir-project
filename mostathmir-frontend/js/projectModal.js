function getAvatarColor(initial) {
    const colors = ['bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600', 'bg-red-600', 'bg-indigo-600'];
    const charCode = initial.charCodeAt(0);
    return colors[charCode % colors.length];
}


window.openProjectDetails = function (project) {
    if (!project) return;
    window.currentProject = project;

    document.getElementById('modalTitle').textContent = project.projectName || t('js-modal-untitled-project');
    document.getElementById('modalCategory').textContent = project.projectCategory || t('js-modal-category-general');
    document.getElementById('modalDescription').textContent = (project.projectDescription || '').substring(0, 200) + '...';

    const goal = project.fundingGoal ? project.fundingGoal.amount || 0 : 0;
    const raised = project.fundingAmountRaised || 0;
    const progress = goal > 0 ? Math.round((raised / goal) * 100) : 0;
    const currency = project.fundingGoal ? project.fundingGoal.currency : 'USD';

    document.getElementById('modalTargetAmount').textContent = `${goal.toLocaleString()} ${currency}`;
    document.getElementById('modalRaisedAmount').textContent = `${raised.toLocaleString()} ${currency} ${t('js-modal-raised')}`;
    document.getElementById('modalProgress').textContent = `${progress}% ${t('js-modal-completed')}`;
    document.getElementById('modalProgressBar').style.width = `${progress}%`;

    const ownerId = project.owner?._id || 'default';
    const ownerName = project.owner?.fullName || t('js-modal-entrepreneur');

    let ownerTitle = project.owner?.profileTitle;
    if (!ownerTitle) {
        ownerTitle = project.owner?.accountType === 'investor' ? t('js-modal-role-investor') : t('js-modal-role-ideaholder');
    }

    const ownerInitial = ownerName.charAt(0);
    const avatarColor = getAvatarColor(ownerInitial);
    const ownerLink = `./public-profile.html?id=${ownerId}`;

    document.getElementById('modalOwnerName').innerHTML = `<a href="${ownerLink}" target="_blank" class="hover:text-blue-600">${ownerName}</a>`;
    const modalOwnerTitleElement = document.getElementById('modalOwnerTitle');
    if (modalOwnerTitleElement) modalOwnerTitleElement.textContent = ownerTitle;

    document.getElementById('modalOwnerAvatar').textContent = ownerInitial;
    document.getElementById('modalOwnerAvatar').className = `w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${avatarColor}`;

    const fullDetailsButton = document.getElementById('btnOpenFullDetails');
    if (fullDetailsButton) {
        fullDetailsButton.href = `project-view.html?id=${project._id}`;
    }
    const investButton = document.getElementById('btnInvestInProject');
    if (investButton) {
        investButton.href = `invest.html?id=${project._id}`;
    }

    document.getElementById('projectModal').classList.remove('hidden');
}

window.closeProjectModal = function () {
    document.getElementById('projectModal').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('projectModal').addEventListener('click', (e) => {
        if (e.target.id === 'projectModal' || e.target.classList.contains('modal')) {
            window.closeProjectModal();
        }
    });
});