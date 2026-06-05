const LocalizationManager = {
    countryDefaults: {
        "المغرب": { currency: "MAD", lang: "ar" },
        "السعودية": { currency: "SAR", lang: "ar" },
        "الإمارات": { currency: "AED", lang: "ar" },
        "قطر": { currency: "QAR", lang: "ar" },
        "الكويت": { currency: "KWD", lang: "ar" },
        "مصر": { currency: "EGP", lang: "ar" },
        "USA": { currency: "USD", lang: "en" },
        "France": { currency: "EUR", lang: "en" },
        "UK": { currency: "GBP", lang: "en" }
    },

    exchangeRates: {
        "USD": 1,
        "MAD": 10.05,
        "SAR": 3.75,
        "AED": 3.67,
        "EUR": 0.92,
        "QAR": 3.64,
        "KWD": 0.31,
        "BHD": 0.38,
        "OMR": 0.39,
        "EGP": 47.50,
        "JOD": 0.71
    },

    getPreferences() {
        return {
            lang: localStorage.getItem('preferred_language') || 'ar',
            currency: localStorage.getItem('preferred_currency') || 'MAD',
            country: localStorage.getItem('preferred_country') || 'المغرب'
        };
    },

    getSuggestionForCountry(countryName) {
        return this.countryDefaults[countryName] || { currency: "USD", lang: "en" };
    },

    savePreferences(prefs) {
        if (prefs.lang) localStorage.setItem('preferred_language', prefs.lang);
        if (prefs.currency) localStorage.setItem('preferred_currency', prefs.currency);
        if (prefs.country) localStorage.setItem('preferred_country', prefs.country);

        window.dispatchEvent(new CustomEvent('localizationChanged', { detail: prefs }));
    },

    setLanguage(lang) {
        localStorage.setItem('preferred_language', lang);
        window.location.reload();
    },

    formatPrice(amount, fromCurrency = 'USD') {
        const { currency: toCurrency } = this.getPreferences();

        if (amount === undefined || amount === null || isNaN(amount)) return `--- ${toCurrency}`;

        const amountInUSD = amount / (this.exchangeRates[fromCurrency] || 1);

        const convertedAmount = amountInUSD * (this.exchangeRates[toCurrency] || 1);

        const formattedNumber = new Intl.NumberFormat(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(convertedAmount);

        return `${formattedNumber} ${toCurrency}`;
    },

    init() {
        const prefs = this.getPreferences();

        if (!localStorage.getItem('preferred_language')) localStorage.setItem('preferred_language', prefs.lang);
        if (!localStorage.getItem('preferred_currency')) localStorage.setItem('preferred_currency', prefs.currency);
        if (!localStorage.getItem('preferred_country')) localStorage.setItem('preferred_country', prefs.country);

        console.log("🌎 Localization Engine Ready", prefs);
    }
};

LocalizationManager.init();

window.LocalizationManager = LocalizationManager;