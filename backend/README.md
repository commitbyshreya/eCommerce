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
- `POST /api/products` (admin, multipart form with optional `image` file)
- `PUT /api/products/:id` (admin, multipart form with optional `image` file)
- `DELETE /api/products/:id` (admin)
- `POST /api/orders` (auth required)
- `GET /api/orders` (auth required)
- `GET /api/categories`
- `POST /api/categories` (admin, multipart form with optional `image` file)
- `PUT /api/categories/:id` (admin, multipart form with optional `image` file)
- `DELETE /api/categories/:id` (admin)
- `GET /api/admin/dashboard` (admin token required)

The `/api/admin/dashboard` payload supports the admin UI cards and charts.

### File uploads

- Uploaded images are stored under `<repo>/uploads` and exposed at `http://localhost:3000/uploads/<filename>`.
- The directory is created automatically at runtime; ensure the process has write permissions.
