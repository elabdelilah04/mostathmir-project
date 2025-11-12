const API_BASE_URL = 'https://mostathmir-api.onrender.com';
let currentProject = null;
let selectedInvestmentType = 'full';
const EXPECTED_RETURN_RATE = 0.15;
let currentTargetAmount = 150000;
let currentAmountRaised = 90000;
let currentInvestorsCount = 23;
let currentMinInvestment = 1000;
let currentMaxInvestment = 60000;

function getAvatarColor(initial) {
    const colors = ['bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600', 'bg-red-600', 'bg-indigo-600'];
    const charCode = initial.charCodeAt(0);
    return colors[charCode % colors.length];
}

async function fetchProjectData() {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('id');
    const token = localStorage.getItem('user_token');

    if (!projectId) {
        document.body.innerHTML = "<h1 class='text-center text-red-600 mt-20'>خطأ: المشروع غير محدد.</h1>";
        return;
    }

    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, { headers });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'فشل جلب بيانات المشروع.');
        }

        const project = await response.json();
        currentProject = project;

        currentTargetAmount = project.fundingGoal?.amount || 0;
        currentAmountRaised = project.fundingAmountRaised || 0;
        currentInvestorsCount = project.followers?.length || 0;
        currentMinInvestment = project.minInvestment || 1000;

        const remainingAmount = currentTargetAmount - currentAmountRaised;
        currentMaxInvestment = remainingAmount > 0 ? remainingAmount : 0;

        populateInvestmentPage(project);
        updateCalculations();

        const fullInvestmentCard = document.querySelector('.investment-type-card[onclick="selectInvestmentType(\'full\')"]');
        if (fullInvestmentCard) {
            fullInvestmentCard.click();
        }

    } catch (error) {
        console.error("Error fetching project data:", error);
        document.body.innerHTML = `<h1 class='text-center text-red-600 mt-20'>${error.message}</h1>`;
    }
}

function populateInvestmentPage(project) {
    const ownerId = project.owner?._id || 'default';
    const ownerName = project.owner?.fullName || 'رائد أعمال';
    const ownerInitial = ownerName.charAt(0);
    const ownerAvatarColor = getAvatarColor(ownerInitial);
    const ownerTitle = project.owner?.profileTitle || 'رائد أعمال';
    const currency = project.fundingGoal?.currency || 'USD';

    document.getElementById('projectSummaryName').textContent = project.projectName || 'مشروع بدون عنوان';
    document.getElementById('projectSummaryDescription').textContent = project.projectDescription || '';

    document.querySelector('.w-20.h-20').textContent = project.projectName.charAt(0) || 'P';
    document.querySelector('.w-8.h-8').textContent = ownerInitial;
    document.querySelector('.w-8.h-8').className = `w-8 h-8 ${ownerAvatarColor} rounded-full flex items-center justify-center text-white text-sm font-bold`;

    const ownerLinkEl = document.getElementById('projectSummaryOwner');
    if (ownerLinkEl) {
        ownerLinkEl.innerHTML = `<a href="./public-profile.html?id=${ownerId}" class="hover:underline">${ownerName}</a> - ${ownerTitle}`;
    }

    document.getElementById('currentAmount').textContent = currentAmountRaised.toLocaleString();
    document.getElementById('targetGoalAmount').textContent = currentTargetAmount.toLocaleString();
    document.getElementById('investorCount').textContent = currentInvestorsCount;

    document.querySelectorAll('.text-xs.text-gray-600').forEach(el => {
        if (el.textContent.includes('درهم') || el.textContent.includes('USD')) {
            el.textContent = el.textContent.replace('درهم', currency).replace('USD', currency);
        }
    });

    document.getElementById('expectedReturn').textContent = (currentTargetAmount * EXPECTED_RETURN_RATE).toLocaleString() + ` ${currency}`;
    document.getElementById('finalReturn').textContent = (currentTargetAmount * EXPECTED_RETURN_RATE).toLocaleString() + ` ${currency}`;


    const investmentAmountInput = document.getElementById('investmentAmount');
    if (investmentAmountInput) {
        investmentAmountInput.min = currentMinInvestment;
        investmentAmountInput.max = currentMaxInvestment;
        investmentAmountInput.value = Math.max(parseInt(investmentAmountInput.value) || 0, currentMinInvestment);
    }

    const amountSectionInfo = document.querySelector('#investmentAmountSection .mt-2.text-sm.text-gray-600');
    if (amountSectionInfo) {
        amountSectionInfo.textContent = `الحد الأدنى: ${currentMinInvestment.toLocaleString()} ${currency} • الحد الأقصى: ${currentMaxInvestment.toLocaleString()} ${currency}`;
    }

    const quickAmountContainer = document.querySelector('.grid.grid-cols-4.gap-3');
    if (quickAmountContainer) {
        const min = currentMinInvestment;
        const quickAmounts = [];
        if (min > 0 && min < 5000) {
            quickAmounts.push(5000);
            quickAmounts.push(10000);
            quickAmounts.push(25000);
        } else if (min > 0) {
            quickAmounts.push(min);
            quickAmounts.push(min * 2);
            quickAmounts.push(Math.round(currentTargetAmount * 0.1));
        }

        const uniqueQuickAmounts = [...new Set(quickAmounts.filter(a => a < currentTargetAmount && a > 0))].sort((a, b) => a - b).slice(0, 4);

        quickAmountContainer.innerHTML = uniqueQuickAmounts.map(amount =>
            `<button onclick="setAmount(${amount})" class="secondary-button py-3 text-sm">${amount.toLocaleString()}</button>`
        ).join('');
    }
}

async function handleInvestmentSubmission(type) {
    const amountInput = document.getElementById('investmentAmount');
    const amount = parseInt(amountInput.value) || 0;

    if (!currentProject || !currentProject._id) throw new Error("بيانات المشروع غير متوفرة.");
    if (type !== 'custom' && amount < currentMinInvestment) throw new Error(`الحد الأدنى للاستثمار هو ${currentMinInvestment.toLocaleString()} ${currentProject.fundingGoal?.currency || 'USD'}`);

    const token = localStorage.getItem('user_token');
    if (!token) throw new Error("يرجى تسجيل الدخول كـ مستثمر.");

    let investmentData = {
        projectId: currentProject._id,
        investmentType: type,
        investmentAmount: amount,
        currency: currentProject.fundingGoal?.currency || 'USD',
    };

    if (type === 'custom') {
        const proposedTerms = document.getElementById('proposedTerms').value.trim();
        const partnershipType = document.querySelector('input[name="partnershipType"]:checked')?.value || 'unspecified';
        const contactMethod = document.querySelector('input[name="contactMethod"]:checked')?.value || 'platform';

        const expertiseCheckboxes = document.querySelectorAll('#customPartnershipForm input[type="checkbox"]:checked');
        const expertiseAreas = Array.from(expertiseCheckboxes).map(cb => {
            const nextSibling = cb.nextElementSibling;
            return nextSibling ? nextSibling.textContent.trim() : 'غير محدد';
        });

        if (!proposedTerms) throw new Error("الرجاء كتابة تفاصيل اقتراح الشراكة.");

        investmentData = {
            ...investmentData,
            proposedTerms: proposedTerms,
            partnershipType: partnershipType,
            contactMethod: contactMethod,
            expertiseAreas: expertiseAreas,
        };
    } else if (type === 'reservation' || type === 'full') {
        const reservationAmount = Math.round(amount * 0.3);
        const amountPaid = type === 'full' ? amount : reservationAmount;
        const amountRemaining = type === 'full' ? 0 : amount - reservationAmount;

        investmentData = {
            ...investmentData,
            amountPaidNow: amountPaid,
            amountRemaining: amountRemaining,
            isReservation: type === 'reservation'
        };
    }

    const apiEndpoint = API_BASE_URL + (type === 'custom' ? '/api/proposals' : '/api/investments');

    const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(investmentData)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'فشل إرسال البيانات إلى الخادم.' }));
        throw new Error(errorData.message || 'حدث خطأ أثناء الاتصال بالخادم.');
    }

    return await response.json();
}

function updateCalculations() {
    const amountInput = document.getElementById('investmentAmount');
    if (!amountInput) return;

    const amount = parseInt(amountInput.value) || 0;

    if (selectedInvestmentType === 'full') {
        updateFullInvestmentCalculations(amount);
    } else if (selectedInvestmentType === 'reservation') {
        updateReservationCalculations(amount);
    }

    const ownershipPercentage = ((amount / currentTargetAmount) * 100).toFixed(1);
    const expectedReturnAmount = Math.round(amount * EXPECTED_RETURN_RATE);
    const currency = currentProject?.fundingGoal?.currency || 'USD';

    if (document.getElementById('ownershipPercentage')) {
        document.getElementById('ownershipPercentage').textContent = ownershipPercentage + '%';
    }
    if (document.getElementById('expectedReturn')) {
        document.getElementById('expectedReturn').textContent = expectedReturnAmount.toLocaleString() + ` ${currency}`;
    }
    if (document.getElementById('finalOwnership')) {
        document.getElementById('finalOwnership').textContent = ownershipPercentage + '%';
    }
    if (document.getElementById('finalReturn')) {
        document.getElementById('finalReturn').textContent = expectedReturnAmount.toLocaleString() + ` ${currency}`;
    }

    updateProjectProgress(amount);
    updateCustomSummary();
    checkFormValidity();
}

function updateProjectProgress(investmentAmount) {
    const currentAmount = currentAmountRaised;
    const targetAmount = currentTargetAmount;
    const currentInvestors = currentInvestorsCount;
    const currency = currentProject?.fundingGoal?.currency || 'USD';

    const newTotalAmount = currentAmount + investmentAmount;
    const newProgress = Math.min((newTotalAmount / targetAmount) * 100, 100);
    const currentProgress = (currentAmount / targetAmount) * 100;
    const additionalProgress = newProgress - currentProgress;

    const currentProgressBar = document.getElementById('currentProgressBar');
    const projectedProgressBar = document.getElementById('projectedProgressBar');
    const currentProgressText = document.getElementById('currentProgressText');
    const projectedAmount = document.getElementById('projectedAmount');
    const projectedPercentage = document.getElementById('projectedPercentage');
    const investorCount = document.getElementById('investorCount');
    const progressMessage = document.getElementById('progressMessage');
    const projectedInfo = document.getElementById('projectedInfo');
    const projectedLegend = document.getElementById('projectedLegend');

    if (!currentProgressBar) return;

    setTimeout(() => {
        currentProgressBar.style.width = currentProgress + '%';

        if (investmentAmount > 0) {
            projectedProgressBar.style.width = additionalProgress + '%';
            projectedProgressBar.style.left = currentProgress + '%';
            projectedProgressBar.style.opacity = '0.8';
        } else {
            projectedProgressBar.style.width = '0%';
            projectedProgressBar.style.opacity = '0';
        }
    }, 100);

    currentProgressText.textContent = currentProgress.toFixed(1) + '% مكتمل';
    projectedAmount.textContent = newTotalAmount.toLocaleString() + ` ${currency}`;
    projectedPercentage.textContent = newProgress.toFixed(1) + '%';
    investorCount.textContent = investmentAmount > 0 ? (currentInvestors + 1) : currentInvestors;

    if (investmentAmount === 0) {
        progressMessage.textContent = `أدخل مبلغ الاستثمار (بـ ${currency}) لرؤية التأثير على تقدم المشروع`;
    } else if (newProgress >= 100) {
        progressMessage.textContent = '🎉 تهانينا! استثمارك سيساعد في إكمال تمويل المشروع بالكامل!';
        progressMessage.className = 'mt-2 text-xs text-green-600 font-medium';
    } else if (additionalProgress >= 10) {
        progressMessage.textContent = '🚀 استثمارك سيحدث تأثيراً كبيراً في تقدم المشروع!';
        progressMessage.className = 'mt-2 text-xs text-blue-600 font-medium';
    } else if (additionalProgress >= 5) {
        progressMessage.textContent = '📈 استثمارك سيساهم بشكل ملحوظ في تقدم المشروع';
        progressMessage.className = 'mt-2 text-xs text-blue-600';
    } else if (investmentAmount > 0) {
        progressMessage.textContent = '💪 كل استثمار يقربنا خطوة من تحقيق الهدف!';
        progressMessage.className = 'mt-2 text-xs text-blue-600';
    }

    if (investmentAmount > 0) {
        projectedInfo.style.display = 'block';
        projectedLegend.style.display = 'flex';
        projectedInfo.classList.add('fade-in');
        setTimeout(() => { projectedInfo.classList.remove('fade-in'); }, 500);
    } else {
        projectedInfo.style.display = 'none';
        projectedLegend.style.display = 'none';
    }

    const isCompleted = newProgress >= 100;
    projectedProgressBar.className = `h-3 rounded-full absolute top-0 transition-all duration-1000 ease-out opacity-70 ${isCompleted ? 'bg-gradient-to-r from-green-400 to-green-600' : 'bg-gradient-to-r from-blue-400 to-purple-400'}`;
}

function updateFullInvestmentCalculations(amount) {
    const currency = currentProject?.fundingGoal?.currency || 'USD';
    const platformFee = Math.round(amount * 0.02);
    const processingFee = 25;
    const total = amount + platformFee + processingFee;

    document.getElementById('summaryAmount').textContent = amount.toLocaleString() + ` ${currency}`;
    document.getElementById('platformFee').textContent = platformFee.toLocaleString() + ` ${currency}`;
    document.getElementById('totalAmount').textContent = total.toLocaleString() + ` ${currency}`;
    document.getElementById('currentPayment').textContent = amount.toLocaleString() + ` ${currency}`;
}

function updateReservationCalculations(amount) {
    const currency = currentProject?.fundingGoal?.currency || 'USD';
    const reservationAmount = Math.round(amount * 0.3);
    const remainingAmount = amount - reservationAmount;
    const reservationPlatformFee = Math.round(reservationAmount * 0.02);
    const reservationProcessingFee = 15;
    const reservationTotal = reservationAmount + reservationPlatformFee + reservationProcessingFee;

    document.getElementById('reservationAmount').textContent = reservationAmount.toLocaleString() + ` ${currency}`;
    document.getElementById('reservationPlatformFee').textContent = reservationPlatformFee.toLocaleString() + ` ${currency}`;
    document.getElementById('reservationTotal').textContent = reservationTotal.toLocaleString() + ` ${currency}`;
    document.getElementById('remainingAmount').textContent = remainingAmount.toLocaleString() + ` ${currency}`;
    document.getElementById('firstPayment').textContent = reservationAmount.toLocaleString() + ` ${currency}`;
    document.getElementById('secondPayment').textContent = remainingAmount.toLocaleString() + ` ${currency}`;
}

function selectInvestmentType(type) {
    selectedInvestmentType = type;

    document.querySelectorAll('.investment-radio').forEach(radio => {
        radio.classList.remove('bg-blue-500', 'border-blue-500');
        radio.classList.add('border-gray-300');
    });

    document.querySelectorAll('.investment-type-card').forEach(card => {
        card.classList.remove('border-blue-500', 'bg-blue-50', 'border-purple-500', 'bg-purple-50');
        card.classList.add('border-gray-200');
    });

    const selectedCard = event.currentTarget;
    selectedCard.classList.remove('border-gray-200');

    const isCustom = type === 'custom';
    const borderColor = isCustom ? 'border-purple-500' : 'border-blue-500';
    const bgColor = isCustom ? 'bg-purple-50' : 'bg-blue-50';

    selectedCard.classList.add(borderColor, bgColor);

    const radio = selectedCard.querySelector('.investment-radio');
    radio.classList.remove('border-gray-300');
    radio.classList.add('bg-blue-500', 'border-blue-500');

    const amountInput = document.getElementById('investmentAmount');
    if (isCustom && amountInput) {
        amountInput.value = 0;
    }

    updateInvestmentTypeUI(type);
    updateCalculations();

    setTimeout(() => {
        checkFormValidity();
    }, 100);
}


function updateInvestmentTypeUI(type) {
    const fullDetails = document.getElementById('fullPaymentDetails');
    const reservationDetails = document.getElementById('reservationPaymentDetails');
    const customForm = document.getElementById('customPartnershipForm');
    const paymentBreakdown = document.getElementById('paymentBreakdown');
    const fullSummary = document.getElementById('fullSummary');
    const reservationSummary = document.getElementById('reservationSummary');
    const customSummary = document.getElementById('customSummary');
    const paymentTitle = document.getElementById('paymentTitle');
    const summaryTitle = document.getElementById('summaryTitle');
    const confirmButton = document.getElementById('confirmButton');
    const investmentAmountSection = document.getElementById('investmentAmountSection');

    fullDetails.classList.add('hidden');
    reservationDetails.classList.add('hidden');
    customForm.classList.add('hidden');
    fullSummary.classList.add('hidden');
    reservationSummary.classList.add('hidden');
    customSummary.classList.add('hidden');

    if (type === 'full') {
        fullDetails.classList.remove('hidden');
        fullSummary.classList.remove('hidden');
        paymentBreakdown.classList.remove('hidden');
        investmentAmountSection.classList.remove('hidden');
        paymentTitle.textContent = 'تفاصيل الدفع الكامل';
        summaryTitle.textContent = 'ملخص الاستثمار الكامل';
        confirmButton.textContent = 'متابعة إلى الدفع الكامل';
    } else if (type === 'reservation') {
        reservationDetails.classList.remove('hidden');
        reservationSummary.classList.remove('hidden');
        paymentBreakdown.classList.remove('hidden');
        investmentAmountSection.classList.remove('hidden');
        paymentTitle.textContent = 'تفاصيل دفع الحجز';
        summaryTitle.textContent = 'ملخص حجز الاستثمار';
        confirmButton.textContent = 'متابعة إلى دفع الحجز';
    } else if (type === 'custom') {
        customForm.classList.remove('hidden');
        customSummary.classList.remove('hidden');
        paymentBreakdown.classList.add('hidden');
        investmentAmountSection.classList.add('hidden');
        summaryTitle.textContent = 'ملخص الشراكة المقترحة';
        confirmButton.textContent = 'إرسال اقتراح الشراكة';

        updatePartnershipSummaryListeners();
        updateCustomSummary();
    }
}


function updatePartnershipSummaryListeners() {
    const partnershipRadios = document.querySelectorAll('input[name="partnershipType"]');
    partnershipRadios.forEach(radio => {
        radio.removeEventListener('change', updateCustomSummary);
        radio.addEventListener('change', updateCustomSummary);
    });
}

function updateCustomSummary() {
    const partnershipTypeSummary = document.getElementById('partnershipTypeSummary');
    const amountInput = document.getElementById('investmentAmount');

    const selectedRadio = document.querySelector('input[name="partnershipType"]:checked');
    const selectedType = selectedRadio ? selectedRadio.value : null;

    const typeNames = {
        'strategic': 'شراكة استراتيجية (مال + خبرة)',
        'expertise': 'مساهمة بالخبرة فقط',
        'advisory': 'مستشار تنفيذي',
        'hybrid': 'شراكة مختلطة (تخصيص)'
    };

    partnershipTypeSummary.textContent = typeNames[selectedType] || 'غير محدد';

    const financialContribution = document.getElementById('financialContribution');
    const currency = currentProject?.fundingGoal?.currency || 'USD';

    if (financialContribution) {
        const amount = parseInt(amountInput?.value) || 0;
        if (amount > 0 && selectedType !== 'expertise') {
            financialContribution.textContent = amount.toLocaleString() + ` ${currency}`;
        } else if (selectedType === 'expertise') {
            financialContribution.textContent = 'لا يوجد مساهمة مالية مباشرة';
        } else {
            financialContribution.textContent = 'حسب التفاوض';
        }
    }
    checkFormValidity();
}


function initializeCheckboxListeners() {
    const checkboxes = document.querySelectorAll('#terms1', '#terms2', '#terms3');
    checkboxes.forEach((checkbox) => {
        checkbox.addEventListener('change', checkFormValidity);
    });
}

function checkFormValidity() {
    const checkboxes = document.querySelectorAll('#terms1', '#terms2', '#terms3');
    const confirmButton = document.getElementById('confirmButton');
    const amountInput = document.getElementById('investmentAmount');

    if (!confirmButton || !amountInput) return;

    const amount = parseInt(amountInput.value) || 0;

    const isCustom = selectedInvestmentType === 'custom';
    const isMinAmountValid = isCustom || amount >= currentMinInvestment;
    const isMaxAmountValid = isCustom || amount <= currentMaxInvestment;

    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    const typeSelected = selectedInvestmentType !== null;

    const isValid = allChecked && typeSelected && isMinAmountValid && isMaxAmountValid;

    confirmButton.disabled = !isValid;

    if (isValid) {
        confirmButton.classList.remove('opacity-50', 'cursor-not-allowed');
        confirmButton.classList.add('hover:shadow-lg');
        confirmButton.style.pointerEvents = 'auto';
    } else {
        confirmButton.classList.add('opacity-50', 'cursor-not-allowed');
        confirmButton.classList.remove('hover:shadow-lg');
        confirmButton.style.pointerEvents = 'none';

        if (!isMinAmountValid && !isCustom) {
            amountInput.style.borderColor = '#ef4444';
        } else if (!isMaxAmountValid && !isCustom) {
            amountInput.style.borderColor = '#ef4444';
        } else {
            amountInput.style.borderColor = '';
        }
    }
}


function setAmount(amount) {
    document.getElementById('investmentAmount').value = amount;
    updateCalculations();

    const buttons = document.querySelectorAll('.secondary-button');
    buttons.forEach(btn => btn.classList.remove('border-blue-500', 'text-blue-600', 'bg-blue-50'));

    const clickedButton = event.target.closest('.secondary-button');
    if (clickedButton) {
        clickedButton.classList.add('border-blue-500', 'text-blue-600', 'bg-blue-50');
    }
}

function getCurrentPaymentAmount() {
    if (selectedInvestmentType === 'reservation') {
        return document.getElementById('reservationTotal')?.textContent || '0 درهم';
    } else if (selectedInvestmentType === 'full') {
        return document.getElementById('totalAmount')?.textContent || '0 درهم';
    } else {
        return 'N/A';
    }
}

function getSuccessTitle() {
    if (selectedInvestmentType === 'reservation') {
        return 'تم تأكيد حجز الاستثمار بنجاح!';
    } else if (selectedInvestmentType === 'custom') {
        return 'تم إرسال اقتراح الشراكة بنجاح!';
    } else {
        return 'تم تأكيد الاستثمار بنجاح!';
    }
}

function getSuccessMessage() {
    const projectName = currentProject?.projectName || 'المشروع';
    if (selectedInvestmentType === 'reservation') {
        return `تهانينا! لقد حجزت مكانك كمستثمر في مشروع "${projectName}". سيتم طلب باقي المبلغ عند اكتمال التمويل أو وصول تاريخ تنفيذ المشروع.`;
    } else if (selectedInvestmentType === 'custom') {
        return `شكراً لك على اهتمامك بالمشروع. تم إرسال اقتراحك إلى صاحب المشروع وسيتم التواصل معك قريباً.`;
    } else {
        return `تهانينا! لقد أصبحت مستثمراً في مشروع "${projectName}" وتم دفع المبلغ كاملاً.`;
    }
}

function goBack() {
    if (confirm('هل أنت متأكد من العودة؟ سيتم فقدان التغييرات غير المحفوظة.')) {
        window.history.back();
    }
}

function showInlineMessage(message, type = 'info') {
    const existingMessage = document.querySelector('.inline-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `inline-message fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm slide-up`;

    if (type === 'error') {
        messageDiv.className += ' bg-red-100 border border-red-300 text-red-800';
    } else if (type === 'success') {
        messageDiv.className += ' bg-green-100 border border-green-300 text-green-800';
    } else {
        messageDiv.className += ' bg-blue-100 border border-blue-300 text-blue-800';
    }

    messageDiv.innerHTML = `
        <div class="flex items-center gap-3">
            <span class="text-lg">${type === 'error' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️'}</span>
            <span class="flex-1">${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="text-gray-500 hover:text-gray-700">×</button>
        </div>
    `;

    document.body.appendChild(messageDiv);

    setTimeout(() => {
        if (messageDiv.parentElement) {
            messageDiv.remove();
        }
    }, 5000);
}

async function handleInvestmentSubmission(type) {
    const amountInput = document.getElementById('investmentAmount');
    const amount = parseInt(amountInput.value) || 0;

    if (!currentProject || !currentProject._id) throw new Error("بيانات المشروع غير متوفرة.");
    if (type !== 'custom' && amount < currentMinInvestment) throw new Error(`الحد الأدنى للاستثمار هو ${currentMinInvestment.toLocaleString()} ${currentProject.fundingGoal?.currency || 'USD'}`);

    const token = localStorage.getItem('user_token');
    if (!token) throw new Error("يرجى تسجيل الدخول كـ مستثمر.");

    let investmentData = {
        projectId: currentProject._id,
        investmentType: type,
        investmentAmount: amount,
        currency: currentProject.fundingGoal?.currency || 'USD',
    };

    if (type === 'custom') {
        const proposedTerms = document.getElementById('proposedTerms').value.trim();
        const partnershipType = document.querySelector('input[name="partnershipType"]:checked')?.value || 'unspecified';
        const contactMethod = document.querySelector('input[name="contactMethod"]:checked')?.value || 'platform';

        const expertiseCheckboxes = document.querySelectorAll('#customPartnershipForm input[type="checkbox"]:checked');
        const expertiseAreas = Array.from(expertiseCheckboxes).map(cb => {
            const nextSibling = cb.nextElementSibling;
            return nextSibling ? nextSibling.textContent.trim() : 'غير محدد';
        });

        if (!proposedTerms) throw new Error("الرجاء كتابة تفاصيل اقتراح الشراكة.");

        investmentData = {
            ...investmentData,
            proposedTerms: proposedTerms,
            partnershipType: partnershipType,
            contactMethod: contactMethod,
            expertiseAreas: expertiseAreas,
        };
    } else if (type === 'reservation' || type === 'full') {
        const reservationAmount = Math.round(amount * 0.3);
        const amountPaid = type === 'full' ? amount : reservationAmount;
        const amountRemaining = type === 'full' ? 0 : amount - reservationAmount;

        investmentData = {
            ...investmentData,
            amountPaidNow: amountPaid,
            amountRemaining: amountRemaining,
            isReservation: type === 'reservation'
        };
    }

    const apiEndpoint = API_BASE_URL + (type === 'custom' ? '/api/proposals' : '/api/investments');

    const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(investmentData)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'فشل إرسال البيانات إلى الخادم.' }));
        throw new Error(errorData.message || 'حدث خطأ أثناء الاتصال بالخادم.');
    }

    return await response.json();
}

function proceedToPayment() {
    if (!selectedInvestmentType) {
        showInlineMessage('يرجى اختيار نوع الاستثمار أولاً', 'error');
        return;
    }

    const checkboxes = document.querySelectorAll('#terms1', '#terms2', '#terms3');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);

    if (!allChecked) {
        showInlineMessage('يرجى الموافقة على جميع الشروط والأحكام', 'error');
        return;
    }

    const button = document.getElementById('confirmButton');
    if (!button) return;

    const originalText = button.textContent;
    button.textContent = 'جاري التحضير...';
    button.disabled = true;

    if (selectedInvestmentType === 'custom') {
        submitPartnershipProposal();
        return;
    }

    setTimeout(() => {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 slide-up">
                <div class="text-center mb-6">
                    <div class="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-slow">
                        <span class="text-3xl text-white">💳</span>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-900 mb-2">تأكيد الدفع</h3>
                    <p class="text-gray-600">اختر طريقة الدفع المفضلة لديك</p>
                </div>
                
                <div class="space-y-4 mb-6">
                    <div class="border-2 border-gray-200 rounded-xl p-4 hover:border-blue-500 transition-colors cursor-pointer" onclick="selectPaymentMethod(this, 'card')">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                                <span class="text-xl">💳</span>
                            </div>
                            <div class="flex-1">
                                <div class="font-semibold text-gray-900">بطاقة ائتمان/خصم</div>
                                <div class="text-sm text-gray-600">Visa, Mastercard, AMEX</div>
                    </div>
                    <div class="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                </div>
            </div>
            
            <div class="border-2 border-gray-200 rounded-xl p-4 hover:border-blue-500 transition-colors cursor-pointer" onclick="selectPaymentMethod(this, 'bank')">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center text-white">
                        <span class="text-xl">🏦</span>
                    </div>
                    <div class="flex-1">
                        <div class="font-semibold text-gray-900">تحويل بنكي</div>
                        <div class="text-sm text-gray-600">من حسابك البنكي مباشرة</div>
                    </div>
                    <div class="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                </div>
            </div>
        </div>
        
        <div class="flex gap-4">
            <button onclick="processPayment()" class="elegant-button flex-1 py-4 font-medium opacity-50 cursor-not-allowed" id="payButton" disabled>
                تأكيد الدفع - ${getCurrentPaymentAmount()}
            </button>
            <button onclick="this.closest('.fixed').remove(); resetConfirmButton();" class="secondary-button px-6 py-4">
                إلغاء
            </button>
        </div>
    </div>
`;
        document.body.appendChild(modal);

        resetConfirmButton();
    }, 500);
}

function selectPaymentMethod(element, method) {
    document.querySelectorAll('.border-blue-500').forEach(el => {
        el.classList.remove('border-blue-500', 'bg-blue-50');
        el.classList.add('border-gray-200');
        const radio = el.querySelector('.rounded-full');
        radio.classList.remove('bg-blue-500', 'border-blue-500');
        radio.classList.add('border-gray-300');
    });

    element.classList.remove('border-gray-200');
    element.classList.add('border-blue-500', 'bg-blue-50');
    const radio = element.querySelector('.rounded-full');
    radio.classList.remove('border-gray-300');
    radio.classList.add('bg-blue-500', 'border-blue-500');

    const payButton = document.getElementById('payButton');
    payButton.disabled = false;
    payButton.classList.remove('opacity-50', 'cursor-not-allowed');
}

function processPayment() {
    const payButton = document.getElementById('payButton');
    const originalText = payButton.textContent;
    payButton.textContent = 'جاري تسجيل الاستثمار...';
    payButton.disabled = true;

    handleInvestmentSubmission(selectedInvestmentType)
        .then(data => {
            setTimeout(() => {
                document.querySelector('.fixed')?.remove();
                showSuccessPage();
            }, 1000);
        })
        .catch(error => {
            showInlineMessage(error.message, 'error');
            payButton.textContent = originalText;
            payButton.disabled = false;
        });
}

function resetConfirmButton() {
    const button = document.getElementById('confirmButton');
    button.textContent = 'متابعة إلى الدفع';
    button.disabled = true;
}

function submitPartnershipProposal() {
    const partnershipType = document.querySelector('input[name="partnershipType"]:checked');
    const proposalText = document.getElementById('proposedTerms').value.trim();

    if (!partnershipType) {
        showInlineMessage('يرجى اختيار نوع الشراكة', 'error');
        return;
    }

    if (!proposalText) {
        showInlineMessage('يرجى كتابة تفاصيل اقتراحك', 'error');
        return;
    }

    const button = document.getElementById('confirmButton');
    const originalText = button.textContent;
    button.textContent = 'جاري إرسال الاقتراح...';
    button.disabled = true;

    handleInvestmentSubmission('custom')
        .then(data => showPartnershipSuccessPage())
        .catch(error => {
            showInlineMessage(error.message, 'error');
            button.textContent = originalText;
            button.disabled = false;
        });
}

function showPartnershipSuccessPage() {
    document.body.innerHTML = `
        <div class="min-h-full bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-6">
            <div class="bg-white rounded-3xl p-12 max-w-2xl w-full text-center shadow-2xl slide-up">
                <div class="w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse-slow">
                    <span class="text-6xl text-white">🤝</span>
                </div>
                
                <h1 class="text-4xl font-bold text-gray-900 mb-4">تم إرسال اقتراح الشراكة بنجاح!</h1>
                <p class="text-xl text-gray-600 mb-8">
                    شكراً لك على اهتمامك بالمشروع. تم إرسال اقتراحك إلى صاحب المشروع وسيتم التواصل معك قريباً.
                </p>
                
                <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-8 mb-8 border border-purple-200">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <div class="text-2xl font-bold text-purple-600">3-5 أيام</div>
                            <div class="text-sm text-gray-600">مدة المراجعة المتوقعة</div>
                        </div>
                        <div>
                            <div class="text-2xl font-bold text-pink-600">#PART-2024-001</div>
                            <div class="text-sm text-gray-600">رقم اقتراح الشراكة</div>
                        </div>
                    </div>
                </div>
                
                <div class="space-y-4 mb-8">
                    <div class="flex items-center justify-center gap-3 text-purple-700">
                        <span class="text-2xl">📧</span>
                        <span>تم إرسال تأكيد الاقتراح إلى بريدك الإلكتروني</span>
                    </div>
                    <div class="flex items-center justify-center gap-3 text-pink-700">
                        <span class="text-2xl">🔔</span>
                        <span>ستتلقى إشعاراً عند مراجعة اقتراحك</span>
                    </div>
                    <div class="flex items-center justify-center gap-3 text-purple-700">
                        <span class="text-2xl">💬</span>
                        <span>يمكنك متابعة حالة الاقتراح من لوحة التحكم</span>
                    </div>
                </div>
                
                <div class="space-y-4">
                    <button onclick="window.location.href='profile.html'" class="elegant-button w-full py-4 text-lg font-bold" style="background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);">
                        عرض لوحة التحكم
                    </button>
                    <button onclick="window.location.href='browse-projects.html'" class="secondary-button w-full py-4 font-medium">
                        تصفح مشاريع أخرى
                    </button>
                </div>
                
                <div class="mt-8 p-4 bg-purple-50 rounded-xl border border-purple-200">
                    <p class="text-sm text-purple-800">
                        <strong>ملاحظة:</strong> رقم الاقتراح: #PART-2024-001 • احتفظ بهذا الرقم للمراجعة المستقبلية
                    </p>
                </div>
            </div>
        </div>
    `;
}

function showSuccessPage() {
    const projectName = currentProject?.projectName || 'المشروع';
    document.body.innerHTML = `
        <div class="min-h-full bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-6">
            <div class="bg-white rounded-3xl p-12 max-w-2xl w-full text-center shadow-2xl slide-up">
                <div class="w-32 h-32 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse-slow">
                    <span class="text-6xl text-white">✓</span>
                </div>
                
                <h1 class="text-4xl font-bold text-gray-900 mb-4">${getSuccessTitle()}</h1>
                <p class="text-xl text-gray-600 mb-8">
                    ${getSuccessMessage()}
                </p>
                
                <div class="bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl p-8 mb-8 border border-blue-200">
                    <div class="grid grid-cols-2 gap-6">
                        <div>
                            <div class="text-3xl font-bold text-blue-600">${document.getElementById('summaryAmount')?.textContent || 'N/A'}</div>
                            <div class="text-sm text-gray-600">مبلغ الاستثمار</div>
                        </div>
                        <div>
                            <div class="text-3xl font-bold text-green-600">${document.getElementById('ownershipPercentage')?.textContent || 'N/A'}</div>
                            <div class="text-sm text-gray-600">نسبة الملكية</div>
                        </div>
                    </div>
                </div>
                
                <div class="space-y-4 mb-8">
                    <div class="flex items-center justify-center gap-3 text-green-700">
                        <span class="text-2xl">📧</span>
                        <span>تم إرسال تأكيد الاستثمار إلى بريدك الإلكتروني</span>
                    </div>
                    <div class="flex items-center justify-center gap-3 text-blue-700">
                        <span class="text-2xl">📱</span>
                        <span>ستتلقى تحديثات دورية عن تقدم المشروع</span>
                    </div>
                </div>
                
                <div class="space-y-4">
                    <button onclick="window.location.href='profile.html'" class="elegant-button w-full py-4 text-lg font-bold">
                        عرض لوحة التحكم
                    </button>
                    <button onclick="window.location.href='browse-projects.html'" class="secondary-button w-full py-4 font-medium">
                        تصفح مشاريع أخرى
                    </button>
                </div>
                
                <div class="mt-8 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                    <p class="text-sm text-yellow-800">
                        <strong>ملاحظة:</strong> رقم العملية: #INV-2024-001 • احتفظ بهذا الرقم للمراجعة المستقبلية
                    </p>
                </div>
            </div>
        </div>
    `;
}

function saveForLater() {
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = 'جاري الحفظ...';
    button.disabled = true;

    // 1. جمع بيانات المسودة
    const investmentAmount = parseInt(document.getElementById('investmentAmount')?.value) || 0;
    const proposedTerms = document.getElementById('proposedTerms')?.value || '';
    const partnershipType = document.querySelector('input[name="partnershipType"]:checked')?.value;
    const termsAccepted = document.getElementById('terms1')?.checked &&
        document.getElementById('terms2')?.checked &&
        document.getElementById('terms3')?.checked;

    const expertiseCheckboxes = document.querySelectorAll('#customPartnershipForm input[type="checkbox"]:checked');
    const expertiseAreas = Array.from(expertiseCheckboxes).map(cb => {
        const nextSibling = cb.nextElementSibling;
        return nextSibling ? nextSibling.textContent.trim() : 'غير محدد';
    });

    const draftData = {
        projectId: currentProject?._id,
        investmentType: selectedInvestmentType,
        investmentAmount: investmentAmount,
        proposedTerms: proposedTerms,
        partnershipType: partnershipType,
        expertiseAreas: expertiseAreas,
        termsAccepted: termsAccepted,
    };

    // 2. إرسال إلى الـ API
    fetch(`${API_BASE_URL}/api/saved-investments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('user_token')}`
        },
        body: JSON.stringify(draftData)
    })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'تم حفظ المسودة بنجاح.') { // يجب أن يرسل الخادم هذه الرسالة
                button.textContent = 'تم الحفظ!';
                document.getElementById('successModal').classList.remove('hidden');
            } else {
                throw new Error(data.message || 'فشل حفظ المسودة.');
            }
        })
        .catch(error => {
            showInlineMessage(error.message, 'error');
            button.textContent = originalText;
        })
        .finally(() => {
            setTimeout(() => {
                button.textContent = originalText;
                button.disabled = false;
            }, 1000);
        });
}

function closeSuccessModal() {
    document.getElementById('successModal').classList.add('hidden');
}

function contactSupport() {
    document.getElementById('supportModal').classList.remove('hidden');
}

function closeSupportModal() {
    document.getElementById('supportModal').classList.add('hidden');
}


document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('investmentAmount')?.addEventListener('input', updateCalculations);
    initializeCheckboxListeners();

    fetchProjectData();

    updateProjectProgress(0);
    checkFormValidity();
});