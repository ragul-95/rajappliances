# RajAppliences – Full-Stack MERN E-Commerce Platform

A production-ready MERN e-commerce application featuring a React 19 storefront and administrative dashboard connected to an Express 4 REST API, backed by MongoDB Atlas and Cloudinary for media storage.

---

## Table of Contents
1. [Architecture & Features](#architecture--features)
2. [Project Structure](#project-structure)
3. [Environment Configuration](#environment-configuration)
4. [Installation & Setup](#installation--setup)
5. [Database Seeding](#database-seeding)
6. [Available Scripts](#available-scripts)
7. [API Specification](#api-specification)
8. [Security & Business Rules](#security--business-rules)
9. [Automated Testing](#automated-testing)
10. [Production Deployment Guide](#production-deployment-guide)

---

## Architecture & Features

- **Storefront**: React 19, Vite, React Router v7, Context API for state management (Auth, Cart, Wishlist, Toast).
- **Backend**: Node.js (v24), Express 4 with ES Modules (`"type": "module"`), Mongoose 8 ODM.
- **Media Management**: Multer in-memory upload directly streamed to Cloudinary CDN (4 viewing angles: Front, Back, Left, Right).
- **Security & Integrity**:
  - Double-submit CSRF cookie protection (`X-CSRF-Token` header).
  - Dual HTTP-only, SameSite JWT session cookies (separate tokens and secret keys for customers vs. administrators).
  - Atomic stock reservations with conditional updates (no negative inventory, concurrency race protection, rollback on partial failures).
  - Strict order status progression with single-execution inventory restoration on order cancellation.
  - Rate limiting, Helmet security headers, HPP parameter pollution protection, and NoSQL injection sanitization.

---

## Project Structure

```
rajappliances/
├── client/                     # React 19 + Vite Frontend
│   ├── src/
│   │   ├── admin/             # Administrative views (Dashboard, Products, Orders)
│   │   ├── components/        # Shared components (Header, Footer, Cards, Modal)
│   │   ├── context/           # React Context providers (Auth, Cart, Toast, etc.)
│   │   ├── pages/             # Storefront pages (Home, Products, Detail, Checkout, Orders)
│   │   ├── services/          # API layer (api.js, index.js, mockApi.js)
│   │   └── constants.js       # Shared domain constants (categories, statuses, etc.)
│   ├── .env                   # Client environment variables (VITE_API_MODE=real)
│   └── vite.config.js         # Vite dev server with proxy to backend
│
├── server/                     # Express 4 Backend
│   ├── src/
│   │   ├── config/            # DB connection, env validation (Zod), Cloudinary
│   │   ├── controllers/       # Route handlers (auth, products, orders, admin)
│   │   ├── middleware/        # Auth, CSRF, rate limit, upload, validation, errors
│   │   ├── models/            # Mongoose models: User, Admin, Product, Order, Counter
│   │   ├── routes/            # Express route routers
│   │   ├── scripts/           # Seeding scripts (seedAdmin.js, seedProducts.js)
│   │   ├── services/          # Business logic: orderService.js
│   │   ├── utils/             # AppError, order numbering
│   │   ├── app.js             # Express application configuration
│   │   └── server.js          # Server entry point & graceful shutdown
│   ├── tests/                 # Vitest automated test suite (Stages A–E)
│   ├── .env                   # Server environment variables
│   └── package.json
└── README.md
```

---

## Environment Configuration

### Client Configuration (`client/.env`)

```env
VITE_API_MODE=real
# Optional: defaults to /api when using the Vite proxy
# VITE_API_URL=http://localhost:5000/api
```

### Server Configuration (`server/.env`)

Create `server/.env` based on `server/.env.example`:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/rajappliences?retryWrites=true&w=majority
CLIENT_ORIGIN=http://localhost:5173

# Authentication (Must be two distinct secrets, at least 32 chars in production)
JWT_SECRET=your_super_secret_user_jwt_key_here_minimum_16_characters
JWT_ADMIN_SECRET=your_super_secret_admin_jwt_key_here_minimum_16_characters
JWT_EXPIRES_IN=7d
COOKIE_SECURE=false

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Initial Admin Credentials (for seed script)
ADMIN_EMAIL=admin@rajappliences.com
ADMIN_PASSWORD=YourStrongAdminPassword2026!
```

---

## Installation & Setup

### 1. Install Dependencies

In the root folder, install dependencies for both client and server:

```bash
# Server dependencies
cd server
npm install

# Client dependencies
cd ../client
npm install
```

### 2. Database Seeding

Before starting the application, seed the database with the administrator account and the initial 40 product catalog:

```bash
cd server
npm run seed:admin
npm run seed:products
```

- `npm run seed:admin`: Creates or updates the admin account defined in `.env` using bcrypt (cost factor 12).
- `npm run seed:products`: Seeds the catalog of 40 products with prices, stock, sizes (for Fashion), categories, ratings, and all 4 camera angles. Safe to run repeatedly (idempotent).

### 3. Run Locally

Open two terminal sessions:

**Terminal 1 (Backend Server):**
```bash
cd server
npm run dev
# Server listens on http://localhost:5000
```

**Terminal 2 (Frontend Client):**
```bash
cd client
npm run dev
# Client runs on http://localhost:5173
```

Visit `http://localhost:5173` in your browser. The Vite proxy seamlessly forwards requests matching `/api/*` to `http://localhost:5000`.

---

## Available Scripts

### Server (`server/`)
- `npm run dev`: Runs the backend using `nodemon` for auto-reloading during development.
- `npm start`: Runs the production server with `node src/server.js`.
- `npm test`: Runs the Vitest integration test suite (covering auth, CSRF, stock concurrency, rollbacks, and status transitions).
- `npm run seed:admin`: Creates or updates the administrator account.
- `npm run seed:products`: Seeds the legacy product catalog.

### Client (`client/`)
- `npm run dev`: Starts the Vite development server with hot module replacement (HMR).
- `npm run build`: Compiles production build to `client/dist`.
- `npm run preview`: Previews the production build locally.

---

## API Specification

All API endpoints are prefixed with `/api`. Mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) require the `X-CSRF-Token` header.

### 1. Security & Health
- `GET /api/health`: Uptime and system status check.
- `GET /api/csrf-token`: Issues a CSRF token and sets the `_csrf` cookie.

### 2. Public Storefront
- `GET /api/products`: Search and filter catalog.
  - Query parameters: `search`, `category` (comma-separated), `minPrice`, `maxPrice`, `rating`, `sort` (`price-low`, `price-high`, `rating`), `ids` (comma-separated), `limit`.
- `GET /api/products/home`: Returns curated collections (`deals`, `bestSellers`, `recommended`).
- `GET /api/products/:id`: Returns product details.

### 3. Customer Authentication
- `POST /api/auth/register`: Create account (`name`, `email`, `password`). Sets `raj_user_token` cookie.
- `POST /api/auth/login`: Authenticate customer (`email`, `password`). Sets `raj_user_token` cookie.
- `POST /api/auth/logout`: Clears user authentication cookie.
- `GET /api/auth/me`: Retrieves authenticated customer profile.

### 4. Orders (Customer)
- `POST /api/orders`: Place order with shipping details and cart lines (`productId`, `size`, `quantity`). Atomic stock reservation and price calculation.
- `GET /api/orders/mine`: Returns order history for authenticated customer (newest first).

### 5. Admin Authentication & Dashboard
- `POST /api/admin/auth/login`: Authenticate admin (`email`, `password`). Sets `raj_admin_token` cookie.
- `POST /api/admin/auth/logout`: Clears admin authentication cookie.
- `GET /api/admin/auth/me`: Retrieves authenticated admin profile.
- `GET /api/admin/stats`: Summary counts of products, orders, and order breakdown by status.

### 6. Admin Product & Order Management
- `GET /api/admin/products`: List all products (supports `search`, `category`, `badge`).
- `GET /api/admin/products/:id`: Retrieve single product.
- `POST /api/admin/products`: Multipart upload to add product with up to 4 image angles (`front`, `back`, `left`, `right`).
- `PUT /api/admin/products/:id`: Multipart update for product details and selective image angle replacement.
- `DELETE /api/admin/products/:id`: Deletes product and removes assets from Cloudinary.
- `GET /api/admin/orders`: List customer orders (supports search query `q` and status filter).
- `GET /api/admin/orders/:id`: Detailed view of order, shipping, items, and status history.
- `PATCH /api/admin/orders/:id/status`: Transition order status (`status`, optional `note`). Enforces allowed workflow.

---

## Security & Business Rules

1. **Payment & Delivery**:
   - `paymentMethod` is strictly **Cash on Delivery**.
   - `deliveryFee` is always ₹0 (Free delivery).
2. **Server-Side Pricing & Stock**:
   - The client never dictates prices. Line totals and order totals are calculated exclusively from database records.
   - Stock reservation uses conditional atomic operators (`$gte` & `$inc`).
   - If one item in a multi-item checkout lacks sufficient stock, all previously reserved items are immediately rolled back.
   - Race condition safety: when multiple buyers target the last unit simultaneously, exactly one succeeds.
3. **Status Workflow**:
   - `Order Placed` ➔ `Processing` ➔ `Shipped` ➔ `Out for Delivery` ➔ `Delivered`.
   - Cancellation is permitted only from `Order Placed` or `Processing`.
   - On cancellation, product stock is restored exactly once (guarded by `stockRestored: true`).
4. **Cookie Security**:
   - Separate JWT secrets (`JWT_SECRET` vs. `JWT_ADMIN_SECRET`).
   - Separate HTTP-only cookies (`raj_user_token` vs. `raj_admin_token`).
   - Cross-role access is denied at the middleware layer.

---

## Automated Testing

The backend includes comprehensive integration tests with Vitest, Supertest, and Mongo Memory Server / MongoDB Atlas:

```bash
cd server
npm test
```

Test coverage includes:
- **Stage A**: Environment variable validation, CSRF verification, security headers, health check.
- **Stage B**: Admin auth isolation, Cloudinary upload streaming, product CRUD, asset cleanup.
- **Stage C**: Public catalog filters, sorts, home collections, customer auth rate-limiting.
- **Stage D**: Order creation, atomic stock deduction, rollback handling, concurrent race conditions.
- **Stage E**: Admin dashboard stats, order list queries, valid/invalid status progression, single stock restoration on cancellation.

---

## Production Deployment Guide

### 1. MongoDB Atlas
1. Create a MongoDB Atlas cluster (M0 or higher).
2. In **Database Access**, create a user with read/write permissions.
3. In **Network Access**, allow access from anywhere (`0.0.0.0/0`) or whitelist your deployment server IP.
4. Copy the connection string into `MONGO_URI`.

### 2. Cloudinary
1. Sign up for a free Cloudinary account.
2. In the Cloudinary Dashboard, obtain your **Cloud Name**, **API Key**, and **API Secret**.
3. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.

### 3. Deploy API (Render / Railway)
1. Link your Git repository to **Render** (Web Service) or **Railway**.
2. Root directory: `server`.
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Configure environment variables:
   - `NODE_ENV=production`
   - `PORT=5000` (or leave default assigned by platform)
   - `MONGO_URI=<your-atlas-connection-string>`
   - `CLIENT_ORIGIN=https://your-storefront.vercel.app`
   - `JWT_SECRET=<strong-random-32+-char-secret>`
   - `JWT_ADMIN_SECRET=<different-strong-random-32+-char-secret>`
   - `COOKIE_SECURE=true`
   - `CLOUDINARY_CLOUD_NAME=...`
   - `CLOUDINARY_API_KEY=...`
   - `CLOUDINARY_API_SECRET=...`
   - `ADMIN_EMAIL=...`
   - `ADMIN_PASSWORD=...`

### 4. Deploy Frontend (Vercel / Netlify)
1. Link your Git repository to **Vercel** or **Netlify**.
2. Root directory: `client`.
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Environment Variables:
   - `VITE_API_MODE=real`
   - `VITE_API_URL=https://your-api.onrender.com/api` (if not using proxy/rewrites)

### 5. Cross-Site Cookie & Domain Caveat
When hosting frontend and backend on separate third-party domains (e.g. `your-app.vercel.app` and `your-api.onrender.com`):
- Browsers enforce third-party cookie restrictions.
- In `server/src/middleware/auth.js` and `csrf.js`, set:
  ```javascript
  sameSite: 'none',
  secure: true
  ```
- **Recommended Best Practice**: Use Vercel or Netlify rewrites (reverse proxy) so both frontend and `/api` reside on the same domain:
  **`vercel.json`**:
  ```json
  {
    "rewrites": [
      {
        "source": "/api/:path*",
        "destination": "https://your-api.onrender.com/api/:path*"
      }
    ]
  }
  ```
  This keeps all authentication and CSRF cookies first-party (`SameSite=Lax`), avoiding all third-party cookie blocking.
