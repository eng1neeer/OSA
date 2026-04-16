// ================= КОНФИГУРАЦИЯ =================
const KONAEV_CENTER = {lat: 43.865, lng: 77.053};

// ⚠️ ВОТ ЗДЕСЬ ТЫ МЕНЯЕШЬ РАДИУС ЗОНЫ (в километрах)
const SERVICE_RADIUS_KM = 5;  // ← поменяй это число на нужное тебе

const MIN_PRICE = 600;
const PRICE_PER_100M = 30;

// ТВОЙ URL ВЕБ-ПРИЛОЖЕНИЯ (Google Apps Script)
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxgJhCrJIgH06ozkC5ujXkb08GPOvlD8X8KR-wNnr0oE-FotQySIQ9qg95syj0W7TJt/exec';

// ================= ЛОКАЛИЗАЦИЯ =================
const i18n = {
  ru: {
    orderTitle: 'Оформление заказа',
    calcBtn: 'Рассчитать стоимость',
    sendOrder: 'СОЗДАТЬ ЗАКАЗ',
    success: '✅ Заказ принят! Оператор свяжется с вами',
    price: 'Цена',
    support: 'Поддержка',
    step: 'Шаг 1 из 2',
    fromLabel: '📍 Откуда забрать',
    toLabel: '🎯 Куда доставить',
    packageLabel: '📦 Информация о товаре',
    phoneLabel: '📞 Контактный телефон',
    sizePlaceholder: 'Размеры (например: 50×40×30 см)',
    productPlaceholder: 'Название товара',
    senderPlaceholder: 'Имя отправителя',
    receiverPlaceholder: 'Имя получателя',
    phonePlaceholder: '+7 7xx xxx xx xx',
    actionNote: 'Нажмите чтобы создать заказ',
    instructions: 'Как это работает:',
    step1: 'Заполните форму и рассчитайте стоимость',
    step2: 'Нажмите кнопку отправки',
    step3: 'Заказ автоматически отправится оператору',
    step4: 'Дождитесь подтверждения',
    errorRequired: 'Заполните обязательные поля: адрес, дом, телефон',
    errorPrice: 'Точки вне зоны обслуживания',
    sending: 'Отправка...'
  },
  kz: {
    orderTitle: 'Тапсырыс беру',
    calcBtn: 'Жіберу құнын есептеу',
    sendOrder: 'ТАПСЫРЫС ЖАСАУ',
    success: '✅ Тапсырыс қабылданды!',
    price: 'Бағасы',
    support: 'Қолдау',
    step: '1-қадам 2-ден',
    fromLabel: '📍 Қайдан алу',
    toLabel: '🎯 Қайда жеткізу',
    packageLabel: '📦 Тауар туралы',
    phoneLabel: '📞 Телефон',
    sizePlaceholder: 'Өлшемдер (50×40×30 см)',
    productPlaceholder: 'Тауар атауы',
    senderPlaceholder: 'Жіберуші аты',
    receiverPlaceholder: 'Алушы аты',
    phonePlaceholder: '+7 7xx xxx xx xx',
    actionNote: 'Тапсырыс жасау',
    instructions: 'Қалай жұмыс істейді:',
    step1: 'Форманы толтырыңыз',
    step2: 'Жіберу түймесін басыңыз',
    step3: 'Тапсырыс операторға жіберіледі',
    step4: 'Растауды күтіңіз',
    errorRequired: 'Міндетті өрістерді толтырыңыз',
    errorPrice: 'Нүктелер қызмет аймағынан тыс',
    sending: 'Жіберу...'
  }
};

let currentLang = 'ru';

// ================= ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =================
function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = v => v * Math.PI / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + 
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
            Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function inServiceArea(lat, lng) {
  return haversineDistance(lat, lng, KONAEV_CENTER.lat, KONAEV_CENTER.lng) <= SERVICE_RADIUS_KM;
}

function calculatePrice() {
  const a = markerA.getLatLng();
  const b = markerB.getLatLng();
  
  if (!inServiceArea(a.lat, a.lng) || !inServiceArea(b.lat, b.lng)) {
    document.querySelector('.price-amount').textContent = 'Вне зоны';
    document.querySelector('.price-label').textContent = 'доставка невозможна';
    return null;
  }
  
  const km = haversineDistance(a.lat, a.lng, b.lat, b.lng);
  let price = 0;
  
  if (km <= 1.5) {
    price = MIN_PRICE;
  } else {
    const meters = km * 1000;
    const metersAfter1500 = meters - 1500;
    const hundredMeterBlocks = Math.ceil(metersAfter1500 / 100);
    price = MIN_PRICE + (hundredMeterBlocks * PRICE_PER_100M);
  }
  
  price = Math.round(price);
  document.querySelector('.price-amount').textContent = `${price} ₸`;
  document.querySelector('.price-label').textContent = `≈ ${km.toFixed(1)} км`;
  return { km, price };
}

// ================= ОТПРАВКА ЗАКАЗА НА СЕРВЕР =================
async function sendOrderToServer(orderData) {
  await fetch(SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  });
  return { success: true };
}

// ================= ОСНОВНАЯ ФУНКЦИЯ ОТПРАВКИ =================
async function submitOrder() {
  const fromHouse = document.getElementById('fromHouse').value.trim();
  const toHouse = document.getElementById('toHouse').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const fromAddress = document.getElementById('fromAddress').value.trim();
  const toAddress = document.getElementById('toAddress').value.trim();
  
  if (!fromAddress || !toAddress || !fromHouse || !toHouse || !phone) {
    alert(i18n[currentLang].errorRequired);
    return;
  }
  
  const priceInfo = calculatePrice();
  if (!priceInfo) {
    alert(i18n[currentLang].errorPrice);
    return;
  }
  
  const a = markerA.getLatLng();
  const b = markerB.getLatLng();
  
  const orderData = {
    fromAddress: fromAddress,
    fromHouse: fromHouse,
    fromApt: document.getElementById('fromApt').value.trim(),
    fromFloor: document.getElementById('fromFloor').value.trim(),
    senderName: document.getElementById('senderName').value.trim(),
    toAddress: toAddress,
    toHouse: toHouse,
    toApt: document.getElementById('toApt').value.trim(),
    toFloor: document.getElementById('toFloor').value.trim(),
    receiverName: document.getElementById('receiverName').value.trim(),
    phone: phone,
    productName: document.getElementById('productName').value.trim(),
    size: document.getElementById('size').value.trim(),
    price: priceInfo.price,
    coordsA: `${a.lat},${a.lng}`,
    coordsB: `${b.lat},${b.lng}`,
    status: 'Новый',
    timestamp: new Date().toISOString()
  };
  
  const btn = document.getElementById('sendOrder');
  const originalText = btn.innerHTML;
  btn.innerHTML = `<span class="btn-icon">⏳</span>${i18n[currentLang].sending}`;
  btn.disabled = true;
  
  try {
    await sendOrderToServer(orderData);
    alert(i18n[currentLang].success);
  } catch (error) {
    console.error('Ошибка:', error);
    alert('Ошибка отправки. Позвоните по номеру поддержки.');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

// ================= ИНИЦИАЛИЗАЦИЯ КАРТЫ И МАРКЕРОВ =================
const map = L.map('map').setView([KONAEV_CENTER.lat, KONAEV_CENTER.lng], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap'
}).addTo(map);

// Зона обслуживания (синяя с жёлтой обводкой)
L.circle([KONAEV_CENTER.lat, KONAEV_CENTER.lng], {
  radius: SERVICE_RADIUS_KM * 1000,
  color: '#FFFF00',
  fillColor: '#0000F6',
  fillOpacity: 0.2,
  weight: 3
}).addTo(map);

// Кастомные иконки для меток A и Б
const iconA = L.divIcon({
  html: '<div style="background: #FFFF00; color: #0000F6; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; border: 2px solid #0000F6; box-shadow: 0 0 10px rgba(255,255,0,0.8);">A</div>',
  iconSize: [30, 30],
  className: 'custom-marker-a'
});

const iconB = L.divIcon({
  html: '<div style="background: #FFFF00; color: #0000F6; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; border: 2px solid #0000F6; box-shadow: 0 0 10px rgba(255,255,0,0.8);">Б</div>',
  iconSize: [30, 30],
  className: 'custom-marker-b'
});

let markerA = L.marker([KONAEV_CENTER.lat, KONAEV_CENTER.lng], { draggable: true, icon: iconA }).addTo(map);
let markerB = L.marker([KONAEV_CENTER.lat + 0.01, KONAEV_CENTER.lng + 0.01], { draggable: true, icon: iconB }).addTo(map);

markerA.on('dragend', () => {
  calculatePrice();
  // Координаты НЕ показываем пользователю — они уходят в систему скрыто
});
markerB.on('dragend', () => {
  calculatePrice();
  // Координаты НЕ показываем пользователю
});

// Поля адресов теперь НЕ показывают координаты — пользователь сам пишет адрес
function updateAddressFields() {
  // Ничего не делаем — пользователь сам вводит адрес текстом
  // Координаты собираются и отправляются скрыто
}

// ================= ПРИМЕНЕНИЕ ЯЗЫКА =================
function applyLang() {
  const t = i18n[currentLang];
  document.getElementById('orderTitle').textContent = t.orderTitle;
  document.getElementById('calcBtn').innerHTML = `<span class="btn-icon">💰</span>${t.calcBtn}`;
  document.getElementById('sendOrder').innerHTML = `<span class="btn-icon">🚀</span>${t.sendOrder}`;
  document.querySelector('.step-indicator').textContent = t.step;
  if (document.querySelectorAll('.lbl').length >= 4) {
    document.querySelectorAll('.lbl')[0].textContent = t.fromLabel;
    document.querySelectorAll('.lbl')[1].textContent = t.toLabel;
    document.querySelectorAll('.lbl')[2].textContent = t.packageLabel;
    document.querySelectorAll('.lbl')[3].textContent = t.phoneLabel;
  }
  document.querySelector('.action-note').textContent = t.actionNote;
  document.getElementById('size').placeholder = t.sizePlaceholder;
  document.getElementById('productName').placeholder = t.productPlaceholder;
  document.getElementById('senderName').placeholder = t.senderPlaceholder;
  document.getElementById('receiverName').placeholder = t.receiverPlaceholder;
  document.getElementById('phone').placeholder = t.phonePlaceholder;
}

// ================= НАВЕШИВАЕМ ОБРАБОТЧИКИ =================
document.getElementById('langBtn').addEventListener('click', () => {
  currentLang = (currentLang === 'ru') ? 'kz' : 'ru';
  const langText = document.querySelector('.lang-text');
  const langFlag = document.querySelector('.lang-flag');
  if (currentLang === 'kz') {
    langText.textContent = 'РУС';
    langFlag.textContent = '🇷🇺';
  } else {
    langText.textContent = 'КЗ';
    langFlag.textContent = '🇰🇿';
  }
  applyLang();
});

document.getElementById('calcBtn').addEventListener('click', () => {
  calculatePrice();
  const priceDisplay = document.querySelector('.price-display');
  priceDisplay.style.transform = 'scale(1.05)';
  setTimeout(() => priceDisplay.style.transform = 'scale(1)', 200);
});

document.getElementById('sendOrder').addEventListener('click', submitOrder);

// ================= ЗАПУСК =================
applyLang();
calculatePrice();
