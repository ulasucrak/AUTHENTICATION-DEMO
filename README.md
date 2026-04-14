# Auth project

A small full-stack authentication demo: a **Node.js / Express** API with **MongoDB**, **JWT** sessions, email verification and password reset via **Nodemailer** (Gmail), plus static **HTML** pages for sign-in, sign-up, dashboard, and forgot-password flows.

## Project layout

| Path | Role |
|------|------|
| `backend/` | Express app, auth routes, user model, email helpers |
| `frontend/` | Static HTML pages that call the API (`http://localhost:3000`) |

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- A running [MongoDB](https://www.mongodb.com/) instance (local or Atlas)
- A Gmail account with an [app password](https://support.google.com/accounts/answer/185833) if you use Gmail for outbound mail (see env vars below)

## Backend setup

1. Install dependencies:

   ```bash
   cd backend && npm install
   ```

2. Create `backend/.env` with at least:

   | Variable | Purpose |
   |----------|---------|
   | `MONGO_URI` | MongoDB connection string |
   | `JWT_SECRET` | Secret for signing JWTs |
   | `EMAIL_USER` | SMTP / Gmail address used as sender |
   | `EMAIL_PASS` | Gmail app password (or SMTP password) |
   | `PORT` | Optional; defaults to `3000` |

3. Start the API:

   ```bash
   npm run dev
   ```

   The server listens on the configured port (default `3000`).

## Frontend

Open the HTML files under `frontend/` in a browser (e.g. `index.html` for login). They expect the API at `http://localhost:3000`. Start the backend first.

To avoid browser restrictions on `file://` URLs, you can serve the folder locally, for example:

```bash
npx --yes serve frontend -p 5500
```

Then visit the printed URL and use the app from there.

## API overview

Auth routes are mounted at `/api/auth` (for example: signup, login, verify-email, forgot-password, reset-password). See `backend/routes/auth.js` for the full set of endpoints and request bodies.

## License

ISC (see `backend/package.json`).
