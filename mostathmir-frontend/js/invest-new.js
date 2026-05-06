// js/invest-new.js
let projectData = null;

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('id');
    if (!projectId) return window.location.href = 'browse-projects.html';

    await loadProject(projectId);
    setupEventListeners();
});

async function loadProject(id) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/projects/${id}`);
        projectData = await res.json();

        document.getElementById('projectName').textContent = projectData.projectName;
        document.getElementById('projectOwner').textContent = projectData.owner.fullName;
        document.getElementById('docCurrency').textContent = projectData.fundingGoal.currency;

        const raised = projectData.fundingAmountRaised || 0;
        const goal = projectData.fundingGoal.amount;
        document.getElementById('currentRaised').textContent = `${raised.toLocaleString()} / ${goal.toLocaleString()} ${projectData.fundingGoal.currency}`;

        document.getElementById('minInvestHint').textContent = `الحد الأدنى للمساهمة: ${projectData.minInvestment} ${projectData.fundingGoal.currency}`;
    } catch (err) {
        console.error("Error loading project", err);
    }
}

function updateView() {
    const type = document.querySelector('input[name="investType"]:checked').value;
    const amountArea = document.getElementById('amountInputArea');
    const customArea = document.getElementById('customPartnershipArea');
    const resRow = document.getElementById('reservationFeeRow');

    if (type === 'custom') {
        amountArea.style.display = 'none';
        customArea.style.display = 'block';
    } else {
        amountArea.style.display = 'block';
        customArea.style.display = 'none';
        resRow.style.display = (type === 'reservation') ? 'flex' : 'none';
    }
    calculateTotals();
}

function calculateTotals() {
    const type = document.querySelector('input[name="investType"]:checked').value;
    const amount = parseFloat(document.getElementById('investmentAmount').value) || 0;
    const currency = projectData?.fundingGoal?.currency || '';

    let platformFee = amount * 0.02; // 2% رسوم
    let total = amount + platformFee;

    document.getElementById('sumAmount').textContent = `${amount.toLocaleString()} ${currency}`;
    document.getElementById('platformFees').textContent = `${platformFee.toLocaleString()} ${currency}`;

    if (type === 'reservation') {
        const resAmount = amount * 0.30;
        document.getElementById('resAmount').textContent = `${resAmount.toLocaleString()} ${currency}`;
        document.getElementById('totalDue').textContent = `${(resAmount + platformFee).toLocaleString()} ${currency}`;
    } else {
        document.getElementById('totalDue').textContent = `${total.toLocaleString()} ${currency}`;
    }
    checkValidation();
}

function setupEventListeners() {
    document.getElementById('investmentAmount').addEventListener('input', calculateTotals);
    document.querySelectorAll('input[type="checkbox"]').forEach(i => i.addEventListener('change', checkValidation));
}

function checkValidation() {
    const amount = parseFloat(document.getElementById('investmentAmount').value) || 0;
    const type = document.querySelector('input[name="investType"]:checked').value;
    const legals = document.getElementById('legal1').checked && document.getElementById('legal2').checked;

    let isValid = legals;
    if (type !== 'custom') {
        isValid = legals && amount >= (projectData?.minInvestment || 0);
    } else {
        isValid = legals && document.getElementById('proposedTerms').value.length > 10;
    }

    document.getElementById('btnSubmitRequest').disabled = !isValid;
}