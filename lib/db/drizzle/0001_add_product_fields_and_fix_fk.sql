-- Add default_license_type column to products (missed in baseline push schema)
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "default_license_type" text;--> statement-breakpoint
-- Fix download_files.version_id FK: switch to ON DELETE SET NULL so deleting a
-- product version nullifies the reference instead of raising a constraint error.
ALTER TABLE "download_files" DROP CONSTRAINT IF EXISTS "download_files_version_id_product_versions_id_fk";--> statement-breakpoint
ALTER TABLE "download_files" ADD CONSTRAINT "download_files_version_id_product_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."product_versions"("id") ON DELETE set null ON UPDATE no action;
