import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createReceipt: vi.fn(),
  createOperationLog: vi.fn(),
  getAuthorizedSenders: vi.fn(),
  getReceiptByTokenHash: vi.fn(),
  getSettings: vi.fn(),
  getSystemSettings: vi.fn(),
  getUserById: vi.fn(),
  updateReceipt: vi.fn(),
  updateReplyStatus: vi.fn(),
  updatePollState: vi.fn(),
  upsertSystemSettings: vi.fn(),
  sendSuccessReply: vi.fn(),
}));

vi.mock("./db", () => ({
  createEmailOfflineCommandReceipt: mocks.createReceipt,
  createOperationLog: mocks.createOperationLog,
  getEmailOfflineCommandAuthorizedSenders: mocks.getAuthorizedSenders,
  getEmailOfflineCommandReceiptByTokenHash: mocks.getReceiptByTokenHash,
  getEmailOfflineCommandSettings: mocks.getSettings,
  getSystemMaintenanceSettings: mocks.getSystemSettings,
  getUserById: mocks.getUserById,
  updateEmailOfflineCommandGmailPollState: mocks.updatePollState,
  updateEmailOfflineCommandReceipt: mocks.updateReceipt,
  updateEmailOfflineCommandReplyStatus: mocks.updateReplyStatus,
  upsertSystemMaintenanceSettings: mocks.upsertSystemSettings,
}));

vi.mock("./emailOfflineCommandVault", () => ({
  decryptEmailOfflineCommandSecret: vi.fn(() => "gmail-command-test-salt"),
}));

vi.mock("./gmailOfflineCommandReplyEmail", () => ({
  sendGmailOfflineCommandSuccessReply: mocks.sendSuccessReply,
}));

import { createAppsScriptOfflineCommandSignature, GMAIL_OFFLINE_COMMAND_BODY, GMAIL_OFFLINE_COMMAND_SUBJECT, processGmailOfflineCommandMessage, runAppsScriptOfflineCommand } from "./gmailOfflineCommand";

const settings = {
  id: 18,
  recipientEmail: "system.notify@gmail.com",
  encryptedCommandSecret: "not-used-by-imap-worker",
  isEnabled: true,
  gmailPollScheduleTaskUid: "gmail-task-1",
  gmailLastPolledAt: null,
  gmailLastPollError: null,
  authorizedById: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
} as any;

const commandMessage = {
  messageId: "<gmail-command-001@example.test>",
  senderEmail: "founder@gmail.com",
  recipientEmail: "system.notify@gmail.com",
  subject: GMAIL_OFFLINE_COMMAND_SUBJECT,
  commandBody: GMAIL_OFFLINE_COMMAND_BODY,
  authenticationPassed: true,
  hasAttachments: false,
};

describe("Gmail IMAP 授權離線指令", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getReceiptByTokenHash.mockResolvedValue(null);
    mocks.createReceipt.mockResolvedValue({ id: 700 });
    mocks.getAuthorizedSenders.mockResolvedValue([{ senderEmail: "founder@gmail.com", isActive: true }]);
    mocks.getSystemSettings.mockResolvedValue({ systemMode: "online", maintenanceMode: false });
    mocks.upsertSystemSettings.mockResolvedValue({ id: 9, systemMode: "offline" });
    mocks.getUserById.mockResolvedValue({ id: 1, username: "Chaney", name: "Chaney" });
    mocks.updateReceipt.mockResolvedValue(undefined);
    mocks.updateReplyStatus.mockResolvedValue(undefined);
    mocks.createOperationLog.mockResolvedValue(undefined);
    mocks.sendSuccessReply.mockResolvedValue(undefined);
  });

  it("僅對已由 Apps Script 簽章、無附件且在授權清單的 Gmail 指令切換 SYSTEM OFFLINE", async () => {
    const result = await processGmailOfflineCommandMessage({ settings, message: commandMessage });

    expect(result).toEqual({ accepted: true, code: "system_offline_enabled", receiptId: 700 });
    expect(mocks.upsertSystemSettings).toHaveBeenCalledWith(expect.objectContaining({ systemMode: "offline", updatedById: 1 }));
    expect(mocks.createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ details: expect.stringContaining("authorized_gmail_apps_script") }));
    expect(mocks.updateReceipt).toHaveBeenLastCalledWith({ id: 700, status: "accepted", resultingMode: "offline" });
    expect(mocks.sendSuccessReply).toHaveBeenCalledWith({ to: "founder@gmail.com", messageId: "<gmail-command-001@example.test>", resultingMode: "offline" });
    expect(mocks.updateReplyStatus).toHaveBeenCalledWith({ id: 700, replyStatus: "sent" });
    expect(mocks.createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "replyGmailOfflineCommandSender", entityId: 700 }));
  });

  it("回覆郵件暫時寄送失敗時保留離線指令成功結果，並記錄失敗稽核", async () => {
    mocks.sendSuccessReply.mockRejectedValueOnce(new Error("smtp unavailable"));

    const result = await processGmailOfflineCommandMessage({ settings, message: commandMessage });

    expect(result).toEqual({ accepted: true, code: "system_offline_enabled", receiptId: 700 });
    expect(mocks.updateReplyStatus).toHaveBeenCalledWith({ id: 700, replyStatus: "failed", replyError: "smtp unavailable" });
    expect(mocks.createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "replyGmailOfflineCommandSender", details: expect.stringContaining("failed") }));
  });

  it("系統原已離線時仍回覆原始寄件者，並保存回覆結果", async () => {
    mocks.getSystemSettings.mockResolvedValueOnce({ systemMode: "offline", maintenanceMode: false });

    const result = await processGmailOfflineCommandMessage({ settings, message: commandMessage });

    expect(result).toEqual({ accepted: true, code: "system_already_offline", receiptId: 700 });
    expect(mocks.sendSuccessReply).toHaveBeenCalledWith({ to: "founder@gmail.com", messageId: "<gmail-command-001@example.test>", resultingMode: "already_offline" });
    expect(mocks.updateReplyStatus).toHaveBeenCalledWith({ id: 700, replyStatus: "sent" });
  });

  it("拒絕未通過 Apps Script 驗證的郵件", async () => {
    const result = await processGmailOfflineCommandMessage({ settings, message: { ...commandMessage, authenticationPassed: false } });

    expect(result).toEqual({ accepted: false, code: "apps_script_authentication_failed", receiptId: 700 });
    expect(mocks.upsertSystemSettings).not.toHaveBeenCalled();
    expect(mocks.updateReceipt).toHaveBeenCalledWith({ id: 700, status: "rejected", rejectionCode: "apps_script_authentication_failed" });
  });

  it("拒絕包含附件的郵件，避免附件解析成為緊急控制面入口", async () => {
    const result = await processGmailOfflineCommandMessage({ settings, message: { ...commandMessage, hasAttachments: true } });

    expect(result).toEqual({ accepted: false, code: "attachments_not_allowed", receiptId: 700 });
    expect(mocks.upsertSystemSettings).not.toHaveBeenCalled();
  });

  it("拒絕未包含指定固定內文的郵件，避免誤寄相同主旨即觸發離線", async () => {
    const result = await processGmailOfflineCommandMessage({ settings, message: { ...commandMessage, commandBody: "請協助處理" } });

    expect(result).toEqual({ accepted: false, code: "command_body_invalid", receiptId: 700 });
    expect(mocks.upsertSystemSettings).not.toHaveBeenCalled();
  });

  it("拒絕已記錄的 Gmail 訊息 ID，防止重放離線指令", async () => {
    mocks.getReceiptByTokenHash.mockResolvedValue({ id: 699, status: "accepted" });

    const result = await processGmailOfflineCommandMessage({ settings, message: commandMessage });

    expect(result).toEqual({ accepted: false, code: "gmail_replay_rejected", receiptId: 699 });
    expect(mocks.createReceipt).not.toHaveBeenCalled();
    expect(mocks.upsertSystemSettings).not.toHaveBeenCalled();
  });

  it("只接受有效 HMAC 簽章的 Apps Script HTTPS 指令", async () => {
    mocks.getSettings.mockResolvedValue(settings);
    const base = {
      messageId: "apps-script-message-01",
      senderEmail: "founder@gmail.com",
      recipientEmail: "system.notify@gmail.com",
      subject: GMAIL_OFFLINE_COMMAND_SUBJECT,
      commandBody: GMAIL_OFFLINE_COMMAND_BODY,
      authenticationPassed: true,
      timestamp: Date.now(),
    };
    const req = { body: { ...base, signature: createAppsScriptOfflineCommandSignature("gmail-command-test-salt", base) } } as any;
    const res = { status: vi.fn(), json: vi.fn() } as any;
    res.status.mockReturnValue(res);

    await runAppsScriptOfflineCommand(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ accepted: true, code: "system_offline_enabled" }));
  });

  it("在寫入稽核前拒絕無效 Apps Script 簽章與逾時請求", async () => {
    mocks.getSettings.mockResolvedValue(settings);
    const res = { status: vi.fn(), json: vi.fn() } as any;
    res.status.mockReturnValue(res);

    await runAppsScriptOfflineCommand({ body: {
      messageId: "apps-script-message-02", senderEmail: "founder@gmail.com", recipientEmail: "system.notify@gmail.com",
      subject: GMAIL_OFFLINE_COMMAND_SUBJECT, commandBody: GMAIL_OFFLINE_COMMAND_BODY, authenticationPassed: true, timestamp: Date.now(), signature: "x".repeat(43),
    } } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ accepted: false, code: "invalid_signature" });

    await runAppsScriptOfflineCommand({ body: {
      messageId: "apps-script-message-03", senderEmail: "founder@gmail.com", recipientEmail: "system.notify@gmail.com",
      subject: GMAIL_OFFLINE_COMMAND_SUBJECT, commandBody: GMAIL_OFFLINE_COMMAND_BODY, authenticationPassed: true, timestamp: Date.now() - 10 * 60 * 1000, signature: "x".repeat(43),
    } } as any, res);
    expect(res.json).toHaveBeenLastCalledWith({ accepted: false, code: "command_expired" });
  });
});
