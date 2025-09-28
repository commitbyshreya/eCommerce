import { api } from './api.js';
import { demoCategories, demoProducts } from './demoData.js';
import { addToCart } from './store.js';
import { updateCartIndicator } from './main.js';

const categoryGrid = document.querySelector('[data-category-grid]');
const featuredGrid = document.querySelector('[data-featured-grid]');

function renderCategories(categories) {
  if (!categoryGrid) return;
  categoryGrid.innerHTML = categories
    .map(
      (category) => `
        <article class="category-card">
          <div class="category-card__icon">${category.icon}</div>
          <h3>${category.label}</h3>
        </article>
      `
    )
    .join('');
}

function renderProducts(products) {
  if (!featuredGrid) return;
  featuredGrid.innerHTML = products
    .map(
      (product) => `
        <article class="product-card" data-product-id="${product._id || product.id}">
          <div class="product-card__image">${product.icon || '🛠️'}</div>
          <div>
            <h3>${product.name}</h3>
            <p class="text-muted">${'★'.repeat(Math.round(Math.min(product.rating || 4, 5)))}</p>
          </div>
          <div class="product-card__price">$${(product.price || 0).toFixed(2)}</div>
          <div class="product-card__actions">
            <button class="btn btn--primary" data-action="add">Add to Cart</button>
            <button class="btn btn--ghost" data-action="quick">Quick View</button>
          </div>
        </article>
      `
    )
    .join('');
}

async function loadHome() {
  renderCategories(demoCategories);
  renderProducts(demoProducts);

  try {
    const [{ data: featuredProducts }, filters] = await Promise.all([
      api.getFeatured(),
      api.getFilters()
    ]);

    if (filters?.categories?.length) {
      renderCategories(filters.categories.map((label) => ({ label, icon: '🛠️' })));
    }

    if (featuredProducts?.length) {
      renderProducts(featuredProducts);
    }
  } catch (error) {
    // demo mode fallback already rendered
  }
}

function handleProductActions(event) {
  const button = event.target.closest('button[data-action="add"]');
  if (!button) return;
  const card = button.closest('[data-product-id]');
  if (!card) return;

  const name = card.querySelector('h3').textContent;
  const priceText = card.querySelector('.product-card__price').textContent.replace('$', '');
  const price = Number(priceText);
  const id = card.dataset.productId;

  addToCart({ id, name, price, quantity: 1 });
  updateCartIndicator();
  button.textContent = 'Added!';
  setTimeout(() => {
    button.textContent = 'Add to Cart';
  }, 1200);
}

if (featuredGrid) {
  featuredGrid.addEventListener('click', handleProductActions);
}

loadHome();
