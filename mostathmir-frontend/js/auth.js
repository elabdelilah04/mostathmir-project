const API_BASE_URL = 'https://mostathmir-api.onrender.com';

// في auth.js

const countriesData = {
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
            const error = new Error(errorMessage || data.message || 'An unexpected error occurred');
            error.data = data;
            throw error;
        }
        return data;
    } catch (error) {
        throw error;
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

    const countrySelect = signupForm.querySelector('#country');
    const citySelect = signupForm.querySelector('#city');
    const passwordInput = signupForm.querySelector('#password');
    const confirmPasswordInput = signupForm.querySelector('#confirmPassword');

    if (passwordInput.value !== confirmPasswordInput.value) {
        return alert(t('js-auth-passwords-mismatch'));
    }

    if (!countrySelect.value || !citySelect.value) {
        return alert(t('js-auth-select-country-city'));
    }

    const countryText = countrySelect.options[countrySelect.selectedIndex].textContent;
    const cityText = citySelect.value;
    const locationValue = `${cityText}, ${countryText}`;

    const formData = {
        fullName: signupForm.querySelector('#fullName').value,
        email: signupForm.querySelector('#email').value,
        phone: signupForm.querySelector('#phone').value,
        password: passwordInput.value,
        accountType: signupForm.querySelector('#accountType').value,
        location: locationValue,
        bio: signupForm.querySelector('#bio').value,
    };

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
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    }
}

function initCountryCityDropdowns() {
    const countrySelect = document.getElementById("country");
    const citySelect = document.getElementById("city");
    if (!countrySelect || !citySelect) return;

    // ملء قائمة الدول من HTML لأنها مترجمة هناك
    countrySelect.addEventListener("change", function () {
        const selectedCountry = this.value; // القيمة هنا هي "saudi", "uae", etc.
        citySelect.innerHTML = `<option value="">${t('settings-city-select')}</option>`;

        if (selectedCountry && citiesData[selectedCountry]) {
            citySelect.disabled = false;
            citiesData[selectedCountry].forEach(city => {
                const option = new Option(city, city);
                citySelect.add(option);
            });
        } else {
            citySelect.disabled = true;
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