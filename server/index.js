import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { sql } from './db.js'; // Sesuaikan path db kamu jika berbeda
import { verifyPassword, setAuthCookie, publicUser } from './auth.js'; // Sesuaikan path auth kamu jika berbeda

dotenv.config();

// 1. Inisialisasi Express
const app = express();

// 2. Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// 3. Middleware Penangan Prefix /api (Taruh sebelum route)
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  req.url = `/api${req.url}`;
  return next();
});

// 4. Health Check Route
app.get(['/api/health', '/health'], (req, res) => {
  res.json({ status: 'ok', database: 'connected' });
});

// 5. Auth Routes (Login)
app.post(['/api/login', '/login', '/api/auth/login', '/auth/login'], async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const rows = await sql`
      SELECT id, username, email, password_hash, role
      FROM users
      WHERE LOWER(username) = LOWER(${username}) OR LOWER(email) = LOWER(${username})
      LIMIT 1
    `;

    const user = rows[0];

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    setAuthCookie(res, user);
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

// 6. Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// 7. Export untuk Vercel Serverless Function
export default app;