// Ganti baris app.post untuk login dengan kode ini:
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

// Tambahkan tepat sebelum export default app;
app.use((req, res, next) => {
  // Jika Vercel memotong prefix /api, kembalikan ke next() atau tangani 404 dari Express
  if (req.path.startsWith('/api')) return next();
  req.url = `/api${req.url}`;
  return next();
});

export default app;