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

document.addEventListener('DOMContentLoaded', function() {
    init();
});

const notificationManager = new NotificationManager();

function init() {
    const user = localStorage.getItem('currentUser');

    if (!user) {
        initAuth();
        return;
    }

    currentUser = JSON.parse(user);
    showMainApp();
}

function showMainApp() {
    document.getElementById('authModal').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    
    if (!myMap) {
        ymaps.ready(initMap);
    } else {
        loadPlacemarks();
    }
}
