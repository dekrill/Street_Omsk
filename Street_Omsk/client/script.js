// Данные меток
let placemarksData = [
    {
        id: 1,
        name: "Яркая стена на Ленина",
        description: "Большое граффити на торце здания",
        type: "street",
        lat: 54.991553,
        lng: 73.368741,
        authorName: "user"
    },
    {
        id: 2,
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
let nextPlacemarkId = 3;

// Менеджер уведомлений
class NotificationManager {
    constructor() {
        this.container = document.getElementById('notification-container');
    }
    
    show(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        this.container.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);
    }
    
    success(message) {
        this.show(message, 'success');
    }
    
    error(message) {
        this.show(message, 'error');
    }
    
    warning(message) {
        this.show(message, 'warning');
    }
    
    info(message) {
        this.show(message, 'info');
    }
}

const notificationManager = new NotificationManager();

// Функции авторизации
function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
        notificationManager.warning('Введите логин и пароль');
        return;
    }

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
}

function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
}

function showMainApp() {
    document.getElementById('authModal').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    document.getElementById('userGreeting').textContent = `Добро пожаловать, ${currentUser.name}!`;
    
    if (!myMap) {
        ymaps.ready(initMap);
    } else {
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

// Инициализация авторизации
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
        center: [54.992440, 73.368591],
        zoom: 12,
        controls: ['zoomControl']
    });

    myCollection = new ymaps.GeoObjectCollection();
    myMap.geoObjects.add(myCollection);

    // Обработчик смены типа метки
    document.getElementById('placemarkType').addEventListener('change', function() {
        const isRequest = this.value === 'request';
        const contactFields = document.querySelectorAll('.contact-fields');
        contactFields.forEach(el => {
            el.style.display = isRequest ? 'block' : 'none';
        });
    });

    loadPlacemarks();

    // Обработчик клика по карте
    myMap.events.add('click', function (e) {
        if (isSelectingMode) {
            selectedCoords = e.get('coords');
            updateCoordsDisplay();
            
            if (tempPlacemark) {
                myMap.geoObjects.remove(tempPlacemark);
            }
            
            tempPlacemark = new ymaps.Placemark(selectedCoords, {}, {
                iconLayout: 'default#image',
                iconImageHref: 'images/metka_1.png', // Иконка для временной метки
                iconImageSize: [1112, 31112],
                draggable: true
            });
                        
            myMap.geoObjects.add(tempPlacemark);
            
            tempPlacemark.events.add('dragend', function () {
                selectedCoords = tempPlacemark.geometry.getCoordinates();
                updateCoordsDisplay();
            });

            notificationManager.success('Место выбрано! Заполните информацию о метке');
            openFormModal();
            isSelectingMode = false;
        }
    });
}

function getIconForType(type) {
    const icons = {
        'street': 'images/metka_1.png',
        'request': 'images/metka_2.png'
    };
    return icons[type];
}

function loadPlacemarks() {
    myCollection.removeAll();
    placemarksData.forEach(placemark => {
        addPlacemarkToMap(placemark);
    });
}

function addPlacemarkToMap(placemarkData) {
    let balloonContent = `
        <div class="placemark-balloon">
            <div class="placemark-title">${placemarkData.name}</div>
            <div class="placemark-description">${placemarkData.description || 'Описание отсутствует'}</div>
    `;

    if (placemarkData.type === 'request') {
        balloonContent += `<div class="placemark-contacts"><strong>Контакты:</strong><br>`;
        if (placemarkData.phone) {
            balloonContent += `Телефон: ${placemarkData.phone}<br>`;
        }
        if (placemarkData.telegram) {
            balloonContent += `Telegram: @${placemarkData.telegram}`;
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
        : 'islands#greenDotIcon';

    const placemark = new ymaps.Placemark(
        [placemarkData.lat, placemarkData.lng],
        { balloonContent, hintContent: placemarkData.name },
        {
            iconLayout: 'default#image',
            iconImageHref: getIconForType(placemarkData.type), // Ваша PNG-иконка
            iconImageSize: [32, 32], // Размер иконки
            iconImageOffset: [-16, -16], // Смещение для центрирования
        balloonCloseButton: true
        }
    );

    placemark.userData = placemarkData;
    myCollection.add(placemark);
}

// Функции интерфейса
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
    isSelectingMode = false;
    selectedCoords = null;
    if (tempPlacemark) {
        myMap.geoObjects.remove(tempPlacemark);
        tempPlacemark = null;
    }
}

function updateCoordsDisplay() {
    if (selectedCoords) {
        document.getElementById('coordLat').textContent = selectedCoords[0].toFixed(6);
        document.getElementById('coordLng').textContent = selectedCoords[1].toFixed(6);
    }
}

// Обработчик формы добавления метки
document.getElementById('placemarkForm').addEventListener('submit', function(e) {
    e.preventDefault();
    savePlacemark();
});

function savePlacemark() {
    if (!selectedCoords) {
        notificationManager.warning('Сначала выберите место на карте!');
        return;
    }

    const name = document.getElementById('placemarkName').value;
    const description = document.getElementById('placemarkDescription').value;
    const type = document.getElementById('placemarkType').value;

    if (!name) {
        notificationManager.warning('Пожалуйста, введите название метки');
        return;
    }

    const phone = document.getElementById('placemarkPhone').value || null;
    const telegram = document.getElementById('placemarkTelegram').value || null;

    const placemarkData = {
        id: nextPlacemarkId++,
        name,
        description,
        type,
        lat: selectedCoords[0],
        lng: selectedCoords[1],
        authorName: currentUser.name
    };

    if (type === 'request') {
        placemarkData.phone = phone;
        placemarkData.telegram = telegram;
    }

    placemarksData.push(placemarkData);
    addPlacemarkToMap(placemarkData);
    
    document.getElementById('placemarkForm').reset();
    document.querySelectorAll('.contact-fields').forEach(el => el.style.display = 'none');
    closeAddForm();

    notificationManager.success(`Метка "${name}" успешно добавлена!`);
}

// Закрытие модальных окон
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target == modal) {
            if (modal.id === 'addFormModal') {
                closeAddForm();
            } else if (modal.id === 'authModal') {
                closeAuthModal();
            }
        }
    });
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    init();
});