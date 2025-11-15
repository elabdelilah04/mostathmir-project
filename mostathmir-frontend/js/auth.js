const API_BASE_URL = 'https://mostathmir-api.onrender.com';

const countriesData = {
    "ma": { nameKey: "js-country-morocco", cities: ["rabat", "casablanca", "marrakech", "fes", "tanger", "agadir"] },
    "dz": { nameKey: "js-country-algeria", cities: ["algiers", "oran", "constantine", "annaba"] },
    "tn": { nameKey: "js-country-tunisia", cities: ["tunis", "sfax", "sousse", "bizerte"] },
    "eg": { nameKey: "js-country-egypt", cities: ["cairo", "alexandria", "giza", "portsaid", "mansoura"] },
    "sa": { nameKey: "js-country-saudi", cities: ["riyadh", "jeddah", "mecca", "medina", "dammam"] },
    "ae": { nameKey: "js-country-uae", cities: ["dubai", "abudhabi", "sharjah", "alain"] },
    "qa": { nameKey: "js-country-qatar", cities: ["doha", "alrayyan", "alwakrah"] },
    "kw": { nameKey: "js-country-kuwait", cities: ["kuwait_city", "alfarwaniyah", "hawalli", "alahmadi"] },
    "bh": { nameKey: "js-country-bahrain", cities: ["manama", "muharraq", "sitra"] },
    "om": { nameKey: "js-country-oman", cities: ["muscat", "salalah", "sohar"] },
    "jo": { nameKey: "js-country-jordan", cities: ["amman", "irbid", "zarqa"] },
    "lb": { nameKey: "js-country-lebanon", cities: ["beirut", "tripoli", "sidon"] },
    "iq": { nameKey: "js-country-iraq", cities: ["baghdad", "basra", "mosul", "erbil"] },
    "ps": { nameKey: "js-country-palestine", cities: ["jerusalem", "ramallah", "gaza", "nablus", "hebron"] },
    "ye": { nameKey: "js-country-yemen", cities: ["sanaa", "aden", "taiz", "alhodeidah", "ibb"] },
    "sd": { nameKey: "js-country-sudan", cities: ["khartoum", "omdurman", "portsudan"] }
};

async function handleApiRequest(url, options, form) {
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = t('js-script-please-wait');
    try {
        const response = await fetch(url, options);
        const data = await response.json();
        if (!response.ok) {
            const errorMessage = data.messageKey ? t(data.messageKey) : data.message;
            const error = new Error(errorMessage || data.message || 'حدث خطأ غير متوقع');
            error.data = data;
            throw error;
        }
        return data; // فقط قم بإرجاع البيانات
    } catch (error) {
        throw error; // ارمِ الخطأ ليتم التعامل معه في الدالة المستدعية
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    }
}

async function fetchCurrentUser() {
    const token = localStorage.getItem('user_token');
    if (!token) {
        const protectedPages = ['page-title-profile', 'page-title-investor-profile', 'page-title-settings'];
        if (protectedPages.includes(document.body.dataset.pageKey)) {
            window.location.href = 'login.html';
        }
        return null;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            localStorage.removeItem('user_token');
            localStorage.removeItem('user_data');
            localStorage.removeItem('user_id');
            window.location.href = 'login.html';
            return null;
        }
        const user = await response.json();
        if (user._id) {
            localStorage.setItem('user_id', user._id);
        }
        localStorage.setItem('user_data', JSON.stringify(user));
        return user;
    } catch (error) {
        console.error('Failed to fetch user profile:', error);
        return null;
    }
}

function logoutUser() {
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('user_id');
    alert(t('js-header-logout-success'));
    window.location.href = 'login.html';
}

function redirectIfLoggedIn() {

    const pageKey = document.body.dataset.pageKey;
    if (pageKey === 'page-title-login' || pageKey === 'page-title-signup') {
        const token = localStorage.getItem('user_token');
        if (token) {
            fetchCurrentUser().then(user => {
                if (user) {
                    const destination = user.accountType === 'investor' ? 'investor-profile.html' : 'profile.html';
                    window.location.href = destination;
                }
            });
        }
    }
}

async function handleSignupSubmit(e, signupForm) {
    e.preventDefault();
    const country = signupForm.querySelector('#country').value;
    const city = signupForm.querySelector('#city').value;
    const locationValue = country && city ? `${city}, ${country}` : '';
    const formData = {
        fullName: signupForm.querySelector('#fullName').value,
        email: signupForm.querySelector('#email').value,
        phone: signupForm.querySelector('#phone').value,
        password: signupForm.querySelector('#password').value,
        accountType: signupForm.querySelector('#accountType').value,
        location: locationValue,
        bio: signupForm.querySelector('#bio').value,
    };
    if (formData.password !== signupForm.querySelector('#confirmPassword').value) {
        return alert(t('js-auth-passwords-mismatch'));
    }
    if (!country || !city) {
        return alert(t('js-auth-select-country-city'));
    }
    try {
        const data = await handleApiRequest(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        }, signupForm);
        const successMessage = data.messageKey ? t(data.messageKey) : data.message;
        if (successMessage) {
            alert(successMessage);
        }
        window.location.href = `verify-email.html?email=${formData.email}`;
    } catch (error) {
        alert(error.message);
        console.error('Signup failed:', error);
    }
}

async function handleLoginSubmit(e, loginForm) {
    e.preventDefault();
    const formData = {
        email: loginForm.querySelector('#emailOrPhone').value,
        password: loginForm.querySelector('#password').value,
    };
    const submitButton = loginForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = t('js-script-please-wait');

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            const alertMessage = data.messageKey ? t(data.messageKey) : data.message;
            alert(alertMessage || data.message);
            if (data.notVerified) {
                window.location.href = `verify-email.html?email=${formData.email}`;
            }
        } else {
            localStorage.setItem('user_token', data.token);
            localStorage.setItem('user_id', data._id);
            await fetchCurrentUser();
            alert(t('js-auth-login-success'));
            window.location.href = data.accountType === 'investor' ? 'investor-profile.html' : 'profile.html';
        }
    } catch (error) {
        alert(t('js-auth-server-error'));
        console.error('Login network/fetch failed:', error);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    }
}

function initCountryCityDropdowns(currentLocation) {
    const countrySelect = document.getElementById("country");
    const citySelect = document.getElementById("city");
    if (!countrySelect || !citySelect) return;

    // مسح أي خيارات قديمة
    countrySelect.innerHTML = `<option value="">${t('settings-country-select')}</option>`;
    citySelect.innerHTML = `<option value="">${t('settings-city-select')}</option>`;

    let initialCountryKey = '';
    let initialCityText = '';

    if (currentLocation && currentLocation.includes(', ')) {
        const parts = currentLocation.split(', ');
        initialCityText = parts[0];
        const savedCountryText = parts[1];

        // البحث عن مفتاح الدولة بناءً على النص المحفوظ
        initialCountryKey = Object.keys(countriesData).find(key => t(countriesData[key].nameKey) === savedCountryText);
    }

    // ملء قائمة الدول
    Object.keys(countriesData).forEach(countryKey => {
        const option = document.createElement("option");
        option.value = countryKey; // القيمة هي المفتاح (مثال: 'ma')
        option.textContent = t(countriesData[countryKey].nameKey); // النص هو الترجمة (مثال: 'المغرب')

        if (countryKey === initialCountryKey) {
            option.selected = true;
        }
        countrySelect.appendChild(option);
    });

    // دالة لملء قائمة المدن بناءً على مفتاح الدولة
    const populateCities = (countryKey, selectedCityText) => {
        citySelect.innerHTML = `<option value="">${t('settings-city-select')}</option>`;
        citySelect.disabled = true;

        if (countryKey && countriesData[countryKey]) {
            citySelect.disabled = false;
            countriesData[countryKey].cities.forEach(cityKey => {
                const option = document.createElement("option");
                const cityText = t(`js-city-${cityKey}`); // الحصول على النص المترجم للمدينة

                option.value = cityText; // القيمة التي سيتم حفظها هي النص المترجم
                option.textContent = cityText; // النص المعروض هو نفسه

                if (cityText === selectedCityText) {
                    option.selected = true;
                }
                citySelect.appendChild(option);
            });
        }
    };

    // ملء المدن في البداية إذا كانت هناك دولة محددة مسبقاً
    if (initialCountryKey) {
        populateCities(initialCountryKey, initialCityText);
    }

    // إضافة مستمع الأحداث لتحديث المدن عند تغيير الدولة
    countrySelect.addEventListener("change", function () {
        populateCities(this.value, null);
    });

    // لا تقم بتعطيل الحقول هنا، دع دالة toggleEditMode تتحكم في ذلك
}

document.addEventListener('DOMContentLoaded', () => {
    redirectIfLoggedIn();
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        initCountryCityDropdowns();
        signupForm.addEventListener('submit', (e) => handleSignupSubmit(e, signupForm));
    }
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => handleLoginSubmit(e, loginForm));
    }
});

window.fetchCurrentUser = fetchCurrentUser;
window.logoutUser = logoutUser;
window.API_BASE_URL = API_BASE_URL;