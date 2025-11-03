// Для демонстрации - локальное хранилище данных
let placemarksData = [
    {
        id: 2,
        name: "Яркая стена на Ленина",
        description: "Большое граффити на торце здания",
        type: "street",
        lat: 54.991553,
        lng: 73.368741,
        authorName: "user"
    },
    {
        id: 3,
        name: "Нужна роспись фасада кафе",
        description: "Ищем художника для росписи фасада нового кафе",
        type: "request",
        lat: 54.988421,
        lng: 73.374562,
        phone: "+7 (999) 123-45-67",
        telegram: "cafe_owner",
        authorName: "user"
    }
];

let myMap;
let myCollection;
let selectedCoords = null;
let isSelectingMode = false;
let tempPlacemark = null;
let currentUser = null;
let authToken = null;
let nextPlacemarkId = 4;

class NotificationManager {
    constructor() {
        this.container = document.getElementById('notification-container');
    }
    
    show(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `<div class="notification-content">${message}</div>`;
        
        this.container.appendChild(notification);
        
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, duration);
        }
    }
    
    success(message, duration = 5000) {
        this.show(message, 'success', duration);
    }
    
    error(message, duration = 5000) {
        this.show(message, 'error', duration);
    }
    
    warning(message, duration = 5000) {
        this.show(message, 'warning', duration);
    }
    
    info(message, duration = 5000) {
        this.show(message, 'info', duration);
    }
}

const notificationManager = new NotificationManager();

// Функции авторизации и регистрации (упрощенные для демо)
function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
        notificationManager.warning('Введите логин и пароль');
        return;
    }

    // Тестовые пользователи для демо
    const testUsers = {
        'admin': { password: 'admin123', name: 'Администратор' },
        'user': { password: 'user123', name: 'Иван Иванов' }
    };

    if (testUsers[username] && testUsers[username].password === password) {
        currentUser = {
            username: username,
            name: testUsers[username].name
        };
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        showMainApp();
        notificationManager.success(`Добро пожаловать, ${currentUser.name}!`);
    } else {
        notificationManager.error('Неверный логин или пароль');
    }
}

function register() {
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;

    if (!username || !password || !name) {
        notificationManager.warning('Заполните обязательные поля (отмечены *)');
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

    // Простая регистрация для демо
    currentUser = {
        username: username,
        name: name,
        email: email
    };
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    notificationManager.success('Регистрация успешна!');
    showMainApp();
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showAuthModal();
    notificationManager.info('Вы вышли из системы');
}

function showAuthModal() {
    document.getElementById('authModal').style.display = 'block';
    document.getElementById('mainApp').style.display = 'none';
    document.getElementById('authForm').reset();
    document.getElementById('registerFormElement').reset();
    showLoginForm();
}

function showMainApp() {
    document.getElementById('authModal').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    document.getElementById('userGreeting').textContent = `Добро пожаловать, ${currentUser.name}!`;
    
    // Инициализируем карту, если еще не инициализирована
    if (!myMap) {
        ymaps.ready(initMap);
    } else {
        // Если карта уже есть, просто показываем метки
        loadPlacemarks();
    }
}

function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

function showLoginForm() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
}

function initAuth() {
    const savedUser = localStorage.getItem('currentUser');

    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showMainApp();
    } else {
        showAuthModal();
    }

    document.getElementById('authForm').addEventListener('submit', function(e) {
        e.preventDefault();
        login();
    });

    document.getElementById('registerFormElement').addEventListener('submit', function(e) {
        e.preventDefault();
        register();
    });
}

// Функции карты
function init() {
    initAuth();
}

function initMap() {
    myMap = new ymaps.Map('map', {
        center: [54.992440, 73.368591], // Центр Омска
        zoom: 12,
        controls: ['zoomControl']
    });

    initBottomMenu();
    myCollection = new ymaps.GeoObjectCollection();
    myMap.geoObjects.add(myCollection);

    // Обработчик смены типа метки в форме
    document.getElementById('placemarkType').addEventListener('change', function() {
        const isRequest = this.value === 'request';
        const contactFields = document.querySelectorAll('.contact-fields');
        contactFields.forEach(el => {
            el.style.display = isRequest ? 'block' : 'none';
        });
    });

    loadPlacemarks();

    myMap.events.add('click', function (e) {
        if (isSelectingMode) {
            selectedCoords = e.get('coords');
            updateCoordsDisplay();
            
            if (tempPlacemark) {
                myMap.geoObjects.remove(tempPlacemark);
            }
            
            tempPlacemark = new ymaps.Placemark(selectedCoords, {}, {
                preset: 'islands#blueDotIcon',
                draggable: true
            });
            
            myMap.geoObjects.add(tempPlacemark);
            
            tempPlacemark.events.add('dragend', function () {
                selectedCoords = tempPlacemark.geometry.getCoordinates();
                updateCoordsDisplay();
            });

            notificationManager.success('Место выбрано! Заполните информацию о метке');
            setTimeout(() => {
                openFormModal();
            }, 500);
            
            isSelectingMode = false;
        }
    });
}

function loadPlacemarks() {
    placemarksData.forEach(placemark => {
        addPlacemarkToMap(placemark);
    });
}

function addPlacemarkToMap(placemarkData) {
    let balloonContent = `
        <div class="placemark-balloon">
            <div class="placemark-type" data-type="${placemarkData.type}">${placemarkData.type === 'request' ? 'ЗАПРОС' : placemarkData.type.toUpperCase()}</div>
            <div class="placemark-title">${placemarkData.name}</div>
            ${placemarkData.photo ? `<img src="${placemarkData.photo}" alt="${placemarkData.name}" class="placemark-photo">` : ''}
            <div class="placemark-description">${placemarkData.description || 'Описание отсутствует'}</div>
    `;

    // Контакты только для request
    if (placemarkData.type === 'request') {
        balloonContent += `<div class="placemark-contacts"><strong>Контакты:</strong><br>`;
        if (placemarkData.phone) {
            balloonContent += `📱 Телефон: <a href="tel:${placemarkData.phone}">${placemarkData.phone}</a><br>`;
        }
        if (placemarkData.telegram) {
            balloonContent += `💬 Telegram: <a href="https://t.me/${placemarkData.telegram}" target="_blank">@${placemarkData.telegram}</a>`;
        }
        balloonContent += `</div>`;
    }

    balloonContent += `
            <div class="placemark-coords">
                Координаты: ${placemarkData.lat.toFixed(6)}, ${placemarkData.lng.toFixed(6)}
            </div>
            <div class="placemark-author">
                Добавлено: ${placemarkData.authorName}
            </div>
        </div>
    `;

    const iconPreset = placemarkData.type === 'request' 
        ? 'islands#violetDotIcon' 
        : placemarkData.type === 'event' 
            ? 'islands#blueDotIcon' 
            : 'islands#greenDotIcon';

    const placemark = new ymaps.Placemark(
        [placemarkData.lat, placemarkData.lng],
        { balloonContent, hintContent: placemarkData.name },
        { preset: iconPreset, balloonCloseButton: true }
    );

    placemark.userData = placemarkData;

    placemark.events.add('contextmenu', function (e) {
        e.preventDefault();
        if (confirm(`Удалить метку "${placemarkData.name}"?`)) {
            deletePlacemark(placemarkData.id, placemark);
        }
    });

    myCollection.add(placemark);
}

function deletePlacemark(id, placemark) {
    placemarksData = placemarksData.filter(p => p.id !== id);
    myCollection.remove(placemark);
    notificationManager.info('Метка удалена');
}

// Функции интерфейса
function initBottomMenu() {
    const menuOptions = document.querySelectorAll('.menu-option');
    
    menuOptions.forEach(option => {
        option.addEventListener('click', function() {
            menuOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            
            const type = this.getAttribute('data-type');
            filterPlacemarksByType(type);
        });
    });
}

function filterPlacemarksByType(type) {
    const allPlacemarks = myCollection.getIterator();
    let visibleCount = 0;
    
    allPlacemarks.each(function(placemark) {
        const shouldShow = placemark.userData.type === type;
        placemark.options.set('visible', shouldShow);
        if (shouldShow) visibleCount++;
    });
    
    const typeLabels = {
        event: 'События',
        street: 'Уличное искусство',
        request: 'Запросы на роспись'
    };
    
    notificationManager.info(`Показаны: ${typeLabels[type] || type.toUpperCase()} (${visibleCount})`);
}

function openAddForm() {
    isSelectingMode = true;
    selectedCoords = null;
    
    if (tempPlacemark) {
        myMap.geoObjects.remove(tempPlacemark);
        tempPlacemark = null;
    }
    
    document.getElementById('coordLat').textContent = 'не выбраны';
    document.getElementById('coordLng').textContent = 'не выбраны';
    
    notificationManager.info('Кликните на карте для выбора места метки');
}

function openFormModal() {
    document.getElementById('addFormModal').style.display = 'block';
}

function closeAddForm() {
    document.getElementById('addFormModal').style.display = 'none';
}

function updateCoordsDisplay() {
    if (selectedCoords) {
        document.getElementById('coordLat').textContent = selectedCoords[0].toFixed(6);
        document.getElementById('coordLng').textContent = selectedCoords[1].toFixed(6);
    }
}

document.getElementById('placemarkForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    await savePlacemark();
});

async function savePlacemark() {
    if (!selectedCoords) {
        notificationManager.warning('Сначала выберите место на карте!');
        return;
    }

    const name = document.getElementById('placemarkName').value;
    const description = document.getElementById('placemarkDescription').value;
    const type = document.getElementById('placemarkType').value;
    const photoInput = document.getElementById('placemarkPhoto');
    const file = photoInput.files[0];

    const phone = document.getElementById('placemarkPhone').value || null;
    const telegram = document.getElementById('placemarkTelegram').value || null;

    if (!name) {
        notificationManager.warning('Пожалуйста, введите название метки');
        return;
    }

    let photoBase64 = null;
    if (file) {
        if (!file.type.match('image.*')) {
            notificationManager.error('Пожалуйста, выберите файл изображения');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            notificationManager.error('Файл слишком большой. Максимальный размер: 5MB');
            return;
        }
        
        photoBase64 = await readFileAsBase64(file);
    }

    const placemarkData = {
        id: nextPlacemarkId++,
        name,
        description,
        type,
        lat: selectedCoords[0],
        lng: selectedCoords[1],
        photo: photoBase64,
        authorName: currentUser.name
    };

    // Сохраняем контакты только для request
    if (type === 'request') {
        placemarkData.phone = phone;
        placemarkData.telegram = telegram;
    }

    placemarksData.push(placemarkData);
    addPlacemarkToMap(placemarkData);
    
    document.getElementById('placemarkForm').reset();
    // Скрываем поля контактов
    document.querySelectorAll('.contact-fields').forEach(el => el.style.display = 'none');
    selectedCoords = null;
    isSelectingMode = false;
    closeAddForm();

    notificationManager.success(`Метка "${name}" успешно добавлена!`);
}

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function cancelForm() {
    closeAddForm();
    isSelectingMode = false;
    selectedCoords = null;
    if (tempPlacemark) {
        myMap.geoObjects.remove(tempPlacemark);
        tempPlacemark = null;
    }
    // Скрываем поля
    document.querySelectorAll('.contact-fields').forEach(el => el.style.display = 'none');
    notificationManager.info('Добавление объекта отменено');
}

window.onclick = function(event) {
    const modal = document.getElementById('addFormModal');
    if (event.target == modal) {
        cancelForm();
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    init();
});