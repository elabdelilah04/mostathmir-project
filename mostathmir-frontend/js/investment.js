/**
 * MOSTATHMIR - OFFICIAL INVESTMENT ENGINE (investment.js)
 */

let currentProject = null;

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('user_token');
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('id');

    // 1. التحقق من الصلاحيات والبيانات الأساسية
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    if (!projectId) {
        window.location.href = 'browse-projects.html';
        return;
    }

    // 2. انطلاق المحرك: جلب البيانات وتهيئة الواجهة
    await loadProjectDetails(projectId, token);
    setupEventListeners();
});

/**
 * جلب بيانات المشروع من السيرفر وحقنها في الوثيقة
 */
async function loadProjectDetails(id, token) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch project data');

        currentProject = await response.json();

        if (!currentProject || !currentProject.owner) throw new Error('Incomplete data');

        // دالة مساعدة لتحديث النصوص بأمان
        const setText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        // ملء بيانات القسم الأول (01)
        setText('disp-project-name', currentProject.projectName);
        setText('disp-project-owner', currentProject.owner.fullName);
        setText('disp-total-equity', `${currentProject.equityOffered || 0}%`);

        const currency = currentProject.fundingGoal?.currency || 'USD';
        setText('disp-currency', currency);

        const raised = currentProject.fundingAmountRaised || 0;
        const goal = currentProject.fundingGoal?.amount || 0;
        setText('disp-funding-status', `${raised.toLocaleString()} / ${goal.toLocaleString()} ${currency}`);

        const minLabel = t('js-project-view-min-investment-label') || 'الحد الأدنى';
        setText('min-invest-note', `* ${minLabel}: ${(currentProject.minInvestment || 0).toLocaleString()} ${currency}`);

        // ضبط القيمة الابتدائية للمبلغ
        const investInput = document.getElementById('investAmount');
        if (investInput) {
            investInput.value = currentProject.minInvestment || 0;
            investInput.min = currentProject.minInvestment || 0;
        }

        updateCalculations();

    } catch (err) {
        console.error("Critical Load Error:", err);
        alert(t('js-project-view-error-fetch-failed'));
    }
}

/**
 * المحرك المالي: حساب الملكية، المبالغ المتبقية، والرسوم
 */
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

    // أ. حساب حصة الملكية التناسبية (حسب المبلغ المدخل)
    const userEquity = (amount / goal) * totalOffered;
    const equityDisplay = document.getElementById('calculated-user-equity');
    if (equityDisplay) equityDisplay.textContent = `${userEquity.toFixed(4)}%`;

    // ب. حساب البيانات المالية للفاتورة
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    setText('sum-base-amount', `${amount.toLocaleString()} ${curr}`);

    const platformFee = amount * 0.02; // رسوم المنصة 2%
    setText('sum-platform-fees', `${platformFee.toLocaleString()} ${curr}`);

    const resRow = document.getElementById('row-reservation');
    const remRow = document.getElementById('row-remaining');

    if (type === 'reservation') {
        // حالة الحجز: 30% الآن، 70% لاحقاً
        const payNow = amount * 0.30;
        const remaining = amount - payNow;

        if (resRow) resRow.style.display = 'flex';
        if (remRow) remRow.style.display = 'flex';

        setText('sum-pay-now', `${payNow.toLocaleString()} ${curr}`);
        setText('sum-remaining', `${remaining.toLocaleString()} ${curr}`);
        setText('sum-final-total', `${(payNow + platformFee).toLocaleString()} ${curr}`);
    } else {
        // حالة الاستثمار الكامل
        if (resRow) resRow.style.display = 'none';
        if (remRow) remRow.style.display = 'none';
        setText('sum-final-total', `${(amount + platformFee).toLocaleString()} ${curr}`);
    }

    validateForm();
}

/**
 * تهيئة مستمعي الأحداث لمراقبة التفاعلات
 */
function setupEventListeners() {
    // مراقبة تغيير نوع الاستثمار
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

    // مراقبة القائمة المنسدلة لنوع الشراكة
    const partTypeSelect = document.getElementById('partnershipType');
    if (partTypeSelect) partTypeSelect.addEventListener('change', validateForm);

    // مراقبة المدخلات والتحقق
    const investInput = document.getElementById('investAmount');
    if (investInput) investInput.addEventListener('input', updateCalculations);

    const checkConfirm = document.getElementById('check-legal-confirm');
    if (checkConfirm) checkConfirm.addEventListener('change', validateForm);

    const customTerms = document.getElementById('customTerms');
    if (customTerms) customTerms.addEventListener('input', validateForm);

    // معالجة الإرسال
    const form = document.getElementById('investForm');
    if (form) form.onsubmit = handleFinalSubmission;
}

/**
 * التحقق من استيفاء الشروط قبل تفعيل زر الإرسال
 */
function validateForm() {
    const typeElement = document.querySelector('input[name="investmentType"]:checked');
    const type = typeElement ? typeElement.value : 'full';

    const checkEl = document.getElementById('check-legal-confirm');
    const isChecked = checkEl ? checkEl.checked : false;

    let isValid = false;

    if (type === 'custom') {
        const terms = document.getElementById('customTerms')?.value.trim() || "";
        isValid = isChecked && terms.length >= 15;
    } else {
        const amount = parseFloat(document.getElementById('investAmount')?.value) || 0;
        const minRequired = currentProject?.minInvestment || 0;
        isValid = isChecked && amount >= minRequired && amount > 0;
    }

    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) submitBtn.disabled = !isValid;
}

/**
 * إرسال الطلب النهائي للسيرفر (API)
 */
async function handleFinalSubmission(e) {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const token = localStorage.getItem('user_token');
    const type = document.querySelector('input[name="investmentType"]:checked').value;
    const amount = parseFloat(document.getElementById('investAmount').value) || 0;

    btn.disabled = true;
    btn.textContent = t('js-messages-sending-text') || '...';

    // تجهيز البيانات
    let payload = {
        projectId: currentProject._id,
        investmentType: type,
        investmentAmount: amount,
        currency: currentProject.fundingGoal.currency,
        equityObtained: (amount / currentProject.fundingGoal.amount) * currentProject.equityOffered
    };

    let endpoint = `${API_BASE_URL}/api/investments`;

    // إذا كانت شراكة مخصصة
    if (type === 'custom') {
        endpoint = `${API_BASE_URL}/api/proposals`;
        payload.partnershipType = document.getElementById('partnershipType')?.value || 'hybrid';
        payload.proposedTerms = document.getElementById('customTerms').value;
        payload.expertiseAreas = Array.from(document.querySelectorAll('input[name="exp"]:checked')).map(c => c.value);
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

        if (res.ok) {
            renderSuccessUI(type);
        } else {
            const errData = await res.json();
            throw new Error(errData.message || 'Error processing request');
        }
    } catch (err) {
        alert(err.message);
        btn.disabled = false;
        btn.textContent = t('invest-proceed-btn') || 'تأكيد وإرسال';
    }
}

/**
 * عرض شاشة النجاح الرسمية بعد الإرسال
 */
function renderSuccessUI(type) {
    const main = document.querySelector('.invest-official-container');
    if (main) {
        const successMsg = type === 'custom'
            ? t('js-public-profile-success-message-sent')
            : 'تم اعتماد طلب المساهمة المالية بنجاح في سجلات المشروع.';

        main.innerHTML = `
            <div style="text-align: center; padding: 60px 0; animation: fadeIn 0.8s ease;">
                <i class="fas fa-check-double" style="font-size: 4.5rem; color: #10b981; margin-bottom: 25px;"></i>
                <h1 style="color: #1E3A8A; font-weight: 800;">تم إتمام الإجراء بنجاح</h1>
                <p style="color: #64748b; font-size: 1.1rem; line-height: 1.8; max-width: 550px; margin: 0 auto 40px;">
                    ${successMsg} يمكنك الآن متابعة التطورات عبر محفظتك الاستثمارية.
                </p>
                <div style="display: flex; gap: 20px; justify-content: center; margin-top: 30px;">
                    <a href="investor-portfolio.html" class="btn-official-primary" style="text-decoration:none; padding: 15px 40px;">${t('nav-my-investments')}</a>
                    <a href="index.html" class="btn-official-secondary" style="text-decoration:none; padding: 15px 40px;">${t('nav-home')}</a>
                </div>
            </div>`;
    }
}