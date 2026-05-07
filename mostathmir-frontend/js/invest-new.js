// js/invest-new.js
let currentProject = null;

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('user_token');
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('id');

    if (!token) {
        alert(t('js-portfolio-login-required'));
        window.location.href = 'login.html';
        return;
    }

    if (!projectId) {
        window.location.href = 'browse-projects.html';
        return;
    }

    await fetchProjectData(projectId);
    initFormInteractions();
});

async function fetchProjectData(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/projects/${id}`);
        currentProject = await response.json();

        document.getElementById('disp-project-name').textContent = currentProject.projectName;
        document.getElementById('disp-project-owner').textContent = currentProject.owner.fullName;
        document.getElementById('disp-total-equity').textContent = `${currentProject.equityOffered}%`;
        document.getElementById('disp-currency').textContent = currentProject.fundingGoal.currency;

        const raised = currentProject.fundingAmountRaised || 0;
        const goal = currentProject.fundingGoal.amount;
        const curr = currentProject.fundingGoal.currency;

        document.getElementById('disp-funding-status').textContent = `${raised.toLocaleString()} / ${goal.toLocaleString()} ${curr}`;

        // استخدام الترجمة للملاحظة
        const minNote = t('js-project-view-min-investment-label');
        document.getElementById('min-invest-note').textContent = `* ${minNote}: ${currentProject.minInvestment.toLocaleString()} ${curr}`;

        document.getElementById('investAmount').value = currentProject.minInvestment;
        updateCalculations();

    } catch (err) {
        console.error("Fetch Error", err);
    }
}

function updateCalculations() {
    if (!currentProject) return;

    const type = document.querySelector('input[name="investmentType"]:checked').value;
    const amount = parseFloat(document.getElementById('investAmount').value) || 0;
    const goal = currentProject.fundingGoal.amount || 1;
    const totalOffered = currentProject.equityOffered || 0;
    const curr = currentProject.fundingGoal.currency;

    const userEquity = (amount / goal) * totalOffered;
    document.getElementById('calculated-user-equity').textContent = `${userEquity.toFixed(4)}%`;

    const platformFee = amount * 0.02;
    document.getElementById('sum-base-amount').textContent = `${amount.toLocaleString()} ${curr}`;
    document.getElementById('sum-platform-fees').textContent = `${platformFee.toLocaleString()} ${curr}`;

    const resRow = document.getElementById('row-reservation');
    const remRow = document.getElementById('row-remaining');

    if (type === 'reservation') {
        const payNow = amount * 0.30;
        const remaining = amount - payNow;
        resRow.style.display = 'flex';
        remRow.style.display = 'flex';
        document.getElementById('sum-pay-now').textContent = `${payNow.toLocaleString()} ${curr}`;
        document.getElementById('sum-remaining').textContent = `${remaining.toLocaleString()} ${curr}`;
        document.getElementById('sum-final-total').textContent = `${(payNow + platformFee).toLocaleString()} ${curr}`;
    } else {
        resRow.style.display = 'none';
        remRow.style.display = 'none';
        document.getElementById('sum-final-total').textContent = `${(amount + platformFee).toLocaleString()} ${curr}`;
    }

    validateForm();
}

function initFormInteractions() {
    document.querySelectorAll('input[name="investmentType"]').forEach(r => {
        r.addEventListener('change', (e) => {
            const isCustom = e.target.value === 'custom';
            document.getElementById('financialInputArea').className = isCustom ? 'hidden' : '';
            document.getElementById('customPartnershipArea').className = isCustom ? '' : 'hidden';
            document.getElementById('financialSummarySection').style.display = isCustom ? 'none' : 'block';
            updateCalculations();
        });
    });

    document.getElementById('investAmount').addEventListener('input', updateCalculations);
    document.getElementById('check-legal-confirm').addEventListener('change', validateForm);
    document.getElementById('customTerms').addEventListener('input', validateForm);
    document.getElementById('investForm').onsubmit = handleSubmission;
}

function validateForm() {
    const amount = parseFloat(document.getElementById('investAmount').value) || 0;
    const type = document.querySelector('input[name="investmentType"]:checked').value;
    const isChecked = document.getElementById('check-legal-confirm').checked;
    const minRequired = currentProject?.minInvestment || 0;

    let isValid = isChecked;
    if (type !== 'custom') {
        isValid = isChecked && amount >= minRequired;
    } else {
        isValid = isChecked && document.getElementById('customTerms').value.trim().length > 15;
    }
    document.getElementById('submitBtn').disabled = !isValid;
}

async function handleSubmission(e) {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const type = document.querySelector('input[name="investmentType"]:checked').value;
    const amount = parseFloat(document.getElementById('investAmount').value) || 0;
    const token = localStorage.getItem('user_token');

    btn.disabled = true;
    btn.textContent = t('js-messages-sending-text'); // "جاري الإرسال..."

    let payload = {
        projectId: currentProject._id,
        investmentType: type,
        investmentAmount: amount,
        currency: currentProject.fundingGoal.currency,
        equityObtained: (amount / currentProject.fundingGoal.amount) * currentProject.equityOffered
    };

    let endpoint = `${API_BASE_URL}/api/investments`;

    if (type === 'custom') {
        endpoint = `${API_BASE_URL}/api/proposals`;
        const exps = Array.from(document.querySelectorAll('input[name="exp"]:checked')).map(c => c.value);
        payload.proposedTerms = document.getElementById('customTerms').value;
        payload.expertiseAreas = exps;
        payload.partnershipType = 'hybrid';
    } else {
        const payNow = (type === 'reservation') ? amount * 0.30 : amount;
        payload.amountPaidNow = payNow;
        payload.amountRemaining = amount - payNow;
        payload.isReservation = (type === 'reservation');
    }

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });

        if (res.ok) renderSuccessMessage(type);
        else throw new Error();
    } catch (err) {
        alert(t('js-settings-error-save'));
        btn.disabled = false;
        btn.textContent = t('invest-proceed-btn');
    }
}

function renderSuccessMessage(type) {
    const main = document.querySelector('.invest-official-container');
    const msg = type === 'custom'
        ? t('js-public-profile-success-message-sent')
        : t('js-phone-verify-success');

    main.innerHTML = `
        <div style="text-align: center; padding: 60px 0;">
            <i class="fas fa-check-double" style="font-size: 4rem; color: #10b981; margin-bottom: 25px;"></i>
            <h1 style="color: #1E3A8A;">${t('js-investor-profile-proposal-status-accepted')}</h1>
            <p style="color: #475569; max-width: 500px; margin: 0 auto 35px; line-height: 1.8;">${msg}</p>
            <div style="display: flex; gap: 15px; justify-content: center;">
                <a href="investor-portfolio.html" class="btn-official-primary" style="text-decoration:none;">${t('nav-my-investments')}</a>
                <a href="index.html" class="btn-official-secondary" style="text-decoration:none;">${t('nav-home')}</a>
            </div>
        </div>`;
}