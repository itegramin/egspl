import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { Client } = pg;

const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const isLocal =
  connectionString.includes('127.0.0.1') || connectionString.includes('localhost');

// ---------------------------------------------------------------------------
// SSL configuration
// ---------------------------------------------------------------------------
// Supabase (both direct and pooler endpoints) uses a private CA whose root is
// not included in Node.js's default trust store. The only way to get full cert
// validation is to pin Supabase's own CA certificate.
//
// To enable full validation (recommended):
//   1. Supabase Dashboard → Project Settings → Database → SSL Certificate → Download.
//   2. Save the file as: supabase/supabase-ca.crt
//   3. Re-run: npm run db:migrate
//
// The CA cert file is listed in .gitignore — do NOT commit it.
// ---------------------------------------------------------------------------
const CA_CERT_PATH =
  process.env.SUPABASE_CA_CERT_PATH ??
  path.resolve(process.cwd(), 'supabase', 'supabase-ca.crt');

function getSslConfig(): false | object {
  if (isLocal) return false; // local Supabase CLI — no TLS needed

  if (fs.existsSync(CA_CERT_PATH)) {
    // Full mutual TLS with pinned Supabase CA cert (SEC-09 ✅)
    return {
      rejectUnauthorized: true,
      ca: fs.readFileSync(CA_CERT_PATH).toString(),
    };
  }

  // No CA cert on disk — fall back to encrypted-but-unpinned.
  // Traffic is still TLS-encrypted; only MITM cert swapping is not caught.
  console.warn('\n⚠️  SSL Warning: CA cert not found. Running without certificate validation.');
  console.warn(`   To enable full validation, download your Supabase CA cert and save it to:`);
  console.warn(`     ${CA_CERT_PATH}`);
  console.warn('   Get it from: Supabase Dashboard → Project Settings → Database → SSL Certificate\n');
  return { rejectUnauthorized: false };
}

async function runMigration() {
  const masked = connectionString.replace(/:[^:@]+@/, ':****@');
  console.log(' Connecting to PostgreSQL at:', isLocal ? connectionString : masked);

  const sslConfig = getSslConfig();
  if (sslConfig && typeof sslConfig === 'object' && 'ca' in sslConfig) {
    console.log(' SSL mode: full cert validation ✅ (CA cert pinned)');
  } else if (sslConfig) {
    console.log(' SSL mode: encrypted, cert chain not validated (add supabase-ca.crt to enable)');
  }

  const client = new Client({
    connectionString,
    ssl: sslConfig as any,
  });

  try {
    await client.connect();
    console.log(' Connected to Postgres database.');

    const sqlPath = path.resolve(process.cwd(), 'supabase', 'schema.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Schema file not found at ${sqlPath}`);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log(' Executing schema.sql migration and seeding tables...');
    await client.query(sql);
    console.log(' Migration & seeding completed successfully!');

    // Test row counts
    const resUsers = await client.query('SELECT count(*) FROM csmp_users');
    const resRequests = await client.query('SELECT count(*) FROM csmp_requests');
    const resPermissions = await client.query('SELECT count(*) FROM csmp_role_permissions');
    const resAudit = await client.query('SELECT count(*) FROM csmp_audit_logs');
    const resNotifs = await client.query('SELECT count(*) FROM csmp_notifications');

    console.log('\n Database Summary:');
    console.log(`  - Users: ${resUsers.rows[0].count}`);
    console.log(`  - Requests: ${resRequests.rows[0].count}`);
    console.log(`  - Role Permissions: ${resPermissions.rows[0].count}`);
    console.log(`  - Audit Logs: ${resAudit.rows[0].count}`);
    console.log(`  - Notifications: ${resNotifs.rows[0].count}`);
  } catch (err: any) {
    console.error('\n❌ Migration failed:', err.message || err);

    if (err.code === 'ECONNREFUSED' && isLocal) {
      console.error('\n⚠️ Local PostgreSQL is not running on 127.0.0.1:54322.');
    } else if (err.code === 'ETIMEDOUT' || err.message?.includes('ETIMEDOUT')) {
      console.log('\n💡 Connection Timed Out (IPv6 / Network Issue):');
      console.log('   Supabase direct database URLs (db.xxx.supabase.co) use IPv6, which is often not supported by local ISPs/networks.');
    }

    console.log('\n🛠️ How to resolve:');
    console.log('  Option 1 — Pin Supabase CA cert (enables full TLS validation):');
    console.log('    1. Supabase Dashboard → Project Settings → Database → SSL Certificate → Download.');
    console.log(`    2. Save the file as: ${CA_CERT_PATH}`);
    console.log('    3. Re-run: npm run db:migrate\n');
    console.log('  Option 2 — Supabase SQL Editor (no local connection needed):');
    console.log('    1. Open https://supabase.com/dashboard → SQL Editor.');
    console.log('    2. Paste supabase/schema.sql and click Run.\n');
    process.exit(1);
  } finally {
    await client.end().catch(() => { });
  }
}

runMigration();
