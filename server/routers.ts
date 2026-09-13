import { z } from "zod";
import { hashPassword, generateTemporaryPassword, verifyPassword, validatePasswordComplexity } from "./_core/password";
import bcrypt from "bcryptjs";
import { randomBytes, randomInt } from "node:crypto";
import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse } from "@simplewebauthn/server";
import { getUserByUsername } from "./db";
import {
  cancelBorrowRequest,
  confirmLoginDeviceAlert,
  createAccountDeduplicationReport,
  createAccountActivationCertificateDelivery,
  getAccountActivationCertificateExportById,
  getAccountActivationCertificateExportByVerificationToken,
  getAccountActivationCertificateExports,
  getLatestAccountActivationCertificateExportByNumber,
  createBrandLogoLoadFailure,
  createBorrowRecord,
  createBorrowRequest,
  createEmailVerification,
  createCategory,
  createEquipment,
  reassignEquipmentCategories,
  reviewEquipmentLocationHistoryEntry,
  signEquipmentLocationHistoryEntry,
  createFirstLoginSetupChallenge,
  completeFounderPinSetupOnce,
  createEquipmentLocationHistoryEntry,
  createEquipmentLocationMovementAlert,
  createQrPrintHistory,
  createLoginAuditLog,
  createTwoFactorLoginChallenge,
  createOperationLog,
  createPasskeyChallenge,
  createPasskeyCredential,
  createSystemReport,
  createMediaCalendarEvent,
  createMediaProjectProposal,
  createPodcastEpisode,
  createPodcastShow,
  createSystemReportAsset,
  createReimbursementClaim,
  createReimbursementNotification,
  createReimbursementReceipt,
  consumePasskeyChallenge,
  consumeTwoFactorRecoveryCode,
  createSystemAlertEmailRecipient,
  deleteCategory,
  deleteEquipment,
  deleteMediaCalendarEvent,
  deleteMediaProjectProposal,
  deletePodcastEpisode,
  deletePodcastShow,
  getEquipmentCategoryDeletionPreview,
  getEquipmentCategoriesWithUsage,
  getEquipmentDeletionPreview,
  deleteFirstLoginSetupChallenge,
  deletePasskeyCredential,
  deleteSystemAlertEmailRecipient,
  deleteSystemReportAsset,
  deleteReimbursementReceipt,
  deleteTestAccounts,
  deactivateDuplicateUserAccount,
  findDuplicateAccounts,
  getAllCategories,
  getAllEquipment,
  getAllUsers,
  getAccountDeduplicationSchedule,
  getAccountActivationCertificateDeliveries,
  getAccountActivationCertificateDeliveryById,
  getBrandLogoLoadFailureCount,
  getBrandLogoLoadFailures,
  getBrandLogoLoadFailureSummarySince,
  getBrandLogoAlertThresholdStatus,
  getBrandLogoHourlyTrend,
  getBorrowRecords,
  getBorrowRequestById,
  getBorrowRequests,
  getDashboardStats,
  getDashboardOperationalAlertSummary,
  getTodayAccountDeduplicationEmailSummary,
  getTestAccounts,
  getEquipmentById,
  getEquipmentLocationHistory,
  getEquipmentLocationHistoryEntryById,
  getEquipmentLocationHistoryOperators,
  getMonthlyEquipmentLocationMovementCount,
  getMonthlyLocationAuditSummary,
  getMonthlyReimbursementCategorySummary,
  getReimbursementAnnualBudgetComparison,
  getReimbursementMonthlyTrend,
  getFirstLoginSetupChallenge,
  getQrPrintHistory,
  getLatestEmailVerification,
  getLoginAuditLogCount,
  getLoginAuditLogs,
  getLoginAuditHighRiskSummary,
  getLoginActivityAnalytics,
  getMediaCalendarEventById,
  getMediaCalendarEvents,
  getMediaProjectProposalById,
  getMediaProjectProposals,
  getMediaProjectProposalsByApplicant,
  getPodcastDistributionTargets,
  getPodcastEpisodeById,
  getPodcastEpisodes,
  getPodcastShowById,
  getPodcastShows,
  getWeeklyIdleTimeoutSecuritySummary,
  getIpBlacklistEntry,
  getLoginDeviceById,
  getLatestAccountDeduplicationReport,
  getLoginFailureAttempts,
  getLoginPinFailureAttempts,
  getLoginPinLockTimeRemaining,
  getLoginLockTimeRemaining,
  getOperationLogCount,
  getOperationLogs,
  getLatestOperationLogRetentionRun,
  getAuditEventResolutions,
  getOperationLogRetentionSchedule,
  getPasskeyCredentialByCredentialId,
  getPendingLoginDeviceAlerts,
  getPendingLoginDeviceAlertById,
  getPinFailureAttempts,
  getPinLockTimeRemaining,
  getSystemAlertEmailDeliveries,
  getSystemAlertEmailDeliveriesForEvent,
  getSystemAlertEmailRecipientByEmail,
  getSystemAlertEmailRecipients,
  getSystemModeHistory,
  getLatestSystemRecoveryNotice,
  getSystemMaintenanceSettings,
  getEmailOfflineCommandAuthorizedSenders,
  getEmailOfflineCommandSettings,
  getRecentEmailOfflineCommandReceipts,
  getSystemReportById,
  getSystemReportAssetById,
  getSystemReportReadStatistics,
  getSystemReports,
  getReimbursementClaimById,
  getReimbursementClaims,
  getReimbursementReceiptById,
  getUnreadReimbursementNotifications,
  getSystemReportInbox,
  getUnreadUrgentSystemReportAudiences,
  getUnreadSystemReports,
  incrementSystemReportAssetDownloadCount,
  getUserById,
  getUsersWithUnverifiedEmails,
  getUserDeletionPreview,
  getUserLoginSecurityStatuses,
  getTwoFactorAuthenticator,
  getTwoFactorLoginChallenge,
  getActiveTwoFactorRecoveryCodes,
  getTwoFactorRecoveryCodeStatus,
  incrementTwoFactorChallengeAttempts,
  markTwoFactorChallengeVerified,
  incrementEmailVerificationAttempts,
  deleteTwoFactorLoginChallenge,
  listLoginDevices,
  listPasskeyCredentials,
  countActiveLoginDevices,
  completeEmailVerification,
  completeFirstLoginSetup,
  recordLoginDevice,
  revokeLoginDeviceAlert,
  revokeLoginDevice,
  listIpBlacklist,
  upsertIpBlacklistEntry,
  setIpBlacklistActive,
  setTwoFactorEnabled,
  touchTwoFactorAuthenticator,
  updatePodcastEpisode,
  updatePodcastRssSettings,
  updatePodcastShow,
  upsertPodcastDistributionTarget,
  upsertTwoFactorAuthenticator,
  isLoginLocked,
  isLoginPinLocked,
  isPinLocked,
  recordLoginFailure,
  recordLoginPinFailure,
  recordPinFailure,
  resetLoginFailureAttempts,
  resetLoginPinFailureAttempts,
  resetPinFailureAttempts,
  replaceTwoFactorRecoveryCodes,
  revokeTwoFactorRecoveryCodes,
  renamePasskeyCredential,
  publishSystemReport,
  returnBorrowRecord,
  reviewBorrowRequest,
  lockLoginAttempts,
  markSystemReportRead,
  markReimbursementNotificationsRead,
  markAccountActivationCertificateExportDownloaded,
  updateAccountActivationCertificateExportStatus,
  unlockLoginAttempts,
  updateEquipment,
  updateEquipmentCategory,
  updateEquipmentLocationMovementAlertNotification,
  updatePasskeyCredentialUsage,
  updateSystemReportDraft,
  updateMediaCalendarEvent,
  updateMediaProjectProposal,
  reviewMediaProjectProposal,
  updateSystemReportPinned,
  updateSystemReportPriority,
  updateReimbursementClaimStatus,
  upsertReimbursementAnnualBudget,
  updateSystemAlertEmailRecipientStatus,
  replaceEmailOfflineCommandAuthorizedSenders,
  upsertEmailOfflineCommandSettings,
  upsertSystemMaintenanceSettings,
  updateBorrowRequestByFounder,
  updateOverdueRecords,
  updateUserActive,
  extendTemporaryPasswordExpiry,
  updateUserRole,
  upsertBrandLogoAlertThreshold,
  upsertAuditEventResolution,
  upsertUser,
  deleteUser,
  getUserPreferences,
  getOverdueBorrowReminderSchedule,
  getBorrowReturnReminderById,
  getBorrowReturnReminderHistory,
  getUnreadBorrowReturnReminders,
  markBorrowReturnRemindersRead,
  markBorrowReturnReminderResent,
  LOCATION_MOVEMENT_ALERT_THRESHOLD,
  upsertUserPreferences,
  updateUserProfile,
  generateUniqueQrCodeId,
  borrowEquipment,
  returnEquipment,
} from "./db";
import { COOKIE_NAME } from "@shared/const";
import { isLegacyUsername, loginPasswordPattern, loginUsernamePattern } from "@shared/loginCredentialPolicy";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { resolveSystemMode } from "./systemMode";
import { encryptEmailOfflineCommandSecret } from "./emailOfflineCommandVault";
import { APPS_SCRIPT_OFFLINE_COMMAND_PATH, GMAIL_OFFLINE_COMMAND_BODY, GMAIL_OFFLINE_COMMAND_LABEL, GMAIL_OFFLINE_COMMAND_SUBJECT, generateGmailOfflineCommandSecret } from "./gmailOfflineCommand";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { notifyOwner } from "./_core/notification";
import { sendSystemAlertEmail } from "./systemAlertEmail";
import { notifyHighRiskOperation } from "./highRiskOperationAlert";
import { sendEmailVerificationCode } from "./contactVerificationEmail";
import { buildAccountActivationCertificate, sendAccountActivationCertificate } from "./accountActivationEmail";
import { buildAccountActivationCertificatePdf } from "./accountActivationCertificatePdf";
import { sendPasskeySecurityEmail } from "./passkeySecurityEmail";
import { decryptActivationCertificateRecipient, encryptActivationCertificateRecipient } from "./activationCertificateRecipientVault";
import { createTwoFactorRecoveryCode, createTwoFactorSetup, decryptTwoFactorSecret, describeLoginDevice, encryptTwoFactorSecret, hashTwoFactorRecoveryCode, isValidTwoFactorRecoveryCode, verifyTwoFactorCode, verifyTwoFactorRecoveryCodeHash } from "./twoFactor";
import { decryptTemporaryPassword, encryptTemporaryPassword } from "./temporaryPasswordVault";
import { formatIpLocation, isPrivateOrReservedIp } from "./ipGeolocation";
import { isTestAccount } from "../shared/accountClassification";
import { PASSKEY_CHALLENGE_TTL_MS, base64UrlToUint8Array, deriveWebAuthnUserId, describePasskeyRegistrationDevice, getPasskeyRelyingParty, serializePasskeyTransports, toWebAuthnCredential } from "./passkey";
import { storageGetSignedUrl, storagePut } from "./storage";
import { storeAccountActivationCertificatePdf } from "./activationCertificateExportStore";
import { issueDynamicUserQrCode, verifyDynamicUserQrCode } from "./dynamicUserQrCode";

// ─── Role Guards ──────────────────────────────────────────────────────────────

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "需要管理員權限" });
  return next({ ctx });
});

const founderProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" || !ctx.user.isFounder) {
    throw new TRPCError({ code: "FORBIDDEN", message: "僅創始管理員可管理系統異常通知" });
  }
  return next({ ctx });
});

function getRequestAssetBaseUrl(req: { protocol?: string; get: (name: string) => string | undefined }): string {
  const host = req.get("x-forwarded-host")?.split(",")[0]?.trim() || req.get("host");
  const protocol = req.get("x-forwarded-proto")?.split(",")[0]?.trim() || req.protocol || "https";
  if (!host) throw new Error("Request host is required to generate the activation certificate PDF");
  return `${protocol}://${host}`;
}

function normalizeTaipeiDateBoundary(value: Date, boundary: "start" | "end") {
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const parts = Object.fromEntries(dateParts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return new Date(`${parts.year}-${parts.month}-${parts.day}T${boundary === "start" ? "00:00" : "23:59"}:00+08:00`);
}

// Helper function to log operations
async function logOperation(
  userId: number,
  username: string,
  action: string,
  entityType: string,
  entityId?: number,
  entityName?: string,
  details?: any,
  ipAddress?: string,
  userAgent?: string
) {
  await createOperationLog({
    userId,
    username,
    action,
    entityType,
    entityId,
    entityName,
    details: details ? JSON.stringify(details) : undefined,
    ipAddress,
    userAgent,
  });
}

const mediaCalendarEventInputSchema = z.object({
  title: z.string().trim().min(1, "請填寫行程名稱").max(160, "行程名稱不得超過 160 字"),
  category: z.enum(["activity", "duty", "equipment", "meeting", "other"]),
  startsAt: z.date(),
  endsAt: z.date().nullable().optional(),
  allDay: z.boolean().default(false),
  location: z.string().trim().max(160, "地點不得超過 160 字").nullable().optional(),
  description: z.string().trim().max(4000, "說明不得超過 4000 字").nullable().optional(),
}).superRefine((value, context) => {
  if (value.endsAt && value.endsAt.getTime() < value.startsAt.getTime()) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "結束時間不得早於開始時間" });
  }
});

const mediaProjectProposalInputSchema = z.object({
  title: z.string().trim().min(1, "請填寫企劃名稱").max(160, "企劃名稱不得超過 160 字"),
  summary: z.string().trim().max(320, "摘要不得超過 320 字").nullable().optional(),
  content: z.string().trim().min(1, "請填寫企劃內容").max(12000, "企劃內容不得超過 12000 字"),
  proposedStartAt: z.date().nullable().optional(),
  proposedEndAt: z.date().nullable().optional(),
  requestedBudget: z.number().min(0, "經費不得小於 0").max(99_999_999, "經費超出可接受範圍").nullable().optional(),
  status: z.enum(["draft", "submitted"]),
}).superRefine((value, context) => {
  if (value.proposedStartAt && value.proposedEndAt && value.proposedEndAt.getTime() < value.proposedStartAt.getTime()) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["proposedEndAt"], message: "結束日期不得早於開始日期" });
  }
});

const podcastShowInputSchema = z.object({
  title: z.string().trim().min(1, "請填寫節目名稱").max(160, "節目名稱不得超過 160 字"),
  description: z.string().trim().max(4_000, "節目介紹不得超過 4,000 字").nullable().optional(),
  status: z.enum(["draft", "published"]),
});

const podcastEpisodeInputSchema = z.object({
  showId: z.number().int().positive(),
  title: z.string().trim().min(1, "請填寫單集名稱").max(160, "單集名稱不得超過 160 字"),
  description: z.string().trim().max(8_000, "單集說明不得超過 8,000 字").nullable().optional(),
  episodeNumber: z.number().int().positive().max(10_000),
  status: z.enum(["draft", "published"]),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(["audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav", "audio/x-wav"]),
  base64: z.string().min(4).max(32_000_000),
});

const podcastEpisodeUpdateSchema = z.object({
  title: z.string().trim().min(1, "請填寫單集名稱").max(160, "單集名稱不得超過 160 字"),
  description: z.string().trim().max(8_000, "單集說明不得超過 8,000 字").nullable().optional(),
  episodeNumber: z.number().int().positive().max(10_000),
  status: z.enum(["draft", "published"]),
});

const podcastRssSettingsSchema = z.object({
  slug: z.string().trim().min(3, "RSS 識別碼至少需 3 個字元").max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "RSS 識別碼僅能使用小寫英數字與連字號"),
  authorName: z.string().trim().min(1, "請填寫 Podcast 作者名稱").max(160),
  ownerEmail: z.string().trim().email("請填寫有效的 Podcast 聯絡信箱").max(320).nullable().optional(),
  language: z.string().trim().min(2).max(16).default("zh-TW"),
  artworkUrl: z.string().trim().url("請填寫有效的封面網址").max(4_000).nullable().optional(),
  isExplicit: z.boolean().default(false),
  rssEnabled: z.boolean().default(false),
});

const podcastDistributionTargetSchema = z.object({
  platform: z.enum(["spotify", "apple_podcasts", "amazon_music", "youtube", "other"]),
  status: z.enum(["not_submitted", "submitted", "active", "attention"]),
  directoryUrl: z.string().trim().url("請填寫有效的平台網址").max(4_000).nullable().optional(),
  note: z.string().trim().max(2_000, "備註不得超過 2,000 字").nullable().optional(),
});

const PODCAST_AUDIO_MAX_BYTES = 20 * 1024 * 1024;

function parsePodcastAudioBase64(value: string): Buffer {
  const encoded = value.replace(/^data:audio\/(mpeg|mp4|ogg|wav|x-wav);base64,/i, "").replace(/\s/g, "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new TRPCError({ code: "BAD_REQUEST", message: "音檔資料格式無效" });
  return Buffer.from(encoded, "base64");
}

function sanitizePodcastAudioFileName(value: string): string {
  const safeName = value.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^[_\.]+/, "").slice(0, 180);
  if (!safeName) throw new TRPCError({ code: "BAD_REQUEST", message: "音檔名稱無效" });
  return safeName;
}

function maskEmailAddress(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "已隱藏";
  return `${localPart.slice(0, 2)}${"*".repeat(Math.max(1, Math.min(localPart.length - 2, 6)))}@${domain}`;
}

function normalizeLocation(location: string | null | undefined): string | null {
  const normalized = location?.trim();
  return normalized ? normalized : null;
}

async function generateSystemManagedUsername(role: "admin" | "teacher" | "student"): Promise<string> {
  const rolePrefix = role === "admin" ? "ADM" : role === "teacher" ? "TCH" : "STU";
  const dateToken = new Date().toISOString().slice(2, 10).replace(/-/g, "");

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const randomToken = randomBytes(3).toString("hex").toUpperCase();
    const username = `QSSH${rolePrefix}${dateToken}${randomToken}`;
    if (!(await getUserByUsername(username))) return username;
  }

  throw new TRPCError({ code: "CONFLICT", message: "系統暫時無法產生可用帳號，請再試一次" });
}

const staffProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "teacher")
    throw new TRPCError({ code: "FORBIDDEN", message: "需要教師或管理員權限" });
  return next({ ctx });
});

// ─── Users Router ─────────────────────────────────────────────────────────────

const usersRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    const canViewTestAccounts = ctx.user.role === "admin" && ctx.user.isFounder;
    const users = (await getAllUsers())
      .filter((user) => canViewTestAccounts || !isTestAccount(user))
      .map(({ passwordHash, loginPinHash, auditPinHash, temporaryPasswordCiphertext, ...user }) => ({ ...user, isTestAccount: isTestAccount(user) }));
    await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "viewUserManagement", "auditView", undefined, "帳號管理清單", { resultCount: users.length, testAccountsVisible: canViewTestAccounts });
    return users;
  }),
  founderAccountDetails: founderProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      requireFounderAuditPin(ctx as any);
      const target = await getUserById(input.id);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "使用者不存在" });
      const security = (await getUserLoginSecurityStatuses()).find((status) => status.userId === target.id);
      const {
        passwordHash,
        loginPinHash,
        auditPinHash,
        temporaryPasswordCiphertext,
        openId,
        ...safeUser
      } = target;
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "viewFounderAccountDetails", "auditView", target.id, target.username || target.name || `user_${target.id}`, { accountId: target.id, sensitiveCredentialsExcluded: true });
      return {
        ...safeUser,
        isTestAccount: isTestAccount(target),
        loginSecurity: {
          attemptCount: security?.attemptCount ?? 0,
          lastAttemptAt: security?.lastAttemptAt ?? null,
          lockedUntil: security?.lockedUntil ?? null,
          isLocked: security?.isLocked ?? false,
          remainingSeconds: security?.remainingSeconds ?? 0,
        },
      };
    }),
  loginSecurityStatus: adminProcedure.query(async ({ ctx }) => {
    const statuses = await getUserLoginSecurityStatuses();
    await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "viewUserLoginSecurity", "auditView", undefined, "帳號登入安全狀態", { resultCount: statuses.length });
    return statuses;
  }),
  ...createUsersSecurityControls(),

  sendActivationCertificate: adminProcedure
    .input(z.object({ id: z.number().int().positive(), recipientEmail: z.string().email().max(320) }))
    .mutation(async ({ ctx, input }) => {
      const target = await getUserById(input.id);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "使用者不存在" });
      if (target.isActive === false) throw new TRPCError({ code: "BAD_REQUEST", message: "帳號目前已停用，請先啟用帳號後再寄送啟用書" });
      if (isTestAccount(target)) throw new TRPCError({ code: "BAD_REQUEST", message: "測試帳號不可寄送帳號啟用書" });

      try {
        if (target.isTemporaryPassword && (!target.temporaryPasswordExpiresAt || target.temporaryPasswordExpiresAt.getTime() <= Date.now())) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "臨時密碼已到期，請先重設密碼後再寄送" });
        }
        const temporaryPassword = target.isTemporaryPassword && target.temporaryPasswordCiphertext
          ? decryptTemporaryPassword(target.temporaryPasswordCiphertext)
          : null;
        const certificate = await sendAccountActivationCertificate({
          to: input.recipientEmail,
          account: { id: target.id, username: target.username, name: target.name, role: target.role, createdAt: target.createdAt },
          temporaryPassword,
          assetBaseUrl: getRequestAssetBaseUrl(ctx.req),
          onPdfGenerated: async (artifact) => {
            await storeAccountActivationCertificatePdf({ accountId: target.id, generatedById: ctx.user.id, source: "email_attachment", artifact });
          },
        });
        await createAccountActivationCertificateDelivery({
          accountId: target.id,
          sentById: ctx.user.id,
          recipientEmailMasked: maskEmailAddress(input.recipientEmail),
          recipientEmailCiphertext: encryptActivationCertificateRecipient(input.recipientEmail),
          certificateNumber: certificate.certificateNumber,
          hasPdfAttachment: true,
        });
        await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "sendAccountActivationCertificate", "user", target.id, target.username || target.name || `user_${target.id}`, { certificateNumber: certificate.certificateNumber, recipientEmail: maskEmailAddress(input.recipientEmail), temporaryPasswordIncluded: Boolean(temporaryPassword) });
        return { success: true as const, certificateNumber: certificate.certificateNumber };
      } catch (error) {
        console.error("[AccountActivationCertificate] Email delivery failed", { targetUserId: target.id });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "帳號啟用書寄送失敗，請稍後再試" });
      }
    }),

  previewActivationCertificate: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const target = await getUserById(input.id);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "使用者不存在" });
      if (target.isActive === false) throw new TRPCError({ code: "BAD_REQUEST", message: "帳號目前已停用，無法預覽啟用書" });
      if (isTestAccount(target)) throw new TRPCError({ code: "BAD_REQUEST", message: "測試帳號不可預覽帳號啟用書" });

      const account = { id: target.id, username: target.username, name: target.name, role: target.role, createdAt: target.createdAt };
      const certificate = buildAccountActivationCertificate(account);
      const pdf = await buildAccountActivationCertificatePdf({
        account,
        certificate,
        isTemporaryPassword: Boolean(target.isTemporaryPassword),
        assetBaseUrl: getRequestAssetBaseUrl(ctx.req),
      });
      await storeAccountActivationCertificatePdf({
        accountId: target.id,
        generatedById: ctx.user.id,
        source: "preview",
        artifact: { certificate, pdf, fileName: `清水高中媒體服務隊管理系統-帳號啟用書-${target.id}.pdf` },
      });
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "previewAccountActivationCertificate", "user", target.id, target.username || target.name || `user_${target.id}`, { certificateNumber: certificate.certificateNumber, hasPdfAttachment: true });
      return { certificateNumber: certificate.certificateNumber, pdfDataUrl: `data:application/pdf;base64,${pdf.toString("base64")}`, hasPdfAttachment: true as const };
    }),

  activationCertificateHistory: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const target = await getUserById(input.id);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "使用者不存在" });
      const deliveries = await getAccountActivationCertificateDeliveries(target.id);
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "viewAccountActivationCertificateHistory", "auditView", target.id, target.username || target.name || `user_${target.id}`, { resultCount: deliveries.length });
      return deliveries.map(({ recipientEmailCiphertext, ...delivery }) => delivery);
    }),

  resendActivationCertificate: adminProcedure
    .input(z.object({ deliveryId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const delivery = await getAccountActivationCertificateDeliveryById(input.deliveryId);
      if (!delivery) throw new TRPCError({ code: "NOT_FOUND", message: "找不到指定的啟用書寄送紀錄" });
      if (!delivery.recipientEmailCiphertext) throw new TRPCError({ code: "BAD_REQUEST", message: "此歷史紀錄未保存可供安全重寄的收件地址，請改用指定收件信箱寄送" });
      const target = await getUserById(delivery.accountId);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "帳號已不存在" });
      if (target.isActive === false || isTestAccount(target)) throw new TRPCError({ code: "BAD_REQUEST", message: "此帳號目前不可再次寄送啟用書" });

      try {
        if (target.isTemporaryPassword && (!target.temporaryPasswordExpiresAt || target.temporaryPasswordExpiresAt.getTime() <= Date.now())) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "臨時密碼已到期，請先重設密碼後再寄送" });
        }
        const recipientEmail = decryptActivationCertificateRecipient(delivery.recipientEmailCiphertext);
        const temporaryPassword = target.isTemporaryPassword && target.temporaryPasswordCiphertext
          ? decryptTemporaryPassword(target.temporaryPasswordCiphertext)
          : null;
        const certificate = await sendAccountActivationCertificate({
          to: recipientEmail,
          account: { id: target.id, username: target.username, name: target.name, role: target.role, createdAt: target.createdAt },
          temporaryPassword,
          assetBaseUrl: getRequestAssetBaseUrl(ctx.req),
          onPdfGenerated: async (artifact) => {
            await storeAccountActivationCertificatePdf({ accountId: target.id, generatedById: ctx.user.id, source: "email_attachment", artifact });
          },
        });
        await createAccountActivationCertificateDelivery({
          accountId: target.id,
          sentById: ctx.user.id,
          recipientEmailMasked: delivery.recipientEmailMasked,
          recipientEmailCiphertext: delivery.recipientEmailCiphertext,
          certificateNumber: certificate.certificateNumber,
          hasPdfAttachment: true,
        });
        await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "resendAccountActivationCertificate", "user", target.id, target.username || target.name || `user_${target.id}`, { previousDeliveryId: delivery.id, certificateNumber: certificate.certificateNumber, recipientEmail: delivery.recipientEmailMasked, temporaryPasswordIncluded: Boolean(temporaryPassword) });
        return { success: true as const, certificateNumber: certificate.certificateNumber, recipientEmail: delivery.recipientEmailMasked };
      } catch (error) {
        console.error("[AccountActivationCertificate] Resend failed", { deliveryId: input.deliveryId, targetUserId: target.id });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "帳號啟用書再次寄送失敗，請稍後再試" });
      }
    }),

  batchSetTestAccountActive: founderProcedure
    .input(z.object({ ids: z.array(z.number().int().positive()).min(1).max(100), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const targets = await Promise.all(input.ids.map((id) => getUserById(id)));
      if (targets.some((target) => !target)) throw new TRPCError({ code: "NOT_FOUND", message: "部分測試帳號已不存在，請重新整理清單" });
      const validTargets = targets.filter((target): target is NonNullable<typeof target> => Boolean(target));
      if (validTargets.some((target) => !isTestAccount(target) || target.isFounder || target.id === ctx.user.id)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "只能批次處理系統辨識的測試帳號，且不可處理目前登入帳號或創始管理員" });
      }
      await Promise.all(validTargets.map((target) => updateUserActive(target.id, input.isActive)));
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "bulkTestAccountStatus", "user", undefined, input.isActive ? "批次啟用測試帳號" : "批次停用測試帳號", { targetUserIds: validTargets.map((target) => target.id), targetUsernames: validTargets.map((target) => target.username), isActive: input.isActive });
      return { success: true as const, updatedCount: validTargets.length };
    }),

  updateRole: adminProcedure
    .input(z.object({ id: z.number(), role: z.enum(["admin", "teacher", "student"]) }))
    .mutation(async ({ ctx, input }) => {
      const user = await getUserById(input.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "使用者不存在" });
      if (user.isFounder) throw new TRPCError({ code: "FORBIDDEN", message: "無法修改創始管理員的角色" });
      
      await updateUserRole(input.id, input.role);
      
      // 記錄操作日誌
      await logOperation(
        ctx.user.id,
        ctx.user.username || ctx.user.openId || "unknown",
        "update",
        "user",
        input.id,
        user.username || "unknown",
        { changedFields: ["role"], previousRole: user.role, newRole: input.role }
      );
      await notifyHighRiskOperation({ actionKey: "update-role", actionLabel: "帳號角色變更", actorName: ctx.user.username || ctx.user.openId || "unknown", targetUserId: user.id, targetName: user.username || user.name || `user_${user.id}`, details: [`原角色：${user.role}`, `新角色：${input.role}`] });
      
      return { success: true };
    }),

  toggleActive: adminProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const user = await getUserById(input.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "使用者不存在" });
      if (user.isFounder) throw new TRPCError({ code: "FORBIDDEN", message: "無法停用創始管理員" });
      
      await updateUserActive(input.id, input.isActive);
      
      // 記錄操作日誌
      await logOperation(
        ctx.user.id,
        ctx.user.username || ctx.user.openId || "unknown",
        input.isActive ? "activate" : "deactivate",
        "user",
        input.id,
        user.username || "unknown",
        { changedFields: ["isActive"], previousIsActive: user.isActive, newIsActive: input.isActive }
      );
      await notifyHighRiskOperation({ actionKey: input.isActive ? "activate-account" : "deactivate-account", actionLabel: input.isActive ? "帳號啟用" : "帳號停用", actorName: ctx.user.username || ctx.user.openId || "unknown", targetUserId: user.id, targetName: user.username || user.name || `user_${user.id}` });
      
      return { success: true };
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().trim().min(1, "姓名為必填").max(120),
        email: z.string().trim().email("請填寫有效電子郵件").max(320),
        role: z.enum(["admin", "teacher", "student"]),
        studentId: z.string().optional(),
        department: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const username = await generateSystemManagedUsername(input.role);

      const tempPassword = generateTemporaryPassword();
      const passwordHash = await hashPassword(tempPassword);
      const temporaryPasswordCiphertext = encryptTemporaryPassword(tempPassword);
      const temporaryPasswordExpiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
      
      await upsertUser({
        username,
        name: input.name,
        email: input.email,
        role: input.role,
        studentId: input.studentId,
        department: input.department,
        loginMethod: "custom",
        passwordHash,
        temporaryPasswordCiphertext,
        temporaryPasswordExpiresAt,
        isTemporaryPassword: true,
        isActive: true,
        lastSignedIn: new Date(),
      });
      
      // 記錄操作日誌
      const createdUser = await getUserByUsername(username);
      if (createdUser) {
        await logOperation(
          ctx.user.id,
          ctx.user.username || ctx.user.openId || "unknown",
          "create",
          "user",
          createdUser.id,
          username,
          { role: input.role, email: input.email, usernameGeneratedBySystem: true, temporaryPasswordExpiresAt: temporaryPasswordExpiresAt.toISOString() }
        );
      }

      let activationEmailSent = false;
      let activationCertificateNumber: string | null = null;
      if (createdUser) {
        try {
          const certificate = await sendAccountActivationCertificate({
            to: input.email,
            account: { id: createdUser.id, username: createdUser.username, name: createdUser.name, role: createdUser.role, createdAt: createdUser.createdAt },
            temporaryPassword: tempPassword,
            assetBaseUrl: getRequestAssetBaseUrl(ctx.req),
            onPdfGenerated: async (artifact) => {
              await storeAccountActivationCertificatePdf({ accountId: createdUser.id, generatedById: ctx.user.id, source: "email_attachment", artifact });
            },
          });
          await createAccountActivationCertificateDelivery({
            accountId: createdUser.id,
            sentById: ctx.user.id,
            recipientEmailMasked: maskEmailAddress(input.email),
            recipientEmailCiphertext: encryptActivationCertificateRecipient(input.email),
            certificateNumber: certificate.certificateNumber,
            hasPdfAttachment: true,
          });
          await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "autoSendAccountActivationCertificate", "user", createdUser.id, username, { certificateNumber: certificate.certificateNumber, recipientEmail: maskEmailAddress(input.email), temporaryPasswordIncluded: true });
          activationEmailSent = true;
          activationCertificateNumber = certificate.certificateNumber;
        } catch (error) {
          console.error("[AccountActivationCertificate] Automatic email delivery failed", { targetUserId: createdUser.id });
          await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "autoSendAccountActivationCertificateFailed", "user", createdUser.id, username, { recipientEmail: maskEmailAddress(input.email) });
        }
      }
      
      return { success: true, username, tempPassword, activationEmailSent, activationCertificateNumber, recipientEmail: maskEmailAddress(input.email) };
    }),

  resetPassword: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const user = await getUserById(input.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "使用者不存在" });
      if (user.isFounder) throw new TRPCError({ code: "FORBIDDEN", message: "無法重置創始管理員的密碼" });

      const tempPassword = generateTemporaryPassword();
      const passwordHash = await hashPassword(tempPassword);
      const temporaryPasswordCiphertext = encryptTemporaryPassword(tempPassword);
      const temporaryPasswordExpiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);

      await upsertUser({
        openId: user.openId,
        username: user.username,
        passwordHash,
        temporaryPasswordCiphertext,
        temporaryPasswordExpiresAt,
        isTemporaryPassword: true,
      });

      // 記錄操作日誌
      await logOperation(
        ctx.user.id,
        ctx.user.username || ctx.user.openId || "unknown",
        "resetPassword",
        "user",
        input.id,
        user.username || "unknown",
        {}
      );
      await notifyHighRiskOperation({ actionKey: "reset-password", actionLabel: "帳號密碼重設", actorName: ctx.user.username || ctx.user.openId || "unknown", targetUserId: user.id, targetName: user.username || user.name || `user_${user.id}`, details: ["已產生新的臨時密碼；通知不含任何憑證"] });

      return { success: true as const, temporaryPasswordGenerated: true as const };
    }),

  extendTemporaryPasswordExpiry: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const user = await getUserById(input.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "使用者不存在" });
      if (user.isFounder) throw new TRPCError({ code: "FORBIDDEN", message: "無法延長創始管理員的臨時密碼效期" });
      if (!user.isTemporaryPassword || !user.temporaryPasswordExpiresAt) throw new TRPCError({ code: "BAD_REQUEST", message: "此帳號沒有可延長的有效臨時密碼，請改用重設密碼" });

      const previousExpiry = new Date(user.temporaryPasswordExpiresAt);
      if (previousExpiry.getTime() <= Date.now()) throw new TRPCError({ code: "BAD_REQUEST", message: "臨時密碼已到期，請改用重設密碼" });
      const nextExpiry = new Date(previousExpiry.getTime() + 12 * 60 * 60 * 1000);
      await extendTemporaryPasswordExpiry(user.id, nextExpiry);
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "extendTemporaryPasswordExpiry", "user", user.id, user.username || user.name || `user_${user.id}`, { previousExpiry: previousExpiry.toISOString(), nextExpiry: nextExpiry.toISOString(), extensionHours: 12 });
      await notifyHighRiskOperation({ actionKey: "extend-temporary-password-expiry", actionLabel: "臨時密碼效期延長", actorName: ctx.user.username || ctx.user.openId || "unknown", targetUserId: user.id, targetName: user.username || user.name || `user_${user.id}`, details: ["延長時數：12 小時", `新到期時間：${nextExpiry.toISOString()}`] });
      return { success: true as const, temporaryPasswordExpiresAt: nextExpiry };
    }),

  deletePreview: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const preview = await getUserDeletionPreview(input.id);
      if (!preview) throw new TRPCError({ code: "NOT_FOUND", message: "使用者不存在" });
      if (preview.target.isFounder) throw new TRPCError({ code: "FORBIDDEN", message: "無法刪除創始管理員" });
      if (ctx.user.id === input.id) throw new TRPCError({ code: "FORBIDDEN", message: "無法刪除目前登入的帳號，請由其他管理員處理" });
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "previewUserDeletion", "auditView", preview.target.id, preview.target.username || preview.target.name || `user_${preview.target.id}`, { dependentRecordCount: preview.dependentRecordCount, dependencyTypes: preview.dependencies.map((entry) => entry.key) });
      return preview;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number(), confirmed: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      const user = await getUserById(input.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "使用者不存在" });
      if (user.isFounder) throw new TRPCError({ code: "FORBIDDEN", message: "無法刪除創始管理員" });
      if (ctx.user.id === input.id) throw new TRPCError({ code: "FORBIDDEN", message: "無法刪除目前登入的帳號，請由其他管理員處理" });

      try {
        await deleteUser(input.id);
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        console.error("[UserDelete] Transaction failed", { targetUserId: input.id, code });
        throw new TRPCError({ code: "CONFLICT", message: "帳號相關資料目前無法完整清理，系統未刪除任何資料；請稍後再試或聯絡系統管理員" });
      }
      
      // 記錄操作日誌
      await logOperation(
        ctx.user.id,
        ctx.user.username || ctx.user.openId || "unknown",
        "delete",
        "user",
        input.id,
        user.username || "unknown",
        {
          deletedAccount: {
            username: user.username,
            email: user.email,
            realName: user.realName,
            role: user.role,
            wasActive: user.isActive,
          },
          preservation: "使用者資料已刪除；此稽核快照保留以供追蹤",
        }
      );
      await notifyHighRiskOperation({ actionKey: "delete-account", actionLabel: "帳號刪除", actorName: ctx.user.username || ctx.user.openId || "unknown", targetUserId: user.id, targetName: user.username || user.name || `user_${user.id}`, details: ["帳號資料已刪除，請依稽核紀錄追溯"] });
      
      return { success: true };
    }),

  getTempPassword: founderProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      requireFounderAuditPin(ctx as any);

      const user = await getUserById(input.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "使用者不存在" });
      if (!user.isTemporaryPassword || !user.temporaryPasswordCiphertext) {
        return { tempPassword: null, passwordChanged: true as const };
      }

      if (!user.temporaryPasswordExpiresAt || user.temporaryPasswordExpiresAt.getTime() <= Date.now()) {
        await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "viewExpiredTemporaryPassword", "user", input.id, user.username || `user_${input.id}`, { temporaryPasswordExpired: true, expiresAt: user.temporaryPasswordExpiresAt?.toISOString() ?? null });
        return { tempPassword: null, passwordChanged: false as const, passwordExpired: true as const, expiresAt: user.temporaryPasswordExpiresAt ?? null };
      }

      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "viewTemporaryPassword", "user", input.id, user.username || `user_${input.id}`, { purpose: "管理員查看臨時密碼", passwordReturned: true });
      return { tempPassword: decryptTemporaryPassword(user.temporaryPasswordCiphertext), passwordChanged: false as const };
    }),

  unlockLoginAttempts: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // 只有創始管理員可以解除鎖定
      const founder = await getUserById(ctx.user.id);
      if (!founder || !founder.isFounder) {
        throw new TRPCError({ code: "FORBIDDEN", message: "只有創始管理員可以解除登入鎖定" });
      }
      
      const user = await getUserById(input.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "使用者不存在" });
      
      await unlockLoginAttempts(input.id);
      
      // 記錄操作日誌
      await logOperation(
        ctx.user.id,
        ctx.user.username || ctx.user.openId || "unknown",
        "unlockLogin",
        "user",
        input.id,
        user.username || "unknown",
        {}
      );
      
      return { success: true };
    }),
  deduplicationStatus: founderProcedure.query(async ({ ctx }) => {
    requireFounderAuditPin(ctx as any);
    const [schedule, latestReport, testAccounts] = await Promise.all([
      getAccountDeduplicationSchedule(),
      getLatestAccountDeduplicationReport(),
      getTestAccounts(),
    ]);
    return { schedule, latestReport, testAccounts: testAccounts.map((account) => ({ id: account.id, username: account.username, name: account.name, role: account.role, isActive: account.isActive, createdAt: account.createdAt })) };
  }),

  cleanupTestAccounts: founderProcedure
    .input(z.object({ confirmation: z.literal("DELETE TEST ACCOUNTS") }))
    .mutation(async ({ ctx }) => {
      requireFounderAuditPin(ctx as any);
      const deletedAccounts = await deleteTestAccounts();
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "cleanupTestAccounts", "user", undefined, "測試帳號快速清理", { deletedUserCount: deletedAccounts.length, deletedUserIds: deletedAccounts.map((account) => account.id), deletedUsernames: deletedAccounts.map((account) => account.username), rule: "只刪除符合固定自動化測試帳號命名規則的帳號與其關聯資料" });
      return { success: true as const, deletedCount: deletedAccounts.length };
    }),

  runDeduplicationCheck: founderProcedure.mutation(async ({ ctx }) => {
    requireFounderAuditPin(ctx as any);
    const [groups, schedule] = await Promise.all([findDuplicateAccounts(), getAccountDeduplicationSchedule()]);
    await createAccountDeduplicationReport({ scheduleId: schedule?.id ?? null, groups });
    await logOperation(
      ctx.user.id,
      ctx.user.username || ctx.user.openId || "unknown",
      "runAccountDeduplication",
      "accountDeduplication",
      undefined,
      "手動帳號去重檢查",
      { duplicateGroupCount: groups.length, mode: "report-only" }
    );
    return { duplicateGroupCount: groups.length };
  }),

  deactivateDuplicateUser: founderProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      requireFounderAuditPin(ctx as any);
      if (input.id === ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "不可停用目前登入的管理員帳號" });

      const groups = await findDuplicateAccounts();
      const matches = groups.filter((group) => group.users.some((user) => user.id === input.id));
      if (matches.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "此帳號不在目前的重複帳號報告中，請重新執行檢查" });
      }

      const result = await deactivateDuplicateUserAccount(input.id);
      if (!result.user) throw new TRPCError({ code: "NOT_FOUND", message: "使用者不存在" });
      if (result.user.isFounder) throw new TRPCError({ code: "FORBIDDEN", message: "不可停用創始管理員帳號" });
      if (!result.updated) throw new TRPCError({ code: "BAD_REQUEST", message: "該帳號已停用，無須重複操作" });

      await logOperation(
        ctx.user.id,
        ctx.user.username || ctx.user.openId || "unknown",
        "deactivateDuplicateAccount",
        "user",
        result.user.id,
        result.user.username || result.user.email || `user_${result.user.id}`,
        {
          duplicateIdentifiers: matches.map((group) => ({ field: group.field, value: group.value })),
          preservation: "帳號已停用，未刪除任何資料",
        }
      );
      return { success: true as const };
    }),
});


function createUsersSecurityControls() {
  return {
  lockLoginAttempts: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const founder = await getUserById(ctx.user.id);
      if (!founder || !founder.isFounder) {
        throw new TRPCError({ code: "FORBIDDEN", message: "只有創始管理員可以鎖定帳號" });
      }
      const user = await getUserById(input.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "使用者不存在" });
      if (user.isFounder) throw new TRPCError({ code: "FORBIDDEN", message: "無法鎖定創始管理員" });

      await lockLoginAttempts(input.id);
      await logOperation(
        ctx.user.id,
        ctx.user.username || ctx.user.openId || "unknown",
        "lockLogin",
        "user",
        input.id,
        user.username || "unknown",
        { reason: "管理員手動鎖定登入" }
      );
      return { success: true };
    }),
  };
}

// ─── Equipment Router ─────────────────────────────────────────────────────────

const equipmentRouter = router({
  list: publicProcedure
    .input(
      z.object({
        categoryId: z.number().optional(),
        search: z.string().optional(),
        status: z.string().optional(),
      }).optional()
    )
    .query(({ input }) => getAllEquipment(input)),

  resolveDynamicBorrowerQr: staffProcedure
    .input(z.object({ value: z.string().trim().min(1).max(1_024) }))
    .mutation(async ({ ctx, input }) => {
      const claims = verifyDynamicUserQrCode(input.value);
      if (!claims) {
        const actorName = ctx.user.username || ctx.user.openId || "未知操作人員";
        await logOperation(ctx.user.id, actorName, "rejectDynamicBorrowerQr", "securityEvent", undefined, "動態使用者 QR Code 驗證失敗", { reason: "invalid_or_expired_dynamic_user_qr", source: "equipmentBorrow" });
        void notifyHighRiskOperation({
          actionKey: `dynamic-user-qr-validation-failed-${Date.now()}`,
          actionLabel: "動態使用者 QR Code 驗證失敗",
          actorName,
          targetUserId: ctx.user.id,
          targetName: "借還掃描流程",
          details: ["結果：已拒絕無效、過期或疑似竄改的使用者 QR Code", "來源：器材借還掃描"],
        });
        throw new TRPCError({ code: "BAD_REQUEST", message: "使用者 QR Code 無效、已過期或疑似遭竄改，請使用者重新開啟個人設定頁" });
      }
      const borrower = await getUserById(claims.userId);
      if (!borrower || !borrower.isActive) throw new TRPCError({ code: "NOT_FOUND", message: "此使用者帳號不存在或已停用" });
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "verifyDynamicBorrowerQr", "userQrCode", borrower.id, borrower.username || `使用者 #${borrower.id}`, { source: "equipmentBorrow" });
      return { userId: borrower.id };
    }),

  get: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => getEquipmentById(input.id)),

  getLocationHistory: staffProcedure
    .input(z.object({
      equipmentId: z.number(),
      changedById: z.number().optional(),
      changedAtFrom: z.date().optional(),
      changedAtTo: z.date().optional(),
    }).refine(
      (input) => !input.changedAtFrom || !input.changedAtTo || input.changedAtFrom <= input.changedAtTo,
      { message: "開始日期不可晚於結束日期", path: ["changedAtTo"] }
    ))
    .query(async ({ input }) => {
      const item = await getEquipmentById(input.equipmentId);
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "器材不存在" });
      return getEquipmentLocationHistory(input.equipmentId, {
        changedById: input.changedById,
        changedAtFrom: input.changedAtFrom,
        changedAtTo: input.changedAtTo,
      });
    }),

  reviewLocationHistory: adminProcedure
    .input(z.object({
      historyId: z.number().int().positive(),
      reviewStatus: z.enum(["approved", "rejected"]),
      reviewNote: z.string().trim().max(1_000).optional(),
    }).superRefine((input, ctx) => {
      if (input.reviewStatus === "rejected" && !input.reviewNote) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["reviewNote"], message: "退回異動時必須填寫覆核意見" });
      }
    }))
    .mutation(async ({ ctx, input }) => {
      const entry = await getEquipmentLocationHistoryEntryById(input.historyId);
      if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "找不到指定的異動紀錄" });
      if (entry.signatureStatus === "signed") throw new TRPCError({ code: "CONFLICT", message: "此異動紀錄已完成電子簽核，不可再變更覆核結果" });
      const item = await getEquipmentById(entry.equipmentId);
      await reviewEquipmentLocationHistoryEntry({ id: entry.id, reviewStatus: input.reviewStatus, reviewNote: input.reviewNote || null, reviewedById: ctx.user.id });
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "reviewEquipmentLocationHistory", "equipmentLocationHistory", entry.id, item?.name || `器材 #${entry.equipmentId}`, { reviewStatus: input.reviewStatus, reviewNote: input.reviewNote || null, previousLocation: entry.previousLocation, newLocation: entry.newLocation, changedById: entry.changedById });
      return { success: true as const };
    }),

  batchReviewLocationHistory: adminProcedure
    .input(z.object({
      historyIds: z.array(z.number().int().positive()).min(2, "請至少選取兩筆異動紀錄").max(100, "一次最多覆核 100 筆異動紀錄"),
      reviewStatus: z.enum(["approved", "rejected"]),
      reviewNote: z.string().trim().max(1_000).optional(),
    }).superRefine((input, ctx) => {
      if (new Set(input.historyIds).size !== input.historyIds.length) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["historyIds"], message: "批次覆核清單不可包含重複紀錄" });
      }
      if (input.reviewStatus === "rejected" && !input.reviewNote) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["reviewNote"], message: "退回異動時必須填寫覆核意見" });
      }
    }))
    .mutation(async ({ ctx, input }) => {
      const entries = await Promise.all(input.historyIds.map((id) => getEquipmentLocationHistoryEntryById(id)));
      const missingId = input.historyIds.find((_id, index) => !entries[index]);
      if (missingId) throw new TRPCError({ code: "NOT_FOUND", message: `找不到異動紀錄 #${missingId}` });
      const signedEntry = entries.find((entry) => entry?.signatureStatus === "signed");
      if (signedEntry) throw new TRPCError({ code: "CONFLICT", message: `異動紀錄 #${signedEntry.id} 已完成電子簽核，不可再變更覆核結果` });

      const items = await Promise.all(entries.map((entry) => getEquipmentById(entry!.equipmentId)));
      for (let index = 0; index < entries.length; index += 1) {
        const historyEntry = entries[index]!;
        const item = items[index];
        await reviewEquipmentLocationHistoryEntry({ id: historyEntry.id, reviewStatus: input.reviewStatus, reviewNote: input.reviewNote || null, reviewedById: ctx.user.id });
        await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "batchReviewEquipmentLocationHistory", "equipmentLocationHistory", historyEntry.id, item?.name || `器材 #${historyEntry.equipmentId}`, {
          reviewStatus: input.reviewStatus,
          reviewNote: input.reviewNote || null,
          previousLocation: historyEntry.previousLocation,
          newLocation: historyEntry.newLocation,
          changedById: historyEntry.changedById,
          batchSize: entries.length,
          batchHistoryIds: input.historyIds,
        });
      }
      return { success: true as const, reviewedCount: entries.length };
    }),

  signLocationHistory: adminProcedure
    .input(z.object({ historyId: z.number().int().positive(), confirmation: z.string().trim().min(1, "請輸入目前登入的帳號名稱").max(128) }))
    .mutation(async ({ ctx, input }) => {
      const signingAccountName = (ctx.user.username || ctx.user.openId || "").trim();
      if (!signingAccountName || input.confirmation !== signingAccountName) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "請輸入目前登入的帳號名稱以確認電子簽核" });
      }
      const entry = await getEquipmentLocationHistoryEntryById(input.historyId);
      if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "找不到指定的異動紀錄" });
      if (entry.reviewStatus !== "approved") throw new TRPCError({ code: "CONFLICT", message: "僅已通過覆核的異動紀錄可以電子簽核" });
      if (entry.signatureStatus === "signed") throw new TRPCError({ code: "CONFLICT", message: "此異動紀錄已完成電子簽核" });
      const item = await getEquipmentById(entry.equipmentId);
      await signEquipmentLocationHistoryEntry({ id: entry.id, signedById: ctx.user.id });
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "signEquipmentLocationHistory", "equipmentLocationHistory", entry.id, item?.name || `器材 #${entry.equipmentId}`, { confirmation: input.confirmation, reviewStatus: entry.reviewStatus, previousLocation: entry.previousLocation, newLocation: entry.newLocation, changedById: entry.changedById, signatureMethod: "authenticated-session-confirmed" });
      return { success: true as const };
    }),

  getLocationHistoryOperators: staffProcedure
    .input(z.object({ equipmentId: z.number() }))
    .query(async ({ input }) => {
      const item = await getEquipmentById(input.equipmentId);
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "器材不存在" });
      return getEquipmentLocationHistoryOperators(input.equipmentId);
    }),

  getMonthlyLocationAuditSummary: staffProcedure
    .input(z.object({
      month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "月份格式需為 YYYY-MM"),
      equipmentId: z.number().int().positive().optional(),
      location: z.string().trim().min(1).max(256).optional(),
    }))
    .query(({ input }) => getMonthlyLocationAuditSummary(input)),

  recordQrPrint: protectedProcedure
    .input(z.object({
      equipmentIds: z.array(z.number().int().positive()).min(1).max(300),
      locationFilter: z.string().trim().max(256).optional(),
      labelPaperSize: z.enum(["a4-3x2", "a4-2x2", "a4-4x3", "thermal-100x150", "label-62x29", "label-50x30"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const uniqueEquipmentIds = Array.from(new Set(input.equipmentIds));
      const selectedEquipment = (await getAllEquipment()).filter((item) => uniqueEquipmentIds.includes(item.id) && Boolean(item.qrCodeId));
      if (selectedEquipment.length !== uniqueEquipmentIds.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "列印清單含有不存在或尚未建立 QR Code 的器材" });
      }

      await createQrPrintHistory({
        printedById: ctx.user.id,
        equipmentIds: JSON.stringify(uniqueEquipmentIds),
        equipmentCount: uniqueEquipmentIds.length,
        locationFilter: input.locationFilter || null,
        labelPaperSize: input.labelPaperSize,
      });
      await logOperation(
        ctx.user.id,
        ctx.user.username || ctx.user.openId || "unknown",
        "printQrCode",
        "equipmentQrCode",
        undefined,
        "器材 QR Code 批次列印",
        { equipmentIds: uniqueEquipmentIds, equipmentCount: uniqueEquipmentIds.length, locationFilter: input.locationFilter || null, labelPaperSize: input.labelPaperSize }
      );
      return { success: true, equipmentCount: uniqueEquipmentIds.length };
    }),

  getQrPrintHistory: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).optional() }).optional())
    .query(({ ctx, input }) => getQrPrintHistory({
      printedById: ctx.user.role === "student" ? ctx.user.id : undefined,
      limit: input?.limit ?? 30,
    })),

  categories: publicProcedure.query(() => getAllCategories()),

  categoryManagementList: staffProcedure.query(async ({ ctx }) => {
    const categories = await getEquipmentCategoriesWithUsage();
    await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "viewEquipmentCategories", "auditView", undefined, "器材分類管理清單", { resultCount: categories.length });
    return categories;
  }),

  createCategory: staffProcedure
    .input(z.object({ name: z.string().min(1), description: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      await createCategory(input);
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "createEquipmentCategory", "equipmentCategory", undefined, input.name, { description: input.description?.trim() || null });
      return { success: true };
    }),

  updateCategory: staffProcedure
    .input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(1).max(128), description: z.string().trim().max(2_000).optional() }))
    .mutation(async ({ ctx, input }) => {
      const before = await getEquipmentCategoryDeletionPreview(input.id);
      if (!before) throw new TRPCError({ code: "NOT_FOUND", message: "器材分類不存在或已被刪除" });
      try {
        await updateEquipmentCategory(input.id, { name: input.name, description: input.description });
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        if (code === "CATEGORY_NOT_FOUND") throw new TRPCError({ code: "NOT_FOUND", message: "器材分類不存在或已被刪除" });
        if (code === "CATEGORY_NAME_CONFLICT") throw new TRPCError({ code: "CONFLICT", message: "已有相同名稱的器材分類，請使用其他名稱" });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "無法更新器材分類，請稍後再試" });
      }
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "updateEquipmentCategory", "equipmentCategory", input.id, input.name, {
        before: { name: before.target.name, description: before.target.description },
        after: { name: input.name, description: input.description?.trim() || null },
      });
      return { success: true };
    }),

  batchReassignCategory: staffProcedure
    .input(z.object({ equipmentIds: z.array(z.number().int().positive()).min(1).max(100), categoryId: z.number().int().positive().nullable() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const changed = await reassignEquipmentCategories(input.equipmentIds, input.categoryId);
        const categories = input.categoryId === null ? [] : await getAllCategories();
        const destinationName = input.categoryId === null ? "未分類" : categories.find((category) => category.id === input.categoryId)?.name || `分類 #${input.categoryId}`;
        await Promise.all(changed.map((item) => logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "reassignEquipmentCategory", "equipment", item.id, item.name, {
          previousCategoryId: item.previousCategoryId,
          categoryId: item.categoryId,
          destinationName,
          batchEquipmentIds: input.equipmentIds,
        })));
        await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "batchReassignEquipmentCategory", "equipmentBatch", undefined, `批次重新分類為${destinationName}`, {
          requestedEquipmentIds: Array.from(new Set(input.equipmentIds)),
          changedEquipmentIds: changed.map((item) => item.id),
          categoryId: input.categoryId,
          destinationName,
        });
        return { success: true, changedCount: changed.length, destinationName };
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        if (code === "TARGET_CATEGORY_NOT_FOUND") throw new TRPCError({ code: "NOT_FOUND", message: "目標器材分類不存在或已被刪除" });
        if (code === "EQUIPMENT_NOT_FOUND") throw new TRPCError({ code: "NOT_FOUND", message: "選取的器材不存在或已被刪除，系統未進行任何變更" });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "批次重新分類失敗，系統未進行任何變更；請稍後再試" });
      }
    }),

  categoryDeletePreview: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const preview = await getEquipmentCategoryDeletionPreview(input.id);
      if (!preview) throw new TRPCError({ code: "NOT_FOUND", message: "器材分類不存在或已被刪除" });
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "previewEquipmentCategoryDeletion", "auditView", preview.target.id, preview.target.name, { canDelete: preview.canDelete, dependentRecordCount: preview.dependentRecordCount, assignedEquipmentIds: preview.assignedEquipment.map((item) => item.id) });
      return preview;
    }),

  deleteCategory: adminProcedure
    .input(z.object({ id: z.number().int().positive(), confirmed: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      const preview = await getEquipmentCategoryDeletionPreview(input.id);
      if (!preview) throw new TRPCError({ code: "NOT_FOUND", message: "器材分類不存在或已被刪除" });
      if (!preview.canDelete) throw new TRPCError({ code: "CONFLICT", message: preview.blockingReasons[0] || "此分類仍有器材使用，無法刪除" });
      try {
        await deleteCategory(input.id);
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        if (code === "CATEGORY_NOT_FOUND") throw new TRPCError({ code: "NOT_FOUND", message: "器材分類不存在或已被刪除" });
        if (code === "CATEGORY_IN_USE") throw new TRPCError({ code: "CONFLICT", message: "此分類仍有器材使用，請先重新分類後再刪除" });
        throw new TRPCError({ code: "CONFLICT", message: "分類目前無法安全刪除，系統未執行任何變更；請稍後再試" });
      }
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "deleteEquipmentCategory", "equipmentCategory", input.id, preview.target.name, { dependentRecordCount: 0 });
      return { success: true };
    }),

  create: staffProcedure
    .input(
      z.object({
        name: z.string().min(1),
        categoryId: z.number().int().positive(),
        description: z.string().optional(),
        totalQuantity: z.number().min(1).default(1),
        availableQuantity: z.number().min(0),
        status: z.enum(["available", "maintenance", "retired"]),
        imageUrl: z.string().optional(),
        serialNumber: z.string().optional(),
        scanIdSuffix: z.string().trim().max(64).regex(/^[A-Za-z0-9_-]*$/, "ID 後段僅可使用英文字母、數字、底線或連字號").optional(),
        location: z.string().trim().min(1),
      }).refine((input) => input.availableQuantity <= input.totalQuantity, {
        message: "可借數量不可超過總數量",
        path: ["availableQuantity"],
      })
    )
    .mutation(async ({ ctx, input }) => {
      let qrCodeId: string;
      try {
        qrCodeId = await generateUniqueQrCodeId(input.scanIdSuffix);
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        if (code === "INVALID_QR_CODE_ID_SUFFIX") throw new TRPCError({ code: "BAD_REQUEST", message: "ID 後段格式不正確，且不可重複輸入 QSSHMST 前綴" });
        if (code === "DUPLICATE_QR_CODE_ID") throw new TRPCError({ code: "CONFLICT", message: "此 ID 已被使用，請修改後段後再試" });
        throw error;
      }
      const location = normalizeLocation(input.location);
      const { scanIdSuffix: _scanIdSuffix, ...equipmentInput } = input;
      const id = await createEquipment({
        ...equipmentInput,
        location,
        availableQuantity: input.availableQuantity,
        qrCodeId,
      });
      if (location) {
        await createEquipmentLocationHistoryEntry({
          equipmentId: id,
          previousLocation: null,
          newLocation: location,
          changedById: ctx.user.id,
          note: "建立器材時設定存放位置",
        });
      }
      await logOperation(
        ctx.user.id,
        ctx.user.username || ctx.user.openId || "unknown",
        "create",
        "equipment",
        id,
        input.name,
        { categoryId: input.categoryId, totalQuantity: input.totalQuantity, qrCodeId }
      );
      return { success: true, id, qrCodeId };
    }),

  update: staffProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        categoryId: z.number().int().positive(),
        description: z.string().optional().nullable(),
        totalQuantity: z.number().min(1).optional(),
        availableQuantity: z.number().int().min(0),
        status: z.enum(["available", "borrowed", "maintenance", "retired"]),
        imageUrl: z.string().optional().nullable(),
        serialNumber: z.string().optional().nullable(),
        location: z.string().trim().min(1, "請填寫存放位置"),
        locationNote: z.string().trim().max(500).optional(),
        scanIdSuffix: z.string().optional().refine((value) => value === undefined, "ID 僅供預覽，無法修改"),
      }).superRefine((input, ctx) => {
        if (input.totalQuantity !== undefined && input.availableQuantity > input.totalQuantity) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "可借數量不可超過總數量", path: ["availableQuantity"] });
        }
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, locationNote, scanIdSuffix: _scanIdSuffix, ...data } = input;
      const eq = await getEquipmentById(id);
      if (!eq) throw new TRPCError({ code: "NOT_FOUND", message: "器材不存在" });

      const nextLocation = normalizeLocation(data.location);
      const previousLocation = normalizeLocation(eq.location);
      const updatedData = { ...data, location: nextLocation };
      if (previousLocation !== nextLocation && !locationNote?.trim()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "請填寫移轉原因／自訂備註" });
      }
      await updateEquipment(id, updatedData as any);
      if (previousLocation !== nextLocation) {
        await createEquipmentLocationHistoryEntry({
          equipmentId: id,
          previousLocation,
          newLocation: nextLocation,
          changedById: ctx.user.id,
          note: locationNote || "更新器材存放位置",
        });
        const movementMonth = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit" }).format(new Date());
        const movementCount = await getMonthlyEquipmentLocationMovementCount(id, movementMonth);
        if (movementCount >= LOCATION_MOVEMENT_ALERT_THRESHOLD) {
          const alertId = await createEquipmentLocationMovementAlert({ equipmentId: id, month: movementMonth, thresholdCount: LOCATION_MOVEMENT_ALERT_THRESHOLD, actualCount: movementCount, triggeredById: ctx.user.id });
          if (alertId) {
            const title = `器材位置異動異常：${eq.name}`;
            const details = [`器材：${eq.name}（#${id}）`, `月份：${movementMonth}`, `本月異動：${movementCount} 次`, `異常門檻：${LOCATION_MOVEMENT_ALERT_THRESHOLD} 次`, `最新位置：${nextLocation || "未設定"}`];
            try {
              await notifyOwner({ title, content: details.join("\n") });
              const result = await sendSystemAlertEmail({ eventKey: `location-movement:${id}:${movementMonth}`, source: "器材位置異動監測", title, summary: `${eq.name} 本月位置異動已達 ${movementCount} 次`, details, kind: "alert" });
              const status = result.sent > 0 ? "sent" : result.failed > 0 ? "failed" : "suppressed";
              await updateEquipmentLocationMovementAlertNotification({ id: alertId, status, error: result.failed > 0 ? "部分或全部管理員警示郵件寄送失敗" : null });
            } catch (error) {
              await updateEquipmentLocationMovementAlertNotification({ id: alertId, status: "failed", error: error instanceof Error ? error.message : String(error) });
            }
          }
        }
      }
      await logOperation(
        ctx.user.id,
        ctx.user.username || ctx.user.openId || "unknown",
        "update",
        "equipment",
        id,
        eq?.name || "unknown",
        updatedData
      );
      return { success: true };
    }),

  borrow: staffProcedure
    .input(
      z.object({
        equipmentId: z.number(),
        userId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await borrowEquipment(input.equipmentId, input.userId);
      await logOperation(
        ctx.user.id,
        ctx.user.username || ctx.user.openId || "unknown",
        "borrow",
        "equipment",
        input.equipmentId,
        "unknown", // Equipment name will be fetched inside borrowEquipment
        { userId: input.userId }
      );
      return { success: true };
    }),

  return: staffProcedure
    .input(
      z.object({
        equipmentId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await returnEquipment(input.equipmentId);
      await logOperation(
        ctx.user.id,
        ctx.user.username || ctx.user.openId || "unknown",
        "return",
        "equipment",
        input.equipmentId,
        "unknown", // Equipment name will be fetched inside returnEquipment
        {}
      );
      return { success: true };
    }),

  deletePreview: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const preview = await getEquipmentDeletionPreview(input.id);
      if (!preview) throw new TRPCError({ code: "NOT_FOUND", message: "器材不存在或已被刪除" });
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "previewEquipmentDeletion", "auditView", preview.target.id, preview.target.name, { canDelete: preview.canDelete, dependentRecordCount: preview.dependentRecordCount, dependencyTypes: preview.dependencies.map((entry) => entry.key) });
      return preview;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number(), confirmed: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      const eq = await getEquipmentById(input.id);
      if (!eq) throw new TRPCError({ code: "NOT_FOUND", message: "器材不存在或已被刪除" });
      try {
        await deleteEquipment(input.id, ctx.user.id);
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        console.error("[EquipmentDelete] Transaction failed", { equipmentId: input.id, code });
        if (code === "EQUIPMENT_HAS_ACTIVE_BORROW") throw new TRPCError({ code: "CONFLICT", message: "此器材仍有借出中或逾期記錄，請先完成歸還後再刪除" });
        throw new TRPCError({ code: "CONFLICT", message: "器材目前無法安全標示為已刪除，系統未變更任何資料；請稍後再試或聯絡系統管理員" });
      }
      await logOperation(
        ctx.user.id,
        ctx.user.username || ctx.user.openId || "unknown",
        "delete",
        "equipment",
        input.id,
        eq?.name || "unknown",
        { deletionMode: "soft", historyRetained: true }
      );
      return { success: true };
    }),
});

// ─── Borrow Requests Router ───────────────────────────────────────────────────

const borrowRequestsRouter = router({
  list: staffProcedure
    .input(z.object({ status: z.string().optional(), equipmentId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const requests = await getBorrowRequests(input);
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "viewBorrowRequests", "auditView", undefined, "借用申請管理清單", { status: input?.status ?? null, equipmentId: input?.equipmentId ?? null, resultCount: requests.length });
      return requests;
    }),

  myList: protectedProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(({ ctx, input }) => getBorrowRequests({ requesterId: ctx.user.id, status: input?.status })),

  create: protectedProcedure
    .input(
      z.object({
        equipmentId: z.number(),
        quantity: z.number().min(1).default(1),
        borrowDate: z.date(),
        returnDate: z.date(),
        purpose: z.string().trim().min(1, "請填寫借用用途"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const eq = await getEquipmentById(input.equipmentId);
      if (!eq) throw new TRPCError({ code: "NOT_FOUND", message: "器材不存在" });
      if (eq.availableQuantity < input.quantity)
        throw new TRPCError({ code: "BAD_REQUEST", message: "可借數量不足" });
      const id = await createBorrowRequest({ ...input, requesterId: ctx.user.id });
      
      // 記錄操作日誌
      await logOperation(
        ctx.user.id,
        ctx.user.username || ctx.user.openId || "unknown",
        "create",
        "borrowRequest",
        id,
        eq.name,
        { quantity: input.quantity, borrowDate: input.borrowDate, returnDate: input.returnDate }
      );
      
      return { success: true, id };
    }),

  review: staffProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["approved", "rejected"]),
        reviewNote: z.string().trim().optional(),
      }).superRefine((input, ctx) => {
        if (input.status === "rejected" && !input.reviewNote) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "請填寫拒絕原因", path: ["reviewNote"] });
        }
      })
    )
    .mutation(async ({ ctx, input }) => {
      const req = await getBorrowRequestById(input.id);
      if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "申請不存在" });
      if (req.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "申請已被處理" });

      await reviewBorrowRequest(input.id, ctx.user.id, input.status, input.reviewNote);

      // 記錄操作日誌
      const eqItem = await getEquipmentById(req.equipmentId);
      await logOperation(
        ctx.user.id,
        ctx.user.username || ctx.user.openId || "unknown",
        input.status === "approved" ? "approve" : "reject",
        "borrowRequest",
        input.id,
        eqItem?.name || "unknown",
        { status: input.status, reviewNote: input.reviewNote }
      );

      if (input.status === "approved") {
        await createBorrowRecord({
          requestId: input.id,
          equipmentId: req.equipmentId,
          borrowerId: req.requesterId,
          quantity: req.quantity,
          borrowedAt: req.borrowDate,
          expectedReturnAt: req.returnDate,
          status: "active",
        });
        const eqItem2 = await getEquipmentById(req.equipmentId);
        if (eqItem2) {
          await updateEquipment(req.equipmentId, {
            availableQuantity: Math.max(0, eqItem2.availableQuantity - req.quantity),
          });
        }
      }
      return { success: true };
    }),

  founderUpdate: founderProcedure
    .input(z.object({
      id: z.number(),
      quantity: z.number({ error: "請選擇申請數量" }).int().min(1, "請選擇申請數量"),
      borrowDate: z.date({ error: "請填寫借用時間" }),
      returnDate: z.date({ error: "請填寫歸還時間" }),
      purpose: z.string({ error: "請填寫用途" }).trim().min(1, "請填寫用途").max(1000),
      reason: z.string().trim().max(300).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const normalizedBorrowDate = normalizeTaipeiDateBoundary(input.borrowDate, "start");
      const normalizedReturnDate = normalizeTaipeiDateBoundary(input.returnDate, "end");
      if (normalizedReturnDate.getTime() <= normalizedBorrowDate.getTime()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "歸還時間必須晚於借用時間" });
      }
      const request = await getBorrowRequestById(input.id);
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "申請不存在" });

      let result: { synchronizedBorrowRecord: boolean };
      try {
        result = await updateBorrowRequestByFounder(input.id, { ...input, borrowDate: normalizedBorrowDate, returnDate: normalizedReturnDate });
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        if (code === "RETURNED_BORROW_RECORD_IMMUTABLE") throw new TRPCError({ code: "BAD_REQUEST", message: "已歸還的借用記錄不可再修改申請內容" });
        if (code === "INSUFFICIENT_AVAILABLE_QUANTITY") throw new TRPCError({ code: "BAD_REQUEST", message: "可借數量不足，無法提高申請數量" });
        if (code === "EQUIPMENT_NOT_FOUND") throw new TRPCError({ code: "NOT_FOUND", message: "器材不存在" });
        throw error;
      }

      const equipmentItem = await getEquipmentById(request.equipmentId);
      await logOperation(
        ctx.user.id,
        ctx.user.username || ctx.user.openId || "unknown",
        "founderUpdateBorrowRequest",
        "borrowRequest",
        input.id,
        equipmentItem?.name || `borrow_request_${input.id}`,
        {
          reason: input.reason || null,
          status: request.status,
          before: { quantity: request.quantity, borrowDate: request.borrowDate, returnDate: request.returnDate, purpose: request.purpose },
          after: { quantity: input.quantity, borrowDate: normalizedBorrowDate, returnDate: normalizedReturnDate, purpose: input.purpose.trim() || null },
          synchronizedBorrowRecord: result.synchronizedBorrowRecord,
        }
      );
      return { success: true, synchronizedBorrowRecord: result.synchronizedBorrowRecord };
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const req = await getBorrowRequestById(input.id);
      if (!req) throw new TRPCError({ code: "NOT_FOUND" });
      if (req.requesterId !== ctx.user.id && ctx.user.role === "student")
        throw new TRPCError({ code: "FORBIDDEN" });
      await cancelBorrowRequest(input.id);
      
      // 記錄操作日誌
      const eqItem = await getEquipmentById(req.equipmentId);
      await logOperation(
        ctx.user.id,
        ctx.user.username || ctx.user.openId || "unknown",
        "cancel",
        "borrowRequest",
        input.id,
        eqItem?.name || "unknown",
        {}
      );
      
      return { success: true };
    }),
});

// ─── Borrow Records Router ────────────────────────────────────────────────────

const borrowRecordsRouter = router({
  list: staffProcedure
    .input(z.object({ status: z.string().optional(), equipmentId: z.number().optional() }).optional())
    .query(({ input }) => getBorrowRecords(input)),

  myList: protectedProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(({ ctx, input }) => getBorrowRecords({ borrowerId: ctx.user.id, status: input?.status })),

  unreadReminders: protectedProcedure.query(({ ctx }) => getUnreadBorrowReturnReminders(ctx.user.id)),

  markRemindersRead: protectedProcedure
    .input(z.object({ ids: z.array(z.number().int().positive()).min(1).max(50) }))
    .mutation(async ({ ctx, input }) => {
      await markBorrowReturnRemindersRead(input.ids, ctx.user.id);
      await logOperation(
        ctx.user.id,
        ctx.user.username || ctx.user.openId || "unknown",
        "acknowledgeBorrowReminder",
        "borrowReturnReminder",
        undefined,
        "器材歸還提醒",
        { reminderIds: input.ids }
      );
      return { success: true };
    }),

  reminderSchedule: adminProcedure.query(() => getOverdueBorrowReminderSchedule()),

  reminderHistory: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(300).optional() }).optional())
    .query(({ input }) => getBorrowReturnReminderHistory(input?.limit ?? 100)),

  resendReminder: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const reminder = await getBorrowReturnReminderById(input.id);
      if (!reminder) throw new TRPCError({ code: "NOT_FOUND", message: "找不到提醒紀錄" });
      if (reminder.borrowStatus === "returned") throw new TRPCError({ code: "BAD_REQUEST", message: "器材已歸還，無須重送提醒" });
      if (!reminder.borrowerEmail) throw new TRPCError({ code: "BAD_REQUEST", message: "借用人尚未設定可用電子郵件" });
      try {
        const { sendBorrowReturnReminder } = await import("./borrowReturnReminderEmail");
        await sendBorrowReturnReminder({
          to: reminder.borrowerEmail,
          borrowerLabel: reminder.borrowerName || reminder.borrowerUsername || `使用者 #${reminder.borrowerId}`,
          equipmentName: reminder.equipmentName || "未命名器材",
          expectedReturnAt: reminder.expectedReturnAt,
          reminderType: reminder.reminderType,
          dashboardUrl: `${getRequestAssetBaseUrl(ctx.req)}/dashboard`,
        });
        await markBorrowReturnReminderResent({ id: reminder.id, resentById: ctx.user.id, status: "sent" });
      } catch (error) {
        await markBorrowReturnReminderResent({ id: reminder.id, resentById: ctx.user.id, status: "failed", error: error instanceof Error ? error.message : String(error) });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "提醒重送失敗，請稍後再試" });
      }
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "resendBorrowReturnReminder", "borrowReturnReminder", reminder.id, reminder.equipmentName || "器材歸還提醒", { borrowRecordId: reminder.borrowRecordId, reminderType: reminder.reminderType, resendCount: reminder.resendCount + 1 });
      return { success: true as const };
    }),

  return: staffProcedure
    .input(z.object({ id: z.number(), returnNote: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const records = await getBorrowRecords();
      const record = records.find((r: any) => r.id === input.id);
      if (!record) throw new TRPCError({ code: "NOT_FOUND" });

      await returnBorrowRecord(input.id, ctx.user.id, input.returnNote);

      // 記錄操作日誌
      const eqItem = await getEquipmentById(record.equipmentId);
      await logOperation(
        ctx.user.id,
        ctx.user.username || ctx.user.openId || "unknown",
        "return",
        "borrowRecord",
        input.id,
        eqItem?.name || "unknown",
        { returnNote: input.returnNote }
      );

      if (eqItem) {
        await updateEquipment(record.equipmentId, {
          availableQuantity: Math.min(eqItem.totalQuantity, eqItem.availableQuantity + record.quantity),
        });
      }
      return { success: true };
    }),

  syncOverdue: staffProcedure.mutation(async () => {
    await updateOverdueRecords();
    return { success: true };
  }),
});

// ─── Dashboard Router ─────────────────────────────────────────────────────────

const dashboardRouter = router({
  stats: protectedProcedure.query(async ({ ctx }) => {
    await updateOverdueRecords();
    const stats = await getDashboardStats();
    if (ctx.user.role === "student") {
      const myRequests = await getBorrowRequests({ requesterId: ctx.user.id });
      const myRecords = await getBorrowRecords({ borrowerId: ctx.user.id });
      return {
        ...stats,
        myPending: myRequests.filter((r: any) => r.status === "pending").length,
        myActive: myRecords.filter((r: any) => r.status === "active").length,
        myOverdue: myRecords.filter((r: any) => r.status === "overdue").length,
      };
    }
    return stats;
  }),

  loginActivity: adminProcedure
    .input(z.object({ period: z.enum(["24h", "7d", "30d"]) }))
    .query(({ input }) => getLoginActivityAnalytics(input.period)),
  operationalAlerts: adminProcedure.query(() => getDashboardOperationalAlertSummary()),
  weeklyIdleTimeoutSecurity: adminProcedure.query(() => getWeeklyIdleTimeoutSecuritySummary()),
  unverifiedEmailUsers: adminProcedure.query(() => getUsersWithUnverifiedEmails()),
  deduplicationEmailSummary: adminProcedure.query(() => getTodayAccountDeduplicationEmailSummary()),
  monthlyReimbursementSummary: staffProcedure
    .input(z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "月份格式必須為 YYYY-MM") }).optional())
    .query(({ input }) => {
      const month = input?.month ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit" }).format(new Date());
      return getMonthlyReimbursementCategorySummary(month);
    }),
  reimbursementMonthlyTrend: staffProcedure
    .input(z.object({ months: z.array(z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "月份格式必須為 YYYY-MM")).min(2).max(24) }))
    .query(({ input }) => getReimbursementMonthlyTrend(input.months)),
  annualReimbursementBudgetComparison: staffProcedure
    .input(z.object({ year: z.number().int().min(2020).max(2100) }).optional())
    .query(({ input }) => getReimbursementAnnualBudgetComparison(input?.year ?? Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric" }).format(new Date())))),
  saveAnnualReimbursementBudget: adminProcedure
    .input(z.object({ year: z.number().int().min(2020).max(2100), amount: z.number().finite().min(0).max(99_999_999) }))
    .mutation(async ({ ctx, input }) => {
      await upsertReimbursementAnnualBudget({ year: input.year, amount: input.amount.toFixed(2), setById: ctx.user.id });
      const comparison = await getReimbursementAnnualBudgetComparison(input.year);
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "saveAnnualReimbursementBudget", "reimbursementAnnualBudget", undefined, `${input.year} 年度報帳預算`, { year: input.year, amount: input.amount.toFixed(2), actualAmount: comparison.actualAmount });
      return comparison;
    }),
  exportMonthlyReimbursementSummaryCsv: staffProcedure
    .input(z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "月份格式必須為 YYYY-MM") }))
    .mutation(async ({ ctx, input }) => {
      const summary = await getMonthlyReimbursementCategorySummary(input.month);
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "exportMonthlyReimbursementSummaryCsv", "reimbursementSummary", undefined, `${input.month} 報帳分類支出統計 CSV`, { month: input.month, totalAmount: summary.totalAmount, claimCount: summary.claimCount, categoryCount: summary.categories.length });
      return summary;
    }),
  exportMultiMonthReimbursementSummaryCsv: staffProcedure
    .input(z.object({ months: z.array(z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "月份格式必須為 YYYY-MM")).min(2).max(24) }))
    .mutation(async ({ ctx, input }) => {
      const months = Array.from(new Set(input.months)).sort();
      const summaries = await Promise.all(months.map((month) => getMonthlyReimbursementCategorySummary(month)));
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "exportMultiMonthReimbursementSummaryCsv", "reimbursementSummary", undefined, `${months[0]} 至 ${months[months.length - 1]} 報帳分類支出統計 CSV`, { months, monthCount: months.length, totalAmount: summaries.reduce((total, summary) => total + summary.totalAmount, 0), totalClaimCount: summaries.reduce((total, summary) => total + summary.claimCount, 0), categoryCount: summaries.reduce((total, summary) => total + summary.categories.length, 0) });
      return { months, summaries };
    }),
  exportReimbursementAnalysisPdf: staffProcedure
    .input(z.object({ year: z.number().int().min(2020).max(2100), startMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), endMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) }))
    .mutation(async ({ ctx, input }) => {
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "exportReimbursementAnalysisPdf", "reimbursementSummary", undefined, `${input.year} 年度報帳分析 PDF`, input);
      return { success: true as const };
    }),
});

// ─── Custom Auth Router ────────────────────────────────────────────────────────

const LOGIN_DEVICE_COOKIE_NAME = "qingshuiLoginDeviceId";
const TWO_FACTOR_CHALLENGE_MAX_ATTEMPTS = 5;
const PASSKEY_RP_NAME = "清水高中媒體服務隊管理系統";

const webauthnResponseSchema = z.object({
  id: z.string().min(1).max(512),
  rawId: z.string().min(1).max(512),
  type: z.literal("public-key"),
  response: z.object({ clientDataJSON: z.string().min(1) }).passthrough(),
}).passthrough();

function getWebAuthnChallenge(response: { response: { clientDataJSON: string } }) {
  try {
    const clientData = JSON.parse(Buffer.from(response.response.clientDataJSON, "base64url").toString("utf8"));
    return typeof clientData.challenge === "string" ? clientData.challenge : null;
  } catch {
    return null;
  }
}

function getPasskeyOrigin(ctx: { req: { headers: Record<string, unknown>; protocol?: string } }) {
  try {
    return getPasskeyRelyingParty({ headers: ctx.req.headers, protocol: ctx.req.protocol });
  } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: "此網站網域目前不支援通行密鑰，請使用正式網站重新嘗試" });
  }
}

function getClientIpAddress(ctx: { req: { headers: Record<string, unknown>; socket: { remoteAddress?: string } } }) {
  const forwarded = ctx.req.headers["x-forwarded-for"];
  return (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : undefined) || ctx.req.socket.remoteAddress || "unknown";
}

function getRequestCookie(cookieHeader: string | undefined, name: string) {
  const value = cookieHeader?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))?.[1];
  return value && /^[A-Za-z0-9_-]{20,128}$/.test(value) ? value : undefined;
}

async function sendSecurityAlert(input: { eventKey: string; title: string; summary: string; details: string[] }) {
  await Promise.allSettled([
    notifyOwner({ title: input.title, content: `${input.summary}\n${input.details.join("\n")}` }),
    sendSystemAlertEmail({ eventKey: input.eventKey, source: "帳號安全監測", title: input.title, summary: input.summary, details: input.details }),
  ]);
}

async function notifyPasskeyChange(input: {
  user: { id: number; username?: string | null; email?: string | null };
  action: "added" | "removed";
  passkeyName: string;
  registeredDeviceLabel?: string | null;
  ipAddress?: string;
  deviceSummary?: string;
  occurredAt?: Date;
}) {
  const email = input.user.email?.trim().toLowerCase();
  if (!email) return "email_unavailable" as const;
  const verification = await getLatestEmailVerification(input.user.id, email);
  if (!verification?.isVerified) return "email_unverified" as const;
  try {
    await sendPasskeySecurityEmail({
      to: email,
      username: input.user.username || `user_${input.user.id}`,
      action: input.action,
      passkeyName: input.passkeyName,
      registeredDeviceLabel: input.registeredDeviceLabel,
      ipAddress: input.ipAddress,
      deviceSummary: input.deviceSummary,
      occurredAt: input.occurredAt,
    });
    return "sent" as const;
  } catch (error) {
    console.error("[Passkey] Failed to send account security notification:", error);
    return "delivery_failed" as const;
  }
}

function requiresFounderPinSetup(user: { isFounder: boolean; founderPinSetupRequired: boolean; loginPinHash: string | null; auditPinHash: string | null }) {
  return user.isFounder && (user.founderPinSetupRequired || !user.loginPinHash || !user.auditPinHash);
}

async function createFounderPinSetupRequirement(userId: number) {
  const founderPinSetupToken = randomBytes(32).toString("base64url");
  const founderPinSetupExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await createFirstLoginSetupChallenge({ challengeToken: founderPinSetupToken, userId, expiresAt: founderPinSetupExpiresAt });
  return {
    success: false as const,
    requiresTwoFactor: false as const,
    requiresFounderPinSetup: true as const,
    founderPinSetupToken,
    founderPinSetupExpiresAt,
  };
}

async function completeCustomLogin(input: {
  user: NonNullable<Awaited<ReturnType<typeof getUserByUsername>>>;
  ctx: any;
  ipAddress: string;
  userAgent: string;
  loginMethod?: "password" | "passkey";
}) {
  const username = input.user.username ?? `user_${input.user.id}`;
  const loginMethod = input.loginMethod ?? "password";
  const maintenance = await getSystemMaintenanceSettings();
  const systemMode = resolveSystemMode(maintenance).systemMode;
  if (systemMode !== "online" && !input.user.isFounder) {
    const failureReason = systemMode === "maintenance"
      ? "系統維護模式：僅允許創始管理員登入"
      : "系統離線模式：僅允許創始管理員登入";
    const message = systemMode === "maintenance"
      ? "系統維護中，暫時僅允許創始管理員登入"
      : "系統離線中，暫時僅允許創始管理員登入";
    await createLoginAuditLog({
      username,
      userId: input.user.id,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      status: "failed",
      loginMethod,
      failureReason,
    });
    throw new TRPCError({ code: "FORBIDDEN", message });
  }
  if (input.user.isTemporaryPassword) {
    const firstLoginSetupToken = randomBytes(32).toString("base64url");
    const firstLoginSetupExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const passwordSetupMode = input.user.usernameLockedAt && input.user.username ? "password_reset" as const : "first_login" as const;
    await createFirstLoginSetupChallenge({ challengeToken: firstLoginSetupToken, userId: input.user.id, expiresAt: firstLoginSetupExpiresAt });
    await createLoginAuditLog({
      username,
      userId: input.user.id,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      status: "success",
      loginMethod,
      failureReason: passwordSetupMode === "password_reset" ? "密碼重設待完成新密碼設定，未簽發正式工作階段" : "首次登入待完成自訂帳號與密碼設定，未簽發正式工作階段",
    });
    return {
      success: false as const,
      requiresTwoFactor: false as const,
      requiresFirstLoginSetup: true as const,
      firstLoginSetupToken,
      firstLoginSetupExpiresAt,
      passwordSetupMode,
      user: { id: input.user.id, username: input.user.username, usernameLocked: Boolean(input.user.usernameLockedAt), name: input.user.name, role: input.user.role, isTemporaryPassword: true as const },
    };
  }
  const requestedDeviceId = getRequestCookie(input.ctx.req.headers.cookie, LOGIN_DEVICE_COOKIE_NAME);
  const existingDevice = requestedDeviceId ? await getLoginDeviceById(requestedDeviceId) : null;
  // 一個瀏覽器可依序登入不同帳號，但設備紀錄屬於單一帳號若沿用其他帳號
  // 的裝置 Cookie，authenticateRequest 會因 device.userId 不符而拒絕新工作階段
  const mayReuseDevice = Boolean(existingDevice && existingDevice.userId === input.user.id);
  const deviceId = mayReuseDevice && requestedDeviceId ? requestedDeviceId : randomBytes(32).toString("base64url");
  const activeDeviceCount = await countActiveLoginDevices(input.user.id);
  const isNewDevice = !mayReuseDevice;

  const deviceRecord = await recordLoginDevice({
    deviceId,
    userId: input.user.id,
    deviceName: describeLoginDevice(input.userAgent),
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });
  if (input.user.username) await upsertUser({ username: input.user.username, lastSignedIn: new Date() });
  await createLoginAuditLog({
    username,
    userId: input.user.id,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    status: "success",
    loginMethod,
  });

  const sessionToken = await sdk.createSessionToken(username, { name: input.user.name || input.user.realName || username, deviceId });
  const isNativeClient = String(input.ctx.req.headers["x-qssh-client-platform"] || "").toLowerCase() === "native";
  input.ctx.res.setHeader("Set-Cookie", [
    `${COOKIE_NAME}=${sessionToken}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=None`,
    `${LOGIN_DEVICE_COOKIE_NAME}=${deviceId}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=None`,
  ]);

  if (isNewDevice && activeDeviceCount > 0) {
    void sendSecurityAlert({
      eventKey: `new-login-device:${input.user.id}:${deviceId}`,
      title: "偵測到新的登入設備",
      summary: `${username} 使用新的設備登入系統`,
      details: [
        `帳號：${username}`,
        `IP：${input.ipAddress}`,
        `網路位置（IP 推估）：${deviceRecord?.location ? formatIpLocation(deviceRecord.location) : "位置暫時無法取得"}`,
        `資料來源：${deviceRecord?.location?.source === "ipwho.is" ? "公開 IP 地理位置資料（僅供安全判斷，可能不精確）" : "未使用外部位置資料"}`,
        `設備：${describeLoginDevice(input.userAgent)}`,
      ],
    });
  }

  return {
    success: true as const,
    requiresTwoFactor: false as const,
    user: {
      id: input.user.id,
      username: input.user.username,
      name: input.user.name,
      role: input.user.role,
      isTemporaryPassword: input.user.isTemporaryPassword,
    },
    ...(isNativeClient ? { mobileSessionToken: sessionToken } : {}),
  };
}

const customAuthRouter = router({
  completeFounderPinSetup: publicProcedure
    .input(z.object({
      challengeToken: z.string().min(20),
      loginPin: z.string().length(6, "登入 PIN 必須為 6 位數").regex(/^\d+$/, "登入 PIN 只能包含數字"),
      confirmLoginPin: z.string().length(6, "請再次輸入登入 PIN").regex(/^\d+$/, "登入 PIN 只能包含數字"),
      auditPin: z.string().length(6, "稽核認證 PIN 必須為 6 位數").regex(/^\d+$/, "稽核認證 PIN 只能包含數字"),
      confirmAuditPin: z.string().length(6, "請再次輸入稽核認證 PIN").regex(/^\d+$/, "稽核認證 PIN 只能包含數字"),
    }))
    .mutation(async ({ input, ctx }) => {
      const challenge = await getFirstLoginSetupChallenge(input.challengeToken);
      if (!challenge || challenge.expiresAt.getTime() <= Date.now()) {
        if (challenge) await deleteFirstLoginSetupChallenge(input.challengeToken);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "雙 PIN 初始設定已逾時，請重新登入" });
      }
      if (input.loginPin !== input.confirmLoginPin) throw new TRPCError({ code: "BAD_REQUEST", message: "兩次輸入的登入 PIN 不一致" });
      if (input.auditPin !== input.confirmAuditPin) throw new TRPCError({ code: "BAD_REQUEST", message: "兩次輸入的稽核認證 PIN 不一致" });
      if (input.loginPin === input.auditPin) throw new TRPCError({ code: "BAD_REQUEST", message: "登入 PIN 與稽核認證 PIN 必須使用不同組合" });

      const user = await getUserById(challenge.userId);
      if (!user?.isFounder || !user.isActive || !requiresFounderPinSetup(user)) {
        await deleteFirstLoginSetupChallenge(input.challengeToken);
        throw new TRPCError({ code: "FORBIDDEN", message: "雙 PIN 初始設定資格無效或已完成，請重新登入" });
      }

      const [loginPinHash, auditPinHash] = await Promise.all([bcrypt.hash(input.loginPin, 10), bcrypt.hash(input.auditPin, 10)]);
      const updated = await completeFounderPinSetupOnce({ userId: user.id, loginPinHash, auditPinHash });
      if (!updated) {
        await deleteFirstLoginSetupChallenge(input.challengeToken);
        throw new TRPCError({ code: "CONFLICT", message: "雙 PIN 已完成初始設定，無法再次變更" });
      }
      await Promise.all([resetLoginPinFailureAttempts(user.id), resetPinFailureAttempts(user.id), deleteFirstLoginSetupChallenge(input.challengeToken)]);
      const ipAddress = getClientIpAddress(ctx as any);
      const userAgent = ctx.req.headers["user-agent"] || "unknown";
      await createOperationLog({
        userId: user.id,
        username: user.username || `user_${user.id}`,
        action: "completeFounderPinSetup",
        entityType: "accountSecurity",
        entityId: user.id,
        entityName: "創始管理員雙 PIN 初始設定",
        ipAddress,
        userAgent,
        details: JSON.stringify({ loginPinInitialized: true, auditPinInitialized: true, oneTimeOnly: true }),
      });
      return completeCustomLogin({ user, ctx, ipAddress, userAgent });
    }),

  completeFirstLoginSetup: publicProcedure
    .input(z.object({
      challengeToken: z.string().min(20),
      username: z.string().trim().min(3, "自訂帳號至少需要 3 個字元").max(64).regex(/^[A-Za-z0-9._-]+$/, "自訂帳號只能使用英文字母、數字、句點、底線或連字號"),
      newPassword: z.string(),
      confirmPassword: z.string(),
    }))
    .mutation(async ({ input }) => {
      const challenge = await getFirstLoginSetupChallenge(input.challengeToken);
      if (!challenge || challenge.expiresAt.getTime() <= Date.now()) {
        if (challenge) await deleteFirstLoginSetupChallenge(input.challengeToken);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "首次登入設定已逾時，請重新登入" });
      }
      const user = await getUserById(challenge.userId);
      if (!user?.isTemporaryPassword || !user.passwordHash) {
        await deleteFirstLoginSetupChallenge(input.challengeToken);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "首次登入設定狀態無效，請重新登入" });
      }
      if (input.newPassword !== input.confirmPassword) throw new TRPCError({ code: "BAD_REQUEST", message: "新密碼與確認密碼不符" });
      const complexity = validatePasswordComplexity(input.newPassword);
      if (!complexity.valid) throw new TRPCError({ code: "BAD_REQUEST", message: complexity.message || "新密碼不符合複雜度要求" });
      const usernameLocked = Boolean(user.usernameLockedAt && user.username);
      if (usernameLocked && input.username !== user.username) {
        throw new TRPCError({ code: "FORBIDDEN", message: "帳號名稱已在首次設定後固定；重設流程僅可重設密碼" });
      }
      const username = usernameLocked ? user.username! : input.username;
      const existingUser = await getUserByUsername(username);
      if (existingUser && existingUser.id !== user.id) throw new TRPCError({ code: "CONFLICT", message: "此自訂帳號已被使用，請選擇其他名稱" });

      await completeFirstLoginSetup({ userId: user.id, username, passwordHash: await hashPassword(input.newPassword), completedAt: new Date() });
      await deleteFirstLoginSetupChallenge(input.challengeToken);
      await createOperationLog({ userId: user.id, username, action: "completeFirstLoginSetup", entityType: "accountSecurity", entityName: username, details: JSON.stringify({ previousUsername: user.username, usernameLocked, temporaryPasswordCleared: true }) });
      return { success: true as const };
    }),
  beginPasskeyLogin: publicProcedure.mutation(async ({ ctx }) => {
    const ipAddress = getClientIpAddress(ctx as any);
    const blacklistEntry = await getIpBlacklistEntry(ipAddress);
    if (blacklistEntry?.isActive) {
      await createLoginAuditLog({ username: "通行密鑰", userId: null, ipAddress, userAgent: ctx.req.headers["user-agent"] || "unknown", status: "failed", failureReason: "IP 黑名單封鎖" });
      throw new TRPCError({ code: "FORBIDDEN", message: "此連線已被安全策略封鎖" });
    }
    const relyingParty = getPasskeyOrigin(ctx as any);
    const options = await generateAuthenticationOptions({
      rpID: relyingParty.rpID,
      userVerification: "required",
      timeout: PASSKEY_CHALLENGE_TTL_MS,
    });
    await createPasskeyChallenge({
      challenge: options.challenge,
      type: "authentication",
      userId: null,
      rpId: relyingParty.rpID,
      origin: relyingParty.origin,
      expiresAt: new Date(Date.now() + PASSKEY_CHALLENGE_TTL_MS),
    });
    return options;
  }),

  finishPasskeyLogin: publicProcedure
    .input(z.object({ response: webauthnResponseSchema }))
    .mutation(async ({ ctx, input }) => {
      const challengeValue = getWebAuthnChallenge(input.response);
      if (!challengeValue) throw new TRPCError({ code: "UNAUTHORIZED", message: "通行密鑰回應無效，請重新嘗試" });
      const challenge = await consumePasskeyChallenge(challengeValue, "authentication");
      const ipAddress = getClientIpAddress(ctx as any);
      const userAgent = ctx.req.headers["user-agent"] || "unknown";
      if (!challenge) throw new TRPCError({ code: "UNAUTHORIZED", message: "通行密鑰驗證已逾時，請重新嘗試" });

      const credential = await getPasskeyCredentialByCredentialId(input.response.id);
      if (!credential) {
        await createLoginAuditLog({ username: "通行密鑰", userId: null, ipAddress, userAgent, status: "failed", loginMethod: "passkey", failureReason: "找不到通行密鑰憑證" });
        throw new TRPCError({ code: "UNAUTHORIZED", message: "無法驗證此通行密鑰，請改用帳號密碼登入" });
      }
      const user = await getUserById(credential.userId);
      if (!user || !user.isActive) {
        await createLoginAuditLog({ username: user?.username || "通行密鑰", userId: credential.userId, ipAddress, userAgent, status: "failed", loginMethod: "passkey", failureReason: "帳號不存在或已停用" });
        throw new TRPCError({ code: "UNAUTHORIZED", message: "無法使用此通行密鑰登入" });
      }
      const blacklistEntry = await getIpBlacklistEntry(ipAddress);
      if (blacklistEntry?.isActive) throw new TRPCError({ code: "FORBIDDEN", message: "此連線已被安全策略封鎖" });
      if (await isLoginLocked(user.id)) {
        const remainingTime = await getLoginLockTimeRemaining(user.id);
        throw new TRPCError({ code: "FORBIDDEN", message: `帳號已被鎖定，請在 ${remainingTime} 秒後重試` });
      }

      let verification;
      try {
        verification = await verifyAuthenticationResponse({
          response: input.response as any,
          expectedChallenge: challenge.challenge,
          expectedOrigin: challenge.origin,
          expectedRPID: challenge.rpId,
          credential: toWebAuthnCredential(credential),
          requireUserVerification: true,
        });
      } catch {
        await createLoginAuditLog({ username: user.username || `user_${user.id}`, userId: user.id, ipAddress, userAgent, status: "failed", loginMethod: "passkey", failureReason: "通行密鑰簽章驗證失敗" });
        throw new TRPCError({ code: "UNAUTHORIZED", message: "無法驗證此通行密鑰，請重新嘗試" });
      }
      if (!verification.verified) {
        await createLoginAuditLog({ username: user.username || `user_${user.id}`, userId: user.id, ipAddress, userAgent, status: "failed", loginMethod: "passkey", failureReason: "通行密鑰簽章驗證失敗" });
        throw new TRPCError({ code: "UNAUTHORIZED", message: "無法驗證此通行密鑰，請重新嘗試" });
      }

      const isFirstPasskeyUse = !credential.lastUsedAt;
      await updatePasskeyCredentialUsage({
        credentialId: credential.credentialId,
        counter: verification.authenticationInfo.newCounter,
        deviceType: verification.authenticationInfo.credentialDeviceType,
        backedUp: verification.authenticationInfo.credentialBackedUp,
      });
      await resetLoginFailureAttempts(user.id);
      await createOperationLog({
        userId: user.id,
        username: user.username || `user_${user.id}`,
        action: isFirstPasskeyUse ? "firstPasskeyLogin" : "loginWithPasskey",
        entityType: "accountSecurity",
        entityName: credential.name,
        details: JSON.stringify({ credentialId: credential.credentialId, loginMethod: "passkey", firstUse: isFirstPasskeyUse, ipAddress }),
      });
      if (requiresFounderPinSetup(user)) {
        return { ...(await createFounderPinSetupRequirement(user.id)), firstPasskeySecurityNotice: isFirstPasskeyUse };
      }
      const requiresFounderPin = Boolean(user.isFounder);
      if (requiresFounderPin) {
        const challengeToken = randomBytes(32).toString("base64url");
        const challengeExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await createTwoFactorLoginChallenge({
          challengeToken,
          userId: user.id,
          ipAddress,
          userAgent,
          loginMethod: "passkey",
          expiresAt: challengeExpiresAt,
        });
        return { success: false as const, requiresTwoFactor: false as const, requiresFounderPin: true as const, founderPinChallengeToken: challengeToken, challengeExpiresAt, firstPasskeySecurityNotice: isFirstPasskeyUse };
      }
      const completedLogin = await completeCustomLogin({ user, ctx, ipAddress, userAgent, loginMethod: "passkey" });
      return { ...completedLogin, firstPasskeySecurityNotice: isFirstPasskeyUse };
    }),

  login: publicProcedure
    .input(z.object({
      username: z.string().min(1).max(64),
      password: z.string().regex(loginPasswordPattern, "密碼只能包含英文字母、數字及特殊符號"),
    }))
    .mutation(async ({ input, ctx }) => {
      const ipAddress = getClientIpAddress(ctx as any);
      const userAgent = ctx.req.headers['user-agent'] || 'unknown';
      
      try {
        const user = await getUserByUsername(input.username);

        const blacklistEntry = await getIpBlacklistEntry(ipAddress);
        if (blacklistEntry?.isActive) {
          await createLoginAuditLog({
            username: input.username,
            userId: user?.id ?? null,
            ipAddress,
            userAgent,
            status: "failed",
            failureReason: `IP 黑名單封鎖${blacklistEntry.note ? `：${blacklistEntry.note}` : ""}`,
          });
          void sendSecurityAlert({
            eventKey: `blacklisted-ip-login:${ipAddress}`,
            title: "黑名單 IP 嘗試登入",
            summary: `已封鎖來自 ${ipAddress} 的登入嘗試`,
            details: [`帳號：${input.username}`, `IP：${ipAddress}`, `備註：${blacklistEntry.note || "未提供"}`],
          });
          throw new TRPCError({ code: "FORBIDDEN", message: "此連線已被安全策略封鎖" });
        }

        const isExistingLegacyUsername = Boolean(user?.username === input.username && isLegacyUsername(input.username));
        if (!loginUsernamePattern.test(input.username) && !isExistingLegacyUsername) {
          await createLoginAuditLog({
            username: input.username,
            userId: user?.id ?? null,
            ipAddress,
            userAgent,
            status: "failed",
            failureReason: "帳號包含不支援字元",
          });
          throw new TRPCError({ code: "BAD_REQUEST", message: "帳號只能包含英文字母與數字" });
        }
        
        // 檢查帳號是否被鎖定
        if (user && await isLoginLocked(user.id)) {
          const remainingTime = await getLoginLockTimeRemaining(user.id);
          await createLoginAuditLog({
            username: input.username,
            userId: user.id,
            ipAddress,
            userAgent,
            status: "failed",
            failureReason: `帳號已被鎖定，剩餘時間：${remainingTime} 秒`,
          });
          throw new TRPCError({ code: "FORBIDDEN", message: `帳號已被鎖定，請在 ${remainingTime} 秒後重試` });
        }
        
        if (!user || !user.passwordHash) {
          await createLoginAuditLog({
            username: input.username,
            userId: null,
            ipAddress,
            userAgent,
            status: "failed",
            failureReason: "帳號不存在",
          });
          throw new TRPCError({ code: "UNAUTHORIZED", message: "帳號或密碼錯誤" });
        }

        if (!user.isActive) {
          await createLoginAuditLog({
            username: input.username,
            userId: user.id,
            ipAddress,
            userAgent,
            status: "failed",
            failureReason: "帳號已被停用",
          });
          throw new TRPCError({ code: "FORBIDDEN", message: "帳號已被停用" });
        }

        const isPasswordValid = await verifyPassword(input.password, user.passwordHash);
        if (!isPasswordValid) {
          // 記錄登入失敗
          await recordLoginFailure(user.id);
          const failureAttempts = await getLoginFailureAttempts(user.id);
          const remainingAttempts = 3 - (failureAttempts?.attemptCount || 0);
          const isNowLocked = await isLoginLocked(user.id);
          
          const failureReason = isNowLocked 
            ? `短時間內連續 ${failureAttempts?.attemptCount ?? 3} 次密碼錯誤，帳號已被鎖定 15 分鐘`
            : `密碼錯誤，五分鐘內已失敗 ${failureAttempts?.attemptCount ?? 1}/3 次，剩餘嘗試次數：${Math.max(0, remainingAttempts)}`;
          
          await createLoginAuditLog({
            username: input.username,
            userId: user.id,
            ipAddress,
            userAgent,
            status: "failed",
            failureReason,
          });
          if (isNowLocked) {
            void sendSecurityAlert({
              eventKey: `login-lockout:${user.id}`,
              title: "帳號因異常登入已鎖定",
              summary: `${user.username || input.username} 在短時間內多次登入失敗，系統已鎖定帳號 15 分鐘`,
              details: [`帳號：${user.username || input.username}`, `IP：${ipAddress}`, `失敗次數：${failureAttempts?.attemptCount ?? 3}`],
            });
          }
          throw new TRPCError({ code: "UNAUTHORIZED", message: failureReason });
        }

        if (user.isTemporaryPassword && (!user.temporaryPasswordExpiresAt || user.temporaryPasswordExpiresAt.getTime() <= Date.now())) {
          await createLoginAuditLog({
            username: input.username,
            userId: user.id,
            ipAddress,
            userAgent,
            status: "failed",
            failureReason: "臨時密碼已到期，需由管理員重設",
          });
          throw new TRPCError({ code: "FORBIDDEN", message: "臨時密碼已到期，請聯絡管理員重設密碼" });
        }

        // 密碼正確後重置密碼失敗計數創始管理員先完成 2FA（如已啟用）；
        // 尚未完成唯一一次雙 PIN 初始設定時，必須先完成設定，否則才進入登入 PIN 驗證
        await resetLoginFailureAttempts(user.id);
        const authenticator = await getTwoFactorAuthenticator(user.id);
        const requiresFounderPin = Boolean(user.isFounder);
        if (authenticator?.isEnabled) {
          const challengeToken = randomBytes(32).toString("base64url");
          const challengeExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
          await createTwoFactorLoginChallenge({
            challengeToken,
            userId: user.id,
            ipAddress,
            userAgent,
            expiresAt: challengeExpiresAt,
          });
          return { success: false as const, requiresTwoFactor: true as const, requiresFounderPin, twoFactorChallengeToken: challengeToken, challengeExpiresAt };
        }
        if (requiresFounderPin) {
          if (requiresFounderPinSetup(user)) return createFounderPinSetupRequirement(user.id);
          const challengeToken = randomBytes(32).toString("base64url");
          const challengeExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
          await createTwoFactorLoginChallenge({
            challengeToken,
            userId: user.id,
            ipAddress,
            userAgent,
            expiresAt: challengeExpiresAt,
          });
          return { success: false as const, requiresTwoFactor: false as const, requiresFounderPin: true as const, founderPinChallengeToken: challengeToken, challengeExpiresAt };
        }

        return completeCustomLogin({ user, ctx, ipAddress, userAgent });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "登入失敗" });
      }
    }),

  recordExpiredLoginChallenge: publicProcedure
    .input(z.object({ challengeToken: z.string().min(20).max(256) }))
    .mutation(async ({ input, ctx }) => {
      const challenge = await getTwoFactorLoginChallenge(input.challengeToken);
      if (!challenge || challenge.expiresAt > new Date()) return { recorded: false as const };

      const user = await getUserById(challenge.userId);
      const ipAddress = getClientIpAddress(ctx as any);
      const userAgent = ctx.req.headers["user-agent"] || "unknown";
      await deleteTwoFactorLoginChallenge(input.challengeToken);
      if (!user) return { recorded: false as const };

      const username = user.username || `user_${user.id}`;
      const details = JSON.stringify({ loginMethod: challenge.loginMethod || "password", challengeExpiresAt: challenge.expiresAt.toISOString(), source: "client-timeout" });
      await Promise.all([
        createOperationLog({ userId: user.id, username, action: "loginChallengeExpired", entityType: "accountSecurity", entityName: "登入驗證挑戰", ipAddress, userAgent, details }),
        createLoginAuditLog({ username, userId: user.id, ipAddress, userAgent, status: "failed", loginMethod: challenge.loginMethod, failureReason: "登入驗證挑戰逾時" }),
      ]);
      return { recorded: true as const };
    }),

  verifyTwoFactorLogin: publicProcedure
    .input(z.object({ challengeToken: z.string().min(20), code: z.string().trim() }))
    .mutation(async ({ input, ctx }) => {
      const challenge = await getTwoFactorLoginChallenge(input.challengeToken);
      const ipAddress = getClientIpAddress(ctx as any);
      const userAgent = ctx.req.headers["user-agent"] || "unknown";
      // 登入挑戰以高熵的一次性 Token、使用者帳號、有效期限與嘗試次數為核心保護
      // 不同反向代理節點可能在前後兩個請求回傳不同來源 IP，故不可因 IP 差異刪除仍有效的挑戰
      if (!challenge || challenge.expiresAt <= new Date() || challenge.attemptCount >= TWO_FACTOR_CHALLENGE_MAX_ATTEMPTS) {
        if (challenge) await deleteTwoFactorLoginChallenge(input.challengeToken);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "雙因素驗證已過期，請重新登入" });
      }

      const user = await getUserById(challenge.userId);
      const authenticator = await getTwoFactorAuthenticator(challenge.userId);
      if (!user || !user.isActive || !authenticator?.isEnabled) {
        await deleteTwoFactorLoginChallenge(input.challengeToken);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "雙因素驗證狀態無效，請重新登入" });
      }

      const valid = verifyTwoFactorCode(decryptTwoFactorSecret(authenticator.encryptedSecret), user.username || `user_${user.id}`, input.code);
      if (!valid) {
        await incrementTwoFactorChallengeAttempts(input.challengeToken);
        await createLoginAuditLog({ username: user.username || `user_${user.id}`, userId: user.id, ipAddress, userAgent, status: "failed", failureReason: "雙因素驗證碼錯誤" });
        throw new TRPCError({ code: "UNAUTHORIZED", message: "驗證碼錯誤，請確認驗證器後重試" });
      }

      await touchTwoFactorAuthenticator(user.id);
      if (user.isFounder) {
        if (requiresFounderPinSetup(user)) {
          await deleteTwoFactorLoginChallenge(input.challengeToken);
          return createFounderPinSetupRequirement(user.id);
        }
        await markTwoFactorChallengeVerified(input.challengeToken);
        return { success: false as const, requiresTwoFactor: false as const, requiresFounderPin: true as const, founderPinChallengeToken: input.challengeToken, challengeExpiresAt: challenge.expiresAt };
      }

      await deleteTwoFactorLoginChallenge(input.challengeToken);
      return completeCustomLogin({ user, ctx, ipAddress, userAgent, loginMethod: challenge.loginMethod });
    }),

  verifyTwoFactorRecoveryCode: publicProcedure
    .input(z.object({ challengeToken: z.string().min(20), code: z.string().trim().max(32) }))
    .mutation(async ({ input, ctx }) => {
      const challenge = await getTwoFactorLoginChallenge(input.challengeToken);
      const ipAddress = getClientIpAddress(ctx as any);
      const userAgent = ctx.req.headers["user-agent"] || "unknown";
      if (!challenge || challenge.expiresAt <= new Date() || challenge.attemptCount >= TWO_FACTOR_CHALLENGE_MAX_ATTEMPTS) {
        if (challenge) await deleteTwoFactorLoginChallenge(input.challengeToken);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "雙因素驗證已過期，請重新登入" });
      }
      const user = await getUserById(challenge.userId);
      const authenticator = await getTwoFactorAuthenticator(challenge.userId);
      if (!user || !user.isActive || !authenticator?.isEnabled || !isValidTwoFactorRecoveryCode(input.code)) {
        await incrementTwoFactorChallengeAttempts(input.challengeToken);
        if (user) await createLoginAuditLog({ username: user.username || `user_${user.id}`, userId: user.id, ipAddress, userAgent, status: "failed", failureReason: "雙因素恢復碼錯誤" });
        throw new TRPCError({ code: "UNAUTHORIZED", message: "恢復碼無效，請確認後重試" });
      }
      const candidates = await getActiveTwoFactorRecoveryCodes(user.id);
      let matchedCodeId: number | null = null;
      for (const candidate of candidates) {
        if (await verifyTwoFactorRecoveryCodeHash(input.code, candidate.codeHash)) {
          matchedCodeId = candidate.id;
          break;
        }
      }
      const consumed = matchedCodeId ? await consumeTwoFactorRecoveryCode(user.id, matchedCodeId) : false;
      if (!consumed) {
        await incrementTwoFactorChallengeAttempts(input.challengeToken);
        await createLoginAuditLog({ username: user.username || `user_${user.id}`, userId: user.id, ipAddress, userAgent, status: "failed", failureReason: "雙因素恢復碼錯誤或已使用" });
        throw new TRPCError({ code: "UNAUTHORIZED", message: "恢復碼無效，請確認後重試" });
      }
      await touchTwoFactorAuthenticator(user.id);
      await createOperationLog({ userId: user.id, username: user.username || `user_${user.id}`, action: "useTwoFactorRecoveryCode", entityType: "accountSecurity", entityId: matchedCodeId, entityName: "2FA 備用恢復碼", ipAddress, userAgent, details: JSON.stringify({ loginMethod: challenge.loginMethod }) });
      if (user.isFounder) {
        if (requiresFounderPinSetup(user)) {
          await deleteTwoFactorLoginChallenge(input.challengeToken);
          return createFounderPinSetupRequirement(user.id);
        }
        await markTwoFactorChallengeVerified(input.challengeToken);
        return { success: false as const, requiresTwoFactor: false as const, requiresFounderPin: true as const, founderPinChallengeToken: input.challengeToken, challengeExpiresAt: challenge.expiresAt };
      }
      await deleteTwoFactorLoginChallenge(input.challengeToken);
      return completeCustomLogin({ user, ctx, ipAddress, userAgent, loginMethod: challenge.loginMethod });
    }),

  verifyFounderLoginPin: publicProcedure
    .input(z.object({ challengeToken: z.string().min(20), pin: z.string().length(6, "PIN 碼必須為 6 位數").regex(/^\d+$/, "PIN 碼只能包含數字") }))
    .mutation(async ({ input, ctx }) => {
      const challenge = await getTwoFactorLoginChallenge(input.challengeToken);
      const ipAddress = getClientIpAddress(ctx as any);
      const userAgent = ctx.req.headers["user-agent"] || "unknown";
      // 一次性高熵挑戰、帳號、期限與嘗試次數已提供主要保護；反向代理節點
      // 可能使前後兩次請求觀察到不同 IP，不能因該差異拒絕仍有效的登入挑戰
      if (!challenge || challenge.expiresAt <= new Date()) {
        if (challenge) await deleteTwoFactorLoginChallenge(input.challengeToken);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "創始管理員登入挑戰已過期，請重新登入" });
      }

      const user = await getUserById(challenge.userId);
      if (!user || !user.isActive || !user.isFounder) {
        await deleteTwoFactorLoginChallenge(input.challengeToken);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "創始管理員登入狀態無效，請重新登入" });
      }

      if (requiresFounderPinSetup(user)) {
        await deleteTwoFactorLoginChallenge(input.challengeToken);
        return createFounderPinSetupRequirement(user.id);
      }

      const authenticator = await getTwoFactorAuthenticator(user.id);
      if (authenticator?.isEnabled && !challenge.secondFactorVerifiedAt && challenge.loginMethod !== "passkey") {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "請先完成雙因素驗證" });
      }

      if (await isLoginPinLocked(user.id)) {
        const remainingSeconds = await getLoginPinLockTimeRemaining(user.id);
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `登入 PIN 已鎖定，請在 ${remainingSeconds} 秒後重試` });
      }
      if (!user.loginPinHash) {
        await deleteTwoFactorLoginChallenge(input.challengeToken);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "創始管理員尚未設定登入 PIN，請聯絡系統維護者" });
      }

      const isValid = await bcrypt.compare(input.pin, user.loginPinHash);
      if (!isValid) {
        await recordLoginPinFailure(user.id);
        const attempts = await getLoginPinFailureAttempts(user.id);
        const remainingAttempts = Math.max(0, 3 - (attempts?.attemptCount ?? 0));
        await createLoginAuditLog({ username: user.username || `user_${user.id}`, userId: user.id, ipAddress, userAgent, status: "failed", loginMethod: challenge.loginMethod, failureReason: "創始管理員登入 PIN 錯誤" });
        if (remainingAttempts === 0) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "登入 PIN 錯誤次數過多，帳號已鎖定 15 分鐘" });
        throw new TRPCError({ code: "UNAUTHORIZED", message: `登入 PIN 不正確，還有 ${remainingAttempts} 次嘗試機會` });
      }

      await resetLoginPinFailureAttempts(user.id);
      await deleteTwoFactorLoginChallenge(input.challengeToken);
      return completeCustomLogin({ user, ctx, ipAddress, userAgent, loginMethod: challenge.loginMethod });
    }),

  beginTwoFactorSetup: protectedProcedure
    .input(z.object({ password: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const user = await getUserById(ctx.user.id);
      if (!user?.passwordHash || !await verifyPassword(input.password, user.passwordHash)) throw new TRPCError({ code: "UNAUTHORIZED", message: "目前密碼錯誤" });
      const setup = createTwoFactorSetup(user.username || `user_${user.id}`);
      await upsertTwoFactorAuthenticator({ userId: user.id, encryptedSecret: encryptTwoFactorSecret(setup.secret), isEnabled: false });
      return { otpAuthUri: setup.otpAuthUri, manualKey: setup.secret };
    }),

  confirmTwoFactorSetup: protectedProcedure
    .input(z.object({ code: z.string().trim() }))
    .mutation(async ({ ctx, input }) => {
      const user = await getUserById(ctx.user.id);
      const authenticator = await getTwoFactorAuthenticator(ctx.user.id);
      if (!user || !authenticator || authenticator.isEnabled) throw new TRPCError({ code: "BAD_REQUEST", message: "沒有待確認的雙因素驗證設定" });
      if (!verifyTwoFactorCode(decryptTwoFactorSecret(authenticator.encryptedSecret), user.username || `user_${user.id}`, input.code)) throw new TRPCError({ code: "UNAUTHORIZED", message: "驗證碼錯誤，尚未啟用雙因素驗證" });
      await setTwoFactorEnabled(ctx.user.id, true);
      await logOperation(ctx.user.id, user.username || `user_${user.id}`, "enableTwoFactor", "accountSecurity", user.id, user.username || undefined);
      return { success: true as const };
    }),

  disableTwoFactor: protectedProcedure
    .input(z.object({ password: z.string().min(1), code: z.string().trim() }))
    .mutation(async ({ ctx, input }) => {
      const user = await getUserById(ctx.user.id);
      const authenticator = await getTwoFactorAuthenticator(ctx.user.id);
      if (!user?.passwordHash || !authenticator?.isEnabled || !await verifyPassword(input.password, user.passwordHash)) throw new TRPCError({ code: "UNAUTHORIZED", message: "目前密碼或安全設定狀態無效" });
      if (!verifyTwoFactorCode(decryptTwoFactorSecret(authenticator.encryptedSecret), user.username || `user_${user.id}`, input.code)) throw new TRPCError({ code: "UNAUTHORIZED", message: "驗證碼錯誤，無法停用雙因素驗證" });
      await setTwoFactorEnabled(ctx.user.id, false);
      await revokeTwoFactorRecoveryCodes(ctx.user.id);
      await logOperation(ctx.user.id, user.username || `user_${user.id}`, "disableTwoFactor", "accountSecurity", user.id, user.username || undefined);
      return { success: true as const };
    }),

  changePassword: protectedProcedure
    .input(
      z.object({
        oldPassword: z.string(),
        newPassword: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await getUserById(ctx.user.id);
      if (!user || !user.passwordHash) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "使用者不存在" });
      }

      const isOldPasswordValid = await verifyPassword(input.oldPassword, user.passwordHash);
      if (!isOldPasswordValid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "舊密碼錯誤" });
      }

      const complexity = validatePasswordComplexity(input.newPassword);
      if (!complexity.valid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: complexity.message });
      }

      const newPasswordHash = await hashPassword(input.newPassword);
      await upsertUser({
        username: user.username,
        passwordHash: newPasswordHash,
        temporaryPasswordCiphertext: null,
        temporaryPasswordExpiresAt: null,
        isTemporaryPassword: false,
        passwordChangedAt: new Date(),
        passwordReminderSentAt: null,
      });

      await logOperation(
        ctx.user.id,
        user.username || `user_${user.id}`,
        "changePassword",
        "accountSecurity",
        user.id,
        user.username || undefined,
        { source: "customAuth", temporaryPasswordCleared: Boolean(user.isTemporaryPassword) }
      );

      return { success: true };
    }),
});

const accountSecurityRouter = router({
  passkeys: protectedProcedure.query(async ({ ctx }) => {
    const credentials = await listPasskeyCredentials(ctx.user.id);
    return credentials.map(({ credentialId, name, createdAt, lastUsedAt, deviceType, backedUp, transports, registeredDeviceLabel }) => ({
      credentialId,
      name,
      createdAt,
      lastUsedAt,
      deviceType,
      backedUp,
      registeredDeviceLabel,
      transports: transports ? JSON.parse(transports) : [],
    }));
  }),

  beginPasskeyRegistration: protectedProcedure
    .input(z.object({ name: z.string().trim().min(1, "請輸入通行密鑰名稱").max(128) }))
    .mutation(async ({ ctx, input }) => {
      const user = await getUserById(ctx.user.id);
      if (!user || !user.isActive) throw new TRPCError({ code: "UNAUTHORIZED", message: "帳號狀態無效，請重新登入" });
      const relyingParty = getPasskeyOrigin(ctx as any);
      const existingCredentials = await listPasskeyCredentials(user.id);
      const webauthnUserId = deriveWebAuthnUserId(user.id);
      const options = await generateRegistrationOptions({
        rpName: PASSKEY_RP_NAME,
        rpID: relyingParty.rpID,
        userName: user.username || `user_${user.id}`,
        userID: base64UrlToUint8Array(webauthnUserId),
        userDisplayName: user.realName || user.name || user.username || `使用者 ${user.id}`,
        attestationType: "none",
        timeout: PASSKEY_CHALLENGE_TTL_MS,
        excludeCredentials: existingCredentials.map((credential) => ({ id: credential.credentialId, transports: JSON.parse(credential.transports || "[]") })),
        authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
      });
      await createPasskeyChallenge({
        challenge: options.challenge,
        type: "registration",
        userId: user.id,
        passkeyName: input.name,
        rpId: relyingParty.rpID,
        origin: relyingParty.origin,
        expiresAt: new Date(Date.now() + PASSKEY_CHALLENGE_TTL_MS),
      });
      return options;
    }),

  finishPasskeyRegistration: protectedProcedure
    .input(z.object({ response: webauthnResponseSchema }))
    .mutation(async ({ ctx, input }) => {
      const challengeValue = getWebAuthnChallenge(input.response);
      if (!challengeValue) throw new TRPCError({ code: "BAD_REQUEST", message: "通行密鑰回應無效，請重新嘗試" });
      const challenge = await consumePasskeyChallenge(challengeValue, "registration");
      if (!challenge || challenge.userId !== ctx.user.id || !challenge.passkeyName) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "通行密鑰註冊已逾時，請重新開始" });
      }
      let verification;
      try {
        verification = await verifyRegistrationResponse({
          response: input.response as any,
          expectedChallenge: challenge.challenge,
          expectedOrigin: challenge.origin,
          expectedRPID: challenge.rpId,
          requireUserVerification: true,
        });
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "無法驗證此通行密鑰，請重新開始" });
      }
      if (!verification.verified || !verification.registrationInfo) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "通行密鑰註冊未完成，請重新開始" });
      }
      const { credential, credentialBackedUp, credentialDeviceType } = verification.registrationInfo;
      const registeredDeviceLabel = describePasskeyRegistrationDevice(ctx.req.headers["user-agent"]);
      try {
        await createPasskeyCredential({
          userId: ctx.user.id,
          credentialId: credential.id,
          webauthnUserId: deriveWebAuthnUserId(ctx.user.id),
          publicKey: Buffer.from(credential.publicKey).toString("base64url"),
          counter: credential.counter,
          deviceType: credentialDeviceType,
          backedUp: credentialBackedUp,
          transports: serializePasskeyTransports(credential.transports),
          name: challenge.passkeyName,
          registeredDeviceLabel,
        });
      } catch {
        throw new TRPCError({ code: "CONFLICT", message: "此通行密鑰已經加入帳戶或無法儲存，請重新嘗試" });
      }
      const user = await getUserById(ctx.user.id);
      const emailNotification = user
        ? await notifyPasskeyChange({
            user,
            action: "added",
            passkeyName: challenge.passkeyName,
            registeredDeviceLabel,
            ipAddress: getClientIpAddress(ctx as any),
            deviceSummary: describeLoginDevice(ctx.req.headers["user-agent"] || "unknown"),
            occurredAt: new Date(),
          })
        : "email_unavailable" as const;
      await logOperation(ctx.user.id, ctx.user.username || `user_${ctx.user.id}`, "addPasskey", "accountSecurity", undefined, challenge.passkeyName, { credentialId: credential.id, registeredDeviceLabel, emailNotification });
      return { success: true as const, credentialId: credential.id, emailNotification };
    }),

  renamePasskey: protectedProcedure
    .input(z.object({ credentialId: z.string().min(1).max(512), name: z.string().trim().min(1).max(128) }))
    .mutation(async ({ ctx, input }) => {
      const updated = await renamePasskeyCredential(ctx.user.id, input.credentialId, input.name);
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "找不到通行密鑰" });
      await logOperation(ctx.user.id, ctx.user.username || `user_${ctx.user.id}`, "renamePasskey", "accountSecurity", undefined, input.name, { credentialId: input.credentialId });
      return { success: true as const };
    }),

  deletePasskey: protectedProcedure
    .input(z.object({ credentialId: z.string().min(1).max(512) }))
    .mutation(async ({ ctx, input }) => {
      const removed = await deletePasskeyCredential(ctx.user.id, input.credentialId);
      if (!removed) throw new TRPCError({ code: "NOT_FOUND", message: "找不到通行密鑰" });
      const user = await getUserById(ctx.user.id);
      const emailNotification = user
        ? await notifyPasskeyChange({
            user,
            action: "removed",
            passkeyName: removed.name,
            registeredDeviceLabel: removed.registeredDeviceLabel,
            ipAddress: getClientIpAddress(ctx as any),
            deviceSummary: describeLoginDevice(ctx.req.headers["user-agent"] || "unknown"),
            occurredAt: new Date(),
          })
        : "email_unavailable" as const;
      await logOperation(ctx.user.id, ctx.user.username || `user_${ctx.user.id}`, "deletePasskey", "accountSecurity", undefined, removed.name, { credentialId: input.credentialId, registeredDeviceLabel: removed.registeredDeviceLabel, emailNotification });
      return { success: true as const, emailNotification };
    }),

  twoFactorStatus: protectedProcedure.query(async ({ ctx }) => {
    const authenticator = await getTwoFactorAuthenticator(ctx.user.id);
    return { enabled: authenticator?.isEnabled ?? false, enabledAt: authenticator?.enabledAt ?? null, lastUsedAt: authenticator?.lastUsedAt ?? null };
  }),

  twoFactorRecoveryCodeStatus: protectedProcedure.query(async ({ ctx }) => {
    const authenticator = await getTwoFactorAuthenticator(ctx.user.id);
    if (!authenticator?.isEnabled) return { enabled: false, availableCount: 0, totalGenerated: 0, lastGeneratedAt: null as Date | null };
    return { enabled: true, ...(await getTwoFactorRecoveryCodeStatus(ctx.user.id)) };
  }),

  generateTwoFactorRecoveryCodes: protectedProcedure
    .input(z.object({ password: z.string().min(1), code: z.string().trim() }))
    .mutation(async ({ ctx, input }) => {
      const user = await getUserById(ctx.user.id);
      const authenticator = await getTwoFactorAuthenticator(ctx.user.id);
      if (!user?.passwordHash || !authenticator?.isEnabled || !await verifyPassword(input.password, user.passwordHash)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "目前密碼或雙因素驗證狀態無效" });
      }
      if (!verifyTwoFactorCode(decryptTwoFactorSecret(authenticator.encryptedSecret), user.username || `user_${user.id}`, input.code)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "驗證器驗證碼錯誤，無法產生恢復碼" });
      }
      const previous = await getTwoFactorRecoveryCodeStatus(ctx.user.id);
      const codes = Array.from({ length: 10 }, () => createTwoFactorRecoveryCode());
      const codeHashes = await Promise.all(codes.map((code) => hashTwoFactorRecoveryCode(code)));
      await replaceTwoFactorRecoveryCodes(ctx.user.id, codeHashes);
      await logOperation(ctx.user.id, user.username || `user_${user.id}`, "generateTwoFactorRecoveryCodes", "accountSecurity", user.id, "2FA 備用恢復碼", { generatedCount: codes.length, replacedAvailableCount: previous.availableCount });
      return { codes, count: codes.length };
    }),

  confirmTwoFactorRecoveryCodesSafelyStored: protectedProcedure
    .input(z.object({ displayedCodeCount: z.number().int().min(1).max(10) }))
    .mutation(async ({ ctx, input }) => {
      const authenticator = await getTwoFactorAuthenticator(ctx.user.id);
      if (!authenticator?.isEnabled) throw new TRPCError({ code: "BAD_REQUEST", message: "請先啟用雙因素驗證" });
      const status = await getTwoFactorRecoveryCodeStatus(ctx.user.id);
      if (status.availableCount < 1) throw new TRPCError({ code: "BAD_REQUEST", message: "目前沒有可確認保存的恢復碼，請重新產生後再試" });
      const user = await getUserById(ctx.user.id);
      await logOperation(ctx.user.id, user?.username || `user_${ctx.user.id}`, "confirmTwoFactorRecoveryCodesSafelyStored", "accountSecurity", ctx.user.id, "2FA 備用恢復碼", { displayedCodeCount: input.displayedCodeCount, availableCountAtConfirmation: status.availableCount, source: "print-recovery-codes" });
      return { success: true as const };
    }),

  devices: protectedProcedure.query(async ({ ctx }) => {
    const devices = await listLoginDevices(ctx.user.id);
    return devices.map((device) => ({ ...device, isCurrent: device.deviceId === ctx.sessionDeviceId }));
  }),

  revokeDevice: protectedProcedure
    .input(z.object({ deviceId: z.string().min(20).max(128) }))
    .mutation(async ({ ctx, input }) => {
      const revoked = await revokeLoginDevice(ctx.user.id, input.deviceId);
      if (!revoked) throw new TRPCError({ code: "NOT_FOUND", message: "找不到可撤銷的登入設備" });
      await logOperation(ctx.user.id, ctx.user.username || `user_${ctx.user.id}`, "revokeLoginDevice", "accountSecurity", undefined, input.deviceId);
      return { success: true as const, revokedCurrentDevice: input.deviceId === ctx.sessionDeviceId };
    }),
});

function requireFounderAuditPin(ctx: { user: { isFounder: boolean }; auditPinVerified?: boolean }) {
  if (!ctx.user.isFounder) throw new TRPCError({ code: "FORBIDDEN", message: "僅創始管理員可管理 IP 黑名單" });
  if (!ctx.auditPinVerified) throw new TRPCError({ code: "UNAUTHORIZED", message: "PIN 碼驗證失效，請重新驗證" });
}

const ipBlacklistRouter = router({
  list: founderProcedure.query(async ({ ctx }) => {
    requireFounderAuditPin(ctx as any);
    return listIpBlacklist();
  }),

  save: founderProcedure
    .input(z.object({ ipAddress: z.string().trim().min(3).max(45), note: z.string().trim().max(1000).optional(), isActive: z.boolean().default(true) }))
    .mutation(async ({ ctx, input }) => {
      requireFounderAuditPin(ctx as any);
      await upsertIpBlacklistEntry({ ipAddress: input.ipAddress, note: input.note || null, isActive: input.isActive, createdById: ctx.user.id });
      await logOperation(ctx.user.id, ctx.user.username || `user_${ctx.user.id}`, "upsertIpBlacklist", "ipBlacklist", undefined, input.ipAddress, { note: input.note || null, isActive: input.isActive });
      return { success: true as const };
    }),

  setActive: founderProcedure
    .input(z.object({ id: z.number().int().positive(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      requireFounderAuditPin(ctx as any);
      const updated = await setIpBlacklistActive(input.id, input.isActive);
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "找不到指定的黑名單 IP" });
      await logOperation(ctx.user.id, ctx.user.username || `user_${ctx.user.id}`, input.isActive ? "activateIpBlacklist" : "deactivateIpBlacklist", "ipBlacklist", input.id);
      return { success: true as const };
    }),
});

// ─── Login Audit Logs Router ──────────────────────────────────────────────────

const loginAuditRouter = router({
  highRiskSummary: adminProcedure
    .input(z.object({ period: z.enum(["24h", "7d", "30d"]) }))
    .query(async ({ ctx, input }) => {
    if (!ctx.user.isFounder) {
      throw new TRPCError({ code: "FORBIDDEN", message: "無權限檢查登入稽核日誌" });
    }
    if (!ctx.auditPinVerified) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "PIN 碼驗證失效，請重新驗證" });
    }
    return getLoginAuditHighRiskSummary(input.period);
  }),

  list: adminProcedure
    .input(
      z.object({
        username: z.string().optional(),
        status: z.enum(["success", "failed"]).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      // 只有創始管理員可以檢查登入稽核日誌
      if (!ctx.user.isFounder) {
        throw new TRPCError({ code: "FORBIDDEN", message: "無權限檢查登入稽核日誌" });
      }

      // 驗證 PIN 碼
      if (!ctx.auditPinVerified) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "PIN 碼驗證失效，請重新驗證" });
      }
      
      const offset = (input.page - 1) * input.pageSize;
      const logs = await getLoginAuditLogs({
        username: input.username,
        status: input.status,
        startDate: input.startDate,
        endDate: input.endDate,
        limit: input.pageSize,
        offset,
      });
      const total = await getLoginAuditLogCount({
        username: input.username,
        status: input.status,
        startDate: input.startDate,
        endDate: input.endDate,
      });
      await logOperation(
        ctx.user.id,
        ctx.user.username || ctx.user.openId || "unknown",
        "viewLoginAudit",
        "auditView",
        undefined,
        "登入稽核紀錄",
        { username: input.username ?? null, status: input.status ?? null, startDate: input.startDate?.toISOString() ?? null, endDate: input.endDate?.toISOString() ?? null, page: input.page, pageSize: input.pageSize, resultCount: logs.length, total }
      );
      return {
        logs,
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),
});

// ─── Operation Logs Router ───────────────────────────────────────────────────

const operationLogsRouter = router({
  retentionStatus: adminProcedure.query(async ({ ctx }) => {
    const [schedule, latestRun] = await Promise.all([
      getOperationLogRetentionSchedule(),
      getLatestOperationLogRetentionRun(),
    ]);
    await logOperation(
      ctx.user.id,
      ctx.user.username || ctx.user.openId || "unknown",
      "viewOperationLogRetention",
      "auditView",
      schedule?.id,
      "操作日誌保留政策",
      { configured: Boolean(schedule), retentionDays: schedule?.retentionDays ?? null, latestRunAt: latestRun?.ranAt?.toISOString() ?? null }
    );
    return { schedule, latestRun };
  }),

  list: adminProcedure
    .input(
      z.object({
        username: z.string().optional(),
        action: z.string().optional(),
        entityType: z.string().optional(),
        deduplicationOnly: z.boolean().optional(),
        accountLifecycleOnly: z.boolean().optional(),
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      // 只有創始管理員可以檢查操作日誌
      if (!ctx.user.isFounder) {
        throw new TRPCError({ code: "FORBIDDEN", message: "無權限檢查操作日誌" });
      }

      // 驗證 PIN 碼
      if (!ctx.auditPinVerified) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "PIN 碼驗證失效，請重新驗證" });
      }
      const offset = (input.page - 1) * input.pageSize;
      const logs = await getOperationLogs({
        username: input.username,
        action: input.action,
        entityType: input.entityType,
        deduplicationOnly: input.deduplicationOnly,
        accountLifecycleOnly: input.accountLifecycleOnly,
        limit: input.pageSize,
        offset,
      });
      const count = await getOperationLogCount({
        username: input.username,
        action: input.action,
        entityType: input.entityType,
        deduplicationOnly: input.deduplicationOnly,
        accountLifecycleOnly: input.accountLifecycleOnly,
      });
      await logOperation(
        ctx.user.id,
        ctx.user.username || ctx.user.openId || "unknown",
        input.accountLifecycleOnly ? "viewAccountLifecycleAudit" : "viewOperationAuditLog",
        "auditView",
        undefined,
        input.accountLifecycleOnly ? "帳號生命週期稽核紀錄" : "操作日誌紀錄",
        { username: input.username ?? null, action: input.action ?? null, entityType: input.entityType ?? null, deduplicationOnly: input.deduplicationOnly ?? false, accountLifecycleOnly: input.accountLifecycleOnly ?? false, page: input.page, pageSize: input.pageSize, resultCount: logs.length, total: count }
      );
      return {
        logs,
        total: count,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(count / input.pageSize),
      };
    }),
});

const auditEventResolutionsRouter = router({
  list: founderProcedure
    .input(z.object({ events: z.array(z.object({ sourceType: z.enum(["loginAudit", "operationLog"]), sourceEventId: z.number().int().positive() })).max(100) }))
    .query(async ({ ctx, input }) => {
      requireFounderAuditPin(ctx as any);
      return getAuditEventResolutions(input.events);
    }),
  notificationDeliveries: founderProcedure
    .input(z.object({ sourceType: z.enum(["loginAudit", "operationLog"]), sourceEventId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      requireFounderAuditPin(ctx as any);
      const eventKey = `audit-event-closed:${input.sourceType}:${input.sourceEventId}`;
      const deliveries = await getSystemAlertEmailDeliveriesForEvent(eventKey);
      return deliveries.map(({ recipientEmail, errorDetail, ...delivery }) => ({
        ...delivery,
        recipientEmail: maskEmailAddress(recipientEmail),
        errorDetail: errorDetail ? errorDetail.slice(0, 240) : null,
      }));
    }),
  resendClosureNotification: founderProcedure
    .input(z.object({ sourceType: z.enum(["loginAudit", "operationLog"]), sourceEventId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      requireFounderAuditPin(ctx as any);
      const [resolution] = await getAuditEventResolutions([{ sourceType: input.sourceType, sourceEventId: input.sourceEventId }]);
      if (!resolution || resolution.status !== "closed") throw new TRPCError({ code: "CONFLICT", message: "僅已結案的異常事件可補發通知" });
      const actorName = ctx.user.username || ctx.user.openId || "unknown";
      const title = `異常事件結案通知補發：${input.sourceType} #${input.sourceEventId}`;
      const details = [
        `事件來源：${input.sourceType === "loginAudit" ? "登入稽核" : "操作日誌"}`,
        `事件編號：#${input.sourceEventId}`,
        `原處理註記：${resolution.handlingNote}`,
        `補發管理員：${actorName}`,
      ];
      const [ownerResult, emailResult] = await Promise.allSettled([
        notifyOwner({ title, content: details.join("\n") }),
        sendSystemAlertEmail({
          eventKey: `audit-event-closed:${input.sourceType}:${input.sourceEventId}`,
          source: "異常事件處理",
          title,
          summary: `${actorName} 已手動補發結案通知`,
          details,
          force: true,
          kind: "alert",
        }),
      ]);
      const notification = {
        ownerNotified: ownerResult.status === "fulfilled" && ownerResult.value === true,
        emailSent: emailResult.status === "fulfilled" ? emailResult.value.sent : 0,
        emailFailed: emailResult.status === "fulfilled" ? emailResult.value.failed : 1,
        emailSuppressed: emailResult.status === "fulfilled" ? emailResult.value.suppressed : 0,
      };
      await logOperation(ctx.user.id, actorName, "resendAuditEventClosureNotification", "auditEvent", input.sourceEventId, `${input.sourceType}:${input.sourceEventId}`, { sourceType: input.sourceType, sourceEventId: input.sourceEventId, notification });
      return { success: true as const, notification };
    }),
  save: founderProcedure
    .input(z.object({
      sourceType: z.enum(["loginAudit", "operationLog"]),
      sourceEventId: z.number().int().positive(),
      status: z.enum(["in_progress", "closed"]),
      handlingNote: z.string().trim().min(2, "請填寫處理註記").max(1000),
    }))
    .mutation(async ({ ctx, input }) => {
      requireFounderAuditPin(ctx as any);
      const resolution = await upsertAuditEventResolution({ ...input, handledById: ctx.user.id });
      let notification: { ownerNotified: boolean; emailSent: number; emailFailed: number; emailSuppressed: number } | null = null;
      if (resolution.becameClosed) {
        const actorName = ctx.user.username || ctx.user.openId || "unknown";
        const title = `異常事件已結案：${input.sourceType} #${input.sourceEventId}`;
        const details = [
          `事件來源：${input.sourceType === "loginAudit" ? "登入稽核" : "操作日誌"}`,
          `事件編號：#${input.sourceEventId}`,
          `結案管理員：${actorName}`,
          `處理註記：${input.handlingNote}`,
        ];
        const [ownerResult, emailResult] = await Promise.allSettled([
          notifyOwner({ title, content: details.join("\n") }),
          sendSystemAlertEmail({
            eventKey: `audit-event-closed:${input.sourceType}:${input.sourceEventId}`,
            source: "異常事件處理",
            title,
            summary: `${actorName} 已將異常事件結案`,
            details,
            force: true,
            kind: "alert",
          }),
        ]);
        notification = {
          ownerNotified: ownerResult.status === "fulfilled" && ownerResult.value === true,
          emailSent: emailResult.status === "fulfilled" ? emailResult.value.sent : 0,
          emailFailed: emailResult.status === "fulfilled" ? emailResult.value.failed : 1,
          emailSuppressed: emailResult.status === "fulfilled" ? emailResult.value.suppressed : 0,
        };
        if (ownerResult.status === "rejected" || emailResult.status === "rejected") {
          console.error("[AuditEventResolution] Closure notification failed", { sourceType: input.sourceType, sourceEventId: input.sourceEventId });
        }
      }
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "updateAuditEventResolution", "auditEvent", input.sourceEventId, `${input.sourceType}:${input.sourceEventId}`, { sourceType: input.sourceType, status: input.status, handlingNote: input.handlingNote, becameClosed: resolution.becameClosed, notification });
      return { success: true as const, notification };
    }),
});

// ─── Brand Logo Monitoring Router ────────────────────────────────────────────

const brandLogoMonitoringRouter = router({
  reportFailure: publicProcedure
    .input(z.object({
      pagePath: z.string().min(1).max(512),
      failedSrc: z.string().min(1).max(1024),
      deviceClass: z.enum(["mobile", "tablet", "desktop", "unknown"]),
      viewportWidth: z.number().int().positive().max(10000).optional(),
      failureStage: z.enum(["initial", "retry", "fallback"]),
      fallbackSrc: z.string().min(1).max(1024).optional(),
      recoveryOutcome: z.enum(["switched", "text_fallback"]).optional(),
      userAgent: z.string().max(2048).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const monitoringStatus = await getBrandLogoAlertThresholdStatus();
      if (!monitoringStatus.isEnabled) {
        return { success: true, monitoringPaused: true } as const;
      }
      await createBrandLogoLoadFailure({
        ...input,
        reporterUserId: ctx.user?.id,
      });

      if (input.recoveryOutcome === "text_fallback") {
        await notifyOwner({
          title: "Logo 載入失敗備援已啟用",
          content: `頁面：${input.pagePath}\n裝置：${input.deviceClass}\n失敗來源：${input.failedSrc}\n結果：文字備援`,
        });
        try {
          await sendSystemAlertEmail({
            eventKey: `brand-logo-fallback:${input.pagePath}:${input.failedSrc}`,
            source: "品牌 Logo 監測",
            title: "Logo 載入失敗備援已啟用",
            summary: `頁面 ${input.pagePath} 的 Logo 已改用備援顯示`,
            details: [`裝置：${input.deviceClass}`, `失敗資源：${input.failedSrc}`, "結果：文字備援"],
          });
        } catch (error) {
          console.error("[BrandLogoMonitoring] System alert email failed", error);
        }
      }
      return { success: true } as const;
    }),

  summary24h: founderProcedure.query(async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [summary, alert] = await Promise.all([getBrandLogoLoadFailureSummarySince(since), getBrandLogoAlertThresholdStatus()]);
    return { ...summary, since, windowHours: 24, alert: { ...alert, triggered: alert.isEnabled && summary.total >= alert.thresholdCount } };
  }),

  hourlyTrend: founderProcedure.query(async () => getBrandLogoHourlyTrend()),

  setAlertThreshold: founderProcedure
    .input(z.object({ thresholdCount: z.number().int().min(1).max(500), isEnabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await upsertBrandLogoAlertThreshold({ ...input, createdById: ctx.user.id, updatedById: ctx.user.id });
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.name || `user_${ctx.user.id}`, "updateBrandLogoAlertThreshold", "brandLogoMonitoring", undefined, "Logo 異常警示門檻", input);
      return getBrandLogoAlertThresholdStatus();
    }),

  list: founderProcedure
    .input(z.object({
      deviceClass: z.enum(["mobile", "tablet", "desktop", "unknown"]).optional(),
      page: z.number().int().positive().default(1),
      pageSize: z.number().int().positive().max(100).default(30),
    }))
    .query(async ({ input }) => {
      const offset = (input.page - 1) * input.pageSize;
      const [events, total] = await Promise.all([
        getBrandLogoLoadFailures({ deviceClass: input.deviceClass, limit: input.pageSize, offset }),
        getBrandLogoLoadFailureCount({ deviceClass: input.deviceClass }),
      ]);
      return { events, total, page: input.page, pageSize: input.pageSize, totalPages: Math.ceil(total / input.pageSize) };
  }),
});

// ─── System Alert Email Router ───────────────────────────────────────────────

const systemAlertEmailRouter = router({
  list: founderProcedure.query(async ({ ctx }) => {
    const [recipients, deliveries] = await Promise.all([
      getSystemAlertEmailRecipients(true),
      getSystemAlertEmailDeliveries(30),
    ]);
    await logOperation(
      ctx.user.id,
      ctx.user.username || ctx.user.openId || "unknown",
      "viewSystemAlertEmailSettings",
      "systemAlertEmailRecipient",
      undefined,
      "系統異常郵件收件者設定",
      { configuredRecipientCount: recipients.length, activeRecipientCount: recipients.filter((recipient) => recipient.isActive).length }
    );
    return { recipients, deliveries };
  }),

  createRecipient: founderProcedure
    .input(z.object({
      email: z.string().trim().email().max(320),
      label: z.string().trim().max(128).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();
      const existing = await getSystemAlertEmailRecipientByEmail(email);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "此收件信箱已存在，請改為啟用現有項目" });
      }

      const id = await createSystemAlertEmailRecipient({
        email,
        label: input.label || null,
        isActive: true,
        createdById: ctx.user.id,
      });
      await logOperation(
        ctx.user.id,
        ctx.user.username || ctx.user.openId || "unknown",
        "create",
        "systemAlertEmailRecipient",
        id,
        email,
        { label: input.label || null }
      );
      return { success: true, id } as const;
    }),

  setRecipientActive: founderProcedure
    .input(z.object({ id: z.number().int().positive(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await updateSystemAlertEmailRecipientStatus(input.id, input.isActive);
      await logOperation(
        ctx.user.id,
        ctx.user.username || ctx.user.openId || "unknown",
        input.isActive ? "activate" : "deactivate",
        "systemAlertEmailRecipient",
        input.id
      );
      return { success: true } as const;
    }),

  deleteRecipient: founderProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await deleteSystemAlertEmailRecipient(input.id);
      await logOperation(
        ctx.user.id,
        ctx.user.username || ctx.user.openId || "unknown",
        "delete",
        "systemAlertEmailRecipient",
        input.id
      );
      return { success: true } as const;
    }),

  sendTest: founderProcedure.mutation(async () => {
    const result = await sendSystemAlertEmail({
      eventKey: `manual-test:${Date.now()}`,
      source: "系統異常通知設定",
      title: "系統異常郵件測試",
      summary: "這是一封由創始管理員手動發送的測試通知",
      force: true,
    });
    return { success: result.failed === 0, ...result };
  }),
});

// ─── System Reports Router ───────────────────────────────────────────────────

const SYSTEM_REPORT_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const SYSTEM_REPORT_ATTACHMENT_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);
const SYSTEM_REPORT_MAX_FILE_SIZE = 8 * 1024 * 1024;

const REIMBURSEMENT_RECEIPT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
const REIMBURSEMENT_RECEIPT_MAX_FILE_SIZE = 8 * 1024 * 1024;

function sanitizeSystemReportFileName(fileName: string): string {
  const normalized = fileName
    .normalize("NFKC")
    .replace(/[\\/\0]/g, "_")
    .replace(/\.\.+/g, ".")
    .replace(/[^\w\u4e00-\u9fff.()\- ]/g, "_")
    .trim();
  return (normalized || "report-file").slice(0, 180);
}

function parseSystemReportBase64(base64: string): Buffer {
  const normalized = base64.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
  if (!normalized || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "檔案資料格式無效" });
  }
  return Buffer.from(normalized, "base64");
}

function sanitizeReimbursementFileName(fileName: string): string {
  const normalized = fileName.normalize("NFKC").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim();
  return normalized.slice(0, 180) || "receipt";
}

function parseReimbursementBase64(base64: string): Buffer {
  const payload = base64.includes(",") ? base64.split(",").at(-1) ?? "" : base64;
  return Buffer.from(payload, "base64");
}

function createReimbursementClaimNumber() {
  const dateKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).replaceAll("-", "");
  return `RB${dateKey}-${randomInt(1000, 9999)}`;
}

const reimbursementItemInput = z.object({
  expenseDate: z.date(),
  category: z.string().trim().min(1).max(64),
  merchant: z.string().trim().max(160).optional(),
  description: z.string().trim().min(1).max(500),
  amount: z.number().positive().max(9_999_999.99),
});

const systemReportsRouter = router({
  list: staffProcedure.query(async ({ ctx }) => {
    const reports = await getSystemReports();
    await logOperation(
      ctx.user.id,
      ctx.user.username || ctx.user.openId || "unknown",
      "viewSystemReports",
      "systemReport",
      undefined,
      "系統報告管理",
      { resultCount: reports.length }
    );
    return reports;
  }),

  create: staffProcedure
    .input(z.object({
      title: z.string().trim().min(1, "請輸入報告標題").max(160),
      content: z.string().trim().min(1, "請輸入報告內容").max(20_000),
      publishNow: z.boolean().default(false),
      expiresAt: z.coerce.date().nullable().optional(),
      isPinned: z.boolean().default(false),
      priority: z.enum(["normal", "important", "urgent"]).default("normal"),
      mustReadBy: z.coerce.date().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.publishNow && input.expiresAt && input.expiresAt <= new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "有效期限必須晚於目前時間" });
      }
      const mustReadBy = input.priority === "urgent" ? input.mustReadBy ?? null : null;
      if (input.priority === "urgent" && !mustReadBy) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "緊急公告必須設定必讀截止時間" });
      }
      if (mustReadBy && mustReadBy <= new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "必讀截止時間必須晚於目前時間" });
      }
      if (mustReadBy && input.expiresAt && mustReadBy > input.expiresAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "必讀截止時間不得晚於公告有效期限" });
      }
      const status = input.publishNow ? "published" : "draft";
      const id = await createSystemReport({
        title: input.title,
        content: input.content,
        authorId: ctx.user.id,
        status,
        publishedAt: input.publishNow ? new Date() : null,
        expiresAt: input.expiresAt ?? null,
        mustReadBy,
        isPinned: input.isPinned,
        priority: input.priority,
      });
      await logOperation(
        ctx.user.id,
        ctx.user.username || ctx.user.openId || "unknown",
        input.publishNow ? "publishSystemReport" : "createSystemReportDraft",
        "systemReport",
        id,
        input.title,
        { status, expiresAt: input.expiresAt?.toISOString() ?? null, mustReadBy: mustReadBy?.toISOString() ?? null, isPinned: input.isPinned, priority: input.priority }
      );
      return { id, status };
    }),

  updateDraft: staffProcedure
    .input(z.object({
      id: z.number().int().positive(),
      title: z.string().trim().min(1, "請輸入報告標題").max(160),
      content: z.string().trim().min(1, "請輸入報告內容").max(20_000),
      expiresAt: z.coerce.date().nullable().optional(),
      isPinned: z.boolean().default(false),
      priority: z.enum(["normal", "important", "urgent"]).default("normal"),
      mustReadBy: z.coerce.date().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const report = await getSystemReportById(input.id);
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "系統報告不存在" });
      if (report.status !== "draft") throw new TRPCError({ code: "BAD_REQUEST", message: "已發布的報告不可直接修改，請建立新的報告" });
      if (ctx.user.role !== "admin" && report.authorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "只能編輯自己建立的草稿" });
      const mustReadBy = input.priority === "urgent" ? input.mustReadBy ?? null : null;
      if (input.priority === "urgent" && !mustReadBy) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "緊急公告必須設定必讀截止時間" });
      }
      if (mustReadBy && mustReadBy <= new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "必讀截止時間必須晚於目前時間" });
      }
      if (mustReadBy && input.expiresAt && mustReadBy > input.expiresAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "必讀截止時間不得晚於公告有效期限" });
      }
      await updateSystemReportDraft(input.id, {
        title: input.title,
        content: input.content,
        expiresAt: input.expiresAt ?? null,
        mustReadBy,
        isPinned: input.isPinned,
        priority: input.priority,
      });
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "updateSystemReportDraft", "systemReport", input.id, input.title, { isPinned: input.isPinned, priority: input.priority, mustReadBy: mustReadBy?.toISOString() ?? null });
      return { success: true as const };
    }),

  setPinned: staffProcedure
    .input(z.object({ id: z.number().int().positive(), isPinned: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const report = await getSystemReportById(input.id);
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "系統報告不存在" });
      if (ctx.user.role !== "admin" && report.authorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "只能設定自己建立的系統報告" });
      await updateSystemReportPinned(input.id, input.isPinned);
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "setSystemReportPinned", "systemReport", input.id, report.title, { isPinned: input.isPinned });
      return { success: true as const };
    }),

  setPriority: staffProcedure
    .input(z.object({ id: z.number().int().positive(), priority: z.enum(["normal", "important", "urgent"]) }))
    .mutation(async ({ ctx, input }) => {
      const report = await getSystemReportById(input.id);
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "系統報告不存在" });
      if (ctx.user.role !== "admin" && report.authorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "只能設定自己建立的系統報告" });
      if (input.priority === "urgent") throw new TRPCError({ code: "BAD_REQUEST", message: "緊急公告需在草稿中設定必讀截止時間後再發布" });
      await updateSystemReportPriority(input.id, input.priority);
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "setSystemReportPriority", "systemReport", input.id, report.title, { priority: input.priority });
      return { success: true as const };
    }),

  publish: staffProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const report = await getSystemReportById(input.id);
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "系統報告不存在" });
      if (report.status !== "draft") throw new TRPCError({ code: "BAD_REQUEST", message: "此報告已發布或已封存" });
      if (ctx.user.role !== "admin" && report.authorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "只能發布自己建立的草稿" });
      if (report.expiresAt && report.expiresAt <= new Date()) throw new TRPCError({ code: "BAD_REQUEST", message: "有效期限已過，請先更新草稿後再發布" });
      if (report.priority === "urgent" && (!report.mustReadBy || report.mustReadBy <= new Date())) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "緊急公告需要未來的必讀截止時間才能發布" });
      }
      if (report.priority === "urgent" && report.expiresAt && report.mustReadBy && report.mustReadBy > report.expiresAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "必讀截止時間不得晚於公告有效期限" });
      }
      await publishSystemReport(input.id);
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "publishSystemReport", "systemReport", input.id, report.title, { status: "published" });
      return { success: true as const };
    }),

  uploadAsset: staffProcedure
    .input(z.object({
      reportId: z.number().int().positive(),
      assetKind: z.enum(["image", "attachment"]),
      fileName: z.string().trim().min(1).max(255),
      mimeType: z.string().trim().min(1).max(127),
      base64: z.string().min(1).max(12_000_000),
    }))
    .mutation(async ({ ctx, input }) => {
      const report = await getSystemReportById(input.reportId);
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "系統報告不存在" });
      if (report.status !== "draft") throw new TRPCError({ code: "BAD_REQUEST", message: "僅可為草稿新增圖片或附件" });
      if (ctx.user.role !== "admin" && report.authorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "只能管理自己建立的草稿附件" });
      const allowedTypes = input.assetKind === "image" ? SYSTEM_REPORT_IMAGE_MIME_TYPES : SYSTEM_REPORT_ATTACHMENT_MIME_TYPES;
      if (!allowedTypes.has(input.mimeType)) throw new TRPCError({ code: "BAD_REQUEST", message: "不支援此檔案格式" });
      const file = parseSystemReportBase64(input.base64);
      if (file.length === 0 || file.length > SYSTEM_REPORT_MAX_FILE_SIZE) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "單一圖片或附件必須介於 1 位元組至 8 MB 之間" });
      }
      const fileName = sanitizeSystemReportFileName(input.fileName);
      const { key, url } = await storagePut(`system-reports/${input.reportId}/${input.assetKind}/${fileName}`, file, input.mimeType);
      const id = await createSystemReportAsset({
        reportId: input.reportId,
        assetKind: input.assetKind,
        fileName,
        storageKey: key,
        url,
        mimeType: input.mimeType,
        sizeBytes: file.length,
        uploadedById: ctx.user.id,
      });
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "uploadSystemReportAsset", "systemReportAsset", id, fileName, {
        reportId: input.reportId,
        assetKind: input.assetKind,
        mimeType: input.mimeType,
        sizeBytes: file.length,
      });
      return { id, fileName, url, assetKind: input.assetKind, mimeType: input.mimeType, sizeBytes: file.length };
    }),

  removeAsset: staffProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const asset = await getSystemReportAssetById(input.id);
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "報告檔案不存在" });
      const report = await getSystemReportById(asset.reportId);
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "系統報告不存在" });
      if (report.status !== "draft") throw new TRPCError({ code: "BAD_REQUEST", message: "已發布報告的附件不可移除" });
      if (ctx.user.role !== "admin" && report.authorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "只能管理自己建立的草稿附件" });
      await deleteSystemReportAsset(input.id);
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "removeSystemReportAsset", "systemReportAsset", input.id, asset.fileName, { reportId: report.id, assetKind: asset.assetKind });
      return { success: true as const };
    }),

  statistics: adminProcedure.query(async ({ ctx }) => {
    const statistics = await getSystemReportReadStatistics();
    await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "viewSystemReportStatistics", "systemReport", undefined, "系統報告閱讀統計", { resultCount: statistics.length });
    return statistics;
  }),

  unreadUrgentRecipients: adminProcedure.query(async ({ ctx }) => {
    const reports = await getUnreadUrgentSystemReportAudiences();
    await logOperation(
      ctx.user.id,
      ctx.user.username || ctx.user.openId || "unknown",
      "viewUrgentSystemReportUnreadRecipients",
      "auditView",
      undefined,
      "緊急公告未讀名單",
      { reportCount: reports.length, unreadUserCount: reports.reduce((total, report) => total + report.unreadCount, 0) }
    );
    return reports;
  }),

  unread: protectedProcedure.query(async ({ ctx }) => getUnreadSystemReports(ctx.user.id)),

  inbox: protectedProcedure.query(async ({ ctx }) => getSystemReportInbox(ctx.user.id)),

  trackDownload: protectedProcedure
    .input(z.object({ assetId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const asset = await getSystemReportAssetById(input.assetId);
      if (!asset || asset.assetKind !== "attachment") throw new TRPCError({ code: "NOT_FOUND", message: "找不到可下載的系統報告附件" });
      const report = await getSystemReportById(asset.reportId);
      if (!report || report.status !== "published" || (report.expiresAt && report.expiresAt <= new Date())) {
        throw new TRPCError({ code: "NOT_FOUND", message: "找不到可下載的系統報告附件" });
      }
      await incrementSystemReportAssetDownloadCount(asset.id);
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "downloadSystemReportAsset", "systemReportAsset", asset.id, asset.fileName, { reportId: report.id });
      return { success: true as const };
    }),

  markRead: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const report = await getSystemReportById(input.id);
      if (!report || report.status !== "published" || (report.expiresAt && report.expiresAt <= new Date())) {
        throw new TRPCError({ code: "NOT_FOUND", message: "找不到可閱讀的系統報告" });
      }
      await markSystemReportRead({ reportId: input.id, userId: ctx.user.id });
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "readSystemReport", "systemReport", input.id, report.title);
      return { success: true as const };
    }),
});

// ─── Reimbursement Claims ────────────────────────────────────────────────────

const reimbursementRouter = router({
  myList: protectedProcedure.query(async ({ ctx }) => {
    const claims = await getReimbursementClaims({ requesterId: ctx.user.id });
    await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "viewMyReimbursementClaims", "auditView", undefined, "我的報帳清單", { resultCount: claims.length });
    return claims;
  }),

  list: staffProcedure.query(async ({ ctx }) => {
    const claims = await getReimbursementClaims();
    await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "viewReimbursementClaims", "auditView", undefined, "報帳審核清單", { resultCount: claims.length });
    return claims;
  }),

  create: protectedProcedure
    .input(z.object({ title: z.string().trim().min(1).max(160), purpose: z.string().trim().max(2_000).optional(), items: z.array(reimbursementItemInput).min(1).max(40) }))
    .mutation(async ({ ctx, input }) => {
      const totalAmount = input.items.reduce((total, item) => total + item.amount, 0);
      let id: number | null = null;
      let claimNumber = "";
      let retryCount = 0;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        claimNumber = createReimbursementClaimNumber();
        try {
          id = await createReimbursementClaim({
            claimNumber,
            requesterId: ctx.user.id,
            title: input.title,
            purpose: input.purpose || null,
            totalAmount: totalAmount.toFixed(2),
            status: "draft",
          }, input.items.map((item) => ({
            expenseDate: item.expenseDate,
            category: item.category,
            merchant: item.merchant || null,
            description: item.description,
            amount: item.amount.toFixed(2),
          })));
          break;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const isClaimNumberConflict = /ER_DUP_ENTRY|duplicate entry|claimNumber/i.test(message);
          if (!isClaimNumberConflict || attempt === 2) throw error;
          retryCount += 1;
        }
      }
      if (id === null) throw new TRPCError({ code: "CONFLICT", message: "系統未能取得可用的報帳編號，請稍後再試" });
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "createReimbursementClaim", "reimbursementClaim", id, claimNumber, { itemCount: input.items.length, totalAmount: totalAmount.toFixed(2), status: "draft", claimNumberRetryCount: retryCount });
      return { success: true as const, id, claimNumber, retryCount };
    }),

  uploadReceipt: protectedProcedure
    .input(z.object({ claimId: z.number().int().positive(), itemId: z.number().int().positive().optional(), fileName: z.string().trim().min(1).max(255), mimeType: z.string().trim().min(1).max(127), base64: z.string().min(1).max(12_000_000) }))
    .mutation(async ({ ctx, input }) => {
      const claim = await getReimbursementClaimById(input.claimId);
      if (!claim) throw new TRPCError({ code: "NOT_FOUND", message: "報帳單不存在" });
      if (claim.requesterId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "只能管理自己的報帳收據" });
      if (claim.status !== "draft") throw new TRPCError({ code: "BAD_REQUEST", message: "僅可為草稿報帳單新增收據" });
      if (input.itemId && !claim.items.some((item) => item.id === input.itemId)) throw new TRPCError({ code: "BAD_REQUEST", message: "指定的報帳明細不屬於此報帳單" });
      if (!REIMBURSEMENT_RECEIPT_MIME_TYPES.has(input.mimeType)) throw new TRPCError({ code: "BAD_REQUEST", message: "收據僅支援 JPG、PNG、WebP 或 PDF 格式" });
      const file = parseReimbursementBase64(input.base64);
      if (file.length === 0 || file.length > REIMBURSEMENT_RECEIPT_MAX_FILE_SIZE) throw new TRPCError({ code: "BAD_REQUEST", message: "單一收據必須介於 1 位元組至 8 MB 之間" });
      const fileName = sanitizeReimbursementFileName(input.fileName);
      const { key, url } = await storagePut(`reimbursements/${claim.id}/receipts/${Date.now()}-${fileName}`, file, input.mimeType);
      const id = await createReimbursementReceipt({ claimId: claim.id, itemId: input.itemId ?? null, fileName, storageKey: key, url, mimeType: input.mimeType, sizeBytes: file.length, uploadedById: ctx.user.id });
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "uploadReimbursementReceipt", "reimbursementReceipt", id, fileName, { claimId: claim.id, itemId: input.itemId ?? null, mimeType: input.mimeType, sizeBytes: file.length });
      return { id, fileName, url, mimeType: input.mimeType, sizeBytes: file.length };
    }),

  removeReceipt: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const receipt = await getReimbursementReceiptById(input.id);
      if (!receipt) throw new TRPCError({ code: "NOT_FOUND", message: "收據附件不存在" });
      const claim = await getReimbursementClaimById(receipt.claimId);
      if (!claim) throw new TRPCError({ code: "NOT_FOUND", message: "報帳單不存在" });
      if (claim.requesterId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "只能管理自己的報帳收據" });
      if (claim.status !== "draft") throw new TRPCError({ code: "BAD_REQUEST", message: "已送審的報帳單不可移除收據" });
      await deleteReimbursementReceipt(receipt.id);
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "removeReimbursementReceipt", "reimbursementReceipt", receipt.id, receipt.fileName, { claimId: claim.id });
      return { success: true as const };
    }),

  submit: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const claim = await getReimbursementClaimById(input.id);
      if (!claim) throw new TRPCError({ code: "NOT_FOUND", message: "報帳單不存在" });
      if (claim.requesterId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "只能送審自己的報帳單" });
      if (claim.status !== "draft") throw new TRPCError({ code: "BAD_REQUEST", message: "僅草稿狀態可送審" });
      if (claim.items.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "報帳單至少需要一筆支出明細" });
      await updateReimbursementClaimStatus(claim.id, { status: "submitted", submittedAt: new Date(), reviewedById: null, reviewedAt: null, reviewNote: null, paidById: null, paidAt: null });
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "submitReimbursementClaim", "reimbursementClaim", claim.id, claim.claimNumber, { totalAmount: claim.totalAmount, itemCount: claim.items.length, receiptCount: claim.receipts.length });
      return { success: true as const };
    }),

  review: staffProcedure
    .input(z.object({ id: z.number().int().positive(), decision: z.enum(["approved", "rejected"]), reviewNote: z.string().trim().min(1).max(1_000) }))
    .mutation(async ({ ctx, input }) => {
      const claim = await getReimbursementClaimById(input.id);
      if (!claim) throw new TRPCError({ code: "NOT_FOUND", message: "報帳單不存在" });
      if (claim.status !== "submitted") throw new TRPCError({ code: "BAD_REQUEST", message: "僅已送審的報帳單可審核" });
      if (claim.requesterId === ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "不可審核自己提出的報帳單" });
      const reviewedAt = new Date();
      await updateReimbursementClaimStatus(claim.id, { status: input.decision, submittedAt: claim.submittedAt, reviewedById: ctx.user.id, reviewedAt, reviewNote: input.reviewNote, paidById: null, paidAt: null });
      const decisionLabel = input.decision === "approved" ? "已通過審核" : "已退回";
      const notificationId = await createReimbursementNotification({
        claimId: claim.id,
        recipientId: claim.requesterId,
        notificationType: input.decision,
        message: input.decision === "approved"
          ? `您的報帳單「${claim.title}」（${claim.claimNumber}）${decisionLabel}`
          : `您的報帳單「${claim.title}」（${claim.claimNumber}）${decisionLabel}，請查看審核意見：${input.reviewNote}`,
      });
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "reviewReimbursementClaim", "reimbursementClaim", claim.id, claim.claimNumber, { decision: input.decision, requesterId: claim.requesterId, totalAmount: claim.totalAmount, reviewNote: input.reviewNote, notificationId });
      return { success: true as const };
    }),

  unreadNotifications: protectedProcedure.query(({ ctx }) => getUnreadReimbursementNotifications(ctx.user.id)),

  markNotificationsRead: protectedProcedure
    .input(z.object({ ids: z.array(z.number().int().positive()).min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      await markReimbursementNotificationsRead(input.ids, ctx.user.id);
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "acknowledgeReimbursementNotifications", "reimbursementNotification", undefined, "報帳審核通知", { notificationCount: input.ids.length });
      return { success: true as const };
    }),

  recordPdfExport: protectedProcedure
    .input(z.object({ id: z.number().int().positive(), mode: z.enum(["download", "print"]) }))
    .mutation(async ({ ctx, input }) => {
      const claim = await getReimbursementClaimById(input.id);
      if (!claim) throw new TRPCError({ code: "NOT_FOUND", message: "報帳單不存在" });
      if (claim.status !== "approved" && claim.status !== "paid") throw new TRPCError({ code: "BAD_REQUEST", message: "僅已核准或已付款的報帳單可匯出 PDF" });
      if (claim.requesterId !== ctx.user.id && ctx.user.role === "student") throw new TRPCError({ code: "FORBIDDEN", message: "無權匯出此報帳單" });
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", input.mode === "download" ? "exportReimbursementPdf" : "printReimbursementPdf", "reimbursementClaim", claim.id, claim.claimNumber, { status: claim.status, requesterId: claim.requesterId, totalAmount: claim.totalAmount });
      return { success: true as const };
    }),

  markPaid: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const claim = await getReimbursementClaimById(input.id);
      if (!claim) throw new TRPCError({ code: "NOT_FOUND", message: "報帳單不存在" });
      if (claim.status !== "approved") throw new TRPCError({ code: "BAD_REQUEST", message: "僅已核准的報帳單可標記付款完成" });
      const paidAt = new Date();
      await updateReimbursementClaimStatus(claim.id, { status: "paid", submittedAt: claim.submittedAt, reviewedById: claim.reviewedById, reviewedAt: claim.reviewedAt, reviewNote: claim.reviewNote, paidById: ctx.user.id, paidAt });
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "markReimbursementClaimPaid", "reimbursementClaim", claim.id, claim.claimNumber, { requesterId: claim.requesterId, totalAmount: claim.totalAmount, paidAt: paidAt.toISOString() });
      return { success: true as const };
    }),

  directPublishAndPay: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const claim = await getReimbursementClaimById(input.id);
      if (!claim) throw new TRPCError({ code: "NOT_FOUND", message: "報帳單不存在" });
      if (claim.status !== "draft" && claim.status !== "submitted") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "僅草稿或已送審的報帳單可直接發布並付款" });
      }
      if (claim.items.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "報帳單至少需要一筆支出明細" });
      const processedAt = new Date();
      const reviewNote = "管理員直接發布並付款（免審核流程）";
      await updateReimbursementClaimStatus(claim.id, {
        status: "paid",
        submittedAt: claim.submittedAt ?? processedAt,
        reviewedById: ctx.user.id,
        reviewedAt: processedAt,
        reviewNote,
        paidById: ctx.user.id,
        paidAt: processedAt,
      });
      const notificationId = await createReimbursementNotification({
        claimId: claim.id,
        recipientId: claim.requesterId,
        notificationType: "approved",
        message: `您的報帳單「${claim.title}」（${claim.claimNumber}）已由管理員直接發布並標記付款完成`,
      });
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "directPublishAndPayReimbursementClaim", "reimbursementClaim", claim.id, claim.claimNumber, {
        requesterId: claim.requesterId,
        totalAmount: claim.totalAmount,
        previousStatus: claim.status,
        reviewNote,
        notificationId,
        processedAt: processedAt.toISOString(),
      });
      return { success: true as const };
    }),
});

// ─── Account Activation Certificate Verification Router ──────────────────────

const activationCertificatesRouter = router({
  verify: publicProcedure
    .input(z.object({ code: z.string().trim().min(1).max(96).optional(), certificateNumber: z.string().trim().min(1).max(128).optional() }).refine((input) => Boolean(input.code || input.certificateNumber), { message: "請輸入 QR Code 或啟用書編號" }))
    .query(async ({ input }) => {
      const record = input.code
        ? await getAccountActivationCertificateExportByVerificationToken(input.code)
        : await getLatestAccountActivationCertificateExportByNumber(input.certificateNumber!);
      if (!record || (input.certificateNumber && record.certificateNumber !== input.certificateNumber)) {
        return { isValid: false as const, status: "not_found" as const };
      }
      if (record.status !== "valid") {
        return {
          isValid: false as const,
          status: record.status,
          certificateNumber: record.certificateNumber,
          issuedAt: record.createdAt,
          documentType: "帳號啟用書" as const,
          reason: record.statusReason,
          statusChangedAt: record.statusChangedAt,
        };
      }
      return {
        isValid: true as const,
        status: "valid" as const,
        certificateNumber: record.certificateNumber,
        issuedAt: record.createdAt,
        documentType: "帳號啟用書" as const,
      };
    }),

  listExports: founderProcedure.query(async ({ ctx }) => {
    const records = await getAccountActivationCertificateExports();
    await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "viewAccountActivationCertificateExports", "auditView", undefined, "啟用書 PDF 匯出紀錄", { resultCount: records.length });
    return records;
  }),

  changeStatus: founderProcedure
    .input(z.object({ id: z.number().int().positive(), status: z.enum(["revoked", "expired"]), reason: z.string().trim().min(3, "請至少填寫 3 個字的原因").max(1000) }))
    .mutation(async ({ ctx, input }) => {
      const record = await getAccountActivationCertificateExportById(input.id);
      if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "找不到啟用書 PDF 紀錄" });
      const updated = await updateAccountActivationCertificateExportStatus({ id: record.id, status: input.status, reason: input.reason, changedById: ctx.user.id });
      if (!updated) throw new TRPCError({ code: "CONFLICT", message: "此文件已非有效狀態，無法再次變更" });
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", input.status === "revoked" ? "revokeAccountActivationCertificate" : "expireAccountActivationCertificate", "accountActivationCertificateExport", record.id, record.fileName, { certificateNumber: record.certificateNumber, reason: input.reason });
      return { success: true as const };
    }),

  createDownload: adminProcedure
    .input(z.object({ accountId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const target = await getUserById(input.accountId);
      if (!target || target.isActive === false || isTestAccount(target)) throw new TRPCError({ code: "NOT_FOUND", message: "找不到可匯出的帳號啟用書" });
      const account = { id: target.id, username: target.username, name: target.name, role: target.role, createdAt: target.createdAt };
      const certificate = buildAccountActivationCertificate(account);
      const pdf = await buildAccountActivationCertificatePdf({ account, certificate, isTemporaryPassword: Boolean(target.isTemporaryPassword), assetBaseUrl: getRequestAssetBaseUrl(ctx.req) });
      const record = await storeAccountActivationCertificatePdf({
        accountId: target.id,
        generatedById: ctx.user.id,
        source: "manual_download",
        artifact: { certificate, pdf, fileName: `清水高中媒體服務隊管理系統-帳號啟用書-${target.id}.pdf` },
      });
      await markAccountActivationCertificateExportDownloaded(record.id);
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "createAccountActivationCertificateDownload", "user", target.id, target.username || target.name || `user_${target.id}`, { certificateNumber: certificate.certificateNumber, exportId: record.id });
      return { exportId: record.id, fileName: record.fileName, downloadUrl: await storageGetSignedUrl(record.storageKey) };
    }),

  getDownload: founderProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const record = await getAccountActivationCertificateExportById(input.id);
      if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "找不到啟用書 PDF 紀錄" });
      await markAccountActivationCertificateExportDownloaded(record.id);
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "downloadAccountActivationCertificateExport", "accountActivationCertificateExport", record.id, record.fileName, { certificateNumber: record.certificateNumber, downloadCountAfterRequest: record.downloadCount + 1 });
      return { exportId: record.id, fileName: record.fileName, downloadUrl: await storageGetSignedUrl(record.storageKey) };
    }),
});

const protectedAccountSecurityRouter = router({
  overview: founderProcedure.query(async ({ ctx }) => {
    requireFounderAuditPin(ctx as any);
    const account = await getUserById(ctx.user.id);
    if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "找不到受保護帳號" });
    const [securityStatuses, operationEntries, loginEntries, twoFactorAuthenticator, loginPinFailures, auditPinFailures] = await Promise.all([
      getUserLoginSecurityStatuses(),
      getOperationLogs({ userId: account.id, limit: 30 }),
      account.username ? getLoginAuditLogs({ username: account.username, limit: 20 }) : Promise.resolve([]),
      getTwoFactorAuthenticator(account.id),
      getLoginPinFailureAttempts(account.id),
      getPinFailureAttempts(account.id),
    ]);
    const security = securityStatuses.find((entry) => entry.userId === account.id);
    const safeAccount = {
      id: account.id,
      username: account.username,
      name: account.name,
      realName: account.realName,
      role: account.role,
      isActive: account.isActive,
      isFounder: account.isFounder,
      twoFactorEnabled: Boolean(twoFactorAuthenticator),
      hasLoginPin: Boolean(account.loginPinHash),
      hasAuditPin: Boolean(account.auditPinHash),
      lastSignedIn: account.lastSignedIn,
      passwordChangedAt: account.passwordChangedAt,
      createdAt: account.createdAt,
    };
    const loginSummary = {
      total: loginEntries.length,
      successful: loginEntries.filter((entry) => entry.status === "success").length,
      failed: loginEntries.filter((entry) => entry.status === "failed").length,
      lastLoginAt: loginEntries[0]?.loginAt ?? null,
    };
    await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "viewProtectedAccountSecuritySummary", "auditView", account.id, account.username || account.name || `user_${account.id}`, { operationEntryCount: operationEntries.length, loginEntryCount: loginEntries.length });
    return {
      account: safeAccount,
      loginSecurity: security ?? { attemptCount: 0, lastAttemptAt: null, lockedUntil: null, isLocked: false, remainingSeconds: 0 },
      loginPinSecurity: {
        attemptCount: loginPinFailures?.attemptCount ?? 0,
        lastAttemptAt: loginPinFailures?.lastAttemptAt ?? null,
        lockedUntil: loginPinFailures?.lockedUntil ?? null,
        isLocked: Boolean(loginPinFailures?.lockedUntil && new Date() < loginPinFailures.lockedUntil),
        remainingSeconds: loginPinFailures?.lockedUntil && new Date() < loginPinFailures.lockedUntil ? Math.min(900, Math.ceil((loginPinFailures.lockedUntil.getTime() - Date.now()) / 1000)) : 0,
      },
      auditPinSecurity: {
        attemptCount: auditPinFailures?.attemptCount ?? 0,
        lastAttemptAt: auditPinFailures?.lastAttemptAt ?? null,
        lockedUntil: auditPinFailures?.lockedUntil ?? null,
        isLocked: Boolean(auditPinFailures?.lockedUntil && new Date() < auditPinFailures.lockedUntil),
        remainingSeconds: auditPinFailures?.lockedUntil && new Date() < auditPinFailures.lockedUntil ? Math.min(900, Math.ceil((auditPinFailures.lockedUntil.getTime() - Date.now()) / 1000)) : 0,
      },
      loginSummary,
      recentLogins: loginEntries,
      protectedOperations: operationEntries,
    };
  }),

  recordFullIpView: founderProcedure
    .input(z.object({ sourceType: z.enum(["loginAudit", "operationLog", "auditCenter"]), sourceEventId: z.number().int().positive().optional() }))
    .mutation(async ({ ctx, input }) => {
      requireFounderAuditPin(ctx as any);
      await logOperation(ctx.user.id, ctx.user.username || ctx.user.openId || "unknown", "viewFullAuditIpAddress", "auditIpAddress", input.sourceEventId, `${input.sourceType}:${input.sourceEventId ?? "session"}`, {
        sourceType: input.sourceType,
        sourceEventId: input.sourceEventId,
        access: "hover-or-focus-reveal",
      }, getClientIpAddress(ctx as any), String(ctx.req.headers["user-agent"] || "unknown"));
      return { success: true as const };
    }),
});

const systemMaintenanceRouter = router({
  status: publicProcedure.query(async () => {
    const [settings, recoveryNotice] = await Promise.all([
      getSystemMaintenanceSettings(),
      getLatestSystemRecoveryNotice(),
    ]);
    const status = resolveSystemMode(settings);
    return {
      ...status,
      updatedAt: settings?.updatedAt ?? null,
      recoveryNotice,
    };
  }),

  settings: founderProcedure.query(async () => {
    const settings = await getSystemMaintenanceSettings();
    const status = resolveSystemMode(settings);
    return {
      ...status,
      updatedAt: settings?.updatedAt ?? null,
      updatedById: settings?.updatedById ?? null,
      scheduledById: settings?.scheduledById ?? null,
    };
  }),

  history: founderProcedure.query(async ({ ctx }) => {
    requireFounderAuditPin(ctx as any);
    return getSystemModeHistory();
  }),

  setMode: founderProcedure
    .input(z.object({
      systemMode: z.enum(["online", "maintenance", "offline"]),
      announcement: z.string().trim().max(600).nullable().optional(),
      estimatedRestoredAt: z.date().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const previousSettings = await getSystemMaintenanceSettings();
      const previousSystemMode = resolveSystemMode(previousSettings).systemMode;
      if (input.estimatedRestoredAt && input.estimatedRestoredAt.getTime() <= Date.now()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "預計恢復時間必須晚於目前時間" });
      }
      const settings = await upsertSystemMaintenanceSettings({
        systemMode: input.systemMode,
        scheduledMode: null,
        scheduledFor: null,
        scheduledById: null,
        announcement: input.systemMode === "online" ? null : input.announcement ?? null,
        estimatedRestoredAt: input.systemMode === "online" ? null : input.estimatedRestoredAt ?? null,
        updatedById: ctx.user.id,
      });
      if (!settings) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "無法更新系統維護狀態" });

      const modeDetails = {
        online: { action: "setSystemOnlineMode", label: "SYSTEM ONLINE" },
        maintenance: { action: "enableSystemMaintenanceMode", label: "SYSTEM MAINTENANCE" },
        offline: { action: "enableSystemOfflineMode", label: "SYSTEM OFFLINE" },
      } as const;
      const modeDetail = modeDetails[input.systemMode];

      await logOperation(
        ctx.user.id,
        ctx.user.username || ctx.user.openId || "unknown",
        modeDetail.action,
        "systemMaintenance",
        settings.id,
        modeDetail.label,
        {
          systemMode: input.systemMode,
          previousSystemMode,
          maintenanceMode: input.systemMode === "maintenance",
          nonFounderAccess: input.systemMode === "online" ? "allowed" : "revoked",
          announcement: input.systemMode === "online" ? null : input.announcement ?? null,
          estimatedRestoredAt: input.systemMode === "online" ? null : input.estimatedRestoredAt ?? null,
        }
      );

      return {
        ...resolveSystemMode(settings),
        updatedAt: settings.updatedAt,
      };
    }),

  scheduleMode: founderProcedure
    .input(z.object({
      systemMode: z.enum(["maintenance", "offline"]),
      scheduledFor: z.date(),
      announcement: z.string().trim().max(600).nullable().optional(),
      estimatedRestoredAt: z.date().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.scheduledFor.getTime() <= Date.now()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "預告開始時間必須晚於目前時間" });
      }
      if (input.estimatedRestoredAt && input.estimatedRestoredAt.getTime() <= input.scheduledFor.getTime()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "預計恢復時間必須晚於預告開始時間" });
      }
      const settings = await upsertSystemMaintenanceSettings({
        systemMode: "online",
        scheduledMode: input.systemMode,
        scheduledFor: input.scheduledFor,
        scheduledById: ctx.user.id,
        announcement: input.announcement ?? null,
        estimatedRestoredAt: input.estimatedRestoredAt ?? null,
        updatedById: ctx.user.id,
      });
      if (!settings) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "無法建立系統模式預告" });
      await logOperation(
        ctx.user.id,
        ctx.user.username || ctx.user.openId || "unknown",
        "scheduleSystemModeChange",
        "systemMaintenance",
        settings.id,
        `SCHEDULE ${input.systemMode.toUpperCase()}`,
        { systemMode: input.systemMode, scheduledFor: input.scheduledFor, announcement: input.announcement ?? null, estimatedRestoredAt: input.estimatedRestoredAt ?? null }
      );
      return { ...resolveSystemMode(settings), updatedAt: settings.updatedAt };
    }),

  cancelScheduledMode: founderProcedure.mutation(async ({ ctx }) => {
    const current = await getSystemMaintenanceSettings();
    if (!current?.scheduledMode || !current.scheduledFor) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "目前沒有待執行的系統模式預告" });
    }
    const settings = await upsertSystemMaintenanceSettings({
      systemMode: current.systemMode,
      scheduledMode: null,
      scheduledFor: null,
      scheduledById: null,
      announcement: null,
      estimatedRestoredAt: null,
      updatedById: ctx.user.id,
    });
    if (!settings) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "無法取消系統模式預告" });
    await logOperation(
      ctx.user.id,
      ctx.user.username || ctx.user.openId || "unknown",
      "cancelScheduledSystemMode",
      "systemMaintenance",
      settings.id,
      "CANCEL SYSTEM MODE SCHEDULE",
      { previousScheduledMode: current.scheduledMode, previousScheduledFor: current.scheduledFor }
    );
    return { ...resolveSystemMode(settings), updatedAt: settings.updatedAt };
  }),
});

const emailOfflineCommandRouter = router({
  settings: founderProcedure.query(async ({ ctx }) => {
    const settings = await getEmailOfflineCommandSettings();
    const authorizedSenders = settings ? await getEmailOfflineCommandAuthorizedSenders(settings.id) : [];
    return {
      recipientEmail: settings?.recipientEmail ?? null,
      isEnabled: settings?.isEnabled ?? false,
      hasCommandSecret: Boolean(settings?.encryptedCommandSecret),
      updatedAt: settings?.updatedAt ?? null,
      authorizedSenders: authorizedSenders.map((sender) => ({
        id: sender.id,
        email: sender.senderEmail,
        label: sender.label,
        isActive: sender.isActive,
        updatedAt: sender.updatedAt,
      })),
      commandSubject: GMAIL_OFFLINE_COMMAND_SUBJECT,
      commandBody: GMAIL_OFFLINE_COMMAND_BODY,
      gmailAutomationLabel: GMAIL_OFFLINE_COMMAND_LABEL,
      appsScriptAutomation: {
        endpointPath: APPS_SCRIPT_OFFLINE_COMMAND_PATH,
        lastTriggeredAt: settings?.gmailLastPolledAt ?? null,
        lastTriggerError: settings?.gmailLastPollError ?? null,
      },
    };
  }),

  save: founderProcedure
    .input(z.object({
      recipientEmail: z.string().trim().email().max(320),
      authorizedSenders: z.array(z.object({
        email: z.string().trim().email().max(320),
        label: z.string().trim().max(128).nullable().optional(),
        isActive: z.boolean().default(true),
      })).min(1).max(8),
      isEnabled: z.boolean(),
      rotateCommandSecret: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const current = await getEmailOfflineCommandSettings();
      const normalizedRecipientEmail = input.recipientEmail.toLowerCase();
      const senderByEmail: Record<string, { email: string; label: string | null; isActive: boolean }> = {};
      input.authorizedSenders.forEach((sender) => {
        const email = sender.email.toLowerCase();
        senderByEmail[email] = { email, label: sender.label ?? null, isActive: sender.isActive };
      });
      const deduplicatedSenders = Object.keys(senderByEmail).map((email) => senderByEmail[email]);
      if (deduplicatedSenders.length !== input.authorizedSenders.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "授權寄件者不可重複" });
      }
      if (input.isEnabled && !deduplicatedSenders.some((sender) => sender.isActive)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "啟用 Gmail 離線指令時，至少需要一個已啟用的授權寄件者" });
      }
      const shouldRotate = input.rotateCommandSecret || !current?.encryptedCommandSecret;
      const commandSecret = shouldRotate ? generateGmailOfflineCommandSecret() : null;
      const encryptedCommandSecret = commandSecret
        ? encryptEmailOfflineCommandSecret(commandSecret)
        : current?.encryptedCommandSecret ?? null;
      if (input.isEnabled && !encryptedCommandSecret) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "啟用前必須建立離線指令密鑰" });
      }
      const settings = await upsertEmailOfflineCommandSettings({
        recipientEmail: normalizedRecipientEmail,
        encryptedCommandSecret,
        isEnabled: input.isEnabled,
        authorizedById: ctx.user.id,
      });
      if (!settings) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "無法儲存授權郵件設定" });
      await replaceEmailOfflineCommandAuthorizedSenders({
        settingsId: settings.id,
        senders: deduplicatedSenders,
        createdById: ctx.user.id,
      });
      await logOperation(
        ctx.user.id,
        ctx.user.username || ctx.user.openId || "unknown",
        "configureAuthorizedOfflineEmail",
        "emailOfflineCommand",
        settings.id,
        normalizedRecipientEmail,
        {
          recipientEmail: normalizedRecipientEmail,
          authorizedSenderCount: deduplicatedSenders.length,
          activeAuthorizedSenderCount: deduplicatedSenders.filter((sender) => sender.isActive).length,
          authorizedSenders: deduplicatedSenders.map((sender) => ({ email: sender.email, isActive: sender.isActive })),
          isEnabled: input.isEnabled,
          commandSecretRotated: shouldRotate,
          provider: "gmail_apps_script",
        },
      );
      return {
        recipientEmail: settings.recipientEmail,
        isEnabled: settings.isEnabled,
        hasCommandSecret: Boolean(settings.encryptedCommandSecret),
        commandSecret,
      };
    }),

  history: founderProcedure.query(async ({ ctx }) => {
    return getRecentEmailOfflineCommandReceipts(50);
  }),
});

// ─── App Router ───────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    mobileMe: protectedProcedure.query(({ ctx }) => ({
      id: ctx.user.id,
      username: ctx.user.username,
      name: ctx.user.name,
      role: ctx.user.role,
      isFounder: ctx.user.isFounder,
      avatarUrl: ctx.user.avatarUrl,
      isActive: ctx.user.isActive,
    })),
    logout: publicProcedure.input(z.object({ reason: z.enum(["manual", "idle", "system"]).optional(), systemMode: z.enum(["maintenance", "offline"]).optional() }).optional()).mutation(async ({ ctx, input }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      const isNativeBearerSession = /^Bearer\s+/i.test(String(ctx.req.headers.authorization || ""));
      if (isNativeBearerSession && ctx.user && ctx.sessionDeviceId) {
        await revokeLoginDevice(ctx.user.id, ctx.sessionDeviceId);
      }
      if (input?.reason === "idle" && ctx.user) {
        await logOperation(
          ctx.user.id,
          ctx.user.username || ctx.user.openId || "unknown",
          "idleTimeoutLogout",
          "authSession",
          ctx.user.id,
          "工作階段閒置逾時登出",
          { idleTimeoutMinutes: 30 }
        );
      }
      if (input?.reason === "system" && ctx.user && input.systemMode) {
        await logOperation(
          ctx.user.id,
          ctx.user.username || ctx.user.openId || "unknown",
          "systemModeForcedLogout",
          "authSession",
          ctx.user.id,
          input.systemMode === "maintenance" ? "SYSTEM MAINTENANCE" : "SYSTEM OFFLINE",
          { systemMode: input.systemMode, access: "revoked" }
        );
      }
      return { success: true } as const;
    }),
  }),
  customAuth: customAuthRouter,
  accountSecurity: accountSecurityRouter,
  ipBlacklist: ipBlacklistRouter,
  protectedAccountSecurity: protectedAccountSecurityRouter,
  users: usersRouter,
  equipment: equipmentRouter,
  borrowRequests: borrowRequestsRouter,
  borrowRecords: borrowRecordsRouter,
  dashboard: dashboardRouter,
  loginAudit: loginAuditRouter,
  operationLogs: operationLogsRouter,
  auditEventResolutions: auditEventResolutionsRouter,
  systemMaintenance: systemMaintenanceRouter,
  emailOfflineCommand: emailOfflineCommandRouter,
  brandLogoMonitoring: brandLogoMonitoringRouter,
  systemAlertEmail: systemAlertEmailRouter,
  activationCertificates: activationCertificatesRouter,
  systemReports: systemReportsRouter,
  reimbursements: reimbursementRouter,
  profile: router({
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      const preferences = await getUserPreferences(ctx.user.id);
      return { user, preferences };
    }),
    dynamicUserQrCode: protectedProcedure.query(({ ctx }) => {
      return issueDynamicUserQrCode(ctx.user.id);
    }),
    passwordChangeStatus: protectedProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      if (!user?.passwordHash || user.isTemporaryPassword) return { applies: false as const, isDue: false as const, passwordChangedAt: null, dueAt: null, daysRemaining: null };
      const dueAt = new Date(user.passwordChangedAt);
      dueAt.setUTCDate(dueAt.getUTCDate() + 180);
      const daysRemaining = Math.ceil((dueAt.getTime() - Date.now()) / 86_400_000);
      return { applies: true as const, isDue: daysRemaining <= 0, passwordChangedAt: user.passwordChangedAt, dueAt, daysRemaining: Math.max(0, daysRemaining) };
    }),
    updateProfile: protectedProcedure
      .input(
        z.object({
          realName: z.string().optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          department: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const user = await getUserById(ctx.user.id);
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "使用者不存在" });
        const changedFields = (Object.keys(input) as Array<keyof typeof input>).filter((field) => input[field] !== undefined && input[field] !== user[field as keyof typeof user]);
        await updateUserProfile(ctx.user.id, input);
        if (changedFields.length) {
          await logOperation(
            ctx.user.id,
            user.username || ctx.user.name || `user_${ctx.user.id}`,
            "updateProfile",
            "user",
            ctx.user.id,
            user.username || undefined,
            { changedFields, privacy: "僅記錄異動欄位，不保存個人資料原文" }
          );
        }
        return { success: true };
      }),
    emailVerificationStatus: protectedProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      const email = user?.email?.trim() || null;
      const verification = email ? await getLatestEmailVerification(ctx.user.id, email) : null;
      const now = Date.now();
      const isPending = Boolean(verification && !verification.isVerified && new Date(verification.expiresAt).getTime() > now);
      const cooldownSeconds = verification && !verification.isVerified
        ? Math.max(0, Math.ceil((new Date(verification.createdAt).getTime() + 60_000 - now) / 1000))
        : 0;
      return {
        email,
        verified: Boolean(verification?.isVerified),
        verifiedAt: verification?.isVerified ? verification.verifiedAt : null,
        pending: isPending,
        expiresAt: isPending ? verification?.expiresAt : null,
        resendAvailableInSeconds: cooldownSeconds,
        remainingAttempts: verification && !verification.isVerified ? Math.max(0, 5 - verification.attemptCount) : 5,
      };
    }),
    sendEmailVerification: protectedProcedure.mutation(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      const email = user?.email?.trim();
      if (!email) throw new TRPCError({ code: "BAD_REQUEST", message: "請先在個人資料填寫有效電子郵件地址" });

      const latest = await getLatestEmailVerification(ctx.user.id, email);
      const now = Date.now();
      if (latest && !latest.isVerified && now - new Date(latest.createdAt).getTime() < 60_000) {
        const waitSeconds = Math.max(1, Math.ceil((60_000 - (now - new Date(latest.createdAt).getTime())) / 1000));
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `請於 ${waitSeconds} 秒後再重新寄送驗證碼` });
      }

      const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
      try {
        await sendEmailVerificationCode({ to: email, code, expiresInMinutes: 10 });
      } catch (error) {
        console.error("[ContactVerification] Email delivery failed", { userId: ctx.user.id });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "驗證碼寄送失敗，請稍後再試" });
      }
      await createEmailVerification({
        userId: ctx.user.id,
        email,
        verificationCode: code,
        expiresAt: new Date(Date.now() + 10 * 60_000),
      });
      await createOperationLog({ userId: ctx.user.id, username: user?.username || ctx.user.name || "未知使用者", action: "sendEmailVerification", entityType: "contactVerification", entityName: email, details: JSON.stringify({ channel: "email" }) });
      return { success: true, expiresInSeconds: 600 };
    }),
    verifyEmail: protectedProcedure
      .input(z.object({ code: z.string().regex(/^\d{6}$/, "請輸入六位數驗證碼") }))
      .mutation(async ({ input, ctx }) => {
        const user = await getUserById(ctx.user.id);
        const email = user?.email?.trim();
        if (!email) throw new TRPCError({ code: "BAD_REQUEST", message: "請先在個人資料填寫電子郵件地址" });
        const verification = await getLatestEmailVerification(ctx.user.id, email);
        if (!verification || verification.isVerified) throw new TRPCError({ code: "BAD_REQUEST", message: "沒有可用的電子郵件驗證碼，請重新寄送" });
        if (new Date(verification.expiresAt).getTime() <= Date.now()) throw new TRPCError({ code: "BAD_REQUEST", message: "驗證碼已失效，請重新寄送" });
        if (verification.attemptCount >= 5) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "驗證碼嘗試次數過多，請重新寄送" });
        if (verification.verificationCode !== input.code) {
          await incrementEmailVerificationAttempts(verification.id);
          throw new TRPCError({ code: "BAD_REQUEST", message: "驗證碼不正確" });
        }
        await completeEmailVerification(verification.id);
        await createOperationLog({ userId: ctx.user.id, username: user?.username || ctx.user.name || "未知使用者", action: "verifyEmail", entityType: "contactVerification", entityName: email, details: JSON.stringify({ channel: "email" }) });
        return { success: true };
      }),
    getPreferences: protectedProcedure.query(async ({ ctx }) => {
      return await getUserPreferences(ctx.user.id);
    }),
    updatePreferences: protectedProcedure
      .input(
        z.object({
          theme: z.enum(["light", "dark", "system"]).optional(),
          language: z.string().optional(),
          notificationsEnabled: z.boolean().optional(),
          emailNotifications: z.boolean().optional(),
          borrowingNotifications: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await upsertUserPreferences(ctx.user.id, input);
        return { success: true };
      }),
    changePassword: protectedProcedure
      .input(
        z.object({
          currentPassword: z.string(),
          newPassword: z.string(),
          confirmPassword: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const user = await getUserById(ctx.user.id);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "使用者不存在或未設定密碼" });
        }
        const isValid = await verifyPassword(input.currentPassword, user.passwordHash);
        if (!isValid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "目前密碼不正確" });
        }
        if (input.newPassword !== input.confirmPassword) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "新密碼與確認密碼不符" });
        }
        const complexity = validatePasswordComplexity(input.newPassword);
        if (!complexity.valid) {
          throw new TRPCError({ code: "BAD_REQUEST", message: complexity.message || "密碼不符合複雜度要求" });
        }
        const newHash = await hashPassword(input.newPassword);
        await upsertUser({
          id: ctx.user.id,
          username: user.username || undefined,
        openId: user.openId || undefined,
        passwordHash: newHash,
        temporaryPasswordCiphertext: null,
        isTemporaryPassword: false,
        passwordChangedAt: new Date(),
        passwordReminderSentAt: null,
        });
        await createOperationLog({ userId: ctx.user.id, username: user.username || ctx.user.name || "未知使用者", action: "changePassword", entityType: "accountSecurity", entityName: "密碼", details: JSON.stringify({ source: "profile" }) });
        return { success: true };
      }),
    securityActivity: protectedProcedure.query(async ({ ctx }) => {
      const actionLabels: Record<string, string> = {
        changePassword: "已變更密碼",
        beginTwoFactorSetup: "已開始設定雙因素驗證",
        confirmTwoFactorSetup: "已啟用雙因素驗證",
        disableTwoFactor: "已停用雙因素驗證",
        addPasskey: "已新增通行密鑰",
        renamePasskey: "已重新命名通行密鑰",
        deletePasskey: "已移除通行密鑰",
        firstPasskeyLogin: "安全通知：首次使用新通行密鑰登入",
        loginWithPasskey: "已使用通行密鑰登入",
        loginChallengeExpired: "登入驗證挑戰已逾時",
        revokeLoginDevice: "已撤銷登入設備",
        confirmLoginDeviceAlert: "已確認未知登入設備",
        revokeLoginDeviceAlert: "已撤銷未知登入設備",
        generateTwoFactorRecoveryCodes: "已產生或更新備用恢復碼",
        useTwoFactorRecoveryCode: "已使用備用恢復碼登入",
        confirmTwoFactorRecoveryCodesSafelyStored: "已確認安全保存備用恢復碼",
        sendEmailVerification: "已寄送電子郵件驗證碼",
        verifyEmail: "已完成電子郵件驗證",
      };
      const logs = await getOperationLogs({ userId: ctx.user.id, limit: 100 });
      return logs
        .filter((log) => actionLabels[log.action])
        .slice(0, 30)
        .map((log) => ({ id: log.id, action: log.action, label: actionLabels[log.action], entityName: log.entityName, createdAt: log.createdAt }));
    }),
    pendingDeviceAlerts: protectedProcedure.query(async ({ ctx }) => {
      return getPendingLoginDeviceAlerts(ctx.user.id);
    }),
    confirmDeviceAlert: protectedProcedure
      .input(z.object({ alertId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const updated = await confirmLoginDeviceAlert(input.alertId, ctx.user.id);
        if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "找不到待確認的未知設備警告" });
        await createOperationLog({
          userId: ctx.user.id,
          username: ctx.user.username || ctx.user.name || "未知使用者",
          action: "confirmLoginDeviceAlert",
          entityType: "loginDeviceAlert",
          entityId: input.alertId,
          entityName: "未知設備登入",
          details: JSON.stringify({ decision: "confirmed" }),
        });
        return { success: true as const };
      }),
    revokeDeviceAlert: protectedProcedure
      .input(z.object({ alertId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const updated = await revokeLoginDeviceAlert(input.alertId, ctx.user.id);
        if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "找不到待確認的未知設備警告" });
        await createOperationLog({
          userId: ctx.user.id,
          username: ctx.user.username || ctx.user.name || "未知使用者",
          action: "revokeLoginDeviceAlert",
          entityType: "loginDeviceAlert",
          entityId: input.alertId,
          entityName: "未知設備登入",
          details: JSON.stringify({ decision: "revoked" }),
        });
        return { success: true as const };
      }),
    blockHighRiskDeviceIp: founderProcedure
      .input(z.object({ alertId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        requireFounderAuditPin(ctx as any);
        const alert = await getPendingLoginDeviceAlertById(input.alertId);
        if (!alert) throw new TRPCError({ code: "NOT_FOUND", message: "找不到待確認的未知設備警告" });
        const ipAddress = alert.ipAddress?.trim();
        if (!ipAddress || isPrivateOrReservedIp(ipAddress)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "此設備沒有可安全封鎖的公開 IP 位址" });
        }

        const location = [alert.geoCity, alert.geoRegion, alert.geoCountry].filter(Boolean).join("，") || "位置暫時無法取得";
        await upsertIpBlacklistEntry({
          ipAddress,
          note: `高風險未知設備登入（警告 #${alert.id}；設備：${alert.deviceName}；IP 網路位置：${location}）`,
          isActive: true,
          createdById: ctx.user.id,
        });
        const revoked = await revokeLoginDeviceAlert(alert.id, alert.userId);
        if (!revoked) throw new TRPCError({ code: "CONFLICT", message: "未知設備警告已被處理，請重新整理後再試" });
        await logOperation(
          ctx.user.id,
          ctx.user.username || ctx.user.name || "未知使用者",
          "blockHighRiskDeviceIp",
          "loginDeviceAlert",
          alert.id,
          alert.deviceName,
          { ipAddress, deviceOwnerId: alert.userId, location, action: "blacklisted-and-device-revoked" }
        );
        return { success: true as const, ipAddress };
      }),
  }),

  // ─── Media Service Calendar ──────────────────────────────────────────────────
  mediaCalendar: router({
    list: protectedProcedure
      .input(z.object({ rangeStart: z.date(), rangeEnd: z.date() }).refine((value) => value.rangeEnd.getTime() >= value.rangeStart.getTime(), { message: "日期區間無效" }))
      .query(async ({ input }) => getMediaCalendarEvents(input.rangeStart, input.rangeEnd)),
    create: staffProcedure
      .input(mediaCalendarEventInputSchema)
      .mutation(async ({ ctx, input }) => {
        await createMediaCalendarEvent({ ...input, createdById: ctx.user.id, updatedById: ctx.user.id });
        await logOperation(ctx.user.id, ctx.user.username || ctx.user.name || ctx.user.openId || "未知使用者", "createMediaCalendarEvent", "mediaCalendarEvent", undefined, input.title, { category: input.category, startsAt: input.startsAt.toISOString(), endsAt: input.endsAt?.toISOString() ?? null, allDay: input.allDay });
        return { success: true as const };
      }),
    update: staffProcedure
      .input(z.object({ id: z.number().int().positive(), event: mediaCalendarEventInputSchema }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getMediaCalendarEventById(input.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "找不到指定行程" });
        const updated = await updateMediaCalendarEvent(input.id, { ...input.event, updatedById: ctx.user.id });
        if (!updated) throw new TRPCError({ code: "CONFLICT", message: "行程更新失敗，請重新整理後再試" });
        await logOperation(ctx.user.id, ctx.user.username || ctx.user.name || ctx.user.openId || "未知使用者", "updateMediaCalendarEvent", "mediaCalendarEvent", input.id, input.event.title, { before: { title: existing.title, category: existing.category, startsAt: existing.startsAt, endsAt: existing.endsAt }, after: { title: input.event.title, category: input.event.category, startsAt: input.event.startsAt, endsAt: input.event.endsAt ?? null } });
        return { success: true as const };
      }),
    delete: staffProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getMediaCalendarEventById(input.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "找不到指定行程" });
        const deleted = await deleteMediaCalendarEvent(input.id);
        if (!deleted) throw new TRPCError({ code: "CONFLICT", message: "行程刪除失敗，請重新整理後再試" });
        await logOperation(ctx.user.id, ctx.user.username || ctx.user.name || ctx.user.openId || "未知使用者", "deleteMediaCalendarEvent", "mediaCalendarEvent", input.id, existing.title, { category: existing.category, startsAt: existing.startsAt, endsAt: existing.endsAt });
        return { success: true as const };
      }),
  }),

  // ─── Media Service Project Proposals ─────────────────────────────────────────
  mediaProjectProposals: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const canReview = ctx.user.role === "admin" || ctx.user.role === "teacher";
      return canReview ? getMediaProjectProposals() : getMediaProjectProposalsByApplicant(ctx.user.id);
    }),
    create: protectedProcedure
      .input(mediaProjectProposalInputSchema)
      .mutation(async ({ ctx, input }) => {
        await createMediaProjectProposal({ ...input, requestedBudget: input.requestedBudget === null || input.requestedBudget === undefined ? null : input.requestedBudget.toFixed(2), applicantId: ctx.user.id });
        await logOperation(ctx.user.id, ctx.user.username || ctx.user.name || ctx.user.openId || "未知使用者", "createMediaProjectProposal", "mediaProjectProposal", undefined, input.title, { status: input.status, proposedStartAt: input.proposedStartAt?.toISOString() ?? null, requestedBudget: input.requestedBudget ?? null });
        return { success: true as const };
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), proposal: mediaProjectProposalInputSchema }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getMediaProjectProposalById(input.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "找不到指定企劃" });
        if (existing.applicantId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "僅能編輯自己的企劃申請" });
        if (existing.status !== "draft" && existing.status !== "returned") throw new TRPCError({ code: "FORBIDDEN", message: "此企劃已進入審核流程，無法直接編輯" });
        const updated = await updateMediaProjectProposal(input.id, { ...input.proposal, requestedBudget: input.proposal.requestedBudget === null || input.proposal.requestedBudget === undefined ? null : input.proposal.requestedBudget.toFixed(2) });
        if (!updated) throw new TRPCError({ code: "CONFLICT", message: "企劃更新失敗，請重新整理後再試" });
        await logOperation(ctx.user.id, ctx.user.username || ctx.user.name || ctx.user.openId || "未知使用者", "updateMediaProjectProposal", "mediaProjectProposal", input.id, input.proposal.title, { beforeStatus: existing.status, nextStatus: input.proposal.status });
        return { success: true as const };
      }),
    review: staffProcedure
      .input(z.object({ id: z.number().int().positive(), status: z.enum(["approved", "returned", "rejected"]), reviewNote: z.string().trim().max(4000, "審核意見不得超過 4000 字").nullable().optional() }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getMediaProjectProposalById(input.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "找不到指定企劃" });
        if (existing.status !== "submitted") throw new TRPCError({ code: "CONFLICT", message: "僅能審核已送出的企劃申請" });
        const reviewed = await reviewMediaProjectProposal(input.id, input.status, input.reviewNote ?? null, ctx.user.id);
        if (!reviewed) throw new TRPCError({ code: "CONFLICT", message: "企劃審核失敗，請重新整理後再試" });
        await logOperation(ctx.user.id, ctx.user.username || ctx.user.name || ctx.user.openId || "未知使用者", "reviewMediaProjectProposal", "mediaProjectProposal", input.id, existing.title, { previousStatus: existing.status, status: input.status, reviewNote: input.reviewNote ?? null, applicantId: existing.applicantId });
        return { success: true as const };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getMediaProjectProposalById(input.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "找不到指定企劃" });
        const canManage = ctx.user.role === "admin" || ctx.user.role === "teacher";
        if (!canManage && (existing.applicantId !== ctx.user.id || (existing.status !== "draft" && existing.status !== "returned"))) {
          throw new TRPCError({ code: "FORBIDDEN", message: "僅能刪除自己的草稿或退回企劃" });
        }
        const deleted = await deleteMediaProjectProposal(input.id);
        if (!deleted) throw new TRPCError({ code: "CONFLICT", message: "企劃刪除失敗，請重新整理後再試" });
        await logOperation(ctx.user.id, ctx.user.username || ctx.user.name || ctx.user.openId || "未知使用者", "deleteMediaProjectProposal", "mediaProjectProposal", input.id, existing.title, { status: existing.status, applicantId: existing.applicantId });
        return { success: true as const };
      }),
  }),

  // ─── Podcast Hosting ────────────────────────────────────────────────────────
  podcasts: router({
    listShows: protectedProcedure.query(async ({ ctx }) => {
      const canManage = ctx.user.role === "admin" || ctx.user.role === "teacher";
      return getPodcastShows(canManage);
    }),
    listEpisodes: protectedProcedure
      .input(z.object({ showId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const show = await getPodcastShowById(input.showId);
        if (!show) throw new TRPCError({ code: "NOT_FOUND", message: "找不到指定節目" });
        const canManage = ctx.user.role === "admin" || ctx.user.role === "teacher";
        if (show.status !== "published" && !canManage) throw new TRPCError({ code: "NOT_FOUND", message: "找不到指定節目" });
        return getPodcastEpisodes(show.id, canManage);
      }),
    rssInfo: staffProcedure
      .input(z.object({ showId: z.number().int().positive(), origin: z.string().trim().url() }))
      .query(async ({ input }) => {
        const show = await getPodcastShowById(input.showId);
        if (!show) throw new TRPCError({ code: "NOT_FOUND", message: "找不到指定節目" });
        const origin = new URL(input.origin).origin;
        return {
          feedUrl: show.slug ? `${origin}/podcasts/${encodeURIComponent(show.slug)}/feed.xml` : null,
          canPublishFeed: show.status === "published" && show.rssEnabled && Boolean(show.slug),
        };
      }),
    listDistributionTargets: staffProcedure
      .input(z.object({ showId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const show = await getPodcastShowById(input.showId);
        if (!show) throw new TRPCError({ code: "NOT_FOUND", message: "找不到指定節目" });
        return getPodcastDistributionTargets(show.id);
      }),
    createShow: staffProcedure
      .input(podcastShowInputSchema)
      .mutation(async ({ ctx, input }) => {
        const publishedAt = input.status === "published" ? new Date() : null;
        const id = await createPodcastShow({ ...input, description: input.description ?? null, createdById: ctx.user.id, updatedById: ctx.user.id, publishedAt });
        await logOperation(ctx.user.id, ctx.user.username || ctx.user.name || ctx.user.openId || "未知使用者", "createPodcastShow", "podcastShow", id, input.title, { status: input.status });
        return { success: true as const, id };
      }),
    updateShow: staffProcedure
      .input(z.object({ id: z.number().int().positive(), show: podcastShowInputSchema }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getPodcastShowById(input.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "找不到指定節目" });
        const publishedAt = input.show.status === "published" ? existing.publishedAt ?? new Date() : null;
        const updated = await updatePodcastShow(input.id, { ...input.show, description: input.show.description ?? null, updatedById: ctx.user.id, publishedAt });
        if (!updated) throw new TRPCError({ code: "CONFLICT", message: "節目更新失敗，請重新整理後再試" });
        await logOperation(ctx.user.id, ctx.user.username || ctx.user.name || ctx.user.openId || "未知使用者", "updatePodcastShow", "podcastShow", input.id, input.show.title, { beforeStatus: existing.status, status: input.show.status });
        return { success: true as const };
      }),
    updateRssSettings: staffProcedure
      .input(z.object({ id: z.number().int().positive(), settings: podcastRssSettingsSchema }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getPodcastShowById(input.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "找不到指定節目" });
        const updated = await updatePodcastRssSettings(input.id, { ...input.settings, ownerEmail: input.settings.ownerEmail ?? null, artworkUrl: input.settings.artworkUrl ?? null, updatedById: ctx.user.id });
        if (!updated) throw new TRPCError({ code: "CONFLICT", message: "RSS 設定儲存失敗，請重新整理後再試" });
        await logOperation(ctx.user.id, ctx.user.username || ctx.user.name || ctx.user.openId || "未知使用者", "updatePodcastRssSettings", "podcastShow", input.id, existing.title, { rssEnabled: input.settings.rssEnabled, slug: input.settings.slug, language: input.settings.language, artworkConfigured: Boolean(input.settings.artworkUrl), ownerEmailConfigured: Boolean(input.settings.ownerEmail) });
        return { success: true as const };
      }),
    updateDistributionTarget: staffProcedure
      .input(z.object({ showId: z.number().int().positive(), target: podcastDistributionTargetSchema }))
      .mutation(async ({ ctx, input }) => {
        const show = await getPodcastShowById(input.showId);
        if (!show) throw new TRPCError({ code: "NOT_FOUND", message: "找不到指定節目" });
        const targets = await getPodcastDistributionTargets(show.id);
        const existing = targets.find((target) => target.platform === input.target.platform);
        const submittedAt = input.target.status === "not_submitted" ? null : existing?.submittedAt ?? new Date();
        const lastConfirmedAt = input.target.status === "active" ? new Date() : existing?.lastConfirmedAt ?? null;
        await upsertPodcastDistributionTarget({ showId: show.id, ...input.target, directoryUrl: input.target.directoryUrl ?? null, note: input.target.note ?? null, submittedAt, lastConfirmedAt, updatedById: ctx.user.id });
        await logOperation(ctx.user.id, ctx.user.username || ctx.user.name || ctx.user.openId || "未知使用者", "updatePodcastDistributionTarget", "podcastDistributionTarget", undefined, show.title, { platform: input.target.platform, status: input.target.status, directoryUrlConfigured: Boolean(input.target.directoryUrl), noteConfigured: Boolean(input.target.note) });
        return { success: true as const };
      }),
    deleteShow: staffProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getPodcastShowById(input.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "找不到指定節目" });
        const deleted = await deletePodcastShow(input.id);
        if (!deleted) throw new TRPCError({ code: "CONFLICT", message: "節目刪除失敗，請重新整理後再試" });
        await logOperation(ctx.user.id, ctx.user.username || ctx.user.name || ctx.user.openId || "未知使用者", "deletePodcastShow", "podcastShow", input.id, existing.title, { status: existing.status });
        return { success: true as const };
      }),
    uploadEpisode: staffProcedure
      .input(podcastEpisodeInputSchema)
      .mutation(async ({ ctx, input }) => {
        const show = await getPodcastShowById(input.showId);
        if (!show) throw new TRPCError({ code: "NOT_FOUND", message: "找不到指定節目" });
        const audio = parsePodcastAudioBase64(input.base64);
        if (audio.length === 0 || audio.length > PODCAST_AUDIO_MAX_BYTES) throw new TRPCError({ code: "BAD_REQUEST", message: "單集音檔必須介於 1 位元組至 20 MB 之間" });
        const fileName = sanitizePodcastAudioFileName(input.fileName);
        const fileToken = `${Date.now()}-${randomBytes(6).toString("hex")}`;
        const stored = await storagePut(`podcasts/${show.id}/episodes/${fileToken}-${fileName}`, audio, input.mimeType);
        const publishedAt = input.status === "published" ? new Date() : null;
        const id = await createPodcastEpisode({
          showId: show.id,
          title: input.title,
          description: input.description ?? null,
          episodeNumber: input.episodeNumber,
          audioFileName: fileName,
          audioStorageKey: stored.key,
          audioUrl: stored.url,
          audioMimeType: input.mimeType,
          audioSizeBytes: audio.length,
          status: input.status,
          createdById: ctx.user.id,
          updatedById: ctx.user.id,
          publishedAt,
        });
        await logOperation(ctx.user.id, ctx.user.username || ctx.user.name || ctx.user.openId || "未知使用者", "uploadPodcastEpisode", "podcastEpisode", id, input.title, { showId: show.id, episodeNumber: input.episodeNumber, status: input.status, mimeType: input.mimeType, sizeBytes: audio.length });
        return { success: true as const, id, audioUrl: stored.url };
      }),
    updateEpisode: staffProcedure
      .input(z.object({ id: z.number().int().positive(), episode: podcastEpisodeUpdateSchema }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getPodcastEpisodeById(input.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "找不到指定單集" });
        const publishedAt = input.episode.status === "published" ? existing.publishedAt ?? new Date() : null;
        const updated = await updatePodcastEpisode(input.id, { ...input.episode, description: input.episode.description ?? null, updatedById: ctx.user.id, publishedAt });
        if (!updated) throw new TRPCError({ code: "CONFLICT", message: "單集更新失敗，請重新整理後再試" });
        await logOperation(ctx.user.id, ctx.user.username || ctx.user.name || ctx.user.openId || "未知使用者", "updatePodcastEpisode", "podcastEpisode", input.id, input.episode.title, { showId: existing.showId, episodeNumber: input.episode.episodeNumber, beforeStatus: existing.status, status: input.episode.status });
        return { success: true as const };
      }),
    deleteEpisode: staffProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getPodcastEpisodeById(input.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "找不到指定單集" });
        const deleted = await deletePodcastEpisode(input.id);
        if (!deleted) throw new TRPCError({ code: "CONFLICT", message: "單集刪除失敗，請重新整理後再試" });
        await logOperation(ctx.user.id, ctx.user.username || ctx.user.name || ctx.user.openId || "未知使用者", "deletePodcastEpisode", "podcastEpisode", input.id, existing.title, { showId: existing.showId, episodeNumber: existing.episodeNumber, storageKey: existing.audioStorageKey });
        return { success: true as const };
      }),
  }),

  // ─── Audit PIN Management ─────────────────────────────────────────────────────
  auditPin: router({
    // 驗證 PIN 碼
    verify: protectedProcedure
      .input(z.object({ pin: z.string().length(6, "PIN 碼必須為 6 位數") }))
      .mutation(async ({ ctx, input }) => {
        // 只有創始管理員可以驗證 PIN 碼
        if (!ctx.user.isFounder) {
          throw new TRPCError({ code: "FORBIDDEN", message: "只有創始管理員可以訪問登入稽核" });
        }

        // 檢查是否被鎖定
        const isLocked = await isPinLocked(ctx.user.id);
        if (isLocked) {
          const remainingSeconds = await getPinLockTimeRemaining(ctx.user.id);
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `PIN 碼已鎖定，請在 ${remainingSeconds} 秒後重試` });
        }

        const user = await getUserById(ctx.user.id);
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "使用者不存在" });

        if (!user.auditPinHash) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "PIN 碼未設置" });
        }

        const isValid = await bcrypt.compare(input.pin, user.auditPinHash);
        if (!isValid) {
          // 記錄失敗嘗試
          await recordPinFailure(ctx.user.id);
          const attempts = await getPinFailureAttempts(ctx.user.id);
          const remainingAttempts = Math.max(0, 3 - (attempts?.attemptCount ?? 0));

          if (remainingAttempts === 0) {
            throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "PIN 碼錯誤次數過多，帳號已鎖定 15 分鐘" });
          }
          throw new TRPCError({ code: "UNAUTHORIZED", message: `PIN 碼不正確，還有 ${remainingAttempts} 次嘗試機會` });
        }

        // 驗證成功，重置失敗計數
        await resetPinFailureAttempts(ctx.user.id);

        // 在 Cookie 中設置 PIN 驗證時間時間戳（保持 30 分鐘）
        const expiryTime = 30 * 60 * 1000; // 30 分鐘
        ctx.res.cookie('auditPinVerifiedAt', Date.now().toString(), {
          httpOnly: true,
          maxAge: expiryTime,
          path: '/',
          sameSite: 'none',
          secure: true,
        });

        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
