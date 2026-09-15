# SmartFinance

SmartFinance uses a Vite React client and an Express API backed by Neon Postgres.

## Neon setup

1. Create a Neon project and copy its pooled connection string.
2. Copy `.env.example` to `.env`.
3. Set `DATABASE_URL` to the Neon connection string and replace `JWT_SECRET`.
4. Set the admin and user credentials in `.env` before running the seed.
5. Run:

```bash
npm run db:migrate
npm run db:seed
```

The seed creates or updates one `admin` account and one `user` account. Passwords
are stored as bcrypt hashes and are never returned by the API.

## Run locally

```bash
npm run dev:all
```

The React app runs at `http://localhost:5173` and proxies `/api` requests to the
Express API at `http://localhost:3001`.

The API supports:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/users` (admin only)
- `GET /api/health`

## GitHub and public deployment security

- Never commit `.env`, `.env.local`, or any file containing `DATABASE_URL`,
  `JWT_SECRET`, or account passwords. They are ignored by `.gitignore`.
- If a secret was ever committed or shared publicly, rotate it immediately in
  Neon and in the hosting provider.
- Add the variables from `.env.example` to the hosting provider's secret or
  environment-variable settings. Do not put them in frontend code.
- Set `NODE_ENV=production`, a random `JWT_SECRET` of at least 32 characters,
  the Neon `DATABASE_URL`, and `CLIENT_ORIGIN` to the exact public frontend URL.
- Keep the API and database credentials server-side. Only `VITE_*` variables are
  exposed to the browser by Vite.
- The API deployment command is `npm start`. A static host such as GitHub Pages
  cannot run this Express API; deploy the API to a Node host and configure the
  frontend proxy/API URL for that host.
- `VITE_API_URL` may be `/api`, `https://api.example.com`, or
  `https://api.example.com/api`; the frontend normalizes all three forms to the
  API routes.
- If frontend and API are on different domains, set `VITE_API_URL` to the API
  URL and set `CLIENT_ORIGIN` on the API to the exact frontend URL. Multiple
  frontend URLs may be comma-separated in `CLIENT_ORIGIN`.
- After changing any `VITE_*` variable, run `npm run build` and redeploy the
  generated `dist` directory. Vite embeds these values at build time; changing
  the hosting environment without rebuilding leaves the old API URL in the
  browser.
- For local production-preview testing, use `npm run preview`; its `/api`
  proxy also points to the local API on port `3001`. Do not use a generic
  static server for `dist` unless `VITE_API_URL` points to a separately
  deployed API.
