import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { sql } from './db.js';
import {
  clearAuthCookie,
  hashPassword,
  requireAuth,
  requireRole,
  setAuthCookie,
  verifyPassword,
} from './auth.js';

const app = express();
const port = Number(process.env.PORT || 3001);
const allowedOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

if (process.env.NODE_ENV === 'production' && !process.env.CLIENT_ORIGIN) {
  throw new Error('CLIENT_ORIGIN is required in production.');
}

app.use(cors({
  origin: allowedOrigin,
  credentials: true,
}));
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());

function publicUser(user) {
  return { id: user.id, username: user.username, email: user.email, role: user.role };
}

app.get('/api/health', async (_req, res, next) => {
  try {
    await sql`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
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

app.post('/api/auth/logout', (_req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

app.get('/api/auth/me', requireAuth, async (req, res, next) => {
  try {
    const rows = await sql`
      SELECT id, username, email, role FROM users WHERE id = ${req.auth.sub} LIMIT 1
    `;
    if (!rows[0]) {
      clearAuthCookie(res);
      return res.status(401).json({ error: 'User account no longer exists.' });
    }
    return res.json({ user: publicUser(rows[0]) });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/users', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const role = req.body.role === 'admin' ? 'admin' : 'user';
    if (!username || !email || password.length < 8) {
      return res.status(400).json({ error: 'Username, email, and a password of at least 8 characters are required.' });
    }

    const passwordHash = await hashPassword(password);
    const rows = await sql`
      INSERT INTO users (username, email, password_hash, role)
      VALUES (${username}, ${email}, ${passwordHash}, ${role})
      RETURNING id, username, email, role
    `;
    return res.status(201).json({ user: publicUser(rows[0]) });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Username or email is already in use.' });
    }
    return next(error);
  }
});

app.get('/api/transactions', requireAuth, async (req, res, next) => {
  try {
    const rows = await sql`
      SELECT id, type, description, category, amount::float AS amount,
             TO_CHAR(transaction_date, 'YYYY-MM-DD') AS date
      FROM transactions
      WHERE user_id = ${req.auth.sub}
      ORDER BY transaction_date DESC, created_at DESC
    `;
    return res.json({ transactions: rows });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/transactions', requireAuth, async (req, res, next) => {
  try {
    const type = req.body.type === 'income' ? 'income' : 'expense';
    const description = String(req.body.description || '').trim();
    const category = String(req.body.category || '').trim();
    const amount = Number(req.body.amount);
    const date = String(req.body.date || '').trim();
    if (!description || !category || !Number.isFinite(amount) || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Type, description, category, positive amount, and a valid date are required.' });
    }
    const rows = await sql`
      INSERT INTO transactions (user_id, type, description, category, amount, transaction_date)
      VALUES (${req.auth.sub}, ${type}, ${description}, ${category}, ${amount}, ${date})
      RETURNING id, type, description, category, amount::float AS amount,
        TO_CHAR(transaction_date, 'YYYY-MM-DD') AS date
    `;
    return res.status(201).json({ transaction: rows[0] });
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/transactions/:id', requireAuth, async (req, res, next) => {
  try {
    await sql`DELETE FROM transactions WHERE id = ${req.params.id} AND user_id = ${req.auth.sub}`;
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

app.get('/api/budgets', requireAuth, async (req, res, next) => {
  try {
    const month = /^\d{4}-\d{2}$/.test(req.query.month || '') ? `${req.query.month}-01` : `${new Date().toISOString().slice(0, 7)}-01`;
    const rows = await sql`
      SELECT b.id, b.category, b.amount::float AS amount, b.budget_month AS month,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0)::float AS spent
      FROM budgets b
      LEFT JOIN transactions t ON t.user_id = b.user_id AND t.category = b.category
        AND t.type = 'expense' AND DATE_TRUNC('month', t.transaction_date) = DATE_TRUNC('month', b.budget_month)
      WHERE b.user_id = ${req.auth.sub} AND b.budget_month = ${month}
      GROUP BY b.id
      ORDER BY b.category
    `;
    return res.json({ budgets: rows });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/budgets', requireAuth, async (req, res, next) => {
  try {
    const category = String(req.body.category || '').trim();
    const amount = Number(req.body.amount);
    const month = String(req.body.month || '');
    if (!category || !Number.isFinite(amount) || amount <= 0 || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'Kategori, budget positif, dan bulan yang valid wajib diisi.' });
    }
    const rows = await sql`
      INSERT INTO budgets (user_id, category, amount, budget_month)
      VALUES (${req.auth.sub}, ${category}, ${amount}, ${`${month}-01`})
      ON CONFLICT (user_id, category, budget_month) DO UPDATE SET amount = EXCLUDED.amount
      RETURNING id, category, amount::float AS amount, budget_month AS month
    `;
    return res.status(201).json({ budget: rows[0] });
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/budgets/:id', requireAuth, async (req, res, next) => {
  try {
    await sql`DELETE FROM budgets WHERE id = ${req.params.id} AND user_id = ${req.auth.sub}`;
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

if (process.env.NODE_ENV === 'production') {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  app.use(express.static(path.join(root, 'dist')));
  app.use((req, res, next) => {
    if (req.method === 'GET' && req.accepts('html')) {
      return res.sendFile(path.join(root, 'dist', 'index.html'));
    }
    return next();
  });
}

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(port, () => {
  console.log(`SmartFinance API listening on http://localhost:${port}`);
});
