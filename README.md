# ToolKart E-commerce

ToolKart is a demo full-stack e-commerce experience built with a vanilla HTML/CSS/JS frontend and an Express + MongoDB backend. The project is organised into two workspaces:

- `frontend/` – static pages, shared assets, and small ES modules that consume the backend APIs. Pages cover Home, Shop, About, Contact, Cart, Login, and the Admin console.
- `backend/` – REST API using Express, Mongoose, JWT auth, and demo store fallbacks when MongoDB is unavailable.

## Feature highlights

- Role-based authentication with HTTP-only session cookies
- Fixed admin seeding (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) plus standard customer accounts
- Strict route guards: admins are forced into the dashboard, customers are blocked from `/admin`
- Admin dashboard with real CRUD for categories and products, including local image uploads stored in `/uploads`
- Customer storefront with “Shop by Category” cards (category image + name) and category-filtered shop views

## Getting started

1. Install dependencies (network access required):
   ```bash
   cd backend
   npm install
   ```
2. Configure environment variables (see `backend/.env` for defaults). At minimum provide:
   ```env
   ADMIN_EMAIL=admin@toolkart.com
   ADMIN_PASSWORD=Admin@123
   ADMIN_NAME=ToolKart Admin
   ```
3. Start the API:
   ```bash
   npm run dev
   ```
   The server listens on `http://localhost:3000` and serves uploaded images from `/uploads`.
4. Serve the frontend directory with your favourite static server (VS Code Live Preview, `npx http-server frontend`, etc.).

> **Session tip:** admin and customer sessions share one HTTP-only cookie. Use separate browser profiles/windows if you need to be logged in as both roles at once.

## Admin workflow

1. Log in with the seeded admin credentials.
2. The public navigation hides automatically and you are redirected to `/admin`.
3. Create or update categories/products.
   - Image inputs accept local files (multipart uploads). Files are written to `/uploads` and the API returns the public URL.
   - Edit/delete actions are available directly in the tables.

## Customer workflow

- Customers land on `/` and see category cards rendered with the stored category image.
- Selecting a category opens `/shop?category=<slug>` and filters the product grid accordingly.
- Admin-only pages redirect customers to `/login`.

## Additional docs

- `backend/README.md` – API routes, scripts, and environment variables
- `frontend/README.md` – directory overview and API configuration hints
