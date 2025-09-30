import { api } from './api.js';
import { demoProducts, adminStats, demoCategories } from './demoData.js';
import { resolveMediaUrl } from './media.js';
import { getSession } from './store.js';

function toSlug(value = '') {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function humanize(value = '') {
  return value
    .split('-')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return `$${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function formatStatus(value) {
  if (!value) return 'Unknown';
  const status = value.toString().trim().toLowerCase();
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

function normaliseProduct(product = {}) {
  const slug = product.categorySlug || toSlug(product.category || product.categoryName || '');
  const images = Array.isArray(product.images)
    ? product.images.filter(Boolean)
    : product.image
      ? [product.image]
      : [];
  return {
    id: product._id || product.id || product.name || crypto.randomUUID?.() || `product-${Math.random()}`,
    name: product.name || 'Unnamed product',
    price: Number(product.price || 0),
    stock: Number(product.stock || 0),
    category: product.category || product.categoryName || humanize(slug),
    categorySlug: slug,
    featured: Boolean(product.featured),
    updatedAt: product.updatedAt || product.createdAt || null,
    description: product.description || '',
    images: images.map((image) => resolveMediaUrl(image)),
    image: resolveMediaUrl(images[0] || ''),
    icon: product.icon || '🛠️',
    rating: Number(product.rating || 0)
  };
}

function normaliseCategory(category = {}) {
  const slug = category.slug || toSlug(category.name || category.label || '');
  return {
    id: category.id || category._id || slug,
    name: category.name || category.label || humanize(slug),
    slug,
    productCount: Number(category.productCount || 0),
    lowStock: Number(category.lowStock || 0),
    averagePrice: Number(category.averagePrice || 0),
    icon: category.icon || '🛠️',
    image: resolveMediaUrl(category.image)
  };
}

function normaliseOrder(order = {}) {
  const items = Array.isArray(order.items)
    ? order.items.map((item) => ({
        name: item.name || item.title || 'Item',
        price: Number(item.price || 0),
        quantity: Number(item.quantity ?? item.qty ?? 1) || 1
      }))
    : [];

  const itemsCount = Number(order.itemsCount ?? items.reduce((sum, item) => sum + item.quantity, 0));
  const customer = order.customer || {};

  return {
    id: order.id || order._id || `order-${Math.random()}`,
    customer: {
      id: customer.id || customer._id || null,
      name: customer.name || 'Guest customer',
      email: customer.email || ''
    },
    total: Number(order.total || 0),
    status: (order.status || '').toLowerCase(),
    createdAt: order.createdAt || order.updatedAt || null,
    items,
    itemsCount
  };
}

function normaliseDashboard(payload = {}) {
  const summarySource = payload.summary || payload;
  const summary = {
    totalSales: Number(summarySource.totalSales ?? 0),
    ordersToday: Number(summarySource.ordersToday ?? 0),
    pendingOrders: Number(summarySource.pendingOrders ?? 0),
    stockAlerts: Number(summarySource.stockAlerts ?? 0),
    totalOrders: Number(summarySource.totalOrders ?? 0),
    averageOrderValue: Number(summarySource.averageOrderValue ?? 0)
  };

  const analytics = {
    weeklySales: payload.analytics?.weeklySales || payload.salesTrends || [],
    monthlySales: payload.analytics?.monthlySales || [],
    quarterlySales: payload.analytics?.quarterlySales || []
  };

  const orders = Array.isArray(payload.orders) ? payload.orders.map(normaliseOrder) : [];
  const products = Array.isArray(payload.products) ? payload.products.map(normaliseProduct) : [];
  const categories = Array.isArray(payload.categories) ? payload.categories.map(normaliseCategory) : [];

  return { summary, analytics, orders, products, categories };
}

function createDefaultDashboard() {
  const categories = demoCategories.map((category) => {
    const slug = toSlug(category.label);
    const related = demoProducts.filter((product) => toSlug(product.category) === slug);
    const productCount = related.length;
    const lowStock = related.filter((product) => Number(product.stock || 0) < 10).length;
    const averagePrice = productCount
      ? related.reduce((sum, product) => sum + Number(product.price || 0), 0) / productCount
      : 0;

    return {
      id: slug,
      name: category.label,
      slug,
      productCount,
      lowStock,
      averagePrice,
      icon: category.icon || '🛠️',
      image: resolveMediaUrl(category.image)
    };
  });

  const summary = {
    totalSales: adminStats.totalSales,
    ordersToday: adminStats.ordersToday,
    pendingOrders: adminStats.pendingOrders,
    stockAlerts: demoProducts.filter((product) => Number(product.stock || 0) < 10).length,
    totalOrders: 0,
    averageOrderValue: 0
  };

  return {
    summary,
    analytics: {
      weeklySales: adminStats.salesTrends,
      monthlySales: adminStats.salesTrends,
      quarterlySales: adminStats.salesTrends
    },
    orders: [],
    products: demoProducts.map(normaliseProduct),
    categories: categories.map(normaliseCategory)
  };
}

const cardElements = document.querySelectorAll('[data-dashboard-cards] [data-metric]');
const metricPillElements = document.querySelectorAll('[data-dashboard-metrics] [data-metric]');
const chartButtons = document.querySelectorAll('[data-chart-range] [data-range]');
const ordersTableBody = document.querySelector('[data-orders-table] tbody');
const categoriesTableBody = document.querySelector('[data-categories-table] tbody');
const productsTableBody = document.querySelector('[data-products-table] tbody');
const categoryForm = document.querySelector('[data-category-form]');
const categoryStatus = document.querySelector('[data-category-status]');
const productForm = document.querySelector('[data-product-form]');
const productStatus = document.querySelector('[data-product-status]');
const categorySelect = document.querySelector('[data-product-category]');
const salesCanvas = document.getElementById('salesChart');
const categorySubmitButton = categoryForm?.querySelector('[data-category-submit]');
const productSubmitButton = productForm?.querySelector('[data-product-submit]');
const categoryPreview = categoryForm?.querySelector('[data-category-preview]');
const productPreview = productForm?.querySelector('[data-product-preview]');

const session = getSession();
const isAdmin = session.user?.role === 'admin';
const canManage = isAdmin || session.isDemo;

let dashboardData = createDefaultDashboard();
let currentRange = 'weekly';
let chartInstance = null;
let editingCategoryId = null;
let editingProductId = null;
let editingCategorySnapshot = null;
let editingProductSnapshot = null;
let categoryPreviewUrl = null;
let productPreviewUrl = null;

renderPreview(categoryPreview, null, 'No image yet');
renderPreview(productPreview, null, 'No image yet');

function setCategoryFormMode(mode) {
  if (!categorySubmitButton) return;
  if (mode === 'edit') {
    categorySubmitButton.textContent = 'Update Category';
  } else {
    categorySubmitButton.textContent = 'Add Category';
    editingCategoryId = null;
  }
}

function setProductFormMode(mode) {
  if (!productSubmitButton) return;
  if (mode === 'edit') {
    productSubmitButton.textContent = 'Update Product';
  } else {
    productSubmitButton.textContent = 'Add Product';
    editingProductId = null;
  }
}

function resetCategoryForm() {
  if (!categoryForm) return;
  categoryForm.reset();
  setCategoryFormMode('create');
  editingCategorySnapshot = null;
  if (categoryPreviewUrl) {
    URL.revokeObjectURL(categoryPreviewUrl);
    categoryPreviewUrl = null;
  }
  renderPreview(categoryPreview, null, 'No image yet');
}

function resetProductForm() {
  if (!productForm) return;
  productForm.reset();
  setProductFormMode('create');
  editingProductSnapshot = null;
  if (productPreviewUrl) {
    URL.revokeObjectURL(productPreviewUrl);
    productPreviewUrl = null;
  }
  renderPreview(productPreview, null, 'No image yet');
}

function removeCategoryFromState(identifier) {
  const id = identifier;
  dashboardData.categories = dashboardData.categories.filter((category) => (category.id || category.slug) !== id);
  renderCategories(dashboardData.categories);
  updateCategorySelect(dashboardData.categories);
  setCategoryFormMode('create');
  editingCategorySnapshot = null;
  renderPreview(categoryPreview, null, 'No image yet');
}

function removeProductFromState(identifier, categorySlug) {
  const id = identifier;
  dashboardData.products = dashboardData.products.filter((product) => product.id !== id);
  if (categorySlug) {
    recomputeCategoryMetrics(categorySlug);
  }
  renderProducts(dashboardData.products);
  renderCategories(dashboardData.categories);
  updateCategorySelect(dashboardData.categories);
  dashboardData.summary.stockAlerts = dashboardData.products.filter((item) => item.stock < 10).length;
  renderCards(dashboardData.summary);
}

function renderPreview(previewEl, src, placeholderText, fallbackIcon = '🛠️') {
  if (!previewEl) return;
  if (src) {
    previewEl.innerHTML = `<img src="${src}" alt="Preview" loading="lazy" />`;
  } else {
    previewEl.innerHTML = `<span class="preview-thumb__placeholder">${placeholderText || fallbackIcon}</span>`;
  }
}

function renderCards(summary) {
  cardElements.forEach((card) => {
    const metric = card.dataset.metric;
    const valueEl = card.querySelector('[data-metric-value]');
    if (!metric || !valueEl) return;
    const value = summary?.[metric] ?? 0;
    valueEl.textContent = metric === 'totalSales' ? formatCurrency(value) : formatNumber(value);
  });
}

function renderMetricPills(summary) {
  metricPillElements.forEach((pill) => {
    const metric = pill.dataset.metric;
    const valueEl = pill.querySelector('[data-metric-value]');
    if (!metric || !valueEl) return;
    const value = summary?.[metric] ?? 0;
    valueEl.textContent = metric === 'averageOrderValue' ? formatCurrency(value) : formatNumber(value);
  });
}

function renderChart(range = currentRange, analytics = dashboardData.analytics) {
  if (!salesCanvas || !window.Chart) return;
  currentRange = range;

  chartButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.range === range);
  });

  const key = `${range}Sales`;
  const dataset = Array.isArray(analytics?.[key]) ? analytics[key] : [];
  const labels = dataset.map((item) => item.label);
  const values = dataset.map((item) => Number(item.value || 0));

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new window.Chart(salesCanvas, {
    type: 'line',
    data: {
      labels: labels.length ? labels : ['No data'],
      datasets: [
        {
          label: 'Revenue',
          data: labels.length ? values : [0],
          borderColor: '#c0392b',
          backgroundColor: 'rgba(192, 57, 43, 0.12)',
          tension: 0.35,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function renderOrders(orders = []) {
  if (!ordersTableBody) return;
  if (!orders.length) {
    ordersTableBody.innerHTML = '<tr><td colspan="5">No orders yet.</td></tr>';
    return;
  }

  const statusClassMap = {
    pending: 'is-pending',
    paid: 'is-processing',
    processing: 'is-processing',
    shipped: 'is-processing',
    completed: '',
    cancelled: 'is-cancelled',
    failed: 'is-failed'
  };

  ordersTableBody.innerHTML = orders
    .map((order) => {
      const statusClass = statusClassMap[order.status] || '';
      return `
        <tr>
          <td>
            <div>${order.customer.name}</div>
            ${order.customer.email ? `<div class="text-muted">${order.customer.email}</div>` : ''}
          </td>
          <td>${order.itemsCount} item${order.itemsCount === 1 ? '' : 's'}</td>
          <td>${formatCurrency(order.total)}</td>
          <td><span class="status-pill ${statusClass}">${formatStatus(order.status)}</span></td>
          <td>${formatDate(order.createdAt)}</td>
        </tr>
      `;
    })
    .join('');
}

function renderCategories(categories = []) {
  if (!categoriesTableBody) return;
  if (!categories.length) {
    categoriesTableBody.innerHTML = '<tr><td colspan="5">No categories found yet.</td></tr>';
    return;
  }

  categoriesTableBody.innerHTML = categories
    .map((category) => `
      <tr>
        <td>
          <div class="table-media">
            ${category.image
              ? `<span class="media-thumb"><img src="${category.image}" alt="${category.name}" /></span>`
              : `<span class="media-thumb">${category.icon || '🛠️'}</span>`}
            <div>
              <div>${category.name}</div>
              <div class="text-muted">${category.slug}</div>
            </div>
          </div>
        </td>
        <td>${formatNumber(category.productCount)}</td>
        <td>${formatNumber(category.lowStock)}</td>
        <td>${category.averagePrice ? formatCurrency(category.averagePrice) : '—'}</td>
        <td class="table-actions">
          ${category.id ? `
            <button class="action-button" title="Edit" data-action="edit-category" data-category-id="${category.id}">✏️</button>
            <button class="action-button" title="Delete" data-action="delete-category" data-category-id="${category.id}">🗑️</button>
          ` : '<span class="text-muted">Derived</span>'}
        </td>
      </tr>
    `)
    .join('');
}

function renderProducts(products = []) {
  if (!productsTableBody) return;
  if (!products.length) {
    productsTableBody.innerHTML = '<tr><td colspan="6">No products to display.</td></tr>';
    return;
  }

  productsTableBody.innerHTML = products
    .map((product) => {
      const inStock = Number(product.stock || 0) > 0;
      const statusClass = inStock ? '' : 'is-cancelled';
      return `
        <tr>
          <td>
            <div class="table-media">
              ${product.image
                ? `<span class="media-thumb"><img src="${product.image}" alt="${product.name}" /></span>`
                : `<span class="media-thumb">${product.icon || '🛠️'}</span>`}
              <div>
                <div>${product.name}</div>
                ${product.description ? `<div class="text-muted">${product.description.slice(0, 60)}${product.description.length > 60 ? '…' : ''}</div>` : ''}
              </div>
            </div>
          </td>
          <td>${product.category}</td>
          <td>${formatCurrency(product.price)}</td>
          <td>${formatNumber(product.stock)}</td>
          <td><span class="status-pill ${statusClass}">${inStock ? 'In stock' : 'Out of stock'}</span></td>
          <td class="table-actions">
            <button class="action-button" title="Edit" data-action="edit-product" data-product-id="${product.id}">✏️</button>
            <button class="action-button" title="Delete" data-action="delete-product" data-product-id="${product.id}">🗑️</button>
          </td>
        </tr>
      `;
    })
    .join('');
}

function updateCategorySelect(categories = []) {
  if (!categorySelect) return;
  const previousValue = categorySelect.value;
  categorySelect.innerHTML = '<option value="">Select category</option>';
  categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category.slug;
    option.textContent = category.name;
    if (category.id) {
      option.dataset.categoryId = category.id;
    }
    categorySelect.appendChild(option);
  });
  if (previousValue && categories.some((category) => category.slug === previousValue)) {
    categorySelect.value = previousValue;
  }
}

function setStatus(target, message, type = 'info') {
  if (!target) return;
  target.textContent = message || '';
  target.classList.remove('success', 'error');
  if (type === 'success') {
    target.classList.add('success');
  } else if (type === 'error') {
    target.classList.add('error');
  }
}

function setFormEnabled(form, enabled, statusEl, message) {
  if (!form) return;
  form.querySelectorAll('input, select, button').forEach((field) => {
    field.disabled = !enabled;
  });
  if (!enabled && statusEl) {
    setStatus(statusEl, message, 'error');
  }
}

function recomputeCategoryMetrics(slug) {
  const related = dashboardData.products.filter((product) => product.categorySlug === slug);
  const productCount = related.length;
  const lowStock = related.filter((product) => Number(product.stock || 0) < 10).length;
  const averagePrice = productCount
    ? related.reduce((sum, product) => sum + Number(product.price || 0), 0) / productCount
    : 0;

  let found = false;
  dashboardData.categories = dashboardData.categories.map((category) => {
    if (category.slug !== slug) return category;
    found = true;
    return {
      ...category,
      productCount,
      lowStock,
      averagePrice
    };
  });

  if (!found) {
    dashboardData.categories.unshift({
      id: slug,
      name: humanize(slug),
      slug,
      productCount,
      lowStock,
      averagePrice
    });
  }
}

function appendCategory(category) {
  const entry = normaliseCategory(category);
  dashboardData.categories = [
    entry,
    ...dashboardData.categories.filter((existing) => existing.slug !== entry.slug)
  ];
  renderCategories(dashboardData.categories);
  updateCategorySelect(dashboardData.categories);
  setCategoryFormMode('create');
  editingCategorySnapshot = null;
}

function appendProduct(product) {
  const entry = normaliseProduct(product);
  dashboardData.products = [
    entry,
    ...dashboardData.products.filter((existing) => existing.id !== entry.id)
  ];
  recomputeCategoryMetrics(entry.categorySlug);

  dashboardData.summary.stockAlerts = dashboardData.products.filter((item) => item.stock < 10).length;

  renderProducts(dashboardData.products);
  renderCategories(dashboardData.categories);
  updateCategorySelect(dashboardData.categories);
  renderCards(dashboardData.summary);
  setProductFormMode('create');
  editingProductSnapshot = null;
}

function startEditCategory(identifier) {
  if (!categoryForm) return;
  const category = dashboardData.categories.find((item) => (item.id || item.slug) === identifier);
  if (!category) return;

  editingCategoryId = category.id || category.slug;
  editingCategorySnapshot = category;

  categoryForm.querySelector('[data-category-name]').value = category.name || '';
  categoryForm.querySelector('[data-category-slug]').value = category.slug || '';
  const descriptionField = categoryForm.querySelector('[data-category-description]');
  if (descriptionField) descriptionField.value = category.description || '';
  const iconField = categoryForm.querySelector('[data-category-icon]');
  if (iconField) iconField.value = category.icon || '';
  const imageField = categoryForm.querySelector('[data-category-image]');
  if (imageField) imageField.value = '';

  setCategoryFormMode('edit');
  renderPreview(categoryPreview, resolveMediaUrl(category.image), 'No image yet');
  setStatus(categoryStatus, `Editing “${category.name}”. Upload a new image to replace the current one.`, 'info');
}

function startEditProduct(identifier) {
  if (!productForm) return;
  const product = dashboardData.products.find((item) => item.id === identifier);
  if (!product) return;

  editingProductId = product.id;
  editingProductSnapshot = product;

  productForm.querySelector('[data-product-name]').value = product.name || '';
  productForm.querySelector('[data-product-price]').value = product.price || 0;
  productForm.querySelector('[data-product-stock]').value = product.stock || 0;
  const descriptionField = productForm.querySelector('[data-product-description]');
  if (descriptionField) descriptionField.value = product.description || '';
  const ratingField = productForm.querySelector('[data-product-rating]');
  if (ratingField) ratingField.value = product.rating || '';
  const imageField = productForm.querySelector('[data-product-image]');
  if (imageField) imageField.value = '';
  const featuredField = productForm.querySelector('[data-product-featured]');
  if (featuredField) featuredField.checked = Boolean(product.featured);

  if (categorySelect) {
    categorySelect.value = product.categorySlug || '';
  }

  setProductFormMode('edit');
  renderPreview(productPreview, resolveMediaUrl(product.image), 'No image yet');
  setStatus(productStatus, `Editing “${product.name}”. Upload an image to replace the current one.`, 'info');
}

async function performCategoryDeletion(identifier) {
  const category = dashboardData.categories.find((item) => (item.id || item.slug) === identifier);
  if (!category) return;

  const hasProducts = dashboardData.products.some((product) => product.categorySlug === category.slug);
  if (hasProducts) {
    setStatus(categoryStatus, 'Remove or reassign products linked to this category before deleting.', 'error');
    return;
  }

  setStatus(categoryStatus, 'Deleting...');

  try {
    if (isAdmin) {
      await api.deleteCategory(identifier);
    }
    removeCategoryFromState(identifier);
    setStatus(categoryStatus, 'Category removed.', 'success');
    if (editingCategoryId === identifier) {
      resetCategoryForm();
      editingCategorySnapshot = null;
    }
  } catch (error) {
    setStatus(categoryStatus, error.message || 'Unable to delete category.', 'error');
  }
}

async function performProductDeletion(identifier) {
  const product = dashboardData.products.find((item) => item.id === identifier);
  if (!product) return;

  setStatus(productStatus, 'Deleting...');

  try {
    if (isAdmin) {
      await api.deleteProduct(identifier);
    }
    removeProductFromState(identifier, product.categorySlug);
    setStatus(productStatus, 'Product removed.', 'success');
    if (editingProductId === identifier) {
      resetProductForm();
      editingProductSnapshot = null;
    }
  } catch (error) {
    setStatus(productStatus, error.message || 'Unable to delete product.', 'error');
  }
}

function renderDashboard(data) {
  const summary = { ...data.summary };
  const totalOrders = summary.totalOrders || data.orders.length;
  summary.totalOrders = totalOrders;
  if (!summary.averageOrderValue && totalOrders) {
    summary.averageOrderValue = summary.totalSales / totalOrders;
  }

  dashboardData = {
    ...data,
    summary
  };

  renderCards(summary);
  renderMetricPills(summary);
  renderChart(currentRange, data.analytics);
  renderOrders(data.orders);
  renderProducts(data.products);
  renderCategories(data.categories);
  updateCategorySelect(data.categories);
}

async function handleCategorySubmit(event) {
  event.preventDefault();
  if (!categoryForm) return;

  if (!canManage) {
    setStatus(categoryStatus, 'Login with the admin account to manage categories.', 'error');
    return;
  }

  const nameInput = categoryForm.querySelector('[data-category-name]');
  const slugInput = categoryForm.querySelector('[data-category-slug]');
  const descriptionInput = categoryForm.querySelector('[data-category-description]');
  const iconInput = categoryForm.querySelector('[data-category-icon]');
  const imageInput = categoryForm.querySelector('[data-category-image]');

  const name = nameInput?.value.trim();
  if (!name) {
    setStatus(categoryStatus, 'Category name is required.', 'error');
    return;
  }

  const slugCandidate = slugInput?.value.trim();
  const description = descriptionInput?.value.trim() || '';
  const icon = iconInput?.value.trim() || '';
  const imageFile = imageInput?.files?.[0];

  const isEditing = Boolean(editingCategoryId);
  const slugValue = slugCandidate ? toSlug(slugCandidate) : undefined;

  const payload = {
    name,
    slug: slugValue,
    description,
    icon
  };

  let requestBody = null;
  if (isAdmin) {
    requestBody = new FormData();
    requestBody.append('name', name);
    if (slugValue) requestBody.append('slug', slugValue);
    if (description) requestBody.append('description', description);
    if (icon) requestBody.append('icon', icon);
    if (imageFile) requestBody.append('image', imageFile);
  }

  setStatus(categoryStatus, 'Saving...');

  try {
    let result;
    if (isAdmin) {
      if (isEditing) {
        result = await api.updateCategory(editingCategoryId, requestBody);
      } else {
        result = await api.createCategory(requestBody);
      }
    } else {
      result = {
        ...payload,
        id: editingCategoryId || slugValue || toSlug(name),
        slug: slugValue || toSlug(name),
        productCount: editingCategorySnapshot?.productCount || 0,
        lowStock: editingCategorySnapshot?.lowStock || 0,
        averagePrice: editingCategorySnapshot?.averagePrice || 0,
        image: resolveMediaUrl(editingCategorySnapshot?.image || '')
      };
    }

    appendCategory(result);
    setStatus(
      categoryStatus,
      isEditing
        ? isAdmin
          ? 'Category updated successfully.'
          : 'Category updated in demo mode.'
        : isAdmin
          ? 'Category created successfully.'
          : 'Category added in demo mode.',
      'success'
    );
    resetCategoryForm();
    editingCategorySnapshot = null;
  } catch (error) {
    setStatus(categoryStatus, error.message || 'Unable to save category.', 'error');
  }
}

async function handleProductSubmit(event) {
  event.preventDefault();
  if (!productForm) return;

  if (!canManage) {
    setStatus(productStatus, 'Login with the admin account to add products.', 'error');
    return;
  }

  const nameInput = productForm.querySelector('[data-product-name]');
  const priceInput = productForm.querySelector('[data-product-price]');
  const stockInput = productForm.querySelector('[data-product-stock]');
  const featuredInput = productForm.querySelector('[data-product-featured]');
  const descriptionInput = productForm.querySelector('[data-product-description]');
  const imageInput = productForm.querySelector('[data-product-image]');
  const ratingInput = productForm.querySelector('[data-product-rating]');

  const name = nameInput?.value.trim();
  const price = Number(priceInput?.value || 0);
  const stock = Number(stockInput?.value || 0);
  const categoryOption = categorySelect?.selectedOptions?.[0];
  const categorySlug = categoryOption?.value || '';
  const categoryId = categoryOption?.dataset.categoryId || '';
  const categoryName = categoryOption?.textContent || '';
  const featured = Boolean(featuredInput?.checked);
  const description = descriptionInput?.value.trim() || '';
  const ratingValue = ratingInput?.value ? Number(ratingInput.value) : undefined;
  const imageFile = imageInput?.files?.[0];

  if (!name) {
    setStatus(productStatus, 'Product name is required.', 'error');
    return;
  }

  if (!Number.isFinite(price) || price < 0) {
    setStatus(productStatus, 'Enter a valid price.', 'error');
    return;
  }

  if (!categorySlug) {
    setStatus(productStatus, 'Select a category for the product.', 'error');
    return;
  }

  const isEditing = Boolean(editingProductId);
  const payload = {
    name,
    price,
    stock,
    featured,
    category: categoryName,
    categoryId: categoryId || undefined,
    categorySlug,
    description,
    rating: Number.isFinite(ratingValue) ? ratingValue : undefined
  };

  let requestBody = null;
  if (isAdmin) {
    requestBody = new FormData();
    requestBody.append('name', name);
    requestBody.append('price', String(price));
    requestBody.append('stock', String(stock));
    requestBody.append('featured', String(featured));
    requestBody.append('category', categoryName);
    requestBody.append('categorySlug', categorySlug);
    if (categoryId) requestBody.append('categoryId', categoryId);
    if (description) requestBody.append('description', description);
    if (Number.isFinite(ratingValue)) requestBody.append('rating', String(ratingValue));
    if (imageFile) requestBody.append('image', imageFile);
  }

  setStatus(productStatus, 'Saving...');

  try {
    let result;
    if (isAdmin) {
      if (isEditing) {
        result = await api.updateProduct(editingProductId, requestBody);
      } else {
        result = await api.createProduct(requestBody);
      }
    } else {
      result = {
        ...payload,
        id: editingProductId || `demo-product-${Math.random().toString(36).slice(2)}`,
        images: (editingProductSnapshot?.images || []).map((image) => resolveMediaUrl(image)),
        image: resolveMediaUrl(editingProductSnapshot?.image || ''),
        updatedAt: new Date().toISOString()
      };
    }

    const resolvedImages = Array.isArray(result.images) && result.images.length
      ? result.images
      : editingProductSnapshot?.images || [];

    appendProduct({
      ...result,
      category: categoryName,
      categorySlug,
      images: resolvedImages,
      image: resolvedImages[0] || result.image || ''
    });

    setStatus(
      productStatus,
      isEditing
        ? isAdmin
          ? 'Product updated successfully.'
          : 'Product updated in demo mode.'
        : isAdmin
          ? 'Product created successfully.'
          : 'Product added in demo mode.',
      'success'
    );
    resetProductForm();
    editingProductSnapshot = null;
    if (categorySelect) {
      categorySelect.value = categorySlug;
    }
  } catch (error) {
    setStatus(productStatus, error.message || 'Unable to save product.', 'error');
  }
}

async function loadDashboard() {
  try {
    const [dashboardResponse, categoriesResponse] = await Promise.all([
      api.getAdminDashboard(),
      api.getCategories().catch(() => null)
    ]);

    const data = normaliseDashboard(dashboardResponse || {});

    if (Array.isArray(categoriesResponse) && categoriesResponse.length) {
      data.categories = categoriesResponse.map(normaliseCategory);
    }

    renderDashboard(data);
  } catch (error) {
    console.error('Dashboard load failed:', error);
    renderDashboard(dashboardData);
  }
}

function bindEvents() {
  chartButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const range = button.dataset.range;
      if (!range || range === currentRange) return;
      renderChart(range);
    });
  });

  categoryForm?.addEventListener('submit', handleCategorySubmit);
  productForm?.addEventListener('submit', handleProductSubmit);

  categoriesTableBody?.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const categoryId = button.dataset.categoryId;
    if (!categoryId) return;

    if (button.dataset.action === 'edit-category') {
      startEditCategory(categoryId);
    } else if (button.dataset.action === 'delete-category') {
      if (confirm('Are you sure you want to delete this category?')) {
        performCategoryDeletion(categoryId);
      }
    }
  });

  productsTableBody?.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const productId = button.dataset.productId;
    if (!productId) return;

    if (button.dataset.action === 'edit-product') {
      startEditProduct(productId);
    } else if (button.dataset.action === 'delete-product') {
      if (confirm('Are you sure you want to delete this product?')) {
        performProductDeletion(productId);
      }
    }
  });

  const categoryImageInput = categoryForm?.querySelector('[data-category-image]');
  categoryImageInput?.addEventListener('change', (event) => {
    if (categoryPreviewUrl) {
      URL.revokeObjectURL(categoryPreviewUrl);
      categoryPreviewUrl = null;
    }
    const file = event.target.files?.[0];
    if (file) {
      categoryPreviewUrl = URL.createObjectURL(file);
      renderPreview(categoryPreview, categoryPreviewUrl, 'No image yet');
    } else {
      renderPreview(categoryPreview, null, 'No image yet');
    }
  });

  const productImageInput = productForm?.querySelector('[data-product-image]');
  productImageInput?.addEventListener('change', (event) => {
    if (productPreviewUrl) {
      URL.revokeObjectURL(productPreviewUrl);
      productPreviewUrl = null;
    }
    const file = event.target.files?.[0];
    if (file) {
      productPreviewUrl = URL.createObjectURL(file);
      renderPreview(productPreview, productPreviewUrl, 'No image yet');
    } else {
      renderPreview(productPreview, null, 'No image yet');
    }
  });
}

if (!canManage) {
  setFormEnabled(
    categoryForm,
    false,
    categoryStatus,
    'Login with the admin account to manage categories.'
  );
  setFormEnabled(
    productForm,
    false,
    productStatus,
    'Login with the admin account to add products.'
  );
} else if (session.isDemo && !isAdmin) {
  setStatus(categoryStatus, 'Demo mode: categories are stored locally.');
  setStatus(productStatus, 'Demo mode: products are stored locally.');
}

renderDashboard(dashboardData);
bindEvents();
loadDashboard();
