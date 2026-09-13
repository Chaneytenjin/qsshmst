import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import {
  createBorrowReturnReminder,
  getBorrowReminderTargets,
  getOverdueBorrowReminderScheduleByTaskUid,
  updateBorrowReturnReminderEmail,
  updateOverdueBorrowReminderScheduleLastRun,
  updateOverdueRecords,
} from "./db";
import { sendBorrowReturnReminder } from "./borrowReturnReminderEmail";
import { sendSystemAlertEmail } from "./systemAlertEmail";

type ReminderKind = "due_soon" | "overdue";

function getSiteBaseUrl(req: Request) {
  const forwardedProto = req.headers?.["x-forwarded-proto"];
  const protocol = typeof forwardedProto === "string" ? forwardedProto.split(",")[0] : req.protocol || "https";
  const forwardedHost = req.headers?.["x-forwarded-host"];
  const host = (typeof forwardedHost === "string" ? forwardedHost.split(",")[0] : (typeof req.get === "function" ? req.get("host") : "")) || "";
  return host ? `${protocol}://${host}` : "";
}

function getTaipeiDateKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getCalendarDayDelta(expectedReturnAt: Date, referenceDate: Date) {
  const expected = new Date(`${getTaipeiDateKey(expectedReturnAt)}T00:00:00.000Z`).getTime();
  const reference = new Date(`${getTaipeiDateKey(referenceDate)}T00:00:00.000Z`).getTime();
  return Math.round((expected - reference) / 86_400_000);
}

function getReminderKind(expectedReturnAt: Date, referenceDate: Date): ReminderKind | null {
  const dayDelta = getCalendarDayDelta(expectedReturnAt, referenceDate);
  if (dayDelta === 1) return "due_soon";
  if (dayDelta < 0) return "overdue";
  return null;
}

/** Daily idempotent check: notify on the day before return and once per overdue day. */
export async function runOverdueBorrowReminderSchedule(req: Request, res: Response) {
  try {
    const cronUser = await sdk.authenticateRequest(req);
    if (!cronUser.isCron || !cronUser.taskUid) return res.status(403).json({ error: "cron-only" });
    const schedule = await getOverdueBorrowReminderScheduleByTaskUid(cronUser.taskUid);
    if (!schedule) return res.json({ ok: true, skipped: "orphan" });
    if (!schedule.isActive) return res.json({ ok: true, skipped: "inactive" });

    const now = new Date();
    const reminderDate = getTaipeiDateKey(now);
    const siteBaseUrl = getSiteBaseUrl(req);
    await updateOverdueRecords();
    const targets = await getBorrowReminderTargets();
    let dueSoon = 0;
    let overdue = 0;
    let emailsSent = 0;
    let emailsFailed = 0;
    let emailsSkipped = 0;

    for (const target of targets) {
      const reminderType = getReminderKind(target.expectedReturnAt, now);
      if (!reminderType) continue;
      const reminderId = await createBorrowReturnReminder({
        borrowRecordId: target.id,
        borrowerId: target.borrowerId,
        reminderType,
        reminderDate,
      });
      if (!reminderId) continue;

      if (reminderType === "due_soon") dueSoon += 1;
      else overdue += 1;

      if (!target.borrowerEmail) {
        await updateBorrowReturnReminderEmail({ id: reminderId, status: "skipped", error: "帳號未設定電子郵件" });
        emailsSkipped += 1;
        continue;
      }

      try {
        await sendBorrowReturnReminder({
          to: target.borrowerEmail,
          borrowerLabel: target.borrowerName || target.borrowerUsername || `帳號 #${target.borrowerId}`,
          equipmentName: target.equipmentName || "未命名器材",
          expectedReturnAt: target.expectedReturnAt,
          reminderType,
          dashboardUrl: `${siteBaseUrl}/dashboard`,
        });
        await updateBorrowReturnReminderEmail({ id: reminderId, status: "sent" });
        emailsSent += 1;
      } catch (error) {
        emailsFailed += 1;
        const message = error instanceof Error ? error.message : "電子郵件寄送失敗";
        await updateBorrowReturnReminderEmail({ id: reminderId, status: "failed", error: message });
        console.error("[OverdueBorrowReminder] Failed to notify", { borrowRecordId: target.id, borrowerId: target.borrowerId, error });
      }
    }

    await updateOverdueBorrowReminderScheduleLastRun(schedule.id);
    const created = dueSoon + overdue;
    if (created > 0) {
      await sendSystemAlertEmail({
        eventKey: `borrow-reminder:${reminderDate}`,
        source: "器材逾期歸還提醒",
        title: "器材歸還提醒已執行",
        summary: `已建立 ${created} 筆站內提醒：明日到期 ${dueSoon} 筆、逾期 ${overdue} 筆借用者郵件寄送成功 ${emailsSent} 筆、失敗 ${emailsFailed} 筆、略過 ${emailsSkipped} 筆`,
        details: [`執行日期（臺灣時間）：${reminderDate}`, `系統提醒：${created} 筆`, `電子郵件：成功 ${emailsSent}／失敗 ${emailsFailed}／略過 ${emailsSkipped}`],
      });
    }
    return res.json({ ok: true, checked: targets.length, dueSoon, overdue, emailsSent, emailsFailed, emailsSkipped, reminderDate });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知逾期歸還提醒排程錯誤";
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("[OverdueBorrowReminder] Scheduled check failed", error);
    return res.status(500).json({ error: message, stack, context: { url: req.originalUrl || req.url }, timestamp: new Date().toISOString() });
  }
}
