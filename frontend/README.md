# ToolKart Frontend

Static HTML/CSS/JS implementation of the ToolKart storefront and admin panel.

## Structure

- `index.html`, `shop.html`, `about.html`, `contact.html`, `cart.html`, `login.html`, `admin.html`
- `assets/css/style.css` – primary styles with CSS variables and BEM-ish naming
- `assets/js` – modular ES scripts for API access, storage, and page level behaviour

## Usage

Open the HTML files with a static server (recommended) or via your IDE’s live preview. The scripts expect an API at `http://localhost:3000/api` by default. Set `window.TOOLKART_API_URL` before loading scripts or run `localStorage.setItem('toolkart_api_url', '<your api>')` in the console to point to a hosted backend.

Without a backend the UI falls back to bundled demo data so every page still renders.
