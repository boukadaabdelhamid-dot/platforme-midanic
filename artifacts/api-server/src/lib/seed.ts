import { db, usersTable, productsTable, productVersionsTable, downloadFilesTable, blogPostsTable, newsItemsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "./auth";
import { logger } from "./logger";

export async function seedDatabase(): Promise<void> {
  // Check if already seeded
  const [existingAdmin] = await db.select().from(usersTable).where(eq(usersTable.email, "admin@midanic.com"));
  if (existingAdmin) {
    logger.info("Database already seeded, skipping");
    return;
  }

  logger.info("Seeding database...");

  // Create super admin
  const adminHash = await hashPassword("Admin@123456");
  await db.insert(usersTable).values({
    email: "admin@midanic.com",
    passwordHash: adminHash,
    firstName: "Admin",
    lastName: "Midanic",
    role: "super_admin",
    language: "en",
    companyName: "Midanic",
  });

  // Create sample customer
  const customerHash = await hashPassword("Customer@123456");
  await db.insert(usersTable).values({
    email: "customer@example.com",
    passwordHash: customerHash,
    firstName: "Ahmed",
    lastName: "Benali",
    role: "customer",
    language: "ar",
    companyName: "Example Corp",
  });

  // Products
  const [erp] = await db.insert(productsTable).values({
    name: "Midanic ERP",
    slug: "midanic-erp",
    description: "A comprehensive enterprise resource planning system built for modern businesses. Manage your entire operation — inventory, accounting, HR, sales, and more — from a single powerful platform.",
    shortDescription: "Complete ERP solution for growing businesses",
    category: "erp",
    featured: true,
    published: true,
    trialDays: 30,
    basePrice: 299,
    sortOrder: 1,
  }).returning();

  const [driving] = await db.insert(productsTable).values({
    name: "Midanic Driving School",
    slug: "midanic-driving-school",
    description: "Specialized software for managing driving schools. Handle student registrations, lesson scheduling, instructor management, exam tracking, and financial reporting with ease.",
    shortDescription: "Complete management system for driving schools",
    category: "education",
    featured: true,
    published: true,
    trialDays: 14,
    basePrice: 149,
    sortOrder: 2,
  }).returning();

  // Versions
  await db.insert(productVersionsTable).values([
    {
      productId: erp.id,
      version: "3.2.1",
      releaseNotes: "## What's New\n- Improved inventory management module\n- Fixed accounting report exports\n- Performance improvements across dashboard\n- New multi-currency support",
      isLatest: true,
    },
    {
      productId: erp.id,
      version: "3.2.0",
      releaseNotes: "## What's New\n- New HR module with attendance tracking\n- Improved UI for mobile devices\n- Bug fixes and stability improvements",
      isLatest: false,
    },
    {
      productId: driving.id,
      version: "2.1.0",
      releaseNotes: "## What's New\n- New student portal with progress tracking\n- Digital exam scheduling\n- WhatsApp notification integration\n- Improved financial reports",
      isLatest: true,
    },
  ]);

  // Downloads
  await db.insert(downloadFilesTable).values([
    {
      productId: erp.id,
      fileName: "Midanic-ERP-v3.2.1-Windows.exe",
      fileSize: 245000000,
      platform: "windows",
      version: "3.2.1",
      downloadUrl: "/api/downloads/placeholder",
      downloadCount: 1234,
      isPublic: true,
    },
    {
      productId: driving.id,
      fileName: "Midanic-DrivingSchool-v2.1.0-Windows.exe",
      fileSize: 98000000,
      platform: "windows",
      version: "2.1.0",
      downloadUrl: "/api/downloads/placeholder",
      downloadCount: 567,
      isPublic: true,
    },
  ]);

  // Blog posts
  await db.insert(blogPostsTable).values([
    {
      title: "Introducing Midanic ERP 3.2: The Future of Business Management",
      slug: "introducing-midanic-erp-3-2",
      excerpt: "We're excited to announce the release of Midanic ERP 3.2, packed with powerful new features to streamline your business operations.",
      content: "After months of development and testing with our valued customers, we are proud to announce the release of Midanic ERP version 3.2...",
      authorName: "Midanic Team",
      published: true,
      publishedAt: new Date("2026-07-15"),
    },
    {
      title: "5 Ways ERP Software Can Transform Your Business in 2026",
      slug: "5-ways-erp-transforms-business-2026",
      excerpt: "Discover how modern ERP systems are helping businesses across Algeria and the Maghreb region achieve unprecedented efficiency.",
      content: "In today's competitive business environment, efficiency and data visibility are no longer optional — they are essential...",
      authorName: "Midanic Team",
      published: true,
      publishedAt: new Date("2026-07-01"),
    },
  ]);

  // News
  await db.insert(newsItemsTable).values([
    {
      title: "Midanic Expands to Tunisia and Morocco",
      slug: "midanic-expands-to-tunisia-morocco",
      excerpt: "We are thrilled to announce our expansion to Tunisia and Morocco, bringing our enterprise software solutions to more businesses across the Maghreb region.",
      content: "Building on our success in Algeria, Midanic is proud to announce the expansion of our operations to Tunisia and Morocco...",
      published: true,
      publishedAt: new Date("2026-07-20"),
    },
  ]);

  logger.info("Database seeded successfully");
}
