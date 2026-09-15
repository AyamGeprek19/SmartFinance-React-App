import 'dotenv/config';
import { sql } from '../server/db.js';
import { hashPassword } from '../server/auth.js';

const accounts = [
  {
    username: process.env.ADMIN_USERNAME,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    role: 'admin',
  },
  {
    username: process.env.USER_USERNAME,
    email: process.env.USER_EMAIL,
    password: process.env.USER_PASSWORD,
    role: 'user',
  },
];

for (const account of accounts) {
  if (!account.username || !account.email || !account.password) {
    throw new Error(`Missing credentials for ${account.role}. Configure them in .env before seeding.`);
  }
  const passwordHash = await hashPassword(account.password);
  await sql`
    INSERT INTO users (username, email, password_hash, role)
    VALUES (${account.username}, ${account.email}, ${passwordHash}, ${account.role})
    ON CONFLICT (username) DO UPDATE
      SET email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role,
          updated_at = NOW()
  `;
  console.log(`Seeded ${account.role}: ${account.username}`);
}
