/**
 * MOSTATHMIR - OFFICIAL INVESTMENT ENGINE (investment.js)
 * النسخة النهائية المعتمدة: إدارة استثمار، حساب ملكية تناسبية، وتقييد الحدود المالية.
 */

let currentProject = null;

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('user_token');
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('id');

    // 1. التحقق من الصلاحيات
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    if (!projectId) {
        window.location.href = 'browse-projects.html';
        return;
    }

    // 2. تحميل البيانات وتهيئة المحرك
    await loadProjectDetails(projectId, token);
    setupEventListeners();
});

/**
 * جلب بيانات المشروع وحساب الحدود المالية المتاحة
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

        if (!currentProject || !currentProject.owner) throw new Error('Data incomplete');

        const safeSetText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        // أ. استخراج البيانات المالية الأساسية
        const raised = currentProject.fundingAmountRaised || 0;
        const goal = currentProject.fundingGoal?.amount || 0;
        const currency = currentProject.fundingGoal?.currency || 'USD';

        // ب. حساب المبلغ المتبقي المتاح للاستثمار (الحد الأقصى)
        const remainingAvailable = Math.max(0, goal - raised);

        // ج. حقن البيانات في القسم الأول (01)
        safeSetText('disp-project-name', currentProject.projectName);
        safeSetText('disp-project-owner', currentProject.owner.fullName);
        safeSetText('disp-total-equity', `${currentProject.equityOffered || 0}%`);
        safeSetText('disp-currency', currency);
        safeSetText('disp-funding-status', `${raised.toLocaleString()} / ${goal.toLocaleString()} ${currency}`);

        // د. تحديث ملاحظات الحدود (الحد الأدنى والحد الأقصى)
        const minLabel = t('js-project-view-min-investment-label') || 'الحد الأدنى';
        safeSetText('min-invest-note', `* ${minLabel}: ${(currentProject.minInvestment || 0).toLocaleString()} ${currency}`);

        // ملاحظة الحد الأقصى (تأكد من وجود ID: max-invest-note في الـ HTML)
        safeSetText('max-invest-note', `* الحد الأقصى المتاح حالياً: ${remainingAvailable.toLocaleString()} ${currency}`);

        // هـ. ضبط خصائص حقل الإدخال
        const investInput = document.getElementById('investAmount');
        if (investInput) {
            const minRequired = currentProject.minInvestment || 0;
            investInput.min = minRequired;
            investInput.max = remainingAvailable;

            // تعيين القيمة الابتدائية: الحد الأدنى بشرط ألا يتجاوز المتاح
            investInput.value = Math.min(minRequired, remainingAvailable);

            // إذا كان التمويل مكتملاً
            if (remainingAvailable <= 0) {
                investInput.value = 0;
                investInput.disabled = true;
                safeSetText('max-invest-note', 'اكتمل الهدف التمويلي لهذا المشروع.');
            }
        }

        updateCalculations();

    } catch (err) {
        console.error("Critical Load Error:", err);
        alert(t('js-project-view-error-fetch-failed'));
    }
}

/**
 * المحرك المالي: حساب الملكية المقدرة والرسوم والمتبقي
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

    // 1. حساب حصة الملكية التناسبية بدقة 4 خانات
    const userEquity = (amount / goal) * totalOffered;
    const equityDisplay = document.getElementById('calculated-user-equity');
    if (equityDisplay) equityDisplay.textContent = `${userEquity.toFixed(4)}%`;

    // 2. تحديث جدول الخلاصة المالية
    const safeSetText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    safeSetText('sum-base-amount', `${amount.toLocaleString()} ${curr}`);

    const platformFee = amount * 0.02; // رسوم المنصة 2%
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

/**
 * مراقبة كافة التفاعلات والمدخلات
 */
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

    const partTypeSelect = document.getElementById('partnershipType');
    if (partTypeSelect) partTypeSelect.addEventListener('change', validateForm);

    const investInput = document.getElementById('investAmount');
    if (investInput) investInput.addEventListener('input', updateCalculations);

    const checkConfirm = document.getElementById('check-legal-confirm');
    if (checkConfirm) checkConfirm.addEventListener('change', validateForm);

    const customTerms = document.getElementById('customTerms');
    if (customTerms) customTerms.addEventListener('input', validateForm);

    const form = document.getElementById('investForm');
    if (form) form.onsubmit = handleFinalSubmission;
}

/**
 * التحقق من صحة البيانات (الحد الأدنى والحد الأقصى المتاح)
 */
function validateForm() {
    const typeElement = document.querySelector('input[name="investmentType"]:checked');
    const type = typeElement ? typeElement.value : 'full';
    const checkEl = document.getElementById('check-legal-confirm');
    const isChecked = checkEl ? checkEl.checked : false;
    const amountInput = document.getElementById('investAmount');
    const amount = amountInput ? parseFloat(amountInput.value) || 0 : 0;

    let isValid = false;

    if (type === 'custom') {
        const terms = document.getElementById('customTerms')?.value.trim() || "";
        isValid = isChecked && terms.length >= 15;
    } else {
        const minRequired = currentProject?.minInvestment || 0;
        const goal = currentProject?.fundingGoal?.amount || 0;
        const raised = currentProject?.fundingAmountRaised || 0;
        const maxAvailable = goal - raised;

        // التحقق من أن المبلغ يقع في النطاق المسموح به
        isValid = isChecked && amount >= minRequired && amount <= maxAvailable && amount > 0;

        // تنبيه بصري في حال تجاوز الحد
        if (amountInput) {
            if (amount > maxAvailable || (amount > 0 && amount < minRequired)) {
                amountInput.style.borderColor = "#ef4444";
            } else {
                amountInput.style.borderColor = "#cbd5e1";
            }
        }
    }

    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) submitBtn.disabled = !isValid;
}

/**
 * إرسال البيانات النهائية للسيرفر
 */
async function handleFinalSubmission(e) {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const token = localStorage.getItem('user_token');
    const type = document.querySelector('input[name="investmentType"]:checked').value;
    const amount = parseFloat(document.getElementById('investAmount').value) || 0;

    btn.disabled = true;
    btn.textContent = t('js-messages-sending-text') || '...';

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

        if (res.ok) renderSuccessUI(type);
        else {
            const errData = await res.json();
            throw new Error(errData.message || 'Error');
        }
    } catch (err) {
        alert(err.message);
        btn.disabled = false;
        btn.textContent = t('invest-proceed-btn') || 'تأكيد وإرسال';
    }
}

/**
 * واجهة النجاح الرسمية
 */
function renderSuccessUI(type) {
    const main = document.querySelector('.invest-official-container');
    if (main) {
        const successMsg = type === 'custom'
            ? t('js-public-profile-success-message-sent')
            : 'تم اعتماد مساهمتكم المالية بنجاح في سجلات المشروع.';

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