import { api } from './api.js';
import { demoProducts } from './demoData.js';
import { addToCart } from './store.js';
import { updateCartIndicator } from './main.js';
import { resolveMediaUrl } from './media.js';

function toSlug(value = '') {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const state = {
  page: 1,
  limit: 12,
  sortField: 'createdAt',
  sortOrder: 'desc',
  category: '',
  brand: '',
  search: '',
  maxPrice: 500,
  minRating: 0,
  inStockOnly: false,
  pagination: { pages: 1, total: demoProducts.length }
};

const urlParams = new URLSearchParams(window.location?.search || '');
const initialCategory = urlParams.get('category');
if (initialCategory) {
  state.category = toSlug(initialCategory);
}

const grid = document.querySelector('[data-shop-grid]');
const paginationEl = document.querySelector('[data-pagination]');
const totalEl = document.querySelector('[data-total-results]');
const categoryList = document.querySelector('[data-filter-list="category"]');
const brandList = document.querySelector('[data-filter-list="brand"]');
const priceRange = document.querySelector('[data-price-range]');
const priceValue = document.querySelector('[data-price-value]');
const searchInput = document.querySelector('[data-search-input]');
const sortSelect = document.querySelector('[data-sort-select]');
const limitSelect = document.querySelector('[data-limit-select]');
const applyButton = document.querySelector('[data-apply-filters]');
const availabilityCheckbox = document.querySelector('[data-availability]');

let usingDemo = true;

const sortLookup = {
  popular: { sortField: 'rating', sortOrder: 'desc' },
  'price-asc': { sortField: 'price', sortOrder: 'asc' },
  'price-desc': { sortField: 'price', sortOrder: 'desc' },
  newest: { sortField: 'createdAt', sortOrder: 'desc' }
};

function templateProduct(product) {
  const rating = Math.round(product.rating || 0);
  const rawImage = (Array.isArray(product.images) && product.images.length ? product.images[0] : product.image) || '';
  const image = resolveMediaUrl(rawImage);
  const icon = product.icon || '🛠️';
  const imageMarkup = image
    ? `<div class="product-card__image"><img src="${image}" alt="${product.name}" loading="lazy" /></div>`
    : `<div class="product-card__image">${icon}</div>`;
  return `
    <article class="product-card" data-product-id="${product._id || product.id}">
      ${imageMarkup}
      <div>
        <h3>${product.name}</h3>
        <p class="text-muted">${'★'.repeat(rating)}${'☆'.repeat(Math.max(0, 5 - rating))}</p>
      </div>
      <div class="product-card__price">$${(product.price || 0).toFixed(2)}</div>
      <div class="product-card__actions">
        <button class="btn btn--primary" data-action="add">Add to Cart</button>
        <button class="btn btn--ghost" data-action="quick">Quick View</button>
      </div>
    </article>
  `;
}

function renderProducts(products) {
  if (!grid) return;
  if (!products.length) {
    grid.innerHTML = '<p>No products found for the selected filters.</p>';
    return;
  }
  grid.innerHTML = products.map(templateProduct).join('');
}

function normaliseProductItem(product) {
  return {
    ...product,
    categorySlug: product.categorySlug || toSlug(product.category || ''),
    image: resolveMediaUrl((Array.isArray(product.images) && product.images.length ? product.images[0] : product.image) || '')
  };
}

function renderPagination(pagination) {
  if (!paginationEl) return;
  const { pages, page } = pagination;
  if (pages <= 1) {
    paginationEl.innerHTML = '';
    return;
  }
  const buttons = Array.from({ length: pages }, (_, index) => {
    const pageNumber = index + 1;
    const active = pageNumber === page ? 'active' : '';
    return `<button data-page="${pageNumber}" class="${active}">${pageNumber}</button>`;
  });
  paginationEl.innerHTML = buttons.join('');
}

function renderFilters(filters) {
  if (filters.categories?.length && categoryList) {
    const categories = filters.categories.map((entry) => {
      if (typeof entry === 'string') {
        return { name: entry, slug: toSlug(entry) };
      }
      return {
        name: entry.name || entry.label || 'Category',
        slug: entry.slug || toSlug(entry.name || entry.label || ''),
        productCount: entry.productCount || 0
      };
    });

    const markup = [
      `
        <label>
          <input type="radio" name="category" value="" ${state.category ? '' : 'checked'} />
          All
        </label>
      `,
      ...categories.map((category) => `
        <label>
          <input type="radio" name="category" value="${category.slug}" ${
            state.category === category.slug ? 'checked' : ''
          } />
          ${category.name}${category.productCount ? ` <span class="text-muted">(${category.productCount})</span>` : ''}
        </label>
      `)
    ];

    categoryList.innerHTML = markup.join('');
  }

  if (filters.brands?.length && brandList) {
    brandList.innerHTML = filters.brands
      .map(
        (brand) => `
          <label>
            <input type="checkbox" value="${brand}" ${
              state.brand.split(',').includes(brand) ? 'checked' : ''
            } />
            ${brand}
          </label>
        `
      )
      .join('');
  }
}

function applyDemoFilters() {
  let products = [...demoProducts];

  if (state.category) {
    products = products.filter((product) => {
      const slug = product.categorySlug || toSlug(product.category);
      return slug === state.category;
    });
  }

  if (state.brand) {
    const selectedBrands = state.brand.split(',').filter(Boolean);
    if (selectedBrands.length) {
      products = products.filter((product) => selectedBrands.includes(product.brand));
    }
  }

  if (state.maxPrice) {
    products = products.filter((product) => product.price <= state.maxPrice);
  }

  if (state.minRating > 0) {
    products = products.filter((product) => product.rating >= state.minRating);
  }

  if (state.inStockOnly) {
    products = products.filter((product) => product.stock > 0);
  }

  if (state.search) {
    const term = state.search.toLowerCase();
    products = products.filter((product) => product.name.toLowerCase().includes(term));
  }

  const { sortField, sortOrder } = state;
  products.sort((a, b) => {
    const valueA = a[sortField] || 0;
    const valueB = b[sortField] || 0;
    if (valueA === valueB) return 0;
    return sortOrder === 'asc' ? valueA - valueB : valueB - valueA;
  });

  state.pagination.total = products.length;
  const pages = Math.ceil(products.length / state.limit) || 1;
  state.pagination.pages = pages;
  const start = (state.page - 1) * state.limit;
  const slice = products
    .slice(start, start + state.limit)
    .map((product) => ({
      ...product,
      image: resolveMediaUrl(product.image || product.images?.[0]),
      categorySlug: product.categorySlug || toSlug(product.category)
    }));

  return { products: slice, pagination: { page: state.page, pages, total: products.length } };
}

async function loadProducts() {
  try {
    const params = {
      page: state.page,
      limit: state.limit,
      sort: state.sortField,
      order: state.sortOrder
    };

    if (state.category) params.category = state.category;
    if (state.brand) params.brand = state.brand;
    if (state.search) params.search = state.search;

    const { data, pagination } = await api.getProducts(params);
    usingDemo = false;
    let items = data.map(normaliseProductItem);
    let pageInfo = { ...pagination };

    if (state.category && !items.length) {
      try {
        const fallbackRequest = { ...params, page: 1, limit: 200 };
        delete fallbackRequest.category;
        const fallbackResponse = await api.getProducts(fallbackRequest);
        const fallbackItems = fallbackResponse.data
          .map(normaliseProductItem)
          .filter((product) => product.categorySlug === state.category);

        if (fallbackItems.length) {
          const total = fallbackItems.length;
          const pages = Math.ceil(total / state.limit) || 1;
          pageInfo = { total, pages, page: Math.min(state.page, pages) };
          const start = (pageInfo.page - 1) * state.limit;
          items = fallbackItems.slice(start, start + state.limit);
          state.page = pageInfo.page;
        }
      } catch (_fallbackError) {
        // ignore – we'll drop through to demo fallback
      }
    }

    renderProducts(items);
    renderPagination(pageInfo);
    if (totalEl) totalEl.textContent = pageInfo.total;
    state.pagination = pageInfo;
  } catch (error) {
    usingDemo = true;
    const { products, pagination } = applyDemoFilters();
    renderProducts(products.map(normaliseProductItem));
    renderPagination(pagination);
    if (totalEl) totalEl.textContent = pagination.total;
  }
}

async function loadFilters() {
  try {
    const filters = await api.getFilters();
    usingDemo = false;
    renderFilters(filters);
  } catch (error) {
    const categories = [...new Set(demoProducts.map((product) => product.category))].map((name) => ({
      name,
      slug: toSlug(name)
    }));
    const brands = [...new Set(demoProducts.map((product) => product.brand))];
    renderFilters({ categories, brands });
  }
}

function syncStateFromControls() {
  state.maxPrice = Number(priceRange?.value || 500);
  state.minRating = Number(document.querySelector('input[name="rating"]:checked')?.value || 0);
  state.inStockOnly = availabilityCheckbox?.checked || false;

  const brandChecks = brandList?.querySelectorAll('input[type="checkbox"]');
  if (brandChecks?.length) {
    const selectedBrands = Array.from(brandChecks)
      .filter((input) => input.checked)
      .map((input) => input.value);
    state.brand = selectedBrands.join(',');
  }

  const categoryRadio = categoryList?.querySelector('input[name="category"]:checked');
  state.category = categoryRadio?.value || '';
}

if (priceRange && priceValue) {
  state.maxPrice = Number(priceRange.value);
  priceValue.textContent = priceRange.value;
  priceRange.addEventListener('input', () => {
    priceValue.textContent = priceRange.value;
  });
}

if (searchInput) {
  searchInput.addEventListener('change', () => {
    state.search = searchInput.value.trim();
    state.page = 1;
    loadProducts();
  });
}

if (sortSelect) {
  sortSelect.addEventListener('change', () => {
    const selected = sortLookup[sortSelect.value];
    if (selected) {
      state.sortField = selected.sortField;
      state.sortOrder = selected.sortOrder;
    }
    state.page = 1;
    loadProducts();
  });
}

if (limitSelect) {
  limitSelect.addEventListener('change', () => {
    state.limit = Number(limitSelect.value);
    state.page = 1;
    loadProducts();
  });
}

if (applyButton) {
  applyButton.addEventListener('click', () => {
    syncStateFromControls();
    state.page = 1;
    loadProducts();
  });
}

if (paginationEl) {
  paginationEl.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-page]');
    if (!button) return;
    state.page = Number(button.dataset.page);
    loadProducts();
  });
}

if (grid) {
  grid.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action="add"]');
    if (!button) return;
    const card = button.closest('[data-product-id]');
    const id = card.dataset.productId;
    const name = card.querySelector('h3').textContent;
    const price = Number(card.querySelector('.product-card__price').textContent.replace('$', ''));
    addToCart({ id, name, price, quantity: 1 });
    updateCartIndicator();
    button.textContent = 'Added!';
    setTimeout(() => (button.textContent = 'Add to Cart'), 1200);
  });
}

loadFilters();
loadProducts();
