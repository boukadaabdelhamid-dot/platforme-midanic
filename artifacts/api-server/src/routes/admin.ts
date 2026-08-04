import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  productsTable,
  licensesTable,
  subscriptionsTable,
  blogPostsTable,
  newsItemsTable,
  contactMessagesTable,
  trialRequestsTable,
  demoRequestsTable,
  newsletterSubscribersTable,
  supportTicketsTable,
  ticketMessagesTable,
} from "@workspace/db";
import { eq, desc, count, ilike, or, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

// All admin routes require authentication and super_admin role
router.use("/admin", requireAuth, requireRole("super_admin"));

// ── ADMIN STATS ────────────────────────────────────────────────────────────
router.get("/admin/stats", async (_req, res): Promise<void> => {
  const [[usersRow], [productsRow], [licensesRow], [ticketsRow]] = await Promise.all([
    db.select({ total: count() }).from(usersTable),
    db.select({ total: count() }).from(productsTable),
    db.select({ total: count() }).from(licensesTable).where(eq(licensesTable.status, "active")),
    db
      .select({ total: count() })
      .from(supportTicketsTable)
      .where(sql`${supportTicketsTable.status} IN ('open','in_progress')`),
  ]);
  res.json({
    totalUsers: Number(usersRow?.total ?? 0),
    totalProducts: Number(productsRow?.total ?? 0),
    activeLicenses: Number(licensesRow?.total ?? 0),
    openTickets: Number(ticketsRow?.total ?? 0),
  });
});

// ── USERS ──────────────────────────────────────────────────────────────────
router.get("/admin/users", async (req, res): Promise<void> => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const offset = (page - 1) * limit;

  const conditions = search
    ? [
        or(
          ilike(usersTable.email, `%${search}%`),
          ilike(usersTable.firstName, `%${search}%`),
          ilike(usersTable.lastName, `%${search}%`),
        ),
      ]
    : [];

  const [users, [totalRow]] = await Promise.all([
    db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        role: usersTable.role,
        language: usersTable.language,
        companyName: usersTable.companyName,
        isActive: usersTable.isActive,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(conditions.length ? conditions[0] : undefined)
      .orderBy(desc(usersTable.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(usersTable)
      .where(conditions.length ? conditions[0] : undefined),
  ]);

  res.json({ users, total: Number(totalRow?.total ?? 0), page, limit });
});

router.patch("/admin/users/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }
  const { role, isActive } = req.body as { role?: string; isActive?: boolean };
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (role !== undefined) updates.role = role;
  if (isActive !== undefined) updates.isActive = isActive;

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, id))
    .returning({ id: usersTable.id, role: usersTable.role, isActive: usersTable.isActive });

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(updated);
});

// ── PRODUCTS ───────────────────────────────────────────────────────────────
router.get("/admin/products", async (_req, res): Promise<void> => {
  const products = await db
    .select()
    .from(productsTable)
    .orderBy(productsTable.sortOrder, desc(productsTable.createdAt));
  res.json(products);
});

router.post("/admin/products", async (req, res): Promise<void> => {
  const {
    name,
    slug,
    description,
    shortDescription,
    category,
    featured,
    published,
    trialDays,
    basePrice,
    sortOrder,
  } = req.body as Record<string, unknown>;

  if (!name || !slug || !description || !category) {
    res.status(400).json({ error: "name, slug, description and category are required" });
    return;
  }
  const [product] = await db
    .insert(productsTable)
    .values({
      name: String(name),
      slug: String(slug),
      description: String(description),
      shortDescription: shortDescription ? String(shortDescription) : null,
      category: String(category),
      featured: Boolean(featured ?? false),
      published: Boolean(published ?? false),
      trialDays: trialDays ? Number(trialDays) : null,
      basePrice: basePrice ? Number(basePrice) : null,
      sortOrder: sortOrder ? Number(sortOrder) : 0,
    })
    .returning();
  res.status(201).json(product);
});

router.patch("/admin/products/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid product id" });
    return;
  }
  const allowed = [
    "name", "slug", "description", "shortDescription", "category",
    "featured", "published", "trialDays", "basePrice", "sortOrder",
  ];
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of allowed) {
    if (key in req.body) updates[key] = req.body[key];
  }

  const [product] = await db
    .update(productsTable)
    .set(updates)
    .where(eq(productsTable.id, id))
    .returning();

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(product);
});

router.delete("/admin/products/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid product id" });
    return;
  }
  await db.delete(productsTable).where(eq(productsTable.id, id));
  res.status(204).end();
});

// ── LICENSES & SUBSCRIPTIONS ───────────────────────────────────────────────
router.get("/admin/licenses", async (req, res): Promise<void> => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const offset = (page - 1) * limit;

  const [licenses, [totalRow]] = await Promise.all([
    db
      .select({
        id: licensesTable.id,
        licenseKey: licensesTable.key,
        userId: licensesTable.userId,
        productId: licensesTable.productId,
        type: licensesTable.type,
        status: licensesTable.status,
        maxDevices: licensesTable.maxDevices,
        expiresAt: licensesTable.expiresAt,
        createdAt: licensesTable.createdAt,
        userEmail: usersTable.email,
        userFirstName: usersTable.firstName,
        userLastName: usersTable.lastName,
        productName: productsTable.name,
      })
      .from(licensesTable)
      .leftJoin(usersTable, eq(licensesTable.userId, usersTable.id))
      .leftJoin(productsTable, eq(licensesTable.productId, productsTable.id))
      .orderBy(desc(licensesTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(licensesTable),
  ]);

  res.json({ licenses, total: Number(totalRow?.total ?? 0), page, limit });
});

router.get("/admin/subscriptions", async (req, res): Promise<void> => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const offset = (page - 1) * limit;

  const [subscriptions, [totalRow]] = await Promise.all([
    db
      .select({
        id: subscriptionsTable.id,
        userId: subscriptionsTable.userId,
        productId: subscriptionsTable.productId,
        status: subscriptionsTable.status,
        currentPeriodStart: subscriptionsTable.currentPeriodStart,
        currentPeriodEnd: subscriptionsTable.currentPeriodEnd,
        createdAt: subscriptionsTable.createdAt,
        userEmail: usersTable.email,
        userFirstName: usersTable.firstName,
        userLastName: usersTable.lastName,
        productName: productsTable.name,
      })
      .from(subscriptionsTable)
      .leftJoin(usersTable, eq(subscriptionsTable.userId, usersTable.id))
      .leftJoin(productsTable, eq(subscriptionsTable.productId, productsTable.id))
      .orderBy(desc(subscriptionsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(subscriptionsTable),
  ]);

  res.json({ subscriptions, total: Number(totalRow?.total ?? 0), page, limit });
});

// ── BLOG ───────────────────────────────────────────────────────────────────
router.get("/admin/blog", async (_req, res): Promise<void> => {
  const posts = await db.select().from(blogPostsTable).orderBy(desc(blogPostsTable.createdAt));
  res.json(posts);
});

router.post("/admin/blog", async (req, res): Promise<void> => {
  const { title, slug, excerpt, content, authorName, published } = req.body as Record<string, unknown>;
  if (!title || !slug || !content) {
    res.status(400).json({ error: "title, slug and content are required" });
    return;
  }
  const isPublished = Boolean(published);
  const [post] = await db
    .insert(blogPostsTable)
    .values({
      title: String(title),
      slug: String(slug),
      excerpt: excerpt ? String(excerpt) : null,
      content: String(content),
      authorName: authorName ? String(authorName) : "Midanic Team",
      published: isPublished,
      publishedAt: isPublished ? new Date() : null,
    })
    .returning();
  res.status(201).json(post);
});

router.patch("/admin/blog/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const allowed = ["title", "slug", "excerpt", "content", "authorName"];
  for (const key of allowed) {
    if (key in req.body) updates[key] = req.body[key];
  }
  if ("published" in req.body) {
    updates.published = Boolean(req.body.published);
    if (req.body.published) updates.publishedAt = new Date();
  }

  const [post] = await db
    .update(blogPostsTable)
    .set(updates)
    .where(eq(blogPostsTable.id, id))
    .returning();
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }
  res.json(post);
});

router.delete("/admin/blog/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(blogPostsTable).where(eq(blogPostsTable.id, id));
  res.status(204).end();
});

// ── NEWS ───────────────────────────────────────────────────────────────────
router.get("/admin/news", async (_req, res): Promise<void> => {
  const items = await db.select().from(newsItemsTable).orderBy(desc(newsItemsTable.createdAt));
  res.json(items);
});

router.post("/admin/news", async (req, res): Promise<void> => {
  const { title, slug, excerpt, content, published } = req.body as Record<string, unknown>;
  if (!title || !slug || !content) {
    res.status(400).json({ error: "title, slug and content are required" });
    return;
  }
  const isPublished = Boolean(published);
  const [item] = await db
    .insert(newsItemsTable)
    .values({
      title: String(title),
      slug: String(slug),
      excerpt: excerpt ? String(excerpt) : null,
      content: String(content),
      published: isPublished,
      publishedAt: isPublished ? new Date() : null,
    })
    .returning();
  res.status(201).json(item);
});

router.patch("/admin/news/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const allowed = ["title", "slug", "excerpt", "content"];
  for (const key of allowed) {
    if (key in req.body) updates[key] = req.body[key];
  }
  if ("published" in req.body) {
    updates.published = Boolean(req.body.published);
    if (req.body.published) updates.publishedAt = new Date();
  }

  const [item] = await db
    .update(newsItemsTable)
    .set(updates)
    .where(eq(newsItemsTable.id, id))
    .returning();
  if (!item) { res.status(404).json({ error: "News item not found" }); return; }
  res.json(item);
});

router.delete("/admin/news/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(newsItemsTable).where(eq(newsItemsTable.id, id));
  res.status(204).end();
});

// ── CRM: CONTACT MESSAGES ──────────────────────────────────────────────────
router.get("/admin/contact-messages", async (req, res): Promise<void> => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const offset = (page - 1) * limit;
  const [messages, [totalRow]] = await Promise.all([
    db.select().from(contactMessagesTable).orderBy(desc(contactMessagesTable.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(contactMessagesTable),
  ]);
  res.json({ messages, total: Number(totalRow?.total ?? 0), page, limit });
});

router.patch("/admin/contact-messages/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { isRead } = req.body as { isRead?: boolean };
  const [msg] = await db
    .update(contactMessagesTable)
    .set({ isRead: Boolean(isRead) })
    .where(eq(contactMessagesTable.id, id))
    .returning();
  if (!msg) { res.status(404).json({ error: "Message not found" }); return; }
  res.json(msg);
});

// ── CRM: TRIAL REQUESTS ────────────────────────────────────────────────────
router.get("/admin/trial-requests", async (req, res): Promise<void> => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const offset = (page - 1) * limit;
  const [requests, [totalRow]] = await Promise.all([
    db
      .select({
        id: trialRequestsTable.id,
        name: trialRequestsTable.name,
        email: trialRequestsTable.email,
        companyName: trialRequestsTable.companyName,
        phone: trialRequestsTable.phone,
        productId: trialRequestsTable.productId,
        message: trialRequestsTable.message,
        status: trialRequestsTable.status,
        createdAt: trialRequestsTable.createdAt,
        productName: productsTable.name,
      })
      .from(trialRequestsTable)
      .leftJoin(productsTable, eq(trialRequestsTable.productId, productsTable.id))
      .orderBy(desc(trialRequestsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(trialRequestsTable),
  ]);
  res.json({ requests, total: Number(totalRow?.total ?? 0), page, limit });
});

router.patch("/admin/trial-requests/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { status } = req.body as { status?: string };
  const [updated] = await db
    .update(trialRequestsTable)
    .set({ status: status as "pending" | "approved" | "rejected" | "expired" })
    .where(eq(trialRequestsTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Request not found" }); return; }
  res.json(updated);
});

// ── CRM: DEMO REQUESTS ─────────────────────────────────────────────────────
router.get("/admin/demo-requests", async (req, res): Promise<void> => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const offset = (page - 1) * limit;
  const [requests, [totalRow]] = await Promise.all([
    db
      .select({
        id: demoRequestsTable.id,
        name: demoRequestsTable.name,
        email: demoRequestsTable.email,
        companyName: demoRequestsTable.companyName,
        phone: demoRequestsTable.phone,
        productId: demoRequestsTable.productId,
        preferredDate: demoRequestsTable.preferredDate,
        message: demoRequestsTable.message,
        status: demoRequestsTable.status,
        createdAt: demoRequestsTable.createdAt,
        productName: productsTable.name,
      })
      .from(demoRequestsTable)
      .leftJoin(productsTable, eq(demoRequestsTable.productId, productsTable.id))
      .orderBy(desc(demoRequestsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(demoRequestsTable),
  ]);
  res.json({ requests, total: Number(totalRow?.total ?? 0), page, limit });
});

router.patch("/admin/demo-requests/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { status } = req.body as { status?: string };
  const [updated] = await db
    .update(demoRequestsTable)
    .set({ status: status as "pending" | "scheduled" | "completed" | "cancelled" })
    .where(eq(demoRequestsTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Request not found" }); return; }
  res.json(updated);
});

// ── CRM: NEWSLETTER ────────────────────────────────────────────────────────
router.get("/admin/newsletter", async (req, res): Promise<void> => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const offset = (page - 1) * limit;
  const [subscribers, [totalRow]] = await Promise.all([
    db.select().from(newsletterSubscribersTable).orderBy(desc(newsletterSubscribersTable.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(newsletterSubscribersTable),
  ]);
  res.json({ subscribers, total: Number(totalRow?.total ?? 0), page, limit });
});

// ── SUPPORT TICKETS ────────────────────────────────────────────────────────
router.get("/admin/support-tickets", async (req, res): Promise<void> => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const offset = (page - 1) * limit;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;

  const condition = status ? eq(supportTicketsTable.status, status as "open" | "in_progress" | "waiting_customer" | "resolved" | "closed") : undefined;

  const [tickets, [totalRow]] = await Promise.all([
    db
      .select({
        id: supportTicketsTable.id,
        ticketNumber: supportTicketsTable.ticketNumber,
        subject: supportTicketsTable.subject,
        category: supportTicketsTable.category,
        status: supportTicketsTable.status,
        priority: supportTicketsTable.priority,
        userId: supportTicketsTable.userId,
        createdAt: supportTicketsTable.createdAt,
        userEmail: usersTable.email,
        userFirstName: usersTable.firstName,
        userLastName: usersTable.lastName,
      })
      .from(supportTicketsTable)
      .leftJoin(usersTable, eq(supportTicketsTable.userId, usersTable.id))
      .where(condition)
      .orderBy(desc(supportTicketsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(supportTicketsTable).where(condition),
  ]);

  res.json({ tickets, total: Number(totalRow?.total ?? 0), page, limit });
});

router.get("/admin/support-tickets/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [ticket] = await db
    .select({
      id: supportTicketsTable.id,
      ticketNumber: supportTicketsTable.ticketNumber,
      subject: supportTicketsTable.subject,
      category: supportTicketsTable.category,
      status: supportTicketsTable.status,
      priority: supportTicketsTable.priority,
      userId: supportTicketsTable.userId,
      createdAt: supportTicketsTable.createdAt,
      userEmail: usersTable.email,
      userFirstName: usersTable.firstName,
      userLastName: usersTable.lastName,
    })
    .from(supportTicketsTable)
    .leftJoin(usersTable, eq(supportTicketsTable.userId, usersTable.id))
    .where(eq(supportTicketsTable.id, id));

  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }

  const messages = await db
    .select()
    .from(ticketMessagesTable)
    .where(eq(ticketMessagesTable.ticketId, id))
    .orderBy(ticketMessagesTable.createdAt);

  res.json({ ...ticket, messages });
});

router.patch("/admin/support-tickets/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { status, priority } = req.body as { status?: string; priority?: string };
  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (priority) updates.priority = priority;

  const [ticket] = await db
    .update(supportTicketsTable)
    .set(updates)
    .where(eq(supportTicketsTable.id, id))
    .returning();
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  res.json(ticket);
});

router.post("/admin/support-tickets/:id/reply", async (req, res): Promise<void> => {
  const ticketId = Number(req.params.id);
  if (isNaN(ticketId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { message } = req.body as { message?: string };
  if (!message || !message.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const adminUserId = req.user!.userId;

  const [msg] = await db
    .insert(ticketMessagesTable)
    .values({
      ticketId,
      userId: adminUserId,
      message: message.trim(),
      isStaff: "true",
    })
    .returning();

  // Move ticket to in_progress if still open
  await db
    .update(supportTicketsTable)
    .set({ status: "in_progress" })
    .where(
      sql`${supportTicketsTable.id} = ${ticketId} AND ${supportTicketsTable.status} = 'open'`
    );

  res.status(201).json(msg);
});

export default router;
