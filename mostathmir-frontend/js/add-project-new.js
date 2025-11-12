document.addEventListener("DOMContentLoaded", async () => {
    let features = [];
    let expenseItems = [];
    let currentProjectImages = [];

    const API_BASE_URL = "https://mostathmir-api.onrender.com";
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get("id");
    const isEditMode = !!projectId;
    const token = localStorage.getItem("user_token");

    if (!token) {
        alert(t('js-addproject-login-required'));
        window.location.href = "../login.html";
        return;
    }

    const citiesData = {
        saudi: [t('js-city-riyadh'), t('js-city-jeddah'), t('js-city-dammam')],
        uae: [t('js-city-dubai'), t('js-city-abudhabi'), t('js-city-sharjah')],
        kuwait: [t('js-city-kuwait_city')],
        qatar: [t('js-city-doha')],
        bahrain: [t('js-city-manama')],
        oman: [t('js-city-muscat')],
        morocco: [t('js-city-rabat'), t('js-city-casablanca'), t('js-city-marrakech')],
        egypt: [t('js-city-cairo'), t('js-city-alexandria')],
        jordan: [t('js-city-amman')],
        lebanon: [t('js-city-beirut')]
    };

    const exchangeRates = { SAR: 3.75, USD: 1, EUR: 0.92, AED: 3.67, KWD: 0.31, QAR: 3.64, BHD: 0.38, OMR: 0.38, MAD: 9.95 };

    const currencyInfo = {
        SAR: { symbol: t('js-currency-sar-symbol'), name: t('js-currency-sar-name') },
        USD: { symbol: t('js-currency-usd-symbol'), name: t('js-currency-usd-name') },
        EUR: { symbol: t('js-currency-eur-symbol'), name: t('js-currency-eur-name') },
        AED: { symbol: t('js-currency-aed-symbol'), name: t('js-currency-aed-name') },
        KWD: { symbol: t('js-currency-kwd-symbol'), name: t('js-currency-kwd-name') },
        QAR: { symbol: t('js-currency-qar-symbol'), name: t('js-currency-qar-name') },
        BHD: { symbol: t('js-currency-bhd-symbol'), name: t('js-currency-bhd-name') },
        OMR: { symbol: t('js-currency-omr-symbol'), name: t('js-currency-omr-name') },
        MAD: { symbol: t('js-currency-mad-symbol'), name: t('js-currency-mad-name') }
    };

    const projectStageRadios = document.querySelectorAll('input[name="projectStage"]');
    projectStageRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            const equityContext = document.getElementById('equityContext');
            const inProgressDetails = document.getElementById('inProgressDetailsSection');
            const pastFinancials = document.getElementById('pastFinancialsSection');
            const selectedStage = document.querySelector('input[name="projectStage"]:checked').value;

            inProgressDetails.classList.add('hidden');
            pastFinancials.classList.add('hidden');

            if (selectedStage === 'established') {
                equityContext.textContent = t('js-addproject-equity-context-established');
                pastFinancials.classList.remove('hidden');
            } else {
                equityContext.textContent = t('js-addproject-equity-context-goal');
                if (selectedStage === 'in-progress') {
                    inProgressDetails.classList.remove('hidden');
                }
            }

            document.querySelectorAll('#projectStageContainer .category-card').forEach(card => {
                card.classList.remove('selected');
            });
            radio.closest('.category-card').classList.add('selected');
        });
    });

    window.updateCities = () => {
        const countrySelect = document.getElementById("projectCountry");
        const citySelect = document.getElementById("projectCity");
        const selectedCountry = countrySelect.value;
        citySelect.innerHTML = `<option value="">${t('js-addproject-select-city')}</option>`;
        if (selectedCountry && citiesData[selectedCountry]) {
            citySelect.disabled = false;
            citiesData[selectedCountry].forEach(city => {
                const option = new Option(city, city);
                citySelect.add(option);
            });
        } else {
            citySelect.disabled = true;
        }
        updatePreview();
    };

    window.changeCurrency = () => {
        const selectedCurrency = document.getElementById("currency").value;
        const info = currencyInfo[selectedCurrency];
        const rate = exchangeRates[selectedCurrency];
        document.getElementById("fundingGoalCurrency").textContent = info.name;
        document.getElementById("minInvestmentCurrency").textContent = info.name;
        document.getElementById("financialTableCurrency").textContent = info.name;
        document.getElementById("selectedCurrencyName").textContent = info.name;
        document.getElementById("usdToSelected").textContent = `= ${rate.toFixed(2)} ${info.symbol}`;
        document.getElementById("selectedToUsd").textContent = `= ${(1 / rate).toFixed(2)} $`;
        updatePreview();
    };

    window.updatePreview = () => {
        document.getElementById("previewTitle").textContent = document.getElementById("projectName").value || t('js-addproject-preview-default-title');
        document.getElementById("previewDescription").textContent = document.getElementById("projectDescription").value || t('js-addproject-preview-default-desc');
        const categorySelect = document.getElementById("projectCategory");
        const selectedCategoryOption = categorySelect.options[categorySelect.selectedIndex];
        document.getElementById("previewCategory").textContent = selectedCategoryOption.text || t('js-addproject-preview-default-category'); const fundingGoal = document.getElementById("fundingGoal").value || "0";
        const currencySymbol = currencyInfo[document.getElementById("currency").value].symbol;
        document.getElementById("previewGoal").textContent = `${parseInt(fundingGoal).toLocaleString()} ${currencySymbol}`;
        document.getElementById("previewReturn").textContent = `${document.getElementById("expectedReturn").value || "0"}%`;
        document.getElementById("previewDuration").textContent = document.getElementById("investmentDuration").value || "0";
        updateProgress();
    };

    window.updateProgress = () => {
        const basicFields = ["projectName", "projectDescription", "projectCategory", "projectCountry", "projectCity", "detailedDescription"];
        const basicCompleted = basicFields.filter(id => document.getElementById(id).value.trim()).length;
        const basicPercent = Math.round((basicCompleted / basicFields.length) * 100);
        document.getElementById("basicProgress").textContent = `${basicPercent}%`;
        document.getElementById("basicProgressBar").style.width = `${basicPercent}%`;
        const financialFields = ["fundingGoal", "minInvestment", "expectedReturn", "investmentDuration"];
        const financialCompleted = financialFields.filter(id => document.getElementById(id).value.trim()).length;
        const financialPercent = Math.round((financialCompleted / financialFields.length) * 100);
        document.getElementById("financialProgress").textContent = `${financialPercent}%`;
        document.getElementById("financialProgressBar").style.width = `${financialPercent}%`;
        const documentsCompleted = ["businessPlan"].filter(id => document.getElementById(id).files.length > 0).length;
        const documentsPercent = Math.round((documentsCompleted / 1) * 100);
        document.getElementById("documentsProgress").textContent = `${documentsPercent}%`;
        document.getElementById("documentsProgressBar").style.width = `${documentsPercent}%`;
    };

    window.addFeature = () => {
        const input = document.getElementById("featureInput");
        if (input.value.trim()) {
            features.push(input.value.trim());
            input.value = "";
            updateFeaturesList();
        }
    };

    window.updateFeaturesList = () => {
        const container = document.getElementById("featuresList");
        container.innerHTML = "";
        features.forEach((feature, index) => {
            const div = document.createElement("div");
            div.className = "flex items-center justify-between bg-blue-50 p-3 rounded-lg";
            div.innerHTML = `<span class="text-blue-800">${feature}</span><button type="button" onclick="removeFeature(${index})" class="text-red-500 hover:text-red-700 text-lg">×</button>`;
            container.appendChild(div);
        });
    };

    window.removeFeature = (index) => {
        features.splice(index, 1);
        updateFeaturesList();
    };

    window.addExpenseItem = () => {
        const nameInput = document.getElementById("expenseItemName");
        const percentInput = document.getElementById("expenseItemPercent");
        const name = nameInput.value.trim();
        const percent = parseFloat(percentInput.value);
        if (name && !isNaN(percent) && percent > 0 && percent <= 100) {
            const currentTotal = expenseItems.reduce((sum, item) => sum + item.percent, 0);
            if (currentTotal + percent > 100) return alert(t('js-addproject-alert-percent-exceeds-100'));
            expenseItems.push({ name, percent });
            nameInput.value = "";
            percentInput.value = "";
            updateExpensesList();
            updateTotalPercentage();
        } else {
            alert(t('js-addproject-alert-invalid-expense'));
        }
    };

    window.updateExpensesList = () => {
        const container = document.getElementById("expensesList");
        container.innerHTML = "";
        expenseItems.forEach((item, index) => {
            const div = document.createElement("div");
            div.className = "flex items-center justify-between bg-gray-50 p-3 rounded-lg";
            div.innerHTML = `<span class="text-gray-800">${item.name}</span><div class="flex items-center gap-2"><span class="font-semibold text-blue-600">${item.percent}%</span><button type="button" onclick="removeExpenseItem(${index})" class="text-red-500 hover:text-red-700 text-lg">×</button></div>`;
            container.appendChild(div);
        });
    };

    window.removeExpenseItem = (index) => {
        expenseItems.splice(index, 1);
        updateExpensesList();
        updateTotalPercentage();
    };

    window.updateTotalPercentage = () => {
        const total = expenseItems.reduce((sum, item) => sum + item.percent, 0);
        const totalEl = document.getElementById("totalPercent");
        const warningEl = document.getElementById("percentageWarning");
        totalEl.textContent = `${total}%`;
        totalEl.className = "font-semibold";
        warningEl.className = "mr-2 text-sm";
        if (total === 100) {
            totalEl.classList.add("total-success");
            warningEl.textContent = t('js-addproject-percent-complete');
            warningEl.classList.add("text-green-600");
        } else if (total > 100) {
            totalEl.classList.add("total-warning");
            warningEl.textContent = t('js-addproject-percent-exceeds');
            warningEl.classList.add("text-red-600");
        } else if (total > 0) {
            totalEl.classList.add("text-orange-600");
            warningEl.textContent = t('js-addproject-percent-remaining').replace('{value}', 100 - total);
            warningEl.classList.add("text-orange-600");
        } else {
            warningEl.textContent = "";
        }
    };

    window.displayUploadedFile = (containerId, fileUrl, fileType) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        const fileName = fileUrl.split('/').pop();
        const API_BASE_URL = 'https://mostathmir-api.onrender.com';
        container.innerHTML = `
        <div class="flex items-center justify-between bg-gray-100 p-3 rounded-lg mt-2">
            <div class="flex items-center gap-3">
                <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                <a href="${API_BASE_URL}${fileUrl}" target="_blank" class="text-blue-700 hover:underline font-semibold">${fileName}</a>
            </div>
            <button type="button" onclick="removeUploadedFile('${fileType}', '${fileUrl}')" class="text-red-500 hover:text-red-700 text-lg">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
        </div>`;
    };

    window.displayUploadedImage = (containerId, imageUrl, index) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        const API_BASE_URL = 'https://mostathmir-api.onrender.com';
        const imgDiv = document.createElement("div");
        imgDiv.className = "relative w-24 h-24 rounded-lg overflow-hidden border border-gray-300 group";
        imgDiv.innerHTML = `
        <img src="${API_BASE_URL}${imageUrl}" alt="Project Image" class="w-full h-full object-cover">
        <button type="button" onclick="removeUploadedFile('projectImage', '${imageUrl}')" class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            ×
        </button>`;
        container.appendChild(imgDiv);
    };

    window.renderProjectImages = () => {
        const imagesContainer = document.getElementById("projectImagesDisplay");
        if (!imagesContainer) return;
        imagesContainer.innerHTML = "";
        currentProjectImages.forEach((imageUrl, index) => {
            displayUploadedImage("projectImagesDisplay", imageUrl, index);
        });
    };

    window.removeUploadedFile = async (fileType, filePath) => {
        if (!confirm(t('js-addproject-confirm-delete-file'))) return;
        const projectId = new URLSearchParams(window.location.search).get('id');
        const token = localStorage.getItem('user_token');
        if (!projectId || !token) {
            alert(t('js-addproject-error-delete-unauthorized'));
            return;
        }
        const buttonElement = event.target.closest('button');
        if (buttonElement) buttonElement.disabled = true;
        try {
            const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/file`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ fileType: fileType, filePath: filePath })
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || t('js-addproject-error-delete-failed'));
            }
            alert(t('js-addproject-success-delete'));
            window.location.reload();
        } catch (error) {
            console.error('File deletion failed:', error);
            alert(error.message);
            if (buttonElement) buttonElement.disabled = false;
        }
    };

    window.calculateProfit = (revenueId, expensesId, profitId) => {
        const revenue = parseFloat(document.getElementById(revenueId).value) || 0;
        const expenses = parseFloat(document.getElementById(expensesId).value) || 0;
        const profit = revenue - expenses;
        document.getElementById(profitId).textContent = profit.toLocaleString();
    };

    const submitProject = async (status, clickedButton = null) => {
        const formData = new FormData();

        const projectStageRadio = document.querySelector('input[name="projectStage"]:checked');
        if (projectStageRadio) {
            const stage = projectStageRadio.value;
            formData.append("projectStage", stage);
            if (stage === 'in-progress') {
                formData.append("completionPercentage", document.getElementById("completionPercentage").value);
                formData.append("progressDetails", document.getElementById("progressDetails").value);
            }
            if (stage === 'established') {
                const pastFinancials = [{
                    year: t('js-addproject-past-financials-year-label'),
                    revenue: Number(document.getElementById("pastRevenue1").value) || 0,
                    expenses: Number(document.getElementById("pastExpenses1").value) || 0,
                    profit: Number(document.getElementById("pastProfit1").textContent.replace(/[^\d.-]/g, "")) || 0
                }];
                formData.append("pastFinancials", JSON.stringify(pastFinancials));
            }
        } else {
            alert(t('js-addproject-alert-select-stage'));
            return;
        }

        formData.append("equityOffered", document.getElementById("equityOffered").value);
        formData.append("projectName", document.getElementById("projectName").value);
        formData.append("projectDescription", document.getElementById("projectDescription").value);
        formData.append("detailedDescription", document.getElementById("detailedDescription").value);
        formData.append("projectCategory", document.getElementById("projectCategory").value);
        formData.append("projectLocation", JSON.stringify({ country: document.getElementById("projectCountry").value, city: document.getElementById("projectCity").value }));
        formData.append("keyFeatures", JSON.stringify(features));
        formData.append("videoLink", document.getElementById("projectVideo").value);
        formData.append("fundingGoal", JSON.stringify({ amount: document.getElementById("fundingGoal").value, currency: document.getElementById("currency").value }));
        formData.append("minInvestment", document.getElementById("minInvestment").value);
        formData.append("expectedReturn", document.getElementById("expectedReturn").value);
        formData.append("investmentPeriod", document.getElementById("investmentDuration").value);
        formData.append("fundingDetails", JSON.stringify(expenseItems.map(item => ({ item: item.name, percentage: item.percent }))));

        const financialProjections = [
            { year: 1, revenue: Number(document.getElementById("revenue1").value) || 0, expenses: Number(document.getElementById("expenses1").value) || 0, profit: Number(document.getElementById("profit1").textContent.replace(/[^\d.-]/g, "")) || 0 },
            { year: 2, revenue: Number(document.getElementById("revenue2").value) || 0, expenses: Number(document.getElementById("expenses2").value) || 0, profit: Number(document.getElementById("profit2").textContent.replace(/[^\d.-]/g, "")) || 0 },
            { year: 3, revenue: Number(document.getElementById("revenue3").value) || 0, expenses: Number(document.getElementById("expenses3").value) || 0, profit: Number(document.getElementById("profit3").textContent.replace(/[^\d.-]/g, "")) || 0 }
        ];
        formData.append("financialProjections", JSON.stringify(financialProjections));
        formData.append("campaignDuration", document.getElementById("campaignDuration").value);
        const businessPlanFile = document.getElementById("businessPlan").files[0];
        if (businessPlanFile) formData.append("businessPlan", businessPlanFile);
        const presentationFile = document.getElementById("presentation").files[0];
        if (presentationFile) formData.append("presentation", presentationFile);

        const projectImagesFiles = document.getElementById("projectImages").files;
        if (projectImagesFiles.length > 0) {
            for (const file of projectImagesFiles) {
                formData.append("projectImages", file);
            }
        }

        formData.append("status", status);

        const url = isEditMode ? `${API_BASE_URL}/api/projects/${projectId}` : `${API_BASE_URL}/api/projects`;
        const method = isEditMode ? "PUT" : "POST";
        let submitBtn = clickedButton;
        if (!submitBtn) {
            submitBtn = document.activeElement;
            if (!submitBtn || (submitBtn.tagName !== 'BUTTON' && submitBtn.tagName !== 'INPUT')) {
                submitBtn = document.querySelector('button[onclick*="submitForReview"]') || document.querySelector('button[onclick*="saveDraft"]');
            }
        }

        let originalText = "";
        if (submitBtn) {
            originalText = submitBtn.innerText;
            submitBtn.disabled = true;
            submitBtn.innerText = t('js-addproject-submitting-text');
        }

        try {
            const response = await fetch(url, {
                method: method,
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || t('js-addproject-error-submit-failed'));
            }

            let successKey = '';
            if (isEditMode) {
                successKey = (status === 'draft') ? 'js-addproject-success-edit-draft' : 'js-addproject-success-edit-submit';
            } else {
                successKey = (status === 'draft') ? 'js-addproject-success-create-draft' : 'js-addproject-success-create-submit';
            }
            alert(t(successKey));

            window.location.href = "./my-projects.html";
        } catch (err) {
            alert(`${t('js-addproject-error-prefix')}: ${err.message}`);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
            }
        }
    };

    window.saveDraft = (buttonElement) => submitProject("draft", buttonElement);
    window.submitForReview = (buttonElement) => {
        const requiredFields = ["projectName", "projectDescription", "projectCategory", "projectCountry", "projectCity", "fundingGoal", "minInvestment", "expectedReturn", "investmentDuration", "equityOffered"];
        let isValid = true;
        requiredFields.forEach(id => {
            const field = document.getElementById(id);
            if (!field.value.trim()) {
                isValid = false;
                field.classList.add("border-red-500");
            } else {
                field.classList.remove("border-red-500");
            }
        });
        if (!isValid) return alert(t('js-addproject-alert-fill-required-fields'));

        // --- بداية التحسينات المقترحة ---

        let errorMessages = [];

        // 1. التحقق من القيم الرقمية والحدود
        const fundingGoal = parseInt(document.getElementById("fundingGoal").value, 10);
        if (isNaN(fundingGoal) || fundingGoal <= 0) {
            errorMessages.push(t("js-addproject-error-funding-positive"));
        }

        const minInvestment = parseInt(document.getElementById("minInvestment").value, 10);
        if (isNaN(minInvestment) || minInvestment <= 0) {
            errorMessages.push(t("js-addproject-error-min-investment-positive"));
        } else if (minInvestment > fundingGoal) {
            errorMessages.push(t("js-addproject-error-min-investment-less-than-goal"));
        }

        const equityOffered = parseInt(document.getElementById("equityOffered").value, 10);
        if (isNaN(equityOffered) || equityOffered < 1 || equityOffered > 100) {
            errorMessages.push(t("js-addproject-error-equity-between-1-100"));
        }

        // 2. التحقق من الملفات المرفوعة (إذا كانت مطلوبة عند الإرسال)
        // const businessPlanFile = document.getElementById("businessPlan").files[0];
        // if (!isEditMode && !businessPlanFile) { // مثال: إذا كانت خطة العمل مطلوبة فقط عند الإنشاء لأول مرة
        //     errorMessages.push(t("js-addproject-error-business-plan-required"));
        // }
        // يمكن إضافة تحقق من امتداد الملفات هنا أيضاً

        if (errorMessages.length > 0) {
            alert(t("js-addproject-error-validation-summary") + "\n- " + errorMessages.join("\n- "));
            return;
        }

        const total = expenseItems.reduce((sum, item) => sum + item.percent, 0);
        if (!isEditMode && total > 0 && total !== 100) {
            const confirmMsg = `${t('js-addproject-confirm-percent-part1')} ${total}%. ${t('js-addproject-confirm-percent-part2')}`;
            if (!confirm(confirmMsg)) return;
        }

        submitProject("under-review", buttonElement);
    };
    window.previewProject = () => {
        const projectId = new URLSearchParams(window.location.search).get("id");
        if (projectId) {
            window.open(`../project-details.html?id=${projectId}`, "_blank");
        } else {
            alert(t('js-addproject-alert-save-draft-to-preview'));
        }
    };
    window.goBack = () => { if (confirm(t('js-addproject-confirm-go-back'))) window.history.back(); };

    function populateForm(project) {
        document.getElementById("projectName").value = project.projectName || "";
        document.getElementById("projectDescription").value = project.projectDescription || "";
        document.getElementById("detailedDescription").innerHTML = project.detailedDescription || "";
        document.getElementById("projectCategory").value = project.projectCategory || "";
        if (project.projectLocation) {
            document.getElementById("projectCountry").value = project.projectLocation.country || "";
            updateCities();
            document.getElementById("projectCity").value = project.projectLocation.city || "";
        }

        if (project.projectStage) {
            const stageRadio = document.getElementById(`stage-${project.projectStage}`);
            if (stageRadio) {
                stageRadio.checked = true;
                stageRadio.dispatchEvent(new Event('change'));
            }
        }
        if (project.projectStage === 'in-progress') {
            document.getElementById("completionPercentage").value = project.completionPercentage || "";
            document.getElementById("progressDetails").value = project.progressDetails || "";
        }
        if (project.projectStage === 'established' && project.pastFinancials && project.pastFinancials.length > 0) {
            const pastFin = project.pastFinancials[0];
            document.getElementById("pastRevenue1").value = pastFin.revenue || "";
            document.getElementById("pastExpenses1").value = pastFin.expenses || "";
            calculateProfit('pastRevenue1', 'pastExpenses1', 'pastProfit1');
        }

        document.getElementById("equityOffered").value = project.equityOffered || "";

        if (project.keyFeatures && project.keyFeatures.length > 0) {
            features = project.keyFeatures;
            updateFeaturesList();
        }

        document.getElementById("projectVideo").value = project.videoLink || "";
        if (project.fundingGoal) {
            document.getElementById("fundingGoal").value = project.fundingGoal.amount || "0";
            document.getElementById("currency").value = project.fundingGoal.currency || "SAR";
        }
        document.getElementById("minInvestment").value = project.minInvestment || "0";
        document.getElementById("expectedReturn").value = project.expectedReturn || "0";
        document.getElementById("investmentDuration").value = project.investmentPeriod || "12";

        if (project.fundingDetails && project.fundingDetails.length > 0) {
            expenseItems = project.fundingDetails.map(d => ({ name: d.item, percent: d.percentage }));
            updateExpensesList();
            updateTotalPercentage();
        }

        if (project.businessPlan) {
            displayUploadedFile("businessPlanDisplay", project.businessPlan, "businessPlan");
        }
        if (project.presentation) {
            displayUploadedFile("presentationDisplay", project.presentation, "presentation");
        }

        if (project.projectImages && project.projectImages.length > 0) {
            currentProjectImages = project.projectImages;
            renderProjectImages();
        }

        if (project.financialProjections && project.financialProjections.length > 0) {
            project.financialProjections.forEach(p => {
                if (p.year >= 1 && p.year <= 3) {
                    document.getElementById(`revenue${p.year}`).value = p.revenue || "";
                    document.getElementById(`expenses${p.year}`).value = p.expenses || "";
                    calculateProfit(`revenue${p.year}`, `expenses${p.year}`, `profit${p.year}`);
                }
            });
        }
        document.getElementById("campaignDuration").value = project.campaignDuration || "30";
        changeCurrency();
        updatePreview();
    }

    if (isEditMode) {
        document.querySelector("h1").textContent = t('js-addproject-edit-mode-title');
        fetch(`${API_BASE_URL}/api/projects/${projectId}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => {
                if (!res.ok) throw new Error(t('js-addproject-error-fetch-failed'));
                return res.json();
            })
            .then(project => populateForm(project))
            .catch(err => {
                alert(err.message);
                window.location.href = "./my-projects.html";
            });
    } else {
        const defaultStage = document.getElementById('stage-idea');
        if (defaultStage) {
            defaultStage.checked = true;
            defaultStage.dispatchEvent(new Event('change'));
        }
        updatePreview();
        updateTotalPercentage();
    }

    ["pastRevenue1", "pastExpenses1"].forEach(id => document.getElementById(id).addEventListener("input", () => calculateProfit("pastRevenue1", "pastExpenses1", "pastProfit1")));
    ["revenue1", "expenses1"].forEach(id => document.getElementById(id).addEventListener("input", () => calculateProfit("revenue1", "expenses1", "profit1")));
    ["revenue2", "expenses2"].forEach(id => document.getElementById(id).addEventListener("input", () => calculateProfit("revenue2", "expenses2", "profit2")));
    ["revenue3", "expenses3"].forEach(id => document.getElementById(id).addEventListener("input", () => calculateProfit("revenue3", "expenses3", "profit3")));
    document.querySelectorAll("input, textarea, select").forEach(element => {
        element.addEventListener("input", updatePreview);
        element.addEventListener("change", updatePreview);
    });
    document.getElementById("businessPlan").addEventListener("change", (e) => { if (e.target.files.length > 0) updateProgress(); });
    document.getElementById("presentation").addEventListener("change", (e) => { if (e.target.files.length > 0) updateProgress(); });
    document.getElementById("projectImages").addEventListener("change", (e) => { if (e.target.files.length > 0) updateProgress(); });
});