// Creates the first admin user, or gives an existing user the admin role.
// Usage: npm run create-admin -- you@example.com "Your Name"
//    or: docker compose exec app node scripts/create-admin.mjs you@example.com "Your Name"
import { randomUUID } from "node:crypto";
import pg from "pg";

const [email, ...nameParts] = process.argv.slice(2);
const name = nameParts.join(" ").trim();
if (!email || !email.includes("@") || !name) {
  console.error('Usage: create-admin <email> "<name>"');
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const normalized = email.trim().toLowerCase();
  const existing = await client.query('select id, roles from "user" where email = $1', [normalized]);
  if (existing.rowCount) {
    await client.query(
      `update "user" set roles = array(select distinct unnest(roles || '{admin}'::text[])), active = true, updated_at = now() where id = $1`,
      [existing.rows[0].id],
    );
    console.log(`${normalized} now has the admin role.`);
  } else {
    await client.query(
      `insert into "user" (id, name, email, email_verified, roles, active) values ($1, $2, $3, false, '{admin}', true)`,
      [randomUUID(), name, normalized],
    );
    console.log(`Created admin ${name} <${normalized}>.`);
  }
} finally {
  await client.end();
}
