import { Router, type IRouter } from "express";
import { db, usersTable, licensesTable, productsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { hashPassword, comparePassword, formatUserProfile } from "../lib/auth";
import {
  UpdateProfileBody,
  ChangePasswordBody,
  UpdateLanguageBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/profile", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatUserProfile(user));
});

router.patch("/profile", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [user] = await db
    .update(usersTable)
    .set({
      ...(parsed.data.firstName && { firstName: parsed.data.firstName }),
      ...(parsed.data.lastName && { lastName: parsed.data.lastName }),
      ...(parsed.data.companyName !== undefined && { companyName: parsed.data.companyName }),
      ...(parsed.data.phone !== undefined && { phone: parsed.data.phone }),
    })
    .where(eq(usersTable.id, req.user!.userId))
    .returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatUserProfile(user));
});

router.post("/profile/change-password", requireAuth, async (req, res): Promise<void> => {
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const valid = await comparePassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    res.status(400).json({ error: "Current password is incorrect" });
    return;
  }
  const newHash = await hashPassword(parsed.data.newPassword);
  await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, user.id));
  res.json({ message: "Password changed successfully" });
});

router.patch("/profile/language", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateLanguageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await db
    .update(usersTable)
    .set({ language: parsed.data.language })
    .where(eq(usersTable.id, req.user!.userId));
  res.json({ message: "Language updated successfully" });
});

// Customer: read own licenses
router.get("/my/licenses", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const licenses = await db
    .select({
      id: licensesTable.id,
      licenseKey: licensesTable.key,
      type: licensesTable.type,
      status: licensesTable.status,
      maxDevices: licensesTable.maxDevices,
      activatedDevices: licensesTable.activatedDevices,
      expiresAt: licensesTable.expiresAt,
      autoRenew: licensesTable.autoRenew,
      createdAt: licensesTable.createdAt,
      productId: licensesTable.productId,
      productName: productsTable.name,
      productSlug: productsTable.slug,
      productImageUrl: productsTable.imageUrl,
    })
    .from(licensesTable)
    .leftJoin(productsTable, eq(licensesTable.productId, productsTable.id))
    .where(eq(licensesTable.userId, userId))
    .orderBy(desc(licensesTable.createdAt));

  res.json({ licenses });
});

export default router;
