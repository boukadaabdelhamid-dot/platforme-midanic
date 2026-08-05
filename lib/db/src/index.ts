import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

/**
 * Apply all pending Drizzle migrations from the bundled ./drizzle folder.
 * Call once at application startup before serving requests.
 *
 * The migrations directory is resolved relative to this file so it works
 * both in development (TypeScript source) and in the esbuild bundle
 * (dist/index.mjs), provided the `drizzle/` folder is copied alongside
 * the bundle — handled by Dockerfile and build.mjs.
 *
 * Bootstrap behaviour: if the database was previously set up with
 * `drizzle-kit push` (tables exist but the migrations journal doesn't),
 * the initial migration is marked as already applied so `migrate()` only
 * runs subsequent schema changes — preventing duplicate-object errors on
 * types and tables that already exist.
 */
export async function runMigrations(): Promise<void> {
  const { createHash } = await import("crypto");
  const { readFileSync, readdirSync } = await import("fs");
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const migrationsFolder = path.join(__dirname, "drizzle");

  // Detect push-bootstrapped DB: products table exists but the Drizzle
  // migrations journal is absent or empty (no applied migrations recorded).
  const { rows } = await pool.query<{
    has_products: boolean;
    journal_count: string;
  }>(`
    SELECT
      to_regclass('public.products') IS NOT NULL AS has_products,
      CASE
        WHEN to_regclass('drizzle.__drizzle_migrations') IS NULL THEN '0'
        ELSE (SELECT count(*)::text FROM drizzle."__drizzle_migrations")
      END AS journal_count
  `);
  const { has_products, journal_count } = rows[0];
  const hasAppliedMigrations = parseInt(journal_count, 10) > 0;

  if (has_products && !hasAppliedMigrations) {
    // Drizzle tracks applied migrations by comparing each migration's journal
    // timestamp (folderMillis / "when") against the last recorded created_at.
    // If "created_at >= migration.when", the migration is skipped.
    // We read the journal to find the timestamp of the initial migration and
    // insert a sentinel record so that migrate() only runs *new* migrations.
    const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
    const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
      entries: Array<{ idx: number; when: number; tag: string }>;
    };
    // Sort ascending; the initial migration (idx=0) has the lowest timestamp.
    const firstEntry = [...journal.entries].sort((a, b) => a.idx - b.idx)[0];
    if (!firstEntry) return; // Nothing to bootstrap

    // Compute hash the same way Drizzle does: SHA-256 of the SQL file content.
    const sqlFile = path.join(migrationsFolder, `${firstEntry.tag}.sql`);
    const content = readFileSync(sqlFile, "utf8");
    const hash = createHash("sha256").update(content).digest("hex");

    // Ensure the drizzle schema and migrations journal table exist.
    await pool.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS drizzle."__drizzle_migrations" (
        id        SERIAL PRIMARY KEY,
        hash      text    NOT NULL,
        created_at bigint
      )
    `);

    // Insert the initial migration with its original journal timestamp so
    // Drizzle sees it as already applied and only runs subsequent migrations.
    await pool.query(
      `INSERT INTO drizzle."__drizzle_migrations" (hash, created_at)
       VALUES ($1, $2)`,
      [hash, BigInt(firstEntry.when)]
    );
  }

  await migrate(db, { migrationsFolder });
}

export * from "./schema";
