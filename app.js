const SERVICE_KEY = 'cleaningServices-v1';
const installButton = document.getElementById('installButton');
const serviceSearch = document.getElementById('serviceSearch');

let deferredPrompt = null;
let services = [];
let selectedQuantities = {};
let selectedPrices = {};
let searchQuery = '';
let collapsedCategories = { cleaning: true, extra: true };

const CATEGORY_LABELS = {
  cleaning: 'Прибирання',
  extra: 'Додаткові послуги',
};

const CATEGORY_ORDER = ['cleaning', 'extra'];

const defaultServices = [
  { id: crypto.randomUUID(), name: 'Базове прибирання', price: 350, unit: 'год.', category: 'cleaning', subcategory: 'підтримуюче прибирання' },
  { id: crypto.randomUUID(), name: 'Глибоке прибирання', price: 650, unit: 'м²', category: 'cleaning', subcategory: 'Генеральне прибирання - Basic' },
  { id: crypto.randomUUID(), name: 'Миття вікон', price: 120, unit: 'шт.', category: 'extra', subcategory: 'вітальня' },
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
      service.subcategory = service.category === 'cleaning' ? 'підтримуюче прибирання' : 'кухня';
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
            <span>${formatPrice(service.price)} за ${service.unit || 'одиницю'}</span>
            <span>${service.category === 'cleaning' ? 'Тип прибирання' : 'Приміщення'}: ${service.subcategory}</span>
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
    const card = document.createElement('article');
    card.className = 'order-card';
    card.innerHTML = `
      <div>
        <h3>${service.name}</h3>
        <div class="order-meta">
          <span>${formatPrice(service.price)} за ${service.unit || 'одиницю'}</span>
          <span>Категорія: ${CATEGORY_LABELS[service.category] || 'Прибирання'}</span>
          <span>${service.category === 'cleaning' ? 'Тип прибирання' : 'Приміщення'}: ${service.subcategory}</span>
        </div>
      </div>
      <div class="order-actions">
        <label>
          Кількість (${service.unit})
          <input type="number" min="0" value="${selectedQuantities[service.id] || 0}" data-id="${service.id}" class="order-quantity" />
        </label>
        <label>
          Ціна за одиницю (RON)
          <input type="number" min="0" step="0.01" value="${selectedPrices[service.id] || service.price}" data-id="${service.id}" class="order-price" />
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
    const price = Number(selectedPrices[service.id] || service.price);
    return sum + Math.max(qty, 0) * price;
  }, 0);
  orderTotal.textContent = formatPrice(total);
}

function addService(event) {
  event.preventDefault();
  const name = document.getElementById('serviceName').value.trim();
  const price = Number(document.getElementById('servicePrice').value);
  const unit = document.getElementById('serviceUnit').value;
  const category = document.getElementById('serviceCategory').value;

  if (!name || Number.isNaN(price) || price < 0) {
    return;
  }

  const subcategory = category === 'cleaning' ? document.getElementById('serviceCleaningType').value : document.getElementById('serviceRoom').value;
  const service = { id: crypto.randomUUID(), name, price, unit, category, subcategory };
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
    const newPrice = Number(prompt('Ціна за одиницю (RON)', service.price));
    const newUnit = prompt('Одиниця виміру', service.unit)?.trim();
    const subcategoryLabel = service.category === 'cleaning' ? 'Тип прибирання' : 'Приміщення';
    const newSubcategory = prompt(subcategoryLabel, service.subcategory)?.trim();
    if (newName && !Number.isNaN(newPrice) && newPrice >= 0) {
      service.name = newName;
      service.price = newPrice;
      service.unit = newUnit || service.unit;
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
  if (input.tagName !== 'INPUT' || input.type !== 'number') return;
  const id = input.dataset.id;
  const value = Number(input.value);
  
  if (input.classList.contains('order-quantity')) {
    selectedQuantities[id] = Number.isNaN(value) ? 0 : Math.max(0, value);
  } else if (input.classList.contains('order-price')) {
    selectedPrices[id] = Number.isNaN(value) ? 0 : Math.max(0, value);
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

function generatePDF() {
  const selectedServices = services.filter(service => selectedQuantities[service.id] > 0);
  if (!selectedServices.length) {
    alert('Немає вибраних послуг для експорту.');
    return;
  }

  const rows = selectedServices.map(service => {
    const qty = selectedQuantities[service.id] || 0;
    const price = selectedPrices[service.id] || service.price;
    const sum = qty * price;
    return {
      name: service.name,
      qty: `${qty} ${service.unit}`,
      price: formatPrice(price),
      sum: formatPrice(sum),
      category: CATEGORY_LABELS[service.category] || 'Прибирання',
      subcategory: service.subcategory,
    };
  });

  const total = rows.reduce((sum, row) => {
    return sum + Number(row.sum.replace(/[^0-9.,]+/g, '').replace(',', '.'));
  }, 0);

  const html = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8" />
  <title>Розрахунок клінінга</title>
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
  <h1>Розрахунок клінінга</h1>
  <div class="meta">Дата: ${new Date().toLocaleDateString('uk-UA')}</div>
  <table>
    <thead>
      <tr>
        <th>Послуга</th>
        <th>Категорія</th>
        <th>Підкатегорія</th>
        <th>Кількість</th>
        <th>Ціна</th>
        <th>Сума</th>
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
        <td colspan="5">Загальна сума</td>
        <td>${formatPrice(total)}</td>
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
    alert('Не вдалося відкрити вікно для друку. Перевірте, чи браузер блокує спливаючі вікна.');
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
  const cleaningLabel = document.getElementById('cleaningLabel');
  const extraLabel = document.getElementById('extraLabel');
  if (category === 'cleaning') {
    cleaningLabel.style.display = 'block';
    extraLabel.style.display = 'none';
  } else {
    cleaningLabel.style.display = 'none';
    extraLabel.style.display = 'block';
  }
});

document.getElementById('toggleCreateForm').addEventListener('click', () => {
  const panel = document.querySelector('.panel-collapsible');
  panel.classList.toggle('collapsed');
});

loadServices();
renderServices();
renderOrderPanel();
setupInstallPrompt();
registerServiceWorker();

// Initialize subcategory visibility
const categorySelect = document.getElementById('serviceCategory');
const cleaningLabel = document.getElementById('cleaningLabel');
const extraLabel = document.getElementById('extraLabel');
if (categorySelect.value === 'cleaning') {
  cleaningLabel.style.display = 'block';
  extraLabel.style.display = 'none';
} else {
  cleaningLabel.style.display = 'none';
  extraLabel.style.display = 'block';
}
