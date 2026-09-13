import { and, desc, eq, gte, ilike, inArray, isNotNull, isNull, like, lt, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { alias } from "drizzle-orm/mysql-core";
import {
  BorrowRecord,
  BorrowReturnReminder,
  BorrowRequest,
  AccountDeduplicationReport,
  AccountDeduplicationSchedule,
  AccountActivationCertificateExport,
  AuditEventResolution,
  PasswordChangeReminderSchedule,
  BrandLogoAlertThreshold,
  BrandLogoLoadFailure,
  Equipment,
  EquipmentCategory,
  EquipmentLocationHistory,
  EquipmentLocationMovementAlert,
  EmailVerification,
  FirstLoginSetupChallenge,
  InsertBorrowRecord,
  InsertBorrowReturnReminder,
  InsertBorrowRequest,
  InsertBrandLogoAlertThreshold,
  InsertBrandLogoLoadFailure,
  InsertAccountActivationCertificateExport,
  InsertEquipment,
  InsertEquipmentCategory,
  InsertEquipmentLocationHistory,
  InsertEquipmentLocationMovementAlert,
  InsertEmailVerification,
  InsertEmailOfflineCommandReceipt,
  InsertFirstLoginSetupChallenge,
  InsertLoginAuditLog,
  InsertMediaCalendarEvent,
  InsertMediaProjectProposal,
  InsertPodcastDistributionTarget,
  InsertPodcastEpisode,
  InsertPodcastShow,
  InsertIpBlacklistEntry,
  InsertLoginDevice,
  InsertLoginFailureAttempt,
  InsertOperationLog,
  InsertPasskeyChallenge,
  InsertPasskeyCredential,
  InsertPinFailureAttempt,
  InsertQrPrintHistory,
  InsertReimbursementAnnualBudget,
  InsertReimbursementClaim,
  InsertReimbursementItem,
  InsertReimbursementNotification,
  InsertReimbursementReceipt,
  InsertSystemAlertEmailDelivery,
  InsertSystemAlertEmailRecipient,
  InsertSystemReport,
  InsertSystemReportAsset,
  InsertSystemReportRead,
  InsertTwoFactorAuthenticator,
  InsertTwoFactorLoginChallenge,
  InsertTwoFactorRecoveryCode,
  InsertUser,
  InsertUserPreference,
  LoginAuditLog,
  MediaCalendarEvent,
  MediaProjectProposal,
  PodcastDistributionTarget,
  PodcastEpisode,
  PodcastShow,
  LoginDeviceAlert,
  IpBlacklistEntry,
  LoginDevice,
  LoginFailureAttempt,
  LoginPinFailureAttempt,
  EmailOfflineCommandAuthorizedSender,
  EmailOfflineCommandReceipt,
  EmailOfflineCommandSettings,
  OperationLog,
  OperationLogRetentionRun,
  OperationLogRetentionSchedule,
  OverdueBorrowReminderSchedule,
  PasskeyChallenge,
  PasskeyCredential,
  PinFailureAttempt,
  QrPrintHistory,
  ReimbursementAnnualBudget,
  ReimbursementClaim,
  ReimbursementItem,
  ReimbursementNotification,
  ReimbursementReceipt,
  SystemAlertEmailDelivery,
  SystemAlertEmailRecipient,
  SystemMaintenanceSettings,
  SystemReport,
  SystemReportAsset,
  SystemReportRead,
  TwoFactorAuthenticator,
  TwoFactorLoginChallenge,
  TwoFactorRecoveryCode,
  User,
  UserPreference,
  borrowRecords,
  borrowReturnReminders,
  borrowRequests,
  accountDeduplicationReports,
  accountDeduplicationSchedules,
  accountActivationCertificateExports,
  passwordChangeReminderSchedules,
  accountActivationCertificateDeliveries,
  auditEventResolutions,
  brandLogoAlertThresholds,
  brandLogoLoadFailures,
  equipment,
  equipmentCategories,
  equipmentLocationHistory,
  equipmentLocationMovementAlerts,
  emailVerifications,
  emailOfflineCommandAuthorizedSenders,
  emailOfflineCommandReceipts,
  emailOfflineCommandSettings,
  firstLoginSetupChallenges,
  ipBlacklist,
  loginAuditLogs,
  mediaCalendarEvents,
  mediaProjectProposals,
  podcastDistributionTargets,
  podcastEpisodes,
  podcastShows,
  loginDeviceAlerts,
  loginDevices,
  loginFailureAttempts,
  loginPinFailureAttempts,
  operationLogs,
  operationLogRetentionRuns,
  operationLogRetentionSchedules,
  overdueBorrowReminderSchedules,
  passkeyChallenges,
  passkeyCredentials,
  phoneVerifications,
  pinFailureAttempts,
  qrPrintHistory,
  reimbursementAnnualBudgets,
  reimbursementClaims,
  reimbursementItems,
  reimbursementNotifications,
  reimbursementReceipts,
  systemAlertEmailDeliveries,
  systemAlertEmailRecipients,
  systemMaintenanceSettings,
  systemReportAssets,
  systemReportReads,
  systemReports,
  twoFactorAuthenticators,
  twoFactorLoginChallenges,
  twoFactorRecoveryCodes,
  users,
  userPreferences,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { resolveIpGeolocation, type IpGeolocation } from "./ipGeolocation";
import { isTestAccount } from "../shared/accountClassification";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── System Maintenance Settings ──────────────────────────────────────────────

export async function getSystemMaintenanceSettings(): Promise<SystemMaintenanceSettings | null> {
  const db = await getDb();
  if (!db) return null;
  const [settings] = await db.select().from(systemMaintenanceSettings).orderBy(desc(systemMaintenanceSettings.id)).limit(1);
  return settings ?? null;
}
export type SystemMode = "online" | "maintenance" | "offline";
export type ScheduledSystemMode = Exclude<SystemMode, "online">;
export type SystemMaintenanceSettingsInput = {
  systemMode?: SystemMode;
  scheduledMode?: ScheduledSystemMode | null;
  scheduledFor?: Date | null;
  announcement?: string | null;
  estimatedRestoredAt?: Date | null;
  updatedById: number;
  scheduledById?: number | null;
};

export async function upsertSystemMaintenanceSettings(input: SystemMaintenanceSettingsInput): Promise<SystemMaintenanceSettings | null> {
  const db = await getDb();
  if (!db) return null;
  const current = await getSystemMaintenanceSettings();
  const systemMode = input.systemMode ?? current?.systemMode ?? "online";
  const maintenanceMode = systemMode === "maintenance";
  const values = {
    maintenanceMode,
    systemMode,
    scheduledMode: input.scheduledMode === undefined ? current?.scheduledMode ?? null : input.scheduledMode,
    scheduledFor: input.scheduledFor === undefined ? current?.scheduledFor ?? null : input.scheduledFor,
    scheduledById: input.scheduledById === undefined ? current?.scheduledById ?? null : input.scheduledById,
    announcement: input.announcement === undefined ? current?.announcement ?? null : input.announcement,
    estimatedRestoredAt: input.estimatedRestoredAt === undefined ? current?.estimatedRestoredAt ?? null : input.estimatedRestoredAt,
    updatedById: input.updatedById,
    updatedAt: new Date(),
  };
  if (current) {
    await db.update(systemMaintenanceSettings)
      .set(values)
      .where(eq(systemMaintenanceSettings.id, current.id));
  } else {
    await db.insert(systemMaintenanceSettings).values(values);
  }
  return getSystemMaintenanceSettings();
}

// ─── Authorized Email Offline Commands ───────────────────────────────────────

export type EmailOfflineCommandSettingsInput = {
  recipientEmail: string;
  encryptedCommandSecret: string | null;
  isEnabled: boolean;
  authorizedById: number;
};

export async function getEmailOfflineCommandSettings(): Promise<EmailOfflineCommandSettings | null> {
  const db = await getDb();
  if (!db) return null;
  const [settings] = await db
    .select()
    .from(emailOfflineCommandSettings)
    .orderBy(desc(emailOfflineCommandSettings.id))
    .limit(1);
  return settings ?? null;
}

export async function getEmailOfflineCommandSettingsByGmailPollTaskUid(taskUid: string): Promise<EmailOfflineCommandSettings | null> {
  const db = await getDb();
  if (!db) return null;
  const [settings] = await db
    .select()
    .from(emailOfflineCommandSettings)
    .where(eq(emailOfflineCommandSettings.gmailPollScheduleTaskUid, taskUid))
    .limit(1);
  return settings ?? null;
}

export async function updateEmailOfflineCommandGmailPollState(input: {
  settingsId: number;
  taskUid?: string | null;
  lastPolledAt?: Date | null;
  lastPollError?: string | null;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const values: Partial<EmailOfflineCommandSettings> = { updatedAt: new Date() };
  if (input.taskUid !== undefined) values.gmailPollScheduleTaskUid = input.taskUid;
  if (input.lastPolledAt !== undefined) values.gmailLastPolledAt = input.lastPolledAt;
  if (input.lastPollError !== undefined) values.gmailLastPollError = input.lastPollError?.slice(0, 512) ?? null;
  await db.update(emailOfflineCommandSettings).set(values).where(eq(emailOfflineCommandSettings.id, input.settingsId));
}

export async function upsertEmailOfflineCommandSettings(
  input: EmailOfflineCommandSettingsInput,
): Promise<EmailOfflineCommandSettings | null> {
  const db = await getDb();
  if (!db) return null;
  const current = await getEmailOfflineCommandSettings();
  const values = {
    recipientEmail: input.recipientEmail,
    encryptedCommandSecret: input.encryptedCommandSecret,
    isEnabled: input.isEnabled,
    authorizedById: input.authorizedById,
    updatedAt: new Date(),
  };
  if (current) {
    await db.update(emailOfflineCommandSettings).set(values).where(eq(emailOfflineCommandSettings.id, current.id));
  } else {
    await db.insert(emailOfflineCommandSettings).values(values);
  }
  return getEmailOfflineCommandSettings();
}

export async function getEmailOfflineCommandAuthorizedSenders(
  settingsId?: number,
  activeOnly = false,
): Promise<EmailOfflineCommandAuthorizedSender[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (settingsId) conditions.push(eq(emailOfflineCommandAuthorizedSenders.settingsId, settingsId));
  if (activeOnly) conditions.push(eq(emailOfflineCommandAuthorizedSenders.isActive, true));
  return db
    .select()
    .from(emailOfflineCommandAuthorizedSenders)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(emailOfflineCommandAuthorizedSenders.senderEmail);
}

export async function replaceEmailOfflineCommandAuthorizedSenders(input: {
  settingsId: number;
  senders: Array<{ email: string; label?: string | null; isActive?: boolean }>;
  createdById: number;
}): Promise<EmailOfflineCommandAuthorizedSender[]> {
  const db = await getDb();
  if (!db) return [];
  await db.delete(emailOfflineCommandAuthorizedSenders).where(eq(emailOfflineCommandAuthorizedSenders.settingsId, input.settingsId));
  if (input.senders.length) {
    await db.insert(emailOfflineCommandAuthorizedSenders).values(input.senders.map((sender) => ({
      settingsId: input.settingsId,
      senderEmail: sender.email,
      label: sender.label?.trim() || null,
      isActive: sender.isActive ?? true,
      createdById: input.createdById,
    })));
  }
  return getEmailOfflineCommandAuthorizedSenders(input.settingsId);
}

export async function getEmailOfflineCommandReceiptByTokenHash(
  mailgunTokenHash: string,
): Promise<EmailOfflineCommandReceipt | null> {
  const db = await getDb();
  if (!db) return null;
  const [receipt] = await db
    .select()
    .from(emailOfflineCommandReceipts)
    .where(eq(emailOfflineCommandReceipts.mailgunTokenHash, mailgunTokenHash))
    .limit(1);
  return receipt ?? null;
}

export async function createEmailOfflineCommandReceipt(
  input: InsertEmailOfflineCommandReceipt,
): Promise<EmailOfflineCommandReceipt | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(emailOfflineCommandReceipts).values(input);
  const id = Number(result[0].insertId);
  const [receipt] = await db.select().from(emailOfflineCommandReceipts).where(eq(emailOfflineCommandReceipts.id, id)).limit(1);
  return receipt ?? null;
}

export async function updateEmailOfflineCommandReceipt(input: {
  id: number;
  status: "accepted" | "rejected";
  rejectionCode?: string | null;
  resultingMode?: "offline" | "already_offline" | null;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(emailOfflineCommandReceipts).set({
    status: input.status,
    rejectionCode: input.rejectionCode ?? null,
    resultingMode: input.resultingMode ?? null,
    processedAt: new Date(),
  }).where(eq(emailOfflineCommandReceipts.id, input.id));
}

export async function updateEmailOfflineCommandReplyStatus(input: {
  id: number;
  replyStatus: "sent" | "failed";
  replyError?: string | null;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(emailOfflineCommandReceipts).set({
    replyStatus: input.replyStatus,
    replySentAt: input.replyStatus === "sent" ? new Date() : null,
    replyError: input.replyStatus === "failed" ? input.replyError?.slice(0, 2_000) || "reply_delivery_failed" : null,
  }).where(eq(emailOfflineCommandReceipts.id, input.id));
}

export async function getRecentEmailOfflineCommandReceipts(limit = 30): Promise<EmailOfflineCommandReceipt[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(emailOfflineCommandReceipts).orderBy(desc(emailOfflineCommandReceipts.receivedAt)).limit(limit);
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId && !user.username) throw new Error("User openId or username is required for upsert");
  const db = await getDb();
  if (!db) return;

  const [existingByUsername, existingByOpenId] = await Promise.all([
    user.username ? getUserByUsername(user.username) : Promise.resolve(undefined),
    user.openId ? getUserByOpenId(user.openId) : Promise.resolve(undefined),
  ]);
  if (existingByUsername && existingByOpenId && existingByUsername.id !== existingByOpenId.id) {
    throw new Error("User identity conflict: username and openId belong to different accounts");
  }
  const existingUser = existingByUsername ?? existingByOpenId;

  if (existingUser) {
    const updateData: Record<string, unknown> = {};
    
    const textFields = ["name", "email", "loginMethod"] as const;
    textFields.forEach((field) => {
      if (user[field] !== undefined) {
        updateData[field] = user[field] ?? null;
      }
    });

    if (user.passwordHash !== undefined) updateData.passwordHash = user.passwordHash;
    if (user.temporaryPasswordCiphertext !== undefined) updateData.temporaryPasswordCiphertext = user.temporaryPasswordCiphertext;
    if (user.temporaryPasswordExpiresAt !== undefined) updateData.temporaryPasswordExpiresAt = user.temporaryPasswordExpiresAt;
    if (user.isTemporaryPassword !== undefined) updateData.isTemporaryPassword = user.isTemporaryPassword;
    if (user.passwordChangedAt !== undefined) updateData.passwordChangedAt = user.passwordChangedAt;
    if (user.passwordReminderSentAt !== undefined) updateData.passwordReminderSentAt = user.passwordReminderSentAt;
    if (user.lastSignedIn !== undefined) updateData.lastSignedIn = user.lastSignedIn;
    if (user.role !== undefined) updateData.role = user.role;
    if (user.isActive !== undefined) updateData.isActive = user.isActive;
    if (user.studentId !== undefined) updateData.studentId = user.studentId ?? null;
    if (user.department !== undefined) updateData.department = user.department ?? null;
    if (user.phone !== undefined) updateData.phone = user.phone ?? null;
    if (user.realName !== undefined) updateData.realName = user.realName ?? null;

    if (Object.keys(updateData).length > 0) {
      await db.update(users).set(updateData).where(eq(users.id, existingUser.id));
    }
  } else {
    const values: InsertUser = {};
    if (user.openId) values.openId = user.openId;
    if (user.username) values.username = user.username;

    const textFields = ["name", "email", "loginMethod"] as const;
    textFields.forEach((field) => {
      if (user[field] !== undefined) {
        values[field] = user[field] ?? null;
      }
    });

    if (user.passwordHash !== undefined) values.passwordHash = user.passwordHash;
    if (user.temporaryPasswordCiphertext !== undefined) values.temporaryPasswordCiphertext = user.temporaryPasswordCiphertext;
    if (user.temporaryPasswordExpiresAt !== undefined) values.temporaryPasswordExpiresAt = user.temporaryPasswordExpiresAt;
    if (user.isTemporaryPassword !== undefined) values.isTemporaryPassword = user.isTemporaryPassword;
    if (user.passwordChangedAt !== undefined) values.passwordChangedAt = user.passwordChangedAt;
    if (user.passwordReminderSentAt !== undefined) values.passwordReminderSentAt = user.passwordReminderSentAt;
    if (user.lastSignedIn !== undefined) values.lastSignedIn = user.lastSignedIn;
    if (user.role !== undefined) {
      values.role = user.role;
    } else if (user.isFounder) {
      values.role = "admin";
    }
    if (user.isActive !== undefined) values.isActive = user.isActive;
    if (user.studentId !== undefined) values.studentId = user.studentId ?? null;
    if (user.department !== undefined) values.department = user.department ?? null;
    if (user.phone !== undefined) values.phone = user.phone ?? null;
    if (user.realName !== undefined) values.realName = user.realName ?? null;

    if (!values.lastSignedIn) values.lastSignedIn = new Date();

    await db.insert(users).values(values);
  }
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result[0];
}

export async function completeFirstLoginSetup(input: { userId: number; username: string; passwordHash: string; completedAt: Date }): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({
    username: input.username,
    usernameLockedAt: input.completedAt,
    passwordHash: input.passwordHash,
    temporaryPasswordCiphertext: null,
    temporaryPasswordExpiresAt: null,
    isTemporaryPassword: false,
    passwordChangedAt: input.completedAt,
    passwordReminderSentAt: null,
  }).where(eq(users.id, input.userId));
}

export async function completeFounderPinSetupOnce(input: { userId: number; loginPinHash: string; auditPinHash: string }): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(users).set({
    loginPinHash: input.loginPinHash,
    auditPinHash: input.auditPinHash,
    founderPinSetupRequired: false,
  }).where(and(
    eq(users.id, input.userId),
    eq(users.isFounder, true),
    or(
      eq(users.founderPinSetupRequired, true),
      and(isNull(users.loginPinHash), isNull(users.auditPinHash)),
    ),
  ));
  return Number((result as any)[0]?.affectedRows ?? 0) > 0;
}

export async function getAllUsers(): Promise<User[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getTestAccounts(): Promise<User[]> {
  const allUsers = await getAllUsers();
  return allUsers.filter((user) => isTestAccount(user));
}

export async function createAccountActivationCertificateDelivery(input: typeof accountActivationCertificateDeliveries.$inferInsert): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(accountActivationCertificateDeliveries).values(input);
}

export async function getAccountActivationCertificateDeliveries(accountId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(accountActivationCertificateDeliveries).where(eq(accountActivationCertificateDeliveries.accountId, accountId)).orderBy(desc(accountActivationCertificateDeliveries.sentAt));
}

export async function getAccountActivationCertificateDeliveryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(accountActivationCertificateDeliveries).where(eq(accountActivationCertificateDeliveries.id, id)).limit(1);
  return result[0];
}

export async function createAccountActivationCertificateExport(input: InsertAccountActivationCertificateExport): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(accountActivationCertificateExports).values(input);
}

export async function getAccountActivationCertificateExportByVerificationToken(verificationToken: string): Promise<AccountActivationCertificateExport | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(accountActivationCertificateExports)
    .where(eq(accountActivationCertificateExports.verificationToken, verificationToken)).limit(1);
  return result[0];
}

export async function getLatestAccountActivationCertificateExportByNumber(certificateNumber: string): Promise<AccountActivationCertificateExport | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(accountActivationCertificateExports)
    .where(eq(accountActivationCertificateExports.certificateNumber, certificateNumber))
    .orderBy(desc(accountActivationCertificateExports.createdAt)).limit(1);
  return result[0];
}

export async function getAccountActivationCertificateExportById(id: number): Promise<AccountActivationCertificateExport | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(accountActivationCertificateExports)
    .where(eq(accountActivationCertificateExports.id, id)).limit(1);
  return result[0];
}

export async function getAccountActivationCertificateExports(limit = 200): Promise<AccountActivationCertificateExport[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(accountActivationCertificateExports)
    .orderBy(desc(accountActivationCertificateExports.createdAt)).limit(Math.min(Math.max(limit, 1), 500));
}

export async function markAccountActivationCertificateExportDownloaded(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(accountActivationCertificateExports).set({
    downloadCount: sql`${accountActivationCertificateExports.downloadCount} + 1`,
    firstDownloadedAt: sql`COALESCE(${accountActivationCertificateExports.firstDownloadedAt}, NOW())`,
    lastDownloadedAt: new Date(),
  }).where(eq(accountActivationCertificateExports.id, id));
}

export async function updateAccountActivationCertificateExportStatus(input: {
  id: number;
  status: "revoked" | "expired";
  reason: string;
  changedById: number;
}): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(accountActivationCertificateExports).set({
    status: input.status,
    statusReason: input.reason,
    statusChangedById: input.changedById,
    statusChangedAt: new Date(),
  }).where(and(eq(accountActivationCertificateExports.id, input.id), eq(accountActivationCertificateExports.status, "valid")));
  return result[0].affectedRows > 0;
}

export async function getPasswordChangeReminderScheduleByTaskUid(taskUid: string): Promise<PasswordChangeReminderSchedule | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(passwordChangeReminderSchedules)
    .where(eq(passwordChangeReminderSchedules.scheduleCronTaskUid, taskUid)).limit(1);
  return result[0];
}

export async function updatePasswordChangeReminderScheduleLastRun(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(passwordChangeReminderSchedules).set({ lastRunAt: new Date() }).where(eq(passwordChangeReminderSchedules.id, id));
}

export async function getUsersDueForPasswordChangeReminder(referenceDate = new Date()) {
  const db = await getDb();
  if (!db) return [];
  const dueAt = new Date(referenceDate);
  dueAt.setUTCDate(dueAt.getUTCDate() - 180);
  const [candidates, verifications] = await Promise.all([
    db.select({ id: users.id, username: users.username, name: users.name, email: users.email, passwordChangedAt: users.passwordChangedAt, createdAt: users.createdAt })
      .from(users)
      .where(and(
        eq(users.isActive, true),
        eq(users.isTemporaryPassword, false),
        isNotNull(users.passwordHash),
        isNotNull(users.email),
        isNull(users.passwordReminderSentAt),
        lte(users.passwordChangedAt, dueAt),
      )),
    db.select({ userId: emailVerifications.userId, email: emailVerifications.email, isVerified: emailVerifications.isVerified, createdAt: emailVerifications.createdAt })
      .from(emailVerifications).orderBy(desc(emailVerifications.createdAt)),
  ]);
  const latestVerification = new Map<string, typeof verifications[number]>();
  for (const verification of verifications) {
    const key = `${verification.userId}:${verification.email}`;
    if (!latestVerification.has(key)) latestVerification.set(key, verification);
  }
  return candidates.filter((user) => {
    if (!user.email || isTestAccount(user as any)) return false;
    return latestVerification.get(`${user.id}:${user.email}`)?.isVerified === true;
  });
}

export async function markPasswordChangeReminderSent(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ passwordReminderSentAt: new Date() }).where(eq(users.id, userId));
}

/** 只移除符合固定自動化測試帳號規則的帳號及其直接關聯資料 */
export async function deleteTestAccounts(): Promise<User[]> {
  const db = await getDb();
  if (!db) return [];

  const candidates = await getTestAccounts();
  const ids = candidates.map((user) => user.id);
  if (ids.length === 0) return [];

  await db.transaction(async (tx) => {
    await tx.delete(accountActivationCertificateExports).where(or(inArray(accountActivationCertificateExports.accountId, ids), inArray(accountActivationCertificateExports.generatedById, ids)));
    await tx.delete(accountActivationCertificateDeliveries).where(or(inArray(accountActivationCertificateDeliveries.accountId, ids), inArray(accountActivationCertificateDeliveries.sentById, ids)));
    await tx.delete(loginDeviceAlerts).where(inArray(loginDeviceAlerts.userId, ids));
    await tx.delete(borrowRecords).where(or(inArray(borrowRecords.borrowerId, ids), inArray(borrowRecords.handledById, ids)));
    await tx.delete(borrowRequests).where(or(inArray(borrowRequests.requesterId, ids), inArray(borrowRequests.reviewerId, ids)));
    await tx.update(loginAuditLogs).set({ userId: null }).where(inArray(loginAuditLogs.userId, ids));
    await tx.delete(loginFailureAttempts).where(inArray(loginFailureAttempts.userId, ids));
    await tx.delete(pinFailureAttempts).where(inArray(pinFailureAttempts.userId, ids));
    await tx.delete(loginPinFailureAttempts).where(inArray(loginPinFailureAttempts.userId, ids));
    await tx.delete(userPreferences).where(inArray(userPreferences.userId, ids));
    await tx.delete(emailVerifications).where(inArray(emailVerifications.userId, ids));
    await tx.delete(phoneVerifications).where(inArray(phoneVerifications.userId, ids));
    await tx.delete(twoFactorAuthenticators).where(inArray(twoFactorAuthenticators.userId, ids));
    await tx.delete(twoFactorLoginChallenges).where(inArray(twoFactorLoginChallenges.userId, ids));
    await tx.delete(passkeyChallenges).where(inArray(passkeyChallenges.userId, ids));
    await tx.delete(passkeyCredentials).where(inArray(passkeyCredentials.userId, ids));
    await tx.delete(loginDevices).where(inArray(loginDevices.userId, ids));
    await tx.update(equipmentLocationHistory).set({ changedById: null }).where(inArray(equipmentLocationHistory.changedById, ids));
    await tx.update(equipmentLocationHistory).set({ reviewedById: null }).where(inArray(equipmentLocationHistory.reviewedById, ids));
    await tx.update(equipmentLocationHistory).set({ signedById: null }).where(inArray(equipmentLocationHistory.signedById, ids));
    await tx.update(equipmentLocationMovementAlerts).set({ triggeredById: null }).where(inArray(equipmentLocationMovementAlerts.triggeredById, ids));
    await tx.update(qrPrintHistory).set({ printedById: null }).where(inArray(qrPrintHistory.printedById, ids));
    await tx.update(auditEventResolutions).set({ handledById: null }).where(inArray(auditEventResolutions.handledById, ids));
    await tx.update(brandLogoLoadFailures).set({ reporterUserId: null }).where(inArray(brandLogoLoadFailures.reporterUserId, ids));
    await tx.delete(ipBlacklist).where(inArray(ipBlacklist.createdById, ids));
    await tx.delete(systemAlertEmailRecipients).where(inArray(systemAlertEmailRecipients.createdById, ids));
    await tx.update(operationLogs).set({ userId: null }).where(inArray(operationLogs.userId, ids));
    await tx.delete(users).where(inArray(users.id, ids));
  });

  return candidates;
}

export async function getUserLoginSecurityStatuses() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const rows = await db
    .select({
      userId: users.id,
      attemptCount: loginFailureAttempts.attemptCount,
      lastAttemptAt: loginFailureAttempts.lastAttemptAt,
      lockedUntil: loginFailureAttempts.lockedUntil,
    })
    .from(users)
    .leftJoin(loginFailureAttempts, eq(users.id, loginFailureAttempts.userId));

  return rows.map((row) => {
    const lockedUntil = row.lockedUntil ?? null;
    const remainingSeconds = lockedUntil && lockedUntil > now
      ? Math.min(LOGIN_LOCK_DURATION_SECONDS, Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000))
      : 0;
    return {
      ...row,
      attemptCount: row.attemptCount ?? 0,
      lockedUntil,
      isLocked: remainingSeconds > 0,
      remainingSeconds,
    };
  });
}

export async function getUserById(id: number): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function updateUserRole(id: number, role: "admin" | "teacher" | "student"): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, id));
}

export async function updateUserActive(id: number, isActive: boolean): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ isActive, updatedAt: new Date() }).where(eq(users.id, id));
}

export async function extendTemporaryPasswordExpiry(id: number, temporaryPasswordExpiresAt: Date): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ temporaryPasswordExpiresAt, updatedAt: new Date() }).where(eq(users.id, id));
}

export type DuplicateAccountGroup = {
  field: "username" | "email";
  value: string;
  users: Array<{
    id: number;
    username: string | null;
    email: string | null;
    realName: string | null;
    role: "admin" | "teacher" | "student";
    isActive: boolean;
    isFounder: boolean;
    createdAt: Date;
    lastSignedIn: Date | null;
  }>;
};

const normalizeAccountIdentifier = (value: string | null) => value?.trim().toLocaleLowerCase("en-US") ?? "";

export async function findDuplicateAccounts(): Promise<DuplicateAccountGroup[]> {
  const db = await getDb();
  if (!db) return [];
  const accountRows = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      realName: users.realName,
      role: users.role,
      isActive: users.isActive,
      isFounder: users.isFounder,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .orderBy(users.id);

  const groups: DuplicateAccountGroup[] = [];
  for (const field of ["username", "email"] as const) {
    const values = new Map<string, DuplicateAccountGroup["users"]>();
    for (const account of accountRows) {
      const normalized = normalizeAccountIdentifier(account[field]);
      if (!normalized) continue;
      const matchingAccounts = values.get(normalized) ?? [];
      matchingAccounts.push(account);
      values.set(normalized, matchingAccounts);
    }
    for (const [value, matchingAccounts] of Array.from(values.entries())) {
      if (matchingAccounts.length > 1) groups.push({ field, value, users: matchingAccounts });
    }
  }
  return groups.sort((a, b) => a.field.localeCompare(b.field) || a.value.localeCompare(b.value));
}

export async function getAccountDeduplicationSchedule(): Promise<AccountDeduplicationSchedule | null> {
  const db = await getDb();
  if (!db) return null;
  const [schedule] = await db.select().from(accountDeduplicationSchedules).orderBy(desc(accountDeduplicationSchedules.createdAt)).limit(1);
  return schedule ?? null;
}

export async function getAccountDeduplicationScheduleByTaskUid(taskUid: string): Promise<AccountDeduplicationSchedule | null> {
  const db = await getDb();
  if (!db) return null;
  const [schedule] = await db.select().from(accountDeduplicationSchedules)
    .where(eq(accountDeduplicationSchedules.scheduleCronTaskUid, taskUid)).limit(1);
  return schedule ?? null;
}

export async function upsertAccountDeduplicationSchedule(data: { scheduleCronTaskUid: string; isActive?: boolean }): Promise<AccountDeduplicationSchedule | null> {
  const db = await getDb();
  if (!db) return null;
  const existing = await getAccountDeduplicationSchedule();
  if (existing) {
    await db.update(accountDeduplicationSchedules)
      .set({ scheduleCronTaskUid: data.scheduleCronTaskUid, isActive: data.isActive ?? true, updatedAt: new Date() })
      .where(eq(accountDeduplicationSchedules.id, existing.id));
  } else {
    await db.insert(accountDeduplicationSchedules).values({ scheduleCronTaskUid: data.scheduleCronTaskUid, isActive: data.isActive ?? true });
  }
  return getAccountDeduplicationSchedule();
}

export async function updateAccountDeduplicationScheduleLastRun(scheduleId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(accountDeduplicationSchedules).set({ lastRunAt: new Date(), updatedAt: new Date() })
    .where(eq(accountDeduplicationSchedules.id, scheduleId));
}

export async function createAccountDeduplicationReport(data: { scheduleId?: number | null; groups: DuplicateAccountGroup[] }): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(accountDeduplicationReports).values({
    scheduleId: data.scheduleId ?? null,
    duplicateGroupCount: data.groups.length,
    reportJson: JSON.stringify({ groups: data.groups }),
  });
}

export async function getLatestAccountDeduplicationReport(): Promise<(AccountDeduplicationReport & { groups: DuplicateAccountGroup[] }) | null> {
  const db = await getDb();
  if (!db) return null;
  const [report] = await db.select().from(accountDeduplicationReports).orderBy(desc(accountDeduplicationReports.createdAt)).limit(1);
  if (!report) return null;
  try {
    const parsed = JSON.parse(report.reportJson) as { groups?: DuplicateAccountGroup[] };
    return { ...report, groups: Array.isArray(parsed.groups) ? parsed.groups : [] };
  } catch {
    return { ...report, groups: [] };
  }
}

function getTaiwanDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function isTaiwanDate(date: Date | null | undefined, dateKey: string) {
  return Boolean(date && getTaiwanDateKey(date) === dateKey);
}

export async function getTodayAccountDeduplicationEmailSummary() {
  const db = await getDb();
  const dateKey = getTaiwanDateKey();
  if (!db) return { dateKey, hasRunToday: false, duplicateGroupCount: 0, emailStatus: "unavailable" as const, sent: 0, failed: 0, suppressed: 0, recipients: 0, configuredRecipientCount: 0, activeRecipientCount: 0, inactiveRecipientCount: 0, activeRecipients: [], lastDeliveryAt: null, reportCreatedAt: null };

  const [schedule, latestReport, deliveries, configuredRecipients] = await Promise.all([
    getAccountDeduplicationSchedule(),
    getLatestAccountDeduplicationReport(),
    db.select().from(systemAlertEmailDeliveries)
      .where(like(systemAlertEmailDeliveries.eventKey, `account-dedup-daily:${dateKey}%`))
      .orderBy(desc(systemAlertEmailDeliveries.createdAt), desc(systemAlertEmailDeliveries.id)),
    getSystemAlertEmailRecipients(true),
  ]);
  const sent = deliveries.filter((delivery) => delivery.status === "sent").length;
  const failed = deliveries.filter((delivery) => delivery.status === "failed").length;
  const suppressed = deliveries.filter((delivery) => delivery.status === "suppressed").length;
  const hasRunToday = isTaiwanDate(schedule?.lastRunAt, dateKey);
  const reportIsToday = isTaiwanDate(latestReport?.createdAt, dateKey);
  const activeRecipients = configuredRecipients
    .filter((recipient) => recipient.isActive)
    .map((recipient) => ({ id: recipient.id, email: recipient.email, label: recipient.label }))
    .sort((a, b) => a.email.localeCompare(b.email));
  const emailStatus = !hasRunToday
    ? "pending"
    : failed > 0 && sent > 0
      ? "partial"
      : failed > 0
        ? "failed"
        : sent > 0
          ? "sent"
          : suppressed > 0
            ? "suppressed"
            : "no-recipients";

  return {
    dateKey,
    hasRunToday,
    duplicateGroupCount: reportIsToday ? latestReport?.duplicateGroupCount ?? 0 : null,
    emailStatus,
    sent,
    failed,
    suppressed,
    recipients: deliveries.length,
    configuredRecipientCount: configuredRecipients.length,
    activeRecipientCount: activeRecipients.length,
    inactiveRecipientCount: configuredRecipients.length - activeRecipients.length,
    activeRecipients,
    lastDeliveryAt: deliveries[0]?.createdAt ?? null,
    reportCreatedAt: reportIsToday ? latestReport?.createdAt ?? null : null,
  };
}

export async function deactivateDuplicateUserAccount(userId: number): Promise<{ user: User | null; updated: boolean }> {
  const db = await getDb();
  if (!db) return { user: null, updated: false };
  const user = await getUserById(userId);
  if (!user || !user.isActive || user.isFounder) return { user: user ?? null, updated: false };
  await db.update(users).set({ isActive: false, updatedAt: new Date() }).where(eq(users.id, userId));
  return { user, updated: true };
}

/**
 * Permanently removes one account and its private credentials in a transaction.
 * Back-office audit records are retained and their actor foreign keys are safely
 * detached, while the record's existing historical content remains available.
 */
export async function deleteUser(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB_NOT_AVAILABLE");

  await db.transaction(async (tx) => {
    const borrowedRecords = await tx.select({ id: borrowRecords.id }).from(borrowRecords).where(eq(borrowRecords.borrowerId, id));
    const borrowedRecordIds = borrowedRecords.map((record) => record.id);

    if (borrowedRecordIds.length) {
      await tx.delete(borrowReturnReminders).where(or(
        inArray(borrowReturnReminders.borrowRecordId, borrowedRecordIds),
        eq(borrowReturnReminders.borrowerId, id),
      ));
    } else {
      await tx.delete(borrowReturnReminders).where(eq(borrowReturnReminders.borrowerId, id));
    }
    await tx.update(borrowReturnReminders).set({ lastResentById: null }).where(eq(borrowReturnReminders.lastResentById, id));
    await tx.delete(accountActivationCertificateExports).where(or(eq(accountActivationCertificateExports.accountId, id), eq(accountActivationCertificateExports.generatedById, id)));
    await tx.delete(accountActivationCertificateDeliveries).where(or(eq(accountActivationCertificateDeliveries.accountId, id), eq(accountActivationCertificateDeliveries.sentById, id)));
    await tx.delete(loginDeviceAlerts).where(eq(loginDeviceAlerts.userId, id));
    await tx.delete(systemReportReads).where(eq(systemReportReads.userId, id));
    await tx.delete(systemReportAssets).where(eq(systemReportAssets.uploadedById, id));
    await tx.delete(systemReports).where(eq(systemReports.authorId, id));
    await tx.update(qrPrintHistory).set({ printedById: null }).where(eq(qrPrintHistory.printedById, id));
    await tx.update(equipmentLocationMovementAlerts).set({ triggeredById: null }).where(eq(equipmentLocationMovementAlerts.triggeredById, id));
    await tx.update(equipmentLocationHistory).set({ changedById: null }).where(eq(equipmentLocationHistory.changedById, id));
    await tx.update(equipmentLocationHistory).set({ reviewedById: null }).where(eq(equipmentLocationHistory.reviewedById, id));
    await tx.update(equipmentLocationHistory).set({ signedById: null }).where(eq(equipmentLocationHistory.signedById, id));
    await tx.update(auditEventResolutions).set({ handledById: null }).where(eq(auditEventResolutions.handledById, id));
    await tx.delete(borrowRecords).where(eq(borrowRecords.borrowerId, id));
    await tx.update(borrowRecords).set({ handledById: null }).where(eq(borrowRecords.handledById, id));
    await tx.delete(borrowRequests).where(eq(borrowRequests.requesterId, id));
    await tx.update(borrowRequests).set({ reviewerId: null }).where(eq(borrowRequests.reviewerId, id));
    await tx.update(loginAuditLogs).set({ userId: null }).where(eq(loginAuditLogs.userId, id));
    await tx.delete(loginFailureAttempts).where(eq(loginFailureAttempts.userId, id));
    await tx.delete(pinFailureAttempts).where(eq(pinFailureAttempts.userId, id));
    await tx.delete(loginPinFailureAttempts).where(eq(loginPinFailureAttempts.userId, id));
    await tx.delete(userPreferences).where(eq(userPreferences.userId, id));
    await tx.delete(emailVerifications).where(eq(emailVerifications.userId, id));
    await tx.delete(phoneVerifications).where(eq(phoneVerifications.userId, id));
    await tx.delete(twoFactorAuthenticators).where(eq(twoFactorAuthenticators.userId, id));
    await tx.delete(twoFactorLoginChallenges).where(eq(twoFactorLoginChallenges.userId, id));
    await tx.delete(twoFactorRecoveryCodes).where(eq(twoFactorRecoveryCodes.userId, id));
    await tx.delete(firstLoginSetupChallenges).where(eq(firstLoginSetupChallenges.userId, id));
    await tx.delete(passkeyChallenges).where(eq(passkeyChallenges.userId, id));
    await tx.delete(passkeyCredentials).where(eq(passkeyCredentials.userId, id));
    await tx.delete(loginDevices).where(eq(loginDevices.userId, id));
    await tx.update(brandLogoLoadFailures).set({ reporterUserId: null }).where(eq(brandLogoLoadFailures.reporterUserId, id));
    await tx.delete(ipBlacklist).where(eq(ipBlacklist.createdById, id));
    await tx.delete(systemAlertEmailRecipients).where(eq(systemAlertEmailRecipients.createdById, id));
    await tx.delete(brandLogoAlertThresholds).where(or(eq(brandLogoAlertThresholds.createdById, id), eq(brandLogoAlertThresholds.updatedById, id)));
    await tx.update(operationLogs).set({ userId: null }).where(eq(operationLogs.userId, id));
    await tx.delete(users).where(eq(users.id, id));
  });
}

// ─── Equipment Categories ─────────────────────────────────────────────────────

export async function getAllCategories(): Promise<EquipmentCategory[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(equipmentCategories).orderBy(equipmentCategories.name);
}

export async function createCategory(data: InsertEquipmentCategory): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(equipmentCategories).values(data);
}

export async function updateEquipmentCategory(id: number, data: Pick<InsertEquipmentCategory, "name" | "description">): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB_NOT_AVAILABLE");
  const normalizedName = data.name.trim();
  const [target] = await db.select({ id: equipmentCategories.id }).from(equipmentCategories).where(eq(equipmentCategories.id, id)).limit(1);
  if (!target) throw new Error("CATEGORY_NOT_FOUND");
  const [sameName] = await db.select({ id: equipmentCategories.id }).from(equipmentCategories).where(eq(equipmentCategories.name, normalizedName)).limit(1);
  if (sameName && sameName.id !== id) throw new Error("CATEGORY_NAME_CONFLICT");
  await db.update(equipmentCategories).set({ name: normalizedName, description: data.description?.trim() || null }).where(eq(equipmentCategories.id, id));
}

export type EquipmentCategoryReassignment = {
  id: number;
  name: string;
  previousCategoryId: number | null;
  categoryId: number | null;
};

export async function reassignEquipmentCategories(equipmentIds: number[], categoryId: number | null): Promise<EquipmentCategoryReassignment[]> {
  const db = await getDb();
  if (!db) throw new Error("DB_NOT_AVAILABLE");
  const uniqueEquipmentIds = Array.from(new Set(equipmentIds));
  if (!uniqueEquipmentIds.length) return [];
  return db.transaction(async (tx) => {
    if (categoryId !== null) {
      const [targetCategory] = await tx.select({ id: equipmentCategories.id }).from(equipmentCategories).where(eq(equipmentCategories.id, categoryId)).limit(1);
      if (!targetCategory) throw new Error("TARGET_CATEGORY_NOT_FOUND");
    }
    const selectedEquipment = await tx.select({ id: equipment.id, name: equipment.name, categoryId: equipment.categoryId }).from(equipment).where(inArray(equipment.id, uniqueEquipmentIds));
    if (selectedEquipment.length !== uniqueEquipmentIds.length) throw new Error("EQUIPMENT_NOT_FOUND");
    const changedEquipment = selectedEquipment.filter((item) => item.categoryId !== categoryId);
    if (changedEquipment.length) {
      await tx.update(equipment).set({ categoryId, updatedAt: new Date() }).where(inArray(equipment.id, changedEquipment.map((item) => item.id)));
    }
    return changedEquipment.map((item) => ({ id: item.id, name: item.name, previousCategoryId: item.categoryId, categoryId }));
  });
}

export type EquipmentCategoryWithUsage = EquipmentCategory & {
  equipmentCount: number;
};

export async function getEquipmentCategoriesWithUsage(): Promise<EquipmentCategoryWithUsage[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    id: equipmentCategories.id,
    name: equipmentCategories.name,
    description: equipmentCategories.description,
    createdAt: equipmentCategories.createdAt,
    equipmentCount: sql<number>`count(${equipment.id})`,
  }).from(equipmentCategories)
    .leftJoin(equipment, eq(equipment.categoryId, equipmentCategories.id))
    .groupBy(equipmentCategories.id, equipmentCategories.name, equipmentCategories.description, equipmentCategories.createdAt)
    .orderBy(equipmentCategories.name);
  return rows.map((row) => ({ ...row, equipmentCount: Number(row.equipmentCount ?? 0) }));
}

export async function getEquipmentCategoryDeletionPreview(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB_NOT_AVAILABLE");
  const [target] = await db.select({ id: equipmentCategories.id, name: equipmentCategories.name, description: equipmentCategories.description }).from(equipmentCategories).where(eq(equipmentCategories.id, id)).limit(1);
  if (!target) return undefined;
  const [assignedCount] = await db.select({ count: sql<number>`count(*)` }).from(equipment).where(eq(equipment.categoryId, id));
  const equipmentCount = Number(assignedCount?.count ?? 0);
  const assignedEquipment = equipmentCount > 0
    ? await db.select({ id: equipment.id, name: equipment.name, serialNumber: equipment.serialNumber, status: equipment.status }).from(equipment).where(eq(equipment.categoryId, id)).orderBy(equipment.name).limit(20)
    : [];
  return {
    target,
    canDelete: equipmentCount === 0,
    blockingReasons: equipmentCount ? [`此分類仍套用於 ${equipmentCount} 項器材；請先將器材改為其他分類或未分類後再刪除`] : [],
    dependencies: equipmentCount ? [{ key: "assignedEquipment", label: "使用此分類的器材", count: equipmentCount, effect: "需先重新分類" }] : [],
    dependentRecordCount: equipmentCount,
    assignedEquipment,
  };
}

export async function deleteCategory(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB_NOT_AVAILABLE");
  await db.transaction(async (tx) => {
    const [target] = await tx.select({ id: equipmentCategories.id }).from(equipmentCategories).where(eq(equipmentCategories.id, id)).limit(1);
    if (!target) throw new Error("CATEGORY_NOT_FOUND");
    const [assignedCount] = await tx.select({ count: sql<number>`count(*)` }).from(equipment).where(eq(equipment.categoryId, id));
    if (Number(assignedCount?.count ?? 0) > 0) throw new Error("CATEGORY_IN_USE");
    await tx.delete(equipmentCategories).where(eq(equipmentCategories.id, id));
  });
}

export async function getUserDeletionPreview(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB_NOT_AVAILABLE");
  const [target] = await db.select({ id: users.id, username: users.username, name: users.name, isFounder: users.isFounder }).from(users).where(eq(users.id, id)).limit(1);
  if (!target) return undefined;

  const [submittedRequests, reviewedRequests, borrowedRecords, handledRecords, reminders, activationDeliveries, activationExports, reports, locationChanges, resolutions, operationEntries, loginAudits, passkeys] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(borrowRequests).where(eq(borrowRequests.requesterId, id)),
    db.select({ count: sql<number>`count(*)` }).from(borrowRequests).where(eq(borrowRequests.reviewerId, id)),
    db.select({ count: sql<number>`count(*)` }).from(borrowRecords).where(eq(borrowRecords.borrowerId, id)),
    db.select({ count: sql<number>`count(*)` }).from(borrowRecords).where(eq(borrowRecords.handledById, id)),
    db.select({ count: sql<number>`count(*)` }).from(borrowReturnReminders).where(eq(borrowReturnReminders.borrowerId, id)),
    db.select({ count: sql<number>`count(*)` }).from(accountActivationCertificateDeliveries).where(or(eq(accountActivationCertificateDeliveries.accountId, id), eq(accountActivationCertificateDeliveries.sentById, id))),
    db.select({ count: sql<number>`count(*)` }).from(accountActivationCertificateExports).where(or(eq(accountActivationCertificateExports.accountId, id), eq(accountActivationCertificateExports.generatedById, id))),
    db.select({ count: sql<number>`count(*)` }).from(systemReports).where(eq(systemReports.authorId, id)),
    db.select({ count: sql<number>`count(*)` }).from(equipmentLocationHistory).where(eq(equipmentLocationHistory.changedById, id)),
    db.select({ count: sql<number>`count(*)` }).from(auditEventResolutions).where(eq(auditEventResolutions.handledById, id)),
    db.select({ count: sql<number>`count(*)` }).from(operationLogs).where(eq(operationLogs.userId, id)),
    db.select({ count: sql<number>`count(*)` }).from(loginAuditLogs).where(eq(loginAuditLogs.userId, id)),
    db.select({ count: sql<number>`count(*)` }).from(passkeyCredentials).where(eq(passkeyCredentials.userId, id)),
  ]);
  const value = (rows: Array<{ count: number }>) => Number(rows[0]?.count ?? 0);
  const dependencies = [
    { key: "submittedRequests", label: "借用申請", count: value(submittedRequests), effect: "刪除" },
    { key: "reviewedRequests", label: "已審核申請的處理人欄位", count: value(reviewedRequests), effect: "移除處理人" },
    { key: "borrowedRecords", label: "借用記錄", count: value(borrowedRecords), effect: "刪除" },
    { key: "handledRecords", label: "歸還處理人欄位", count: value(handledRecords), effect: "移除處理人" },
    { key: "reminders", label: "借還提醒", count: value(reminders), effect: "刪除" },
    { key: "activationCertificates", label: "帳號啟用書紀錄", count: value(activationDeliveries) + value(activationExports), effect: "刪除" },
    { key: "reports", label: "系統報告", count: value(reports), effect: "刪除" },
    { key: "locationChanges", label: "器材位置異動紀錄", count: value(locationChanges), effect: "刪除" },
    { key: "resolutions", label: "異常事件處理紀錄", count: value(resolutions), effect: "刪除" },
    { key: "operationEntries", label: "操作日誌", count: value(operationEntries), effect: "刪除" },
    { key: "securityRecords", label: "登入與通行密鑰紀錄", count: value(loginAudits) + value(passkeys), effect: "刪除" },
  ].filter((entry) => entry.count > 0);
  return { target, dependencies, dependentRecordCount: dependencies.reduce((total, entry) => total + entry.count, 0) };
}

// ─── Equipment ────────────────────────────────────────────────────────────────

export async function getAllEquipment(opts?: {
  categoryId?: number;
  search?: string;
  status?: string;
}): Promise<(Equipment & { categoryName: string | null })[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions: SQL[] = [isNull(equipment.deletedAt)];
  if (opts?.categoryId) conditions.push(eq(equipment.categoryId, opts.categoryId));
  if (opts?.status) conditions.push(eq(equipment.status, opts.status as any));
  if (opts?.search) {
    conditions.push(
      or(
        like(equipment.name, `%${opts.search}%`),
        like(equipment.description, `%${opts.search}%`)
      )!
    );
  }

  const rows = await db
    .select({
      id: equipment.id,
      name: equipment.name,
      categoryId: equipment.categoryId,
      categoryName: equipmentCategories.name,
      description: equipment.description,
      totalQuantity: equipment.totalQuantity,
      availableQuantity: equipment.availableQuantity,
      status: equipment.status,
      imageUrl: equipment.imageUrl,
      serialNumber: equipment.serialNumber,
      location: equipment.location,
      createdAt: equipment.createdAt,
      updatedAt: equipment.updatedAt,
      qrCodeId: equipment.qrCodeId,
    })
    .from(equipment)
    .leftJoin(equipmentCategories, eq(equipment.categoryId, equipmentCategories.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(equipment.createdAt));

  return rows as any;
}

export async function getEquipmentById(id: number): Promise<Equipment | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(equipment).where(and(eq(equipment.id, id), isNull(equipment.deletedAt))).limit(1);
  return result[0];
}

// ─── QR Code Print History ────────────────────────────────────────────────────

export async function createQrPrintHistory(data: InsertQrPrintHistory): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(qrPrintHistory).values(data);
}

export type QrPrintHistoryEntry = QrPrintHistory & {
  printedByName: string | null;
  printedByUsername: string | null;
};

export async function getQrPrintHistory(opts?: {
  printedById?: number;
  limit?: number;
}): Promise<QrPrintHistoryEntry[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: qrPrintHistory.id,
      printedById: qrPrintHistory.printedById,
      equipmentIds: qrPrintHistory.equipmentIds,
      equipmentCount: qrPrintHistory.equipmentCount,
      locationFilter: qrPrintHistory.locationFilter,
      labelPaperSize: qrPrintHistory.labelPaperSize,
      printedAt: qrPrintHistory.printedAt,
      printedByName: sql<string | null>`COALESCE(NULLIF(${users.realName}, ''), NULLIF(${users.name}, ''))`,
      printedByUsername: users.username,
    })
    .from(qrPrintHistory)
    .leftJoin(users, eq(qrPrintHistory.printedById, users.id))
    .where(opts?.printedById ? eq(qrPrintHistory.printedById, opts.printedById) : undefined)
    .orderBy(desc(qrPrintHistory.printedAt))
    .limit(opts?.limit ?? 50);

  return rows;
}

export async function createEquipment(data: InsertEquipment): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(equipment).values(data);
  return (result[0] as any).insertId;
}

export async function updateEquipment(id: number, data: Partial<InsertEquipment>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(equipment).set({ ...data, updatedAt: new Date() }).where(and(eq(equipment.id, id), isNull(equipment.deletedAt)));
}

// ─── Brand Logo Load Failures ─────────────────────────────────────────────────

export async function createBrandLogoLoadFailure(
  data: InsertBrandLogoLoadFailure
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(brandLogoLoadFailures).values(data);
}

export type BrandLogoLoadFailureEntry = BrandLogoLoadFailure & {
  reporterName: string | null;
  reporterUsername: string | null;
  reporterRealName: string | null;
};

export async function getBrandLogoLoadFailures(opts?: {
  deviceClass?: "mobile" | "tablet" | "desktop" | "unknown";
  limit?: number;
  offset?: number;
}): Promise<BrandLogoLoadFailureEntry[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (opts?.deviceClass) conditions.push(eq(brandLogoLoadFailures.deviceClass, opts.deviceClass));

  return db
    .select({
      id: brandLogoLoadFailures.id,
      pagePath: brandLogoLoadFailures.pagePath,
      failedSrc: brandLogoLoadFailures.failedSrc,
      deviceClass: brandLogoLoadFailures.deviceClass,
      viewportWidth: brandLogoLoadFailures.viewportWidth,
      failureStage: brandLogoLoadFailures.failureStage,
      fallbackSrc: brandLogoLoadFailures.fallbackSrc,
      recoveryOutcome: brandLogoLoadFailures.recoveryOutcome,
      userAgent: brandLogoLoadFailures.userAgent,
      reporterUserId: brandLogoLoadFailures.reporterUserId,
      reportedAt: brandLogoLoadFailures.reportedAt,
      reporterName: users.name,
      reporterUsername: users.username,
      reporterRealName: users.realName,
    })
    .from(brandLogoLoadFailures)
    .leftJoin(users, eq(brandLogoLoadFailures.reporterUserId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(brandLogoLoadFailures.reportedAt), desc(brandLogoLoadFailures.id))
    .limit(opts?.limit ?? 50)
    .offset(opts?.offset ?? 0);
}

export async function getBrandLogoLoadFailureCount(opts?: {
  deviceClass?: "mobile" | "tablet" | "desktop" | "unknown";
}): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const conditions = [];
  if (opts?.deviceClass) conditions.push(eq(brandLogoLoadFailures.deviceClass, opts.deviceClass));
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(brandLogoLoadFailures)
    .where(conditions.length ? and(...conditions) : undefined);
  return Number(result[0]?.count ?? 0);
}

export async function getBrandLogoLoadFailureSummarySince(since: Date) {
  const db = await getDb();
  if (!db) return { total: 0, switched: 0, textFallback: 0 };
  const [totalResult, switchedResult, textFallbackResult] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(brandLogoLoadFailures).where(gte(brandLogoLoadFailures.reportedAt, since)),
    db.select({ count: sql<number>`count(*)` }).from(brandLogoLoadFailures).where(and(gte(brandLogoLoadFailures.reportedAt, since), eq(brandLogoLoadFailures.recoveryOutcome, "switched"))),
    db.select({ count: sql<number>`count(*)` }).from(brandLogoLoadFailures).where(and(gte(brandLogoLoadFailures.reportedAt, since), eq(brandLogoLoadFailures.recoveryOutcome, "text_fallback"))),
  ]);
  return {
    total: Number(totalResult[0]?.count ?? 0),
    switched: Number(switchedResult[0]?.count ?? 0),
    textFallback: Number(textFallbackResult[0]?.count ?? 0),
  };
}

const DEFAULT_BRAND_LOGO_ALERT_THRESHOLD = 3;
const TAIPEI_HOURLY_TIME_ZONE = "Asia/Taipei";

function getTaipeiHourlyBrandLogoBucket(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TAIPEI_HOURLY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  const hour = value("hour");
  return { key: `${value("year")}-${value("month")}-${value("day")}T${hour}`, label: `${hour}:00` };
}

export async function getBrandLogoHourlyTrend(now = new Date()) {
  const currentHour = new Date(now);
  currentHour.setUTCMinutes(0, 0, 0);
  const since = new Date(currentHour.getTime() - 23 * 60 * 60 * 1000);
  const buckets = new Map<string, { hour: string; label: string; total: number; switched: number; textFallback: number }>();
  for (let offset = 23; offset >= 0; offset -= 1) {
    const hour = new Date(currentHour.getTime() - offset * 60 * 60 * 1000);
    const bucket = getTaipeiHourlyBrandLogoBucket(hour);
    buckets.set(bucket.key, { hour: bucket.key, label: bucket.label, total: 0, switched: 0, textFallback: 0 });
  }

  const db = await getDb();
  if (!db) return { since, windowHours: 24, hourly: Array.from(buckets.values()) };
  const events = await db
    .select({ reportedAt: brandLogoLoadFailures.reportedAt, recoveryOutcome: brandLogoLoadFailures.recoveryOutcome })
    .from(brandLogoLoadFailures)
    .where(gte(brandLogoLoadFailures.reportedAt, since));
  for (const event of events) {
    const bucket = buckets.get(getTaipeiHourlyBrandLogoBucket(event.reportedAt).key);
    if (!bucket) continue;
    bucket.total += 1;
    if (event.recoveryOutcome === "switched") bucket.switched += 1;
    if (event.recoveryOutcome === "text_fallback") bucket.textFallback += 1;
  }
  return { since, windowHours: 24, hourly: Array.from(buckets.values()) };
}

export async function getBrandLogoAlertThreshold(): Promise<BrandLogoAlertThreshold | null> {
  const db = await getDb();
  if (!db) return null;
  const [threshold] = await db.select().from(brandLogoAlertThresholds)
    .orderBy(desc(brandLogoAlertThresholds.updatedAt), desc(brandLogoAlertThresholds.id)).limit(1);
  return threshold ?? null;
}

export async function getBrandLogoAlertThresholdStatus() {
  const threshold = await getBrandLogoAlertThreshold();
  return {
    thresholdCount: threshold?.thresholdCount ?? DEFAULT_BRAND_LOGO_ALERT_THRESHOLD,
    isEnabled: threshold?.isEnabled ?? true,
    configured: Boolean(threshold),
    updatedAt: threshold?.updatedAt ?? null,
    updatedById: threshold?.updatedById ?? null,
  };
}

export async function upsertBrandLogoAlertThreshold(data: Pick<InsertBrandLogoAlertThreshold, "thresholdCount" | "isEnabled" | "createdById" | "updatedById">): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await getBrandLogoAlertThreshold();
  if (existing) {
    await db.update(brandLogoAlertThresholds).set({
      thresholdCount: data.thresholdCount,
      isEnabled: data.isEnabled,
      updatedById: data.updatedById,
      updatedAt: new Date(),
    }).where(eq(brandLogoAlertThresholds.id, existing.id));
    return;
  }
  await db.insert(brandLogoAlertThresholds).values(data);
}

/** Soft-removes equipment while preserving all borrowing, movement, reminder, and audit history. */
export async function deleteEquipment(id: number, deletedById: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB_NOT_AVAILABLE");

  await db.transaction(async (tx) => {
    const activeRecords = await tx.select({ id: borrowRecords.id }).from(borrowRecords).where(and(
      eq(borrowRecords.equipmentId, id),
      or(eq(borrowRecords.status, "active"), eq(borrowRecords.status, "overdue")),
    )).limit(1);
    if (activeRecords.length) throw new Error("EQUIPMENT_HAS_ACTIVE_BORROW");

    await tx.update(equipment).set({
      categoryId: null,
      deletedAt: new Date(),
      deletedById,
      updatedAt: new Date(),
    }).where(and(eq(equipment.id, id), isNull(equipment.deletedAt)));
  });
}

// ─── Equipment Location History ───────────────────────────────────────────────

export async function getEquipmentDeletionPreview(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB_NOT_AVAILABLE");
  const [target] = await db.select({ id: equipment.id, name: equipment.name, serialNumber: equipment.serialNumber }).from(equipment).where(and(eq(equipment.id, id), isNull(equipment.deletedAt))).limit(1);
  if (!target) return undefined;

  const [activeRecords, returnedRecords, requests, reminders, locationChanges, movementAlerts] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(borrowRecords).where(and(eq(borrowRecords.equipmentId, id), or(eq(borrowRecords.status, "active"), eq(borrowRecords.status, "overdue")))),
    db.select({ count: sql<number>`count(*)` }).from(borrowRecords).where(and(eq(borrowRecords.equipmentId, id), eq(borrowRecords.status, "returned"))),
    db.select({ count: sql<number>`count(*)` }).from(borrowRequests).where(eq(borrowRequests.equipmentId, id)),
    db.select({ count: sql<number>`count(*)` }).from(borrowReturnReminders).innerJoin(borrowRecords, eq(borrowReturnReminders.borrowRecordId, borrowRecords.id)).where(eq(borrowRecords.equipmentId, id)),
    db.select({ count: sql<number>`count(*)` }).from(equipmentLocationHistory).where(eq(equipmentLocationHistory.equipmentId, id)),
    db.select({ count: sql<number>`count(*)` }).from(equipmentLocationMovementAlerts).where(eq(equipmentLocationMovementAlerts.equipmentId, id)),
  ]);
  const value = (rows: Array<{ count: number }>) => Number(rows[0]?.count ?? 0);
  const activeBorrowCount = value(activeRecords);
  const dependencies = [
    { key: "returnedRecords", label: "已歸還借用記錄", count: value(returnedRecords), effect: "保留作稽核" },
    { key: "requests", label: "借用申請", count: value(requests), effect: "保留作稽核" },
    { key: "reminders", label: "借還提醒", count: value(reminders), effect: "保留作稽核" },
    { key: "locationChanges", label: "位置異動紀錄", count: value(locationChanges), effect: "保留作稽核" },
    { key: "movementAlerts", label: "位置異動警示", count: value(movementAlerts), effect: "保留作稽核" },
  ].filter((entry) => entry.count > 0);
  return {
    target,
    canDelete: activeBorrowCount === 0,
    blockingReasons: activeBorrowCount ? [`仍有 ${activeBorrowCount} 筆借出中或逾期借用記錄，完成歸還前不得刪除`] : [],
    dependencies,
    dependentRecordCount: dependencies.reduce((total, entry) => total + entry.count, 0),
  };
}

export async function createEquipmentLocationHistoryEntry(
  data: InsertEquipmentLocationHistory
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(equipmentLocationHistory).values(data);
}

export const LOCATION_MOVEMENT_ALERT_THRESHOLD = 5;

export type EquipmentLocationHistoryEntry = EquipmentLocationHistory & {
  changedByName: string | null;
  changedByUsername: string | null;
  changedByRealName: string | null;
  reviewedByName: string | null;
  reviewedByUsername: string | null;
  reviewedByRealName: string | null;
  signedByName: string | null;
  signedByUsername: string | null;
  signedByRealName: string | null;
};

export type EquipmentLocationHistoryFilters = {
  changedById?: number;
  changedAtFrom?: Date;
  changedAtTo?: Date;
};

export async function getEquipmentLocationHistory(
  equipmentId: number,
  filters?: EquipmentLocationHistoryFilters
): Promise<EquipmentLocationHistoryEntry[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(equipmentLocationHistory.equipmentId, equipmentId)];
  if (filters?.changedById) conditions.push(eq(equipmentLocationHistory.changedById, filters.changedById));
  if (filters?.changedAtFrom) conditions.push(gte(equipmentLocationHistory.changedAt, filters.changedAtFrom));
  if (filters?.changedAtTo) conditions.push(lte(equipmentLocationHistory.changedAt, filters.changedAtTo));
  const reviewer = alias(users, "equipment_location_history_reviewer");
  const signer = alias(users, "equipment_location_history_signer");

  return db
    .select({
      id: equipmentLocationHistory.id,
      equipmentId: equipmentLocationHistory.equipmentId,
      previousLocation: equipmentLocationHistory.previousLocation,
      newLocation: equipmentLocationHistory.newLocation,
      changedById: equipmentLocationHistory.changedById,
      changedAt: equipmentLocationHistory.changedAt,
      note: equipmentLocationHistory.note,
      reviewStatus: equipmentLocationHistory.reviewStatus,
      reviewNote: equipmentLocationHistory.reviewNote,
      reviewedById: equipmentLocationHistory.reviewedById,
      reviewedAt: equipmentLocationHistory.reviewedAt,
      signatureStatus: equipmentLocationHistory.signatureStatus,
      signedById: equipmentLocationHistory.signedById,
      signedAt: equipmentLocationHistory.signedAt,
      signatureMethod: equipmentLocationHistory.signatureMethod,
      changedByName: users.name,
      changedByUsername: users.username,
      changedByRealName: users.realName,
      reviewedByName: reviewer.name,
      reviewedByUsername: reviewer.username,
      reviewedByRealName: reviewer.realName,
      signedByName: signer.name,
      signedByUsername: signer.username,
      signedByRealName: signer.realName,
    })
    .from(equipmentLocationHistory)
    .leftJoin(users, eq(equipmentLocationHistory.changedById, users.id))
    .leftJoin(reviewer, eq(equipmentLocationHistory.reviewedById, reviewer.id))
    .leftJoin(signer, eq(equipmentLocationHistory.signedById, signer.id))
    .where(and(...conditions))
    .orderBy(desc(equipmentLocationHistory.changedAt), desc(equipmentLocationHistory.id));
}

export async function getEquipmentLocationHistoryEntryById(id: number): Promise<EquipmentLocationHistory | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const [entry] = await db.select().from(equipmentLocationHistory).where(eq(equipmentLocationHistory.id, id)).limit(1);
  return entry;
}

export async function reviewEquipmentLocationHistoryEntry(input: {
  id: number;
  reviewStatus: "approved" | "rejected";
  reviewNote: string | null;
  reviewedById: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(equipmentLocationHistory).set({
    reviewStatus: input.reviewStatus,
    reviewNote: input.reviewNote,
    reviewedById: input.reviewedById,
    reviewedAt: new Date(),
    signatureStatus: "unsigned",
    signedById: null,
    signedAt: null,
    signatureMethod: null,
  }).where(eq(equipmentLocationHistory.id, input.id));
}

export async function signEquipmentLocationHistoryEntry(input: { id: number; signedById: number }): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(equipmentLocationHistory).set({
    signatureStatus: "signed",
    signedById: input.signedById,
    signedAt: new Date(),
    signatureMethod: "authenticated-session-confirmed",
  }).where(eq(equipmentLocationHistory.id, input.id));
}

export type EquipmentLocationHistoryOperator = {
  changedById: number;
  changedByName: string | null;
  changedByUsername: string | null;
  changedByRealName: string | null;
};

export async function getEquipmentLocationHistoryOperators(
  equipmentId: number
): Promise<EquipmentLocationHistoryOperator[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      changedById: equipmentLocationHistory.changedById,
      changedByName: users.name,
      changedByUsername: users.username,
      changedByRealName: users.realName,
    })
    .from(equipmentLocationHistory)
    .leftJoin(users, eq(equipmentLocationHistory.changedById, users.id))
    .where(eq(equipmentLocationHistory.equipmentId, equipmentId))
    .orderBy(users.realName, users.name, users.username);

  const activeOperators = rows.filter((row): row is typeof row & { changedById: number } => row.changedById !== null);
  return Array.from(new Map(activeOperators.map((row) => [row.changedById, row])).values());
}

export type MonthlyLocationAuditFilters = {
  month: string;
  equipmentId?: number;
  location?: string;
};

type MonthlyAuditTrendBucket = {
  month: string;
  label: string;
  changes: number;
  equipmentIds: Set<number>;
  locations: Set<string>;
};

export function getTaipeiMonthKey(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit" }).formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
}

function getTaipeiMonthStart(month: string): Date {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, 1, -8));
}

function getTaipeiNextMonthStart(month: string): Date {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 1, -8));
}

export async function getMonthlyEquipmentLocationMovementCount(equipmentId: number, month: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select({ count: sql<number>`count(*)` }).from(equipmentLocationHistory)
    .where(and(
      eq(equipmentLocationHistory.equipmentId, equipmentId),
      gte(equipmentLocationHistory.changedAt, getTaipeiMonthStart(month)),
      lt(equipmentLocationHistory.changedAt, getTaipeiNextMonthStart(month))
    ));
  return Number(rows[0]?.count ?? 0);
}

/** 管理者儀表板使用的本月器材位置異動與異常處理概覽 */
export async function getDashboardOperationalAlertSummary(referenceDate = new Date()) {
  const db = await getDb();
  const month = getTaipeiMonthKey(referenceDate);
  if (!db) return { month, locationMovementAlertCount: 0, pendingNotificationCount: 0, failedNotificationCount: 0, inProgressAuditEventCount: 0 };

  const [alertRows, inProgressRows] = await Promise.all([
    db.select({
      total: sql<number>`count(*)`,
      pending: sql<number>`sum(case when ${equipmentLocationMovementAlerts.notificationStatus} = 'pending' then 1 else 0 end)`,
      failed: sql<number>`sum(case when ${equipmentLocationMovementAlerts.notificationStatus} = 'failed' then 1 else 0 end)`,
    }).from(equipmentLocationMovementAlerts).where(eq(equipmentLocationMovementAlerts.month, month)),
    db.select({ total: sql<number>`count(*)` }).from(auditEventResolutions).where(eq(auditEventResolutions.status, "in_progress")),
  ]);

  return {
    month,
    locationMovementAlertCount: Number(alertRows[0]?.total ?? 0),
    pendingNotificationCount: Number(alertRows[0]?.pending ?? 0),
    failedNotificationCount: Number(alertRows[0]?.failed ?? 0),
    inProgressAuditEventCount: Number(inProgressRows[0]?.total ?? 0),
  };
}

export async function createEquipmentLocationMovementAlert(data: InsertEquipmentLocationMovementAlert): Promise<number | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db.insert(equipmentLocationMovementAlerts).values(data);
    return Number((result[0] as any).insertId);
  } catch (error: any) {
    if (error?.code === "ER_DUP_ENTRY" || error?.cause?.code === "ER_DUP_ENTRY") return undefined;
    throw error;
  }
}

export async function updateEquipmentLocationMovementAlertNotification(input: { id: number; status: "sent" | "failed" | "suppressed"; error?: string | null }): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(equipmentLocationMovementAlerts).set({
    notificationStatus: input.status,
    notificationError: input.error?.slice(0, 2048) || null,
    lastSentAt: input.status === "sent" ? new Date() : null,
  }).where(eq(equipmentLocationMovementAlerts.id, input.id));
}

function getMonthSequence(endMonth: string, count = 12): string[] {
  const [year, monthNumber] = endMonth.split("-").map(Number);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, monthNumber - count + index, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

export async function getMonthlyLocationAuditSummary(filters: MonthlyLocationAuditFilters) {
  const db = await getDb();
  const months = getMonthSequence(filters.month);
  const windowStart = getTaipeiMonthStart(months[0]!);
  const selectedMonthStart = getTaipeiMonthStart(filters.month);
  const selectedMonthEnd = getTaipeiNextMonthStart(filters.month);

  if (!db) {
    return {
      month: filters.month,
      rangeStart: selectedMonthStart,
      rangeEnd: selectedMonthEnd,
      totalChanges: 0,
      equipmentCount: 0,
      locationCount: 0,
      locationMovementAlertThreshold: LOCATION_MOVEMENT_ALERT_THRESHOLD,
      anomalousEquipment: [],
      monthlyTrend: months.map((month) => ({ month, label: month.replace("-", "/"), changes: 0, equipmentCount: 0, locationCount: 0 })),
      equipmentBreakdown: [],
      locationBreakdown: [],
    };
  }

  const conditions = [gte(equipmentLocationHistory.changedAt, windowStart), lt(equipmentLocationHistory.changedAt, selectedMonthEnd)];
  if (filters.equipmentId) conditions.push(eq(equipmentLocationHistory.equipmentId, filters.equipmentId));
  if (filters.location) conditions.push(or(eq(equipmentLocationHistory.previousLocation, filters.location), eq(equipmentLocationHistory.newLocation, filters.location))!);

  const rows = await db
    .select({
      equipmentId: equipmentLocationHistory.equipmentId,
      equipmentName: equipment.name,
      currentLocation: equipment.location,
      previousLocation: equipmentLocationHistory.previousLocation,
      newLocation: equipmentLocationHistory.newLocation,
      changedAt: equipmentLocationHistory.changedAt,
    })
    .from(equipmentLocationHistory)
    .innerJoin(equipment, eq(equipmentLocationHistory.equipmentId, equipment.id))
    .where(and(...conditions))
    .orderBy(equipmentLocationHistory.changedAt);

  const trendMap = new Map<string, MonthlyAuditTrendBucket>(months.map((month) => [month, { month, label: month.replace("-", "/"), changes: 0, equipmentIds: new Set<number>(), locations: new Set<string>() }]));
  const selectedRows = rows.filter((row) => getTaipeiMonthKey(row.changedAt) === filters.month);
  const equipmentMap = new Map<number, { equipmentId: number; equipmentName: string; currentLocation: string | null; changes: number }>();
  const locationMap = new Map<string, { location: string; changes: number; incomingCount: number; outgoingCount: number; equipmentIds: Set<number> }>();

  for (const row of rows) {
    const monthKey = getTaipeiMonthKey(row.changedAt);
    const bucket = trendMap.get(monthKey);
    if (!bucket) continue;
    bucket.changes += 1;
    bucket.equipmentIds.add(row.equipmentId);
    [row.previousLocation, row.newLocation].filter((location): location is string => Boolean(location?.trim())).forEach((location) => bucket.locations.add(location));
  }

  for (const row of selectedRows) {
    const equipmentEntry = equipmentMap.get(row.equipmentId) ?? { equipmentId: row.equipmentId, equipmentName: row.equipmentName, currentLocation: row.currentLocation, changes: 0 };
    equipmentEntry.changes += 1;
    equipmentMap.set(row.equipmentId, equipmentEntry);

    ([{ location: row.previousLocation, direction: "outgoing" as const }, { location: row.newLocation, direction: "incoming" as const }]).forEach(({ location, direction }) => {
      const label = location?.trim();
      if (!label) return;
      const locationEntry = locationMap.get(label) ?? { location: label, changes: 0, incomingCount: 0, outgoingCount: 0, equipmentIds: new Set<number>() };
      locationEntry.changes += 1;
      locationEntry[direction === "incoming" ? "incomingCount" : "outgoingCount"] += 1;
      locationEntry.equipmentIds.add(row.equipmentId);
      locationMap.set(label, locationEntry);
    });
  }

  return {
    month: filters.month,
    rangeStart: selectedMonthStart,
    rangeEnd: selectedMonthEnd,
    totalChanges: selectedRows.length,
    equipmentCount: equipmentMap.size,
    locationCount: locationMap.size,
    locationMovementAlertThreshold: LOCATION_MOVEMENT_ALERT_THRESHOLD,
    anomalousEquipment: Array.from(equipmentMap.values()).filter((entry) => entry.changes >= LOCATION_MOVEMENT_ALERT_THRESHOLD).sort((a, b) => b.changes - a.changes || a.equipmentName.localeCompare(b.equipmentName, "zh-Hant")),
    monthlyTrend: months.map((month) => {
      const bucket = trendMap.get(month)!;
      return { month, label: bucket.label, changes: bucket.changes, equipmentCount: bucket.equipmentIds.size, locationCount: bucket.locations.size };
    }),
    equipmentBreakdown: Array.from(equipmentMap.values()).sort((a, b) => b.changes - a.changes || a.equipmentName.localeCompare(b.equipmentName, "zh-Hant")),
    locationBreakdown: Array.from(locationMap.values()).map(({ equipmentIds, ...entry }) => ({ ...entry, equipmentCount: equipmentIds.size })).sort((a, b) => b.changes - a.changes || a.location.localeCompare(b.location, "zh-Hant")),
  };
}

// ─── Borrow Requests ──────────────────────────────────────────────────────────

export async function createBorrowRequest(data: InsertBorrowRequest): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(borrowRequests).values(data);
  return (result[0] as any).insertId;
}

export async function getBorrowRequests(opts?: {
  requesterId?: number;
  status?: string;
  equipmentId?: number;
}): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (opts?.requesterId) conditions.push(eq(borrowRequests.requesterId, opts.requesterId));
  if (opts?.status) conditions.push(eq(borrowRequests.status, opts.status as any));
  if (opts?.equipmentId) conditions.push(eq(borrowRequests.equipmentId, opts.equipmentId));

  const rows = await db
    .select({
      id: borrowRequests.id,
      equipmentId: borrowRequests.equipmentId,
      equipmentName: equipment.name,
      equipmentImageUrl: equipment.imageUrl,
      equipmentAvailableQuantity: equipment.availableQuantity,
      requesterId: borrowRequests.requesterId,
      requesterName: users.name,
      quantity: borrowRequests.quantity,
      borrowDate: borrowRequests.borrowDate,
      returnDate: borrowRequests.returnDate,
      purpose: borrowRequests.purpose,
      status: borrowRequests.status,
      reviewerId: borrowRequests.reviewerId,
      reviewNote: borrowRequests.reviewNote,
      reviewedAt: borrowRequests.reviewedAt,
      createdAt: borrowRequests.createdAt,
      updatedAt: borrowRequests.updatedAt,
    })
    .from(borrowRequests)
    .leftJoin(equipment, eq(borrowRequests.equipmentId, equipment.id))
    .leftJoin(users, eq(borrowRequests.requesterId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(borrowRequests.createdAt));

  if (rows.length === 0) return rows;

  const requestIds = rows.map((row) => row.id);
  const founderUpdates = await db
    .select({ entityId: operationLogs.entityId, details: operationLogs.details, createdAt: operationLogs.createdAt })
    .from(operationLogs)
    .where(and(
      eq(operationLogs.entityType, "borrowRequest"),
      eq(operationLogs.action, "founderUpdateBorrowRequest"),
      inArray(operationLogs.entityId, requestIds),
    ))
    .orderBy(desc(operationLogs.createdAt));

  type FounderUpdateSnapshot = {
    quantity: number | null;
    borrowDate: string | null;
    returnDate: string | null;
    purpose: string | null;
  };
  const parseFounderUpdateSnapshot = (value: unknown): FounderUpdateSnapshot | null => {
    if (!value || typeof value !== "object") return null;
    const snapshot = value as Record<string, unknown>;
    const toDateString = (candidate: unknown) => {
      if (typeof candidate !== "string") return null;
      const date = new Date(candidate);
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    };
    return {
      quantity: typeof snapshot.quantity === "number" && Number.isFinite(snapshot.quantity) ? snapshot.quantity : null,
      borrowDate: toDateString(snapshot.borrowDate),
      returnDate: toDateString(snapshot.returnDate),
      purpose: typeof snapshot.purpose === "string" ? snapshot.purpose : null,
    };
  };
  const latestFounderUpdates = new Map<number, { createdAt: Date; reason: string | null; before: FounderUpdateSnapshot | null; after: FounderUpdateSnapshot | null }>();
  for (const update of founderUpdates) {
    if (update.entityId === null || latestFounderUpdates.has(update.entityId)) continue;
    let reason: string | null = null;
    let before: FounderUpdateSnapshot | null = null;
    let after: FounderUpdateSnapshot | null = null;
    try {
      const parsed = JSON.parse(update.details || "{}");
      reason = typeof parsed.reason === "string" ? parsed.reason : null;
      before = parseFounderUpdateSnapshot(parsed.before);
      after = parseFounderUpdateSnapshot(parsed.after);
    } catch {
      reason = null;
    }
    latestFounderUpdates.set(update.entityId, { createdAt: update.createdAt, reason, before, after });
  }

  return rows.map((row) => {
    const latestUpdate = latestFounderUpdates.get(row.id);
    return {
      ...row,
      founderLastUpdatedAt: latestUpdate?.createdAt ?? null,
      founderUpdateReason: latestUpdate?.reason ?? null,
      founderUpdateBefore: latestUpdate?.before ?? null,
      founderUpdateAfter: latestUpdate?.after ?? null,
    };
  });
}

export async function getBorrowRequestById(id: number): Promise<BorrowRequest | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(borrowRequests).where(eq(borrowRequests.id, id)).limit(1);
  return result[0];
}

export async function reviewBorrowRequest(
  id: number,
  reviewerId: number,
  status: "approved" | "rejected",
  reviewNote?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(borrowRequests)
    .set({ status, reviewerId, reviewNote: reviewNote ?? null, reviewedAt: new Date(), updatedAt: new Date() })
    .where(eq(borrowRequests.id, id));
}

export async function cancelBorrowRequest(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(borrowRequests).set({ status: "cancelled", updatedAt: new Date() }).where(eq(borrowRequests.id, id));
}

export async function updateBorrowRequestByFounder(
  id: number,
  data: { quantity: number; borrowDate: Date; returnDate: Date; purpose?: string | null }
): Promise<{ synchronizedBorrowRecord: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  return db.transaction(async (tx) => {
    const [request] = await tx.select().from(borrowRequests).where(eq(borrowRequests.id, id)).limit(1);
    if (!request) throw new Error("BORROW_REQUEST_NOT_FOUND");

    const [equipmentItem] = await tx.select().from(equipment).where(eq(equipment.id, request.equipmentId)).limit(1);
    if (!equipmentItem) throw new Error("EQUIPMENT_NOT_FOUND");

    let synchronizedBorrowRecord = false;
    let existingActiveQuantity = 0;
    if (request.status === "approved") {
      const [record] = await tx.select().from(borrowRecords).where(eq(borrowRecords.requestId, id)).limit(1);
      if (record?.status === "returned") throw new Error("RETURNED_BORROW_RECORD_IMMUTABLE");

      if (record && (record.status === "active" || record.status === "overdue")) {
        existingActiveQuantity = request.quantity;
        if (data.quantity > equipmentItem.availableQuantity + existingActiveQuantity) throw new Error("INSUFFICIENT_AVAILABLE_QUANTITY");
        const quantityDelta = data.quantity - request.quantity;

        await tx.update(borrowRecords).set({
          quantity: data.quantity,
          borrowedAt: data.borrowDate,
          expectedReturnAt: data.returnDate,
          updatedAt: new Date(),
        }).where(eq(borrowRecords.id, record.id));
        if (quantityDelta !== 0) {
          await tx.update(equipment).set({
            availableQuantity: equipmentItem.availableQuantity - quantityDelta,
            updatedAt: new Date(),
          }).where(eq(equipment.id, request.equipmentId));
        }
        synchronizedBorrowRecord = true;
      }
    }

    if (data.quantity > equipmentItem.availableQuantity + existingActiveQuantity) throw new Error("INSUFFICIENT_AVAILABLE_QUANTITY");

    await tx.update(borrowRequests).set({
      quantity: data.quantity,
      borrowDate: data.borrowDate,
      returnDate: data.returnDate,
      purpose: data.purpose?.trim() || null,
      updatedAt: new Date(),
    }).where(eq(borrowRequests.id, id));

    return { synchronizedBorrowRecord };
  });
}

// ─── Borrow Records ───────────────────────────────────────────────────────────

export async function createBorrowRecord(data: InsertBorrowRecord): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(borrowRecords).values(data);
  return (result[0] as any).insertId;
}

export async function getBorrowRecords(opts?: {
  borrowerId?: number;
  status?: string;
  equipmentId?: number;
}): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (opts?.borrowerId) conditions.push(eq(borrowRecords.borrowerId, opts.borrowerId));
  if (opts?.status) conditions.push(eq(borrowRecords.status, opts.status as any));
  if (opts?.equipmentId) conditions.push(eq(borrowRecords.equipmentId, opts.equipmentId));

  const borrowerUsers = users;

  const rows = await db
    .select({
      id: borrowRecords.id,
      requestId: borrowRecords.requestId,
      equipmentId: borrowRecords.equipmentId,
      equipmentName: equipment.name,
      equipmentImageUrl: equipment.imageUrl,
      borrowerId: borrowRecords.borrowerId,
      borrowerName: users.name,
      quantity: borrowRecords.quantity,
      borrowedAt: borrowRecords.borrowedAt,
      expectedReturnAt: borrowRecords.expectedReturnAt,
      actualReturnAt: borrowRecords.actualReturnAt,
      status: borrowRecords.status,
      returnNote: borrowRecords.returnNote,
      handledById: borrowRecords.handledById,
      createdAt: borrowRecords.createdAt,
      updatedAt: borrowRecords.updatedAt,
    })
    .from(borrowRecords)
    .leftJoin(equipment, eq(borrowRecords.equipmentId, equipment.id))
    .leftJoin(users, eq(borrowRecords.borrowerId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(borrowRecords.createdAt));

  return rows;
}

export async function returnBorrowRecord(
  id: number,
  handledById: number,
  returnNote?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(borrowRecords)
    .set({
      status: "returned",
      actualReturnAt: new Date(),
      handledById,
      returnNote: returnNote ?? null,
      updatedAt: new Date(),
    })
    .where(eq(borrowRecords.id, id));
}

export async function updateOverdueRecords(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const now = new Date();
  await db
    .update(borrowRecords)
    .set({ status: "overdue", updatedAt: now })
    .where(and(eq(borrowRecords.status, "active"), sql`${borrowRecords.expectedReturnAt} < ${now}`));
}

// ─── Borrow Return Reminders ──────────────────────────────────────────────────

export async function getOverdueBorrowReminderScheduleByTaskUid(taskUid: string): Promise<OverdueBorrowReminderSchedule | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(overdueBorrowReminderSchedules)
    .where(eq(overdueBorrowReminderSchedules.scheduleCronTaskUid, taskUid)).limit(1);
  return result[0];
}

export async function getOverdueBorrowReminderSchedule(): Promise<OverdueBorrowReminderSchedule | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(overdueBorrowReminderSchedules)
    .orderBy(desc(overdueBorrowReminderSchedules.createdAt)).limit(1);
  return result[0];
}

export async function updateOverdueBorrowReminderScheduleLastRun(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(overdueBorrowReminderSchedules).set({ lastRunAt: new Date() }).where(eq(overdueBorrowReminderSchedules.id, id));
}

export type BorrowReminderTarget = {
  id: number;
  equipmentName: string | null;
  borrowerId: number;
  borrowerName: string | null;
  borrowerUsername: string | null;
  borrowerEmail: string | null;
  expectedReturnAt: Date;
  status: "active" | "overdue";
};

export async function getBorrowReminderTargets(): Promise<BorrowReminderTarget[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: borrowRecords.id,
      equipmentName: equipment.name,
      borrowerId: borrowRecords.borrowerId,
      borrowerName: users.name,
      borrowerUsername: users.username,
      borrowerEmail: users.email,
      expectedReturnAt: borrowRecords.expectedReturnAt,
      status: borrowRecords.status,
    })
    .from(borrowRecords)
    .leftJoin(equipment, eq(borrowRecords.equipmentId, equipment.id))
    .leftJoin(users, eq(borrowRecords.borrowerId, users.id))
    .where(and(isNull(borrowRecords.actualReturnAt), sql`${borrowRecords.status} IN ('active', 'overdue')`));
  return rows as BorrowReminderTarget[];
}

export async function createBorrowReturnReminder(data: InsertBorrowReturnReminder): Promise<number | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db.insert(borrowReturnReminders).values(data);
    return Number((result[0] as any).insertId);
  } catch (error: any) {
    if (error?.code === "ER_DUP_ENTRY" || error?.cause?.code === "ER_DUP_ENTRY") return undefined;
    throw error;
  }
}

export async function updateBorrowReturnReminderEmail(input: {
  id: number;
  status: "sent" | "failed" | "skipped";
  error?: string | null;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(borrowReturnReminders).set({
    emailStatus: input.status,
    emailSentAt: input.status === "sent" ? new Date() : null,
    emailError: input.error?.slice(0, 2048) || null,
  }).where(eq(borrowReturnReminders.id, input.id));
}

export type BorrowReturnReminderHistoryEntry = BorrowReturnReminder & {
  equipmentName: string | null;
  borrowerName: string | null;
  borrowerUsername: string | null;
  borrowerEmail: string | null;
  expectedReturnAt: Date;
  borrowStatus: "active" | "returned" | "overdue";
  resentByName: string | null;
  resentByUsername: string | null;
};

export async function getBorrowReturnReminderHistory(limit = 100): Promise<BorrowReturnReminderHistoryEntry[]> {
  const db = await getDb();
  if (!db) return [];
  const resentBy = alias(users, "borrow_return_reminders_resent_by");
  const rows = await db.select({
    id: borrowReturnReminders.id, borrowRecordId: borrowReturnReminders.borrowRecordId, borrowerId: borrowReturnReminders.borrowerId,
    reminderType: borrowReturnReminders.reminderType, reminderDate: borrowReturnReminders.reminderDate, emailStatus: borrowReturnReminders.emailStatus,
    emailSentAt: borrowReturnReminders.emailSentAt, emailError: borrowReturnReminders.emailError, resendCount: borrowReturnReminders.resendCount,
    lastResentAt: borrowReturnReminders.lastResentAt, lastResentById: borrowReturnReminders.lastResentById, inAppReadAt: borrowReturnReminders.inAppReadAt, createdAt: borrowReturnReminders.createdAt,
    equipmentName: equipment.name, borrowerName: users.name, borrowerUsername: users.username, borrowerEmail: users.email,
    expectedReturnAt: borrowRecords.expectedReturnAt, borrowStatus: borrowRecords.status,
    resentByName: resentBy.name, resentByUsername: resentBy.username,
  }).from(borrowReturnReminders)
    .innerJoin(borrowRecords, eq(borrowReturnReminders.borrowRecordId, borrowRecords.id))
    .leftJoin(equipment, eq(borrowRecords.equipmentId, equipment.id))
    .leftJoin(users, eq(borrowReturnReminders.borrowerId, users.id))
    .leftJoin(resentBy, eq(borrowReturnReminders.lastResentById, resentBy.id))
    .orderBy(desc(borrowReturnReminders.createdAt)).limit(limit);
  return rows as BorrowReturnReminderHistoryEntry[];
}

export async function getBorrowReturnReminderById(id: number): Promise<BorrowReturnReminderHistoryEntry | undefined> {
  const rows = await getBorrowReturnReminderHistory(500);
  return rows.find((row) => row.id === id);
}

export async function markBorrowReturnReminderResent(input: { id: number; resentById: number; status: "sent" | "failed"; error?: string | null }): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(borrowReturnReminders).set({
    emailStatus: input.status,
    emailSentAt: input.status === "sent" ? new Date() : null,
    emailError: input.error?.slice(0, 2048) || null,
    resendCount: sql`${borrowReturnReminders.resendCount} + 1`,
    lastResentAt: new Date(),
    lastResentById: input.resentById,
  }).where(eq(borrowReturnReminders.id, input.id));
}

export type BorrowReturnReminderEntry = BorrowReturnReminder & {
  equipmentName: string | null;
  expectedReturnAt: Date;
};

export async function getUnreadBorrowReturnReminders(borrowerId: number): Promise<BorrowReturnReminderEntry[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    id: borrowReturnReminders.id,
    borrowRecordId: borrowReturnReminders.borrowRecordId,
    borrowerId: borrowReturnReminders.borrowerId,
    reminderType: borrowReturnReminders.reminderType,
    reminderDate: borrowReturnReminders.reminderDate,
    emailStatus: borrowReturnReminders.emailStatus,
    emailSentAt: borrowReturnReminders.emailSentAt,
    emailError: borrowReturnReminders.emailError,
    inAppReadAt: borrowReturnReminders.inAppReadAt,
    createdAt: borrowReturnReminders.createdAt,
    equipmentName: equipment.name,
    expectedReturnAt: borrowRecords.expectedReturnAt,
  }).from(borrowReturnReminders)
    .innerJoin(borrowRecords, eq(borrowReturnReminders.borrowRecordId, borrowRecords.id))
    .leftJoin(equipment, eq(borrowRecords.equipmentId, equipment.id))
    .where(and(eq(borrowReturnReminders.borrowerId, borrowerId), isNull(borrowReturnReminders.inAppReadAt)))
    .orderBy(desc(borrowReturnReminders.createdAt));
  return rows as BorrowReturnReminderEntry[];
}

export async function markBorrowReturnRemindersRead(ids: number[], borrowerId: number): Promise<void> {
  const db = await getDb();
  if (!db || ids.length === 0) return;
  await db.update(borrowReturnReminders).set({ inAppReadAt: new Date() })
    .where(and(eq(borrowReturnReminders.borrowerId, borrowerId), inArray(borrowReturnReminders.id, ids)));
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

// ─── Login Audit Logs ─────────────────────────────────────────────────────────

export async function createLoginAuditLog(data: InsertLoginAuditLog): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(loginAuditLogs).values(data);
}

export type LoginAuditLogEntry = LoginAuditLog & { displayName: string };

export async function getLoginAuditLogs(opts?: {
  username?: string;
  status?: "success" | "failed";
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<LoginAuditLogEntry[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (opts?.username) conditions.push(like(loginAuditLogs.username, `%${opts.username}%`));
  if (opts?.status) conditions.push(eq(loginAuditLogs.status, opts.status));
  if (opts?.startDate) conditions.push(gte(loginAuditLogs.loginAt, opts.startDate));
  if (opts?.endDate) conditions.push(lte(loginAuditLogs.loginAt, opts.endDate));

  const query = db
    .select({
      id: loginAuditLogs.id,
      username: loginAuditLogs.username,
      userId: loginAuditLogs.userId,
      ipAddress: loginAuditLogs.ipAddress,
      userAgent: loginAuditLogs.userAgent,
      status: loginAuditLogs.status,
      loginMethod: loginAuditLogs.loginMethod,
      failureReason: loginAuditLogs.failureReason,
      loginAt: loginAuditLogs.loginAt,
      displayName: sql<string>`COALESCE(NULLIF(${users.realName}, ''), NULLIF(${users.name}, ''), NULLIF(${users.username}, ''), ${loginAuditLogs.username})`,
    })
    .from(loginAuditLogs)
    .leftJoin(users, eq(loginAuditLogs.userId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(loginAuditLogs.loginAt))
    .limit(opts?.limit ?? 50)
    .offset(opts?.offset ?? 0);

  return query;
}

export async function getLoginAuditLogCount(opts?: {
  username?: string;
  status?: "success" | "failed";
  startDate?: Date;
  endDate?: Date;
}): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const conditions = [];
  if (opts?.username) conditions.push(like(loginAuditLogs.username, `%${opts.username}%`));
  if (opts?.status) conditions.push(eq(loginAuditLogs.status, opts.status));
  if (opts?.startDate) conditions.push(gte(loginAuditLogs.loginAt, opts.startDate));
  if (opts?.endDate) conditions.push(lte(loginAuditLogs.loginAt, opts.endDate));

  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(loginAuditLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return Number(result?.count ?? 0);
}

export const LOGIN_ANALYTICS_PERIODS = ["24h", "7d", "30d"] as const;
export type LoginAnalyticsPeriod = (typeof LOGIN_ANALYTICS_PERIODS)[number];
export const LOCKED_EVENT_WARNING_THRESHOLD = 3;

const HIGH_RISK_LOGIN_PATTERN = /鎖定|lock|暴力|brute|suspicious|異常|黑名單|blacklist/i;
const LOCKED_LOGIN_PATTERN = /鎖定|lock/i;
const TAIPEI_TIME_ZONE = "Asia/Taipei";

function getLoginPeriodStart(period: LoginAnalyticsPeriod, now = new Date()) {
  const millisecondsByPeriod: Record<LoginAnalyticsPeriod, number> = {
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };
  return new Date(now.getTime() - millisecondsByPeriod[period]);
}

function getTaipeiDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TAIPEI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return { key: `${value("year")}-${value("month")}-${value("day")}`, label: `${value("month")}/${value("day")}` };
}

function getLoginPeriodDayCount(period: LoginAnalyticsPeriod) {
  return period === "24h" ? 2 : period === "7d" ? 7 : 30;
}

function createDailyLoginBuckets(period: LoginAnalyticsPeriod, now: Date) {
  const buckets = new Map<string, { date: string; label: string; loginCount: number; failedCount: number; failureRate: number }>();
  const dayCount = getLoginPeriodDayCount(period);
  for (let offset = dayCount - 1; offset >= 0; offset -= 1) {
    const day = new Date(now);
    day.setUTCDate(day.getUTCDate() - offset);
    const { key, label } = getTaipeiDateParts(day);
    buckets.set(key, { date: key, label, loginCount: 0, failedCount: 0, failureRate: 0 });
  }
  return buckets;
}

function getLockedEventWarning(lockedEventCount: number) {
  return {
    threshold: LOCKED_EVENT_WARNING_THRESHOLD,
    lockedEventCount,
    triggered: lockedEventCount >= LOCKED_EVENT_WARNING_THRESHOLD,
  };
}

export async function getLoginAuditHighRiskSummary(period: LoginAnalyticsPeriod = "24h") {
  const db = await getDb();
  const now = new Date();
  const periodStart = getLoginPeriodStart(period, now);
  if (!db) {
    return {
      period,
      periodStart,
      highRiskLoginCount: 0,
      lockedLoginEventCount: 0,
      highRiskOperationCount: 0,
      activeLockedAccountCount: 0,
      totalHighRiskCount: 0,
      lockedEventWarning: getLockedEventWarning(0),
    };
  }

  const highRiskLoginReason = or(
    like(loginAuditLogs.failureReason, "%鎖定%"),
    like(loginAuditLogs.failureReason, "%lock%"),
    like(loginAuditLogs.failureReason, "%暴力%"),
    like(loginAuditLogs.failureReason, "%brute%"),
    like(loginAuditLogs.failureReason, "%suspicious%"),
    like(loginAuditLogs.failureReason, "%異常%"),
    like(loginAuditLogs.failureReason, "%黑名單%"),
    like(loginAuditLogs.failureReason, "%blacklist%")
  );
  const lockedLoginReason = or(
    like(loginAuditLogs.failureReason, "%鎖定%"),
    like(loginAuditLogs.failureReason, "%lock%")
  );
  const [highRiskLogin] = await db
    .select({ count: sql<number>`count(*)` })
    .from(loginAuditLogs)
    .where(and(gte(loginAuditLogs.loginAt, periodStart), eq(loginAuditLogs.status, "failed"), highRiskLoginReason));
  const [lockedLoginEvents] = await db
    .select({ count: sql<number>`count(*)` })
    .from(loginAuditLogs)
    .where(and(gte(loginAuditLogs.loginAt, periodStart), eq(loginAuditLogs.status, "failed"), lockedLoginReason));
  const [highRiskOperations] = await db
    .select({ count: sql<number>`count(*)` })
    .from(operationLogs)
    .where(and(
      gte(operationLogs.createdAt, periodStart),
      or(eq(operationLogs.action, "delete"), eq(operationLogs.action, "resetPassword"), eq(operationLogs.action, "deactivate"))
    ));
  const [activeLocks] = await db
    .select({ count: sql<number>`count(*)` })
    .from(loginFailureAttempts)
    .where(gte(loginFailureAttempts.lockedUntil, now));

  const highRiskLoginCount = Number(highRiskLogin?.count ?? 0);
  const highRiskOperationCount = Number(highRiskOperations?.count ?? 0);
  const lockedLoginEventCount = Number(lockedLoginEvents?.count ?? 0);
  return {
    period,
    periodStart,
    highRiskLoginCount,
    lockedLoginEventCount,
    highRiskOperationCount,
    activeLockedAccountCount: Number(activeLocks?.count ?? 0),
    totalHighRiskCount: highRiskLoginCount + highRiskOperationCount,
    lockedEventWarning: getLockedEventWarning(lockedLoginEventCount),
  };
}

export async function getLoginActivityAnalytics(period: LoginAnalyticsPeriod = "7d") {
  const db = await getDb();
  const now = new Date();
  const periodStart = getLoginPeriodStart(period, now);
  const dailyBuckets = createDailyLoginBuckets(period, now);
  if (!db) {
    return {
      period,
      periodStart,
      dailyLogins: Array.from(dailyBuckets.values()),
      totalLoginCount: 0,
      failedLoginCount: 0,
      failureRate: 0,
      abnormalIps: [],
      lockedEventWarning: getLockedEventWarning(0),
    };
  }

  const logs = await db
    .select({
      ipAddress: loginAuditLogs.ipAddress,
      status: loginAuditLogs.status,
      failureReason: loginAuditLogs.failureReason,
      loginAt: loginAuditLogs.loginAt,
    })
    .from(loginAuditLogs)
    .where(gte(loginAuditLogs.loginAt, periodStart))
    .orderBy(loginAuditLogs.loginAt);

  const ipStats = new Map<string, { ipAddress: string; loginCount: number; failedCount: number; highRiskCount: number; lockedEventCount: number }>();
  let totalLoginCount = 0;
  let failedLoginCount = 0;
  let lockedEventCount = 0;

  for (const log of logs) {
    totalLoginCount += 1;
    const bucket = dailyBuckets.get(getTaipeiDateParts(log.loginAt).key);
    if (bucket) {
      bucket.loginCount += 1;
    }
    const ipAddress = log.ipAddress?.trim() || "未知來源";
    const currentIp = ipStats.get(ipAddress) ?? { ipAddress, loginCount: 0, failedCount: 0, highRiskCount: 0, lockedEventCount: 0 };
    currentIp.loginCount += 1;

    if (log.status === "failed") {
      failedLoginCount += 1;
      if (bucket) bucket.failedCount += 1;
      if (HIGH_RISK_LOGIN_PATTERN.test(log.failureReason ?? "")) currentIp.highRiskCount += 1;
      if (LOCKED_LOGIN_PATTERN.test(log.failureReason ?? "")) {
        currentIp.lockedEventCount += 1;
        lockedEventCount += 1;
      }
    }
    ipStats.set(ipAddress, currentIp);
  }

  const dailyLogins = Array.from(dailyBuckets.values()).map((bucket) => ({
    ...bucket,
    failureRate: bucket.loginCount ? Number(((bucket.failedCount / bucket.loginCount) * 100).toFixed(1)) : 0,
  }));
  const abnormalIps = Array.from(ipStats.values())
    .filter((ip) => ip.failedCount >= 2 || ip.highRiskCount > 0 || ip.lockedEventCount > 0)
    .map((ip) => ({
      ...ip,
      failureRate: ip.loginCount ? Number(((ip.failedCount / ip.loginCount) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.lockedEventCount - a.lockedEventCount || b.highRiskCount - a.highRiskCount || b.failedCount - a.failedCount || b.loginCount - a.loginCount)
    .slice(0, 5);

  return {
    period,
    periodStart,
    dailyLogins,
    totalLoginCount,
    failedLoginCount,
    failureRate: totalLoginCount ? Number(((failedLoginCount / totalLoginCount) * 100).toFixed(1)) : 0,
    abnormalIps,
    lockedEventWarning: getLockedEventWarning(lockedEventCount),
  };
}

/** Security visibility for forced logouts after 30 minutes of inactivity, grouped by Taiwan calendar day. */
export async function getWeeklyIdleTimeoutSecuritySummary(now = new Date()) {
  const db = await getDb();
  const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dailyBuckets = Array.from(createDailyLoginBuckets("7d", now).values()).map((bucket) => ({ date: bucket.date, label: bucket.label, idleTimeoutCount: 0 }));
  const bucketByDate = new Map(dailyBuckets.map((bucket) => [bucket.date, bucket]));
  if (!db) {
    return { period: "7d" as const, periodStart, totalIdleTimeoutCount: 0, affectedUserCount: 0, lastIdleTimeoutAt: null, dailyIdleTimeouts: dailyBuckets };
  }

  const idleEvents = await db
    .select({ userId: operationLogs.userId, createdAt: operationLogs.createdAt })
    .from(operationLogs)
    .where(and(
      gte(operationLogs.createdAt, periodStart),
      eq(operationLogs.action, "idleTimeoutLogout"),
      eq(operationLogs.entityType, "authSession"),
    ))
    .orderBy(desc(operationLogs.createdAt));

  const affectedUserIds = new Set<number>();
  for (const event of idleEvents) {
    if (event.userId !== null) affectedUserIds.add(event.userId);
    const bucket = bucketByDate.get(getTaipeiDateParts(event.createdAt).key);
    if (bucket) bucket.idleTimeoutCount += 1;
  }
  return {
    period: "7d" as const,
    periodStart,
    totalIdleTimeoutCount: idleEvents.length,
    affectedUserCount: affectedUserIds.size,
    lastIdleTimeoutAt: idleEvents[0]?.createdAt ?? null,
    dailyIdleTimeouts: dailyBuckets,
  };
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { pending: 0, active: 0, overdue: 0, totalEquipment: 0, totalUsers: 0 };

  const [pendingResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(borrowRequests)
    .where(eq(borrowRequests.status, "pending"));

  const [activeResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(borrowRecords)
    .where(eq(borrowRecords.status, "active"));

  const [overdueResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(borrowRecords)
    .where(eq(borrowRecords.status, "overdue"));

  const [equipmentResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(equipment)
    .where(and(eq(equipment.status, "available"), isNull(equipment.deletedAt)));

  const activeUserRows = await db
    .select({ username: users.username, openId: users.openId })
    .from(users)
    .where(eq(users.isActive, true));

  return {
    pending: Number(pendingResult?.count ?? 0),
    active: Number(activeResult?.count ?? 0),
    overdue: Number(overdueResult?.count ?? 0),
    totalEquipment: Number(equipmentResult?.count ?? 0),
    totalUsers: activeUserRows.filter((user) => !isTestAccount(user)).length,
  };
}

// ─── User Preferences ─────────────────────────────────────────────────────────

export async function getUserPreferences(userId: number): Promise<UserPreference | null> {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
  return result || null;
}

export async function upsertUserPreferences(userId: number, data: Partial<InsertUserPreference>): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await getUserPreferences(userId);
  if (existing) {
    await db.update(userPreferences).set({ ...data, updatedAt: new Date() }).where(eq(userPreferences.userId, userId));
  } else {
    await db.insert(userPreferences).values({ userId, ...data });
  }
}

export async function updateUserProfile(
  userId: number,
  data: { realName?: string; email?: string; phone?: string; department?: string; avatarUrl?: string }
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, userId));
}

// ─── Contact Verification ──────────────────────────────────────────────────────

export async function getLatestEmailVerification(userId: number, email: string): Promise<EmailVerification | null> {
  const db = await getDb();
  if (!db) return null;
  const [verification] = await db.select().from(emailVerifications)
    .where(and(eq(emailVerifications.userId, userId), eq(emailVerifications.email, email)))
    .orderBy(desc(emailVerifications.createdAt)).limit(1);
  return verification ?? null;
}

export async function createEmailVerification(data: InsertEmailVerification): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(emailVerifications).values(data);
}

export async function incrementEmailVerificationAttempts(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const [verification] = await db.select().from(emailVerifications).where(eq(emailVerifications.id, id)).limit(1);
  if (!verification) return;
  await db.update(emailVerifications).set({ attemptCount: verification.attemptCount + 1, updatedAt: new Date() }).where(eq(emailVerifications.id, id));
}

export async function completeEmailVerification(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(emailVerifications).set({ isVerified: true, verifiedAt: new Date(), updatedAt: new Date() }).where(eq(emailVerifications.id, id));
}

export async function getUsersWithUnverifiedEmails() {
  const db = await getDb();
  if (!db) return [];
  const [activeUsers, verifications] = await Promise.all([
    db.select({ id: users.id, username: users.username, realName: users.realName, name: users.name, email: users.email, role: users.role, lastSignedIn: users.lastSignedIn })
      .from(users).where(eq(users.isActive, true)).orderBy(desc(users.lastSignedIn)),
    db.select({ userId: emailVerifications.userId, email: emailVerifications.email, isVerified: emailVerifications.isVerified, createdAt: emailVerifications.createdAt, verifiedAt: emailVerifications.verifiedAt })
      .from(emailVerifications).orderBy(desc(emailVerifications.createdAt)),
  ]);
  const latestByUserAndEmail = new Map<string, typeof verifications[number]>();
  for (const verification of verifications) {
    const key = `${verification.userId}:${verification.email}`;
    if (!latestByUserAndEmail.has(key)) latestByUserAndEmail.set(key, verification);
  }
  const result: Array<(typeof activeUsers)[number] & { verificationStatus: "missing_email" | "unverified"; verificationCreatedAt: Date | null; verifiedAt: Date | null }> = [];
  for (const user of activeUsers) {
    const email = user.email?.trim() || null;
    if (!email) {
      result.push({ ...user, verificationStatus: "missing_email", verificationCreatedAt: null, verifiedAt: null });
      continue;
    }
    const verification = latestByUserAndEmail.get(`${user.id}:${email}`);
    if (!verification?.isVerified) result.push({ ...user, verificationStatus: "unverified", verificationCreatedAt: verification?.createdAt ?? null, verifiedAt: null });
  }
  return result;
}

// ─── Operation Logs ───────────────────────────────────────────────────────────

export async function createOperationLog(data: InsertOperationLog): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(operationLogs).values(data);
}

export async function getAuditEventResolutions(events: Array<{ sourceType: "loginAudit" | "operationLog"; sourceEventId: number }>): Promise<Array<AuditEventResolution & { handledByName: string | null; handledByUsername: string | null }>> {
  const db = await getDb();
  if (!db || events.length === 0) return [];
  const conditions = events.map((event) => and(eq(auditEventResolutions.sourceType, event.sourceType), eq(auditEventResolutions.sourceEventId, event.sourceEventId)));
  return db.select({
    id: auditEventResolutions.id,
    sourceType: auditEventResolutions.sourceType,
    sourceEventId: auditEventResolutions.sourceEventId,
    status: auditEventResolutions.status,
    handlingNote: auditEventResolutions.handlingNote,
    handledById: auditEventResolutions.handledById,
    handledAt: auditEventResolutions.handledAt,
    closedAt: auditEventResolutions.closedAt,
    createdAt: auditEventResolutions.createdAt,
    updatedAt: auditEventResolutions.updatedAt,
    handledByName: users.name,
    handledByUsername: users.username,
  }).from(auditEventResolutions).leftJoin(users, eq(auditEventResolutions.handledById, users.id)).where(or(...conditions));
}

export async function upsertAuditEventResolution(data: {
  sourceType: "loginAudit" | "operationLog";
  sourceEventId: number;
  status: "in_progress" | "closed";
  handlingNote: string;
  handledById: number;
}): Promise<{ becameClosed: boolean; closedAt: Date | null }> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const now = new Date();
  const [existing] = await db.select({ status: auditEventResolutions.status }).from(auditEventResolutions).where(and(
    eq(auditEventResolutions.sourceType, data.sourceType),
    eq(auditEventResolutions.sourceEventId, data.sourceEventId),
  )).limit(1);
  await db.insert(auditEventResolutions).values({
    ...data,
    handledAt: now,
    closedAt: data.status === "closed" ? now : null,
  }).onDuplicateKeyUpdate({ set: {
    status: data.status,
    handlingNote: data.handlingNote,
    handledById: data.handledById,
    handledAt: now,
    closedAt: data.status === "closed" ? now : null,
    updatedAt: now,
  } });
  return { becameClosed: data.status === "closed" && existing?.status !== "closed", closedAt: data.status === "closed" ? now : null };
}

export type OperationLogEntry = OperationLog & { displayName: string };

export async function getOperationLogs(opts?: {
  userId?: number;
  username?: string;
  action?: string;
  entityType?: string;
  deduplicationOnly?: boolean;
  accountLifecycleOnly?: boolean;
  limit?: number;
  offset?: number;
}): Promise<OperationLogEntry[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (opts?.userId) conditions.push(eq(operationLogs.userId, opts.userId));
  if (opts?.username) conditions.push(like(operationLogs.username, `%${opts.username}%`));
  if (opts?.action) conditions.push(eq(operationLogs.action, opts.action));
  if (opts?.entityType) conditions.push(eq(operationLogs.entityType, opts.entityType));
  if (opts?.deduplicationOnly) conditions.push(sql`${operationLogs.action} IN ('runAccountDeduplication', 'deactivateDuplicateAccount')`);
  if (opts?.accountLifecycleOnly) conditions.push(and(eq(operationLogs.entityType, "user"), sql`${operationLogs.action} IN ('create', 'delete', 'bulkTestAccountStatus', 'cleanupTestAccounts')`));

  const query = db
    .select({
      id: operationLogs.id,
      userId: operationLogs.userId,
      username: operationLogs.username,
      action: operationLogs.action,
      entityType: operationLogs.entityType,
      entityId: operationLogs.entityId,
      entityName: operationLogs.entityName,
      details: operationLogs.details,
      ipAddress: operationLogs.ipAddress,
      userAgent: operationLogs.userAgent,
      createdAt: operationLogs.createdAt,
      displayName: sql<string>`COALESCE(NULLIF(${users.realName}, ''), NULLIF(${users.name}, ''), NULLIF(${users.username}, ''), ${operationLogs.username})`,
    })
    .from(operationLogs)
    .leftJoin(users, eq(operationLogs.userId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(operationLogs.createdAt), desc(operationLogs.id))
    .limit(opts?.limit ?? 100)
    .offset(opts?.offset ?? 0);

  return query;
}

export async function getOperationLogCount(opts?: {
  userId?: number;
  username?: string;
  action?: string;
  entityType?: string;
  deduplicationOnly?: boolean;
  accountLifecycleOnly?: boolean;
}): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const conditions = [];
  if (opts?.userId) conditions.push(eq(operationLogs.userId, opts.userId));
  if (opts?.username) conditions.push(like(operationLogs.username, `%${opts.username}%`));
  if (opts?.action) conditions.push(eq(operationLogs.action, opts.action));
  if (opts?.entityType) conditions.push(eq(operationLogs.entityType, opts.entityType));
  if (opts?.deduplicationOnly) conditions.push(sql`${operationLogs.action} IN ('runAccountDeduplication', 'deactivateDuplicateAccount')`);
  if (opts?.accountLifecycleOnly) conditions.push(and(eq(operationLogs.entityType, "user"), sql`${operationLogs.action} IN ('create', 'delete', 'bulkTestAccountStatus', 'cleanupTestAccounts')`));

  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(operationLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return Number(result?.count ?? 0);
}

// ─── System Mode History ──────────────────────────────────────────────────────

const SYSTEM_MODE_HISTORY_ACTIONS = [
  "setSystemOnlineMode",
  "enableSystemMaintenanceMode",
  "enableSystemOfflineMode",
  "scheduleSystemModeChange",
  "cancelScheduledSystemMode",
] as const;

type SystemModeHistoryAction = (typeof SYSTEM_MODE_HISTORY_ACTIONS)[number];
type ResolvedHistoryMode = "online" | "maintenance" | "offline" | null;

function parseSystemModeHistoryDetails(details: string | null) {
  if (!details) return {} as Record<string, unknown>;
  try {
    const parsed = JSON.parse(details);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {} as Record<string, unknown>;
  }
}

function resolveHistoryMode(action: SystemModeHistoryAction, details: Record<string, unknown>): ResolvedHistoryMode {
  if (action === "setSystemOnlineMode") return "online";
  if (action === "enableSystemMaintenanceMode") return "maintenance";
  if (action === "enableSystemOfflineMode") return "offline";
  if (action === "scheduleSystemModeChange") return details.systemMode === "maintenance" || details.systemMode === "offline" ? details.systemMode : null;
  return null;
}

export type SystemModeHistoryEntry = {
  id: number;
  action: SystemModeHistoryAction;
  systemMode: ResolvedHistoryMode;
  username: string;
  displayName: string;
  createdAt: Date;
  effectiveAt: Date;
  announcement: string | null;
  estimatedRestoredAt: Date | null;
  forcedLogoutCount: number;
  previousSystemMode: ResolvedHistoryMode;
};

export async function getSystemModeHistory(limit = 50): Promise<SystemModeHistoryEntry[]> {
  const db = await getDb();
  if (!db) return [];

  const historyRows = await db
    .select({
      id: operationLogs.id,
      userId: operationLogs.userId,
      username: operationLogs.username,
      action: operationLogs.action,
      details: operationLogs.details,
      createdAt: operationLogs.createdAt,
      displayName: sql<string>`COALESCE(NULLIF(${users.realName}, ''), NULLIF(${users.name}, ''), NULLIF(${users.username}, ''), ${operationLogs.username})`,
    })
    .from(operationLogs)
    .leftJoin(users, eq(operationLogs.userId, users.id))
    .where(and(
      eq(operationLogs.entityType, "systemMaintenance"),
      inArray(operationLogs.action, [...SYSTEM_MODE_HISTORY_ACTIONS]),
    ))
    .orderBy(desc(operationLogs.createdAt))
    .limit(limit);

  if (!historyRows.length) return [];

  const forcedLogoutRows = await db
    .select({ createdAt: operationLogs.createdAt })
    .from(operationLogs)
    .where(and(
      eq(operationLogs.entityType, "authSession"),
      eq(operationLogs.action, "systemModeForcedLogout"),
    ))
    .orderBy(desc(operationLogs.createdAt));

  const chronological = [...historyRows].reverse();
  const entries = chronological.map((entry, index) => {
    const details = parseSystemModeHistoryDetails(entry.details);
    const action = entry.action as SystemModeHistoryAction;
    const systemMode = resolveHistoryMode(action, details);
    const scheduledFor = details.scheduledFor ? new Date(String(details.scheduledFor)) : null;
    const effectiveAt = action === "scheduleSystemModeChange" && scheduledFor && !Number.isNaN(scheduledFor.getTime()) ? scheduledFor : entry.createdAt;
    const nextEntry = chronological[index + 1];
    const nextBoundary = nextEntry?.createdAt ?? null;
    const forcedLogoutCount = systemMode === "maintenance" || systemMode === "offline"
      ? forcedLogoutRows.filter((logout) => logout.createdAt.getTime() >= effectiveAt.getTime() && (!nextBoundary || logout.createdAt.getTime() < nextBoundary.getTime())).length
      : 0;

    return {
      id: entry.id,
      action,
      systemMode,
      username: entry.username,
      displayName: entry.displayName,
      createdAt: entry.createdAt,
      effectiveAt,
      announcement: typeof details.announcement === "string" ? details.announcement : null,
      estimatedRestoredAt: details.estimatedRestoredAt ? new Date(String(details.estimatedRestoredAt)) : null,
      forcedLogoutCount,
      previousSystemMode: details.previousSystemMode === "online" || details.previousSystemMode === "maintenance" || details.previousSystemMode === "offline" ? details.previousSystemMode : null,
    } satisfies SystemModeHistoryEntry;
  });

  return entries.reverse();
}

export async function getLatestSystemRecoveryNotice() {
  const db = await getDb();
  if (!db) return null;
  const [entry] = await db
    .select()
    .from(operationLogs)
    .where(and(
      eq(operationLogs.entityType, "systemMaintenance"),
      eq(operationLogs.action, "setSystemOnlineMode"),
    ))
    .orderBy(desc(operationLogs.createdAt))
    .limit(1);
  if (!entry || Date.now() - entry.createdAt.getTime() > 24 * 60 * 60 * 1_000) return null;
  const details = parseSystemModeHistoryDetails(entry.details);
  const previousSystemMode = details.previousSystemMode;
  if (previousSystemMode !== "maintenance" && previousSystemMode !== "offline") return null;
  return {
    id: entry.id,
    restoredAt: entry.createdAt,
    previousSystemMode,
  } as const;
}

// ─── Operation Log Retention ──────────────────────────────────────────────────

export async function getOperationLogRetentionSchedule(): Promise<OperationLogRetentionSchedule | null> {
  const db = await getDb();
  if (!db) return null;
  const [schedule] = await db.select().from(operationLogRetentionSchedules).orderBy(desc(operationLogRetentionSchedules.createdAt)).limit(1);
  return schedule ?? null;
}

export async function getOperationLogRetentionScheduleByTaskUid(taskUid: string): Promise<OperationLogRetentionSchedule | null> {
  const db = await getDb();
  if (!db) return null;
  const [schedule] = await db.select().from(operationLogRetentionSchedules)
    .where(eq(operationLogRetentionSchedules.scheduleCronTaskUid, taskUid)).limit(1);
  return schedule ?? null;
}

export async function upsertOperationLogRetentionSchedule(data: { scheduleCronTaskUid: string; retentionDays?: number; isActive?: boolean }): Promise<OperationLogRetentionSchedule | null> {
  const db = await getDb();
  if (!db) return null;
  const existing = await getOperationLogRetentionSchedule();
  if (existing) {
    await db.update(operationLogRetentionSchedules).set({
      scheduleCronTaskUid: data.scheduleCronTaskUid,
      retentionDays: data.retentionDays ?? existing.retentionDays,
      isActive: data.isActive ?? true,
      updatedAt: new Date(),
    }).where(eq(operationLogRetentionSchedules.id, existing.id));
  } else {
    await db.insert(operationLogRetentionSchedules).values({
      scheduleCronTaskUid: data.scheduleCronTaskUid,
      retentionDays: data.retentionDays ?? 365,
      isActive: data.isActive ?? true,
    });
  }
  return getOperationLogRetentionSchedule();
}

export async function getLatestOperationLogRetentionRun(): Promise<OperationLogRetentionRun | null> {
  const db = await getDb();
  if (!db) return null;
  const [run] = await db.select().from(operationLogRetentionRuns).orderBy(desc(operationLogRetentionRuns.ranAt), desc(operationLogRetentionRuns.id)).limit(1);
  return run ?? null;
}

/** Deletes only operation logs strictly older than the configured cutoff, then records the execution result. */
export async function runOperationLogRetentionCleanup(schedule: Pick<OperationLogRetentionSchedule, "id" | "retentionDays">): Promise<{ cutoffAt: Date; deletedCount: number }> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const cutoffAt = new Date(Date.now() - schedule.retentionDays * 24 * 60 * 60 * 1000);
  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(operationLogs).where(lt(operationLogs.createdAt, cutoffAt));
  const deletedCount = Number(countResult?.count ?? 0);
  if (deletedCount > 0) await db.delete(operationLogs).where(lt(operationLogs.createdAt, cutoffAt));
  await db.insert(operationLogRetentionRuns).values({ scheduleId: schedule.id, cutoffAt, deletedCount });
  await db.update(operationLogRetentionSchedules).set({ lastRunAt: new Date(), updatedAt: new Date() })
    .where(eq(operationLogRetentionSchedules.id, schedule.id));
  return { cutoffAt, deletedCount };
}

// ─── System Alert Email Recipients ───────────────────────────────────────────

export async function getSystemAlertEmailRecipients(includeInactive = true): Promise<SystemAlertEmailRecipient[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(systemAlertEmailRecipients)
    .where(includeInactive ? undefined : eq(systemAlertEmailRecipients.isActive, true))
    .orderBy(desc(systemAlertEmailRecipients.updatedAt), desc(systemAlertEmailRecipients.id));
}

export async function getSystemAlertEmailRecipientByEmail(email: string): Promise<SystemAlertEmailRecipient | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const [recipient] = await db
    .select()
    .from(systemAlertEmailRecipients)
    .where(eq(systemAlertEmailRecipients.email, email))
    .limit(1);
  return recipient;
}

export async function createSystemAlertEmailRecipient(
  data: InsertSystemAlertEmailRecipient
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(systemAlertEmailRecipients).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function updateSystemAlertEmailRecipientStatus(id: number, isActive: boolean): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(systemAlertEmailRecipients)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(systemAlertEmailRecipients.id, id));
}

export async function deleteSystemAlertEmailRecipient(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(systemAlertEmailRecipients).where(eq(systemAlertEmailRecipients.id, id));
}

// ─── System Alert Email Deliveries ───────────────────────────────────────────

export async function createSystemAlertEmailDelivery(data: InsertSystemAlertEmailDelivery): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(systemAlertEmailDeliveries).values(data);
}

export async function getLatestSystemAlertEmailDelivery(
  eventKey: string,
  recipientEmail: string,
  status?: "sent" | "failed" | "suppressed"
): Promise<SystemAlertEmailDelivery | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const conditions = [
    eq(systemAlertEmailDeliveries.eventKey, eventKey),
    eq(systemAlertEmailDeliveries.recipientEmail, recipientEmail),
  ];
  if (status) conditions.push(eq(systemAlertEmailDeliveries.status, status));

  const [delivery] = await db
    .select()
    .from(systemAlertEmailDeliveries)
    .where(and(...conditions))
    .orderBy(desc(systemAlertEmailDeliveries.createdAt), desc(systemAlertEmailDeliveries.id))
    .limit(1);
  return delivery;
}

export async function getSystemAlertEmailDeliveries(limit = 30): Promise<SystemAlertEmailDelivery[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(systemAlertEmailDeliveries)
    .orderBy(desc(systemAlertEmailDeliveries.createdAt), desc(systemAlertEmailDeliveries.id))
    .limit(limit);
}

export async function getSystemAlertEmailDeliveriesForEvent(eventKey: string, limit = 100): Promise<SystemAlertEmailDelivery[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(systemAlertEmailDeliveries)
    .where(eq(systemAlertEmailDeliveries.eventKey, eventKey))
    .orderBy(desc(systemAlertEmailDeliveries.createdAt), desc(systemAlertEmailDeliveries.id))
    .limit(limit);
}

// ─── System Reports ──────────────────────────────────────────────────────────

export type SystemReportWithAuthor = SystemReport & {
  authorUsername: string | null;
  authorName: string | null;
  authorRealName: string | null;
  assets: SystemReportAsset[];
};

async function getSystemReportAssetsByReportIds(reportIds: number[]): Promise<Map<number, SystemReportAsset[]>> {
  const grouped = new Map<number, SystemReportAsset[]>();
  if (reportIds.length === 0) return grouped;
  const db = await getDb();
  if (!db) return grouped;
  const assets = await db
    .select()
    .from(systemReportAssets)
    .where(inArray(systemReportAssets.reportId, reportIds))
    .orderBy(systemReportAssets.createdAt, systemReportAssets.id);
  for (const asset of assets) {
    grouped.set(asset.reportId, [...(grouped.get(asset.reportId) ?? []), asset]);
  }
  return grouped;
}

export async function getSystemReports(): Promise<SystemReportWithAuthor[]> {
  const db = await getDb();
  if (!db) return [];
  const reports = await db
    .select({
      id: systemReports.id,
      title: systemReports.title,
      content: systemReports.content,
      status: systemReports.status,
      isPinned: systemReports.isPinned,
      priority: systemReports.priority,
      authorId: systemReports.authorId,
      publishedAt: systemReports.publishedAt,
      expiresAt: systemReports.expiresAt,
      mustReadBy: systemReports.mustReadBy,
      createdAt: systemReports.createdAt,
      updatedAt: systemReports.updatedAt,
      authorUsername: users.username,
      authorName: users.name,
      authorRealName: users.realName,
    })
    .from(systemReports)
    .innerJoin(users, eq(systemReports.authorId, users.id))
    .orderBy(desc(systemReports.isPinned), desc(systemReports.publishedAt), desc(systemReports.updatedAt), desc(systemReports.id));
  const assetsByReportId = await getSystemReportAssetsByReportIds(reports.map((report) => report.id));
  return reports.map((report) => ({ ...report, assets: assetsByReportId.get(report.id) ?? [] }));
}

export async function getSystemReportById(id: number): Promise<SystemReport | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const [report] = await db.select().from(systemReports).where(eq(systemReports.id, id)).limit(1);
  return report;
}

export async function createSystemReport(data: InsertSystemReport): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(systemReports).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function updateSystemReportDraft(id: number, data: Pick<InsertSystemReport, "title" | "content" | "expiresAt" | "mustReadBy" | "isPinned" | "priority">): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(systemReports).set({
    title: data.title,
    content: data.content,
    expiresAt: data.expiresAt ?? null,
    mustReadBy: data.priority === "urgent" ? data.mustReadBy ?? null : null,
    isPinned: data.isPinned ?? false,
    priority: data.priority ?? "normal",
    updatedAt: new Date(),
  }).where(eq(systemReports.id, id));
}

export async function updateSystemReportPinned(id: number, isPinned: boolean): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(systemReports).set({ isPinned, updatedAt: new Date() }).where(eq(systemReports.id, id));
}

export async function updateSystemReportPriority(id: number, priority: "normal" | "important" | "urgent"): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const updates = priority === "urgent"
    ? { priority, updatedAt: new Date() }
    : { priority, mustReadBy: null, updatedAt: new Date() };
  await db.update(systemReports).set(updates).where(eq(systemReports.id, id));
}

export async function publishSystemReport(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const now = new Date();
  await db.update(systemReports).set({ status: "published", publishedAt: now, updatedAt: now }).where(eq(systemReports.id, id));
}

export async function getUnreadSystemReports(userId: number): Promise<SystemReportWithAuthor[]> {
  const now = new Date();
  const reports = (await getSystemReports()).filter((report) => report.status === "published" && (!report.expiresAt || report.expiresAt > now));
  if (reports.length === 0) return [];
  const db = await getDb();
  if (!db) return [];
  const readRecords = await db.select({ reportId: systemReportReads.reportId })
    .from(systemReportReads)
    .where(eq(systemReportReads.userId, userId));
  const readIds = new Set(readRecords.map((record) => record.reportId));
  return reports
    .filter((report) => !readIds.has(report.id))
    .sort((left, right) => {
      const priorityRank = { normal: 0, important: 1, urgent: 2 } as const;
      if (priorityRank[left.priority] !== priorityRank[right.priority]) return priorityRank[right.priority] - priorityRank[left.priority];
      if (left.isPinned !== right.isPinned) return left.isPinned ? -1 : 1;
      return (left.publishedAt?.getTime() ?? 0) - (right.publishedAt?.getTime() ?? 0);
    });
}

export type SystemReportInboxItem = SystemReportWithAuthor & {
  isRead: boolean;
  readAt: Date | null;
};

/** Lists the active announcement inbox for one user, including read state for the session notification panel. */
export async function getSystemReportInbox(userId: number): Promise<SystemReportInboxItem[]> {
  const now = new Date();
  const reports = (await getSystemReports()).filter((report) => report.status === "published" && (!report.expiresAt || report.expiresAt > now));
  if (reports.length === 0) return [];
  const db = await getDb();
  if (!db) return [];
  const readRecords = await db
    .select({ reportId: systemReportReads.reportId, readAt: systemReportReads.readAt })
    .from(systemReportReads)
    .where(eq(systemReportReads.userId, userId));
  const readAtByReportId = new Map(readRecords.map((record) => [record.reportId, record.readAt]));
  const priorityRank = { normal: 0, important: 1, urgent: 2 } as const;
  return reports
    .map((report) => ({ ...report, isRead: readAtByReportId.has(report.id), readAt: readAtByReportId.get(report.id) ?? null }))
    .sort((left, right) => {
      if (left.isRead !== right.isRead) return left.isRead ? 1 : -1;
      if (priorityRank[left.priority] !== priorityRank[right.priority]) return priorityRank[right.priority] - priorityRank[left.priority];
      if (left.isPinned !== right.isPinned) return left.isPinned ? -1 : 1;
      return (right.publishedAt?.getTime() ?? 0) - (left.publishedAt?.getTime() ?? 0);
    });
}

export async function markSystemReportRead(data: InsertSystemReportRead): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(systemReportReads).values(data).onDuplicateKeyUpdate({ set: { readAt: new Date() } });
}

export async function createSystemReportAsset(data: InsertSystemReportAsset): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(systemReportAssets).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function getSystemReportAssetById(id: number): Promise<SystemReportAsset | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const [asset] = await db.select().from(systemReportAssets).where(eq(systemReportAssets.id, id)).limit(1);
  return asset;
}

export async function deleteSystemReportAsset(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(systemReportAssets).where(eq(systemReportAssets.id, id));
}

export async function incrementSystemReportAssetDownloadCount(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(systemReportAssets)
    .set({ downloadCount: sql`${systemReportAssets.downloadCount} + 1` })
    .where(eq(systemReportAssets.id, id));
}

export type SystemReportReadStatistic = SystemReportWithAuthor & {
  readCount: number;
  unreadCount: number;
  activeUserCount: number;
  downloadCount: number;
};

export async function getSystemReportReadStatistics(): Promise<SystemReportReadStatistic[]> {
  const db = await getDb();
  if (!db) return [];
  const reports = (await getSystemReports()).filter((report) => report.publishedAt !== null);
  if (reports.length === 0) return [];
  const [activeUserTotal] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.isActive, true));
  const reads = await db
    .select({ reportId: systemReportReads.reportId, count: sql<number>`count(distinct ${systemReportReads.userId})` })
    .from(systemReportReads)
    .where(inArray(systemReportReads.reportId, reports.map((report) => report.id)))
    .groupBy(systemReportReads.reportId);
  const activeUserCount = Number(activeUserTotal?.count ?? 0);
  const readCounts = new Map(reads.map((read) => [read.reportId, Number(read.count)]));
  return reports.map((report) => {
    const readCount = readCounts.get(report.id) ?? 0;
    const downloadCount = report.assets
      .filter((asset) => asset.assetKind === "attachment")
      .reduce((total, asset) => total + asset.downloadCount, 0);
    return { ...report, readCount, unreadCount: Math.max(activeUserCount - readCount, 0), activeUserCount, downloadCount };
  });
}

// ─── Reimbursement Claims ────────────────────────────────────────────────────

export type ReimbursementClaimWithDetails = ReimbursementClaim & {
  requesterUsername: string | null;
  requesterName: string | null;
  requesterRealName: string | null;
  reviewerUsername: string | null;
  reviewerName: string | null;
  reviewerRealName: string | null;
  items: ReimbursementItem[];
  receipts: ReimbursementReceipt[];
};

async function getReimbursementDetailsByClaimIds(claimIds: number[]) {
  const itemsByClaimId = new Map<number, ReimbursementItem[]>();
  const receiptsByClaimId = new Map<number, ReimbursementReceipt[]>();
  if (claimIds.length === 0) return { itemsByClaimId, receiptsByClaimId };
  const db = await getDb();
  if (!db) return { itemsByClaimId, receiptsByClaimId };
  const [items, receipts] = await Promise.all([
    db.select().from(reimbursementItems).where(inArray(reimbursementItems.claimId, claimIds)).orderBy(reimbursementItems.expenseDate, reimbursementItems.id),
    db.select().from(reimbursementReceipts).where(inArray(reimbursementReceipts.claimId, claimIds)).orderBy(reimbursementReceipts.createdAt, reimbursementReceipts.id),
  ]);
  for (const item of items) itemsByClaimId.set(item.claimId, [...(itemsByClaimId.get(item.claimId) ?? []), item]);
  for (const receipt of receipts) receiptsByClaimId.set(receipt.claimId, [...(receiptsByClaimId.get(receipt.claimId) ?? []), receipt]);
  return { itemsByClaimId, receiptsByClaimId };
}

export async function getReimbursementClaims(options?: { requesterId?: number }): Promise<ReimbursementClaimWithDetails[]> {
  const db = await getDb();
  if (!db) return [];
  const reimbursementReviewer = alias(users, "reimbursementReviewer");
  const claims = await db
    .select({
      id: reimbursementClaims.id,
      claimNumber: reimbursementClaims.claimNumber,
      requesterId: reimbursementClaims.requesterId,
      title: reimbursementClaims.title,
      purpose: reimbursementClaims.purpose,
      status: reimbursementClaims.status,
      totalAmount: reimbursementClaims.totalAmount,
      submittedAt: reimbursementClaims.submittedAt,
      reviewedById: reimbursementClaims.reviewedById,
      reviewedAt: reimbursementClaims.reviewedAt,
      reviewNote: reimbursementClaims.reviewNote,
      paidById: reimbursementClaims.paidById,
      paidAt: reimbursementClaims.paidAt,
      createdAt: reimbursementClaims.createdAt,
      updatedAt: reimbursementClaims.updatedAt,
      requesterUsername: users.username,
      requesterName: users.name,
      requesterRealName: users.realName,
      reviewerUsername: reimbursementReviewer.username,
      reviewerName: reimbursementReviewer.name,
      reviewerRealName: reimbursementReviewer.realName,
    })
    .from(reimbursementClaims)
    .innerJoin(users, eq(reimbursementClaims.requesterId, users.id))
    .leftJoin(reimbursementReviewer, eq(reimbursementClaims.reviewedById, reimbursementReviewer.id))
    .where(options?.requesterId ? eq(reimbursementClaims.requesterId, options.requesterId) : undefined)
    .orderBy(desc(reimbursementClaims.createdAt), desc(reimbursementClaims.id));
  const { itemsByClaimId, receiptsByClaimId } = await getReimbursementDetailsByClaimIds(claims.map((claim) => claim.id));
  return claims.map((claim) => ({ ...claim, items: itemsByClaimId.get(claim.id) ?? [], receipts: receiptsByClaimId.get(claim.id) ?? [] }));
}

export async function getReimbursementClaimById(id: number): Promise<ReimbursementClaimWithDetails | undefined> {
  return (await getReimbursementClaims()).find((claim) => claim.id === id);
}

export async function createReimbursementClaim(data: InsertReimbursementClaim, items: Array<Omit<InsertReimbursementItem, "claimId">>): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx) => {
    const result = await tx.insert(reimbursementClaims).values(data);
    const claimId = (result[0] as { insertId: number }).insertId;
    await tx.insert(reimbursementItems).values(items.map((item) => ({ ...item, claimId })));
    return claimId;
  });
}

export async function createReimbursementReceipt(data: InsertReimbursementReceipt): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(reimbursementReceipts).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function getReimbursementReceiptById(id: number): Promise<ReimbursementReceipt | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const [receipt] = await db.select().from(reimbursementReceipts).where(eq(reimbursementReceipts.id, id)).limit(1);
  return receipt;
}

export async function deleteReimbursementReceipt(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(reimbursementReceipts).where(eq(reimbursementReceipts.id, id));
}

export async function updateReimbursementClaimStatus(id: number, data: Pick<InsertReimbursementClaim, "status" | "submittedAt" | "reviewedById" | "reviewedAt" | "reviewNote" | "paidById" | "paidAt">): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(reimbursementClaims).set({ ...data, updatedAt: new Date() }).where(eq(reimbursementClaims.id, id));
}

function getTaipeiMonthWindow(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1, -8));
  const end = new Date(Date.UTC(year, monthNumber, 1, -8));
  return { start, end };
}

function getTaipeiYearWindow(year: number) {
  return {
    start: new Date(`${year}-01-01T00:00:00+08:00`),
    end: new Date(`${year + 1}-01-01T00:00:00+08:00`),
  };
}

export type ReimbursementAnnualBudgetComparison = {
  year: number;
  budget: ReimbursementAnnualBudget | null;
  actualAmount: number;
  remainingAmount: number | null;
  utilizationPercent: number | null;
};

export async function getReimbursementAnnualBudgetComparison(year: number): Promise<ReimbursementAnnualBudgetComparison> {
  const db = await getDb();
  if (!db) return { year, budget: null, actualAmount: 0, remainingAmount: null, utilizationPercent: null };
  const { start, end } = getTaipeiYearWindow(year);
  const [[budget], [actual]] = await Promise.all([
    db.select().from(reimbursementAnnualBudgets).where(eq(reimbursementAnnualBudgets.year, year)).limit(1),
    db.select({ totalAmount: sql<string>`coalesce(sum(${reimbursementItems.amount}), 0)` }).from(reimbursementItems)
      .innerJoin(reimbursementClaims, eq(reimbursementItems.claimId, reimbursementClaims.id))
      .where(and(inArray(reimbursementClaims.status, ["approved", "paid"]), gte(reimbursementItems.expenseDate, start), lt(reimbursementItems.expenseDate, end))),
  ]);
  const actualAmount = Number(actual?.totalAmount ?? 0);
  const budgetAmount = budget ? Number(budget.amount) : null;
  return {
    year,
    budget: budget ?? null,
    actualAmount,
    remainingAmount: budgetAmount === null ? null : budgetAmount - actualAmount,
    utilizationPercent: budgetAmount === null || budgetAmount === 0 ? null : (actualAmount / budgetAmount) * 100,
  };
}

export async function upsertReimbursementAnnualBudget(data: Pick<InsertReimbursementAnnualBudget, "year" | "amount" | "setById">): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB_NOT_AVAILABLE");
  await db.insert(reimbursementAnnualBudgets).values(data).onDuplicateKeyUpdate({
    set: { amount: data.amount, setById: data.setById, updatedAt: new Date() },
  });
}

export type ReimbursementCategoryMonthlySummary = {
  month: string;
  totalAmount: number;
  claimCount: number;
  categories: Array<{ category: string; totalAmount: number; itemCount: number }>;
};

export async function getMonthlyReimbursementCategorySummary(month: string): Promise<ReimbursementCategoryMonthlySummary> {
  const db = await getDb();
  if (!db) return { month, totalAmount: 0, claimCount: 0, categories: [] };
  const { start, end } = getTaipeiMonthWindow(month);
  const categories = await db
    .select({
      category: reimbursementItems.category,
      totalAmount: sql<string>`coalesce(sum(${reimbursementItems.amount}), 0)`,
      itemCount: sql<number>`count(*)`,
    })
    .from(reimbursementItems)
    .innerJoin(reimbursementClaims, eq(reimbursementItems.claimId, reimbursementClaims.id))
    .where(and(inArray(reimbursementClaims.status, ["approved", "paid"]), gte(reimbursementItems.expenseDate, start), lt(reimbursementItems.expenseDate, end)))
    .groupBy(reimbursementItems.category)
    .orderBy(desc(sql`sum(${reimbursementItems.amount})`));
  const [claimAggregate] = await db
    .select({ totalAmount: sql<string>`coalesce(sum(${reimbursementItems.amount}), 0)`, claimCount: sql<number>`count(distinct ${reimbursementClaims.id})` })
    .from(reimbursementItems)
    .innerJoin(reimbursementClaims, eq(reimbursementItems.claimId, reimbursementClaims.id))
    .where(and(inArray(reimbursementClaims.status, ["approved", "paid"]), gte(reimbursementItems.expenseDate, start), lt(reimbursementItems.expenseDate, end)));
  return {
    month,
    totalAmount: Number(claimAggregate?.totalAmount ?? 0),
    claimCount: Number(claimAggregate?.claimCount ?? 0),
    categories: categories.map((item) => ({ category: item.category, totalAmount: Number(item.totalAmount), itemCount: Number(item.itemCount) })),
  };
}

export type ReimbursementMonthlyTrendPoint = {
  month: string;
  label: string;
  totalAmount: number;
  claimCount: number;
  itemCount: number;
};

export async function getReimbursementMonthlyTrend(months: string[]): Promise<ReimbursementMonthlyTrendPoint[]> {
  const orderedMonths = Array.from(new Set(months)).sort();
  if (!orderedMonths.length) return [];
  const db = await getDb();
  const emptyTrend = () => orderedMonths.map((month) => ({ month, label: month.replace("-", "/"), totalAmount: 0, claimCount: 0, itemCount: 0 }));
  if (!db) return emptyTrend();
  const { start } = getTaipeiMonthWindow(orderedMonths[0]!);
  const { end } = getTaipeiMonthWindow(orderedMonths[orderedMonths.length - 1]!);
  const rows = await db
    .select({ monthDate: reimbursementItems.expenseDate, amount: reimbursementItems.amount, claimId: reimbursementClaims.id })
    .from(reimbursementItems)
    .innerJoin(reimbursementClaims, eq(reimbursementItems.claimId, reimbursementClaims.id))
    .where(and(inArray(reimbursementClaims.status, ["approved", "paid"]), gte(reimbursementItems.expenseDate, start), lt(reimbursementItems.expenseDate, end)));
  const allowedMonths = new Set(orderedMonths);
  const buckets = new Map(orderedMonths.map((month) => [month, { totalAmount: 0, itemCount: 0, claimIds: new Set<number>() }]));
  rows.forEach((row) => {
    const month = getTaipeiMonthKey(row.monthDate);
    if (!allowedMonths.has(month)) return;
    const bucket = buckets.get(month);
    if (!bucket) return;
    bucket.totalAmount += Number(row.amount ?? 0);
    bucket.itemCount += 1;
    bucket.claimIds.add(row.claimId);
  });
  return orderedMonths.map((month) => {
    const bucket = buckets.get(month)!;
    return { month, label: month.replace("-", "/"), totalAmount: bucket.totalAmount, claimCount: bucket.claimIds.size, itemCount: bucket.itemCount };
  });
}

export async function createReimbursementNotification(data: InsertReimbursementNotification): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(reimbursementNotifications).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export type ReimbursementNotificationWithClaim = ReimbursementNotification & { claimNumber: string; claimTitle: string };

export async function getUnreadReimbursementNotifications(recipientId: number): Promise<ReimbursementNotificationWithClaim[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: reimbursementNotifications.id,
      claimId: reimbursementNotifications.claimId,
      recipientId: reimbursementNotifications.recipientId,
      notificationType: reimbursementNotifications.notificationType,
      message: reimbursementNotifications.message,
      isRead: reimbursementNotifications.isRead,
      readAt: reimbursementNotifications.readAt,
      createdAt: reimbursementNotifications.createdAt,
      claimNumber: reimbursementClaims.claimNumber,
      claimTitle: reimbursementClaims.title,
    })
    .from(reimbursementNotifications)
    .innerJoin(reimbursementClaims, eq(reimbursementNotifications.claimId, reimbursementClaims.id))
    .where(and(eq(reimbursementNotifications.recipientId, recipientId), eq(reimbursementNotifications.isRead, false)))
    .orderBy(desc(reimbursementNotifications.createdAt), desc(reimbursementNotifications.id));
}

export async function markReimbursementNotificationsRead(ids: number[], recipientId: number): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  if (!db) return;
  await db.update(reimbursementNotifications).set({ isRead: true, readAt: new Date() })
    .where(and(eq(reimbursementNotifications.recipientId, recipientId), inArray(reimbursementNotifications.id, ids)));
}

export type UrgentSystemReportUnreadRecipient = Pick<User, "id" | "username" | "name" | "realName" | "role" | "department">;

export type UrgentSystemReportUnreadAudience = SystemReportWithAuthor & {
  unreadUsers: UrgentSystemReportUnreadRecipient[];
  unreadCount: number;
};

/** Lists active users who have not yet acknowledged each active, published urgent report. */
export async function getUnreadUrgentSystemReportAudiences(): Promise<UrgentSystemReportUnreadAudience[]> {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const urgentReports = (await getSystemReports())
    .filter((report) => report.status === "published" && report.priority === "urgent" && (!report.expiresAt || report.expiresAt > now))
    .sort((left, right) => (left.mustReadBy?.getTime() ?? Number.MAX_SAFE_INTEGER) - (right.mustReadBy?.getTime() ?? Number.MAX_SAFE_INTEGER));
  if (urgentReports.length === 0) return [];

  const [activeUsers, reads] = await Promise.all([
    db.select({ id: users.id, username: users.username, name: users.name, realName: users.realName, role: users.role, department: users.department })
      .from(users)
      .where(eq(users.isActive, true))
      .orderBy(users.role, users.username, users.id),
    db.select({ reportId: systemReportReads.reportId, userId: systemReportReads.userId })
      .from(systemReportReads)
      .where(inArray(systemReportReads.reportId, urgentReports.map((report) => report.id))),
  ]);
  const readUserIdsByReport = new Map<number, Set<number>>();
  for (const read of reads) {
    const readUserIds = readUserIdsByReport.get(read.reportId) ?? new Set<number>();
    readUserIds.add(read.userId);
    readUserIdsByReport.set(read.reportId, readUserIds);
  }
  return urgentReports.map((report) => {
    const readUserIds = readUserIdsByReport.get(report.id) ?? new Set<number>();
    const unreadUsers = activeUsers.filter((user) => !readUserIds.has(user.id));
    return { ...report, unreadUsers, unreadCount: unreadUsers.length };
  });
}

// ─── PIN Failure Attempts ────────────────────────────────────────────────────

export async function getPinFailureAttempts(userId: number): Promise<PinFailureAttempt | null> {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db
    .select()
    .from(pinFailureAttempts)
    .where(eq(pinFailureAttempts.userId, userId));
  return result || null;
}

export async function recordPinFailure(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await getPinFailureAttempts(userId);
  const now = new Date();
  const newAttemptCount = (existing?.attemptCount ?? 0) + 1;
  
  // Lock for 15 minutes after 3 failed attempts
  const lockedUntil = newAttemptCount >= 3 ? new Date(now.getTime() + 15 * 60 * 1000) : null;

  if (existing) {
    await db
      .update(pinFailureAttempts)
      .set({
        attemptCount: newAttemptCount,
        lastAttemptAt: now,
        lockedUntil,
        updatedAt: now,
      })
      .where(eq(pinFailureAttempts.userId, userId));
  } else {
    await db.insert(pinFailureAttempts).values({
      userId,
      attemptCount: newAttemptCount,
      lastAttemptAt: now,
      lockedUntil,
    });
  }
}

export async function resetPinFailureAttempts(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await getPinFailureAttempts(userId);
  if (existing) {
    await db
      .update(pinFailureAttempts)
      .set({
        attemptCount: 0,
        lockedUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(pinFailureAttempts.userId, userId));
  }
}

export async function isPinLocked(userId: number): Promise<boolean> {
  const attempts = await getPinFailureAttempts(userId);
  if (!attempts || !attempts.lockedUntil) return false;
  return new Date() < attempts.lockedUntil;
}

export async function getPinLockTimeRemaining(userId: number): Promise<number> {
  const attempts = await getPinFailureAttempts(userId);
  if (!attempts || !attempts.lockedUntil) return 0;
  
  const now = new Date();
  if (now >= attempts.lockedUntil) return 0;
  
  return Math.min(900, Math.ceil((attempts.lockedUntil.getTime() - now.getTime()) / 1000));
}

// ─── Founder Login PIN Failure Attempts ───────────────────────────────────────

export async function getLoginPinFailureAttempts(userId: number): Promise<LoginPinFailureAttempt | null> {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db
    .select()
    .from(loginPinFailureAttempts)
    .where(eq(loginPinFailureAttempts.userId, userId));
  return result || null;
}

export async function recordLoginPinFailure(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await getLoginPinFailureAttempts(userId);
  const now = new Date();
  const attemptCount = (existing?.attemptCount ?? 0) + 1;
  const lockedUntil = attemptCount >= 3 ? new Date(now.getTime() + 15 * 60 * 1000) : null;

  if (existing) {
    await db
      .update(loginPinFailureAttempts)
      .set({ attemptCount, lastAttemptAt: now, lockedUntil, updatedAt: now })
      .where(eq(loginPinFailureAttempts.userId, userId));
    return;
  }

  await db.insert(loginPinFailureAttempts).values({ userId, attemptCount, lastAttemptAt: now, lockedUntil });
}

export async function resetLoginPinFailureAttempts(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(loginPinFailureAttempts)
    .set({ attemptCount: 0, lockedUntil: null, updatedAt: new Date() })
    .where(eq(loginPinFailureAttempts.userId, userId));
}

export async function isLoginPinLocked(userId: number): Promise<boolean> {
  const attempts = await getLoginPinFailureAttempts(userId);
  return Boolean(attempts?.lockedUntil && new Date() < attempts.lockedUntil);
}

export async function getLoginPinLockTimeRemaining(userId: number): Promise<number> {
  const attempts = await getLoginPinFailureAttempts(userId);
  if (!attempts?.lockedUntil || new Date() >= attempts.lockedUntil) return 0;
  return Math.min(900, Math.ceil((attempts.lockedUntil.getTime() - Date.now()) / 1000));
}

// ─── Login Failure Attempts ──────────────────────────────────────────────────

export async function getLoginFailureAttempts(userId: number): Promise<LoginFailureAttempt | null> {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db
    .select()
    .from(loginFailureAttempts)
    .where(eq(loginFailureAttempts.userId, userId));
  return result || null;
}

export const LOGIN_FAILURE_WINDOW_SECONDS = 5 * 60;
export const LOGIN_FAILURE_LOCK_THRESHOLD = 3;
const LOGIN_LOCK_DURATION_SECONDS = 15 * 60;

export function calculateNextLoginFailureState(
  existing: Pick<LoginFailureAttempt, "attemptCount" | "lastAttemptAt"> | null | undefined,
  now = new Date()
) {
  const lastAttemptAt = existing?.lastAttemptAt ? new Date(existing.lastAttemptAt) : null;
  const isWithinFailureWindow = lastAttemptAt
    ? now.getTime() - lastAttemptAt.getTime() <= LOGIN_FAILURE_WINDOW_SECONDS * 1000
    : false;
  const attemptCount = isWithinFailureWindow ? (existing?.attemptCount ?? 0) + 1 : 1;
  return {
    attemptCount,
    isWithinFailureWindow,
    lockedUntil: attemptCount >= LOGIN_FAILURE_LOCK_THRESHOLD
      ? new Date(now.getTime() + LOGIN_LOCK_DURATION_SECONDS * 1000)
      : null,
  };
}

export async function recordLoginFailure(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await getLoginFailureAttempts(userId);
  const now = new Date();
  const nextState = calculateNextLoginFailureState(existing, now);
  const newAttemptCount = nextState.attemptCount;
  const lockedUntil = nextState.lockedUntil;

  if (existing) {
    await db
      .update(loginFailureAttempts)
      .set({
        attemptCount: newAttemptCount,
        lastAttemptAt: now,
        lockedUntil,
        updatedAt: now,
      })
      .where(eq(loginFailureAttempts.userId, userId));
  } else {
    await db.insert(loginFailureAttempts).values({
      userId,
      attemptCount: newAttemptCount,
      lastAttemptAt: now,
      lockedUntil,
    });
  }
}

export async function resetLoginFailureAttempts(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await getLoginFailureAttempts(userId);
  if (existing) {
    await db
      .update(loginFailureAttempts)
      .set({
        attemptCount: 0,
        lockedUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(loginFailureAttempts.userId, userId));
  }
}

export async function isLoginLocked(userId: number): Promise<boolean> {
  const attempts = await getLoginFailureAttempts(userId);
  if (!attempts || !attempts.lockedUntil) return false;
  return new Date() < attempts.lockedUntil;
}

export async function getLoginLockTimeRemaining(userId: number): Promise<number> {
  const attempts = await getLoginFailureAttempts(userId);
  if (!attempts || !attempts.lockedUntil) return 0;
  
  const now = new Date();
  if (now >= attempts.lockedUntil) return 0;
  
  const remainingSeconds = Math.ceil((attempts.lockedUntil.getTime() - now.getTime()) / 1000);
  return Math.min(LOGIN_LOCK_DURATION_SECONDS, remainingSeconds);
}

export async function unlockLoginAttempts(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await getLoginFailureAttempts(userId);
  if (existing) {
    await db
      .update(loginFailureAttempts)
      .set({
        attemptCount: 0,
        lockedUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(loginFailureAttempts.userId, userId));
  }
}

export async function lockLoginAttempts(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await getLoginFailureAttempts(userId);
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + LOGIN_LOCK_DURATION_SECONDS * 1000);
  const attemptCount = Math.max(existing?.attemptCount ?? 0, LOGIN_FAILURE_LOCK_THRESHOLD);
  if (existing) {
    await db
      .update(loginFailureAttempts)
      .set({ attemptCount, lastAttemptAt: now, lockedUntil, updatedAt: now })
      .where(eq(loginFailureAttempts.userId, userId));
  } else {
    await db.insert(loginFailureAttempts).values({ userId, attemptCount, lastAttemptAt: now, lockedUntil });
  }
}

export async function getLoginFailureAttemptCount(userId: number): Promise<number> {
  const attempts = await getLoginFailureAttempts(userId);
  return attempts?.attemptCount ?? 0;
}

export const EQUIPMENT_QR_CODE_PREFIX = "QSSHMST";

export function normalizeQrCodeIdSuffix(value?: string): string | undefined {
  const suffix = value?.trim().toUpperCase();
  if (!suffix) return undefined;
  if (!/^[A-Z0-9_-]{1,64}$/.test(suffix) || suffix.startsWith(EQUIPMENT_QR_CODE_PREFIX)) {
    throw new Error("INVALID_QR_CODE_ID_SUFFIX");
  }
  return suffix;
}

export async function generateUniqueQrCodeId(requestedSuffix?: string, excludeEquipmentId?: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const hasMatchingQrCodeId = async (qrCodeId: string) => {
    const existingEquipment = await db.select({ id: equipment.id }).from(equipment).where(
      excludeEquipmentId === undefined
        ? eq(equipment.qrCodeId, qrCodeId)
        : and(eq(equipment.qrCodeId, qrCodeId), ne(equipment.id, excludeEquipmentId)),
    ).limit(1);
    return existingEquipment.length > 0;
  };

  const normalizedSuffix = normalizeQrCodeIdSuffix(requestedSuffix);
  if (normalizedSuffix) {
    const qrCodeId = `${EQUIPMENT_QR_CODE_PREFIX}${normalizedSuffix}`;
    if (await hasMatchingQrCodeId(qrCodeId)) throw new Error("DUPLICATE_QR_CODE_ID");
    return qrCodeId;
  }

  let qrCodeId: string;
  let isUnique = false;
  do {
    const existingIds = await db.select({ qrCodeId: equipment.qrCodeId }).from(equipment).where(like(equipment.qrCodeId, `${EQUIPMENT_QR_CODE_PREFIX}%`));
    const nextIdNum = existingIds.reduce((highest, item) => {
      const match = item.qrCodeId?.match(new RegExp(`^${EQUIPMENT_QR_CODE_PREFIX}(\\d+)$`));
      return match?.[1] ? Math.max(highest, Number.parseInt(match[1], 10)) : highest;
    }, 0) + 1;
    qrCodeId = `${EQUIPMENT_QR_CODE_PREFIX}${String(nextIdNum).padStart(4, "0")}`;
    isUnique = !(await hasMatchingQrCodeId(qrCodeId));
  } while (!isUnique);

  return qrCodeId;
}

export async function borrowEquipment(equipmentId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(equipment).set({
    status: 'borrowed',
    updatedAt: new Date(),
  }).where(and(eq(equipment.id, equipmentId), isNull(equipment.deletedAt)));
  const borrowedEquipment = await getEquipmentById(equipmentId);

  if (!borrowedEquipment) {
    throw new Error('Equipment not found or already borrowed');
  }

  await db.insert(borrowRecords).values({
    equipmentId: borrowedEquipment.id,
    borrowerId: userId,
    borrowedAt: new Date(),
    expectedReturnAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 預設借用 7 天
    status: 'active',
  });

  return borrowedEquipment;
}

export async function returnEquipment(equipmentId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(equipment).set({
    status: 'available',
    updatedAt: new Date(),
  }).where(and(eq(equipment.id, equipmentId), isNull(equipment.deletedAt)));
  const returnedEquipment = await getEquipmentById(equipmentId);

  if (!returnedEquipment) {
    throw new Error('Equipment not found or not borrowed');
  }

  await db.update(borrowRecords).set({
    actualReturnAt: new Date(),
    status: 'returned',
  }).where(and(eq(borrowRecords.equipmentId, equipmentId), eq(borrowRecords.status, 'active')));

  return returnedEquipment;
}

// ─── Account Security ─────────────────────────────────────────────────────────

export async function getTwoFactorAuthenticator(userId: number): Promise<TwoFactorAuthenticator | null> {
  const db = await getDb();
  if (!db) return null;
  const [authenticator] = await db.select().from(twoFactorAuthenticators).where(eq(twoFactorAuthenticators.userId, userId)).limit(1);
  return authenticator ?? null;
}

export async function upsertTwoFactorAuthenticator(data: InsertTwoFactorAuthenticator): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await getTwoFactorAuthenticator(data.userId);
  if (existing) {
    await db.update(twoFactorAuthenticators).set({
      encryptedSecret: data.encryptedSecret,
      isEnabled: data.isEnabled ?? false,
      enabledAt: data.enabledAt ?? null,
      lastUsedAt: data.lastUsedAt ?? null,
      updatedAt: new Date(),
    }).where(eq(twoFactorAuthenticators.userId, data.userId));
  } else {
    await db.insert(twoFactorAuthenticators).values(data);
  }
}

export async function setTwoFactorEnabled(userId: number, isEnabled: boolean): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(twoFactorAuthenticators).set({
    isEnabled,
    enabledAt: isEnabled ? new Date() : null,
    updatedAt: new Date(),
  }).where(eq(twoFactorAuthenticators.userId, userId));
}

export async function touchTwoFactorAuthenticator(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(twoFactorAuthenticators).set({ lastUsedAt: new Date(), updatedAt: new Date() }).where(eq(twoFactorAuthenticators.userId, userId));
}

export async function createTwoFactorLoginChallenge(data: InsertTwoFactorLoginChallenge): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(twoFactorLoginChallenges).where(eq(twoFactorLoginChallenges.userId, data.userId));
  await db.insert(twoFactorLoginChallenges).values(data);
}

export async function getTwoFactorLoginChallenge(challengeToken: string): Promise<TwoFactorLoginChallenge | null> {
  const db = await getDb();
  if (!db) return null;
  const [challenge] = await db.select().from(twoFactorLoginChallenges).where(eq(twoFactorLoginChallenges.challengeToken, challengeToken)).limit(1);
  return challenge ?? null;
}

export async function incrementTwoFactorChallengeAttempts(challengeToken: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const challenge = await getTwoFactorLoginChallenge(challengeToken);
  if (!challenge) return;
  await db.update(twoFactorLoginChallenges).set({ attemptCount: challenge.attemptCount + 1 }).where(eq(twoFactorLoginChallenges.challengeToken, challengeToken));
}

export async function markTwoFactorChallengeVerified(challengeToken: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(twoFactorLoginChallenges).set({ secondFactorVerifiedAt: new Date() }).where(eq(twoFactorLoginChallenges.challengeToken, challengeToken));
}

export async function deleteTwoFactorLoginChallenge(challengeToken: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(twoFactorLoginChallenges).where(eq(twoFactorLoginChallenges.challengeToken, challengeToken));
}

export async function getActiveTwoFactorRecoveryCodes(userId: number): Promise<TwoFactorRecoveryCode[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(twoFactorRecoveryCodes)
    .where(and(eq(twoFactorRecoveryCodes.userId, userId), isNull(twoFactorRecoveryCodes.usedAt), isNull(twoFactorRecoveryCodes.revokedAt)))
    .orderBy(desc(twoFactorRecoveryCodes.createdAt), desc(twoFactorRecoveryCodes.id));
}

export async function getTwoFactorRecoveryCodeStatus(userId: number) {
  const db = await getDb();
  if (!db) return { availableCount: 0, totalGenerated: 0, lastGeneratedAt: null as Date | null };
  const codes = await db.select({ createdAt: twoFactorRecoveryCodes.createdAt, usedAt: twoFactorRecoveryCodes.usedAt, revokedAt: twoFactorRecoveryCodes.revokedAt })
    .from(twoFactorRecoveryCodes).where(eq(twoFactorRecoveryCodes.userId, userId));
  return {
    availableCount: codes.filter((code) => !code.usedAt && !code.revokedAt).length,
    totalGenerated: codes.filter((code) => !code.revokedAt).length,
    lastGeneratedAt: codes.reduce<Date | null>((latest, code) => !latest || code.createdAt > latest ? code.createdAt : latest, null),
  };
}

export async function replaceTwoFactorRecoveryCodes(userId: number, codeHashes: string[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(twoFactorRecoveryCodes).set({ revokedAt: now })
      .where(and(eq(twoFactorRecoveryCodes.userId, userId), isNull(twoFactorRecoveryCodes.usedAt), isNull(twoFactorRecoveryCodes.revokedAt)));
    await tx.insert(twoFactorRecoveryCodes).values(codeHashes.map((codeHash): InsertTwoFactorRecoveryCode => ({ userId, codeHash })));
  });
}

export async function consumeTwoFactorRecoveryCode(userId: number, recoveryCodeId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(twoFactorRecoveryCodes).set({ usedAt: new Date() })
    .where(and(
      eq(twoFactorRecoveryCodes.id, recoveryCodeId),
      eq(twoFactorRecoveryCodes.userId, userId),
      isNull(twoFactorRecoveryCodes.usedAt),
      isNull(twoFactorRecoveryCodes.revokedAt),
    ));
  return Number((result as any)[0]?.affectedRows ?? (result as any).affectedRows ?? 0) === 1;
}

export async function revokeTwoFactorRecoveryCodes(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(twoFactorRecoveryCodes).set({ revokedAt: new Date() })
    .where(and(eq(twoFactorRecoveryCodes.userId, userId), isNull(twoFactorRecoveryCodes.usedAt), isNull(twoFactorRecoveryCodes.revokedAt)));
}

export async function createFirstLoginSetupChallenge(data: InsertFirstLoginSetupChallenge): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(firstLoginSetupChallenges).where(eq(firstLoginSetupChallenges.userId, data.userId));
  await db.insert(firstLoginSetupChallenges).values(data);
}

export async function getFirstLoginSetupChallenge(challengeToken: string): Promise<FirstLoginSetupChallenge | null> {
  const db = await getDb();
  if (!db) return null;
  const [challenge] = await db.select().from(firstLoginSetupChallenges).where(eq(firstLoginSetupChallenges.challengeToken, challengeToken)).limit(1);
  return challenge ?? null;
}

export async function deleteFirstLoginSetupChallenge(challengeToken: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(firstLoginSetupChallenges).where(eq(firstLoginSetupChallenges.challengeToken, challengeToken));
}

export async function listPasskeyCredentials(userId: number): Promise<PasskeyCredential[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(passkeyCredentials).where(eq(passkeyCredentials.userId, userId)).orderBy(desc(passkeyCredentials.lastUsedAt), desc(passkeyCredentials.createdAt));
}

export async function getPasskeyCredentialByCredentialId(credentialId: string): Promise<PasskeyCredential | null> {
  const db = await getDb();
  if (!db) return null;
  const [credential] = await db.select().from(passkeyCredentials).where(eq(passkeyCredentials.credentialId, credentialId)).limit(1);
  return credential ?? null;
}

export async function createPasskeyCredential(data: InsertPasskeyCredential): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("資料庫暫時無法使用");
  await db.insert(passkeyCredentials).values(data);
}

export async function updatePasskeyCredentialUsage(input: {
  credentialId: string;
  counter: number;
  deviceType: string;
  backedUp: boolean;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(passkeyCredentials).set({
    counter: input.counter,
    deviceType: input.deviceType,
    backedUp: input.backedUp,
    lastUsedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(passkeyCredentials.credentialId, input.credentialId));
}

export async function renamePasskeyCredential(userId: number, credentialId: string, name: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const [credential] = await db.select({ id: passkeyCredentials.id }).from(passkeyCredentials).where(and(eq(passkeyCredentials.userId, userId), eq(passkeyCredentials.credentialId, credentialId))).limit(1);
  if (!credential) return false;
  await db.update(passkeyCredentials).set({ name, updatedAt: new Date() }).where(eq(passkeyCredentials.id, credential.id));
  return true;
}

export async function deletePasskeyCredential(userId: number, credentialId: string): Promise<PasskeyCredential | null> {
  const db = await getDb();
  if (!db) return null;
  const [credential] = await db.select().from(passkeyCredentials).where(and(eq(passkeyCredentials.userId, userId), eq(passkeyCredentials.credentialId, credentialId))).limit(1);
  if (!credential) return null;
  await db.delete(passkeyCredentials).where(eq(passkeyCredentials.id, credential.id));
  return credential;
}

export async function createPasskeyChallenge(data: InsertPasskeyChallenge): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("資料庫暫時無法使用");
  await db.delete(passkeyChallenges).where(lte(passkeyChallenges.expiresAt, new Date()));
  if (data.type === "registration" && data.userId) {
    await db.delete(passkeyChallenges).where(and(eq(passkeyChallenges.userId, data.userId), eq(passkeyChallenges.type, "registration")));
  }
  await db.insert(passkeyChallenges).values(data);
}

export async function consumePasskeyChallenge(challengeValue: string, type: "registration" | "authentication"): Promise<PasskeyChallenge | null> {
  const db = await getDb();
  if (!db) return null;
  return db.transaction(async (tx) => {
    const [challenge] = await tx.select().from(passkeyChallenges).where(and(eq(passkeyChallenges.challenge, challengeValue), eq(passkeyChallenges.type, type))).limit(1).for("update");
    if (!challenge) return null;
    await tx.delete(passkeyChallenges).where(eq(passkeyChallenges.id, challenge.id));
    return challenge.expiresAt > new Date() ? challenge : null;
  });
}

export async function listLoginDevices(userId: number): Promise<LoginDevice[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(loginDevices).where(eq(loginDevices.userId, userId)).orderBy(desc(loginDevices.lastSeenAt));
}

export async function getLoginDeviceById(deviceId: string): Promise<LoginDevice | null> {
  const db = await getDb();
  if (!db) return null;
  const [device] = await db.select().from(loginDevices).where(eq(loginDevices.deviceId, deviceId)).limit(1);
  return device ?? null;
}

export async function countActiveLoginDevices(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const [result] = await db.select({ count: sql<number>`count(*)` }).from(loginDevices).where(and(eq(loginDevices.userId, userId), sql`${loginDevices.revokedAt} IS NULL`));
  return Number(result?.count ?? 0);
}

export async function recordLoginDevice(data: InsertLoginDevice): Promise<{ isNewDevice: boolean; location: IpGeolocation | null }> {
  const db = await getDb();
  if (!db) return { isNewDevice: false, location: null };
  const [existing] = await db.select().from(loginDevices).where(eq(loginDevices.deviceId, data.deviceId)).limit(1);
  if (existing) {
    await db.update(loginDevices).set({
      deviceName: data.deviceName,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
      lastSeenAt: new Date(),
      revokedAt: null,
    }).where(eq(loginDevices.deviceId, data.deviceId));
    return { isNewDevice: false, location: null };
  } else {
    const location = await resolveIpGeolocation(data.ipAddress);
    await db.insert(loginDevices).values({
      ...data,
      geoCountry: location.country,
      geoRegion: location.region,
      geoCity: location.city,
      geoTimezone: location.timezone,
      geoAsn: location.asn,
      geoIsp: location.isp,
      geoOrganization: location.organization,
      geoDomain: location.domain,
      geoSource: location.source,
      geoResolvedAt: location.resolvedAt,
    });
    await createLoginDeviceAlert({ userId: data.userId, deviceId: data.deviceId });
    return { isNewDevice: true, location };
  }
}

export async function createLoginDeviceAlert(data: { userId: number; deviceId: string }): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(loginDeviceAlerts).values({ userId: data.userId, deviceId: data.deviceId, status: "pending" });
}

export async function getPendingLoginDeviceAlerts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: loginDeviceAlerts.id,
      deviceId: loginDeviceAlerts.deviceId,
      createdAt: loginDeviceAlerts.createdAt,
      deviceName: loginDevices.deviceName,
      ipAddress: loginDevices.ipAddress,
      userAgent: loginDevices.userAgent,
      geoCountry: loginDevices.geoCountry,
      geoRegion: loginDevices.geoRegion,
      geoCity: loginDevices.geoCity,
      geoTimezone: loginDevices.geoTimezone,
      geoAsn: loginDevices.geoAsn,
      geoIsp: loginDevices.geoIsp,
      geoOrganization: loginDevices.geoOrganization,
      geoDomain: loginDevices.geoDomain,
      geoSource: loginDevices.geoSource,
      geoResolvedAt: loginDevices.geoResolvedAt,
      firstSeenAt: loginDevices.firstSeenAt,
      lastSeenAt: loginDevices.lastSeenAt,
      revokedAt: loginDevices.revokedAt,
    })
    .from(loginDeviceAlerts)
    .innerJoin(loginDevices, eq(loginDeviceAlerts.deviceId, loginDevices.deviceId))
    .where(and(eq(loginDeviceAlerts.userId, userId), eq(loginDeviceAlerts.status, "pending")))
    .orderBy(desc(loginDeviceAlerts.createdAt));
}

export async function getPendingLoginDeviceAlertById(alertId: number) {
  const db = await getDb();
  if (!db) return null;
  const [alert] = await db
    .select({
      id: loginDeviceAlerts.id,
      userId: loginDeviceAlerts.userId,
      deviceId: loginDeviceAlerts.deviceId,
      deviceName: loginDevices.deviceName,
      ipAddress: loginDevices.ipAddress,
      geoCity: loginDevices.geoCity,
      geoRegion: loginDevices.geoRegion,
      geoCountry: loginDevices.geoCountry,
    })
    .from(loginDeviceAlerts)
    .innerJoin(loginDevices, eq(loginDeviceAlerts.deviceId, loginDevices.deviceId))
    .where(and(eq(loginDeviceAlerts.id, alertId), eq(loginDeviceAlerts.status, "pending")))
    .limit(1);
  return alert ?? null;
}

export async function confirmLoginDeviceAlert(alertId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const [alert] = await db
    .select()
    .from(loginDeviceAlerts)
    .where(and(eq(loginDeviceAlerts.id, alertId), eq(loginDeviceAlerts.userId, userId), eq(loginDeviceAlerts.status, "pending")))
    .limit(1);
  if (!alert) return false;
  await db.update(loginDeviceAlerts).set({ status: "confirmed", confirmedAt: new Date() }).where(eq(loginDeviceAlerts.id, alert.id));
  return true;
}

export async function revokeLoginDeviceAlert(alertId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const [alert] = await db
    .select()
    .from(loginDeviceAlerts)
    .where(and(eq(loginDeviceAlerts.id, alertId), eq(loginDeviceAlerts.userId, userId), eq(loginDeviceAlerts.status, "pending")))
    .limit(1);
  if (!alert) return false;
  await db.update(loginDevices).set({ revokedAt: new Date() }).where(and(eq(loginDevices.userId, userId), eq(loginDevices.deviceId, alert.deviceId)));
  await db.update(loginDeviceAlerts).set({ status: "revoked", confirmedAt: new Date() }).where(eq(loginDeviceAlerts.id, alert.id));
  return true;
}

export async function revokeLoginDevice(userId: number, deviceId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const [device] = await db.select().from(loginDevices).where(and(eq(loginDevices.userId, userId), eq(loginDevices.deviceId, deviceId))).limit(1);
  if (!device || device.revokedAt) return false;
  await db.update(loginDevices).set({ revokedAt: new Date() }).where(eq(loginDevices.id, device.id));
  return true;
}

export async function getIpBlacklistEntry(ipAddress: string): Promise<IpBlacklistEntry | null> {
  const db = await getDb();
  if (!db) return null;
  const [entry] = await db.select().from(ipBlacklist).where(eq(ipBlacklist.ipAddress, ipAddress)).limit(1);
  return entry ?? null;
}

export async function listIpBlacklist(): Promise<IpBlacklistEntry[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ipBlacklist).orderBy(desc(ipBlacklist.updatedAt));
}

export async function upsertIpBlacklistEntry(data: InsertIpBlacklistEntry): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await getIpBlacklistEntry(data.ipAddress);
  if (existing) {
    await db.update(ipBlacklist).set({
      note: data.note ?? null,
      isActive: data.isActive ?? true,
      createdById: data.createdById,
      updatedAt: new Date(),
    }).where(eq(ipBlacklist.id, existing.id));
  } else {
    await db.insert(ipBlacklist).values(data);
  }
}

export async function setIpBlacklistActive(id: number, isActive: boolean): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const [entry] = await db.select({ id: ipBlacklist.id }).from(ipBlacklist).where(eq(ipBlacklist.id, id)).limit(1);
  if (!entry) return false;
  await db.update(ipBlacklist).set({ isActive, updatedAt: new Date() }).where(eq(ipBlacklist.id, id));
  return true;
}

// ─── Media Service Calendar ──────────────────────────────────────────────────
export type MediaCalendarEventCategory = "activity" | "duty" | "equipment" | "meeting" | "other";
export type MediaCalendarEventInput = {
  title: string;
  category: MediaCalendarEventCategory;
  startsAt: Date;
  endsAt?: Date | null;
  allDay: boolean;
  location?: string | null;
  description?: string | null;
  createdById: number;
  updatedById?: number | null;
};

export async function getMediaCalendarEvents(rangeStart: Date, rangeEnd: Date): Promise<MediaCalendarEvent[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(mediaCalendarEvents)
    .where(and(
      lte(mediaCalendarEvents.startsAt, rangeEnd),
      or(isNull(mediaCalendarEvents.endsAt), gte(mediaCalendarEvents.endsAt, rangeStart)),
    ))
    .orderBy(mediaCalendarEvents.startsAt);
}

export async function getMediaCalendarEventById(id: number): Promise<MediaCalendarEvent | null> {
  const db = await getDb();
  if (!db) return null;
  const [event] = await db.select().from(mediaCalendarEvents).where(eq(mediaCalendarEvents.id, id)).limit(1);
  return event ?? null;
}

export async function createMediaCalendarEvent(input: MediaCalendarEventInput): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(mediaCalendarEvents).values(input satisfies InsertMediaCalendarEvent);
}

export async function updateMediaCalendarEvent(id: number, input: Omit<MediaCalendarEventInput, "createdById">): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(mediaCalendarEvents).set({ ...input, updatedAt: new Date() }).where(eq(mediaCalendarEvents.id, id));
  return result[0].affectedRows > 0;
}

export async function deleteMediaCalendarEvent(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.delete(mediaCalendarEvents).where(eq(mediaCalendarEvents.id, id));
  return result[0].affectedRows > 0;
}

// ─── Media Service Project Proposals ─────────────────────────────────────────
export type MediaProjectProposalStatus = "draft" | "submitted" | "approved" | "returned" | "rejected";
export type MediaProjectProposalInput = {
  title: string;
  summary?: string | null;
  content: string;
  proposedStartAt?: Date | null;
  proposedEndAt?: Date | null;
  requestedBudget?: string | null;
  status: "draft" | "submitted";
  applicantId: number;
};

export async function getMediaProjectProposals(): Promise<MediaProjectProposal[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(mediaProjectProposals).orderBy(desc(mediaProjectProposals.updatedAt));
}

export async function getMediaProjectProposalsByApplicant(applicantId: number): Promise<MediaProjectProposal[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(mediaProjectProposals).where(eq(mediaProjectProposals.applicantId, applicantId)).orderBy(desc(mediaProjectProposals.updatedAt));
}

export async function getMediaProjectProposalById(id: number): Promise<MediaProjectProposal | null> {
  const db = await getDb();
  if (!db) return null;
  const [proposal] = await db.select().from(mediaProjectProposals).where(eq(mediaProjectProposals.id, id)).limit(1);
  return proposal ?? null;
}

export async function createMediaProjectProposal(input: MediaProjectProposalInput): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(mediaProjectProposals).values(input satisfies InsertMediaProjectProposal);
}

export async function updateMediaProjectProposal(id: number, input: Omit<MediaProjectProposalInput, "applicantId">): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(mediaProjectProposals).set({ ...input, updatedAt: new Date() }).where(eq(mediaProjectProposals.id, id));
  return result[0].affectedRows > 0;
}

export async function reviewMediaProjectProposal(id: number, status: Exclude<MediaProjectProposalStatus, "draft" | "submitted"> | "approved", reviewNote: string | null, reviewerId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(mediaProjectProposals).set({ status, reviewNote, reviewerId, reviewedAt: new Date(), updatedAt: new Date() }).where(eq(mediaProjectProposals.id, id));
  return result[0].affectedRows > 0;
}

export async function deleteMediaProjectProposal(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.delete(mediaProjectProposals).where(eq(mediaProjectProposals.id, id));
  return result[0].affectedRows > 0;
}

// ─── Podcast Shows & Episodes ─────────────────────────────────────────────────
export type PodcastPublicationStatus = "draft" | "published";
export type PodcastDistributionPlatform = "spotify" | "apple_podcasts" | "amazon_music" | "youtube" | "other";
export type PodcastDistributionStatus = "not_submitted" | "submitted" | "active" | "attention";
export type PodcastShowInput = {
  title: string;
  description?: string | null;
  slug?: string | null;
  authorName?: string | null;
  ownerEmail?: string | null;
  language?: string;
  artworkUrl?: string | null;
  isExplicit?: boolean;
  rssEnabled?: boolean;
  status: PodcastPublicationStatus;
  createdById: number;
  updatedById?: number | null;
  publishedAt?: Date | null;
};
export type PodcastRssSettingsInput = Pick<PodcastShowInput, "slug" | "authorName" | "ownerEmail" | "language" | "artworkUrl" | "isExplicit" | "rssEnabled">;
export type PodcastDistributionTargetInput = {
  showId: number;
  platform: PodcastDistributionPlatform;
  status: PodcastDistributionStatus;
  directoryUrl?: string | null;
  note?: string | null;
  submittedAt?: Date | null;
  lastConfirmedAt?: Date | null;
  updatedById: number;
};
export type PodcastEpisodeInput = {
  showId: number;
  title: string;
  description?: string | null;
  episodeNumber: number;
  audioFileName: string;
  audioStorageKey: string;
  audioUrl: string;
  audioMimeType: string;
  audioSizeBytes: number;
  status: PodcastPublicationStatus;
  createdById: number;
  updatedById?: number | null;
  publishedAt?: Date | null;
};

export async function getPodcastShows(includeDrafts = false): Promise<PodcastShow[]> {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(podcastShows);
  return includeDrafts
    ? query.orderBy(desc(podcastShows.updatedAt))
    : query.where(eq(podcastShows.status, "published")).orderBy(desc(podcastShows.publishedAt));
}

export async function getPodcastShowById(id: number): Promise<PodcastShow | null> {
  const db = await getDb();
  if (!db) return null;
  const [show] = await db.select().from(podcastShows).where(eq(podcastShows.id, id)).limit(1);
  return show ?? null;
}

export async function getPodcastShowBySlug(slug: string): Promise<PodcastShow | null> {
  const db = await getDb();
  if (!db) return null;
  const [show] = await db.select().from(podcastShows).where(eq(podcastShows.slug, slug)).limit(1);
  return show ?? null;
}

export async function getPublicPodcastRssFeed(slug: string): Promise<{ show: PodcastShow; episodes: PodcastEpisode[] } | null> {
  const db = await getDb();
  if (!db) return null;
  const [show] = await db.select().from(podcastShows).where(and(eq(podcastShows.slug, slug), eq(podcastShows.status, "published"), eq(podcastShows.rssEnabled, true))).limit(1);
  if (!show) return null;
  const episodes = await db.select().from(podcastEpisodes).where(and(eq(podcastEpisodes.showId, show.id), eq(podcastEpisodes.status, "published"))).orderBy(podcastEpisodes.episodeNumber);
  return { show, episodes };
}

export async function createPodcastShow(input: PodcastShowInput): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(podcastShows).values(input satisfies InsertPodcastShow);
  return (result[0] as { insertId: number }).insertId;
}

export async function updatePodcastShow(id: number, input: Omit<PodcastShowInput, "createdById">): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(podcastShows).set({ ...input, updatedAt: new Date() }).where(eq(podcastShows.id, id));
  return result[0].affectedRows > 0;
}

export async function updatePodcastRssSettings(id: number, input: PodcastRssSettingsInput & { updatedById: number }): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(podcastShows).set({ ...input, updatedAt: new Date() }).where(eq(podcastShows.id, id));
  return result[0].affectedRows > 0;
}

export async function getPodcastDistributionTargets(showId: number): Promise<PodcastDistributionTarget[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(podcastDistributionTargets).where(eq(podcastDistributionTargets.showId, showId)).orderBy(podcastDistributionTargets.platform);
}

export async function upsertPodcastDistributionTarget(input: PodcastDistributionTargetInput): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(podcastDistributionTargets).values(input satisfies InsertPodcastDistributionTarget).onDuplicateKeyUpdate({
    set: {
      status: input.status,
      directoryUrl: input.directoryUrl ?? null,
      note: input.note ?? null,
      submittedAt: input.submittedAt ?? null,
      lastConfirmedAt: input.lastConfirmedAt ?? null,
      updatedById: input.updatedById,
      updatedAt: new Date(),
    },
  });
}

export async function deletePodcastShow(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.delete(podcastShows).where(eq(podcastShows.id, id));
  return result[0].affectedRows > 0;
}

export async function getPodcastEpisodes(showId: number, includeDrafts = false): Promise<PodcastEpisode[]> {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(podcastEpisodes);
  return includeDrafts
    ? query.where(eq(podcastEpisodes.showId, showId)).orderBy(podcastEpisodes.episodeNumber)
    : query.where(and(eq(podcastEpisodes.showId, showId), eq(podcastEpisodes.status, "published"))).orderBy(podcastEpisodes.episodeNumber);
}

export async function getPodcastEpisodeById(id: number): Promise<PodcastEpisode | null> {
  const db = await getDb();
  if (!db) return null;
  const [episode] = await db.select().from(podcastEpisodes).where(eq(podcastEpisodes.id, id)).limit(1);
  return episode ?? null;
}

export async function createPodcastEpisode(input: PodcastEpisodeInput): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(podcastEpisodes).values(input satisfies InsertPodcastEpisode);
  return (result[0] as { insertId: number }).insertId;
}

export async function updatePodcastEpisode(id: number, input: Pick<PodcastEpisodeInput, "title" | "description" | "episodeNumber" | "status" | "updatedById" | "publishedAt">): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(podcastEpisodes).set({ ...input, updatedAt: new Date() }).where(eq(podcastEpisodes.id, id));
  return result[0].affectedRows > 0;
}

export async function deletePodcastEpisode(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.delete(podcastEpisodes).where(eq(podcastEpisodes.id, id));
  return result[0].affectedRows > 0;
}
