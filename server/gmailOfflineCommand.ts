import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import {
  createEmailOfflineCommandReceipt,
  createOperationLog,
  getEmailOfflineCommandAuthorizedSenders,
  getEmailOfflineCommandReceiptByTokenHash,
  getEmailOfflineCommandSettings,
  getSystemMaintenanceSettings,
  getUserById,
  updateEmailOfflineCommandGmailPollState,
  updateEmailOfflineCommandReceipt,
  updateEmailOfflineCommandReplyStatus,
  upsertSystemMaintenanceSettings,
} from "./db";
import type { EmailOfflineCommandSettings } from "../drizzle/schema";
import { resolveSystemMode } from "./systemMode";
import { decryptEmailOfflineCommandSecret } from "./emailOfflineCommandVault";
import { sendGmailOfflineCommandSuccessReply } from "./gmailOfflineCommandReplyEmail";

export const GMAIL_OFFLINE_COMMAND_SUBJECT = "QSSH MEDIA SERVICE SYSTEM";
export const GMAIL_OFFLINE_COMMAND_BODY = "Media Server System is abnormal,Please go offline immediately.";
export const GMAIL_OFFLINE_COMMAND_LABEL = "QSSH_OFFLINE_COMMAND";
export const APPS_SCRIPT_OFFLINE_COMMAND_PATH = "/api/integrations/gmail-offline-command";
export const APPS_SCRIPT_COMMAND_MAX_AGE_MS = 5 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function generateGmailOfflineCommandSecret() {
  return randomBytes(32).toString("base64url");
}

export type GmailCommandMessage = {
  messageId: string;
  senderEmail: string | null;
  recipientEmail: string | null;
  subject: string;
  commandBody: string;
  authenticationPassed: boolean;
  hasAttachments: boolean;
};

export type GmailCommandResult = {
  accepted: boolean;
  code: string;
  receiptId?: number;
};

export type AppsScriptOfflineCommandPayload = {
  messageId: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  commandBody: string;
  authenticationPassed: boolean;
  timestamp: number;
  signature: string;
};

function normalizeEmail(value: string | null | undefined) {
  const email = value?.trim().toLowerCase() ?? "";
  return EMAIL_PATTERN.test(email) ? email : null;
}

function hashMessageId(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function canonicalAppsScriptPayload(input: Omit<AppsScriptOfflineCommandPayload, "signature">) {
  return [input.messageId, input.senderEmail, input.recipientEmail, input.subject, input.commandBody, input.authenticationPassed ? "1" : "0", String(input.timestamp)].join("\n");
}

export function createAppsScriptOfflineCommandSignature(
  secret: string,
  input: Omit<AppsScriptOfflineCommandPayload, "signature">,
) {
  return createHmac("sha256", secret).update(canonicalAppsScriptPayload(input), "utf8").digest("base64url");
}

function hasValidAppsScriptSignature(secret: string, payload: AppsScriptOfflineCommandPayload) {
  const expected = createAppsScriptOfflineCommandSignature(secret, payload);
  const actualBuffer = Buffer.from(payload.signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

async function rejectReceipt(receiptId: number, code: string): Promise<GmailCommandResult> {
  await updateEmailOfflineCommandReceipt({ id: receiptId, status: "rejected", rejectionCode: code });
  return { accepted: false, code, receiptId };
}

async function sendAcceptedCommandReply(input: {
  receiptId: number;
  senderEmail: string;
  messageId: string;
  resultingMode: "offline" | "already_offline";
  authorizedById: number;
}) {
  try {
    await sendGmailOfflineCommandSuccessReply({
      to: input.senderEmail,
      messageId: input.messageId,
      resultingMode: input.resultingMode,
    });
    await updateEmailOfflineCommandReplyStatus({ id: input.receiptId, replyStatus: "sent" });
    await createOperationLog({
      userId: input.authorizedById,
      username: "authorized-gmail-command",
      action: "replyGmailOfflineCommandSender",
      entityType: "emailOfflineCommandReceipt",
      entityId: input.receiptId,
      entityName: "Gmail 離線指令成功回覆",
      details: JSON.stringify({ senderEmail: input.senderEmail, gmailMessageId: input.messageId, resultingMode: input.resultingMode, deliveryStatus: "sent" }),
    });
  } catch (error) {
    const replyError = error instanceof Error ? error.message : "reply_delivery_failed";
    console.error("[GmailOfflineCommand] Reply delivery failed", { receiptId: input.receiptId, replyError });
    try {
      await updateEmailOfflineCommandReplyStatus({ id: input.receiptId, replyStatus: "failed", replyError });
      await createOperationLog({
        userId: input.authorizedById,
        username: "authorized-gmail-command",
        action: "replyGmailOfflineCommandSender",
        entityType: "emailOfflineCommandReceipt",
        entityId: input.receiptId,
        entityName: "Gmail 離線指令成功回覆",
        details: JSON.stringify({ senderEmail: input.senderEmail, gmailMessageId: input.messageId, resultingMode: input.resultingMode, deliveryStatus: "failed", replyError }),
      });
    } catch (auditError) {
      console.error("[GmailOfflineCommand] Reply delivery audit failed", { receiptId: input.receiptId, auditError });
    }
  }
}

export async function processGmailOfflineCommandMessage(input: {
  settings: EmailOfflineCommandSettings;
  message: GmailCommandMessage;
}): Promise<GmailCommandResult> {
  const { settings, message } = input;
  if (!settings.encryptedCommandSecret) return { accepted: false, code: "offline_email_command_disabled" };
  const processingSalt = decryptEmailOfflineCommandSecret(settings.encryptedCommandSecret);
  const tokenHash = hashMessageId(`gmail-apps-script-v1:${settings.id}:${message.messageId}:${processingSalt}`);
  const previous = await getEmailOfflineCommandReceiptByTokenHash(tokenHash);
  if (previous) return { accepted: false, code: "gmail_replay_rejected", receiptId: previous.id };

  const receipt = await createEmailOfflineCommandReceipt({
    settingsId: settings.id,
    mailgunTokenHash: tokenHash,
    senderEmail: message.senderEmail,
    recipientEmail: message.recipientEmail,
    subject: message.subject || null,
    status: "processing",
  });
  if (!receipt) throw new Error("receipt_write_failed");

  if (!message.authenticationPassed) return rejectReceipt(receipt.id, "apps_script_authentication_failed");
  if (message.hasAttachments) return rejectReceipt(receipt.id, "attachments_not_allowed");
  if (!message.senderEmail) return rejectReceipt(receipt.id, "sender_invalid");
  if (!message.recipientEmail || message.recipientEmail !== settings.recipientEmail.toLowerCase()) {
    return rejectReceipt(receipt.id, "recipient_not_authorized");
  }
  if (message.subject.trim().toUpperCase() !== GMAIL_OFFLINE_COMMAND_SUBJECT) {
    return rejectReceipt(receipt.id, "command_subject_invalid");
  }
  if (message.commandBody.trim() !== GMAIL_OFFLINE_COMMAND_BODY) {
    return rejectReceipt(receipt.id, "command_body_invalid");
  }
  const authorizedSenders = await getEmailOfflineCommandAuthorizedSenders(settings.id, true);
  if (!authorizedSenders.some((sender) => sender.senderEmail.toLowerCase() === message.senderEmail)) {
    return rejectReceipt(receipt.id, "sender_not_authorized");
  }

  const currentSettings = await getSystemMaintenanceSettings();
  const currentMode = resolveSystemMode(currentSettings).systemMode;
  if (currentMode === "offline") {
    await updateEmailOfflineCommandReceipt({ id: receipt.id, status: "accepted", resultingMode: "already_offline" });
    await sendAcceptedCommandReply({ receiptId: receipt.id, senderEmail: message.senderEmail, messageId: message.messageId, resultingMode: "already_offline", authorizedById: settings.authorizedById });
    return { accepted: true, code: "system_already_offline", receiptId: receipt.id };
  }
  const updatedSettings = await upsertSystemMaintenanceSettings({
    systemMode: "offline",
    scheduledMode: null,
    scheduledFor: null,
    scheduledById: null,
    announcement: currentSettings?.announcement?.trim() || "系統已由授權 Gmail 緊急指令切換為離線模式",
    estimatedRestoredAt: currentSettings?.estimatedRestoredAt ?? null,
    updatedById: settings.authorizedById,
  });
  if (!updatedSettings) throw new Error("system_mode_update_failed");
  const actor = await getUserById(settings.authorizedById);
  await createOperationLog({
    userId: settings.authorizedById,
    username: actor?.username || actor?.name || "authorized-gmail-command",
    action: "enableSystemOfflineMode",
    entityType: "systemMaintenance",
    entityId: updatedSettings.id,
    entityName: "SYSTEM OFFLINE",
    details: JSON.stringify({
      trigger: "authorized_gmail_apps_script",
      senderEmail: message.senderEmail,
      recipientEmail: message.recipientEmail,
      gmailMessageId: message.messageId,
      receiptId: receipt.id,
      previousSystemMode: currentMode,
    }),
  });
  await updateEmailOfflineCommandReceipt({ id: receipt.id, status: "accepted", resultingMode: "offline" });
  await sendAcceptedCommandReply({ receiptId: receipt.id, senderEmail: message.senderEmail, messageId: message.messageId, resultingMode: "offline", authorizedById: settings.authorizedById });
  return { accepted: true, code: "system_offline_enabled", receiptId: receipt.id };
}

function isValidPayload(value: unknown): value is AppsScriptOfflineCommandPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return ["messageId", "senderEmail", "recipientEmail", "subject", "commandBody", "signature"].every((key) => typeof payload[key] === "string")
    && typeof payload.authenticationPassed === "boolean"
    && typeof payload.timestamp === "number";
}

export async function runAppsScriptOfflineCommand(req: Request, res: Response) {
  const payload = req.body;
  if (!isValidPayload(payload)) return res.status(400).json({ accepted: false, code: "invalid_payload" });
  if (payload.messageId.length < 3 || payload.messageId.length > 512 || payload.signature.length < 32 || payload.signature.length > 256) {
    return res.status(400).json({ accepted: false, code: "invalid_payload" });
  }
  if (!Number.isFinite(payload.timestamp) || Math.abs(Date.now() - payload.timestamp) > APPS_SCRIPT_COMMAND_MAX_AGE_MS) {
    return res.status(401).json({ accepted: false, code: "command_expired" });
  }
  const settings = await getEmailOfflineCommandSettings();
  if (!settings?.isEnabled || !settings.encryptedCommandSecret) {
    return res.status(403).json({ accepted: false, code: "offline_email_command_disabled" });
  }
  const commandSecret = decryptEmailOfflineCommandSecret(settings.encryptedCommandSecret);
  if (!hasValidAppsScriptSignature(commandSecret, payload)) {
    return res.status(401).json({ accepted: false, code: "invalid_signature" });
  }
  const result = await processGmailOfflineCommandMessage({
    settings,
    message: {
      messageId: payload.messageId.trim(),
      senderEmail: normalizeEmail(payload.senderEmail),
      recipientEmail: normalizeEmail(payload.recipientEmail),
      subject: payload.subject,
      commandBody: payload.commandBody,
      authenticationPassed: payload.authenticationPassed,
      hasAttachments: false,
    },
  });
  await updateEmailOfflineCommandGmailPollState({ settingsId: settings.id, lastPolledAt: new Date(), lastPollError: null });
  return res.status(200).json(result);
}
