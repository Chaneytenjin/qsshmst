import {
  boolean,
  foreignKey,
  int,
  mysqlEnum,
  mysqlTable,
  index,
  text,
  timestamp,
  uniqueIndex,
  varchar,
  decimal,
} from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),
  username: varchar("username", { length: 64 }).unique(),
  usernameLockedAt: timestamp("usernameLockedAt"),
  passwordHash: varchar("passwordHash", { length: 255 }),
  temporaryPasswordCiphertext: varchar("temporaryPasswordCiphertext", { length: 1024 }),
  temporaryPasswordExpiresAt: timestamp("temporaryPasswordExpiresAt"),
  isTemporaryPassword: boolean("isTemporaryPassword").default(false).notNull(),
  name: text("name"),
  avatarUrl: text("avatarUrl"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "teacher", "student"]).default("student").notNull(),
  clubRole: mysqlEnum("clubRole", ["president", "vice_president", "pr_director", "pr_secretary", "activity_director", "vice_activity_director", "teaching", "general_affairs", "art_web_admin", "club_advisor", "club_admin"]),
  isActive: boolean("isActive").default(true).notNull(),
  studentId: varchar("studentId", { length: 32 }),
  department: varchar("department", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  phone: varchar("phone", { length: 20 }),
  realName: varchar("realName", { length: 128 }),
  isFounder: boolean("isFounder").default(false).notNull(),
  loginPinHash: varchar("loginPinHash", { length: 255 }),
  auditPinHash: varchar("auditPinHash", { length: 255 }),
  founderPinSetupRequired: boolean("founderPinSetupRequired").default(false).notNull(),
  passwordChangedAt: timestamp("passwordChangedAt").defaultNow().notNull(),
  passwordReminderSentAt: timestamp("passwordReminderSentAt"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Attendance ───────────────────────────────────────────────────────────────
export const attendanceSessions = mysqlTable("attendance_sessions", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 160 }).notNull(),
  attendanceAt: timestamp("attendanceAt").notNull(),
  location: varchar("location", { length: 160 }),
  note: text("note"),
  createdById: int("createdById").references(() => users.id, { onDelete: "set null" }),
  closedAt: timestamp("closedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("attendance_sessions_attendance_at_index").on(table.attendanceAt),
  index("attendance_sessions_created_by_index").on(table.createdById),
]);

export type AttendanceSession = typeof attendanceSessions.$inferSelect;
export type InsertAttendanceSession = typeof attendanceSessions.$inferInsert;

export const attendanceRecords = mysqlTable("attendance_records", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull().references(() => attendanceSessions.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: mysqlEnum("status", ["unmarked", "present", "late", "absent", "excused"]).default("unmarked").notNull(),
  note: varchar("note", { length: 500 }),
  markedById: int("markedById").references(() => users.id, { onDelete: "set null" }),
  markedAt: timestamp("markedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("attendance_records_session_user_unique").on(table.sessionId, table.userId),
  index("attendance_records_session_status_index").on(table.sessionId, table.status),
  index("attendance_records_user_updated_index").on(table.userId, table.updatedAt),
]);

export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type InsertAttendanceRecord = typeof attendanceRecords.$inferInsert;

// ─── System Maintenance Settings ──────────────────────────────────────────────
export const systemMaintenanceSettings = mysqlTable("system_maintenance_settings", {
  id: int("id").autoincrement().primaryKey(),
  maintenanceMode: boolean("maintenanceMode").default(false).notNull(),
  systemMode: mysqlEnum("systemMode", ["online", "maintenance", "offline"]).default("online").notNull(),
  scheduledMode: mysqlEnum("scheduledMode", ["maintenance", "offline"]),
  scheduledFor: timestamp("scheduledFor"),
  scheduledById: int("scheduledById").references(() => users.id, { onDelete: "set null" }),
  announcement: text("announcement"),
  estimatedRestoredAt: timestamp("estimatedRestoredAt"),
  updatedById: int("updatedById").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemMaintenanceSettings = typeof systemMaintenanceSettings.$inferSelect;
export type InsertSystemMaintenanceSettings = typeof systemMaintenanceSettings.$inferInsert;

// ─── Authorized Email Offline Commands ───────────────────────────────────────
export const emailOfflineCommandSettings = mysqlTable("email_offline_command_settings", {
  id: int("id").autoincrement().primaryKey(),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull().unique(),
  encryptedCommandSecret: varchar("encryptedCommandSecret", { length: 1024 }),
  isEnabled: boolean("isEnabled").default(false).notNull(),
  gmailPollScheduleTaskUid: varchar("gmailPollScheduleTaskUid", { length: 65 }).unique(),
  gmailLastPolledAt: timestamp("gmailLastPolledAt"),
  gmailLastPollError: varchar("gmailLastPollError", { length: 512 }),
  authorizedById: int("authorizedById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.authorizedById],
    foreignColumns: [users.id],
    name: "eoc_settings_authorized_by_fk",
  }),
  index("eoc_gmail_poll_schedule_index").on(table.gmailPollScheduleTaskUid),
]);

export type EmailOfflineCommandSettings = typeof emailOfflineCommandSettings.$inferSelect;
export type InsertEmailOfflineCommandSettings = typeof emailOfflineCommandSettings.$inferInsert;

export const emailOfflineCommandAuthorizedSenders = mysqlTable("email_offline_command_authorized_senders", {
  id: int("id").autoincrement().primaryKey(),
  settingsId: int("settingsId").notNull(),
  senderEmail: varchar("senderEmail", { length: 320 }).notNull(),
  label: varchar("label", { length: 128 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdById: int("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.settingsId],
    foreignColumns: [emailOfflineCommandSettings.id],
    name: "eoc_sender_settings_fk",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.createdById],
    foreignColumns: [users.id],
    name: "eoc_sender_created_by_fk",
  }),
  uniqueIndex("email_offline_command_sender_unique").on(table.settingsId, table.senderEmail),
  index("email_offline_command_sender_active_index").on(table.settingsId, table.isActive),
]);

export type EmailOfflineCommandAuthorizedSender = typeof emailOfflineCommandAuthorizedSenders.$inferSelect;
export type InsertEmailOfflineCommandAuthorizedSender = typeof emailOfflineCommandAuthorizedSenders.$inferInsert;

export const emailOfflineCommandReceipts = mysqlTable("email_offline_command_receipts", {
  id: int("id").autoincrement().primaryKey(),
  settingsId: int("settingsId"),
  mailgunTokenHash: varchar("mailgunTokenHash", { length: 64 }).notNull().unique(),
  senderEmail: varchar("senderEmail", { length: 320 }),
  recipientEmail: varchar("recipientEmail", { length: 320 }),
  subject: varchar("subject", { length: 255 }),
  status: mysqlEnum("status", ["processing", "accepted", "rejected"]).notNull(),
  rejectionCode: varchar("rejectionCode", { length: 64 }),
  resultingMode: mysqlEnum("resultingMode", ["offline", "already_offline"]),
  replyStatus: mysqlEnum("replyStatus", ["sent", "failed"]),
  replySentAt: timestamp("replySentAt"),
  replyError: text("replyError"),
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),
  processedAt: timestamp("processedAt"),
}, (table) => [
  foreignKey({
    columns: [table.settingsId],
    foreignColumns: [emailOfflineCommandSettings.id],
    name: "eoc_receipt_settings_fk",
  }).onDelete("set null"),
  index("email_offline_command_receipts_received_index").on(table.receivedAt),
  index("email_offline_command_receipts_status_index").on(table.status, table.receivedAt),
]);

export type EmailOfflineCommandReceipt = typeof emailOfflineCommandReceipts.$inferSelect;
export type InsertEmailOfflineCommandReceipt = typeof emailOfflineCommandReceipts.$inferInsert;

// ─── Equipment Categories ─────────────────────────────────────────────────────
export const equipmentCategories = mysqlTable("equipment_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EquipmentCategory = typeof equipmentCategories.$inferSelect;
export type InsertEquipmentCategory = typeof equipmentCategories.$inferInsert;

// ─── Equipment ────────────────────────────────────────────────────────────────
export const equipment = mysqlTable("equipment", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  categoryId: int("categoryId").references(() => equipmentCategories.id),
  description: text("description"),
  totalQuantity: int("totalQuantity").default(1).notNull(),
  availableQuantity: int("availableQuantity").default(1).notNull(),
  status: mysqlEnum("status", ["available", "borrowed", "maintenance", "retired"]).default("available").notNull(),
  imageUrl: text("imageUrl"),
  serialNumber: varchar("serialNumber", { length: 128 }),
  location: varchar("location", { length: 256 }),
  deletedAt: timestamp("deletedAt"),
  deletedById: int("deletedById").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  qrCodeId: varchar("qrCodeId", { length: 128 }).unique().notNull().default(''),
});

export type Equipment = typeof equipment.$inferSelect;
export type InsertEquipment = typeof equipment.$inferInsert;

// ─── Equipment Location History ───────────────────────────────────────────────
export const equipmentLocationHistory = mysqlTable("equipment_location_history", {
 id: int("id").autoincrement().primaryKey(),
 equipmentId: int("equipmentId").notNull().references(() => equipment.id),
 previousLocation: varchar("previousLocation", { length: 256 }),
 newLocation: varchar("newLocation", { length: 256 }),
  changedById: int("changedById").references(() => users.id, { onDelete: "set null" }),
 changedAt: timestamp("changedAt").defaultNow().notNull(),
 note: text("note"),
 reviewStatus: mysqlEnum("reviewStatus", ["pending", "approved", "rejected"]).default("pending").notNull(),
 reviewNote: text("reviewNote"),
  reviewedById: int("reviewedById").references(() => users.id, { onDelete: "set null" }),
 reviewedAt: timestamp("reviewedAt"),
 signatureStatus: mysqlEnum("signatureStatus", ["unsigned", "signed"]).default("unsigned").notNull(),
  signedById: int("signedById").references(() => users.id, { onDelete: "set null" }),
  signedAt: timestamp("signedAt"),
  signatureMethod: varchar("signatureMethod", { length: 64 }),
}, (table) => [
  index("equipment_location_history_changed_at_idx").on(table.changedAt),
  index("equipment_location_history_equipment_changed_at_idx").on(table.equipmentId, table.changedAt),
  index("equipment_location_history_new_location_changed_at_idx").on(table.newLocation, table.changedAt),
  index("equipment_location_history_review_status_idx").on(table.reviewStatus, table.changedAt),
  index("equipment_location_history_signature_status_idx").on(table.signatureStatus, table.signedAt),
]);

export type EquipmentLocationHistory = typeof equipmentLocationHistory.$inferSelect;
export type InsertEquipmentLocationHistory = typeof equipmentLocationHistory.$inferInsert;

export const equipmentLocationMovementAlerts = mysqlTable("equipment_location_movement_alerts", {
  id: int("id").autoincrement().primaryKey(),
  equipmentId: int("equipmentId").notNull().references(() => equipment.id, { onDelete: "cascade" }),
  month: varchar("month", { length: 7 }).notNull(),
  thresholdCount: int("thresholdCount").notNull(),
 actualCount: int("actualCount").notNull(),
 notificationStatus: mysqlEnum("notificationStatus", ["pending", "sent", "failed", "suppressed"]).default("pending").notNull(),
 notificationError: text("notificationError"),
  triggeredById: int("triggeredById").references(() => users.id, { onDelete: "set null" }),
 alertedAt: timestamp("alertedAt").defaultNow().notNull(),
  lastSentAt: timestamp("lastSentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("equipment_location_movement_alerts_once_per_month_index").on(table.equipmentId, table.month),
  index("equipment_location_movement_alerts_month_status_index").on(table.month, table.notificationStatus),
]);

export type EquipmentLocationMovementAlert = typeof equipmentLocationMovementAlerts.$inferSelect;
export type InsertEquipmentLocationMovementAlert = typeof equipmentLocationMovementAlerts.$inferInsert;

// ─── QR Code Print History ────────────────────────────────────────────────────
export const qrPrintHistory = mysqlTable("qr_print_history", {
 id: int("id").autoincrement().primaryKey(),
  printedById: int("printedById").references(() => users.id, { onDelete: "set null" }),
 equipmentIds: text("equipmentIds").notNull(),
  equipmentCount: int("equipmentCount").notNull(),
  locationFilter: varchar("locationFilter", { length: 256 }),
  labelPaperSize: varchar("labelPaperSize", { length: 64 }).notNull(),
  printedAt: timestamp("printedAt").defaultNow().notNull(),
}, (table) => [
  index("qr_print_history_printed_by_idx").on(table.printedById),
  index("qr_print_history_printed_at_idx").on(table.printedAt),
]);

export type QrPrintHistory = typeof qrPrintHistory.$inferSelect;
export type InsertQrPrintHistory = typeof qrPrintHistory.$inferInsert;

// ─── Borrow Requests ──────────────────────────────────────────────────────────
export const borrowRequests = mysqlTable("borrow_requests", {
  id: int("id").autoincrement().primaryKey(),
  equipmentId: int("equipmentId").notNull().references(() => equipment.id),
  requesterId: int("requesterId").notNull().references(() => users.id),
  quantity: int("quantity").default(1).notNull(),
  borrowDate: timestamp("borrowDate").notNull(),
  returnDate: timestamp("returnDate").notNull(),
  purpose: text("purpose"),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "cancelled"]).default("pending").notNull(),
  reviewerId: int("reviewerId").references(() => users.id),
  reviewNote: text("reviewNote"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BorrowRequest = typeof borrowRequests.$inferSelect;
export type InsertBorrowRequest = typeof borrowRequests.$inferInsert;

// ─── Borrow Records ───────────────────────────────────────────────────────────
export const borrowRecords = mysqlTable("borrow_records", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").references(() => borrowRequests.id),
  equipmentId: int("equipmentId").notNull().references(() => equipment.id),
  borrowerId: int("borrowerId").notNull().references(() => users.id),
  quantity: int("quantity").default(1).notNull(),
  borrowedAt: timestamp("borrowedAt").notNull(),
  expectedReturnAt: timestamp("expectedReturnAt").notNull(),
  actualReturnAt: timestamp("actualReturnAt"),
  status: mysqlEnum("status", ["active", "returned", "overdue"]).default("active").notNull(),
  returnNote: text("returnNote"),
  handledById: int("handledById").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BorrowRecord = typeof borrowRecords.$inferSelect;
export type InsertBorrowRecord = typeof borrowRecords.$inferInsert;

// ─── Borrow Return Reminders ──────────────────────────────────────────────────
export const overdueBorrowReminderSchedules = mysqlTable("overdue_borrow_reminder_schedules", {
  id: int("id").autoincrement().primaryKey(),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }).unique(),
  isActive: boolean("isActive").default(true).notNull(),
  lastRunAt: timestamp("lastRunAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("overdue_borrow_reminder_schedule_task_index").on(table.scheduleCronTaskUid),
]);

export const borrowReturnReminders = mysqlTable("borrow_return_reminders", {
  id: int("id").autoincrement().primaryKey(),
  borrowRecordId: int("borrowRecordId").notNull().references(() => borrowRecords.id, { onDelete: "cascade" }),
  borrowerId: int("borrowerId").notNull().references(() => users.id, { onDelete: "cascade" }),
  reminderType: mysqlEnum("reminderType", ["due_soon", "overdue"]).notNull(),
  reminderDate: varchar("reminderDate", { length: 10 }).notNull(),
  emailStatus: mysqlEnum("emailStatus", ["pending", "sent", "failed", "skipped"]).default("pending").notNull(),
  emailSentAt: timestamp("emailSentAt"),
  emailError: text("emailError"),
  resendCount: int("resendCount").default(0).notNull(),
  lastResentAt: timestamp("lastResentAt"),
  lastResentById: int("lastResentById").references(() => users.id),
  inAppReadAt: timestamp("inAppReadAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("borrow_return_reminders_once_per_day_index").on(table.borrowRecordId, table.reminderType, table.reminderDate),
  index("borrow_return_reminders_borrower_read_index").on(table.borrowerId, table.inAppReadAt),
]);

export type OverdueBorrowReminderSchedule = typeof overdueBorrowReminderSchedules.$inferSelect;
export type BorrowReturnReminder = typeof borrowReturnReminders.$inferSelect;
export type InsertBorrowReturnReminder = typeof borrowReturnReminders.$inferInsert;

// --- Login Audit Logs ---
export const loginAuditLogs = mysqlTable("login_audit_logs", {
 id: int("id").autoincrement().primaryKey(),
 username: varchar("username", { length: 64 }).notNull(),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
 ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  status: mysqlEnum("status", ["success", "failed"]).notNull(),
  loginMethod: mysqlEnum("loginMethod", ["password", "passkey"]).default("password").notNull(),
  failureReason: varchar("failureReason", { length: 255 }),
  loginAt: timestamp("loginAt").defaultNow().notNull(),
});

export type LoginAuditLog = typeof loginAuditLogs.$inferSelect;
export type InsertLoginAuditLog = typeof loginAuditLogs.$inferInsert;

// --- Two-Factor Authentication ---
export const twoFactorAuthenticators = mysqlTable("two_factor_authenticators", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  encryptedSecret: varchar("encryptedSecret", { length: 512 }).notNull(),
  isEnabled: boolean("isEnabled").default(false).notNull(),
  enabledAt: timestamp("enabledAt"),
  lastUsedAt: timestamp("lastUsedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TwoFactorAuthenticator = typeof twoFactorAuthenticators.$inferSelect;
export type InsertTwoFactorAuthenticator = typeof twoFactorAuthenticators.$inferInsert;

export const twoFactorLoginChallenges = mysqlTable("two_factor_login_challenges", {
  id: int("id").autoincrement().primaryKey(),
  challengeToken: varchar("challengeToken", { length: 128 }).notNull().unique(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  attemptCount: int("attemptCount").default(0).notNull(),
  secondFactorVerifiedAt: timestamp("secondFactorVerifiedAt"),
  loginMethod: mysqlEnum("loginMethod", ["password", "passkey"]).default("password").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TwoFactorLoginChallenge = typeof twoFactorLoginChallenges.$inferSelect;
export type InsertTwoFactorLoginChallenge = typeof twoFactorLoginChallenges.$inferInsert;

// --- Two-Factor Recovery Codes ---
// 僅保存不可逆雜湊；明碼只會在產生時回傳給使用者一次。
export const twoFactorRecoveryCodes = mysqlTable("two_factor_recovery_codes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  codeHash: varchar("codeHash", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  usedAt: timestamp("usedAt"),
  revokedAt: timestamp("revokedAt"),
}, (table) => [
  index("two_factor_recovery_codes_user_status_index").on(table.userId, table.usedAt, table.revokedAt),
]);

export type TwoFactorRecoveryCode = typeof twoFactorRecoveryCodes.$inferSelect;
export type InsertTwoFactorRecoveryCode = typeof twoFactorRecoveryCodes.$inferInsert;

export const firstLoginSetupChallenges = mysqlTable("first_login_setup_challenges", {
  id: int("id").autoincrement().primaryKey(),
  challengeToken: varchar("challengeToken", { length: 128 }).notNull().unique(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("first_login_setup_challenge_user_index").on(table.userId)]);

export type FirstLoginSetupChallenge = typeof firstLoginSetupChallenges.$inferSelect;
export type InsertFirstLoginSetupChallenge = typeof firstLoginSetupChallenges.$inferInsert;

// --- WebAuthn Passkeys ---
export const passkeyCredentials = mysqlTable("passkey_credentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  credentialId: varchar("credentialId", { length: 512 }).notNull().unique(),
  webauthnUserId: varchar("webauthnUserId", { length: 128 }).notNull(),
  publicKey: text("publicKey").notNull(),
  counter: int("counter").default(0).notNull(),
  deviceType: varchar("deviceType", { length: 32 }).default("multiDevice").notNull(),
  backedUp: boolean("backedUp").default(false).notNull(),
  transports: text("transports"),
  name: varchar("name", { length: 128 }).notNull(),
  registeredDeviceLabel: varchar("registeredDeviceLabel", { length: 128 }).default("未知裝置").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PasskeyCredential = typeof passkeyCredentials.$inferSelect;
export type InsertPasskeyCredential = typeof passkeyCredentials.$inferInsert;

export const passkeyChallenges = mysqlTable("passkey_challenges", {
  id: int("id").autoincrement().primaryKey(),
  challenge: varchar("challenge", { length: 512 }).notNull().unique(),
  type: mysqlEnum("type", ["registration", "authentication"]).notNull(),
  userId: int("userId").references(() => users.id, { onDelete: "cascade" }),
  passkeyName: varchar("passkeyName", { length: 128 }),
  rpId: varchar("rpId", { length: 255 }).notNull(),
  origin: varchar("origin", { length: 512 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PasskeyChallenge = typeof passkeyChallenges.$inferSelect;
export type InsertPasskeyChallenge = typeof passkeyChallenges.$inferInsert;

export const accountActivationCertificateDeliveries = mysqlTable("account_activation_certificate_deliveries", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull().references(() => users.id, { onDelete: "cascade" }),
  sentById: int("sentById").notNull().references(() => users.id),
  recipientEmailMasked: varchar("recipientEmailMasked", { length: 320 }).notNull(),
  recipientEmailCiphertext: varchar("recipientEmailCiphertext", { length: 1024 }),
  certificateNumber: varchar("certificateNumber", { length: 128 }).notNull(),
  hasPdfAttachment: boolean("hasPdfAttachment").default(false).notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});

export type AccountActivationCertificateDelivery = typeof accountActivationCertificateDeliveries.$inferSelect;

// ─── Account Activation Certificate Exports ──────────────────────────────────
export const accountActivationCertificateExports = mysqlTable("account_activation_certificate_exports", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull().references(() => users.id, { onDelete: "cascade" }),
  generatedById: int("generatedById").notNull().references(() => users.id, { onDelete: "cascade" }),
  certificateNumber: varchar("certificateNumber", { length: 128 }).notNull(),
  verificationToken: varchar("verificationToken", { length: 96 }).notNull().unique(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  source: mysqlEnum("source", ["email_attachment", "preview", "manual_download"]).notNull(),
  downloadCount: int("downloadCount").default(0).notNull(),
  firstDownloadedAt: timestamp("firstDownloadedAt"),
  lastDownloadedAt: timestamp("lastDownloadedAt"),
  status: mysqlEnum("status", ["valid", "revoked", "expired"]).default("valid").notNull(),
  statusChangedAt: timestamp("statusChangedAt"),
  statusChangedById: int("statusChangedById").references(() => users.id, { onDelete: "set null" }),
  statusReason: text("statusReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("activation_certificate_exports_account_created_index").on(table.accountId, table.createdAt),
  index("activation_certificate_exports_number_created_index").on(table.certificateNumber, table.createdAt),
  index("activation_certificate_exports_status_created_index").on(table.status, table.createdAt),
]);

export type AccountActivationCertificateExport = typeof accountActivationCertificateExports.$inferSelect;
export type InsertAccountActivationCertificateExport = typeof accountActivationCertificateExports.$inferInsert;

// ─── Password Change Reminder Schedule ───────────────────────────────────────
export const passwordChangeReminderSchedules = mysqlTable("password_change_reminder_schedules", {
  id: int("id").autoincrement().primaryKey(),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }).unique(),
  isActive: boolean("isActive").default(true).notNull(),
  lastRunAt: timestamp("lastRunAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("password_change_reminder_schedule_task_index").on(table.scheduleCronTaskUid),
]);

export type PasswordChangeReminderSchedule = typeof passwordChangeReminderSchedules.$inferSelect;

// ─── System Reports ──────────────────────────────────────────────────────────
export const systemReports = mysqlTable("system_reports", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 160 }).notNull(),
  content: text("content").notNull(),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
  isPinned: boolean("isPinned").default(false).notNull(),
  priority: mysqlEnum("priority", ["normal", "important", "urgent"]).default("normal").notNull(),
  authorId: int("authorId").notNull().references(() => users.id),
  publishedAt: timestamp("publishedAt"),
  expiresAt: timestamp("expiresAt"),
  mustReadBy: timestamp("mustReadBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("system_reports_pinned_published_index").on(table.isPinned, table.publishedAt),
]);

export type SystemReport = typeof systemReports.$inferSelect;
export type InsertSystemReport = typeof systemReports.$inferInsert;

export const systemReportReads = mysqlTable("system_report_reads", {
  id: int("id").autoincrement().primaryKey(),
  reportId: int("reportId").notNull().references(() => systemReports.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  readAt: timestamp("readAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("system_report_reads_report_user_unique").on(table.reportId, table.userId),
]);

export type SystemReportRead = typeof systemReportReads.$inferSelect;
export type InsertSystemReportRead = typeof systemReportReads.$inferInsert;

export const systemReportAssets = mysqlTable("system_report_assets", {
  id: int("id").autoincrement().primaryKey(),
  reportId: int("reportId").notNull().references(() => systemReports.id, { onDelete: "cascade" }),
  assetKind: mysqlEnum("assetKind", ["image", "attachment"]).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  url: varchar("url", { length: 1024 }).notNull(),
  mimeType: varchar("mimeType", { length: 127 }).notNull(),
  sizeBytes: int("sizeBytes").notNull(),
  downloadCount: int("downloadCount").default(0).notNull(),
  uploadedById: int("uploadedById").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("system_report_assets_report_index").on(table.reportId),
]);

export type SystemReportAsset = typeof systemReportAssets.$inferSelect;
export type InsertSystemReportAsset = typeof systemReportAssets.$inferInsert;

// ─── Media Service Calendar Events ───────────────────────────────────────────
export const mediaCalendarEvents = mysqlTable("media_calendar_events", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 160 }).notNull(),
  category: mysqlEnum("category", ["activity", "duty", "equipment", "meeting", "other"]).default("activity").notNull(),
  startsAt: timestamp("startsAt").notNull(),
  endsAt: timestamp("endsAt"),
  allDay: boolean("allDay").default(false).notNull(),
  location: varchar("location", { length: 160 }),
  description: text("description"),
  createdById: int("createdById").notNull().references(() => users.id),
  updatedById: int("updatedById").references(() => users.id, { onDelete: "set null" }),
  googleEventId: varchar("googleEventId", { length: 255 }),
  googleCalendarUpdatedAt: timestamp("googleCalendarUpdatedAt"),
  googleSyncStatus: mysqlEnum("googleSyncStatus", ["pending", "synced", "error", "disabled"]).default("disabled").notNull(),
  googleSyncError: text("googleSyncError"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("media_calendar_events_starts_at_index").on(table.startsAt),
  index("media_calendar_events_category_starts_at_index").on(table.category, table.startsAt),
  index("media_calendar_events_created_by_index").on(table.createdById),
  uniqueIndex("media_calendar_events_google_event_unique").on(table.googleEventId),
]);

export type MediaCalendarEvent = typeof mediaCalendarEvents.$inferSelect;
export type InsertMediaCalendarEvent = typeof mediaCalendarEvents.$inferInsert;

// ─── Media Service Project Proposals ──────────────────────────────────────────
export const mediaProjectProposals = mysqlTable("media_project_proposals", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 160 }).notNull(),
  summary: varchar("summary", { length: 320 }),
  content: text("content").notNull(),
  proposedStartAt: timestamp("proposedStartAt"),
  proposedEndAt: timestamp("proposedEndAt"),
  requestedBudget: decimal("requestedBudget", { precision: 12, scale: 2 }),
  status: mysqlEnum("status", ["draft", "submitted", "approved", "returned", "rejected"]).default("draft").notNull(),
  applicantId: int("applicantId").notNull().references(() => users.id, { onDelete: "cascade" }),
  reviewerId: int("reviewerId").references(() => users.id, { onDelete: "set null" }),
  reviewNote: text("reviewNote"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("media_project_proposals_applicant_status_index").on(table.applicantId, table.status, table.createdAt),
  index("media_project_proposals_status_created_at_index").on(table.status, table.createdAt),
]);

export type MediaProjectProposal = typeof mediaProjectProposals.$inferSelect;
export type InsertMediaProjectProposal = typeof mediaProjectProposals.$inferInsert;

// ─── Podcast Shows & Episodes ─────────────────────────────────────────────────
export const podcastShows = mysqlTable("podcast_shows", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 160 }).notNull(),
  description: text("description"),
  slug: varchar("slug", { length: 180 }).unique(),
  authorName: varchar("authorName", { length: 160 }),
  ownerEmail: varchar("ownerEmail", { length: 320 }),
  language: varchar("language", { length: 16 }).default("zh-TW").notNull(),
  artworkUrl: text("artworkUrl"),
  isExplicit: boolean("isExplicit").default(false).notNull(),
  rssEnabled: boolean("rssEnabled").default(false).notNull(),
  status: mysqlEnum("status", ["draft", "published"]).default("draft").notNull(),
  createdById: int("createdById").notNull().references(() => users.id, { onDelete: "cascade" }),
  updatedById: int("updatedById").references(() => users.id, { onDelete: "set null" }),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("podcast_shows_status_published_at_index").on(table.status, table.publishedAt),
  index("podcast_shows_created_by_index").on(table.createdById),
]);

export type PodcastShow = typeof podcastShows.$inferSelect;
export type InsertPodcastShow = typeof podcastShows.$inferInsert;

export const podcastEpisodes = mysqlTable("podcast_episodes", {
  id: int("id").autoincrement().primaryKey(),
  showId: int("showId").notNull().references(() => podcastShows.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 160 }).notNull(),
  description: text("description"),
  episodeNumber: int("episodeNumber").notNull(),
  audioFileName: varchar("audioFileName", { length: 255 }).notNull(),
  audioStorageKey: varchar("audioStorageKey", { length: 1024 }).notNull(),
  audioUrl: text("audioUrl").notNull(),
  audioMimeType: varchar("audioMimeType", { length: 96 }).notNull(),
  audioSizeBytes: int("audioSizeBytes").notNull(),
  status: mysqlEnum("status", ["draft", "published"]).default("draft").notNull(),
  createdById: int("createdById").notNull().references(() => users.id, { onDelete: "cascade" }),
  updatedById: int("updatedById").references(() => users.id, { onDelete: "set null" }),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("podcast_episodes_show_episode_number_unique").on(table.showId, table.episodeNumber),
  index("podcast_episodes_show_status_number_index").on(table.showId, table.status, table.episodeNumber),
  index("podcast_episodes_created_by_index").on(table.createdById),
]);

export type PodcastEpisode = typeof podcastEpisodes.$inferSelect;
export type InsertPodcastEpisode = typeof podcastEpisodes.$inferInsert;

export const podcastDistributionTargets = mysqlTable("podcast_distribution_targets", {
  id: int("id").autoincrement().primaryKey(),
  showId: int("showId").notNull().references(() => podcastShows.id, { onDelete: "cascade" }),
  platform: mysqlEnum("platform", ["spotify", "apple_podcasts", "amazon_music", "youtube", "other"]).notNull(),
  status: mysqlEnum("status", ["not_submitted", "submitted", "active", "attention"]).default("not_submitted").notNull(),
  directoryUrl: text("directoryUrl"),
  note: text("note"),
  submittedAt: timestamp("submittedAt"),
  lastConfirmedAt: timestamp("lastConfirmedAt"),
  updatedById: int("updatedById").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("podcast_distribution_targets_show_platform_unique").on(table.showId, table.platform),
  index("podcast_distribution_targets_show_status_index").on(table.showId, table.status),
]);

export type PodcastDistributionTarget = typeof podcastDistributionTargets.$inferSelect;
export type InsertPodcastDistributionTarget = typeof podcastDistributionTargets.$inferInsert;

// ─── Reimbursement Claims ────────────────────────────────────────────────────
export const reimbursementClaims = mysqlTable("reimbursement_claims", {
  id: int("id").autoincrement().primaryKey(),
  claimNumber: varchar("claimNumber", { length: 32 }).notNull().unique(),
  requesterId: int("requesterId").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 160 }).notNull(),
  purpose: text("purpose"),
  status: mysqlEnum("status", ["draft", "submitted", "approved", "rejected", "paid"]).default("draft").notNull(),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  submittedAt: timestamp("submittedAt"),
  reviewedById: int("reviewedById").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewedAt"),
  reviewNote: text("reviewNote"),
  paidById: int("paidById").references(() => users.id, { onDelete: "set null" }),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("reimbursement_claims_requester_status_index").on(table.requesterId, table.status),
  index("reimbursement_claims_status_created_index").on(table.status, table.createdAt),
]);

export type ReimbursementClaim = typeof reimbursementClaims.$inferSelect;
export type InsertReimbursementClaim = typeof reimbursementClaims.$inferInsert;

export const reimbursementItems = mysqlTable("reimbursement_items", {
  id: int("id").autoincrement().primaryKey(),
  claimId: int("claimId").notNull().references(() => reimbursementClaims.id, { onDelete: "cascade" }),
  expenseDate: timestamp("expenseDate").notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  merchant: varchar("merchant", { length: 160 }),
  description: varchar("description", { length: 500 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("reimbursement_items_claim_index").on(table.claimId),
]);

export type ReimbursementItem = typeof reimbursementItems.$inferSelect;
export type InsertReimbursementItem = typeof reimbursementItems.$inferInsert;

export const reimbursementReceipts = mysqlTable("reimbursement_receipts", {
  id: int("id").autoincrement().primaryKey(),
  claimId: int("claimId").notNull().references(() => reimbursementClaims.id, { onDelete: "cascade" }),
  itemId: int("itemId").references(() => reimbursementItems.id, { onDelete: "set null" }),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  storageKey: text("storageKey").notNull(),
  url: text("url").notNull(),
  mimeType: varchar("mimeType", { length: 127 }).notNull(),
  sizeBytes: int("sizeBytes").notNull(),
  uploadedById: int("uploadedById").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("reimbursement_receipts_claim_index").on(table.claimId),
]);

export type ReimbursementReceipt = typeof reimbursementReceipts.$inferSelect;
export type InsertReimbursementReceipt = typeof reimbursementReceipts.$inferInsert;

export const reimbursementAnnualBudgets = mysqlTable("reimbursement_annual_budgets", {
  id: int("id").autoincrement().primaryKey(),
  year: int("year").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  setById: int("setById").references(() => users.id).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("reimbursement_annual_budgets_year_unique").on(table.year)]);

export type ReimbursementAnnualBudget = typeof reimbursementAnnualBudgets.$inferSelect;
export type InsertReimbursementAnnualBudget = typeof reimbursementAnnualBudgets.$inferInsert;

export const reimbursementNotifications = mysqlTable("reimbursement_notifications", {
  id: int("id").autoincrement().primaryKey(),
  claimId: int("claimId").notNull().references(() => reimbursementClaims.id, { onDelete: "cascade" }),
  recipientId: int("recipientId").notNull().references(() => users.id, { onDelete: "cascade" }),
  notificationType: mysqlEnum("notificationType", ["approved", "rejected"]).notNull(),
  message: varchar("message", { length: 500 }).notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("reimbursement_notifications_recipient_read_index").on(table.recipientId, table.isRead, table.createdAt),
  index("reimbursement_notifications_claim_index").on(table.claimId),
]);

export type ReimbursementNotification = typeof reimbursementNotifications.$inferSelect;
export type InsertReimbursementNotification = typeof reimbursementNotifications.$inferInsert;

// --- Login Devices ---
export const loginDevices = mysqlTable("login_devices", {
  id: int("id").autoincrement().primaryKey(),
  deviceId: varchar("deviceId", { length: 128 }).notNull().unique(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  deviceName: varchar("deviceName", { length: 255 }).notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  geoCountry: varchar("geoCountry", { length: 128 }),
  geoRegion: varchar("geoRegion", { length: 128 }),
  geoCity: varchar("geoCity", { length: 128 }),
  geoTimezone: varchar("geoTimezone", { length: 64 }),
  geoAsn: varchar("geoAsn", { length: 32 }),
  geoIsp: varchar("geoIsp", { length: 255 }),
  geoOrganization: varchar("geoOrganization", { length: 255 }),
  geoDomain: varchar("geoDomain", { length: 255 }),
  geoSource: varchar("geoSource", { length: 64 }),
  geoResolvedAt: timestamp("geoResolvedAt"),
  firstSeenAt: timestamp("firstSeenAt").defaultNow().notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  revokedAt: timestamp("revokedAt"),
});

export type LoginDevice = typeof loginDevices.$inferSelect;
export type InsertLoginDevice = typeof loginDevices.$inferInsert;

// --- Login Device Alerts ---
export const loginDeviceAlerts = mysqlTable("login_device_alerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  deviceId: varchar("deviceId", { length: 128 }).notNull().references(() => loginDevices.deviceId, { onDelete: "cascade" }),
  status: mysqlEnum("status", ["pending", "confirmed", "revoked"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  confirmedAt: timestamp("confirmedAt"),
});

export type LoginDeviceAlert = typeof loginDeviceAlerts.$inferSelect;
export type InsertLoginDeviceAlert = typeof loginDeviceAlerts.$inferInsert;

// --- Account Deduplication Maintenance ---
export const accountDeduplicationSchedules = mysqlTable("account_deduplication_schedules", {
  id: int("id").autoincrement().primaryKey(),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }).unique(),
  isActive: boolean("isActive").default(true).notNull(),
  lastRunAt: timestamp("lastRunAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const accountDeduplicationReports = mysqlTable("account_deduplication_reports", {
  id: int("id").autoincrement().primaryKey(),
  scheduleId: int("scheduleId").references(() => accountDeduplicationSchedules.id, { onDelete: "set null" }),
  duplicateGroupCount: int("duplicateGroupCount").default(0).notNull(),
  reportJson: text("reportJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AccountDeduplicationSchedule = typeof accountDeduplicationSchedules.$inferSelect;
export type AccountDeduplicationReport = typeof accountDeduplicationReports.$inferSelect;

// --- IP Blacklist ---
export const ipBlacklist = mysqlTable("ip_blacklist", {
  id: int("id").autoincrement().primaryKey(),
  ipAddress: varchar("ipAddress", { length: 45 }).notNull().unique(),
  note: text("note"),
  isActive: boolean("isActive").default(true).notNull(),
  createdById: int("createdById").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IpBlacklistEntry = typeof ipBlacklist.$inferSelect;
export type InsertIpBlacklistEntry = typeof ipBlacklist.$inferInsert;

// --- User Preferences ---
export const userPreferences = mysqlTable("user_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  theme: mysqlEnum("theme", ["light", "dark", "system"]).default("dark").notNull(),
  language: varchar("language", { length: 10 }).default("zh-TW").notNull(),
  notificationsEnabled: boolean("notificationsEnabled").default(true).notNull(),
  emailNotifications: boolean("emailNotifications").default(false).notNull(),
  borrowingNotifications: boolean("borrowingNotifications").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = typeof userPreferences.$inferInsert;

// --- Operation Logs ---
export const operationLogs = mysqlTable("operation_logs", {
 id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
 username: varchar("username", { length: 64 }).notNull(),
  action: varchar("action", { length: 64 }).notNull(), // create, update, delete, approve, reject, etc.
  entityType: varchar("entityType", { length: 64 }).notNull(), // equipment, user, borrowRequest, borrowRecord, etc.
  entityId: int("entityId"),
  entityName: varchar("entityName", { length: 255 }),
  details: text("details"), // JSON string with additional details
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OperationLog = typeof operationLogs.$inferSelect;
export type InsertOperationLog = typeof operationLogs.$inferInsert;

// --- Audit Event Resolutions ---
export const auditEventResolutions = mysqlTable("audit_event_resolutions", {
  id: int("id").autoincrement().primaryKey(),
  sourceType: mysqlEnum("sourceType", ["loginAudit", "operationLog"]).notNull(),
  sourceEventId: int("sourceEventId").notNull(),
 status: mysqlEnum("status", ["in_progress", "closed"]).default("in_progress").notNull(),
 handlingNote: text("handlingNote").notNull(),
  handledById: int("handledById").references(() => users.id, { onDelete: "set null" }),
 handledAt: timestamp("handledAt").defaultNow().notNull(),
  closedAt: timestamp("closedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("audit_event_resolutions_source_unique").on(table.sourceType, table.sourceEventId),
  index("audit_event_resolutions_status_handled_at_index").on(table.status, table.handledAt),
]);

export type AuditEventResolution = typeof auditEventResolutions.$inferSelect;
export type InsertAuditEventResolution = typeof auditEventResolutions.$inferInsert;

// ─── Operation Log Retention ──────────────────────────────────────────────────
export const operationLogRetentionSchedules = mysqlTable("operation_log_retention_schedules", {
  id: int("id").autoincrement().primaryKey(),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }).unique(),
  retentionDays: int("retentionDays").default(365).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  lastRunAt: timestamp("lastRunAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OperationLogRetentionSchedule = typeof operationLogRetentionSchedules.$inferSelect;

export const operationLogRetentionRuns = mysqlTable("operation_log_retention_runs", {
  id: int("id").autoincrement().primaryKey(),
  scheduleId: int("scheduleId").notNull().references(() => operationLogRetentionSchedules.id, { onDelete: "cascade" }),
  cutoffAt: timestamp("cutoffAt").notNull(),
  deletedCount: int("deletedCount").notNull(),
  ranAt: timestamp("ranAt").defaultNow().notNull(),
}, (table) => [
  index("operation_log_retention_runs_schedule_index").on(table.scheduleId, table.ranAt),
]);

export type OperationLogRetentionRun = typeof operationLogRetentionRuns.$inferSelect;

// ─── Brand Logo Load Failures ─────────────────────────────────────────────────
export const brandLogoLoadFailures = mysqlTable("brand_logo_load_failures", {
  id: int("id").autoincrement().primaryKey(),
  pagePath: varchar("pagePath", { length: 512 }).notNull(),
  failedSrc: varchar("failedSrc", { length: 1024 }).notNull(),
  deviceClass: mysqlEnum("deviceClass", ["mobile", "tablet", "desktop", "unknown"]).default("unknown").notNull(),
  viewportWidth: int("viewportWidth"),
  failureStage: mysqlEnum("failureStage", ["initial", "retry", "fallback"]).notNull(),
  fallbackSrc: varchar("fallbackSrc", { length: 1024 }),
 recoveryOutcome: mysqlEnum("recoveryOutcome", ["switched", "text_fallback"]),
 userAgent: text("userAgent"),
  reporterUserId: int("reporterUserId").references(() => users.id, { onDelete: "set null" }),
 reportedAt: timestamp("reportedAt").defaultNow().notNull(),
});

export type BrandLogoLoadFailure = typeof brandLogoLoadFailures.$inferSelect;
export type InsertBrandLogoLoadFailure = typeof brandLogoLoadFailures.$inferInsert;

// ─── Brand Logo Alert Thresholds ──────────────────────────────────────────────
export const brandLogoAlertThresholds = mysqlTable("brand_logo_alert_thresholds", {
  id: int("id").autoincrement().primaryKey(),
  thresholdCount: int("thresholdCount").default(3).notNull(),
  isEnabled: boolean("isEnabled").default(true).notNull(),
  createdById: int("createdById").notNull().references(() => users.id),
  updatedById: int("updatedById").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("brand_logo_alert_thresholds_updated_index").on(table.updatedAt),
]);

export type BrandLogoAlertThreshold = typeof brandLogoAlertThresholds.$inferSelect;
export type InsertBrandLogoAlertThreshold = typeof brandLogoAlertThresholds.$inferInsert;

// ─── System Alert Email Recipients ───────────────────────────────────────────
export const systemAlertEmailRecipients = mysqlTable("system_alert_email_recipients", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  label: varchar("label", { length: 128 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdById: int("createdById").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemAlertEmailRecipient = typeof systemAlertEmailRecipients.$inferSelect;
export type InsertSystemAlertEmailRecipient = typeof systemAlertEmailRecipients.$inferInsert;

// ─── System Alert Email Deliveries ───────────────────────────────────────────
export const systemAlertEmailDeliveries = mysqlTable("system_alert_email_deliveries", {
  id: int("id").autoincrement().primaryKey(),
  recipientId: int("recipientId").references(() => systemAlertEmailRecipients.id, { onDelete: "set null" }),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  eventKey: varchar("eventKey", { length: 191 }).notNull(),
  source: varchar("source", { length: 128 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["sent", "failed", "suppressed"]).notNull(),
  errorDetail: text("errorDetail"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SystemAlertEmailDelivery = typeof systemAlertEmailDeliveries.$inferSelect;
export type InsertSystemAlertEmailDelivery = typeof systemAlertEmailDeliveries.$inferInsert;

// ─── PIN Failure Attempts ────────────────────────────────────────────────────

export const pinFailureAttempts = mysqlTable("pin_failure_attempts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  attemptCount: int("attemptCount").default(0).notNull(),
  lastAttemptAt: timestamp("lastAttemptAt").defaultNow().notNull(),
  lockedUntil: timestamp("lockedUntil"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PinFailureAttempt = typeof pinFailureAttempts.$inferSelect;
export type InsertPinFailureAttempt = typeof pinFailureAttempts.$inferInsert;

// ─── Founder Login PIN Failure Attempts ───────────────────────────────────────

export const loginPinFailureAttempts = mysqlTable("login_pin_failure_attempts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  attemptCount: int("attemptCount").default(0).notNull(),
  lastAttemptAt: timestamp("lastAttemptAt").defaultNow().notNull(),
  lockedUntil: timestamp("lockedUntil"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("login_pin_failure_attempts_user_id_unique").on(table.userId),
]);

export type LoginPinFailureAttempt = typeof loginPinFailureAttempts.$inferSelect;
export type InsertLoginPinFailureAttempt = typeof loginPinFailureAttempts.$inferInsert;

// ─── Login Failure Attempts ──────────────────────────────────────────────────

export const loginFailureAttempts = mysqlTable("login_failure_attempts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  attemptCount: int("attemptCount").default(0).notNull(),
  lastAttemptAt: timestamp("lastAttemptAt").defaultNow().notNull(),
  lockedUntil: timestamp("lockedUntil"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LoginFailureAttempt = typeof loginFailureAttempts.$inferSelect;
export type InsertLoginFailureAttempt = typeof loginFailureAttempts.$inferInsert;

// ─── Email Verification ──────────────────────────────────────────────────────
export const emailVerifications = mysqlTable("email_verifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 320 }).notNull(),
  verificationCode: varchar("verificationCode", { length: 6 }).notNull(),
  isVerified: boolean("isVerified").default(false).notNull(),
  attemptCount: int("attemptCount").default(0).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  verifiedAt: timestamp("verifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type EmailVerification = typeof emailVerifications.$inferSelect;
export type InsertEmailVerification = typeof emailVerifications.$inferInsert;

// ─── Phone Verification ──────────────────────────────────────────────────────
export const phoneVerifications = mysqlTable("phone_verifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  phone: varchar("phone", { length: 20 }).notNull(),
  verificationCode: varchar("verificationCode", { length: 6 }).notNull(),
  isVerified: boolean("isVerified").default(false).notNull(),
  attemptCount: int("attemptCount").default(0).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  verifiedAt: timestamp("verifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PhoneVerification = typeof phoneVerifications.$inferSelect;
export type InsertPhoneVerification = typeof phoneVerifications.$inferInsert;
