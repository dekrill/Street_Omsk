ymaps.ready(init);

let myMap;
let myCollection;
let selectedCoords = null;
let isSelectingMode = false;
let tempPlacemark = null;
let uploadedPhoto = null;

// Класс для управления уведомлениями
class NotificationManager {
    constructor() {
        this.container = null;
        this.currentNotification = null;
        this.timeoutId = null;
        this.init();
    }
    
    init() {
        this.container = document.getElementById('notification-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notification-container';
            this.container.style.position = 'fixed';
            this.container.style.top = '20px';
            this.container.style.right = '20px';
            this.container.style.zIndex = '10000';
            document.body.appendChild(this.container);
        }
    }
    
    show(message, type = 'info', duration = 5000) {
        // Удаляем предыдущее уведомление
        this.hide();
        
        // Создаем новое уведомление
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">${message}</div>
            <button class="notification-close" onclick="notificationManager.hide()">&times;</button>
        `;
        
        // Добавляем в контейнер
        this.container.appendChild(notification);
        this.currentNotification = notification;
        
        // Показываем с анимацией
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Автоскрытие
        if (duration > 0) {
            this.timeoutId = setTimeout(() => {
                this.hide();
            }, duration);
        }
        
        return notification;
    }
    
    hide() {
        if (this.currentNotification && this.currentNotification.parentNode) {
            const notification = this.currentNotification;
            notification.classList.remove('show');
            notification.classList.add('hiding');
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                this.currentNotification = null;
            }, 300);
        }
        
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }
    
    // Быстрые методы для разных типов уведомлений
    success(message, duration = 5000) {
        return this.show(message, 'success', duration);
    }
    
    error(message, duration = 5000) {
        return this.show(message, 'error', duration);
    }
    
    warning(message, duration = 5000) {
        return this.show(message, 'warning', duration);
    }
    
    info(message, duration = 5000) {
        return this.show(message, 'info', duration);
    }
}

// Создаем глобальный экземпляр
const notificationManager = new NotificationManager();

function init() {
    // Создаем карту
    myMap = new ymaps.Map('map', {
        center: [55.00, 73.24], // Омск
        zoom: 10,
        controls: ['zoomControl'],
    });

    

    // Создаем коллекцию для меток
    myCollection = new ymaps.GeoObjectCollection();
    myMap.geoObjects.add(myCollection);

    // Загружаем сохраненные метки
    loadSavedPlacemarks();

    // Добавляем обработчик клика по карте для выбора координат
    myMap.events.add('click', function (e) {
        console.log('Клик по карте, isSelectingMode:', isSelectingMode);
        
        if (isSelectingMode) {
            selectedCoords = e.get('coords');
            console.log('Координаты выбраны:', selectedCoords);
            
            updateCoordsDisplay();
            
            //Создаем временную метку для preview
            if (tempPlacemark) {
                myMap.geoObjects.remove(tempPlacemark);
            }
            
            tempPlacemark = new ymaps.Placemark(selectedCoords, {}, {
                preset: 'islands#blueDotIcon',
                draggable: true
            });
            
            myMap.geoObjects.add(tempPlacemark);
            
            // Обработчик перетаскивания временной метки
            tempPlacemark.events.add('dragend', function () {
                selectedCoords = tempPlacemark.geometry.getCoordinates();
                updateCoordsDisplay();
            });

            // Показываем уведомление об успешном выборе
            notificationManager.success('Место выбрано! Заполните информацию о метке', 10);
            
            // Открываем форму после небольшой задержки
            setTimeout(() => {
                openFormModal();
            }, 500);
            
            // Выключаем режим выбора
            isSelectingMode = false;
        }
    });
}

function openAddForm() {
    console.log('openAddForm вызван');
    
    // Всегда включаем режим выбора координат при нажатии кнопки
    isSelectingMode = true;
    selectedCoords = null;
    
    // Сбрасываем временную метку если есть
    if (tempPlacemark) {
        myMap.geoObjects.remove(tempPlacemark);
        tempPlacemark = null;
    }
    
    // Сбрасываем отображение координат в форме
    document.getElementById('coordLat').textContent = 'не выбраны';
    document.getElementById('coordLng').textContent = 'не выбраны';
    
    // Показываем уведомление
    notificationManager.info('Кликните на карте для выбора места метки', 5000);
}

function openFormModal() {
    console.log('openFormModal вызван');
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

// Обработчик отправки формы
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
    const photoInput = document.getElementById('placemarkPhoto');
    const file = photoInput.files[0];

    if (!name) {
        notificationManager.warning('Пожалуйста, введите название метки');
        return;
    }

    // Обрабатываем загрузку фото
    if (file) {
        // Проверяем тип файла
        if (!file.type.match('image.*')) {
            notificationManager.error('Пожалуйста, выберите файл изображения');
            return;
        }
        
        // Проверяем размер файла (максимум 5MB)
        if (file.size > 5 * 1024 * 1024) {
            notificationManager.error('Файл слишком большой. Максимальный размер: 5MB');
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            uploadedPhoto = e.target.result;
            createAndSavePlacemark(name, description, uploadedPhoto);
        };
        
        reader.onerror = function() {
            notificationManager.error('Ошибка при чтении файла');
        };
        
        reader.readAsDataURL(file);
    } else {
        createAndSavePlacemark(name, description, null);
    }
}

function createAndSavePlacemark(name, description, photoSource) {
    // Создаем содержимое для балуна
    let balloonContent = `
        <div class="placemark-balloon">
            <div class="placemark-title">${name}</div>
    `;

    if (photoSource) {
        balloonContent += `<img src="${photoSource}" alt="${name}" class="placemark-photo">`;
    }

    balloonContent += `
            <div class="placemark-description">${description || 'Описание отсутствует'}</div>
            <div class="placemark-coords">
                Координаты: ${selectedCoords[0].toFixed(6)}, ${selectedCoords[1].toFixed(6)}
            </div>
        </div>
    `;

    // Удаляем временную метку
    if (tempPlacemark) {
        myMap.geoObjects.remove(tempPlacemark);
        tempPlacemark = null;
    }

    // Создаем постоянную метку
    const placemark = new ymaps.Placemark(selectedCoords, {
        balloonContent: balloonContent,
        hintContent: name
    }, {
        preset: 'islands#greenDotIcon',
        balloonCloseButton: true,
        hideIconOnBalloonOpen: false,
        draggable: false
    });

    // Сохраняем данные метки
    const placemarkData = {
        name: name,
        description: description,
        photoSource: photoSource,
        coords: selectedCoords,
        balloonContent: balloonContent
    };

    placemark.userData = placemarkData;

    // Добавляем обработчик перетаскивания для постоянной метки
    placemark.events.add('dragend', function () {
        const newCoords = placemark.geometry.getCoordinates();
        placemarkData.coords = newCoords;
        
        // Обновляем балун с новыми координатами
        const updatedBalloonContent = balloonContent.replace(
            /Координаты: [^<]+/,
            `Координаты: ${newCoords[0].toFixed(6)}, ${newCoords[1].toFixed(6)}`
        );
        placemarkData.balloonContent = updatedBalloonContent;
        placemark.properties.set('balloonContent', updatedBalloonContent);
        
        // Обновляем в localStorage
        updatePlacemarkInStorage(placemarkData);
        
        notificationManager.info(`Координаты метки "${name}" обновлены`);
    });

    // Добавляем обработчик для удаления метки по правому клику
    placemark.events.add('contextmenu', function (e) {
        e.preventDefault();
        if (confirm(`Удалить метку "${name}"?`)) {
            myCollection.remove(placemark);
            removePlacemarkFromStorage(placemarkData);
            notificationManager.info(`Метка "${name}" удалена`);
        }
    });

    // Добавляем метку в коллекцию
    myCollection.add(placemark);

    // Сохраняем в localStorage
    saveToLocalStorage(placemarkData);

    // Сбрасываем форму
    document.getElementById('placemarkForm').reset();
    uploadedPhoto = null;
    selectedCoords = null;
    isSelectingMode = false;
    
    // Закрываем форму
    closeAddForm();

    // Показываем уведомление об успехе
    notificationManager.success(`Метка "${name}" успешно добавлена!`);
}

// Обработчик кнопки "Отмена" в форме
function cancelForm() {
    closeAddForm();
    isSelectingMode = false;
    selectedCoords = null;
    if (tempPlacemark) {
        myMap.geoObjects.remove(tempPlacemark);
        tempPlacemark = null;
    }
    notificationManager.info('Добавление объекта отменено');
}

// Остальные функции без изменений
function saveToLocalStorage(placemarkData) {
    let savedPlacemarks = JSON.parse(localStorage.getItem('placemarks')) || [];
    savedPlacemarks.push(placemarkData);
    localStorage.setItem('placemarks', JSON.stringify(savedPlacemarks));
}

function updatePlacemarkInStorage(updatedData) {
    let savedPlacemarks = JSON.parse(localStorage.getItem('placemarks')) || [];
    const index = savedPlacemarks.findIndex(p => 
        p.name === updatedData.name && 
        JSON.stringify(p.coords) === JSON.stringify(updatedData.coords)
    );
    
    if (index !== -1) {
        savedPlacemarks[index] = updatedData;
        localStorage.setItem('placemarks', JSON.stringify(savedPlacemarks));
    }
}

function removePlacemarkFromStorage(placemarkData) {
    let savedPlacemarks = JSON.parse(localStorage.getItem('placemarks')) || [];
    savedPlacemarks = savedPlacemarks.filter(p => 
        !(p.name === placemarkData.name && JSON.stringify(p.coords) === JSON.stringify(placemarkData.coords))
    );
    localStorage.setItem('placemarks', JSON.stringify(savedPlacemarks));
}

function loadSavedPlacemarks() {
    const savedPlacemarks = JSON.parse(localStorage.getItem('placemarks')) || [];
    
    savedPlacemarks.forEach(data => {
        const placemark = new ymaps.Placemark(data.coords, {
            balloonContent: data.balloonContent,
            hintContent: data.name
        }, {
            preset: 'islands#greenDotIcon',
            balloonCloseButton: true,
            draggable: false
        });

        placemark.userData = data;
        
        // Добавляем обработчики для загруженных меток
        placemark.events.add('dragend', function () {
            const newCoords = placemark.geometry.getCoordinates();
            data.coords = newCoords;
            
            const updatedBalloonContent = data.balloonContent.replace(
                /Координаты: [^<]+/,
                `Координаты: ${newCoords[0].toFixed(6)}, ${newCoords[1].toFixed(6)}`
            );
            data.balloonContent = updatedBalloonContent;
            placemark.properties.set('balloonContent', updatedBalloonContent);
            
            updatePlacemarkInStorage(data);
        });

        placemark.events.add('contextmenu', function (e) {
            e.preventDefault();
            if (confirm(`Удалить метку "${data.name}"?`)) {
                myCollection.remove(placemark);
                removePlacemarkFromStorage(data);
                notificationManager.info(`Метка "${data.name}" удалена`);
            }
        });

        myCollection.add(placemark);
    });
}

// Закрытие модального окна при клике вне его
window.onclick = function(event) {
    const modal = document.getElementById('addFormModal');
    if (event.target == modal) {
        cancelForm();
    }
}