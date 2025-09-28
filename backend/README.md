# ToolKart API

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and update the values. `MONGO_URI` can be blank to run in in-memory demo mode.
3. Start the server:
   ```bash
   npm run dev
   ```

The API listens on `http://localhost:3000` by default. When MongoDB is unavailable, the server serves demo data in-memory so the frontend remains functional.

## Scripts

- `npm run dev` – start with Nodemon
- `npm start` – start for production
- `npm run seed` – seed MongoDB with the bundled demo catalog

## Routes

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/products` (query params: `category`, `brand`, `search`, `page`, `limit`, `sort`, `order`)
- `GET /api/products/:id`
- `GET /api/products/featured`
- `GET /api/products/filters`
- `POST /api/orders` (auth required)
- `GET /api/orders` (auth required)
- `GET /api/admin/dashboard` (admin token required)

The `/api/admin/dashboard` payload supports the admin UI cards and charts.
