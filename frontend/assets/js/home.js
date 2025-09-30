import { api } from './api.js';
import { demoCategories, demoProducts } from './demoData.js';
import { resolveMediaUrl } from './media.js';
import { addToCart } from './store.js';
import { updateCartIndicator } from './main.js';

const categoryGrid = document.querySelector('[data-category-grid]');
const featuredGrid = document.querySelector('[data-featured-grid]');

function toSlug(value = '') {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function renderCategories(categories) {
  if (!categoryGrid) return;
  categoryGrid.innerHTML = categories
    .map(
      (category) => {
        const name = category.name || category.label || 'Category';
        const icon = category.icon || '🛠️';
        const slug = category.slug || toSlug(name);
        const hint = Number(category.productCount || 0);
        const hintHtml = hint ? `<p class="text-muted">${hint} products</p>` : '';
        const image = resolveMediaUrl(category.image);
        const media = image
          ? `<div class="category-card__media"><img src="${image}" alt="${name}" loading="lazy" /></div>`
          : `<div class="category-card__media"><div class="category-card__icon">${icon}</div></div>`;
        return `
          <a class="category-card" href="./shop.html?category=${encodeURIComponent(slug)}">
            ${media}
            <h3>${name}</h3>
            ${hintHtml}
          </a>
        `;
      }
    )
    .join('');
}

function renderProducts(products) {
  if (!featuredGrid) return;
  featuredGrid.innerHTML = products
    .map(
      (product) => {
        const image = resolveMediaUrl(product.image || product.images?.[0]);
        const icon = product.icon || '🛠️';
        const imageMarkup = image
          ? `<div class="product-card__image"><img src="${image}" alt="${product.name}" loading="lazy" /></div>`
          : `<div class="product-card__image">${icon}</div>`;
        return `
        <article class="product-card" data-product-id="${product._id || product.id}">
          ${imageMarkup}
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
      `;
      }
    )
    .join('');
}

async function loadHome() {
  renderCategories(
    demoCategories.map((category) => ({
      name: category.label,
      icon: category.icon,
      slug: toSlug(category.label),
      image: resolveMediaUrl(category.image)
    }))
  );
  renderProducts(demoProducts.map((product) => ({
    ...product,
    image: resolveMediaUrl(product.image || product.images?.[0])
  })));

  try {
    const [featuredResult, categoriesResult] = await Promise.all([
      api.getFeatured(),
      api.getCategories()
    ]);

    const categories = Array.isArray(categoriesResult)
      ? categoriesResult
      : Array.isArray(categoriesResult?.data)
        ? categoriesResult.data
        : [];

    if (categories.length) {
      renderCategories(categories.map((category) => ({
        ...category,
        image: resolveMediaUrl(category.image)
      })));
    }

    const featuredProducts = Array.isArray(featuredResult)
      ? featuredResult
      : Array.isArray(featuredResult?.data)
        ? featuredResult.data
        : [];

    if (featuredProducts.length) {
      renderProducts(featuredProducts.map((product) => ({
        ...product,
        image: resolveMediaUrl(product.image || product.images?.[0])
      })));
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
