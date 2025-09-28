import { api } from './api.js';
import { demoProducts, adminStats } from './demoData.js';
import { getSession } from './store.js';

const cardElements = document.querySelectorAll('[data-dashboard-cards] .dashboard-card');
const tableBody = document.querySelector('[data-products-table] tbody');
const productSearch = document.querySelector('[data-product-search]');
const addProductButton = document.querySelector('[data-add-product]');

let chartInstance = null;

let catalog = [...demoProducts];
let dashboardData = {
  totalSales: adminStats.totalSales,
  ordersToday: adminStats.ordersToday,
  pendingOrders: adminStats.pendingOrders,
  stockAlerts: adminStats.stockAlerts,
  salesTrends: adminStats.salesTrends
};

function renderCards(data) {
  if (cardElements.length < 4) return;
  const values = [data.totalSales, data.ordersToday, data.pendingOrders, data.stockAlerts];
  cardElements.forEach((card, index) => {
    const valueEl = card.querySelector('.dashboard-card__value');
    if (!valueEl) return;
    const value = values[index];
    valueEl.textContent = index === 0 ? `$${Number(value).toLocaleString()}` : Number(value).toLocaleString();
  });
}

function renderTable(products) {
  if (!tableBody) return;
  if (!products.length) {
    tableBody.innerHTML = '<tr><td colspan="5">No products to display.</td></tr>';
    return;
  }

  tableBody.innerHTML = products
    .map(
      (product) => `
        <tr>
          <td>${product.name}</td>
          <td>$${product.price.toFixed(2)}</td>
          <td>${product.stock ?? 0}</td>
          <td><span class="status-pill">${product.stock > 0 ? 'Active' : 'Out of stock'}</span></td>
          <td class="actions">
            <button class="action-button" title="Edit">✏️</button>
            <button class="action-button" title="Delete">🗑️</button>
          </td>
        </tr>
      `
    )
    .join('');
}

function renderChart(trends) {
  const canvas = document.getElementById('salesChart');
  if (!canvas || !window.Chart) return;

  const labels = trends.map((point) => point.label);
  const values = trends.map((point) => point.value);

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new window.Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Revenue',
          data: values,
          borderColor: '#c0392b',
          backgroundColor: 'rgba(192, 57, 43, 0.12)',
          tension: 0.35,
          fill: true
        },
        {
          type: 'bar',
          label: 'Orders',
          data: values,
          backgroundColor: 'rgba(230, 126, 34, 0.35)'
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function filterCatalog(term) {
  const value = term.toLowerCase();
  const filtered = catalog.filter((product) => product.name.toLowerCase().includes(value));
  renderTable(filtered);
}

async function loadDashboard() {
  const { token } = getSession();
  if (!token) {
    renderCards(dashboardData);
    renderTable(catalog);
    renderChart(dashboardData.salesTrends);
    return;
  }

  try {
    const data = await api.getAdminDashboard();
    dashboardData = data;
    catalog = data.products?.length ? data.products : catalog;
    renderCards(dashboardData);
    renderTable(catalog);
    renderChart(dashboardData.salesTrends || []);
  } catch (error) {
    renderCards(dashboardData);
    renderTable(catalog);
    renderChart(dashboardData.salesTrends);
  }
}

if (productSearch) {
  productSearch.addEventListener('input', (event) => {
    filterCatalog(event.target.value);
  });
}

if (addProductButton) {
  addProductButton.addEventListener('click', () => {
    alert('Product creation is part of the full backend experience. Connect your API to enable it.');
  });
}

renderCards(dashboardData);
renderTable(catalog);
renderChart(dashboardData.salesTrends);
loadDashboard();
