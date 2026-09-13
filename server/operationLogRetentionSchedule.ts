import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import {
  getOperationLogRetentionScheduleByTaskUid,
  runOperationLogRetentionCleanup,
} from "./db";

/** Handles the project-level daily operation-log retention heartbeat. */
export async function runOperationLogRetentionSchedule(req: Request, res: Response) {
  try {
    const cronUser = await sdk.authenticateRequest(req);
    if (!cronUser.isCron || !cronUser.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const schedule = await getOperationLogRetentionScheduleByTaskUid(cronUser.taskUid);
    if (!schedule) return res.json({ ok: true, skipped: "orphan" });
    if (!schedule.isActive) return res.json({ ok: true, skipped: "inactive" });
    if (schedule.retentionDays !== 365) {
      return res.status(400).json({ error: "invalid-retention-policy", retentionDays: schedule.retentionDays });
    }

    const result = await runOperationLogRetentionCleanup(schedule);
    return res.json({
      ok: true,
      retentionDays: schedule.retentionDays,
      cutoffAt: result.cutoffAt.toISOString(),
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知排程錯誤";
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("[OperationLogRetention] Scheduled cleanup failed", error);
    return res.status(500).json({
      error: message,
      stack,
      context: { url: req.originalUrl || req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
