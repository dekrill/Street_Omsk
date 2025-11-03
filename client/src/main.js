let placemarksData = [
    {
        id: 1,
        name: "Граффити на здании МЕГА",
        description: "Очень большое и красивый рисунок",
        type: "street",
        lat: 54.971793, 
        lng: 73.287233,
        authorName: "VasyaPupkin",
        photo: "images/g2.jpg",
    }, 
    {
        id: 2,
        name: "Стикеры на ленина",
        description: "Капец забомбили столб мне нравится!!!",
        type: "street",
        lat: 54.984475,
        lng: 73.375691,
        authorName: "kiruha",
        photo: "images/g3.jpg"
    }, 
    {
        id: 3,
        name: "Гараж раскрасить",
        description: "Раскрасьте гараж уже не могу страшный до ужаса!!!!!",
        type: "request",
        lat: 55.032979,
        lng: 73.438207,  
        phone: "+7 (999) 123-45-67",
        telegram: "petrovich",
        authorName: "Petr1973RUS",
        photo: "images/garaj.jpg"
    },
    {
        id: 3,
        name: "Ковид19",
        description: "Врачам внатуре респект",
        type: "street",
        lat: 54.976421,
        lng: 73.296961,  
        authorName: "Просто Дима",
        photo: "images/1g.jpg"
    }
];

let uploadPhoto = null;
let myMap;
let myCollection;
let selectedCoords = null;
let isSelectingMode = false;
let tempPlacemark = null;
let currentUser = null;
let nextPlacemarkId = 3;

document.addEventListener('DOMContentLoaded', async function() {
    await init();
});

const api = new Api();
const notificationManager = new NotificationManager();

async function init() {
    const user = localStorage.getItem('currentUser');

    if (!user) {
        await initAuth();
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
