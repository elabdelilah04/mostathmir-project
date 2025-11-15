const API_BASE_URL = 'https://mostathmir-api.onrender.com';

const arabCountries = {
    [t('js-country-morocco')]: [t('js-city-rabat'), t('js-city-casablanca'), t('js-city-marrakech'), t('js-city-fes'), t('js-city-tanger'), t('js-city-agadir')],
    [t('js-country-algeria')]: [t('js-city-algiers'), t('js-city-oran'), t('js-city-constantine'), t('js-city-annaba')],
    [t('js-country-tunisia')]: [t('js-city-tunis'), t('js-city-sfax'), t('js-city-sousse'), t('js-city-bizerte')],
    [t('js-country-egypt')]: [t('js-city-cairo'), t('js-city-alexandria'), t('js-city-giza'), t('js-city-portsaid'), t('js-city-mansoura')],
    [t('js-country-saudi')]: [t('js-city-riyadh'), t('js-city-jeddah'), t('js-city-mecca'), t('js-city-medina'), t('js-city-dammam')],
    [t('js-country-uae')]: [t('js-city-dubai'), t('js-city-abudhabi'), t('js-city-sharjah'), t('js-city-alain')],
    [t('js-country-qatar')]: [t('js-city-doha'), t('js-city-alrayyan'), t('js-city-alwakrah')],
    [t('js-country-kuwait')]: [t('js-city-kuwait_city'), t('js-city-alfarwaniyah'), t('js-city-hawalli'), t('js-city-alahmadi')],
    [t('js-country-bahrain')]: [t('js-city-manama'), t('js-city-muharraq'), t('js-city-sitra')],
    [t('js-country-oman')]: [t('js-city-muscat'), t('js-city-salalah'), t('js-city-sohar')],
    [t('js-country-jordan')]: [t('js-city-amman'), t('js-city-irbid'), t('js-city-zarqa')],
    [t('js-country-lebanon')]: [t('js-city-beirut'), t('js-city-tripoli'), t('js-city-sidon')],
    [t('js-country-iraq')]: [t('js-city-baghdad'), t('js-city-basra'), t('js-city-mosul'), t('js-city-erbil')],
    [t('js-country-palestine')]: [t('js-city-jerusalem'), t('js-city-ramallah'), t('js-city-gaza'), t('js-city-nablus'), t('js-city-hebron')],
    [t('js-country-yemen')]: [t('js-city-sanaa'), t('js-city-aden'), t('js-city-taiz'), t('js-city-alhodeidah'), t('js-city-ibb')],
    [t('js-country-sudan')]: [t('js-city-khartoum'), t('js-city-omdurman'), t('js-city-portsudan')]
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

function initCountryCityDropdowns() {
    const countrySelect = document.getElementById("country");
    const citySelect = document.getElementById("city");
    if (!countrySelect || !citySelect) return;
    Object.keys(arabCountries).forEach(country => {
        const option = document.createElement("option");
        option.value = country;
        option.textContent = country;
        countrySelect.appendChild(option);
    });
    countrySelect.addEventListener("change", function () {
        // citySelect.innerHTML = '<option value="">اختر المدينة</option>';
        citySelect.innerHTML = `<option value="">${t('js-settings-select-city')}</option>`;

        const selectedCountry = this.value;
        if (selectedCountry && arabCountries[selectedCountry]) {
            arabCountries[selectedCountry].forEach(city => {
                const option = document.createElement("option");
                option.value = city;
                option.textContent = city;
                citySelect.appendChild(option);
            });
        }
    });
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