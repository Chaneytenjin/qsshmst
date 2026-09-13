import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import {
  createAccountDeduplicationReport,
  findDuplicateAccounts,
  getAccountDeduplicationScheduleByTaskUid,
  updateAccountDeduplicationScheduleLastRun,
} from "./db";
import { sendSystemAlertEmail } from "./systemAlertEmail";

function getTaiwanDateKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date())
    .replace(/\//g, "-");
}

async function sendDailyDeduplicationSummary(groups: Awaited<ReturnType<typeof findDuplicateAccounts>>) {
  const affectedAccountCount = new Set(groups.flatMap((group) => group.users.map((user) => user.id))).size;
  const details = [
    "檢查欄位：帳號名稱、電子郵件",
    `重複群組：${groups.length} 組`,
    `影響帳號：${affectedAccountCount} 個`,
    "此排程僅產出報告，不會自動停用或刪除任何帳號",
    "檢視方式：登入系統後開啟「資料庫維護」查看最近報告並逐筆確認",
    ...groups.slice(0, 10).map((group) => `${group.field === "username" ? "帳號名稱" : "電子郵件"} 重複：${group.value}（${group.users.length} 個帳號）`),
    ...(groups.length > 10 ? [`其餘 ${groups.length - 10} 組請登入「資料庫維護」頁檢視`] : []),
  ];

  try {
    return await sendSystemAlertEmail({
      eventKey: `account-dedup-daily:${getTaiwanDateKey()}`,
      source: "每日帳號去重排程",
      title: "每日帳號去重掃描摘要",
      summary: groups.length ? `本次掃描發現 ${groups.length} 組重複識別資料，請由創始管理員逐筆確認` : "本次掃描未發現重複帳號",
      details,
      kind: "summary",
    });
  } catch (error) {
    console.error("[AccountDeduplication] Daily email summary failed", error);
    return { sent: 0, failed: 0, suppressed: 0, recipients: 0, unavailable: true };
  }
}

/** Handles the project-level daily account deduplication heartbeat. It never deactivates accounts. */
export async function runAccountDeduplicationSchedule(req: Request, res: Response) {
  try {
    const cronUser = await sdk.authenticateRequest(req);
    if (!cronUser.isCron || !cronUser.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const schedule = await getAccountDeduplicationScheduleByTaskUid(cronUser.taskUid);
    if (!schedule) return res.json({ ok: true, skipped: "orphan" });
    if (!schedule.isActive) return res.json({ ok: true, skipped: "inactive" });

    const groups = await findDuplicateAccounts();
    await createAccountDeduplicationReport({ scheduleId: schedule.id, groups });
    await updateAccountDeduplicationScheduleLastRun(schedule.id);
    const emailSummary = await sendDailyDeduplicationSummary(groups);
    return res.json({ ok: true, duplicateGroupCount: groups.length, mode: "report-only", emailSummary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知排程錯誤";
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("[AccountDeduplication] Scheduled check failed", error);
    return res.status(500).json({
      error: message,
      stack,
      context: { url: req.originalUrl || req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
