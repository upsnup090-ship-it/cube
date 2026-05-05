"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/server/db/prisma";
import { walletService } from "@/server/services/wallet-service";

export type AdminActionResult = { ok: true; message: string } | { ok: false; error: string };

function parsePositiveInt(raw: FormDataEntryValue | null, field: string): bigint {
  if (typeof raw !== "string" || raw.trim() === "") throw new Error(`${field} is required`);
  if (!/^\d+$/.test(raw.trim()) || raw.trim() === "0") throw new Error(`${field} must be a positive integer`);
  return BigInt(raw.trim());
}

export async function manualCreditAction(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  try {
    const userId = Number(formData.get("userId"));
    const amount = parsePositiveInt(formData.get("amount"), "Amount");
    const reason = (formData.get("reason") as string | null)?.trim();
    if (!reason) throw new Error("Reason is required");

    const idempotencyKey = `admin:credit:${userId}:${Date.now()}`;

    await walletService.manualCredit({
      userId,
      amount,
      idempotencyKey,
      metadata: { reason, actorType: "admin_ui" },
    });

    revalidatePath(`/admin/users/${userId}`);
    return { ok: true, message: `Credited ${amount} coins to user #${userId}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function manualDebitAction(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  try {
    const userId = Number(formData.get("userId"));
    const amount = parsePositiveInt(formData.get("amount"), "Amount");
    const reason = (formData.get("reason") as string | null)?.trim();
    if (!reason) throw new Error("Reason is required");

    const idempotencyKey = `admin:debit:${userId}:${Date.now()}`;

    await walletService.manualDebit({
      userId,
      amount,
      idempotencyKey,
      metadata: { reason, actorType: "admin_ui" },
    });

    revalidatePath(`/admin/users/${userId}`);
    return { ok: true, message: `Debited ${amount} coins from user #${userId}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function setUserStatusAction(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  try {
    const userId = Number(formData.get("userId"));
    const newStatus = formData.get("status") as string;
    const reason = (formData.get("reason") as string | null)?.trim();

    if (!["active", "blocked", "under_review"].includes(newStatus)) {
      throw new Error("Invalid status");
    }
    if (!reason) throw new Error("Reason is required");

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { status: true } });
    if (!user) throw new Error("User not found");

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { status: newStatus as "active" | "blocked" | "under_review" },
      });
      await tx.auditLog.create({
        data: {
          actorType: "admin",
          actorId: "admin",
          action: newStatus === "blocked" ? "user_block" : newStatus === "active" ? "user_unblock" : "user_mark_review",
          resourceType: "user",
          resourceId: String(userId),
          metadata: { previousStatus: user.status, newStatus, reason },
        },
      });
    });

    revalidatePath(`/admin/users/${userId}`);
    revalidatePath("/admin/risk");
    return { ok: true, message: `User #${userId} status set to ${newStatus}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
