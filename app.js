const SERVICE_KEY = 'cleaningServices-v1';
const installButton = document.getElementById('installButton');
const serviceSearch = document.getElementById('serviceSearch');
const serviceForm = document.getElementById('serviceForm');
const servicesList = document.getElementById('servicesList');
const orderPanel = document.getElementById('orderPanel');
const orderTotal = document.getElementById('orderTotal');
const clearSelection = document.getElementById('clearSelection');

let deferredPrompt = null;
let services = [];
let selectedQuantities = {};
let selectedPrices = {};
let searchQuery = '';
let petSurchargePercent = 10;
let ecoChemistryAmount = 70;
let petSurchargeEnabled = false;
let ecoChemistryEnabled = false;
let collapsedCategories = { cleaning: true, drycleaning: false, extra: true };

const PDF_TRANSLATIONS = {
  uk: {
    title: 'Розрахунок клінінга',
    date: 'Дата',
    service: 'Послуга',
    category: 'Категорія',
    subcategory: 'Підкатегорія',
    quantity: 'Кількість',
    price: 'Ціна',
    sum: 'Сума',
    totalServices: 'Загальна сума послуг',
    totalWithSurcharges: 'Загальна сума з націнками',
    petSurcharge: 'Націнка за домашню тварину',
    ecoChemistry: 'Екологічна хімія',
  },
  ro: {
    title: 'Calcul curățenie',
    date: 'Dată',
    service: 'Serviciu',
    category: 'Categorie',
    subcategory: 'Subcategorie',
    quantity: 'Cantitate',
    price: 'Preț',
    sum: 'Sumă',
    totalServices: 'Sumă totală servicii',
    totalWithSurcharges: 'Sumă totală cu adaosuri',
    petSurcharge: 'Majorare pentru animal de companie',
    ecoChemistry: 'Chimie ecologică',
  },
};

const CATEGORY_LABELS = {
  cleaning: 'Прибирання',
  drycleaning: 'Хімчистка',
  extra: 'Додаткові послуги',
};

const CATEGORY_ORDER = ['cleaning', 'drycleaning', 'extra'];

const PDF_CATEGORY_LABELS = {
  uk: CATEGORY_LABELS,
  ro: {
    cleaning: 'Curățenie',
    drycleaning: 'Curățare chimică',
    extra: 'Servicii suplimentare',
  },
};

const PDF_SUBCATEGORY_TRANSLATIONS = {
  'підтримуюче прибирання': 'Curățenie de întreținere',
  'Генеральне прибирання': 'Curățenie generală',
  'Дивани': 'Canapele',
  'Стільці та крісла': 'Scaune și fotolii',
  'Каркаси ліжка та узголів\'я': 'Cadre pat și căpătâi',
  'Матраци': 'Saltele',
  'Інше': 'Altele',
  'кухня': 'Bucătărie',
  'санвузол': 'Grup sanitar',
  'вітальня': 'Living',
  'спальня': 'Dormitor',
  'балкон': 'Balcon',
  'веранда': 'Verandă',
  "подвір'я": 'Curte',
};

const UNIT_TRANSLATIONS = {
  uk: {
    'м²': 'м²',
    'м.п.': 'м.п.',
    'год.': 'год.',
    'шт.': 'шт.',
  },
  ro: {
    'м²': 'mp',
    'м.п.': 'ml',
    'год.': 'ore',
    'шт.': 'buc.',
  },
};

const defaultServices = [
  { id: crypto.randomUUID(), name: 'Базове прибирання', price: 350, unit: 'год.', category: 'cleaning', subcategory: '', isRange: false, minPrice: 350, maxPrice: 350 },
  { id: crypto.randomUUID(), name: 'Глибоке прибирання', price: 650, unit: 'м²', category: 'cleaning', subcategory: '', isRange: false, minPrice: 650, maxPrice: 650 },
  { id: crypto.randomUUID(), name: 'Хімчистка дивана', price: 200, unit: 'шт.', category: 'drycleaning', subcategory: 'Дивани', isRange: false, minPrice: 200, maxPrice: 200 },
  { id: crypto.randomUUID(), name: 'Миття вікон', price: 120, unit: 'шт.', category: 'extra', subcategory: 'вітальня', isRange: false, minPrice: 120, maxPrice: 120 },
  { id: crypto.randomUUID(), name: 'Миття карнизів', price: 50, unit: 'м.п.', category: 'extra', subcategory: 'вітальня', isRange: false, minPrice: 50, maxPrice: 50 },
];

function loadServices() {
  try {
    const stored = localStorage.getItem(SERVICE_KEY);
    services = stored ? JSON.parse(stored) : defaultServices;
  } catch (error) {
    services = defaultServices;
  }
  services.forEach((service) => {
    if (!service.category) {
      service.category = 'cleaning';
    }
    if (!service.subcategory) {
      if (service.category === 'cleaning') {
        service.subcategory = '';
      } else if (service.category === 'drycleaning') {
        service.subcategory = 'Дивани';
      } else {
        service.subcategory = 'кухня';
      }
    }
    if (service.isRange === undefined) {
      service.isRange = false;
    }
    if (service.minPrice === undefined) {
      service.minPrice = service.price || 0;
    }
    if (service.maxPrice === undefined) {
      service.maxPrice = service.price || 0;
    }
    if (!(service.id in selectedQuantities)) {
      selectedQuantities[service.id] = 0;
    }
  });
}

function saveServices() {
  localStorage.setItem(SERVICE_KEY, JSON.stringify(services));
}

function formatPrice(value) {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency', currency: 'RON', maximumFractionDigits: 2,
  }).format(value);
}

function renderServices() {
  servicesList.innerHTML = '';
  if (!services.length) {
    servicesList.innerHTML = '<p>Поки що послуг немає. Додайте першу послугу.</p>';
    return;
  }

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!filteredServices.length) {
    servicesList.innerHTML = '<p>Послуг не знайдено за запитом.</p>';
    return;
  }

  const grouped = filteredServices.reduce((acc, service) => {
    const category = CATEGORY_LABELS[service.category] ? service.category : 'cleaning';
    acc[category] = acc[category] || [];
    acc[category].push(service);
    return acc;
  }, {});

  CATEGORY_ORDER.forEach((category) => {
    const group = grouped[category] || [];
    if (!group.length) return;

    group.sort((a, b) => a.name.localeCompare(b.name));

    const groupSection = document.createElement('div');
    groupSection.className = 'service-group';
    
    const titleButton = document.createElement('button');
    titleButton.className = 'service-group-title';
    titleButton.type = 'button';
    titleButton.dataset.category = category;
    titleButton.innerHTML = `<span>${CATEGORY_LABELS[category]}</span><span class="accordion-icon">▼</span>`;
    titleButton.addEventListener('click', (e) => {
      e.preventDefault();
      collapsedCategories[category] = !collapsedCategories[category];
      renderServices();
    });
    groupSection.append(titleButton);

    const groupContent = document.createElement('div');
    groupContent.className = 'service-group-content';
    if (collapsedCategories[category]) {
      groupContent.classList.add('collapsed');
    }

    group.forEach((service) => {
      const selected = selectedQuantities[service.id] > 0;
      const card = document.createElement('article');
      card.className = 'service-card';
      card.innerHTML = `
        <div>
          <h4>${service.name}</h4>
          <div class="service-meta">
            <span>${service.isRange ? formatPrice(service.minPrice) + ' - ' + formatPrice(service.maxPrice) : formatPrice(service.minPrice)} за ${service.unit || 'одиницю'}</span>
            <span>${service.category === 'cleaning' ? '' : (service.category === 'drycleaning' ? 'Тип хімчистки' : 'Приміщення') + ': ' + service.subcategory}</span>
          </div>
        </div>
        <div class="service-actions">
          <button class="small-button" data-action="toggle" data-id="${service.id}">${selected ? 'Видалити з розрахунку' : 'Додати до розрахунку'}</button>
          <button class="small-button" data-action="edit" data-id="${service.id}">Редагувати</button>
          <button class="small-button" data-action="remove" data-id="${service.id}">Видалити</button>
        </div>
      `;
      groupContent.append(card);
    });

    groupSection.append(groupContent);

    servicesList.append(groupSection);
  });
}

function renderOrderPanel() {
  orderPanel.innerHTML = '';
  const selectedServices = services.filter((service) => selectedQuantities[service.id] > 0);
  if (!selectedServices.length) {
    orderPanel.innerHTML = '<p>Виберіть послугу з бази послуг, щоб додати її до розрахунку.</p>';
    updateTotal();
    return;
  }

  selectedServices.forEach((service) => {
    const currentPrice = selectedPrices[service.id] || service.minPrice;
    const card = document.createElement('article');
    card.className = 'order-card';
    const priceInputHtml = service.isRange ? `
      <div class="price-range">
        <input type="range" min="${service.minPrice}" max="${service.maxPrice}" value="${currentPrice}" step="0.01" data-id="${service.id}" class="order-price-range" />
        <input type="number" min="0" step="0.01" value="${currentPrice}" data-id="${service.id}" class="order-price" />
      </div>
    ` : `
      <input type="number" min="0" step="0.01" value="${currentPrice}" data-id="${service.id}" class="order-price" />
    `;
    card.innerHTML = `
      <div>
        <h3>${service.name}</h3>
        <div class="order-meta">
          <span>${service.isRange ? formatPrice(service.minPrice) + ' - ' + formatPrice(service.maxPrice) : formatPrice(service.minPrice)} за ${service.unit || 'одиницю'}</span>
          <span>Категорія: ${CATEGORY_LABELS[service.category] || 'Прибирання'}</span>
          <span>${service.category === 'cleaning' ? '' : (service.category === 'drycleaning' ? 'Тип хімчистки' : 'Приміщення') + ': ' + service.subcategory}</span>
        </div>
      </div>
      <div class="order-actions">
        <label>
          Кількість (${service.unit})
          <input type="number" min="0" value="${selectedQuantities[service.id] || 0}" data-id="${service.id}" class="order-quantity" />
        </label>
        <label>
          Ціна за одиницю (RON)
          ${priceInputHtml}
        </label>
        <button class="small-button" data-action="toggle" data-id="${service.id}">Видалити з розрахунку</button>
      </div>
    `;
    orderPanel.append(card);
  });
  updateTotal();
}

function updateTotal() {
  const total = services.reduce((sum, service) => {
    const qty = Number(selectedQuantities[service.id] || 0);
    const price = Number(selectedPrices[service.id] || (service.isRange ? service.minPrice : service.price));
    return sum + Math.max(qty, 0) * price;
  }, 0);

  let finalTotal = total;

  // Націнка за домашню тварину (тільки для прибирання)
  if (petSurchargeEnabled) {
    const cleaningServices = services.filter(service =>
      selectedQuantities[service.id] > 0 && service.category === 'cleaning'
    );
    const cleaningTotal = cleaningServices.reduce((sum, service) => {
      const qty = Number(selectedQuantities[service.id] || 0);
      const price = Number(selectedPrices[service.id] || (service.isRange ? service.minPrice : service.price));
      return sum + Math.max(qty, 0) * price;
    }, 0);
    finalTotal += cleaningTotal * (petSurchargePercent / 100);
  }

  // Націнка за екологічну хімію
  if (ecoChemistryEnabled) {
    finalTotal += ecoChemistryAmount;
  }

  orderTotal.textContent = formatPrice(finalTotal);
}

function addService(event) {
  event.preventDefault();
  const name = document.getElementById('serviceName').value.trim();
  const nameRo = document.getElementById('serviceNameRo').value.trim();
  const unit = document.getElementById('serviceUnit').value;
  const category = document.getElementById('serviceCategory').value;
  const isRange = document.getElementById('servicePriceRange').checked;

  if (!name) {
    return;
  }

  let minPrice, maxPrice;
  if (isRange) {
    minPrice = Number(document.getElementById('serviceMinPrice').value) || 0;
    maxPrice = Number(document.getElementById('serviceMaxPrice').value) || 0;
    if (minPrice > maxPrice) {
      alert('Мінімальна ціна не може бути більше максимальної.');
      return;
    }
  } else {
    const price = Number(document.getElementById('servicePrice').value);
    if (Number.isNaN(price) || price < 0) {
      return;
    }
    minPrice = maxPrice = price;
  }

  let subcategory = '';
  if (category === 'drycleaning') {
    subcategory = document.getElementById('serviceDrycleaningType').value;
  } else if (category === 'extra') {
    subcategory = document.getElementById('serviceRoom').value;
  }
  const service = { id: crypto.randomUUID(), name, nameRo, unit, category, subcategory, isRange, minPrice, maxPrice };
  services.unshift(service);
  selectedQuantities[service.id] = 0;
  saveServices();
  renderServices();
  renderOrderPanel();
  serviceForm.reset();
}

function handleServiceAction(event) {
  const button = event.target.closest('button');
  if (!button) return;
  const action = button.dataset.action;
  const id = button.dataset.id;
  const service = services.find((item) => item.id === id);
  if (!service) return;

  if (action === 'remove') {
    services = services.filter((item) => item.id !== id);
    delete selectedQuantities[id];
    saveServices();
    renderServices();
    renderOrderPanel();
  }

  if (action === 'edit') {
    const newName = prompt('Назва послуги', service.name)?.trim();
    const newNameRo = prompt('Назва послуги румунською (тільки для PDF)', service.nameRo || '')?.trim();
    const newPrice = Number(prompt('Ціна за одиницю (RON)', service.price));
    const newUnit = prompt('Одиниця виміру', service.unit)?.trim();
    let subcategoryLabel = '';
    if (service.category === 'drycleaning') {
      subcategoryLabel = 'Тип хімчистки';
    } else if (service.category === 'extra') {
      subcategoryLabel = 'Приміщення';
    }
    const newSubcategory = subcategoryLabel ? prompt(subcategoryLabel, service.subcategory)?.trim() : '';
    if (newName && !Number.isNaN(newPrice) && newPrice >= 0) {
      service.name = newName;
      service.nameRo = newNameRo || service.nameRo;
      service.subcategory = newSubcategory || service.subcategory;
      saveServices();
      renderServices();
      renderOrderPanel();
    }
  }

  if (action === 'toggle') {
    selectedQuantities[id] = selectedQuantities[id] > 0 ? 0 : 1;
    renderServices();
    renderOrderPanel();
  }
}

function handleOrderInput(event) {
  const input = event.target;
  if (input.tagName !== 'INPUT' || (input.type !== 'number' && input.type !== 'range')) return;
  const id = input.dataset.id;
  const value = Number(input.value);
  
  if (input.classList.contains('order-quantity')) {
    selectedQuantities[id] = Number.isNaN(value) ? 0 : Math.max(0, value);
  } else if (input.classList.contains('order-price') || input.classList.contains('order-price-range')) {
    selectedPrices[id] = Number.isNaN(value) ? 0 : Math.max(0, value);
    // Синхронізувати slider і input
    const card = input.closest('.order-card');
    const rangeInput = card.querySelector('.order-price-range');
    const numberInput = card.querySelector('.order-price');
    if (input === rangeInput) {
      numberInput.value = value;
    } else if (input === numberInput) {
      if (rangeInput) {
        rangeInput.value = value;
      }
    }
  }
  updateTotal();
}

function handleToggleSelection(event) {
  const button = event.target.closest('button');
  if (!button || button.dataset.action !== 'toggle') return;
  const id = button.dataset.id;
  selectedQuantities[id] = selectedQuantities[id] > 0 ? 0 : 1;
  renderServices();
  renderOrderPanel();
}

function getTranslatedLabel(key, language = 'uk') {
  return PDF_TRANSLATIONS[language][key] || PDF_TRANSLATIONS.uk[key];
}

function translateCategory(category, language = 'uk') {
  return PDF_CATEGORY_LABELS[language][category] || category;
}

function translateSubcategory(subcategory, language = 'uk') {
  if (language === 'ro') {
    return PDF_SUBCATEGORY_TRANSLATIONS[subcategory] || subcategory;
  }
  return subcategory;
}

function translateUnit(unit, language = 'uk') {
  if (language === 'ro') {
    return UNIT_TRANSLATIONS.ro[unit] || unit;
  }
  return unit;
}

function generatePDF() {
  const pdfLanguage = document.getElementById('pdfLanguage').value;
  const selectedServices = services.filter(service => selectedQuantities[service.id] > 0);
  if (!selectedServices.length) {
    alert(pdfLanguage === 'ro' ? 'Nu există servicii selectate pentru export.' : 'Немає вибраних послуг для експорту.');
    return;
  }

  const rows = selectedServices.map(service => {
    const qty = selectedQuantities[service.id] || 0;
    const price = selectedPrices[service.id] || (service.isRange ? service.minPrice : service.price);
    const sum = qty * price;
    return {
      name: pdfLanguage === 'ro' && service.nameRo ? service.nameRo : service.name,
      qty: `${qty} ${translateUnit(service.unit, pdfLanguage)}`,
      price: formatPrice(price),
      sum: formatPrice(sum),
      category: translateCategory(service.category, pdfLanguage),
      subcategory: translateSubcategory(service.subcategory, pdfLanguage),
    };
  });

  const total = rows.reduce((sum, row) => {
    return sum + Number(row.sum.replace(/[^0-9.,]+/g, '').replace(',', '.'));
  }, 0);

  let finalTotal = total;
  let surcharges = [];

  if (petSurchargeEnabled) {
    const cleaningServices = services.filter(service =>
      selectedQuantities[service.id] > 0 && service.category === 'cleaning'
    );
    const cleaningTotal = cleaningServices.reduce((sum, service) => {
      const qty = Number(selectedQuantities[service.id] || 0);
      const price = Number(selectedPrices[service.id] || service.price);
      return sum + Math.max(qty, 0) * price;
    }, 0);
    const petSurcharge = cleaningTotal * (petSurchargePercent / 100);
    finalTotal += petSurcharge;
    surcharges.push(`${getTranslatedLabel('petSurcharge', pdfLanguage)} (${petSurchargePercent}%): ${formatPrice(petSurcharge)}`);
  }

  if (ecoChemistryEnabled) {
    finalTotal += ecoChemistryAmount;
    surcharges.push(`${getTranslatedLabel('ecoChemistry', pdfLanguage)}: ${formatPrice(ecoChemistryAmount)}`);
  }

  const html = `<!DOCTYPE html>
<html lang="${pdfLanguage === 'ro' ? 'ro' : 'uk'}">
<head>
  <meta charset="UTF-8" />
  <title>${getTranslatedLabel('title', pdfLanguage)}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #17212b; }
    h1 { margin: 0 0 8px; font-size: 24px; }
    .meta { margin-bottom: 24px; color: #44515f; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #cbd7e6; padding: 10px 12px; }
    th { background: #f2f8ff; text-align: left; }
    tbody tr:nth-child(even) { background: #fafcff; }
    tfoot td { border-top: 2px solid #1d5c8d; font-weight: bold; }
    .small { color: #556d85; font-size: 0.95rem; }
  </style>
</head>
<body>
  <h1>${getTranslatedLabel('title', pdfLanguage)}</h1>
  <div class="meta">${getTranslatedLabel('date', pdfLanguage)}: ${new Date().toLocaleDateString(pdfLanguage === 'ro' ? 'ro-RO' : 'uk-UA')}</div>
  <table>
    <thead>
      <tr>
        <th>${getTranslatedLabel('service', pdfLanguage)}</th>
        <th>${getTranslatedLabel('category', pdfLanguage)}</th>
        <th>${getTranslatedLabel('subcategory', pdfLanguage)}</th>
        <th>${getTranslatedLabel('quantity', pdfLanguage)}</th>
        <th>${getTranslatedLabel('price', pdfLanguage)}</th>
        <th>${getTranslatedLabel('sum', pdfLanguage)}</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map(row => `
        <tr>
          <td>${row.name}</td>
          <td>${row.category}</td>
          <td>${row.subcategory}</td>
          <td>${row.qty}</td>
          <td>${row.price}</td>
          <td>${row.sum}</td>
        </tr>
      `).join('')}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="5">${getTranslatedLabel('totalServices', pdfLanguage)}</td>
        <td>${formatPrice(total)}</td>
      </tr>
      ${surcharges.map(surcharge => `<tr><td colspan="5">${surcharge.split(':')[0]}</td><td>${surcharge.split(':')[1]}</td></tr>`).join('')}
      <tr>
        <td colspan="5"><strong>${getTranslatedLabel('totalWithSurcharges', pdfLanguage)}</strong></td>
        <td><strong>${formatPrice(finalTotal)}</strong></td>
      </tr>
    </tfoot>
  </table>
  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert(pdfLanguage === 'ro' ? 'Nu s-a putut deschide fereastra de imprimare. Verificați dacă browserul blochează ferestrele pop-up.' : 'Не вдалося відкрити вікно для друку. Перевірте, чи браузер блокує спливаючі вікна.');
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
}

function clearSelections() {
  Object.keys(selectedQuantities).forEach((id) => {
    selectedQuantities[id] = 0;
  });
  Object.keys(selectedPrices).forEach((id) => {
    delete selectedPrices[id];
  });
  renderOrderPanel();
}

function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    installButton.style.display = 'inline-flex';
  });

  installButton.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    deferredPrompt = null;
    installButton.style.display = 'none';
  });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
      .catch((error) => console.warn('SW registration failed:', error));
  }
}

serviceForm.addEventListener('submit', addService);
servicesList.addEventListener('click', handleServiceAction);
orderPanel.addEventListener('input', handleOrderInput);
orderPanel.addEventListener('click', handleToggleSelection);
clearSelection.addEventListener('click', clearSelections);
document.getElementById('generatePdf').addEventListener('click', generatePDF);

serviceSearch.addEventListener('input', (event) => {
  searchQuery = event.target.value;
  renderServices();
});

document.getElementById('serviceCategory').addEventListener('change', (event) => {
  const category = event.target.value;
  const drycleaningLabel = document.getElementById('drycleaningLabel');
  const extraLabel = document.getElementById('extraLabel');
  if (category === 'drycleaning') {
    drycleaningLabel.style.display = 'block';
    extraLabel.style.display = 'none';
  } else if (category === 'extra') {
    drycleaningLabel.style.display = 'none';
    extraLabel.style.display = 'block';
  } else {
    drycleaningLabel.style.display = 'none';
    extraLabel.style.display = 'none';
  }
});

document.getElementById('toggleCreateForm').addEventListener('click', () => {
  const panel = document.querySelector('.panel-collapsible');
  panel.classList.toggle('collapsed');
});

document.getElementById('petSurcharge').addEventListener('change', (e) => {
  petSurchargeEnabled = e.target.checked;
  updateTotal();
});

document.getElementById('petSurchargePercent').addEventListener('input', (e) => {
  petSurchargePercent = Number(e.target.value) || 0;
  updateTotal();
});

document.getElementById('ecoChemistry').addEventListener('change', (e) => {
  ecoChemistryEnabled = e.target.checked;
  updateTotal();
});

document.getElementById('ecoChemistryAmount').addEventListener('input', (e) => {
  ecoChemistryAmount = Number(e.target.value) || 0;
  updateTotal();
});

document.getElementById('servicePriceRange').addEventListener('change', (e) => {
  const isRange = e.target.checked;
  const singlePriceLabel = document.getElementById('singlePriceLabel');
  const minPriceLabel = document.getElementById('minPriceLabel');
  const maxPriceLabel = document.getElementById('maxPriceLabel');
  const servicePrice = document.getElementById('servicePrice');
  const serviceMinPrice = document.getElementById('serviceMinPrice');
  const serviceMaxPrice = document.getElementById('serviceMaxPrice');
  if (isRange) {
    singlePriceLabel.style.display = 'none';
    minPriceLabel.style.display = 'block';
    maxPriceLabel.style.display = 'block';
    servicePrice.required = false;
    serviceMinPrice.required = true;
    serviceMaxPrice.required = true;
  } else {
    singlePriceLabel.style.display = 'block';
    minPriceLabel.style.display = 'none';
    maxPriceLabel.style.display = 'none';
    servicePrice.required = true;
    serviceMinPrice.required = false;
    serviceMaxPrice.required = false;
  }
});

loadServices();
renderServices();
renderOrderPanel();
setupInstallPrompt();
registerServiceWorker();

// Initialize subcategory visibility
const categorySelect = document.getElementById('serviceCategory');
const drycleaningLabel = document.getElementById('drycleaningLabel');
const extraLabel = document.getElementById('extraLabel');
if (categorySelect.value === 'drycleaning') {
  drycleaningLabel.style.display = 'block';
  extraLabel.style.display = 'none';
} else if (categorySelect.value === 'extra') {
  drycleaningLabel.style.display = 'none';
  extraLabel.style.display = 'block';
} else {
  drycleaningLabel.style.display = 'none';
  extraLabel.style.display = 'none';
}
