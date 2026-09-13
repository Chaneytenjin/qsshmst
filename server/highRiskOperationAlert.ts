import { notifyOwner } from "./_core/notification";
import { sendSystemAlertEmail } from "./systemAlertEmail";

export type HighRiskOperationAlertInput = {
  actionKey: string;
  actionLabel: string;
  actorName: string;
  targetUserId: number;
  targetName: string;
  details?: string[];
};

/**
 * Sends best-effort, immediate management alerts for sensitive account actions.
 * Notifications never undo a successfully audited operation if an upstream
 * notification channel is unavailable.
 */
export async function notifyHighRiskOperation(input: HighRiskOperationAlertInput): Promise<void> {
  const title = `高風險操作：${input.actionLabel}`;
  const details = [
    `操作人：${input.actorName}`,
    `目標帳號：${input.targetName}（#${input.targetUserId}）`,
    ...(input.details ?? []).filter(Boolean),
  ];

  const results = await Promise.allSettled([
    notifyOwner({ title, content: details.join("\n") }),
    sendSystemAlertEmail({
      eventKey: `high-risk-operation:${input.actionKey}:${input.targetUserId}`,
      source: "帳號高風險操作",
      title,
      summary: `${input.actorName} 對 ${input.targetName} 執行「${input.actionLabel}」`,
      details,
      kind: "alert",
    }),
  ]);

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[HighRiskOperationAlert] Management notification failed", result.reason);
    }
  }
}
