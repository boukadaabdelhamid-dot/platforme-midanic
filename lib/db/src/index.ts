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

async function ensureProductManagementSchema(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Existing Railway databases may have been created with drizzle-kit push
    // before product versions/downloads were added. Keep this reconciliation
    // idempotent so startup can safely bring those databases up to date.
    await client.query(`
      ALTER TABLE "products"
        ADD COLUMN IF NOT EXISTS "image_url" text,
        ADD COLUMN IF NOT EXISTS "video_url" text,
        ADD COLUMN IF NOT EXISTS "default_license_type" text
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "product_versions" (
        "id" serial PRIMARY KEY NOT NULL,
        "product_id" integer NOT NULL,
        "version" text NOT NULL,
        "release_notes" text,
        "is_latest" boolean DEFAULT false NOT NULL,
        "released_at" timestamp with time zone DEFAULT now() NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "download_files" (
        "id" serial PRIMARY KEY NOT NULL,
        "product_id" integer NOT NULL,
        "version_id" integer,
        "file_name" text NOT NULL,
        "file_size" integer DEFAULT 0 NOT NULL,
        "platform" text DEFAULT 'windows' NOT NULL,
        "version" text,
        "download_url" text NOT NULL,
        "download_count" integer DEFAULT 0 NOT NULL,
        "is_public" boolean DEFAULT true NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    // NOT VALID lets legacy rows remain untouched while enforcing the
    // relationship for all new writes. This avoids startup failure when an
    // old database contains orphaned records.
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'product_versions_product_id_products_id_fk'
            AND table_name = 'product_versions'
        ) THEN
          ALTER TABLE "product_versions"
            ADD CONSTRAINT "product_versions_product_id_products_id_fk"
            FOREIGN KEY ("product_id") REFERENCES "public"."products"("id")
            ON DELETE cascade ON UPDATE no action
            NOT VALID;
        END IF;
      END $$
    `);

    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'download_files_product_id_products_id_fk'
            AND table_name = 'download_files'
        ) THEN
          ALTER TABLE "download_files"
            ADD CONSTRAINT "download_files_product_id_products_id_fk"
            FOREIGN KEY ("product_id") REFERENCES "public"."products"("id")
            ON DELETE cascade ON UPDATE no action
            NOT VALID;
        END IF;
      END $$
    `);

    // Replace any existing version FK, regardless of its old delete rule.
    await client.query(`
      DO $$
      DECLARE constraint_row record;
      BEGIN
        FOR constraint_row IN
          SELECT conname
          FROM pg_constraint
          WHERE conrelid = 'download_files'::regclass
            AND contype = 'f'
            AND confrelid = 'product_versions'::regclass
        LOOP
          EXECUTE format(
            'ALTER TABLE "download_files" DROP CONSTRAINT %I',
            constraint_row.conname
          );
        END LOOP;

        ALTER TABLE "download_files"
          ADD CONSTRAINT "download_files_version_id_product_versions_id_fk"
          FOREIGN KEY ("version_id") REFERENCES "public"."product_versions"("id")
          ON DELETE set null ON UPDATE no action
          NOT VALID;
      END $$
    `);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

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
  const { readFileSync } = await import("fs");
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

  if (has_products) {
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
    if (!firstEntry) throw new Error("No migration entries found in _journal.json");

    await pool.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS drizzle."__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `);

    const migrationRows = await pool.query<{ hash: string; created_at: string }>(
      `SELECT hash, created_at FROM drizzle."__drizzle_migrations"`
    );
    const appliedHashes = new Set(migrationRows.rows.map((row) => row.hash));

    // A push-bootstrapped DB already has the schema represented by 0000.
    // Record that baseline only when the journal is empty.
    if (!hasAppliedMigrations) {
      const sqlFile = path.join(migrationsFolder, `${firstEntry.tag}.sql`);
      const content = readFileSync(sqlFile, "utf8");
      const hash = createHash("sha256").update(content).digest("hex");
      await pool.query(
        `INSERT INTO drizzle."__drizzle_migrations" (hash, created_at)
         VALUES ($1, $2)`,
        [hash, BigInt(firstEntry.when)]
      );
      appliedHashes.add(hash);
    }

    // Reconcile the product-management schema before Drizzle evaluates
    // migration timestamps. This handles old journals and partial schemas.
    await ensureProductManagementSchema();

    // Mark 0001 applied after the reconciliation succeeds. This prevents
    // Drizzle from rerunning its historical FK DDL against a legacy schema,
    // while future migrations remain managed by Drizzle normally.
    const productMigration = journal.entries.find(
      (entry) => entry.tag === "0001_add_product_fields_and_fix_fk"
    );
    if (productMigration) {
      const sqlFile = path.join(migrationsFolder, `${productMigration.tag}.sql`);
      const content = readFileSync(sqlFile, "utf8");
      const hash = createHash("sha256").update(content).digest("hex");
      if (!appliedHashes.has(hash)) {
        const latestCreatedAt = migrationRows.rows.reduce(
          (latest, row) => Math.max(latest, Number(row.created_at)),
          0
        );
        await pool.query(
          `INSERT INTO drizzle."__drizzle_migrations" (hash, created_at)
           VALUES ($1, $2)`,
          [hash, BigInt(Math.max(Date.now(), latestCreatedAt + 1))]
        );
      }
    }
  }

  await migrate(db, { migrationsFolder });
}

export * from "./schema";
