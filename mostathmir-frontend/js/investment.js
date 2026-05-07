/**
 * MOSTATHMIR - INVESTMENT LOGIC (investment.js)
 * النسخة المصلحة والمحمية من أخطاء الـ Null
 */

let currentProject = null;

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('user_token');
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('id');

    if (!token) { window.location.href = 'login.html'; return; }
    if (!projectId) { window.location.href = 'browse-projects.html'; return; }

    await loadProjectDetails(projectId, token);
    setupEventListeners();
});

async function loadProjectDetails(id, token) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('فشل جلب بيانات المشروع.');

        currentProject = await response.json();

        if (!currentProject || !currentProject.owner) throw new Error('بيانات المشروع غير مكتملة.');

        // تحديث النصوص مع التأكد من وجود العناصر
        const safeSetText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        safeSetText('disp-project-name', currentProject.projectName);
        safeSetText('disp-project-owner', currentProject.owner.fullName);
        safeSetText('disp-total-equity', `${currentProject.equityOffered || 0}%`);

        const currency = currentProject.fundingGoal?.currency || 'USD';
        safeSetText('disp-currency', currency);

        const raised = currentProject.fundingAmountRaised || 0;
        const goal = currentProject.fundingGoal?.amount || 0;
        safeSetText('disp-funding-status', `${raised.toLocaleString()} / ${goal.toLocaleString()} ${currency}`);

        const minLabel = t('js-project-view-min-investment-label') || 'الحد الأدنى';
        safeSetText('min-invest-note', `* ${minLabel}: ${(currentProject.minInvestment || 0).toLocaleString()} ${currency}`);

        const investInput = document.getElementById('investAmount');
        if (investInput) {
            investInput.value = currentProject.minInvestment || 0;
            investInput.min = currentProject.minInvestment || 0;
        }

        updateCalculations();

    } catch (err) {
        console.error("Fetch Error:", err);
        alert(err.message);
    }
}

function updateCalculations() {
    if (!currentProject || !currentProject.fundingGoal) return;

    const typeElement = document.querySelector('input[name="investmentType"]:checked');
    const amountInput = document.getElementById('investAmount');
    if (!typeElement || !amountInput) return;

    const type = typeElement.value;
    const amount = parseFloat(amountInput.value) || 0;
    const goal = currentProject.fundingGoal.amount || 1;
    const totalOffered = currentProject.equityOffered || 0;
    const curr = currentProject.fundingGoal.currency || '';

    // حساب الحصة
    const userEquity = (amount / goal) * totalOffered;
    const safeSetText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    safeSetText('calculated-user-equity', `${userEquity.toFixed(4)}%`);
    safeSetText('sum-base-amount', `${amount.toLocaleString()} ${curr}`);

    const platformFee = amount * 0.02;
    safeSetText('sum-platform-fees', `${platformFee.toLocaleString()} ${curr}`);

    const resRow = document.getElementById('row-reservation');
    const remRow = document.getElementById('row-remaining');

    if (type === 'reservation') {
        const payNow = amount * 0.30;
        const remaining = amount - payNow;
        if (resRow) resRow.style.display = 'flex';
        if (remRow) remRow.style.display = 'flex';
        safeSetText('sum-pay-now', `${payNow.toLocaleString()} ${curr}`);
        safeSetText('sum-remaining', `${remaining.toLocaleString()} ${curr}`);
        safeSetText('sum-final-total', `${(payNow + platformFee).toLocaleString()} ${curr}`);
    } else {
        if (resRow) resRow.style.display = 'none';
        if (remRow) remRow.style.display = 'none';
        safeSetText('sum-final-total', `${(amount + platformFee).toLocaleString()} ${curr}`);
    }
    validateForm();
}

function setupEventListeners() {
    document.querySelectorAll('input[name="investmentType"]').forEach(r => {
        r.addEventListener('change', () => {
            const isCustom = r.value === 'custom';
            const amountArea = document.getElementById('financialInputArea');
            const customArea = document.getElementById('customPartnershipArea');
            const summaryArea = document.getElementById('financialSummarySection');

            if (amountArea) amountArea.classList.toggle('hidden', isCustom);
            if (customArea) customArea.classList.toggle('hidden', !isCustom);
            if (summaryArea) summaryArea.style.display = isCustom ? 'none' : 'block';
            updateCalculations();
        });
    });

    const investInput = document.getElementById('investAmount');
    if (investInput) investInput.addEventListener('input', updateCalculations);

    const checkConfirm = document.getElementById('check-legal-confirm');
    if (checkConfirm) checkConfirm.addEventListener('change', validateForm);

    const customTerms = document.getElementById('customTerms');
    if (customTerms) customTerms.addEventListener('input', validateForm);

    const form = document.getElementById('investForm');
    if (form) form.onsubmit = handleSubmission;
}

function validateForm() {
    const amountInput = document.getElementById('investAmount');
    const amount = amountInput ? parseFloat(amountInput.value) || 0 : 0;
    const typeElement = document.querySelector('input[name="investmentType"]:checked');
    const type = typeElement ? typeElement.value : 'full';
    const checkEl = document.getElementById('check-legal-confirm');
    const isChecked = checkEl ? checkEl.checked : false;
    const minRequired = currentProject?.minInvestment || 0;

    let isValid = isChecked;
    if (type !== 'custom') {
        isValid = isChecked && amount >= minRequired && amount > 0;
    } else {
        const termsEl = document.getElementById('customTerms');
        const terms = termsEl ? termsEl.value.trim() : "";
        isValid = isChecked && terms.length > 15;
    }
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) submitBtn.disabled = !isValid;
}

async function handleSubmission(e) {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const token = localStorage.getItem('user_token');
    const type = document.querySelector('input[name="investmentType"]:checked').value;
    const amount = parseFloat(document.getElementById('investAmount').value) || 0;

    btn.disabled = true;
    btn.textContent = t('js-messages-sending-text') || '...';

    let endpoint = `${API_BASE_URL}/api/investments`;
    let payload = {
        projectId: currentProject._id,
        investmentType: type,
        investmentAmount: amount,
        currency: currentProject.fundingGoal.currency,
        equityObtained: (amount / currentProject.fundingGoal.amount) * currentProject.equityOffered
    };

    if (type === 'custom') {
        endpoint = `${API_BASE_URL}/api/proposals`;
        payload.proposedTerms = document.getElementById('customTerms').value;
        payload.expertiseAreas = Array.from(document.querySelectorAll('input[name="exp"]:checked')).map(c => c.value);
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

        if (res.ok) renderSuccessUI(type);
        else throw new Error('فشل تسجيل الطلب');
    } catch (err) {
        alert(err.message);
        btn.disabled = false;
        btn.textContent = t('invest-proceed-btn') || 'تأكيد وإرسال';
    }
}

function renderSuccessUI(type) {
    const container = document.querySelector('.invest-official-container');
    if (container) {
        const successMsg = type === 'custom' ? t('js-public-profile-success-message-sent') : 'تم تسجيل مساهمتكم بنجاح.';
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 0;">
                <i class="fas fa-check-double" style="font-size: 4rem; color: #10b981; margin-bottom: 25px;"></i>
                <h1 style="color: #1E3A8A;">تم إعتماد الطلب</h1>
                <p style="color: #64748b; line-height: 1.8;">${successMsg}</p>
                <div style="display: flex; gap: 20px; justify-content: center; margin-top: 30px;">
                    <a href="investor-portfolio.html" class="btn-official-primary" style="text-decoration:none;">${t('nav-my-investments')}</a>
                    <a href="index.html" class="btn-official-secondary" style="text-decoration:none;">الرئيسية</a>
                </div>
            </div>`;
    }
}