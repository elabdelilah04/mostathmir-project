/**
 * MOSTATHMIR - INVESTMENT LOGIC (investment.js)
 * النسخة الاحترافية المحدثة
 */

let currentProject = null;

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('user_token');
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('id');

    // 1. فحص الصلاحيات
    if (!token) {
        alert(t('js-portfolio-login-required'));
        window.location.href = 'login.html';
        return;
    }

    if (!projectId) {
        window.location.href = 'browse-projects.html';
        return;
    }

    // 2. جلب البيانات
    await loadProjectDetails(projectId);

    // 3. تفعيل الأحداث
    setupEventListeners();
});

async function loadProjectDetails(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/projects/${id}`);
        currentProject = await response.json();

        // تعبئة البيانات
        document.getElementById('disp-project-name').textContent = currentProject.projectName;
        document.getElementById('disp-project-owner').textContent = currentProject.owner.fullName;
        document.getElementById('disp-total-equity').textContent = `${currentProject.equityOffered}%`;

        const currency = currentProject.fundingGoal.currency;
        document.getElementById('disp-currency').textContent = currency;

        const raised = currentProject.fundingAmountRaised || 0;
        const goal = currentProject.fundingGoal.amount;
        document.getElementById('disp-funding-status').textContent = `${raised.toLocaleString()} / ${goal.toLocaleString()} ${currency}`;

        document.getElementById('min-invest-note').textContent = `* ${t('js-project-view-min-investment-label')}: ${currentProject.minInvestment.toLocaleString()} ${currency}`;

        document.getElementById('investAmount').value = currentProject.minInvestment;
        updateCalculations();

    } catch (err) {
        console.error("Fetch Error:", err);
    }
}

function updateCalculations() {
    if (!currentProject) return;

    const type = document.querySelector('input[name="investmentType"]:checked').value;
    const amount = parseFloat(document.getElementById('investAmount').value) || 0;
    const goal = currentProject.fundingGoal.amount || 1;
    const totalOffered = currentProject.equityOffered || 0;
    const curr = currentProject.fundingGoal.currency;

    // حساب الحصة التناسبية
    const userEquity = (amount / goal) * totalOffered;
    document.getElementById('calculated-user-equity').textContent = `${userEquity.toFixed(4)}%`;

    // حساب الرسوم
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

function setupEventListeners() {
    document.querySelectorAll('input[name="investmentType"]').forEach(r => {
        r.addEventListener('change', () => {
            const isCustom = r.value === 'custom';
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
    btn.textContent = t('js-messages-sending-text');

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

        if (res.ok) renderSuccess();
        else throw new Error();
    } catch (err) {
        alert(t('js-settings-error-save'));
        btn.disabled = false;
        btn.textContent = t('invest-proceed-btn');
    }
}

function renderSuccess() {
    document.querySelector('.invest-official-container').innerHTML = `
        <div style="text-align: center; padding: 60px 0;">
            <i class="fas fa-check-double" style="font-size: 4rem; color: #10b981; margin-bottom: 25px;"></i>
            <h1 style="color: #1E3A8A;">تم إتمام الإجراء بنجاح</h1>
            <p style="color: #64748b; line-height: 1.8;">تم تسجيل طلبك في النظام. يمكنك المتابعة من محفظتك الاستثمارية.</p>
            <div style="display: flex; gap: 20px; justify-content: center; margin-top: 30px;">
                <a href="investor-portfolio.html" class="btn-official-primary" style="text-decoration:none; padding: 15px 40px;">${t('nav-my-investments')}</a>
                <a href="index.html" class="btn-official-secondary" style="text-decoration:none; padding: 15px 40px;">${t('nav-home')}</a>
            </div>
        </div>`;
}