async function initAuth() {
    document.getElementById('authForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await login();
    });

    document.getElementById('registerForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await register();
    });

    showAuthModal();
}

function showAuthModal() {
    document.getElementById('authModal').style.display = 'block';
    document.getElementById('mainApp').style.display = 'none';
}

function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
}

async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
        notificationManager.warning('Введите логин и пароль');
        return;
    }

    await api.post('/api/auth/login', {username: username, password: password})
        .then(response => {
            if (response.ok) {
                showMainApp();
                notificationManager.success(`Добро пожаловать!`);
            } else if (response.status == 401) {
                notificationManager.error('Неверный логин или пароль');
            }
        })
        .catch(error => console.error('Error:', error));
}

async function register() {
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;

    if (!username || !password || !name) {
        notificationManager.warning('Заполните обязательные поля');
        return;
    }

    if (username.length < 3) {
        notificationManager.warning('Логин должен быть не менее 3 символов');
        return;
    }

    if (password.length < 6) {
        notificationManager.warning('Пароль должен быть не менее 6 символов');
        return;
    }

    currentUser = {
        username: username,
        password: password,
        name: name,
        email: email
    };

    await api.post('/api/auth/register', currentUser)
        .then(response => {
            if (response.status == 201) {
                showMainApp();
                notificationManager.success('Регистрация успешна!');
            } else if (response.status == 401) {
                notificationManager.error('Неверный логин или пароль');
            }
            return response.json()
        })
        .then(data => console.log(data))
        .catch(error => console.error('Error:', error));
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showAuthModal();
    notificationManager.info('Вы вышли из системы');
}

function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

function showLoginForm() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
}
