import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { createContext, type TrpcContext } from "./_core/context";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME } from "../shared/const";
import {
  createBrandLogoLoadFailure,
  createLoginAuditLog,
  createEquipmentLocationHistoryEntry,
  getBrandLogoLoadFailureCount,
  getBrandLogoLoadFailures,
  getBrandLogoLoadFailureSummarySince,
  getBrandLogoAlertThresholdStatus,
  getBrandLogoHourlyTrend,
  getEquipmentById,
  getEquipmentLocationHistory,
  getEquipmentLocationHistoryEntryById,
  getEquipmentLocationHistoryOperators,
  getMonthlyLocationAuditSummary,
  getLoginAuditLogCount,
  getLoginAuditLogs,
  getLoginAuditHighRiskSummary,
  getLoginActivityAnalytics,
  getDashboardOperationalAlertSummary,
  getWeeklyIdleTimeoutSecuritySummary,
  getAllUsers,
  getOperationLogs,
  getOperationLogCount,
  getLatestOperationLogRetentionRun,
  getOperationLogRetentionSchedule,
  getAuditEventResolutions,
  createAccountActivationCertificateDelivery,
  createFirstLoginSetupChallenge,
  getAccountActivationCertificateExportById,
  getAccountActivationCertificateExportByVerificationToken,
  getAccountActivationCertificateExports,
  getLatestAccountActivationCertificateExportByNumber,
  markAccountActivationCertificateExportDownloaded,
  updateAccountActivationCertificateExportStatus,
  getAccountActivationCertificateDeliveries,
  getAccountActivationCertificateDeliveryById,
  getFirstLoginSetupChallenge,
  createTwoFactorLoginChallenge,
  getTwoFactorLoginChallenge,
  markTwoFactorChallengeVerified,
  getTwoFactorAuthenticator,
  getActiveTwoFactorRecoveryCodes,
  getTwoFactorRecoveryCodeStatus,
  isLoginPinLocked,
  isPinLocked,
  getLoginPinLockTimeRemaining,
  getPinLockTimeRemaining,
  getLoginPinFailureAttempts,
  getPinFailureAttempts,
  recordLoginPinFailure,
  recordPinFailure,
  consumeTwoFactorRecoveryCode,
  resetLoginPinFailureAttempts,
  resetPinFailureAttempts,
  resetLoginFailureAttempts,
  getIpBlacklistEntry,
  listIpBlacklist,
  upsertIpBlacklistEntry,
  setIpBlacklistActive,
  listLoginDevices,
  revokeLoginDevice,
  getLoginDeviceById,
  recordLoginDevice,
  getUserById,
  getUserByUsername,
  getUserLoginSecurityStatuses,
  getUsersWithUnverifiedEmails,
  lockLoginAttempts,
  updateEquipment,
  createEmailVerification,
  getLatestEmailVerification,
  incrementEmailVerificationAttempts,
  completeEmailVerification,
  completeFirstLoginSetup,
  completeFounderPinSetupOnce,
  createOperationLog,
  confirmLoginDeviceAlert,
  createAccountDeduplicationReport,
  createEquipment,
  deactivateDuplicateUserAccount,
  findDuplicateAccounts,
  getAccountDeduplicationSchedule,
  getLatestAccountDeduplicationReport,
  getTodayAccountDeduplicationEmailSummary,
  getSystemAlertEmailDeliveries,
  getSystemAlertEmailDeliveriesForEvent,
  getSystemMaintenanceSettings,
  getSystemModeHistory,
  getLatestSystemRecoveryNotice,
  getPendingLoginDeviceAlerts,
  getPendingLoginDeviceAlertById,
  revokeLoginDeviceAlert,
  updateUserProfile,
  deleteUser,
  deleteEquipment,
  deleteCategory,
  getUserDeletionPreview,
  getEquipmentCategoryDeletionPreview,
  getEquipmentCategoriesWithUsage,
  getEquipmentDeletionPreview,
  deleteFirstLoginSetupChallenge,
  upsertUser,
  createSystemReport,
  createSystemReportAsset,
  deleteSystemReportAsset,
  getSystemReportById,
  getSystemReportAssetById,
  getSystemReportReadStatistics,
  getSystemReports,
  getSystemReportInbox,
  getUnreadSystemReports,
  getBorrowRequests,
  getBorrowRequestById,
  reviewBorrowRequest,
  getUnreadUrgentSystemReportAudiences,
  incrementSystemReportAssetDownloadCount,
  markSystemReportRead,
  publishSystemReport,
  updateSystemReportDraft,
  updateSystemReportPinned,
  updateSystemReportPriority,
  upsertBrandLogoAlertThreshold,
  extendTemporaryPasswordExpiry,
  updateBorrowRequestByFounder,
  upsertAuditEventResolution,
  createEquipmentLocationMovementAlert,
  getMonthlyEquipmentLocationMovementCount,
  updateEquipmentLocationMovementAlertNotification,
  getBorrowReturnReminderHistory,
  getBorrowReturnReminderById,
  markBorrowReturnReminderResent,
  generateUniqueQrCodeId,
  reviewEquipmentLocationHistoryEntry,
  signEquipmentLocationHistoryEntry,
  upsertSystemMaintenanceSettings,
} from "./db";
import { decryptTemporaryPassword, encryptTemporaryPassword } from "./temporaryPasswordVault";
import { encryptActivationCertificateRecipient } from "./activationCertificateRecipientVault";
import { sendAccountActivationCertificate } from "./accountActivationEmail";
import { encryptTwoFactorSecret } from "./twoFactor";
import { storageGetSignedUrl, storagePut } from "./storage";
import bcrypt from "bcryptjs";

// Mock the db module
vi.mock("./db", () => ({
  getAllEquipment: vi.fn().mockResolvedValue([
    {
      id: 1,
      name: "Sony A7 相機",
      categoryId: 1,
      categoryName: "攝影器材",
      description: "全片幅相機",
      totalQuantity: 2,
      availableQuantity: 1,
      status: "available",
      qrCodeId: "QSSHMST0001",
      imageUrl: null,
      serialNumber: "SN001",
      location: "器材室A",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getAllCategories: vi.fn().mockResolvedValue([
    { id: 1, name: "攝影器材", description: null, createdAt: new Date() },
  ]),
  getEquipmentCategoriesWithUsage: vi.fn().mockResolvedValue([
    { id: 1, name: "攝影器材", description: null, createdAt: new Date(), equipmentCount: 0 },
  ]),
  getEquipmentById: vi.fn().mockResolvedValue({
    id: 1,
    name: "Sony A7 相機",
    availableQuantity: 1,
    totalQuantity: 2,
    status: "available",
  }),
  getUserByUsername: vi.fn().mockResolvedValue({ id: 2, username: "security-user", name: "Security User", passwordHash: "hash", isActive: true, isTemporaryPassword: false, role: "admin" }),
  getUserById: vi.fn().mockResolvedValue({ id: 2, isFounder: false }),
  createEquipment: vi.fn().mockResolvedValue(2),
  createBrandLogoLoadFailure: vi.fn().mockResolvedValue(undefined),
  createLoginAuditLog: vi.fn().mockResolvedValue(undefined),
  createEmailVerification: vi.fn().mockResolvedValue(undefined),
  confirmLoginDeviceAlert: vi.fn().mockResolvedValue(true),
  createAccountDeduplicationReport: vi.fn().mockResolvedValue(undefined),
  getLatestEmailVerification: vi.fn().mockResolvedValue(null),
  getAccountDeduplicationSchedule: vi.fn().mockResolvedValue({ id: 1, scheduleCronTaskUid: "fuykNZbgW5nHXhs3hNwqDg", isActive: true, lastRunAt: null, createdAt: new Date(), updatedAt: new Date() }),
  getLatestAccountDeduplicationReport: vi.fn().mockResolvedValue({ id: 1, scheduleId: 1, duplicateGroupCount: 1, reportJson: "{}", createdAt: new Date(), groups: [{ field: "email", value: "duplicate@example.com", users: [{ id: 9, username: "duplicate-user", email: "duplicate@example.com", realName: null, role: "student", isActive: true, isFounder: false, createdAt: new Date(), lastSignedIn: null }, { id: 10, username: "duplicate-user-2", email: "duplicate@example.com", realName: null, role: "student", isActive: true, isFounder: false, createdAt: new Date(), lastSignedIn: null }] }] }),
  getTestAccounts: vi.fn().mockResolvedValue([]),
  deleteTestAccounts: vi.fn().mockResolvedValue([]),
  getTodayAccountDeduplicationEmailSummary: vi.fn().mockResolvedValue({ dateKey: "2026-08-12", hasRunToday: true, duplicateGroupCount: 1, emailStatus: "sent", sent: 1, failed: 0, suppressed: 0, recipients: 1, configuredRecipientCount: 1, activeRecipientCount: 1, inactiveRecipientCount: 0, activeRecipients: [{ id: 1, label: "系統管理", email: "admin@example.com" }], lastDeliveryAt: new Date(), reportCreatedAt: new Date() }),
  incrementEmailVerificationAttempts: vi.fn().mockResolvedValue(undefined),
  completeEmailVerification: vi.fn().mockResolvedValue(undefined),
  createEquipmentLocationHistoryEntry: vi.fn().mockResolvedValue(undefined),
  generateUniqueQrCodeId: vi.fn().mockResolvedValue("QSSHMST0002"),
  getEquipmentLocationHistory: vi.fn().mockResolvedValue([
    {
      id: 1,
      equipmentId: 1,
      previousLocation: "器材室A",
      newLocation: "攝影器材櫃 A-03",
      changedById: 1,
      changedAt: new Date("2026-08-12T08:00:00.000Z"),
      note: "更新器材存放位置",
      changedByName: "Test User",
      changedByUsername: "test-user",
      changedByRealName: null,
    },
  ]),
  getEquipmentLocationHistoryEntryById: vi.fn().mockResolvedValue({ id: 1, equipmentId: 1, previousLocation: "器材室A", newLocation: "攝影器材櫃 A-03", changedById: 3, changedAt: new Date("2026-08-12T08:00:00.000Z"), note: "更新器材存放位置", reviewStatus: "pending", reviewNote: null, reviewedById: null, reviewedAt: null, signatureStatus: "unsigned", signedById: null, signedAt: null, signatureMethod: null }),
  reviewEquipmentLocationHistoryEntry: vi.fn().mockResolvedValue(undefined),
  signEquipmentLocationHistoryEntry: vi.fn().mockResolvedValue(undefined),
  getEquipmentLocationHistoryOperators: vi.fn().mockResolvedValue([
    { changedById: 1, changedByName: "Test User", changedByUsername: "test-user", changedByRealName: null },
  ]),
  getMonthlyLocationAuditSummary: vi.fn().mockResolvedValue({
    month: "2026-08",
    rangeStart: new Date("2026-07-31T16:00:00.000Z"),
    rangeEnd: new Date("2026-08-31T16:00:00.000Z"),
    totalChanges: 3,
    equipmentCount: 2,
    locationCount: 2,
    monthlyTrend: [{ month: "2026-08", label: "2026/08", changes: 3, equipmentCount: 2, locationCount: 2 }],
    equipmentBreakdown: [{ equipmentId: 1, equipmentName: "Sony A7 相機", currentLocation: "器材室A", changes: 2 }],
    locationBreakdown: [{ location: "器材室A", changes: 3, incomingCount: 1, outgoingCount: 2, equipmentCount: 2 }],
    locationMovementAlertThreshold: 5,
    anomalousEquipment: [{ equipmentId: 1, equipmentName: "Sony A7 相機", currentLocation: "器材室A", changes: 5 }],
  }),
  updateEquipment: vi.fn().mockResolvedValue(undefined),
  LOCATION_MOVEMENT_ALERT_THRESHOLD: 5,
  getMonthlyEquipmentLocationMovementCount: vi.fn().mockResolvedValue(0),
  createEquipmentLocationMovementAlert: vi.fn().mockResolvedValue(1),
  updateEquipmentLocationMovementAlertNotification: vi.fn().mockResolvedValue(undefined),
  upsertSystemMaintenanceSettings: vi.fn().mockResolvedValue({ id: 1, maintenanceMode: false, updatedById: 1, updatedAt: new Date() }),
  deleteEquipment: vi.fn().mockResolvedValue(undefined),
  getEquipmentDeletionPreview: vi.fn().mockResolvedValue({ target: { id: 1, name: "Sony A7 相機", serialNumber: "SN001" }, canDelete: true, blockingReasons: [], dependencies: [{ key: "locationChanges", label: "位置異動紀錄", count: 2, effect: "保留作稽核" }], dependentRecordCount: 2 }),
  getEquipmentCategoryDeletionPreview: vi.fn().mockResolvedValue({ target: { id: 1, name: "攝影器材", description: null }, canDelete: true, blockingReasons: [], dependencies: [], dependentRecordCount: 0, assignedEquipment: [] }),
  deactivateDuplicateUserAccount: vi.fn().mockResolvedValue({ user: { id: 9, username: "duplicate-user", email: "duplicate@example.com", isFounder: false, isActive: true }, updated: true }),
  createCategory: vi.fn().mockResolvedValue(undefined),
  deleteCategory: vi.fn().mockResolvedValue(undefined),
  getAllUsers: vi.fn().mockResolvedValue([]),
  getUserDeletionPreview: vi.fn().mockResolvedValue({ target: { id: 2, username: "retired-user", name: "待刪帳號", isFounder: false }, dependencies: [{ key: "operationEntries", label: "操作日誌", count: 3, effect: "刪除" }], dependentRecordCount: 3 }),
  createAccountActivationCertificateDelivery: vi.fn().mockResolvedValue(undefined),
  createAccountActivationCertificateExport: vi.fn().mockResolvedValue(undefined),
  getAccountActivationCertificateDeliveries: vi.fn().mockResolvedValue([]),
  getAccountActivationCertificateDeliveryById: vi.fn().mockResolvedValue(undefined),
  getAccountActivationCertificateExportById: vi.fn().mockResolvedValue(undefined),
  getAccountActivationCertificateExportByVerificationToken: vi.fn().mockResolvedValue({ id: 501, accountId: 91, generatedById: 1, certificateNumber: "QSM-ACT-91-TEST", verificationToken: "default-verification-token", storageKey: "activation-certificates/91/default.pdf", fileName: "清水媒體服務隊-帳號啟用書-91.pdf", source: "preview", downloadCount: 0, firstDownloadedAt: null, lastDownloadedAt: null, status: "valid", statusChangedAt: null, statusReason: null, createdAt: new Date("2026-08-13T00:00:00.000Z") }),
  getAccountActivationCertificateExports: vi.fn().mockResolvedValue([]),
  getLatestAccountActivationCertificateExportByNumber: vi.fn().mockResolvedValue(undefined),
  markAccountActivationCertificateExportDownloaded: vi.fn().mockResolvedValue(undefined),
  updateAccountActivationCertificateExportStatus: vi.fn().mockResolvedValue(true),
  getBrandLogoLoadFailures: vi.fn().mockResolvedValue([]),
  getBrandLogoLoadFailureCount: vi.fn().mockResolvedValue(0),
  getBrandLogoLoadFailureSummarySince: vi.fn().mockResolvedValue({ total: 0, switched: 0, textFallback: 0 }),
  getBrandLogoAlertThresholdStatus: vi.fn().mockResolvedValue({ thresholdCount: 3, isEnabled: true, configured: false, updatedAt: null, updatedById: null }),
  getBrandLogoHourlyTrend: vi.fn().mockResolvedValue({ since: new Date("2026-08-12T00:00:00.000Z"), windowHours: 24, hourly: [] }),
  upsertBrandLogoAlertThreshold: vi.fn().mockResolvedValue(undefined),
  getSystemAlertEmailRecipients: vi.fn().mockResolvedValue([]),
  getSystemAlertEmailDeliveries: vi.fn().mockResolvedValue([]),
  getSystemAlertEmailDeliveriesForEvent: vi.fn().mockResolvedValue([]),
  getSystemMaintenanceSettings: vi.fn().mockResolvedValue(null),
  getSystemModeHistory: vi.fn().mockResolvedValue([]),
  getLatestSystemRecoveryNotice: vi.fn().mockResolvedValue(null),
  createSystemReport: vi.fn().mockResolvedValue(41),
  createSystemReportAsset: vi.fn().mockResolvedValue(73),
  deleteSystemReportAsset: vi.fn().mockResolvedValue(undefined),
  getSystemReportById: vi.fn().mockResolvedValue({ id: 41, title: "維護通知", content: "系統將進行維護", status: "draft", authorId: 1, publishedAt: null, createdAt: new Date(), updatedAt: new Date() }),
  getSystemReportAssetById: vi.fn().mockResolvedValue(undefined),
  getSystemReportReadStatistics: vi.fn().mockResolvedValue([]),
  getSystemReports: vi.fn().mockResolvedValue([]),
  getSystemReportInbox: vi.fn().mockResolvedValue([]),
  getUnreadSystemReports: vi.fn().mockResolvedValue([]),
  getUnreadUrgentSystemReportAudiences: vi.fn().mockResolvedValue([]),
  incrementSystemReportAssetDownloadCount: vi.fn().mockResolvedValue(undefined),
  markSystemReportRead: vi.fn().mockResolvedValue(undefined),
  publishSystemReport: vi.fn().mockResolvedValue(undefined),
  updateSystemReportDraft: vi.fn().mockResolvedValue(undefined),
  updateSystemReportPinned: vi.fn().mockResolvedValue(undefined),
  updateSystemReportPriority: vi.fn().mockResolvedValue(undefined),
  getLatestSystemAlertEmailDelivery: vi.fn().mockResolvedValue(null),
  createSystemAlertEmailDelivery: vi.fn().mockResolvedValue(undefined),
  getLoginAuditLogs: vi.fn().mockResolvedValue([]),
  getLoginAuditLogCount: vi.fn().mockResolvedValue(0),
  getLoginAuditHighRiskSummary: vi.fn().mockResolvedValue({
    period: "24h",
    periodStart: new Date("2026-08-11T00:00:00.000Z"),
    highRiskLoginCount: 2,
    lockedLoginEventCount: 1,
    highRiskOperationCount: 3,
    activeLockedAccountCount: 1,
    totalHighRiskCount: 5,
    lockedEventWarning: { threshold: 3, lockedEventCount: 1, triggered: false },
  }),
  getLoginActivityAnalytics: vi.fn().mockResolvedValue({
    period: "7d",
    periodStart: new Date("2026-08-05T00:00:00.000Z"),
    dailyLogins: [{ date: "2026-08-12", label: "08/12", loginCount: 8, failedCount: 3, failureRate: 37.5 }],
    totalLoginCount: 8,
    failedLoginCount: 3,
    failureRate: 37.5,
    abnormalIps: [{ ipAddress: "198.51.100.14", loginCount: 4, failedCount: 3, highRiskCount: 2, lockedEventCount: 1, failureRate: 75 }],
    lockedEventWarning: { threshold: 3, lockedEventCount: 3, triggered: true },
  }),
  getDashboardOperationalAlertSummary: vi.fn().mockResolvedValue({ month: "2026-08", locationMovementAlertCount: 2, pendingNotificationCount: 1, failedNotificationCount: 0, inProgressAuditEventCount: 3 }),
  getWeeklyIdleTimeoutSecuritySummary: vi.fn().mockResolvedValue({
    period: "7d",
    periodStart: new Date("2026-08-05T00:00:00.000Z"),
    totalIdleTimeoutCount: 3,
    affectedUserCount: 2,
    lastIdleTimeoutAt: new Date("2026-08-12T03:00:00.000Z"),
    dailyIdleTimeouts: [{ date: "2026-08-12", label: "08/12", idleTimeoutCount: 3 }],
  }),
  getOperationLogs: vi.fn().mockResolvedValue([{ id: 21, userId: 1, username: "test-user", action: "changePassword", entityType: "accountSecurity", entityName: "密碼", details: "{}", createdAt: new Date("2026-08-12T01:00:00.000Z") }, { id: 22, userId: 2, username: "other-user", action: "deleteEquipment", entityType: "equipment", entityName: "相機", details: "{}", createdAt: new Date() }]),
  getOperationLogCount: vi.fn().mockResolvedValue(2),
  getOperationLogRetentionSchedule: vi.fn().mockResolvedValue({ id: 5, scheduleCronTaskUid: "retention-task", retentionDays: 365, isActive: true, lastRunAt: new Date("2026-08-12T19:30:00.000Z"), createdAt: new Date(), updatedAt: new Date() }),
  getAuditEventResolutions: vi.fn().mockResolvedValue([]),
  upsertAuditEventResolution: vi.fn().mockResolvedValue({ becameClosed: false, closedAt: null }),
  getLatestOperationLogRetentionRun: vi.fn().mockResolvedValue({ id: 4, scheduleId: 5, cutoffAt: new Date("2025-08-12T19:30:00.000Z"), deletedCount: 23, ranAt: new Date("2026-08-12T19:30:00.000Z") }),
  getPendingLoginDeviceAlerts: vi.fn().mockResolvedValue([{ id: 12, deviceId: "new-device", deviceName: "Safari · iPhone", ipAddress: "198.51.100.5", userAgent: "Safari", createdAt: new Date(), firstSeenAt: new Date(), lastSeenAt: new Date(), revokedAt: null }]),
  getPendingLoginDeviceAlertById: vi.fn().mockResolvedValue({ id: 12, userId: 2, deviceId: "new-device", deviceName: "Safari · iPhone", ipAddress: "198.51.100.5", geoCity: "Tucheng", geoRegion: "New Taipei City", geoCountry: "Taiwan" }),
  getUserLoginSecurityStatuses: vi.fn().mockResolvedValue([
    { userId: 2, attemptCount: 2, lastAttemptAt: new Date(), lockedUntil: null, isLocked: false, remainingSeconds: 0 },
  ]),
  getUsersWithUnverifiedEmails: vi.fn().mockResolvedValue([{ id: 4, username: "unverified-user", email: "pending@example.com", verificationStatus: "unverified", verificationCreatedAt: new Date(), verifiedAt: null }]),
  findDuplicateAccounts: vi.fn().mockResolvedValue([{ field: "email", value: "duplicate@example.com", users: [{ id: 9, username: "duplicate-user", email: "duplicate@example.com", realName: null, role: "student", isActive: true, isFounder: false, createdAt: new Date(), lastSignedIn: null }, { id: 10, username: "duplicate-user-2", email: "duplicate@example.com", realName: null, role: "student", isActive: true, isFounder: false, createdAt: new Date(), lastSignedIn: null }] }]),
  lockLoginAttempts: vi.fn().mockResolvedValue(undefined),
  getIpBlacklistEntry: vi.fn().mockResolvedValue(null),
  listIpBlacklist: vi.fn().mockResolvedValue([{ id: 8, ipAddress: "203.0.113.8", note: "暴力登入", isActive: true, createdById: 1, createdAt: new Date(), updatedAt: new Date() }]),
  upsertIpBlacklistEntry: vi.fn().mockResolvedValue(undefined),
  setIpBlacklistActive: vi.fn().mockResolvedValue(true),
  getLoginDeviceById: vi.fn().mockResolvedValue(null),
  listLoginDevices: vi.fn().mockResolvedValue([{ id: 1, deviceId: "d".repeat(43), userId: 1, deviceName: "Google Chrome · Windows", ipAddress: "203.0.113.9", userAgent: "test", firstSeenAt: new Date(), lastSeenAt: new Date(), revokedAt: null }]),
  countActiveLoginDevices: vi.fn().mockResolvedValue(1),
  recordLoginDevice: vi.fn().mockResolvedValue(undefined),
  revokeLoginDevice: vi.fn().mockResolvedValue(true),
  revokeLoginDeviceAlert: vi.fn().mockResolvedValue(true),
  getTwoFactorAuthenticator: vi.fn().mockResolvedValue(null),
  getActiveTwoFactorRecoveryCodes: vi.fn().mockResolvedValue([]),
  getTwoFactorRecoveryCodeStatus: vi.fn().mockResolvedValue({ availableCount: 0, totalGenerated: 0, lastGeneratedAt: null }),
  createTwoFactorLoginChallenge: vi.fn().mockResolvedValue(undefined),
  createFirstLoginSetupChallenge: vi.fn().mockResolvedValue(undefined),
  getTwoFactorLoginChallenge: vi.fn().mockResolvedValue(null),
  getFirstLoginSetupChallenge: vi.fn().mockResolvedValue(null),
  incrementTwoFactorChallengeAttempts: vi.fn().mockResolvedValue(undefined),
  consumeTwoFactorRecoveryCode: vi.fn().mockResolvedValue(true),
  markTwoFactorChallengeVerified: vi.fn().mockResolvedValue(undefined),
  deleteTwoFactorLoginChallenge: vi.fn().mockResolvedValue(undefined),
  deleteFirstLoginSetupChallenge: vi.fn().mockResolvedValue(undefined),
  isLoginLocked: vi.fn().mockResolvedValue(false),
  resetLoginFailureAttempts: vi.fn().mockResolvedValue(undefined),
  isLoginPinLocked: vi.fn().mockResolvedValue(false),
  getLoginPinLockTimeRemaining: vi.fn().mockResolvedValue(0),
  getLoginPinFailureAttempts: vi.fn().mockResolvedValue({ attemptCount: 0, lockedUntil: null }),
  recordLoginPinFailure: vi.fn().mockResolvedValue(undefined),
  resetLoginPinFailureAttempts: vi.fn().mockResolvedValue(undefined),
  isPinLocked: vi.fn().mockResolvedValue(false),
  getPinLockTimeRemaining: vi.fn().mockResolvedValue(0),
  getPinFailureAttempts: vi.fn().mockResolvedValue({ attemptCount: 0, lockedUntil: null }),
  recordPinFailure: vi.fn().mockResolvedValue(undefined),
  resetPinFailureAttempts: vi.fn().mockResolvedValue(undefined),
  setTwoFactorEnabled: vi.fn().mockResolvedValue(undefined),
  touchTwoFactorAuthenticator: vi.fn().mockResolvedValue(undefined),
  upsertTwoFactorAuthenticator: vi.fn().mockResolvedValue(undefined),
  updateUserRole: vi.fn().mockResolvedValue(undefined),
  updateUserActive: vi.fn().mockResolvedValue(undefined),
  updateUserProfile: vi.fn().mockResolvedValue(undefined),
  completeFirstLoginSetup: vi.fn().mockResolvedValue(undefined),
  completeFounderPinSetupOnce: vi.fn().mockResolvedValue(true),
  deleteUser: vi.fn().mockResolvedValue(undefined),
  extendTemporaryPasswordExpiry: vi.fn().mockResolvedValue(undefined),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getBorrowRequests: vi.fn().mockResolvedValue([]),
  getBorrowRequestById: vi.fn().mockResolvedValue(null),
  createBorrowRequest: vi.fn().mockResolvedValue(1),
  reviewBorrowRequest: vi.fn().mockResolvedValue(undefined),
  updateBorrowRequestByFounder: vi.fn().mockResolvedValue({ synchronizedBorrowRecord: false }),
  cancelBorrowRequest: vi.fn().mockResolvedValue(undefined),
  getBorrowRecords: vi.fn().mockResolvedValue([]),
  getBorrowReturnReminderHistory: vi.fn().mockResolvedValue([]),
  getBorrowReturnReminderById: vi.fn().mockResolvedValue(undefined),
  markBorrowReturnReminderResent: vi.fn().mockResolvedValue(undefined),
  createBorrowRecord: vi.fn().mockResolvedValue(1),
  returnBorrowRecord: vi.fn().mockResolvedValue(undefined),
  updateOverdueRecords: vi.fn().mockResolvedValue(undefined),
  getDashboardStats: vi.fn().mockResolvedValue({
    pending: 3,
    active: 5,
    overdue: 1,
    totalEquipment: 10,
    totalUsers: 20,
  }),
  createOperationLog: vi.fn().mockResolvedValue(1),
}));

const notificationMocks = vi.hoisted(() => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));
vi.mock("./_core/notification", () => ({ notifyOwner: notificationMocks.notifyOwner }));

const systemAlertEmailMocks = vi.hoisted(() => ({ sendSystemAlertEmail: vi.fn().mockResolvedValue({ sent: 0, failed: 0, suppressed: 0 }) }));
vi.mock("./systemAlertEmail", () => ({ sendSystemAlertEmail: systemAlertEmailMocks.sendSystemAlertEmail }));

const contactVerificationMocks = vi.hoisted(() => ({ sendEmailVerificationCode: vi.fn().mockResolvedValue(undefined) }));
vi.mock("./contactVerificationEmail", () => ({ sendEmailVerificationCode: contactVerificationMocks.sendEmailVerificationCode }));

const borrowReminderEmailMocks = vi.hoisted(() => ({ sendBorrowReturnReminder: vi.fn().mockResolvedValue(undefined) }));
vi.mock("./borrowReturnReminderEmail", () => ({ sendBorrowReturnReminder: borrowReminderEmailMocks.sendBorrowReturnReminder }));

vi.mock("./accountActivationEmail", () => ({
  sendAccountActivationCertificate: vi.fn().mockResolvedValue({ certificateNumber: "QSM-ACT-91-TEST" }),
  buildAccountActivationCertificate: vi.fn().mockReturnValue({ certificateNumber: "QSM-ACT-91-TEST", issuedAt: new Date("2026-08-12T00:00:00.000Z"), accountLabel: "activation-student" }),
}));

const activationPdfMocks = vi.hoisted(() => ({ build: vi.fn().mockResolvedValue(Buffer.from("%PDF-1.7\nactivation-preview")) }));
vi.mock("./accountActivationCertificatePdf", () => ({ buildAccountActivationCertificatePdf: activationPdfMocks.build }));
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "system-reports/41/image/maintenance_1234.png", url: "/manus-storage/system-reports/41/image/maintenance_1234.png" }),
  storageGetSignedUrl: vi.fn().mockResolvedValue("https://signed.example.test/activation-certificate.pdf"),
}));

vi.mock("./twoFactor", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./twoFactor")>();
  return { ...actual, verifyTwoFactorCode: vi.fn().mockReturnValue(true) };
});

function createCtx(role: "admin" | "teacher" | "student" = "admin", isFounder = false): TrpcContext {
return {
user: {
id: 1,
      openId: "test-user",
      name: "Test User",
email: "test@example.com",
loginMethod: "manus",
role,
      isFounder,
isActive: true,
studentId: null,
      department: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: { host: "app.example.test" },
      get: (name: string) => name.toLowerCase() === "host" ? "app.example.test" : undefined,
    } as any,
    res: { clearCookie: vi.fn() } as any,
  };
}

describe("equipment router", () => {
  it("list returns equipment array for public access", async () => {
    const caller = appRouter.createCaller(createCtx("student"));
    const result = await caller.equipment.list({});
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]?.qrCodeId).toBe("QSSHMST0001");
  });

  it("categories returns category array", async () => {
    const caller = appRouter.createCaller(createCtx("student"));
    const result = await caller.equipment.categories();
    expect(Array.isArray(result)).toBe(true);
  });

  it("管理員可檢視分類使用量、預覽空分類刪除並留下稽核紀錄", async () => {
    const caller = appRouter.createCaller(createCtx("admin"));
    await expect(caller.equipment.categoryManagementList()).resolves.toEqual([expect.objectContaining({ name: "攝影器材", equipmentCount: 0 })]);
    expect(getEquipmentCategoriesWithUsage).toHaveBeenCalled();
    await expect(caller.equipment.categoryDeletePreview({ id: 1 })).resolves.toEqual(expect.objectContaining({ canDelete: true }));
    await expect(caller.equipment.deleteCategory({ id: 1, confirmed: true })).resolves.toEqual({ success: true });
    expect(deleteCategory).toHaveBeenCalledWith(1);
    expect(createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "deleteEquipmentCategory", entityType: "equipmentCategory" }));
  });

  it("會阻擋使用中的分類刪除，且學生不可管理分類", async () => {
    vi.mocked(getEquipmentCategoryDeletionPreview).mockResolvedValueOnce({ target: { id: 1, name: "攝影器材", description: null }, canDelete: false, blockingReasons: ["此分類仍套用於 1 項器材；請先將器材改為其他分類或未分類後再刪除"], dependencies: [{ key: "assignedEquipment", label: "使用此分類的器材", count: 1, effect: "需先重新分類" }], dependentRecordCount: 1, assignedEquipment: [{ id: 1, name: "Sony A7 相機", serialNumber: "SN001", status: "available" }] } as any);
    const admin = appRouter.createCaller(createCtx("admin"));
    await expect(admin.equipment.deleteCategory({ id: 1, confirmed: true })).rejects.toThrow("此分類仍套用於 1 項器材");
    const student = appRouter.createCaller(createCtx("student"));
    await expect(student.equipment.categoryManagementList()).rejects.toThrow("需要教師或管理員權限");
    await expect(student.equipment.deleteCategory({ id: 1, confirmed: true })).rejects.toThrow("需要管理員權限");
  });

  it("create equipment succeeds for admin", async () => {
    const caller = appRouter.createCaller(createCtx("admin"));
    const result = await caller.equipment.create({
      name: "測試器材",
      categoryId: 1,
      totalQuantity: 1,
      availableQuantity: 1,
      status: "available",
      location: "器材室 A-01",
    });
    expect(result.success).toBe(true);
  });

  it("create equipment succeeds for teacher", async () => {
    const caller = appRouter.createCaller(createCtx("teacher"));
    const result = await caller.equipment.create({
      name: "測試器材",
      categoryId: 1,
      totalQuantity: 1,
      availableQuantity: 1,
      status: "available",
      location: "器材室 A-01",
    });
    expect(result.success).toBe(true);
  });

  it("新增器材可將使用者輸入的掃描 ID 後段交給固定前綴的唯一 ID 產生器", async () => {
    vi.mocked(generateUniqueQrCodeId).mockResolvedValueOnce("QSSHMSTCAM-01");
    const result = await appRouter.createCaller(createCtx("admin")).equipment.create({
      name: "自訂掃描 ID 器材",
      categoryId: 1,
      totalQuantity: 1,
      availableQuantity: 1,
      status: "available",
      location: "器材室 A-01",
      scanIdSuffix: "cam-01",
    });

    expect(generateUniqueQrCodeId).toHaveBeenLastCalledWith("cam-01");
    expect(createEquipment).toHaveBeenLastCalledWith(expect.objectContaining({ qrCodeId: "QSSHMSTCAM-01" }));
    expect(result.qrCodeId).toBe("QSSHMSTCAM-01");
  });

  it("新增器材未輸入掃描 ID 後段時，仍使用系統自動產生的掃描 ID", async () => {
    vi.mocked(generateUniqueQrCodeId).mockResolvedValueOnce("QSSHMST0003");
    const result = await appRouter.createCaller(createCtx("admin")).equipment.create({
      name: "自動掃描 ID 器材",
      categoryId: 1,
      totalQuantity: 1,
      availableQuantity: 1,
      status: "available",
      location: "器材室 A-01",
    });

    expect(generateUniqueQrCodeId).toHaveBeenLastCalledWith(undefined);
    expect(result.qrCodeId).toBe("QSSHMST0003");
  });

  it("建立時設定存放位置會建立初始位置紀錄", async () => {
    const caller = appRouter.createCaller(createCtx("admin"));

    await caller.equipment.create({
      name: "位置紀錄測試器材",
      categoryId: 1,
      totalQuantity: 1,
      availableQuantity: 1,
      status: "available",
      location: "器材室 A-01",
    });

    expect(createEquipmentLocationHistoryEntry).toHaveBeenCalledWith(expect.objectContaining({
      equipmentId: 2,
      previousLocation: null,
      newLocation: "器材室 A-01",
      changedById: 1,
    }));
  });

  it("建立器材時要求分類、狀態、可借數量與存放位置", async () => {
    const caller = appRouter.createCaller(createCtx("admin"));
    const requiredInput = { name: "必填驗證器材", categoryId: 1, totalQuantity: 1, availableQuantity: 1, status: "available" as const, location: "器材室 A-01" };

    const { categoryId: _categoryId, ...withoutCategory } = requiredInput;
    await expect(caller.equipment.create(withoutCategory)).rejects.toThrow();
    const { status: _status, ...withoutStatus } = requiredInput;
    await expect(caller.equipment.create(withoutStatus)).rejects.toThrow();
    const { availableQuantity: _availableQuantity, ...withoutAvailableQuantity } = requiredInput;
    await expect(caller.equipment.create(withoutAvailableQuantity)).rejects.toThrow();
    const { location: _location, ...withoutLocation } = requiredInput;
    await expect(caller.equipment.create(withoutLocation)).rejects.toThrow();
    await expect(caller.equipment.create({ ...requiredInput, availableQuantity: 2 })).rejects.toThrow("可借數量不可超過總數量");
  });

  it("更新存放位置時會記錄原位置、新位置與操作人員", async () => {
    vi.mocked(getEquipmentById).mockResolvedValueOnce({
      id: 1,
      name: "Sony A7 相機",
      location: "器材室A",
      availableQuantity: 1,
      totalQuantity: 2,
      status: "available",
    } as any);
    const caller = appRouter.createCaller(createCtx("teacher"));

    await caller.equipment.update({ id: 1, categoryId: 1, availableQuantity: 1, status: "available", location: "攝影器材櫃 A-03", locationNote: "活動拍攝完畢後歸位" });

    expect(updateEquipment).toHaveBeenCalledWith(1, expect.objectContaining({ location: "攝影器材櫃 A-03" }));
    expect(createEquipmentLocationHistoryEntry).toHaveBeenCalledWith(expect.objectContaining({
      equipmentId: 1,
      previousLocation: "器材室A",
      newLocation: "攝影器材櫃 A-03",
      changedById: 1,
      note: "活動拍攝完畢後歸位",
    }));
  });

  it("更新存放位置但未填寫移轉原因時會拒絕儲存", async () => {
    vi.mocked(getEquipmentById).mockResolvedValueOnce({ id: 1, name: "Sony A7 相機", location: "器材室 A-01" } as any);
    await expect(appRouter.createCaller(createCtx("teacher")).equipment.update({
      id: 1,
      categoryId: 1,
      availableQuantity: 1,
      status: "available",
      location: "攝影器材櫃 A-03",
    })).rejects.toThrow("請填寫移轉原因／自訂備註");
  });

  it("未變更存放位置時無須移轉原因且不建立位置歷程", async () => {
    vi.mocked(getEquipmentById).mockResolvedValueOnce({ id: 1, name: "Sony A7 相機", location: "器材室 A-01" } as any);
    vi.mocked(createEquipmentLocationHistoryEntry).mockClear();

    await appRouter.createCaller(createCtx("teacher")).equipment.update({
      id: 1,
      categoryId: 1,
      availableQuantity: 1,
      status: "maintenance",
      location: "器材室 A-01",
    });

    expect(updateEquipment).toHaveBeenCalledWith(1, expect.objectContaining({ location: "器材室 A-01", status: "maintenance" }));
    expect(createEquipmentLocationHistoryEntry).not.toHaveBeenCalled();
  });

  it("編輯器材時拒絕修改唯讀 ID，且指定欄位必須完整填寫", async () => {
    const caller = appRouter.createCaller(createCtx("teacher"));
    vi.mocked(updateEquipment).mockClear();
    await expect(caller.equipment.update({ id: 1, categoryId: 1, availableQuantity: 1, status: "available", location: "器材室 A-01", locationNote: "例行盤點", scanIdSuffix: "cam-02" })).rejects.toThrow("ID 僅供預覽，無法修改");
    await expect(caller.equipment.update({ id: 1, categoryId: 1, availableQuantity: 1, status: "available", location: "器材室 A-01" } as any)).rejects.toThrow();
    await expect(caller.equipment.update({ id: 1, categoryId: 1, totalQuantity: 1, availableQuantity: 2, status: "available", location: "器材室 A-01" })).rejects.toThrow("可借數量不可超過總數量");
    expect(updateEquipment).not.toHaveBeenCalled();
  });

  it("位置異動達每月五次門檻時會建立單月警示並通知管理者", async () => {
    vi.mocked(getEquipmentById).mockResolvedValueOnce({
      id: 1,
      name: "Sony A7 相機",
      location: "器材室A",
      availableQuantity: 1,
      totalQuantity: 2,
      status: "available",
    } as any);
    vi.mocked(getMonthlyEquipmentLocationMovementCount).mockResolvedValueOnce(5);
    vi.mocked(createEquipmentLocationMovementAlert).mockResolvedValueOnce(44);
    vi.mocked(createEquipmentLocationMovementAlert).mockClear();
    vi.mocked(updateEquipmentLocationMovementAlertNotification).mockClear();
    notificationMocks.notifyOwner.mockClear();
    systemAlertEmailMocks.sendSystemAlertEmail.mockClear();
    systemAlertEmailMocks.sendSystemAlertEmail.mockResolvedValueOnce({ sent: 1, failed: 0, suppressed: 0 });

    await appRouter.createCaller(createCtx("teacher")).equipment.update({ id: 1, categoryId: 1, availableQuantity: 1, status: "available", location: "攝影器材櫃 A-05", locationNote: "活動拍攝完畢後歸位" });

    expect(createEquipmentLocationMovementAlert).toHaveBeenCalledWith(expect.objectContaining({
      equipmentId: 1,
      thresholdCount: 5,
      actualCount: 5,
      triggeredById: 1,
      month: expect.stringMatching(/^\d{4}-\d{2}$/),
    }));
    expect(notificationMocks.notifyOwner).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringContaining("位置異動異常") }));
    expect(systemAlertEmailMocks.sendSystemAlertEmail).toHaveBeenCalledWith(expect.objectContaining({ source: "器材位置異動監測", kind: "alert" }));
    expect(updateEquipmentLocationMovementAlertNotification).toHaveBeenCalledWith(expect.objectContaining({ id: 44, status: "sent" }));
  });

  it("位置異動未達門檻時不會建立警示或寄送管理通知", async () => {
    vi.mocked(getEquipmentById).mockResolvedValueOnce({
      id: 1,
      name: "Sony A7 相機",
      location: "器材室A",
      availableQuantity: 1,
      totalQuantity: 2,
      status: "available",
    } as any);
    vi.mocked(getMonthlyEquipmentLocationMovementCount).mockResolvedValueOnce(4);
    vi.mocked(createEquipmentLocationMovementAlert).mockClear();
    notificationMocks.notifyOwner.mockClear();
    systemAlertEmailMocks.sendSystemAlertEmail.mockClear();

    await appRouter.createCaller(createCtx("teacher")).equipment.update({ id: 1, categoryId: 1, availableQuantity: 1, status: "available", location: "攝影器材櫃 A-06", locationNote: "活動拍攝完畢後歸位" });

    expect(createEquipmentLocationMovementAlert).not.toHaveBeenCalled();
    expect(notificationMocks.notifyOwner).not.toHaveBeenCalled();
    expect(systemAlertEmailMocks.sendSystemAlertEmail).not.toHaveBeenCalled();
  });

  it("教師可依日期和操作人員篩選位置異動紀錄，學生不可取得", async () => {
    const teacherCaller = appRouter.createCaller(createCtx("teacher"));
    const changedAtFrom = new Date("2026-08-01T00:00:00.000Z");
    const changedAtTo = new Date("2026-08-31T23:59:59.999Z");
    const history = await teacherCaller.equipment.getLocationHistory({ equipmentId: 1, changedById: 1, changedAtFrom, changedAtTo });

    expect(getEquipmentLocationHistory).toHaveBeenCalledWith(1, { changedById: 1, changedAtFrom, changedAtTo });
    expect(history[0]).toMatchObject({ previousLocation: "器材室A", newLocation: "攝影器材櫃 A-03" });

    const studentCaller = appRouter.createCaller(createCtx("student"));
    await expect(studentCaller.equipment.getLocationHistory({ equipmentId: 1 })).rejects.toThrow();
  });

  it("管理者可覆核異動後以已登入帳號電子簽核，教師不可操作且簽核後不可改寫", async () => {
    const adminCaller = appRouter.createCaller(createCtx("admin"));
    await expect(adminCaller.equipment.reviewLocationHistory({ historyId: 1, reviewStatus: "approved", reviewNote: "位置異動已核對" })).resolves.toEqual({ success: true });
    expect(reviewEquipmentLocationHistoryEntry).toHaveBeenCalledWith({ id: 1, reviewStatus: "approved", reviewNote: "位置異動已核對", reviewedById: 1 });
    expect(createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "reviewEquipmentLocationHistory", entityType: "equipmentLocationHistory", entityId: 1 }));

    vi.mocked(getEquipmentLocationHistoryEntryById).mockResolvedValueOnce({ id: 1, equipmentId: 1, previousLocation: "器材室A", newLocation: "攝影器材櫃 A-03", changedById: 3, changedAt: new Date(), note: null, reviewStatus: "approved", reviewNote: "位置異動已核對", reviewedById: 1, reviewedAt: new Date(), signatureStatus: "unsigned", signedById: null, signedAt: null, signatureMethod: null } as any);
    await expect(adminCaller.equipment.signLocationHistory({ historyId: 1, confirmation: "電子簽核" })).rejects.toThrow("請輸入目前登入的帳號名稱以確認電子簽核");
    await expect(adminCaller.equipment.signLocationHistory({ historyId: 1, confirmation: "test-user" })).resolves.toEqual({ success: true });
    expect(signEquipmentLocationHistoryEntry).toHaveBeenCalledWith({ id: 1, signedById: 1 });
    expect(createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "signEquipmentLocationHistory", entityType: "equipmentLocationHistory", entityId: 1 }));

    await expect(appRouter.createCaller(createCtx("teacher")).equipment.reviewLocationHistory({ historyId: 1, reviewStatus: "approved" })).rejects.toThrow("需要管理員權限");
    vi.mocked(getEquipmentLocationHistoryEntryById).mockResolvedValueOnce({ id: 1, equipmentId: 1, previousLocation: "器材室A", newLocation: "攝影器材櫃 A-03", changedById: 3, changedAt: new Date(), note: null, reviewStatus: "approved", reviewNote: null, reviewedById: 1, reviewedAt: new Date(), signatureStatus: "signed", signedById: 1, signedAt: new Date(), signatureMethod: "authenticated-session-confirmed" } as any);
    await expect(adminCaller.equipment.reviewLocationHistory({ historyId: 1, reviewStatus: "approved" })).rejects.toThrow("已完成電子簽核");
  });

  it("管理員可批次通過或退回多筆異動，並逐筆保留稽核且保護已簽核紀錄", async () => {
    const adminCaller = appRouter.createCaller(createCtx("admin"));
    vi.mocked(getEquipmentLocationHistoryEntryById)
      .mockResolvedValueOnce({ id: 7, equipmentId: 1, previousLocation: "器材室A", newLocation: "攝影器材櫃 A-07", changedById: 3, changedAt: new Date(), note: null, reviewStatus: "pending", reviewNote: null, reviewedById: null, reviewedAt: null, signatureStatus: "unsigned", signedById: null, signedAt: null, signatureMethod: null } as any)
      .mockResolvedValueOnce({ id: 8, equipmentId: 1, previousLocation: "器材室B", newLocation: "攝影器材櫃 A-08", changedById: 4, changedAt: new Date(), note: "盤點調整", reviewStatus: "pending", reviewNote: null, reviewedById: null, reviewedAt: null, signatureStatus: "unsigned", signedById: null, signedAt: null, signatureMethod: null } as any);

    await expect(adminCaller.equipment.batchReviewLocationHistory({ historyIds: [7, 8], reviewStatus: "approved", reviewNote: "已依盤點結果核對" })).resolves.toEqual({ success: true, reviewedCount: 2 });
    expect(reviewEquipmentLocationHistoryEntry).toHaveBeenCalledWith({ id: 7, reviewStatus: "approved", reviewNote: "已依盤點結果核對", reviewedById: 1 });
    expect(reviewEquipmentLocationHistoryEntry).toHaveBeenCalledWith({ id: 8, reviewStatus: "approved", reviewNote: "已依盤點結果核對", reviewedById: 1 });
    const batchReviewLogs = vi.mocked(createOperationLog).mock.calls
      .map(([entry]) => entry)
      .filter((entry) => entry.action === "batchReviewEquipmentLocationHistory");
    expect(batchReviewLogs).toEqual(expect.arrayContaining([
      expect.objectContaining({ entityType: "equipmentLocationHistory", entityId: 7 }),
      expect.objectContaining({ entityType: "equipmentLocationHistory", entityId: 8 }),
    ]));
    batchReviewLogs.forEach((entry) => {
      expect(JSON.parse(entry.details || "{}")).toMatchObject({ batchSize: 2, batchHistoryIds: [7, 8] });
    });

    await expect(adminCaller.equipment.batchReviewLocationHistory({ historyIds: [7, 8], reviewStatus: "rejected" })).rejects.toThrow("退回異動時必須填寫覆核意見");
    await expect(appRouter.createCaller(createCtx("teacher")).equipment.batchReviewLocationHistory({ historyIds: [7, 8], reviewStatus: "approved" })).rejects.toThrow("需要管理員權限");

    vi.mocked(getEquipmentLocationHistoryEntryById)
      .mockResolvedValueOnce({ id: 7, equipmentId: 1, previousLocation: "器材室A", newLocation: "攝影器材櫃 A-07", changedById: 3, changedAt: new Date(), note: null, reviewStatus: "approved", reviewNote: null, reviewedById: 1, reviewedAt: new Date(), signatureStatus: "signed", signedById: 1, signedAt: new Date(), signatureMethod: "authenticated-session-confirmed" } as any)
      .mockResolvedValueOnce({ id: 8, equipmentId: 1, previousLocation: "器材室B", newLocation: "攝影器材櫃 A-08", changedById: 4, changedAt: new Date(), note: null, reviewStatus: "pending", reviewNote: null, reviewedById: null, reviewedAt: null, signatureStatus: "unsigned", signedById: null, signedAt: null, signatureMethod: null } as any);
    await expect(adminCaller.equipment.batchReviewLocationHistory({ historyIds: [7, 8], reviewStatus: "approved" })).rejects.toThrow("已完成電子簽核");
  });

  it("退回異動必須提供覆核意見，未通過覆核不可電子簽核", async () => {
    const adminCaller = appRouter.createCaller(createCtx("admin"));
    await expect(adminCaller.equipment.reviewLocationHistory({ historyId: 1, reviewStatus: "rejected" })).rejects.toThrow("退回異動時必須填寫覆核意見");
    vi.mocked(getEquipmentLocationHistoryEntryById).mockResolvedValueOnce({ id: 1, equipmentId: 1, previousLocation: "器材室A", newLocation: "攝影器材櫃 A-03", changedById: 3, changedAt: new Date(), note: null, reviewStatus: "rejected", reviewNote: "請補充器材交接說明", reviewedById: 1, reviewedAt: new Date(), signatureStatus: "unsigned", signedById: null, signedAt: null, signatureMethod: null } as any);
    await expect(adminCaller.equipment.signLocationHistory({ historyId: 1, confirmation: "test-user" })).rejects.toThrow("僅已通過覆核的異動紀錄可以電子簽核");
  });

  it("教師可取得該器材的異動操作人員清單", async () => {
    const caller = appRouter.createCaller(createCtx("teacher"));
    const operators = await caller.equipment.getLocationHistoryOperators({ equipmentId: 1 });

    expect(getEquipmentLocationHistoryOperators).toHaveBeenCalledWith(1);
    expect(operators).toEqual([expect.objectContaining({ changedById: 1, changedByName: "Test User" })]);
  });

  it("教師可依月份、器材及位置取得跨維度位置異動稽核彙總，學生不可取得", async () => {
    const input = { month: "2026-08", equipmentId: 1, location: "器材室A" };
    const result = await appRouter.createCaller(createCtx("teacher")).equipment.getMonthlyLocationAuditSummary(input);

    expect(getMonthlyLocationAuditSummary).toHaveBeenCalledWith(input);
    expect(result).toEqual(expect.objectContaining({ totalChanges: 3, equipmentCount: 2, locationCount: 2, locationMovementAlertThreshold: 5 }));
    expect(result.anomalousEquipment).toEqual([expect.objectContaining({ equipmentId: 1, changes: 5 })]);
    await expect(appRouter.createCaller(createCtx("student")).equipment.getMonthlyLocationAuditSummary(input)).rejects.toThrow();
  });

  it("delete equipment forbidden for student", async () => {
    const caller = appRouter.createCaller(createCtx("student"));
    await expect(caller.equipment.delete({ id: 1, confirmed: true })).rejects.toThrow();
  });

  it("delete equipment forbidden for teacher", async () => {
    const caller = appRouter.createCaller(createCtx("teacher"));
    await expect(caller.equipment.delete({ id: 1, confirmed: true })).rejects.toThrow();
  });

  it("delete equipment succeeds for admin", async () => {
    const caller = appRouter.createCaller(createCtx("admin"));
    const result = await caller.equipment.delete({ id: 1, confirmed: true });
    expect(result.success).toBe(true);
    expect(deleteEquipment).toHaveBeenCalledWith(1, 1);
  });

  it("管理者可在器材刪除前取得相依資料預覽，學生不可取得", async () => {
    const result = await appRouter.createCaller(createCtx("admin")).equipment.deletePreview({ id: 1 });
    expect(result).toMatchObject({ canDelete: true, dependentRecordCount: 2 });
    expect(getEquipmentDeletionPreview).toHaveBeenCalledWith(1);
    await expect(appRouter.createCaller(createCtx("student")).equipment.deletePreview({ id: 1 })).rejects.toThrow();
  });
});

describe("users router", () => {
  it("list is forbidden for student", async () => {
    const caller = appRouter.createCaller(createCtx("student"));
    await expect(caller.users.list()).rejects.toThrow();
  });

  it("list is forbidden for teacher", async () => {
    const caller = appRouter.createCaller(createCtx("teacher"));
    await expect(caller.users.list()).rejects.toThrow();
  });

  it("list succeeds for admin", async () => {
    const caller = appRouter.createCaller(createCtx("admin"));
    const result = await caller.users.list();
    expect(Array.isArray(result)).toBe(true);
    expect(createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "viewUserManagement", entityType: "auditView", entityName: "帳號管理清單" }));
  });

  it("測試帳號僅回傳給伺服管理員，且批次處理僅限伺服管理員", async () => {
    const accounts = [
      { id: 81, username: "formal-admin", name: "正式帳號", role: "admin", isFounder: false },
      { id: 82, username: "ui_test_hidden-account", name: "測試帳號", role: "student", isFounder: false },
    ] as any;
    vi.mocked(getAllUsers).mockResolvedValueOnce(accounts).mockResolvedValueOnce(accounts);

    const ordinaryAdminResult = await appRouter.createCaller(createCtx("admin")).users.list();
    expect(ordinaryAdminResult.map((user) => user.id)).toEqual([81]);

    const serverAdminResult = await appRouter.createCaller(createCtx("admin", true)).users.list();
    expect(serverAdminResult.map((user) => user.id)).toEqual([81, 82]);
    await expect(appRouter.createCaller(createCtx("admin")).users.batchSetTestAccountActive({ ids: [82], isActive: false })).rejects.toThrow();
  });

  it("帳號管理清單不會回傳密碼雜湊、PIN 雜湊或臨時密碼密文", async () => {
    vi.mocked(getAllUsers).mockResolvedValueOnce([{
      id: 78,
      username: "safe-list-user",
      name: "安全清單測試",
      role: "student",
      passwordHash: "password-hash-must-not-leak",
      loginPinHash: "login-pin-hash-must-not-leak",
      auditPinHash: "pin-hash-must-not-leak",
      temporaryPasswordCiphertext: "v1.fake-sensitive-ciphertext",
    }] as any);

    const result = await appRouter.createCaller(createCtx("admin")).users.list();

    expect(result[0]).not.toHaveProperty("passwordHash");
    expect(result[0]).not.toHaveProperty("loginPinHash");
    expect(result[0]).not.toHaveProperty("auditPinHash");
    expect(result[0]).not.toHaveProperty("temporaryPasswordCiphertext");
  });

  it("建立帳號時會保存可解密的臨時密碼密文，並自動寄送含帳號資訊的啟用通知信", async () => {
    vi.mocked(getUserByUsername)
      .mockImplementationOnce(async () => undefined)
      .mockImplementationOnce(async (generatedUsername) => ({ id: 81, username: generatedUsername, name: "密文建立測試", role: "student", createdAt: new Date("2026-08-26T00:00:00.000Z") } as any));
    vi.mocked(upsertUser).mockClear();
    vi.mocked(sendAccountActivationCertificate).mockClear();
    vi.mocked(createAccountActivationCertificateDelivery).mockClear();

    const caller = appRouter.createCaller(createCtx("admin"));
    const result = await caller.users.create({
      name: "密文建立測試",
      email: "ciphertext-create@example.com",
      role: "student",
    });

    const storedUser = vi.mocked(upsertUser).mock.calls.at(-1)?.[0];
    expect(storedUser).toEqual(expect.objectContaining({
      username: result.username,
      isTemporaryPassword: true,
      passwordHash: expect.any(String),
      temporaryPasswordCiphertext: expect.any(String),
      temporaryPasswordExpiresAt: expect.any(Date),
    }));
    expect(result.username).toMatch(/^QSSHSTU\d{6}[A-F0-9]{6}$/);
    expect(storedUser?.temporaryPasswordExpiresAt?.getTime()).toBeGreaterThan(Date.now() + 11 * 60 * 60 * 1000);
    expect(storedUser?.temporaryPasswordExpiresAt?.getTime()).toBeLessThanOrEqual(Date.now() + 12 * 60 * 60 * 1000 + 1_000);
    expect(storedUser?.temporaryPasswordCiphertext).not.toContain(result.tempPassword);
    expect(decryptTemporaryPassword(storedUser?.temporaryPasswordCiphertext || "")).toBe(result.tempPassword);
    expect(result.activationEmailSent).toBe(true);
    expect(result.activationCertificateNumber).toBe("QSM-ACT-91-TEST");
    expect(sendAccountActivationCertificate).toHaveBeenCalledWith(expect.objectContaining({
      to: "ciphertext-create@example.com",
      temporaryPassword: result.tempPassword,
      account: expect.objectContaining({ id: 81, username: result.username }),
      assetBaseUrl: "https://app.example.test",
    }));
    expect(createAccountActivationCertificateDelivery).toHaveBeenCalledWith(expect.objectContaining({
      accountId: 81,
      sentById: 1,
      certificateNumber: "QSM-ACT-91-TEST",
      hasPdfAttachment: true,
    }));
  });

  it("重設密碼時會產生新的加密臨時密碼，且 API 不回傳明文", async () => {
    vi.mocked(getUserById).mockResolvedValueOnce({
      id: 82,
      openId: "reset-cipher-user",
      username: "ciphertext-reset-user",
      isFounder: false,
    } as any);
    vi.mocked(upsertUser).mockClear();

    const caller = appRouter.createCaller(createCtx("admin"));
    const result = await caller.users.resetPassword({ id: 82 });

    const storedUser = vi.mocked(upsertUser).mock.calls.at(-1)?.[0];
    expect(storedUser).toEqual(expect.objectContaining({
      openId: "reset-cipher-user",
      username: "ciphertext-reset-user",
      isTemporaryPassword: true,
      passwordHash: expect.any(String),
      temporaryPasswordCiphertext: expect.any(String),
      temporaryPasswordExpiresAt: expect.any(Date),
    }));
    expect(result).toEqual({ success: true, temporaryPasswordGenerated: true });
    expect(result).not.toHaveProperty("tempPassword");
    const generatedTemporaryPassword = decryptTemporaryPassword(storedUser?.temporaryPasswordCiphertext || "");
    expect(generatedTemporaryPassword).toMatch(/^[A-Za-z0-9!@#$%^&*]{8}$/);
  });

  it("管理員可將尚未到期的臨時密碼延長十二小時，並留下稽核與高風險通知", async () => {
    const previousExpiry = new Date(Date.now() + 30 * 60 * 1000);
    vi.mocked(getUserById).mockResolvedValueOnce({
      id: 83,
      username: "expiring-user",
      name: "即將到期使用者",
      isFounder: false,
      isTemporaryPassword: true,
      temporaryPasswordExpiresAt: previousExpiry,
    } as any);
    vi.mocked(extendTemporaryPasswordExpiry).mockClear();
    vi.mocked(createOperationLog).mockClear();
    notificationMocks.notifyOwner.mockClear();
    systemAlertEmailMocks.sendSystemAlertEmail.mockClear();

    const result = await appRouter.createCaller(createCtx("admin")).users.extendTemporaryPasswordExpiry({ id: 83 });

    expect(result.success).toBe(true);
    expect(result.temporaryPasswordExpiresAt.getTime()).toBe(previousExpiry.getTime() + 12 * 60 * 60 * 1000);
    expect(extendTemporaryPasswordExpiry).toHaveBeenCalledWith(83, result.temporaryPasswordExpiresAt);
    expect(createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "extendTemporaryPasswordExpiry", entityType: "user", entityId: 83 }));
    expect(notificationMocks.notifyOwner).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringContaining("臨時密碼效期延長") }));
    expect(systemAlertEmailMocks.sendSystemAlertEmail).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringContaining("臨時密碼效期延長") }));
    notificationMocks.notifyOwner.mockClear();
    systemAlertEmailMocks.sendSystemAlertEmail.mockClear();
  });

  it("已到期的臨時密碼不可透過延長端點恢復，必須改為重設", async () => {
    vi.mocked(getUserById).mockResolvedValueOnce({
      id: 84,
      username: "expired-user",
      isFounder: false,
      isTemporaryPassword: true,
      temporaryPasswordExpiresAt: new Date(Date.now() - 1_000),
    } as any);

    await expect(appRouter.createCaller(createCtx("admin")).users.extendTemporaryPasswordExpiry({ id: 84 })).rejects.toThrow("臨時密碼已到期");
  });

  it("創始管理員通過 PIN 後可查看解密臨時密碼，且稽核紀錄不含密碼內容", async () => {
    const temporaryPassword = "TemporaryPassword789";
    vi.mocked(getUserById).mockResolvedValueOnce({
      id: 2,
      username: "student-01",
      isTemporaryPassword: true,
      temporaryPasswordCiphertext: encryptTemporaryPassword(temporaryPassword),
      temporaryPasswordExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    } as any);
    const founderCtx = createCtx("admin");
    founderCtx.user!.isFounder = true;
    founderCtx.auditPinVerified = true;
    const caller = appRouter.createCaller(founderCtx);

    const result = await caller.users.getTempPassword({ id: 2 });

    expect(result).toEqual({ tempPassword: temporaryPassword, passwordChanged: false });
    expect(createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "viewTemporaryPassword", entityType: "user", entityId: 2 }));
    const auditEntry = vi.mocked(createOperationLog).mock.calls.at(-1)?.[0];
    expect(auditEntry?.details).not.toContain(temporaryPassword);
  });

  it("到期的臨時密碼不會被解密或回傳", async () => {
    vi.mocked(getUserById).mockResolvedValueOnce({
      id: 2,
      username: "student-01",
      isTemporaryPassword: true,
      temporaryPasswordCiphertext: encryptTemporaryPassword("Expired1!"),
      temporaryPasswordExpiresAt: new Date(Date.now() - 1_000),
    } as any);
    const founderCtx = createCtx("admin");
    founderCtx.user!.isFounder = true;
    founderCtx.auditPinVerified = true;

    await expect(appRouter.createCaller(founderCtx).users.getTempPassword({ id: 2 })).resolves.toEqual(expect.objectContaining({
      tempPassword: null,
      passwordChanged: false,
      passwordExpired: true,
    }));
    expect(createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "viewExpiredTemporaryPassword", entityId: 2 }));
  });

  it("未完成 PIN 驗證的創始管理員與一般管理員皆不可查看臨時密碼", async () => {
    const unverifiedFounder = createCtx("admin");
    unverifiedFounder.user!.isFounder = true;
    await expect(appRouter.createCaller(unverifiedFounder).users.getTempPassword({ id: 2 })).rejects.toThrow();

    const adminCaller = appRouter.createCaller(createCtx("admin"));
    await expect(adminCaller.users.getTempPassword({ id: 2 })).rejects.toThrow();
  });

  it("臨時密碼密文已清除時會回傳用戶已更改密碼狀態", async () => {
    vi.mocked(getUserById).mockResolvedValueOnce({ id: 2, username: "student-01", isTemporaryPassword: false, temporaryPasswordCiphertext: null } as any);
    const founderCtx = createCtx("admin");
    founderCtx.user!.isFounder = true;
    founderCtx.auditPinVerified = true;

    await expect(appRouter.createCaller(founderCtx).users.getTempPassword({ id: 2 })).resolves.toEqual({ tempPassword: null, passwordChanged: true });
  });

  it("寄送啟用書時僅在受控伺服器端解密並傳遞臨時密碼", async () => {
    const temporaryPassword = "Activation-Temp-93";
    vi.mocked(getUserById).mockResolvedValueOnce({
      id: 91,
      username: "activation-student",
      name: "啟用書測試帳號",
      role: "student",
      isActive: true,
      isTemporaryPassword: true,
      temporaryPasswordCiphertext: encryptTemporaryPassword(temporaryPassword),
      temporaryPasswordExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date("2026-08-12T00:00:00.000Z"),
    } as any);
    vi.mocked(sendAccountActivationCertificate).mockClear();
    vi.mocked(createOperationLog).mockClear();

    const result = await appRouter.createCaller(createCtx("admin")).users.sendActivationCertificate({ id: 91, recipientEmail: "recipient@example.com" });

    expect(result).toEqual({ success: true, certificateNumber: "QSM-ACT-91-TEST" });
    expect(sendAccountActivationCertificate).toHaveBeenCalledWith(expect.objectContaining({
      to: "recipient@example.com",
      temporaryPassword,
      account: expect.objectContaining({ id: 91, username: "activation-student" }),
      assetBaseUrl: "https://app.example.test",
    }));
    expect(createAccountActivationCertificateDelivery).toHaveBeenCalledWith(expect.objectContaining({
      accountId: 91,
      sentById: 1,
      recipientEmailMasked: expect.stringContaining("@example.com"),
      recipientEmailCiphertext: expect.any(String),
    }));
    const auditEntry = vi.mocked(createOperationLog).mock.calls.at(-1)?.[0];
    expect(auditEntry?.details).toContain('"temporaryPasswordIncluded":true');
    expect(auditEntry?.details).not.toContain(temporaryPassword);
  });

  it("管理者預覽的是伺服器端實際產生、帶有附件狀態的啟用書 PDF", async () => {
    vi.mocked(getUserById).mockResolvedValueOnce({
      id: 91,
      username: "activation-student",
      name: "啟用書測試帳號",
      role: "student",
      isActive: true,
      isTemporaryPassword: true,
      createdAt: new Date("2026-08-12T00:00:00.000Z"),
    } as any);
    activationPdfMocks.build.mockClear();

    const result = await appRouter.createCaller(createCtx("admin")).users.previewActivationCertificate({ id: 91 });

    expect(result).toEqual(expect.objectContaining({
      certificateNumber: "QSM-ACT-91-TEST",
      pdfDataUrl: `data:application/pdf;base64,${Buffer.from("%PDF-1.7\nactivation-preview").toString("base64")}`,
      hasPdfAttachment: true,
    }));
    expect(activationPdfMocks.build).toHaveBeenCalledWith(expect.objectContaining({
      account: expect.objectContaining({ id: 91 }),
      isTemporaryPassword: true,
      assetBaseUrl: "https://app.example.test",
    }));
  });

  it("公開 QR 驗證只回傳文件有效性與文件資訊，不揭露帳號個資", async () => {
    vi.mocked(getAccountActivationCertificateExportByVerificationToken).mockResolvedValueOnce({
      id: 502,
      accountId: 91,
      generatedById: 1,
      certificateNumber: "QSM-ACT-91-TEST",
      verificationToken: "qr-verify-token",
      storageKey: "activation-certificates/91/qr-verify-token.pdf",
      fileName: "清水媒體服務隊-帳號啟用書-91.pdf",
      source: "email_attachment",
      downloadCount: 0,
      firstDownloadedAt: null,
      lastDownloadedAt: null,
      status: "valid",
      statusChangedAt: null,
      statusReason: null,
      createdAt: new Date("2026-08-13T00:00:00.000Z"),
    } as any);

    const result = await appRouter.createCaller(createCtx("student")).activationCertificates.verify({ code: "qr-verify-token" });

    expect(result).toEqual({ isValid: true, status: "valid", certificateNumber: "QSM-ACT-91-TEST", issuedAt: new Date("2026-08-13T00:00:00.000Z"), documentType: "帳號啟用書" });
    expect(result).not.toHaveProperty("accountId");
    expect(result).not.toHaveProperty("storageKey");
  });

  it("公開驗證會顯示撤銷狀態與原因，但不回傳帳號或儲存資訊", async () => {
    vi.mocked(getAccountActivationCertificateExportByVerificationToken).mockResolvedValueOnce({
      id: 504, accountId: 91, generatedById: 1, certificateNumber: "QSM-ACT-91-REVOKED", verificationToken: "revoked-token", storageKey: "activation-certificates/91/revoked.pdf", fileName: "清水媒體服務隊-帳號啟用書-91.pdf", source: "manual_download", downloadCount: 0, firstDownloadedAt: null, lastDownloadedAt: null, status: "revoked", statusReason: "資料誤植，重新發行", statusChangedAt: new Date("2026-08-13T02:00:00.000Z"), createdAt: new Date("2026-08-13T00:00:00.000Z"),
    } as any);
    const result = await appRouter.createCaller(createCtx("student")).activationCertificates.verify({ code: "revoked-token" });
    expect(result).toMatchObject({ isValid: false, status: "revoked", certificateNumber: "QSM-ACT-91-REVOKED", reason: "資料誤植，重新發行" });
    expect(result).not.toHaveProperty("accountId");
    expect(result).not.toHaveProperty("storageKey");
  });

  it("創始管理員撤銷啟用書時會保存具體原因並留下稽核紀錄", async () => {
    vi.mocked(getAccountActivationCertificateExportById).mockResolvedValueOnce({ id: 505, accountId: 91, generatedById: 1, certificateNumber: "QSM-ACT-91-TEST", verificationToken: "status-token", storageKey: "activation-certificates/91/status.pdf", fileName: "清水媒體服務隊-帳號啟用書-91.pdf", source: "manual_download", downloadCount: 0, firstDownloadedAt: null, lastDownloadedAt: null, status: "valid", statusReason: null, statusChangedAt: null, createdAt: new Date() } as any);
    const result = await appRouter.createCaller(createCtx("admin", true)).activationCertificates.changeStatus({ id: 505, status: "revoked", reason: "核發資料誤植，重新開立" });
    expect(result).toEqual({ success: true });
    expect(updateAccountActivationCertificateExportStatus).toHaveBeenCalledWith(expect.objectContaining({ id: 505, status: "revoked", reason: "核發資料誤植，重新開立" }));
    expect(createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "revokeAccountActivationCertificate", entityId: 505 }));
  });

  it("創始管理員下載既有啟用書時會建立短期連結並更新下載狀態", async () => {
    vi.mocked(getAccountActivationCertificateExportById).mockResolvedValueOnce({
      id: 503,
      accountId: 91,
      generatedById: 1,
      certificateNumber: "QSM-ACT-91-TEST",
      verificationToken: "download-token",
      storageKey: "activation-certificates/91/download-token.pdf",
      fileName: "清水媒體服務隊-帳號啟用書-91.pdf",
      source: "manual_download",
      downloadCount: 2,
      firstDownloadedAt: new Date("2026-08-13T00:00:00.000Z"),
      lastDownloadedAt: new Date("2026-08-13T01:00:00.000Z"),
      createdAt: new Date("2026-08-13T00:00:00.000Z"),
    } as any);

    const result = await appRouter.createCaller(createCtx("admin", true)).activationCertificates.getDownload({ id: 503 });

    expect(result).toEqual({ exportId: 503, fileName: "清水媒體服務隊-帳號啟用書-91.pdf", downloadUrl: "https://signed.example.test/activation-certificate.pdf" });
    expect(markAccountActivationCertificateExportDownloaded).toHaveBeenCalledWith(503);
    expect(storageGetSignedUrl).toHaveBeenCalledWith("activation-certificates/91/download-token.pdf");
  });

  it("非管理員不可產生啟用書 PDF 預覽", async () => {
    activationPdfMocks.build.mockClear();
    await expect(appRouter.createCaller(createCtx("teacher")).users.previewActivationCertificate({ id: 91 })).rejects.toThrow("需要管理員權限");
    expect(activationPdfMocks.build).not.toHaveBeenCalled();
  });

  it("非管理員不可寄送帳號啟用書或觸發 PDF 附件建立", async () => {
    vi.mocked(sendAccountActivationCertificate).mockClear();

    await expect(
      appRouter.createCaller(createCtx("teacher")).users.sendActivationCertificate({ id: 91, recipientEmail: "recipient@example.com" })
    ).rejects.toThrow("需要管理員權限");

    expect(sendAccountActivationCertificate).not.toHaveBeenCalled();
  });

  it("啟用書歷程僅回傳遮罩收件信箱，不會洩露加密收件地址", async () => {
    vi.mocked(getUserById).mockResolvedValueOnce({ id: 91, username: "activation-student", name: "啟用書測試帳號" } as any);
    vi.mocked(getAccountActivationCertificateDeliveries).mockResolvedValueOnce([{
      id: 51,
      accountId: 91,
      sentById: 1,
      recipientEmailMasked: "re*****@example.com",
      recipientEmailCiphertext: encryptActivationCertificateRecipient("recipient@example.com"),
      certificateNumber: "QSM-ACT-91-TEST",
      hasPdfAttachment: true,
      sentAt: new Date(),
    }] as any);

    const result = await appRouter.createCaller(createCtx("admin")).users.activationCertificateHistory({ id: 91 });

    expect(result).toEqual([expect.objectContaining({ id: 51, recipientEmailMasked: "re*****@example.com", hasPdfAttachment: true })]);
    expect(result[0]).not.toHaveProperty("recipientEmailCiphertext");
  });

  it("再次寄送會僅在後端解密收件地址，並建立新的遮罩歷程", async () => {
    const recipientEmail = "recipient@example.com";
    vi.mocked(getAccountActivationCertificateDeliveryById).mockResolvedValueOnce({
      id: 51,
      accountId: 91,
      sentById: 1,
      recipientEmailMasked: "re*****@example.com",
      recipientEmailCiphertext: encryptActivationCertificateRecipient(recipientEmail),
      certificateNumber: "QSM-ACT-91-OLD",
      sentAt: new Date(),
    } as any);
    vi.mocked(getUserById).mockResolvedValueOnce({
      id: 91,
      username: "activation-student",
      name: "啟用書測試帳號",
      role: "student",
      isActive: true,
      isTemporaryPassword: false,
      temporaryPasswordCiphertext: null,
      createdAt: new Date(),
    } as any);
    vi.mocked(sendAccountActivationCertificate).mockClear();
    vi.mocked(createAccountActivationCertificateDelivery).mockClear();

    const result = await appRouter.createCaller(createCtx("admin")).users.resendActivationCertificate({ deliveryId: 51 });

    expect(result).toEqual({ success: true, certificateNumber: "QSM-ACT-91-TEST", recipientEmail: "re*****@example.com" });
    expect(sendAccountActivationCertificate).toHaveBeenCalledWith(expect.objectContaining({
      to: recipientEmail,
      temporaryPassword: null,
      assetBaseUrl: "https://app.example.test",
    }));
    expect(createAccountActivationCertificateDelivery).toHaveBeenCalledWith(expect.objectContaining({
      accountId: 91,
      recipientEmailMasked: "re*****@example.com",
      recipientEmailCiphertext: expect.any(String),
    }));
  });

  it("非管理員不可重寄帳號啟用書或觸發 PDF 附件建立", async () => {
    vi.mocked(sendAccountActivationCertificate).mockClear();

    await expect(
      appRouter.createCaller(createCtx("teacher")).users.resendActivationCertificate({ deliveryId: 51 })
    ).rejects.toThrow("需要管理員權限");

    expect(sendAccountActivationCertificate).not.toHaveBeenCalled();
  });

  it("updateRole succeeds for admin", async () => {
    const caller = appRouter.createCaller(createCtx("admin"));
    const result = await caller.users.updateRole({ id: 2, role: "teacher" });
    expect(result.success).toBe(true);
  });

  it("帳號角色、個人資料與刪除操作會留下可追溯且不暴露個資原文的稽核紀錄", async () => {
    vi.mocked(createOperationLog).mockClear();
    const caller = appRouter.createCaller(createCtx("admin"));

    vi.mocked(getUserById).mockResolvedValueOnce({ id: 2, username: "student-01", email: "student@example.com", realName: "學生甲", role: "student", isActive: true, isFounder: false } as any);
    await caller.users.updateRole({ id: 2, role: "teacher" });

    vi.mocked(getUserById).mockResolvedValueOnce({ id: 1, username: "test-user", email: "before@example.com", realName: "測試管理員", phone: "0912345678", department: "媒服", role: "admin", isActive: true, isFounder: false } as any);
    await caller.profile.updateProfile({ email: "after@example.com", phone: "0987654321" });
    expect(updateUserProfile).toHaveBeenCalledWith(1, { email: "after@example.com", phone: "0987654321" });

    vi.mocked(getUserById).mockResolvedValueOnce({ id: 3, username: "retired-user", email: "retired@example.com", realName: "待刪帳號", role: "student", isActive: false, isFounder: false } as any);
    await caller.users.delete({ id: 3, confirmed: true });
    expect(deleteUser).toHaveBeenCalledWith(3);

    const entries = vi.mocked(createOperationLog).mock.calls.map(([entry]) => entry);
    expect(entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: "update", entityType: "user", entityId: 2, details: JSON.stringify({ changedFields: ["role"], previousRole: "student", newRole: "teacher" }) }),
      expect.objectContaining({ action: "updateProfile", entityType: "user", entityId: 1 }),
      expect.objectContaining({ action: "delete", entityType: "user", entityId: 3 }),
    ]));
    const profileLog = entries.find((entry) => entry.action === "updateProfile");
    expect(profileLog?.details).toContain("changedFields");
    expect(profileLog?.details).not.toContain("after@example.com");
    expect(profileLog?.details).not.toContain("0987654321");
    const deleteLog = entries.find((entry) => entry.action === "delete");
    expect(deleteLog?.details).toContain("retired@example.com");
  });

  it("admin 可取得所有帳號的登入失敗與鎖定狀態", async () => {
    const caller = appRouter.createCaller(createCtx("admin"));
    const result = await caller.users.loginSecurityStatus();

    expect(getUserLoginSecurityStatuses).toHaveBeenCalledTimes(1);
    expect(result).toEqual([expect.objectContaining({ userId: 2, attemptCount: 2, remainingSeconds: 0 })]);
    expect(createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "viewUserLoginSecurity", entityType: "auditView" }));
  });

  it("已通過 PIN 的創始管理員可查看帳號完整管理資料，但不會取得任何憑證欄位", async () => {
    const founderCtx = createCtx("admin");
    founderCtx.user!.isFounder = true;
    founderCtx.auditPinVerified = true;
    vi.mocked(getUserById).mockResolvedValueOnce({
      id: 42, username: "detail-user", name: "詳細使用者", realName: "詳細使用者", email: "detail@example.com", phone: "0912345678", role: "student", isActive: true, isFounder: false, studentId: "113001", department: "媒服", loginMethod: "custom", isTemporaryPassword: true, temporaryPasswordExpiresAt: new Date("2026-08-15T08:00:00.000Z"), createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), passwordChangedAt: new Date(), passwordReminderSentAt: null, passwordHash: "hashed-password", auditPinHash: "hashed-pin", temporaryPasswordCiphertext: "encrypted-temp", openId: "external-open-id",
    } as any);
    vi.mocked(getUserLoginSecurityStatuses).mockResolvedValueOnce([{ userId: 42, attemptCount: 2, lastAttemptAt: new Date(), lockedUntil: null, isLocked: false, remainingSeconds: 0 }]);

    const result = await appRouter.createCaller(founderCtx).users.founderAccountDetails({ id: 42 });

    expect(result).toMatchObject({ id: 42, username: "detail-user", email: "detail@example.com", loginSecurity: { attemptCount: 2, isLocked: false } });
    expect(result).not.toHaveProperty("passwordHash");
    expect(result).not.toHaveProperty("auditPinHash");
    expect(result).not.toHaveProperty("temporaryPasswordCiphertext");
    expect(result).not.toHaveProperty("openId");
    expect(createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "viewFounderAccountDetails", entityType: "auditView", entityId: 42 }));

    const nonFounderCtx = createCtx("admin");
    nonFounderCtx.auditPinVerified = true;
    await expect(appRouter.createCaller(nonFounderCtx).users.founderAccountDetails({ id: 42 })).rejects.toThrow();
  });

  it("帳號與器材刪除失敗時回傳可操作訊息，並保留資料不寫入成功稽核", async () => {
    vi.mocked(getUserById).mockResolvedValueOnce({ id: 43, username: "blocked-user", isFounder: false } as any);
    vi.mocked(deleteUser).mockRejectedValueOnce(new Error("FOREIGN_KEY_CONSTRAINT"));
    await expect(appRouter.createCaller(createCtx("admin")).users.delete({ id: 43, confirmed: true })).rejects.toThrow("帳號相關資料目前無法完整清理");

    vi.mocked(getEquipmentById).mockResolvedValueOnce({ id: 51, name: "借出中相機" } as any);
    vi.mocked(deleteEquipment).mockRejectedValueOnce(new Error("EQUIPMENT_HAS_ACTIVE_BORROW"));
    await expect(appRouter.createCaller(createCtx("admin")).equipment.delete({ id: 51, confirmed: true })).rejects.toThrow("仍有借出中或逾期記錄");
  });

  it("只有已驗證 PIN 的創始管理員可手動鎖定非創始帳號", async () => {
    const founderCtx = createCtx("admin");
    founderCtx.user!.isFounder = true;
    vi.mocked(getUserById)
      .mockResolvedValueOnce({ id: 1, isFounder: true } as any)
      .mockResolvedValueOnce({ id: 2, isFounder: false, username: "student-01" } as any);

    const result = await appRouter.createCaller(founderCtx).users.lockLoginAttempts({ id: 2 });

    expect(result).toEqual({ success: true });
    expect(lockLoginAttempts).toHaveBeenCalledWith(2);
  });
});

describe("borrow request audit logging", () => {
  it("建立借用申請時必須提供非空白的借用用途", async () => {
    const caller = appRouter.createCaller(createCtx("student"));

    await expect(caller.borrowRequests.create({
      equipmentId: 1,
      quantity: 1,
      borrowDate: new Date("2026-08-20T08:00:00.000Z"),
      returnDate: new Date("2026-08-21T08:00:00.000Z"),
      purpose: "   ",
    })).rejects.toThrow("請填寫借用用途");
  });

  it("拒絕借用申請時必須提供非空白的拒絕原因", async () => {
    const caller = appRouter.createCaller(createCtx("teacher"));

    await expect(caller.borrowRequests.review({ id: 1, status: "rejected" })).rejects.toThrow("請填寫拒絕原因");
    await expect(caller.borrowRequests.review({ id: 1, status: "rejected", reviewNote: "   " })).rejects.toThrow("請填寫拒絕原因");
    expect(reviewBorrowRequest).not.toHaveBeenCalled();

    vi.mocked(getBorrowRequestById).mockResolvedValueOnce({ id: 1, equipmentId: 1, requesterId: 2, status: "pending" } as any);
    await expect(caller.borrowRequests.review({ id: 1, status: "rejected", reviewNote: "時段衝突" })).resolves.toEqual({ success: true });
    expect(reviewBorrowRequest).toHaveBeenCalledWith(1, 1, "rejected", "時段衝突");
  });

  it("教師查看借用申請管理清單會保留篩選條件與結果數量", async () => {
    const caller = appRouter.createCaller(createCtx("teacher"));

    const result = await caller.borrowRequests.list({ status: "pending", equipmentId: 1 });

    expect(result).toEqual([]);
    expect(getBorrowRequests).toHaveBeenCalledWith({ status: "pending", equipmentId: 1 });
    expect(createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "viewBorrowRequests", entityType: "auditView", entityName: "借用申請管理清單" }));
    const auditEntry = vi.mocked(createOperationLog).mock.calls.at(-1)?.[0];
    expect(auditEntry?.details).toContain("pending");
    expect(auditEntry?.details).toContain("resultCount");
  });

  it("僅創始管理員可手動修改借用申請，並保留前後差異及同步結果稽核", async () => {
    const founderCtx = createCtx("admin");
    founderCtx.user!.isFounder = true;
    vi.mocked(getBorrowRequestById).mockResolvedValueOnce({
      id: 73,
      equipmentId: 1,
      requesterId: 9,
      quantity: 1,
      borrowDate: new Date("2026-08-20T08:00:00.000Z"),
      returnDate: new Date("2026-08-21T08:00:00.000Z"),
      purpose: "原始用途",
      status: "approved",
      reviewerId: 2,
      reviewNote: null,
      reviewedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    vi.mocked(updateBorrowRequestByFounder).mockResolvedValueOnce({ synchronizedBorrowRecord: true });

    await expect(appRouter.createCaller(founderCtx).borrowRequests.founderUpdate({
      id: 73,
      quantity: 2,
      borrowDate: new Date("2026-08-20T09:00:00.000Z"),
      returnDate: new Date("2026-08-22T09:00:00.000Z"),
      purpose: "調整後用途",
      reason: "更正拍攝排程",
    })).resolves.toEqual({ success: true, synchronizedBorrowRecord: true });

    expect(updateBorrowRequestByFounder).toHaveBeenCalledWith(73, expect.objectContaining({
      quantity: 2,
      borrowDate: new Date("2026-08-19T16:00:00.000Z"),
      returnDate: new Date("2026-08-22T15:59:00.000Z"),
      purpose: "調整後用途",
    }));
    expect(createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "founderUpdateBorrowRequest", entityType: "borrowRequest", entityId: 73 }));
    const entry = vi.mocked(createOperationLog).mock.calls.at(-1)?.[0];
    expect(entry?.details).toContain("更正拍攝排程");
    expect(entry?.details).toContain("synchronizedBorrowRecord");
  });

  it("伺服器管理員可不填修改說明而儲存申請調整", async () => {
    const founderCtx = createCtx("admin");
    founderCtx.user!.isFounder = true;
    vi.mocked(getBorrowRequestById).mockResolvedValueOnce({
      id: 74,
      equipmentId: 1,
      requesterId: 9,
      quantity: 1,
      borrowDate: new Date("2026-08-20T08:00:00.000Z"),
      returnDate: new Date("2026-08-21T08:00:00.000Z"),
      purpose: "原始用途",
      status: "pending",
      reviewerId: null,
      reviewNote: null,
      reviewedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    vi.mocked(updateBorrowRequestByFounder).mockResolvedValueOnce({ synchronizedBorrowRecord: false });

    await expect(appRouter.createCaller(founderCtx).borrowRequests.founderUpdate({
      id: 74,
      quantity: 1,
      borrowDate: new Date("2026-08-20T09:00:00.000Z"),
      returnDate: new Date("2026-08-21T09:00:00.000Z"),
      purpose: "調整後用途",
    })).resolves.toEqual({ success: true, synchronizedBorrowRecord: false });

    expect(updateBorrowRequestByFounder).toHaveBeenCalledWith(74, expect.objectContaining({
      borrowDate: new Date("2026-08-19T16:00:00.000Z"),
      returnDate: new Date("2026-08-21T15:59:00.000Z"),
    }));
    const entry = vi.mocked(createOperationLog).mock.calls.at(-1)?.[0];
    expect(entry?.details).toContain('"reason":null');
  });

  it("伺服器管理員修改申請時要求數量、借用時間、歸還時間與用途", async () => {
    const founderCtx = createCtx("admin");
    founderCtx.user!.isFounder = true;
    const caller = appRouter.createCaller(founderCtx);
    vi.mocked(updateBorrowRequestByFounder).mockClear();
    const commonInput = { id: 73, quantity: 1, borrowDate: new Date("2026-08-20T09:00:00.000Z"), returnDate: new Date("2026-08-22T09:00:00.000Z"), purpose: "用途", reason: "調整申請內容" };

    await expect(caller.borrowRequests.founderUpdate({ ...commonInput, quantity: 0 })).rejects.toThrow("請選擇申請數量");
    await expect(caller.borrowRequests.founderUpdate({ ...commonInput, borrowDate: undefined as any })).rejects.toThrow("請填寫借用時間");
    await expect(caller.borrowRequests.founderUpdate({ ...commonInput, returnDate: undefined as any })).rejects.toThrow("請填寫歸還時間");
    await expect(caller.borrowRequests.founderUpdate({ ...commonInput, purpose: "   " })).rejects.toThrow("請填寫用途");
    expect(updateBorrowRequestByFounder).not.toHaveBeenCalled();
  });

  it("一般管理員不可手動修改已送出的借用申請", async () => {
    await expect(appRouter.createCaller(createCtx("admin")).borrowRequests.founderUpdate({
      id: 73,
      quantity: 1,
      borrowDate: new Date("2026-08-20T09:00:00.000Z"),
      returnDate: new Date("2026-08-22T09:00:00.000Z"),
      purpose: "用途",
      reason: "測試",
    })).rejects.toThrow("僅創始管理員");
  });

  it("閒置逾時登出會清除工作階段並保留可於稽核中心檢視的操作紀錄", async () => {
    const ctx = createCtx("admin");

    await expect(appRouter.createCaller(ctx).auth.logout({ reason: "idle" })).resolves.toEqual({ success: true });

    expect(ctx.res.clearCookie).toHaveBeenCalledTimes(1);
    expect(createOperationLog).toHaveBeenCalledWith(expect.objectContaining({
      action: "idleTimeoutLogout",
      entityType: "authSession",
      entityId: ctx.user!.id,
      entityName: "工作階段閒置逾時登出",
    }));
  });
});

describe("borrow return reminder management", () => {
  it("管理員可查看提醒歷程，學生不可查看", async () => {
    vi.mocked(getBorrowReturnReminderHistory).mockResolvedValueOnce([{
      id: 81,
      borrowRecordId: 7,
      reminderType: "overdue",
      emailStatus: "sent",
      resendCount: 1,
    }] as any);

    const result = await appRouter.createCaller(createCtx("admin")).borrowRecords.reminderHistory({ limit: 50 });

    expect(getBorrowReturnReminderHistory).toHaveBeenCalledWith(50);
    expect(result).toEqual([expect.objectContaining({ id: 81, emailStatus: "sent", resendCount: 1 })]);
    await expect(appRouter.createCaller(createCtx("student")).borrowRecords.reminderHistory()).rejects.toThrow();
  });

  it("管理員可一鍵重送進行中借用的提醒並留下重送與稽核紀錄", async () => {
    vi.mocked(getBorrowReturnReminderById).mockResolvedValueOnce({
      id: 82,
      borrowRecordId: 8,
      borrowerId: 9,
      borrowerEmail: "borrower@example.com",
      borrowerName: "借用測試者",
      borrowerUsername: "borrower-test",
      equipmentName: "Sony A7 相機",
      expectedReturnAt: new Date("2026-08-20T08:00:00.000Z"),
      reminderType: "due_soon",
      resendCount: 0,
      borrowStatus: "active",
    } as any);
    vi.mocked(markBorrowReturnReminderResent).mockClear();
    borrowReminderEmailMocks.sendBorrowReturnReminder.mockClear();
    vi.mocked(createOperationLog).mockClear();

    await expect(appRouter.createCaller(createCtx("admin")).borrowRecords.resendReminder({ id: 82 })).resolves.toEqual({ success: true });

    expect(borrowReminderEmailMocks.sendBorrowReturnReminder).toHaveBeenCalledWith(expect.objectContaining({
      to: "borrower@example.com",
      equipmentName: "Sony A7 相機",
      dashboardUrl: "https://app.example.test/dashboard",
    }));
    expect(markBorrowReturnReminderResent).toHaveBeenCalledWith({ id: 82, resentById: 1, status: "sent" });
    expect(createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "resendBorrowReturnReminder", entityType: "borrowReturnReminder", entityId: 82 }));
  });

  it("已歸還器材的提醒不可重送", async () => {
    vi.mocked(getBorrowReturnReminderById).mockResolvedValueOnce({
      id: 83,
      borrowerEmail: "borrower@example.com",
      borrowStatus: "returned",
    } as any);
    borrowReminderEmailMocks.sendBorrowReturnReminder.mockClear();

    await expect(appRouter.createCaller(createCtx("admin")).borrowRecords.resendReminder({ id: 83 })).rejects.toThrow("器材已歸還");
    expect(borrowReminderEmailMocks.sendBorrowReturnReminder).not.toHaveBeenCalled();
  });
});

describe("dashboard router", () => {
  it("stats returns data for admin", async () => {
    const caller = appRouter.createCaller(createCtx("admin"));
    const result = await caller.dashboard.stats();
    expect(result).toHaveProperty("pending");
    expect(result).toHaveProperty("active");
    expect(result).toHaveProperty("overdue");
  });

  it("stats returns data for teacher", async () => {
    const caller = appRouter.createCaller(createCtx("teacher"));
    const result = await caller.dashboard.stats();
    expect(result).toHaveProperty("pending");
  });

  it("管理者可取得七日登入趨勢、異常 IP 與鎖定事件警告，學生不可取得", async () => {
    const adminCaller = appRouter.createCaller(createCtx("admin"));
    const result = await adminCaller.dashboard.loginActivity({ period: "7d" });

    expect(getLoginActivityAnalytics).toHaveBeenCalledWith("7d");
    expect(result).toMatchObject({ period: "7d", failureRate: 37.5, lockedEventWarning: { threshold: 3, triggered: true } });
    expect(result.abnormalIps[0]).toMatchObject({ ipAddress: "198.51.100.14", failedCount: 3 });

    const studentCaller = appRouter.createCaller(createCtx("student"));
    await expect(studentCaller.dashboard.loginActivity({ period: "7d" })).rejects.toThrow();
  });

  it("管理者可取得每週閒置逾時安全摘要，學生不可取得", async () => {
    const result = await appRouter.createCaller(createCtx("admin")).dashboard.weeklyIdleTimeoutSecurity();

    expect(getWeeklyIdleTimeoutSecuritySummary).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ period: "7d", totalIdleTimeoutCount: 3, affectedUserCount: 2 });
    await expect(appRouter.createCaller(createCtx("student")).dashboard.weeklyIdleTimeoutSecurity()).rejects.toThrow();
  });

  it("管理者可取得尚未完成電子郵件驗證帳號，學生不可取得", async () => {
    const result = await appRouter.createCaller(createCtx("admin")).dashboard.unverifiedEmailUsers();
    expect(getUsersWithUnverifiedEmails).toHaveBeenCalledTimes(1);
    expect(result).toEqual([expect.objectContaining({ username: "unverified-user", verificationStatus: "unverified" })]);

    await expect(appRouter.createCaller(createCtx("student")).dashboard.unverifiedEmailUsers()).rejects.toThrow();
  });
});

describe("auth router", () => {
  it("logout clears cookie and returns success", async () => {
    const ctx = createCtx("admin");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });

  it("me returns null for unauthenticated user", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: vi.fn() } as any,
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

describe("profile email verification", () => {
  it("會回傳目前電子郵件的未驗證狀態，寄送驗證碼並在驗證成功後記錄完成狀態", async () => {
    vi.mocked(getUserById).mockResolvedValue({ id: 1, username: "test-user", email: "test@example.com" } as any);
    vi.mocked(getLatestEmailVerification).mockResolvedValueOnce(null);
    const caller = appRouter.createCaller(createCtx("student"));

    const initialStatus = await caller.profile.emailVerificationStatus();
    expect(initialStatus).toMatchObject({ email: "test@example.com", verified: false, pending: false, remainingAttempts: 5 });

    await caller.profile.sendEmailVerification();
    expect(contactVerificationMocks.sendEmailVerificationCode).toHaveBeenCalledWith(expect.objectContaining({ to: "test@example.com", expiresInMinutes: 10, code: expect.stringMatching(/^\d{6}$/) }));
    expect(createEmailVerification).toHaveBeenCalledWith(expect.objectContaining({ userId: 1, email: "test@example.com", verificationCode: expect.stringMatching(/^\d{6}$/) }));

    vi.mocked(getLatestEmailVerification).mockResolvedValueOnce({ id: 7, userId: 1, email: "test@example.com", verificationCode: "123456", isVerified: false, attemptCount: 0, expiresAt: new Date(Date.now() + 600_000), createdAt: new Date(), updatedAt: new Date() } as any);
    const verified = await caller.profile.verifyEmail({ code: "123456" });
    expect(verified).toEqual({ success: true });
    expect(completeEmailVerification).toHaveBeenCalledWith(7);
  });

  it("在重送冷卻期間拒絕再次寄送，且錯誤碼會累積驗證嘗試次數", async () => {
    vi.mocked(getUserById).mockResolvedValue({ id: 1, username: "test-user", email: "test@example.com" } as any);
    const caller = appRouter.createCaller(createCtx("student"));
    vi.mocked(getLatestEmailVerification).mockResolvedValueOnce({ id: 8, userId: 1, email: "test@example.com", verificationCode: "654321", isVerified: false, attemptCount: 0, expiresAt: new Date(Date.now() + 600_000), createdAt: new Date(), updatedAt: new Date() } as any);
    await expect(caller.profile.sendEmailVerification()).rejects.toThrow("重新寄送驗證碼");

    vi.mocked(getLatestEmailVerification).mockResolvedValueOnce({ id: 9, userId: 1, email: "test@example.com", verificationCode: "654321", isVerified: false, attemptCount: 0, expiresAt: new Date(Date.now() + 600_000), createdAt: new Date(Date.now() - 120_000), updatedAt: new Date() } as any);
    await expect(caller.profile.verifyEmail({ code: "000000" })).rejects.toThrow("驗證碼不正確");
    expect(incrementEmailVerificationAttempts).toHaveBeenCalledWith(9);
  });

  it("安全異動歷史只取得本人紀錄，且只回傳可顯示的安全事件", async () => {
    const caller = appRouter.createCaller(createCtx("student"));
    const activity = await caller.profile.securityActivity();

    expect(getOperationLogs).toHaveBeenCalledWith({ userId: 1, limit: 100 });
    expect(activity).toEqual([{ id: 21, action: "changePassword", label: "已變更密碼", entityName: "密碼", createdAt: expect.any(Date) }]);
  });

  it("登入驗證挑戰逾時會顯示於使用者個人安全活動日誌", async () => {
    vi.mocked(getOperationLogs).mockResolvedValueOnce([{ id: 47, userId: 1, username: "test-user", action: "loginChallengeExpired", entityType: "accountSecurity", entityName: "登入驗證挑戰", details: "{}", createdAt: new Date("2026-08-12T02:00:00.000Z") }] as any);

    const activity = await appRouter.createCaller(createCtx("student")).profile.securityActivity();

    expect(activity).toEqual([{ id: 47, action: "loginChallengeExpired", label: "登入驗證挑戰已逾時", entityName: "登入驗證挑戰", createdAt: expect.any(Date) }]);
  });
});

describe("2FA recovery-code safe-storage confirmation", () => {
  it("僅在 2FA 啟用且仍有可用恢復碼時記錄列印後保存確認，且不保存明碼", async () => {
    vi.mocked(getTwoFactorAuthenticator).mockResolvedValueOnce({ id: 9, userId: 1, encryptedSecret: "encrypted", isEnabled: true, enabledAt: new Date(), lastUsedAt: null, createdAt: new Date(), updatedAt: new Date() } as any);
    vi.mocked(getTwoFactorRecoveryCodeStatus).mockResolvedValueOnce({ availableCount: 7, totalGenerated: 10, lastGeneratedAt: new Date() });
    vi.mocked(getUserById).mockResolvedValueOnce({ id: 1, username: "test-user" } as any);
    vi.mocked(createOperationLog).mockClear();

    const result = await appRouter.createCaller(createCtx("student")).accountSecurity.confirmTwoFactorRecoveryCodesSafelyStored({ displayedCodeCount: 10 });

    expect(result).toEqual({ success: true });
    expect(createOperationLog).toHaveBeenCalledWith(expect.objectContaining({
      userId: 1,
      action: "confirmTwoFactorRecoveryCodesSafelyStored",
      entityType: "accountSecurity",
      entityName: "2FA 備用恢復碼",
      details: expect.stringContaining('"source":"print-recovery-codes"'),
    }));
    expect(vi.mocked(createOperationLog).mock.calls.at(-1)?.[0]?.details).not.toContain("ABCD-EFGH-JKLM");
  });

  it("沒有可確認的恢復碼時不會建立保存稽核", async () => {
    vi.mocked(getTwoFactorAuthenticator).mockResolvedValueOnce({ id: 9, userId: 1, encryptedSecret: "encrypted", isEnabled: true, enabledAt: new Date(), lastUsedAt: null, createdAt: new Date(), updatedAt: new Date() } as any);
    vi.mocked(getTwoFactorRecoveryCodeStatus).mockResolvedValueOnce({ availableCount: 0, totalGenerated: 10, lastGeneratedAt: new Date() });
    vi.mocked(createOperationLog).mockClear();

    await expect(appRouter.createCaller(createCtx("student")).accountSecurity.confirmTwoFactorRecoveryCodesSafelyStored({ displayedCodeCount: 10 })).rejects.toThrow("沒有可確認保存的恢復碼");
    expect(createOperationLog).not.toHaveBeenCalled();
  });
});

describe("brandLogoMonitoring router", () => {
  it("會記錄 Logo 備援切換詳情，且僅在文字備援時通知專案擁有者", async () => {
    notificationMocks.notifyOwner.mockClear();
    const caller = appRouter.createCaller(createCtx("student"));
    const baseEvent = {
      pagePath: "/login",
      failedSrc: "/manus-storage/qingshui-media-team-logo-96_8e50496f.webp",
      deviceClass: "mobile" as const,
      viewportWidth: 390,
      userAgent: "Vitest Browser",
    };

    await caller.brandLogoMonitoring.reportFailure({ ...baseEvent, failureStage: "initial", fallbackSrc: "/manus-storage/logo-google-drive.png", recoveryOutcome: "switched" });
    expect(createBrandLogoLoadFailure).toHaveBeenCalledWith(expect.objectContaining({ ...baseEvent, failureStage: "initial", fallbackSrc: "/manus-storage/logo-google-drive.png", recoveryOutcome: "switched", reporterUserId: 1 }));
    expect(notificationMocks.notifyOwner).not.toHaveBeenCalled();

    await caller.brandLogoMonitoring.reportFailure({ ...baseEvent, failureStage: "fallback", recoveryOutcome: "text_fallback" });
    expect(notificationMocks.notifyOwner).toHaveBeenCalledWith(expect.objectContaining({ title: "Logo 載入失敗備援已啟用" }));
  });

  it("創始管理員可取得近 24 小時 Logo 異常、備援切換與文字備援摘要", async () => {
    vi.mocked(getBrandLogoLoadFailureSummarySince).mockResolvedValueOnce({ total: 6, switched: 5, textFallback: 1 });
    vi.mocked(getBrandLogoAlertThresholdStatus).mockResolvedValueOnce({ thresholdCount: 5, isEnabled: true, configured: true, updatedAt: new Date(), updatedById: 1 });

    const founderCaller = appRouter.createCaller(createCtx("admin", true));
    const result = await founderCaller.brandLogoMonitoring.summary24h();

    expect(result).toEqual(expect.objectContaining({ total: 6, switched: 5, textFallback: 1, windowHours: 24, alert: expect.objectContaining({ thresholdCount: 5, triggered: true }) }));
    expect(getBrandLogoLoadFailureSummarySince).toHaveBeenCalledWith(expect.any(Date));
  });

  it("創始管理員可保存 Logo 異常警示門檻並取得每小時趨勢", async () => {
    vi.mocked(getBrandLogoHourlyTrend).mockResolvedValueOnce({ since: new Date("2026-08-12T00:00:00.000Z"), windowHours: 24, hourly: [{ hour: "2026-08-12T08", label: "08:00", total: 3, switched: 2, textFallback: 1 }] });
    vi.mocked(getBrandLogoAlertThresholdStatus).mockResolvedValueOnce({ thresholdCount: 4, isEnabled: true, configured: true, updatedAt: new Date(), updatedById: 1 });
    const founderCaller = appRouter.createCaller(createCtx("admin", true));

    const saved = await founderCaller.brandLogoMonitoring.setAlertThreshold({ thresholdCount: 4, isEnabled: true });
    const trend = await founderCaller.brandLogoMonitoring.hourlyTrend();

    expect(upsertBrandLogoAlertThreshold).toHaveBeenCalledWith(expect.objectContaining({ thresholdCount: 4, isEnabled: true, createdById: 1, updatedById: 1 }));
    expect(saved).toEqual(expect.objectContaining({ thresholdCount: 4, isEnabled: true }));
    expect(trend.hourly).toEqual([expect.objectContaining({ label: "08:00", total: 3, switched: 2, textFallback: 1 })]);
  });

  it("僅創始管理員可檢視 Logo 異常監測紀錄，一般管理者與學生均會被拒絕", async () => {
    vi.mocked(getBrandLogoLoadFailures).mockResolvedValueOnce([
      {
        id: 1,
        pagePath: "/",
        failedSrc: "logo.webp",
        deviceClass: "desktop",
        viewportWidth: 1440,
        failureStage: "retry",
        userAgent: "Vitest Browser",
        reporterUserId: 1,
        reportedAt: new Date(),
        reporterName: "Test User",
        reporterUsername: "test-user",
        reporterRealName: null,
      },
    ] as any);
    vi.mocked(getBrandLogoLoadFailureCount).mockResolvedValueOnce(1);

    const founderCaller = appRouter.createCaller(createCtx("admin", true));
    const result = await founderCaller.brandLogoMonitoring.list({ page: 1, pageSize: 30 });

    expect(result.total).toBe(1);
    expect(getBrandLogoLoadFailures).toHaveBeenCalledWith({ deviceClass: undefined, limit: 30, offset: 0 });

    const adminCaller = appRouter.createCaller(createCtx("admin"));
    await expect(adminCaller.brandLogoMonitoring.list({ page: 1, pageSize: 30 })).rejects.toThrow("僅創始管理員");
    const studentCaller = appRouter.createCaller(createCtx("student"));
    await expect(studentCaller.brandLogoMonitoring.list({ page: 1, pageSize: 30 })).rejects.toThrow();
  });

  it("暫時關閉監測時不會記錄或通知新的 Logo 異常", async () => {
    vi.mocked(createBrandLogoLoadFailure).mockClear();
    notificationMocks.notifyOwner.mockClear();
    vi.mocked(getBrandLogoAlertThresholdStatus).mockResolvedValueOnce({ thresholdCount: 3, isEnabled: false, configured: true, updatedAt: new Date(), updatedById: 1 });
    const caller = appRouter.createCaller(createCtx("student"));

    await expect(caller.brandLogoMonitoring.reportFailure({ pagePath: "/", failedSrc: "/manus-storage/logo.jpg", deviceClass: "desktop", failureStage: "fallback", recoveryOutcome: "text_fallback" })).resolves.toEqual({ success: true, monitoringPaused: true });
    expect(createBrandLogoLoadFailure).not.toHaveBeenCalled();
    expect(notificationMocks.notifyOwner).not.toHaveBeenCalled();
  });
});

describe("account security router", () => {
  it("創始管理員必須完成 PIN 驗證才會簽發工作階段，未啟用 2FA 時 PIN 作為第二因素", async () => {
    const founder = {
      id: 3570001,
      username: "Chaney",
      name: "Chaney",
      role: "admin",
      isFounder: true,
      isActive: true,
      isTemporaryPassword: false,
      loginPinHash: await bcrypt.hash("123456", 4),
      passwordHash: await bcrypt.hash("Password123!", 4),
      auditPinHash: await bcrypt.hash("123456", 4),
    } as any;
    const ctx = createCtx("admin");
    const setHeader = vi.fn();
    ctx.req = { protocol: "https", headers: { "user-agent": "Vitest" }, socket: { remoteAddress: "203.0.113.10" } } as any;
    ctx.res = { clearCookie: vi.fn(), setHeader } as any;
    vi.mocked(getUserByUsername).mockResolvedValueOnce(founder);
    vi.mocked(getTwoFactorAuthenticator).mockResolvedValue(null);
    vi.mocked(createTwoFactorLoginChallenge).mockClear();

    const caller = appRouter.createCaller(ctx);
    const passwordStep = await caller.customAuth.login({ username: "Chaney", password: "Password123!" });

    expect(passwordStep).toMatchObject({ success: false, requiresTwoFactor: false, requiresFounderPin: true });
    expect(passwordStep.challengeExpiresAt).toBeInstanceOf(Date);
    expect(passwordStep.challengeExpiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(setHeader).not.toHaveBeenCalled();
    expect(createTwoFactorLoginChallenge).toHaveBeenCalledWith(expect.objectContaining({ userId: 3570001, ipAddress: "203.0.113.10" }));

    vi.mocked(getTwoFactorLoginChallenge).mockResolvedValueOnce({
      challengeToken: passwordStep.founderPinChallengeToken,
      userId: 3570001,
      ipAddress: "203.0.113.10",
      userAgent: "Vitest",
      expiresAt: new Date(Date.now() + 60_000),
      attemptCount: 0,
      secondFactorVerifiedAt: null,
    } as any);
    vi.mocked(getUserById).mockResolvedValueOnce(founder);

    const completed = await caller.customAuth.verifyFounderLoginPin({ challengeToken: passwordStep.founderPinChallengeToken, pin: "123456" });

    expect(completed).toMatchObject({ success: true, user: { id: 3570001, username: "Chaney" } });
    expect(resetLoginPinFailureAttempts).toHaveBeenCalledWith(3570001);
    expect(setHeader).toHaveBeenCalledWith("Set-Cookie", expect.any(Array));
  });

  it("創始管理員在下次登入僅能完成一次雙 PIN 初始設定，完成後不可再次設定", async () => {
    const founder = {
      id: 3570001,
      username: "Chaney",
      name: "Chaney",
      role: "admin",
      isFounder: true,
      isActive: true,
      isTemporaryPassword: false,
      founderPinSetupRequired: true,
      loginPinHash: await bcrypt.hash("111111", 4),
      auditPinHash: await bcrypt.hash("222222", 4),
      passwordHash: await bcrypt.hash("Password123!", 4),
    } as any;
    const ctx = createCtx("admin");
    const setHeader = vi.fn();
    ctx.req = { protocol: "https", headers: { "user-agent": "Vitest" }, socket: { remoteAddress: "203.0.113.77" } } as any;
    ctx.res = { clearCookie: vi.fn(), setHeader } as any;
    vi.mocked(getUserByUsername).mockResolvedValueOnce(founder);
    vi.mocked(getTwoFactorAuthenticator).mockResolvedValueOnce(null);
    vi.mocked(createFirstLoginSetupChallenge).mockClear();

    const caller = appRouter.createCaller(ctx);
    const initial = await caller.customAuth.login({ username: "Chaney", password: "Password123!" });
    expect(initial).toMatchObject({ success: false, requiresFounderPinSetup: true });
    expect(createFirstLoginSetupChallenge).toHaveBeenCalledWith(expect.objectContaining({ userId: founder.id, challengeToken: initial.founderPinSetupToken }));
    expect(setHeader).not.toHaveBeenCalled();

    vi.mocked(getFirstLoginSetupChallenge).mockResolvedValueOnce({ challengeToken: initial.founderPinSetupToken, userId: founder.id, expiresAt: new Date(Date.now() + 60_000) } as any);
    vi.mocked(getUserById).mockResolvedValueOnce(founder);
    vi.mocked(completeFounderPinSetupOnce).mockResolvedValueOnce(true);
    const completed = await caller.customAuth.completeFounderPinSetup({
      challengeToken: initial.founderPinSetupToken,
      loginPin: "123456",
      confirmLoginPin: "123456",
      auditPin: "654321",
      confirmAuditPin: "654321",
    });
    expect(completed).toMatchObject({ success: true, user: { id: founder.id } });
    expect(completeFounderPinSetupOnce).toHaveBeenCalledWith(expect.objectContaining({ userId: founder.id, loginPinHash: expect.any(String), auditPinHash: expect.any(String) }));
    expect(setHeader).toHaveBeenCalledWith("Set-Cookie", expect.any(Array));

    vi.mocked(getFirstLoginSetupChallenge).mockResolvedValueOnce({ challengeToken: initial.founderPinSetupToken, userId: founder.id, expiresAt: new Date(Date.now() + 60_000) } as any);
    vi.mocked(getUserById).mockResolvedValueOnce({ ...founder, founderPinSetupRequired: false } as any);
    await expect(caller.customAuth.completeFounderPinSetup({
      challengeToken: initial.founderPinSetupToken,
      loginPin: "333333",
      confirmLoginPin: "333333",
      auditPin: "444444",
      confirmAuditPin: "444444",
    })).rejects.toThrow("雙 PIN 初始設定資格無效或已完成");
  });

  it("啟用 2FA 的創始管理員未先完成驗證器步驟時，PIN 不可繞過第三因素守衛", async () => {
    const founder = {
      id: 3570001,
      username: "Chaney",
      name: "Chaney",
      role: "admin",
      isFounder: true,
      isActive: true,
      auditPinHash: await bcrypt.hash("123456", 4),
    } as any;
    const ctx = createCtx("admin");
    ctx.req = { protocol: "https", headers: { "user-agent": "Vitest" }, socket: { remoteAddress: "203.0.113.11" } } as any;
    founder.loginPinHash = await bcrypt.hash("123456", 4);
    vi.mocked(getTwoFactorLoginChallenge).mockResolvedValueOnce({
      challengeToken: "x".repeat(32),
      userId: 3570001,
      ipAddress: "203.0.113.11",
      expiresAt: new Date(Date.now() + 60_000),
      attemptCount: 0,
      secondFactorVerifiedAt: null,
    } as any);
    vi.mocked(getUserById).mockResolvedValueOnce(founder);
    vi.mocked(getTwoFactorAuthenticator).mockResolvedValueOnce({ userId: 3570001, isEnabled: true, encryptedSecret: "unused" } as any);

    await expect(appRouter.createCaller(ctx).customAuth.verifyFounderLoginPin({ challengeToken: "x".repeat(32), pin: "123456" })).rejects.toThrow("請先完成雙因素驗證");
    expect(recordLoginPinFailure).not.toHaveBeenCalled();
  });

  it("啟用 2FA 的創始管理員透過通行密鑰後可直接完成 PIN，不會再要求驗證器碼", async () => {
    const founder = {
      id: 3570001,
      username: "Chaney",
      name: "Chaney",
      role: "admin",
      isFounder: true,
      isActive: true,
      isTemporaryPassword: false,
      auditPinHash: await bcrypt.hash("123456", 4),
    } as any;
    const ctx = createCtx("admin");
    const setHeader = vi.fn();
    ctx.req = { protocol: "https", headers: { "user-agent": "Vitest" }, socket: { remoteAddress: "203.0.113.13" } } as any;
    founder.loginPinHash = await bcrypt.hash("123456", 4);
    ctx.res = { clearCookie: vi.fn(), setHeader } as any;
    vi.mocked(getTwoFactorLoginChallenge).mockResolvedValueOnce({ challengeToken: "k".repeat(32), userId: 3570001, ipAddress: "203.0.113.13", userAgent: "Vitest", expiresAt: new Date(Date.now() + 60_000), attemptCount: 0, secondFactorVerifiedAt: null, loginMethod: "passkey" } as any);
    vi.mocked(getUserById).mockResolvedValueOnce(founder);
    vi.mocked(getTwoFactorAuthenticator).mockResolvedValueOnce({ userId: 3570001, isEnabled: true, encryptedSecret: "unused" } as any);

    const completed = await appRouter.createCaller(ctx).customAuth.verifyFounderLoginPin({ challengeToken: "k".repeat(32), pin: "123456" });

    expect(completed).toMatchObject({ success: true, user: { id: 3570001 } });
    expect(setHeader).toHaveBeenCalledWith("Set-Cookie", expect.any(Array));
    expect(createLoginAuditLog).toHaveBeenCalledWith(expect.objectContaining({ loginMethod: "passkey", status: "success" }));
  });

  it("啟用 2FA 的創始管理員完成驗證器後仍需 PIN，且僅 PIN 成功後簽發工作階段", async () => {
    const challengeToken = "c".repeat(32);
    const founder = {
      id: 3570001,
      username: "Chaney",
      name: "Chaney",
      role: "admin",
      isFounder: true,
      isActive: true,
      isTemporaryPassword: false,
      auditPinHash: await bcrypt.hash("123456", 4),
    } as any;
    const ctx = createCtx("admin");
    const setHeader = vi.fn();
    ctx.req = { protocol: "https", headers: { "user-agent": "Vitest" }, socket: { remoteAddress: "203.0.113.12" } } as any;
    founder.loginPinHash = await bcrypt.hash("123456", 4);
    ctx.res = { clearCookie: vi.fn(), setHeader } as any;
    const challenge = { challengeToken, userId: 3570001, ipAddress: "203.0.113.12", userAgent: "Vitest", expiresAt: new Date(Date.now() + 60_000), attemptCount: 0, secondFactorVerifiedAt: null } as any;
    vi.mocked(getTwoFactorLoginChallenge).mockResolvedValueOnce(challenge);
    vi.mocked(getUserById).mockResolvedValueOnce(founder);
    vi.mocked(getTwoFactorAuthenticator).mockResolvedValueOnce({ userId: 3570001, isEnabled: true, encryptedSecret: encryptTwoFactorSecret("test-secret") } as any);

    const afterTwoFactor = await appRouter.createCaller(ctx).customAuth.verifyTwoFactorLogin({ challengeToken, code: "123456" });

    expect(afterTwoFactor).toMatchObject({ success: false, requiresFounderPin: true, founderPinChallengeToken: challengeToken });
    expect(afterTwoFactor.challengeExpiresAt).toEqual(challenge.expiresAt);
    expect(markTwoFactorChallengeVerified).toHaveBeenCalledWith(challengeToken);
    expect(setHeader).not.toHaveBeenCalled();

    vi.mocked(getTwoFactorLoginChallenge).mockResolvedValueOnce({ ...challenge, secondFactorVerifiedAt: new Date() });
    vi.mocked(getUserById).mockResolvedValueOnce(founder);
    vi.mocked(getTwoFactorAuthenticator).mockResolvedValueOnce({ userId: 3570001, isEnabled: true, encryptedSecret: encryptTwoFactorSecret("test-secret") } as any);
    const completed = await appRouter.createCaller(ctx).customAuth.verifyFounderLoginPin({ challengeToken, pin: "123456" });

    expect(completed).toMatchObject({ success: true, user: { id: 3570001 } });
    expect(setHeader).toHaveBeenCalledWith("Set-Cookie", expect.any(Array));
  });

  it("登入 PIN 驗證不接受僅符合稽核 PIN 的憑證，兩組失敗計數互不共用", async () => {
    const founder = {
      id: 3570001,
      username: "Chaney",
      name: "Chaney",
      role: "admin",
      isFounder: true,
      isActive: true,
      loginPinHash: await bcrypt.hash("654321", 4),
      auditPinHash: await bcrypt.hash("123456", 4),
    } as any;
    const ctx = createCtx("admin");
    ctx.req = { protocol: "https", headers: { "user-agent": "Vitest" }, socket: { remoteAddress: "203.0.113.14" } } as any;
    vi.mocked(getTwoFactorLoginChallenge).mockResolvedValueOnce({ challengeToken: "s".repeat(32), userId: 3570001, expiresAt: new Date(Date.now() + 60_000), attemptCount: 0, secondFactorVerifiedAt: null } as any);
    vi.mocked(getUserById).mockResolvedValueOnce(founder);
    vi.mocked(recordLoginPinFailure).mockClear();
    vi.mocked(recordPinFailure).mockClear();

    await expect(appRouter.createCaller(ctx).customAuth.verifyFounderLoginPin({ challengeToken: "s".repeat(32), pin: "123456" })).rejects.toThrow("登入 PIN 不正確");
    expect(recordLoginPinFailure).toHaveBeenCalledWith(3570001);
    expect(recordPinFailure).not.toHaveBeenCalled();
  });

  it("一般使用者在反向代理切換來源 IP 後，仍可使用有效的一次性挑戰完成 2FA 登入", async () => {
    const challengeToken = "p".repeat(32);
    const user = {
      id: 2026,
      username: "two-factor-user",
      name: "Two Factor User",
      role: "student",
      isFounder: false,
      isActive: true,
      isTemporaryPassword: false,
    } as any;
    const ctx = createCtx("student");
    const setHeader = vi.fn();
    ctx.req = { protocol: "https", headers: { "user-agent": "Vitest" }, socket: { remoteAddress: "198.51.100.88" } } as any;
    ctx.res = { clearCookie: vi.fn(), setHeader } as any;
    vi.mocked(getTwoFactorLoginChallenge).mockResolvedValueOnce({
      challengeToken,
      userId: user.id,
      ipAddress: "203.0.113.52",
      userAgent: "Vitest",
      expiresAt: new Date(Date.now() + 60_000),
      attemptCount: 0,
      secondFactorVerifiedAt: null,
    } as any);
    vi.mocked(getUserById).mockResolvedValueOnce(user);
    vi.mocked(getTwoFactorAuthenticator).mockResolvedValueOnce({ userId: user.id, isEnabled: true, encryptedSecret: encryptTwoFactorSecret("test-secret") } as any);

    const result = await appRouter.createCaller(ctx).customAuth.verifyTwoFactorLogin({ challengeToken, code: "123456" });

    expect(result).toMatchObject({ success: true, user: { id: user.id, username: "two-factor-user" } });
    expect(setHeader).toHaveBeenCalledWith("Set-Cookie", expect.any(Array));
  });

  it("登入驗證挑戰逾時時會刪除挑戰並寫入使用者安全活動與登入稽核", async () => {
    const challengeToken = "e".repeat(32);
    const user = { id: 2099, username: "expired-challenge-user", name: "Expired Challenge User", role: "student", isFounder: false, isActive: true } as any;
    const ctx = createCtx("student");
    ctx.req = { protocol: "https", headers: { "user-agent": "Vitest" }, socket: { remoteAddress: "198.51.100.66" } } as any;
    vi.mocked(getTwoFactorLoginChallenge).mockResolvedValueOnce({ challengeToken, userId: user.id, ipAddress: "198.51.100.66", userAgent: "Vitest", expiresAt: new Date(Date.now() - 1_000), attemptCount: 0, secondFactorVerifiedAt: null, loginMethod: "password" } as any);
    vi.mocked(getUserById).mockResolvedValueOnce(user);
    vi.mocked(createOperationLog).mockClear();
    vi.mocked(createLoginAuditLog).mockClear();

    const result = await appRouter.createCaller(ctx).customAuth.recordExpiredLoginChallenge({ challengeToken });

    expect(result).toEqual({ recorded: true });
    expect(createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ userId: user.id, username: user.username, action: "loginChallengeExpired", entityType: "accountSecurity", entityName: "登入驗證挑戰", ipAddress: "198.51.100.66" }));
    expect(createLoginAuditLog).toHaveBeenCalledWith(expect.objectContaining({ userId: user.id, username: user.username, status: "failed", failureReason: "登入驗證挑戰逾時" }));
  });

  it("一般使用者可使用正確的 2FA 備用恢復碼登入，且系統會原子消耗該碼", async () => {
    const challengeToken = "r".repeat(32);
    const user = { id: 2077, username: "recovery-user", name: "Recovery User", role: "student", isFounder: false, isActive: true, isTemporaryPassword: false } as any;
    const ctx = createCtx("student");
    const setHeader = vi.fn();
    ctx.req = { protocol: "https", headers: { "user-agent": "Vitest" }, socket: { remoteAddress: "198.51.100.77" } } as any;
    ctx.res = { clearCookie: vi.fn(), setHeader } as any;
    vi.mocked(getTwoFactorLoginChallenge).mockResolvedValueOnce({ challengeToken, userId: user.id, ipAddress: "203.0.113.77", userAgent: "Vitest", expiresAt: new Date(Date.now() + 60_000), attemptCount: 0, secondFactorVerifiedAt: null, loginMethod: "password" } as any);
    vi.mocked(getUserById).mockResolvedValueOnce(user);
    vi.mocked(getTwoFactorAuthenticator).mockResolvedValueOnce({ userId: user.id, isEnabled: true, encryptedSecret: encryptTwoFactorSecret("test-secret") } as any);
    vi.mocked(getActiveTwoFactorRecoveryCodes).mockResolvedValueOnce([{ id: 88, userId: user.id, codeHash: await bcrypt.hash("ABCDEFGHJKLM", 4), createdAt: new Date(), usedAt: null, revokedAt: null }] as any);
    vi.mocked(consumeTwoFactorRecoveryCode).mockResolvedValueOnce(true);

    const result = await appRouter.createCaller(ctx).customAuth.verifyTwoFactorRecoveryCode({ challengeToken, code: "ABCD-EFGH-JKLM" });

    expect(consumeTwoFactorRecoveryCode).toHaveBeenCalledWith(user.id, 88);
    expect(result).toMatchObject({ success: true, user: { id: user.id, username: "recovery-user" } });
    expect(setHeader).toHaveBeenCalledWith("Set-Cookie", expect.any(Array));
  });

  it("一般使用者登入時不會沿用創始帳號的設備 Cookie，避免新工作階段因設備歸屬不符遭拒絕", async () => {
    const founderDeviceId = "f".repeat(43);
    const user = {
      id: 2027,
      username: "shared-browser-user",
      name: "Shared Browser User",
      role: "student",
      isFounder: false,
      isActive: true,
      isTemporaryPassword: false,
      passwordHash: await bcrypt.hash("Password123!", 4),
    } as any;
    const ctx = createCtx("student");
    const setHeader = vi.fn();
    ctx.req = {
      protocol: "https",
      headers: { "user-agent": "Vitest", cookie: `qingshuiLoginDeviceId=${founderDeviceId}` },
      socket: { remoteAddress: "203.0.113.13" },
    } as any;
    ctx.res = { clearCookie: vi.fn(), setHeader } as any;
    vi.mocked(getUserByUsername).mockResolvedValueOnce(user);
    vi.mocked(getLoginDeviceById).mockResolvedValueOnce({ deviceId: founderDeviceId, userId: 3570001, revokedAt: null } as any);
    vi.mocked(recordLoginDevice).mockClear();

    const result = await appRouter.createCaller(ctx).customAuth.login({ username: user.username, password: "Password123!" });

    expect(result).toMatchObject({ success: true, user: { id: user.id, username: user.username } });
    expect(recordLoginDevice).toHaveBeenCalledWith(expect.objectContaining({
      userId: user.id,
      deviceId: expect.not.stringContaining(founderDeviceId),
    }));
    const writtenCookies = setHeader.mock.calls.find(([name]) => name === "Set-Cookie")?.[1] as string[];
    expect(writtenCookies[1]).toMatch(/^qingshuiLoginDeviceId=/);
    expect(writtenCookies[1]).not.toContain(founderDeviceId);
  });

  it("臨時密碼首次登入不簽發工作階段，完成自訂帳號與新密碼後才可再次登入", async () => {
    const temporaryUser = {
      id: 2088,
      username: "temporary-2088",
      name: "First Login User",
      role: "student",
      isFounder: false,
      isActive: true,
      isTemporaryPassword: true,
      temporaryPasswordExpiresAt: new Date(Date.now() + 60_000),
      passwordHash: await bcrypt.hash("TempPass1!", 4),
    } as any;
    const ctx = createCtx("student");
    const setHeader = vi.fn();
    ctx.req = { protocol: "https", headers: { "user-agent": "Vitest" }, socket: { remoteAddress: "203.0.113.88" } } as any;
    ctx.res = { clearCookie: vi.fn(), setHeader } as any;
    vi.mocked(getUserByUsername).mockResolvedValueOnce(temporaryUser);
    vi.mocked(getTwoFactorAuthenticator).mockResolvedValueOnce(null);

    const caller = appRouter.createCaller(ctx);
    const loginResult = await caller.customAuth.login({ username: temporaryUser.username, password: "TempPass1!" });

    expect(loginResult).toMatchObject({ success: false, requiresFirstLoginSetup: true, user: { id: temporaryUser.id, isTemporaryPassword: true } });
    expect(setHeader).not.toHaveBeenCalled();
    expect(createFirstLoginSetupChallenge).toHaveBeenCalledWith(expect.objectContaining({ userId: temporaryUser.id, challengeToken: expect.any(String), expiresAt: expect.any(Date) }));

    vi.mocked(getFirstLoginSetupChallenge).mockResolvedValueOnce({ challengeToken: loginResult.firstLoginSetupToken, userId: temporaryUser.id, expiresAt: new Date(Date.now() + 60_000), createdAt: new Date() } as any);
    vi.mocked(getUserById).mockResolvedValueOnce(temporaryUser);
    vi.mocked(getUserByUsername).mockResolvedValueOnce(undefined);
    await expect(caller.customAuth.completeFirstLoginSetup({ challengeToken: loginResult.firstLoginSetupToken, username: "custom-2088", newPassword: "NewPass1!", confirmPassword: "NewPass1!" })).resolves.toEqual({ success: true });
    expect(completeFirstLoginSetup).toHaveBeenCalledWith(expect.objectContaining({ userId: temporaryUser.id, username: "custom-2088", passwordHash: expect.any(String) }));
    expect(deleteFirstLoginSetupChallenge).toHaveBeenCalledWith(loginResult.firstLoginSetupToken);

    const temporarySessionCaller = appRouter.createCaller({ ...ctx, user: temporaryUser });
    await expect(temporarySessionCaller.dashboard.stats()).rejects.toThrow("首次登入尚未完成自訂帳號與密碼設定");
  });

  it("管理員重設密碼後以新的臨時密碼登入時，會回傳密碼重設專用狀態而非首次登入狀態", async () => {
    const resetPasswordUser = {
      id: 2089,
      username: "locked-account",
      usernameLockedAt: new Date("2026-08-01T00:00:00.000Z"),
      name: "Locked Account User",
      role: "student",
      isFounder: false,
      isActive: true,
      isTemporaryPassword: true,
      temporaryPasswordExpiresAt: new Date(Date.now() + 60_000),
      passwordHash: await bcrypt.hash("TempPass1!", 4),
    } as any;
    const ctx = createCtx("student");
    ctx.req = { protocol: "https", headers: { "user-agent": "Vitest" }, socket: { remoteAddress: "203.0.113.89" } } as any;
    ctx.res = { clearCookie: vi.fn(), setHeader: vi.fn() } as any;
    vi.mocked(getUserByUsername).mockResolvedValueOnce(resetPasswordUser);
    vi.mocked(getTwoFactorAuthenticator).mockResolvedValueOnce(null);

    const result = await appRouter.createCaller(ctx).customAuth.login({ username: "locked-account", password: "TempPass1!" });

    expect(result).toMatchObject({
      success: false,
      requiresFirstLoginSetup: true,
      passwordSetupMode: "password_reset",
      user: { id: resetPasswordUser.id, username: "locked-account", usernameLocked: true, isTemporaryPassword: true },
    });
  });

  it("已完成首次設定的帳號在重設密碼後不得變更帳號名稱", async () => {
    const resetPasswordUser = {
      id: 2089,
      username: "locked-account",
      usernameLockedAt: new Date("2026-08-01T00:00:00.000Z"),
      name: "Locked Account User",
      role: "student",
      isFounder: false,
      isActive: true,
      isTemporaryPassword: true,
      temporaryPasswordExpiresAt: new Date(Date.now() + 60_000),
      passwordHash: await bcrypt.hash("TempPass1!", 4),
    } as any;
    const ctx = createCtx("student");
    const caller = appRouter.createCaller(ctx);
    const challengeToken = "l".repeat(32);
    vi.mocked(getFirstLoginSetupChallenge).mockResolvedValueOnce({ challengeToken, userId: resetPasswordUser.id, expiresAt: new Date(Date.now() + 60_000), createdAt: new Date() } as any);
    vi.mocked(getUserById).mockResolvedValueOnce(resetPasswordUser);

    await expect(caller.customAuth.completeFirstLoginSetup({ challengeToken, username: "attempted-rename", newPassword: "NewPass1!", confirmPassword: "NewPass1!" })).rejects.toThrow("帳號名稱已在首次設定後固定；重設流程僅可重設密碼");
    expect(completeFirstLoginSetup).not.toHaveBeenCalledWith(expect.objectContaining({ userId: resetPasswordUser.id, username: "attempted-rename" }));
  });

  it("同一瀏覽器從創始帳號切換一般帳號後，會輪替 Cookie 並讓 auth.me 讀到新的一般帳號", async () => {
    const founderDeviceId = "o".repeat(43);
    const founder = {
      id: 3570001,
      username: "founder-session-user",
      name: "Founder Session User",
      role: "admin",
      isFounder: true,
      isActive: true,
      isTemporaryPassword: false,
    } as any;
    const user = {
      id: 2028,
      username: "session-switch-user",
      name: "Session Switch User",
      role: "student",
      isFounder: false,
      isActive: true,
      isTemporaryPassword: false,
      passwordHash: await bcrypt.hash("Password123!", 4),
    } as any;
    const founderToken = await sdk.createSessionToken(founder.username, {
      name: founder.name,
      deviceId: founderDeviceId,
    });
    const founderCookieHeader = `${COOKIE_NAME}=${founderToken}; qingshuiLoginDeviceId=${founderDeviceId}`;
    vi.mocked(getUserByUsername).mockImplementation(async (username) => {
      if (username === founder.username) return founder;
      if (username === user.username) return user;
      return null;
    });
    vi.mocked(getLoginDeviceById).mockImplementation(async (deviceId) => ({
      deviceId,
      userId: deviceId === founderDeviceId ? founder.id : user.id,
      revokedAt: null,
    } as any));

    const founderContext = await createContext({
      req: { headers: { cookie: founderCookieHeader } },
      res: {},
    } as any);
    const founderSessionUser = await appRouter.createCaller(founderContext).auth.me();
    expect(founderSessionUser).toMatchObject({ id: founder.id, username: founder.username });

    const ctx = createCtx("student");
    const setHeader = vi.fn();
    ctx.req = {
      protocol: "https",
      headers: { "user-agent": "Vitest", cookie: founderCookieHeader },
      socket: { remoteAddress: "203.0.113.14" },
    } as any;
    ctx.res = { clearCookie: vi.fn(), setHeader } as any;

    const result = await appRouter.createCaller(ctx).customAuth.login({ username: user.username, password: "Password123!" });
    expect(result).toMatchObject({ success: true, user: { id: user.id } });

    const writtenCookies = setHeader.mock.calls.find(([name]) => name === "Set-Cookie")?.[1] as string[];
    const cookieHeader = writtenCookies.map((cookie) => cookie.split(";", 1)[0]).join("; ");
    const authenticatedContext = await createContext({
      req: { headers: { cookie: cookieHeader } },
      res: {},
    } as any);
    const authenticatedUser = await appRouter.createCaller(authenticatedContext).auth.me();

    expect(cookieHeader).toContain(`${COOKIE_NAME}=`);
    expect(cookieHeader).not.toContain(`qingshuiLoginDeviceId=${founderDeviceId}`);
    expect(authenticatedUser).toMatchObject({ id: user.id, username: user.username });
    expect(authenticatedContext.sessionDeviceId).not.toBe(founderDeviceId);

    const maskCookieValues = (value: string) => value
      .replace(new RegExp(`${COOKIE_NAME}=[^;]+`), `${COOKIE_NAME}=[REDACTED]`)
      .replace(/qingshuiLoginDeviceId=[^;]+/, "qingshuiLoginDeviceId=[REDACTED]");

    expect({
      beforeSwitch: {
        requestCookie: maskCookieValues(founderCookieHeader),
        authMe: { id: founderSessionUser.id, username: founderSessionUser.username },
      },
      afterSwitch: {
        setCookie: writtenCookies.map(maskCookieValues),
        requestCookie: maskCookieValues(cookieHeader),
        authMe: { id: authenticatedUser.id, username: authenticatedUser.username },
        protectedRoute: "/dashboard",
      },
    }).toMatchInlineSnapshot(`
      {
        "afterSwitch": {
          "authMe": {
            "id": 2028,
            "username": "session-switch-user",
          },
          "protectedRoute": "/dashboard",
          "requestCookie": "app_session_id=[REDACTED]; qingshuiLoginDeviceId=[REDACTED]",
          "setCookie": [
            "app_session_id=[REDACTED]; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=None",
            "qingshuiLoginDeviceId=[REDACTED]; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=None",
          ],
        },
        "beforeSwitch": {
          "authMe": {
            "id": 3570001,
            "username": "founder-session-user",
          },
          "requestCookie": "app_session_id=[REDACTED]; qingshuiLoginDeviceId=[REDACTED]",
        },
      }
    `);
  });

  it("使用者可查看與撤銷自己的登入設備，並標記目前工作階段", async () => {
    const ctx = createCtx("admin");
    ctx.sessionDeviceId = "d".repeat(43);
    const caller = appRouter.createCaller(ctx);

    const devices = await caller.accountSecurity.devices();
    expect(devices[0]).toMatchObject({ deviceId: "d".repeat(43), isCurrent: true });

    const result = await caller.accountSecurity.revokeDevice({ deviceId: "d".repeat(43) });
    expect(revokeLoginDevice).toHaveBeenCalledWith(1, "d".repeat(43));
    expect(result).toEqual({ success: true, revokedCurrentDevice: true });
  });

  it("IP 黑名單僅允許已通過 PIN 的創始管理員查看與管理", async () => {
    const founderCtx = createCtx("admin");
    founderCtx.user!.isFounder = true;
    founderCtx.auditPinVerified = true;
    const caller = appRouter.createCaller(founderCtx);

    const records = await caller.ipBlacklist.list();
    expect(records[0]).toMatchObject({ ipAddress: "203.0.113.8", note: "暴力登入" });
    await caller.ipBlacklist.save({ ipAddress: "198.51.100.99", note: "測試規則", isActive: true });
    expect(upsertIpBlacklistEntry).toHaveBeenCalledWith(expect.objectContaining({ ipAddress: "198.51.100.99", note: "測試規則", createdById: 1 }));
    await caller.ipBlacklist.setActive({ id: 8, isActive: false });
    expect(setIpBlacklistActive).toHaveBeenCalledWith(8, false);

    const nonFounderCtx = createCtx("admin");
    nonFounderCtx.auditPinVerified = true;
    await expect(appRouter.createCaller(nonFounderCtx).ipBlacklist.list()).rejects.toThrow();
  });

  it("創始管理員可為異常事件寫入處理註記與結案狀態，且會保留操作稽核", async () => {
    const founderCtx = createCtx("admin");
    founderCtx.user!.isFounder = true;
    founderCtx.auditPinVerified = true;
    const caller = appRouter.createCaller(founderCtx);

    vi.mocked(upsertAuditEventResolution).mockResolvedValueOnce({ becameClosed: true, closedAt: new Date("2026-08-14T08:00:00.000Z") });
    notificationMocks.notifyOwner.mockClear();
    systemAlertEmailMocks.sendSystemAlertEmail.mockClear();

    await expect(caller.auditEventResolutions.save({ sourceType: "loginAudit", sourceEventId: 21, status: "closed", handlingNote: "已確認來源並完成封鎖" })).resolves.toMatchObject({ success: true, notification: { ownerNotified: true } });
    expect(upsertAuditEventResolution).toHaveBeenCalledWith(expect.objectContaining({ sourceType: "loginAudit", sourceEventId: 21, status: "closed", handledById: 1 }));
    expect(notificationMocks.notifyOwner).toHaveBeenCalledWith(expect.objectContaining({ title: "異常事件已結案：loginAudit #21" }));
    expect(systemAlertEmailMocks.sendSystemAlertEmail).toHaveBeenCalledWith(expect.objectContaining({ eventKey: "audit-event-closed:loginAudit:21", force: true }));
    expect(createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "updateAuditEventResolution", entityType: "auditEvent", entityId: 21, details: expect.stringContaining("becameClosed") }));

    await caller.auditEventResolutions.list({ events: [{ sourceType: "loginAudit", sourceEventId: 21 }] });
    expect(getAuditEventResolutions).toHaveBeenCalledWith([{ sourceType: "loginAudit", sourceEventId: 21 }]);

    const nonFounderCtx = createCtx("admin");
    nonFounderCtx.auditPinVerified = true;
    await expect(appRouter.createCaller(nonFounderCtx).auditEventResolutions.save({ sourceType: "operationLog", sourceEventId: 22, status: "in_progress", handlingNote: "正在確認" })).rejects.toThrow();
  });

  it("黑名單 IP 在密碼驗證前即被封鎖並寫入登入稽核", async () => {
    vi.mocked(getIpBlacklistEntry).mockResolvedValueOnce({ id: 9, ipAddress: "203.0.113.9", note: "可疑來源", isActive: true, createdById: 1, createdAt: new Date(), updatedAt: new Date() } as any);
    const ctx = createCtx("admin");
    ctx.req = { protocol: "https", headers: { "x-forwarded-for": "203.0.113.9", "user-agent": "Vitest" }, socket: {} } as any;

    await expect(appRouter.createCaller(ctx).customAuth.login({ username: "security-user", password: "not-used" })).rejects.toThrow("安全策略封鎖");
  });

  it("使用者只能查看、確認或撤銷自己的未知設備登入警告", async () => {
    const caller = appRouter.createCaller(createCtx("admin"));
    const alerts = await caller.profile.pendingDeviceAlerts();
    expect(alerts[0]).toMatchObject({ id: 12, deviceName: "Safari · iPhone" });

    await caller.profile.confirmDeviceAlert({ alertId: 12 });
    expect(confirmLoginDeviceAlert).toHaveBeenCalledWith(12, 1);

    await caller.profile.revokeDeviceAlert({ alertId: 12 });
    expect(revokeLoginDeviceAlert).toHaveBeenCalledWith(12, 1);
  });

  it("僅已驗證 PIN 的創始管理員可一鍵封鎖高風險未知設備 IP，且會撤銷設備並保留稽核", async () => {
    const founderCtx = createCtx("admin");
    founderCtx.user!.isFounder = true;
    founderCtx.auditPinVerified = true;

    const result = await appRouter.createCaller(founderCtx).profile.blockHighRiskDeviceIp({ alertId: 12 });

    expect(result).toEqual({ success: true, ipAddress: "198.51.100.5" });
    expect(getPendingLoginDeviceAlertById).toHaveBeenCalledWith(12);
    expect(upsertIpBlacklistEntry).toHaveBeenCalledWith(expect.objectContaining({ ipAddress: "198.51.100.5", isActive: true, createdById: 1 }));
    expect(revokeLoginDeviceAlert).toHaveBeenCalledWith(12, 2);

    const nonFounderCtx = createCtx("admin");
    nonFounderCtx.auditPinVerified = true;
    await expect(appRouter.createCaller(nonFounderCtx).profile.blockHighRiskDeviceIp({ alertId: 12 })).rejects.toThrow();
  });
});

describe("dashboard summary status", () => {
  it("管理者可取得今日去重摘要的寄送狀態與掃描結果，非管理者不可存取", async () => {
    const result = await appRouter.createCaller(createCtx("admin")).dashboard.deduplicationEmailSummary();
    expect(result).toMatchObject({ hasRunToday: true, duplicateGroupCount: 1, emailStatus: "sent", sent: 1 });
    expect(getTodayAccountDeduplicationEmailSummary).toHaveBeenCalled();
    await expect(appRouter.createCaller(createCtx("student")).dashboard.deduplicationEmailSummary()).rejects.toThrow();
  });
});

describe("system reports", () => {
  it("教師可直接建立並發布系統報告，且會留下發布稽核紀錄", async () => {
    const result = await appRouter.createCaller(createCtx("teacher")).systemReports.create({
      title: "系統維護通知",
      content: "今晚將進行例行維護",
      publishNow: true,
    });

    expect(result).toEqual({ id: 41, status: "published" });
    expect(createSystemReport).toHaveBeenCalledWith(expect.objectContaining({
      title: "系統維護通知",
      authorId: 1,
      status: "published",
      publishedAt: expect.any(Date),
      isPinned: false,
      priority: "normal",
      mustReadBy: null,
    }));
    expect(createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "publishSystemReport", entityType: "systemReport", entityId: 41 }));
  });

  it("學生不可建立或檢視系統報告管理清單", async () => {
    const caller = appRouter.createCaller(createCtx("student"));
    await expect(caller.systemReports.create({ title: "不應建立", content: "內容", publishNow: true })).rejects.toThrow("需要教師或管理員權限");
    await expect(caller.systemReports.list()).rejects.toThrow("需要教師或管理員權限");
  });

  it("教師只能修改與發布自己建立的草稿，管理員可協助處理", async () => {
    vi.mocked(getSystemReportById).mockResolvedValueOnce({ id: 77, title: "他人草稿", content: "內容", status: "draft", authorId: 2, publishedAt: null, createdAt: new Date(), updatedAt: new Date() } as any);
    await expect(appRouter.createCaller(createCtx("teacher")).systemReports.updateDraft({ id: 77, title: "不得修改", content: "內容" })).rejects.toThrow("只能編輯自己建立的草稿");

    vi.mocked(getSystemReportById).mockResolvedValueOnce({ id: 77, title: "他人草稿", content: "內容", status: "draft", authorId: 2, publishedAt: null, createdAt: new Date(), updatedAt: new Date() } as any);
    const result = await appRouter.createCaller(createCtx("admin")).systemReports.publish({ id: 77 });
    expect(result).toEqual({ success: true });
    expect(publishSystemReport).toHaveBeenCalledWith(77);
  });

  it("教師可設定自己的報告置頂與重要程度，且非作者不得修改他人設定", async () => {
    const ownDraft = { id: 79, title: "優先公告", content: "內容", status: "draft", authorId: 1, isPinned: false, priority: "normal", publishedAt: null, expiresAt: null, createdAt: new Date(), updatedAt: new Date() } as any;
    vi.mocked(getSystemReportById).mockResolvedValueOnce(ownDraft);
    await expect(appRouter.createCaller(createCtx("teacher")).systemReports.setPinned({ id: 79, isPinned: true })).resolves.toEqual({ success: true });
    expect(updateSystemReportPinned).toHaveBeenCalledWith(79, true);
    expect(createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "setSystemReportPinned", entityId: 79 }));

    vi.mocked(getSystemReportById).mockResolvedValueOnce(ownDraft);
    await expect(appRouter.createCaller(createCtx("teacher")).systemReports.setPriority({ id: 79, priority: "urgent" })).rejects.toThrow("緊急公告需在草稿中設定必讀截止時間後再發布");

    vi.mocked(getSystemReportById).mockResolvedValueOnce(ownDraft);
    await expect(appRouter.createCaller(createCtx("teacher")).systemReports.setPriority({ id: 79, priority: "important" })).resolves.toEqual({ success: true });
    expect(updateSystemReportPriority).toHaveBeenCalledWith(79, "important");
    expect(createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "setSystemReportPriority", entityId: 79 }));

    vi.mocked(getSystemReportById).mockResolvedValueOnce({ ...ownDraft, authorId: 2 });
    await expect(appRouter.createCaller(createCtx("teacher")).systemReports.setPinned({ id: 79, isPinned: true })).rejects.toThrow("只能設定自己建立的系統報告");
  });

  it("所有登入使用者可取得未讀的已發布報告並確認閱讀，草稿不可標記閱讀", async () => {
    const published = { id: 88, title: "重要公告", content: "請確認內容", status: "published", authorId: 1, publishedAt: new Date(), createdAt: new Date(), updatedAt: new Date(), authorUsername: "admin", authorName: "Admin", authorRealName: null } as any;
    vi.mocked(getUnreadSystemReports).mockResolvedValueOnce([published]);
    const studentCaller = appRouter.createCaller(createCtx("student"));
    await expect(studentCaller.systemReports.unread()).resolves.toEqual([published]);

    vi.mocked(getSystemReportById).mockResolvedValueOnce(published);
    await expect(studentCaller.systemReports.markRead({ id: 88 })).resolves.toEqual({ success: true });
    expect(markSystemReportRead).toHaveBeenCalledWith({ reportId: 88, userId: 1 });
    expect(createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "readSystemReport", entityType: "systemReport", entityId: 88 }));

    vi.mocked(getSystemReportById).mockResolvedValueOnce({ ...published, status: "draft" });
    await expect(studentCaller.systemReports.markRead({ id: 88 })).rejects.toThrow("找不到可閱讀的系統報告");
  });

  it("所有登入使用者可取得含已讀狀態的公告收件匣，供側邊欄通知入口查看", async () => {
    const inbox = [{ id: 97, title: "緊急疏散通知", status: "published", priority: "urgent", isRead: false, mustReadBy: new Date("2026-12-31T08:00:00.000Z"), assets: [] }];
    vi.mocked(getSystemReportInbox).mockResolvedValueOnce(inbox as any);

    await expect(appRouter.createCaller(createCtx("student")).systemReports.inbox()).resolves.toEqual(inbox);
    expect(getSystemReportInbox).toHaveBeenCalledWith(1);
  });

  it("僅管理員可查看未讀緊急公告使用者名單，且查看會留下稽核紀錄", async () => {
    const audience = [{ id: 91, title: "緊急疏散通知", status: "published", priority: "urgent", mustReadBy: new Date(Date.now() + 60 * 60 * 1000), unreadCount: 2, unreadUsers: [{ id: 3, username: "student-a", name: "學生甲", realName: null, role: "student" }] }];
    vi.mocked(getUnreadUrgentSystemReportAudiences).mockResolvedValueOnce(audience as any);

    await expect(appRouter.createCaller(createCtx("admin")).systemReports.unreadUrgentRecipients()).resolves.toEqual(audience);
    expect(createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "viewUrgentSystemReportUnreadRecipients", entityType: "auditView" }));
    await expect(appRouter.createCaller(createCtx("teacher")).systemReports.unreadUrgentRecipients()).rejects.toThrow("需要管理員權限");
  });

  it("教師僅可為自己的草稿受控上傳允許格式的圖片或附件，且稽核不記錄檔案內容", async () => {
    vi.mocked(getSystemReportById).mockResolvedValueOnce({ id: 41, title: "維護通知", content: "內容", status: "draft", authorId: 1, publishedAt: null, expiresAt: null, createdAt: new Date(), updatedAt: new Date() } as any);
    const base64 = Buffer.from("image-content").toString("base64");

    const result = await appRouter.createCaller(createCtx("teacher")).systemReports.uploadAsset({
      reportId: 41,
      assetKind: "image",
      fileName: "maintenance.png",
      mimeType: "image/png",
      base64,
    });

    expect(result).toMatchObject({ id: 73, assetKind: "image", fileName: "maintenance.png" });
    expect(storagePut).toHaveBeenCalledWith("system-reports/41/image/maintenance.png", expect.any(Buffer), "image/png");
    expect(createSystemReportAsset).toHaveBeenCalledWith(expect.objectContaining({ reportId: 41, assetKind: "image", uploadedById: 1, sizeBytes: 13 }));
    const auditEntry = vi.mocked(createOperationLog).mock.calls.at(-1)?.[0];
    expect(auditEntry?.details).not.toContain(base64);

    vi.mocked(getSystemReportById).mockResolvedValueOnce({ id: 41, title: "維護通知", content: "內容", status: "draft", authorId: 2, publishedAt: null, expiresAt: null, createdAt: new Date(), updatedAt: new Date() } as any);
    await expect(appRouter.createCaller(createCtx("teacher")).systemReports.uploadAsset({ reportId: 41, assetKind: "attachment", fileName: "report.pdf", mimeType: "application/pdf", base64 })).rejects.toThrow("只能管理自己建立的草稿附件");
  });

  it("到期系統報告會拒絕閱讀確認，發布時也會拒絕已過期的草稿", async () => {
    const expired = { id: 95, title: "到期公告", content: "內容", status: "published", authorId: 1, publishedAt: new Date(), expiresAt: new Date(Date.now() - 1_000), createdAt: new Date(), updatedAt: new Date() } as any;
    vi.mocked(getSystemReportById).mockResolvedValueOnce(expired);
    await expect(appRouter.createCaller(createCtx("student")).systemReports.markRead({ id: 95 })).rejects.toThrow("找不到可閱讀的系統報告");

    vi.mocked(getSystemReportById).mockResolvedValueOnce({ ...expired, status: "draft" });
    await expect(appRouter.createCaller(createCtx("admin")).systemReports.publish({ id: 95 })).rejects.toThrow("有效期限已過");
  });

  it("緊急公告必須有未來的必讀截止時間，並在發布前再次驗證", async () => {
    const teacherCaller = appRouter.createCaller(createCtx("teacher"));
    await expect(teacherCaller.systemReports.create({ title: "緊急通知", content: "請立即確認", publishNow: true, priority: "urgent" })).rejects.toThrow("緊急公告必須設定必讀截止時間");

    const mustReadBy = new Date(Date.now() + 60 * 60 * 1000);
    await expect(teacherCaller.systemReports.create({ title: "緊急通知", content: "請立即確認", publishNow: true, priority: "urgent", mustReadBy })).resolves.toMatchObject({ id: 41, status: "published" });
    expect(createSystemReport).toHaveBeenLastCalledWith(expect.objectContaining({ priority: "urgent", mustReadBy }));

    vi.mocked(getSystemReportById).mockResolvedValueOnce({ id: 98, title: "缺少期限的緊急草稿", content: "內容", status: "draft", authorId: 1, priority: "urgent", mustReadBy: null, expiresAt: null, publishedAt: null, createdAt: new Date(), updatedAt: new Date() } as any);
    await expect(teacherCaller.systemReports.publish({ id: 98 })).rejects.toThrow("緊急公告需要未來的必讀截止時間才能發布");
  });

  it("已發布附件可由登入使用者追蹤下載，草稿或到期附件不可計入", async () => {
    const attachment = { id: 93, reportId: 96, assetKind: "attachment", fileName: "maintenance.pdf", url: "/manus-storage/maintenance.pdf" } as any;
    const published = { id: 96, title: "維護公告", content: "內容", status: "published", authorId: 1, isPinned: true, priority: "important", publishedAt: new Date(), expiresAt: null, createdAt: new Date(), updatedAt: new Date() } as any;
    vi.mocked(getSystemReportAssetById).mockResolvedValueOnce(attachment);
    vi.mocked(getSystemReportById).mockResolvedValueOnce(published);

    await expect(appRouter.createCaller(createCtx("student")).systemReports.trackDownload({ assetId: 93 })).resolves.toEqual({ success: true });
    expect(incrementSystemReportAssetDownloadCount).toHaveBeenCalledWith(93);
    expect(createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "downloadSystemReportAsset", entityType: "systemReportAsset", entityId: 93 }));

    vi.mocked(getSystemReportAssetById).mockResolvedValueOnce(attachment);
    vi.mocked(getSystemReportById).mockResolvedValueOnce({ ...published, expiresAt: new Date(Date.now() - 1_000) });
    await expect(appRouter.createCaller(createCtx("student")).systemReports.trackDownload({ assetId: 93 })).rejects.toThrow("找不到可下載的系統報告附件");
  });

  it("僅管理員可查看每篇已發布系統報告的已讀與未讀統計，並保留檢視稽核", async () => {
    vi.mocked(getSystemReportReadStatistics).mockResolvedValueOnce([{ id: 3, title: "閱讀統計", content: "內容", status: "published", authorId: 1, publishedAt: new Date(), expiresAt: null, isPinned: true, priority: "important", createdAt: new Date(), updatedAt: new Date(), authorUsername: "admin", authorName: "Admin", authorRealName: null, assets: [], readCount: 8, unreadCount: 2, activeUserCount: 10, downloadCount: 6 }] as any);
    const result = await appRouter.createCaller(createCtx("admin")).systemReports.statistics();
    expect(result[0]).toMatchObject({ id: 3, readCount: 8, unreadCount: 2, activeUserCount: 10, downloadCount: 6 });
    expect(createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "viewSystemReportStatistics", entityType: "systemReport" }));
    await expect(appRouter.createCaller(createCtx("teacher")).systemReports.statistics()).rejects.toThrow("需要管理員權限");
  });
});

describe("sensitive audit view logging", () => {
  it("創始管理員查看登入稽核、操作日誌與收件者設定時會留下可追溯審計紀錄", async () => {
    const founderCtx = createCtx("admin");
    founderCtx.user!.isFounder = true;
    founderCtx.auditPinVerified = true;
    const caller = appRouter.createCaller(founderCtx);

    await caller.loginAudit.list({ page: 1, pageSize: 20, status: "failed" });
    await caller.operationLogs.list({ page: 1, pageSize: 20, deduplicationOnly: true });
    await caller.systemAlertEmail.list();

    expect(createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ userId: 1, action: "viewLoginAudit", entityType: "auditView", entityName: "登入稽核紀錄" }));
    expect(createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ userId: 1, action: "viewOperationAuditLog", entityType: "auditView", entityName: "操作日誌紀錄" }));
    expect(createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ userId: 1, action: "viewSystemAlertEmailSettings", entityType: "systemAlertEmailRecipient" }));
  });
});

describe("account deduplication maintenance", () => {
  it("僅允許已驗證 PIN 的創始管理員檢視與手動產生去重報告", async () => {
    const founderCtx = createCtx("admin");
    founderCtx.user!.isFounder = true;
    founderCtx.auditPinVerified = true;
    const caller = appRouter.createCaller(founderCtx);

    const status = await caller.users.deduplicationStatus();
    expect(status.latestReport?.duplicateGroupCount).toBe(1);
    await caller.users.runDeduplicationCheck();
    expect(findDuplicateAccounts).toHaveBeenCalled();
    expect(createAccountDeduplicationReport).toHaveBeenCalledWith(expect.objectContaining({ scheduleId: 1 }));

    const unverifiedCtx = createCtx("admin");
    unverifiedCtx.user!.isFounder = true;
    await expect(appRouter.createCaller(unverifiedCtx).users.deduplicationStatus()).rejects.toThrow();

    const nonFounderCtx = createCtx("admin");
    nonFounderCtx.auditPinVerified = true;
    await expect(appRouter.createCaller(nonFounderCtx).users.runDeduplicationCheck()).rejects.toThrow();
  });

  it("僅可停用仍在最新去重群組中的非創始帳號，並保留停用操作日誌", async () => {
    const founderCtx = createCtx("admin");
    founderCtx.user!.isFounder = true;
    founderCtx.auditPinVerified = true;

    const result = await appRouter.createCaller(founderCtx).users.deactivateDuplicateUser({ id: 9 });
    expect(result).toEqual({ success: true });
    expect(deactivateDuplicateUserAccount).toHaveBeenCalledWith(9);
  });
});

describe("audit center protected records", () => {
  it("登入稽核 API 會將日期區間轉交資料查詢，且仍要求創始管理員與 PIN", async () => {
    const founderCtx = createCtx("admin");
    founderCtx.user!.isFounder = true;
    founderCtx.auditPinVerified = true;
    const caller = appRouter.createCaller(founderCtx);
    const startDate = new Date("2026-08-01T00:00:00.000Z");
    const endDate = new Date("2026-08-07T23:59:59.999Z");

    await caller.loginAudit.list({ page: 1, pageSize: 20, startDate, endDate });

    expect(getLoginAuditLogs).toHaveBeenCalledWith(expect.objectContaining({ startDate, endDate, limit: 20, offset: 0 }));
    expect(getLoginAuditLogCount).toHaveBeenCalledWith(expect.objectContaining({ startDate, endDate }));
  });

  it("登入稽核與操作日誌都會保留創始管理員與 PIN 驗證限制", async () => {
    const founderCtx = createCtx("admin");
    founderCtx.user!.isFounder = true;
    founderCtx.auditPinVerified = false;
    const unverifiedCaller = appRouter.createCaller(founderCtx);

    await expect(unverifiedCaller.loginAudit.list({ page: 1, pageSize: 20 })).rejects.toThrow();
    await expect(unverifiedCaller.operationLogs.list({ page: 1, pageSize: 20 })).rejects.toThrow();

    const adminCtx = createCtx("admin");
    adminCtx.auditPinVerified = true;
    const nonFounderCaller = appRouter.createCaller(adminCtx);
    await expect(nonFounderCaller.loginAudit.list({ page: 1, pageSize: 20 })).rejects.toThrow();
    await expect(nonFounderCaller.operationLogs.list({ page: 1, pageSize: 20 })).rejects.toThrow();
  });

  it("高風險摘要僅對已驗證 PIN 的創始管理員依指定期間回傳統計與門檻警告", async () => {
    const founderCtx = createCtx("admin");
    founderCtx.user!.isFounder = true;
    founderCtx.auditPinVerified = true;

    const result = await appRouter.createCaller(founderCtx).loginAudit.highRiskSummary({ period: "30d" });

    expect(getLoginAuditHighRiskSummary).toHaveBeenCalledWith("30d");
    expect(result).toMatchObject({ highRiskLoginCount: 2, lockedLoginEventCount: 1, activeLockedAccountCount: 1, highRiskOperationCount: 3, lockedEventWarning: { threshold: 3, triggered: false } });

    const unverifiedCtx = createCtx("admin");
    unverifiedCtx.user!.isFounder = true;
    await expect(appRouter.createCaller(unverifiedCtx).loginAudit.highRiskSummary({ period: "24h" })).rejects.toThrow();
  });
});

describe("system maintenance router", () => {
  it("公開狀態會在尚未設定時回傳系統正常運作", async () => {
    vi.mocked(getSystemMaintenanceSettings).mockResolvedValue(null);
    vi.mocked(getLatestSystemRecoveryNotice).mockResolvedValue(null);

    await expect(appRouter.createCaller(createCtx("student")).systemMaintenance.status()).resolves.toMatchObject({
      systemMode: "online",
      maintenanceMode: false,
      isRestricted: false,
      recoveryNotice: null,
      updatedAt: null,
    });
  });

  it("系統恢復上線後會在公開狀態提供限時恢復服務提示", async () => {
    vi.mocked(getSystemMaintenanceSettings).mockResolvedValue({ systemMode: "online", maintenanceMode: false, updatedAt: new Date() } as any);
    vi.mocked(getLatestSystemRecoveryNotice).mockResolvedValue({ id: 901, restoredAt: new Date("2026-08-17T05:00:00.000Z"), previousSystemMode: "maintenance" });

    await expect(appRouter.createCaller(createCtx("student")).systemMaintenance.status()).resolves.toMatchObject({
      systemMode: "online",
      recoveryNotice: { id: 901, previousSystemMode: "maintenance" },
    });
  });

  it("系統模式歷程僅供已完成 PIN 驗證的創始管理員檢視，並回傳強制登出統計", async () => {
    const founderCtx = createCtx("admin", true);
    founderCtx.auditPinVerified = true;
    vi.mocked(getSystemModeHistory).mockResolvedValueOnce([{
      id: 902,
      action: "enableSystemMaintenanceMode",
      systemMode: "maintenance",
      username: "Chaney",
      createdAt: new Date("2026-08-17T04:00:00.000Z"),
      effectiveAt: new Date("2026-08-17T04:00:00.000Z"),
      announcement: "例行維護",
      estimatedRestoredAt: null,
      forcedLogoutCount: 4,
      previousSystemMode: "online",
    }]);

    await expect(appRouter.createCaller(founderCtx).systemMaintenance.history()).resolves.toMatchObject([{ systemMode: "maintenance", forcedLogoutCount: 4 }]);
    await expect(appRouter.createCaller(createCtx("admin", true)).systemMaintenance.history()).rejects.toThrow("PIN 碼驗證失效");
    await expect(appRouter.createCaller(createCtx("admin")).systemMaintenance.history()).rejects.toThrow();
  });

  it("僅創始管理員可切換系統模式，且切換會留下操作稽核", async () => {
    const founderCtx = createCtx("admin", true);
    vi.mocked(upsertSystemMaintenanceSettings).mockResolvedValueOnce({
      id: 9,
      maintenanceMode: true,
      systemMode: "maintenance",
      updatedById: founderCtx.user!.id,
      updatedAt: new Date("2026-08-17T03:00:00.000Z"),
    } as any);

    const result = await appRouter.createCaller(founderCtx).systemMaintenance.setMode({ systemMode: "maintenance" });

    expect(result).toMatchObject({ systemMode: "maintenance", maintenanceMode: true, isRestricted: true });
    expect(upsertSystemMaintenanceSettings).toHaveBeenCalledWith(expect.objectContaining({
      systemMode: "maintenance",
      updatedById: founderCtx.user!.id,
      scheduledMode: null,
      scheduledFor: null,
      announcement: null,
    }));
    expect(createOperationLog).toHaveBeenCalledWith(expect.objectContaining({
      action: "enableSystemMaintenanceMode",
      entityType: "systemMaintenance",
      entityName: "SYSTEM MAINTENANCE",
    }));

    await expect(appRouter.createCaller(createCtx("admin")).systemMaintenance.setMode({ systemMode: "online" })).rejects.toThrow();
  });

  it("創始管理員可切換至 SYSTEM OFFLINE，並留下非創始管理員存取已撤銷的稽核資料", async () => {
    const founderCtx = createCtx("admin", true);
    vi.mocked(upsertSystemMaintenanceSettings).mockResolvedValueOnce({
      id: 9,
      maintenanceMode: false,
      systemMode: "offline",
      updatedById: founderCtx.user!.id,
      updatedAt: new Date("2026-08-17T03:00:00.000Z"),
    } as any);

    const result = await appRouter.createCaller(founderCtx).systemMaintenance.setMode({ systemMode: "offline" });

    expect(result).toMatchObject({ systemMode: "offline", maintenanceMode: false, isRestricted: true });
    expect(createOperationLog).toHaveBeenCalledWith(expect.objectContaining({
      action: "enableSystemOfflineMode",
      entityType: "systemMaintenance",
      entityName: "SYSTEM OFFLINE",
      details: expect.stringContaining("revoked"),
    }));
  });

  it("僅創始管理員可建立與取消維護預告，並保留公告與預計恢復時間稽核", async () => {
    const founderCtx = createCtx("admin", true);
    const scheduledFor = new Date(Date.now() + 20 * 60 * 1_000);
    const estimatedRestoredAt = new Date(Date.now() + 50 * 60 * 1_000);
    vi.mocked(upsertSystemMaintenanceSettings).mockResolvedValueOnce({
      id: 9,
      maintenanceMode: false,
      systemMode: "online",
      scheduledMode: "maintenance",
      scheduledFor,
      scheduledById: founderCtx.user!.id,
      announcement: "請先完成目前作業",
      estimatedRestoredAt,
      updatedById: founderCtx.user!.id,
      updatedAt: new Date(),
    } as any);

    const scheduled = await appRouter.createCaller(founderCtx).systemMaintenance.scheduleMode({
      systemMode: "maintenance",
      scheduledFor,
      announcement: "請先完成目前作業",
      estimatedRestoredAt,
    });

    expect(scheduled).toMatchObject({ systemMode: "online", scheduledMode: "maintenance", isScheduled: true, announcement: "請先完成目前作業" });
    expect(createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "scheduleSystemModeChange", entityName: "SCHEDULE MAINTENANCE" }));
    expect(upsertSystemMaintenanceSettings).toHaveBeenCalledWith(expect.objectContaining({
      systemMode: "online",
      scheduledMode: "maintenance",
      scheduledFor,
      announcement: "請先完成目前作業",
      estimatedRestoredAt,
    }));

    vi.mocked(getSystemMaintenanceSettings).mockResolvedValueOnce({
      id: 9,
      maintenanceMode: false,
      systemMode: "online",
      scheduledMode: "maintenance",
      scheduledFor,
      scheduledById: founderCtx.user!.id,
      announcement: "請先完成目前作業",
      estimatedRestoredAt,
    } as any);
    vi.mocked(upsertSystemMaintenanceSettings).mockResolvedValueOnce({
      id: 9,
      maintenanceMode: false,
      systemMode: "online",
      scheduledMode: null,
      scheduledFor: null,
      scheduledById: null,
      announcement: null,
      estimatedRestoredAt: null,
      updatedById: founderCtx.user!.id,
      updatedAt: new Date(),
    } as any);

    await expect(appRouter.createCaller(founderCtx).systemMaintenance.cancelScheduledMode()).resolves.toMatchObject({ isScheduled: false, scheduledMode: null });
    expect(createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "cancelScheduledSystemMode" }));
    await expect(appRouter.createCaller(createCtx("admin")).systemMaintenance.scheduleMode({ systemMode: "offline", scheduledFor })).rejects.toThrow();
  });

  it("維護模式會阻止非創始管理員建立新的帳密工作階段並留下登入稽核", async () => {
    const account = {
      id: 802,
      username: "maintenance-blocked",
      name: "維護測試帳號",
      role: "student",
      isFounder: false,
      isActive: true,
      isTemporaryPassword: false,
      passwordHash: await bcrypt.hash("Password123!", 4),
    } as any;
    vi.mocked(getSystemMaintenanceSettings).mockResolvedValueOnce({
      id: 9,
      maintenanceMode: true,
      systemMode: "maintenance",
      updatedById: 1,
      updatedAt: new Date(),
    } as any);
    vi.mocked(getUserByUsername).mockResolvedValueOnce(account);
    vi.mocked(getTwoFactorAuthenticator).mockResolvedValueOnce(null);
    const ctx = createCtx("student");
    ctx.req = { protocol: "https", headers: { "user-agent": "Vitest" }, socket: { remoteAddress: "203.0.113.77" } } as any;

    await expect(appRouter.createCaller(ctx).customAuth.login({ username: account.username, password: "Password123!" })).rejects.toThrow("系統維護中");
    expect(createLoginAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      userId: account.id,
      status: "failed",
      failureReason: "系統維護模式：僅允許創始管理員登入",
    }));
  });

  it("離線模式會阻止非創始管理員建立新的帳密工作階段並留下登入稽核", async () => {
    const account = {
      id: 803,
      username: "offline-blocked",
      name: "離線測試帳號",
      role: "student",
      isFounder: false,
      isActive: true,
      isTemporaryPassword: false,
      passwordHash: await bcrypt.hash("Password123!", 4),
    } as any;
    vi.mocked(getSystemMaintenanceSettings).mockResolvedValueOnce({
      id: 9,
      maintenanceMode: false,
      systemMode: "offline",
      updatedById: 1,
      updatedAt: new Date(),
    } as any);
    vi.mocked(getUserByUsername).mockResolvedValueOnce(account);
    vi.mocked(getTwoFactorAuthenticator).mockResolvedValueOnce(null);
    const ctx = createCtx("student");
    ctx.req = { protocol: "https", headers: { "user-agent": "Vitest" }, socket: { remoteAddress: "203.0.113.78" } } as any;

    await expect(appRouter.createCaller(ctx).customAuth.login({ username: account.username, password: "Password123!" })).rejects.toThrow("系統離線中");
    expect(createLoginAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      userId: account.id,
      status: "failed",
      failureReason: "系統離線模式：僅允許創始管理員登入",
    }));
  });
});
