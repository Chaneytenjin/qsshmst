import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import {
  getPasswordChangeReminderScheduleByTaskUid,
  getUsersDueForPasswordChangeReminder,
  markPasswordChangeReminderSent,
  updatePasswordChangeReminderScheduleLastRun,
} from "./db";
import { sendPasswordChangeReminder } from "./passwordChangeReminderEmail";

function getSiteBaseUrl(req: Request) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = typeof forwardedProto === "string" ? forwardedProto.split(",")[0] : req.protocol || "https";
  const forwardedHost = req.headers["x-forwarded-host"];
  const host = (typeof forwardedHost === "string" ? forwardedHost.split(",")[0] : req.get("host")) || "";
  return host ? `${protocol}://${host}` : "";
}

/** Daily idempotent check: each eligible user receives one reminder after 180 days, never daily repeats. */
export async function runPasswordChangeReminderSchedule(req: Request, res: Response) {
  try {
    const cronUser = await sdk.authenticateRequest(req);
    if (!cronUser.isCron || !cronUser.taskUid) return res.status(403).json({ error: "cron-only" });
    const schedule = await getPasswordChangeReminderScheduleByTaskUid(cronUser.taskUid);
    if (!schedule) return res.json({ ok: true, skipped: "orphan" });
    if (!schedule.isActive) return res.json({ ok: true, skipped: "inactive" });

    const siteBaseUrl = getSiteBaseUrl(req);
    const targets = await getUsersDueForPasswordChangeReminder();
    let sent = 0;
    let failed = 0;
    for (const target of targets) {
      try {
        await sendPasswordChangeReminder({
          to: target.email!,
          accountLabel: target.username || target.name || `帳號 #${target.id}`,
          passwordChangedAt: target.passwordChangedAt,
          profileUrl: `${siteBaseUrl}/profile`,
        });
        await markPasswordChangeReminderSent(target.id);
        sent += 1;
      } catch (error) {
        failed += 1;
        console.error("[PasswordChangeReminder] Failed to notify", { userId: target.id, error });
      }
    }
    await updatePasswordChangeReminderScheduleLastRun(schedule.id);
    return res.json({ ok: true, checked: targets.length, sent, failed, intervalDays: 180 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知密碼提醒排程錯誤";
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("[PasswordChangeReminder] Scheduled check failed", error);
    return res.status(500).json({ error: message, stack, context: { url: req.originalUrl || req.url }, timestamp: new Date().toISOString() });
  }
}
