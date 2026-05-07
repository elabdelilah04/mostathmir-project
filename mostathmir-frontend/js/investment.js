/**
 * MOSTATHMIR - INVESTMENT LOGIC (investment.js)
 * الإصلاح النهائي لخطأ 401 وخطأ البيانات المفقودة
 */

let currentProject = null;

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('user_token');
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('id');

    // 1. فحص الصلاحيات الأساسية
    if (!token) {
        alert(t('js-portfolio-login-required') || 'يرجى تسجيل الدخول أولاً');
        window.location.href = 'login.html';
        return;
    }

    if (!projectId) {
        window.location.href = 'browse-projects.html';
        return;
    }

    // 2. جلب البيانات (مع إرسال التوكن)
    await loadProjectDetails(projectId, token);

    // 3. تفعيل الأحداث
    setupEventListeners();
});

async function loadProjectDetails(id, token) {
    try {
        // --- الإصلاح: إضافة Authorization Header ---
        const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) throw new Error('انتهت جلسة تسجيل الدخول، يرجى إعادة الدخول.');
            throw new Error('فشل جلب بيانات المشروع.');
        }

        currentProject = await response.json();

        // التحقق من وجود البيانات قبل محاولة حقنها في الصفحة لتجنب الـ TypeError
        if (!currentProject || !currentProject.owner) {
            throw new Error('بيانات المشروع غير مكتملة على السيرفر.');
        }

        // تعبئة البيانات في الواجهة
        document.getElementById('disp-project-name').textContent = currentProject.projectName || '...';
        document.getElementById('disp-project-owner').textContent = currentProject.owner.fullName || '...';
        document.getElementById('disp-total-equity').textContent = `${currentProject.equityOffered || 0}%`;

        const currency = currentProject.fundingGoal?.currency || 'USD';
        document.getElementById('disp-currency').textContent = currency;

        const raised = currentProject.fundingAmountRaised || 0;
        const goal = currentProject.fundingGoal?.amount || 0;
        document.getElementById('disp-funding-status').textContent = `${raised.toLocaleString()} / ${goal.toLocaleString()} ${currency}`;

        const minLabel = t('js-project-view-min-investment-label') || 'الحد الأدنى للمساهمة';
        document.getElementById('min-invest-note').textContent = `* ${minLabel}: ${(currentProject.minInvestment || 0).toLocaleString()} ${currency}`;

        document.getElementById('investAmount').value = currentProject.minInvestment || 0;

        updateCalculations();

    } catch (err) {
        console.error("Fetch Error:", err);
        alert(err.message);
        // window.location.href = 'browse-projects.html'; 
    }
}

function updateCalculations() {
    if (!currentProject || !currentProject.fundingGoal) return;

    const typeElement = document.querySelector('input[name="investmentType"]:checked');
    if (!typeElement) return;

    const type = typeElement.value;
    const amount = parseFloat(document.getElementById('investAmount').value) || 0;
    const goal = currentProject.fundingGoal.amount || 1;
    const totalOffered = currentProject.equityOffered || 0;
    const curr = currentProject.fundingGoal.currency || '';

    // حساب الحصة التناسبية
    const userEquity = (amount / goal) * totalOffered;
    const equityDisplay = document.getElementById('calculated-user-equity');
    if (equityDisplay) equityDisplay.textContent = `${userEquity.toFixed(4)}%`;

    // حساب الرسوم
    const platformFee = amount * 0.02;
    document.getElementById('sum-base-amount').textContent = `${amount.toLocaleString()} ${curr}`;
    document.getElementById('sum-platform-fees').textContent = `${platformFee.toLocaleString()} ${curr}`;

    const resRow = document.getElementById('row-reservation');
    const remRow = document.getElementById('row-remaining');

    if (type === 'reservation') {
        const payNow = amount * 0.30;
        const remaining = amount - payNow;
        if (resRow) resRow.style.display = 'flex';
        if (remRow) remRow.style.display = 'flex';
        document.getElementById('sum-pay-now').textContent = `${payNow.toLocaleString()} ${curr}`;
        document.getElementById('sum-remaining').textContent = `${remaining.toLocaleString()} ${curr}`;
        document.getElementById('sum-final-total').textContent = `${(payNow + platformFee).toLocaleString()} ${curr}`;
    } else {
        if (resRow) resRow.style.display = 'none';
        if (remRow) remRow.style.display = 'none';
        document.getElementById('sum-final-total').textContent = `${(amount + platformFee).toLocaleString()} ${curr}`;
    }
    validateForm();
}

function setupEventListeners() {
    document.querySelectorAll('input[name="investmentType"]').forEach(r => {
        r.addEventListener('change', () => {
            const isCustom = r.value === 'custom';
            const amountArea = document.getElementById('financialInputArea'); // تأكد من الـ ID في الـ HTML
            const customArea = document.getElementById('customPartnershipArea');
            const summaryArea = document.getElementById('financialSummarySection');

            if (amountArea) amountArea.className = isCustom ? 'hidden' : '';
            if (customArea) customArea.className = isCustom ? '' : 'hidden';
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
    const amount = parseFloat(document.getElementById('investAmount').value) || 0;
    const typeElement = document.querySelector('input[name="investmentType"]:checked');
    const type = typeElement ? typeElement.value : 'full';
    const isChecked = document.getElementById('check-legal-confirm').checked;
    const minRequired = currentProject?.minInvestment || 0;

    let isValid = isChecked;
    if (type !== 'custom') {
        isValid = isChecked && amount >= minRequired && amount > 0;
    } else {
        const terms = document.getElementById('customTerms').value.trim();
        isValid = isChecked && terms.length > 15;
    }
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) submitBtn.disabled = !isValid;
}

async function handleSubmission(e) {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const type = document.querySelector('input[name="investmentType"]:checked').value;
    const amount = parseFloat(document.getElementById('investAmount').value) || 0;
    const token = localStorage.getItem('user_token');

    btn.disabled = true;
    btn.textContent = t('js-messages-sending-text') || 'جاري الإرسال...';

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
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) renderSuccess();
        else {
            const errData = await res.json();
            throw new Error(errData.message || 'فشل تسجيل الطلب');
        }
    } catch (err) {
        alert(err.message);
        btn.disabled = false;
        btn.textContent = t('invest-proceed-btn') || 'تأكيد وإرسال الطلب';
    }
}

function renderSuccess() {
    const container = document.querySelector('.invest-official-container');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 0;">
                <i class="fas fa-check-double" style="font-size: 4rem; color: #10b981; margin-bottom: 25px;"></i>
                <h1 style="color: #1E3A8A;">تم إتمام الإجراء بنجاح</h1>
                <p style="color: #64748b; line-height: 1.8;">تم تسجيل طلبك في النظام بنجاح. يمكنك المتابعة من محفظتك الاستثمارية.</p>
                <div style="display: flex; gap: 20px; justify-content: center; margin-top: 30px;">
                    <a href="investor-portfolio.html" class="btn-official-primary" style="text-decoration:none; padding: 15px 40px;">${t('nav-my-investments')}</a>
                    <a href="index.html" class="btn-official-secondary" style="text-decoration:none; padding: 15px 40px;">${t('nav-home')}</a>
                </div>
            </div>`;
    }
}