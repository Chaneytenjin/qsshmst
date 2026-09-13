import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateAuthenticationOptions: vi.fn(),
  generateRegistrationOptions: vi.fn(),
  verifyAuthenticationResponse: vi.fn(),
  verifyRegistrationResponse: vi.fn(),
  createPasskeyChallenge: vi.fn(),
  consumePasskeyChallenge: vi.fn(),
  getPasskeyCredentialByCredentialId: vi.fn(),
  getUserById: vi.fn(),
  getIpBlacklistEntry: vi.fn(),
  isLoginLocked: vi.fn(),
  getLoginLockTimeRemaining: vi.fn(),
  updatePasskeyCredentialUsage: vi.fn(),
  resetLoginFailureAttempts: vi.fn(),
  createOperationLog: vi.fn(),
  createLoginAuditLog: vi.fn(),
  getTwoFactorAuthenticator: vi.fn(),
  createTwoFactorLoginChallenge: vi.fn(),
  getLoginDeviceById: vi.fn(),
  countActiveLoginDevices: vi.fn(),
  recordLoginDevice: vi.fn(),
  upsertUser: vi.fn(),
  listPasskeyCredentials: vi.fn(),
  createPasskeyCredential: vi.fn(),
  deletePasskeyCredential: vi.fn(),
  getLatestEmailVerification: vi.fn(),
  getSystemMaintenanceSettings: vi.fn(),
  sendPasskeySecurityEmail: vi.fn(),
  createSessionToken: vi.fn(),
  setHeader: vi.fn(),
}));

vi.mock("@simplewebauthn/server", () => ({
  generateAuthenticationOptions: mocks.generateAuthenticationOptions,
  generateRegistrationOptions: mocks.generateRegistrationOptions,
  verifyAuthenticationResponse: mocks.verifyAuthenticationResponse,
  verifyRegistrationResponse: mocks.verifyRegistrationResponse,
}));

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    createPasskeyChallenge: mocks.createPasskeyChallenge,
    consumePasskeyChallenge: mocks.consumePasskeyChallenge,
    getPasskeyCredentialByCredentialId: mocks.getPasskeyCredentialByCredentialId,
    getUserById: mocks.getUserById,
    getIpBlacklistEntry: mocks.getIpBlacklistEntry,
    isLoginLocked: mocks.isLoginLocked,
    getLoginLockTimeRemaining: mocks.getLoginLockTimeRemaining,
    updatePasskeyCredentialUsage: mocks.updatePasskeyCredentialUsage,
    resetLoginFailureAttempts: mocks.resetLoginFailureAttempts,
    createOperationLog: mocks.createOperationLog,
    createLoginAuditLog: mocks.createLoginAuditLog,
    getTwoFactorAuthenticator: mocks.getTwoFactorAuthenticator,
    createTwoFactorLoginChallenge: mocks.createTwoFactorLoginChallenge,
    getLoginDeviceById: mocks.getLoginDeviceById,
    countActiveLoginDevices: mocks.countActiveLoginDevices,
    recordLoginDevice: mocks.recordLoginDevice,
    upsertUser: mocks.upsertUser,
    listPasskeyCredentials: mocks.listPasskeyCredentials,
    createPasskeyCredential: mocks.createPasskeyCredential,
    deletePasskeyCredential: mocks.deletePasskeyCredential,
    getLatestEmailVerification: mocks.getLatestEmailVerification,
    getSystemMaintenanceSettings: mocks.getSystemMaintenanceSettings,
    logOperation: mocks.logOperation,
  };
});

vi.mock("./passkeySecurityEmail", () => ({
  sendPasskeySecurityEmail: mocks.sendPasskeySecurityEmail,
}));

vi.mock("./_core/sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./_core/sdk")>();
  return { ...actual, sdk: { ...actual.sdk, createSessionToken: mocks.createSessionToken } };
});

import { appRouter } from "./routers";

const testUser = {
  id: 77,
  username: "passkey-user",
  name: "Passkey User",
  realName: "Passkey User",
  role: "student",
  isTemporaryPassword: false,
  isActive: true,
};

function responseWithChallenge(challenge: string, credentialId = "credential-77") {
  return {
    id: credentialId,
    rawId: credentialId,
    type: "public-key" as const,
    response: {
      clientDataJSON: Buffer.from(JSON.stringify({ type: "webauthn.get", challenge })).toString("base64url"),
    },
  };
}

function createContext(user: typeof testUser | null = null) {
  return {
    user,
    req: {
      protocol: "http",
      headers: { host: "localhost:3000", "user-agent": "Vitest browser" },
      socket: { remoteAddress: "203.0.113.88" },
    },
    res: { setHeader: mocks.setHeader },
    sessionDeviceId: null,
  } as any;
}

describe("passkey tRPC routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getIpBlacklistEntry.mockResolvedValue(null);
    mocks.isLoginLocked.mockResolvedValue(false);
    mocks.createPasskeyChallenge.mockResolvedValue(undefined);
    mocks.createPasskeyCredential.mockResolvedValue(undefined);
    mocks.deletePasskeyCredential.mockResolvedValue(null);
    mocks.updatePasskeyCredentialUsage.mockResolvedValue(undefined);
    mocks.resetLoginFailureAttempts.mockResolvedValue(undefined);
    mocks.createOperationLog.mockResolvedValue(undefined);
    mocks.createLoginAuditLog.mockResolvedValue(undefined);
    mocks.getTwoFactorAuthenticator.mockResolvedValue(null);
    mocks.createTwoFactorLoginChallenge.mockResolvedValue(undefined);
    mocks.getLoginDeviceById.mockResolvedValue(null);
    mocks.countActiveLoginDevices.mockResolvedValue(0);
    mocks.recordLoginDevice.mockResolvedValue({ isNewDevice: false, location: null });
    mocks.upsertUser.mockResolvedValue(undefined);
    mocks.createSessionToken.mockResolvedValue("test-session-token");
    mocks.listPasskeyCredentials.mockResolvedValue([]);
    mocks.getLatestEmailVerification.mockResolvedValue(null);
    mocks.getSystemMaintenanceSettings.mockResolvedValue({ systemMode: "online", maintenanceMode: false, updatedAt: new Date() });
    mocks.sendPasskeySecurityEmail.mockResolvedValue(undefined);
  });

  it("建立無帳號名稱通行密鑰登入挑戰，並綁定目前依賴方網域", async () => {
    mocks.generateAuthenticationOptions.mockResolvedValue({ challenge: "login-challenge", rpId: "localhost" });

    const result = await appRouter.createCaller(createContext()).customAuth.beginPasskeyLogin();

    expect(result.challenge).toBe("login-challenge");
    expect(mocks.createPasskeyChallenge).toHaveBeenCalledWith(expect.objectContaining({
      challenge: "login-challenge",
      type: "authentication",
      userId: null,
      rpId: "localhost",
      origin: "http://localhost:3000",
    }));
  });

  it("已啟用二因素驗證的使用者完成通行密鑰驗證後直接登入", async () => {
    mocks.consumePasskeyChallenge.mockResolvedValue({ challenge: "login-challenge", type: "authentication", rpId: "localhost", origin: "http://localhost:3000", expiresAt: new Date(Date.now() + 60_000) });
    mocks.getPasskeyCredentialByCredentialId.mockResolvedValue({ userId: 77, credentialId: "credential-77", publicKey: Buffer.from([1, 2, 3]).toString("base64url"), counter: 3, transports: "[\"internal\"]", name: "我的 iPhone" });
    mocks.getUserById.mockResolvedValue(testUser);
    mocks.getTwoFactorAuthenticator.mockResolvedValue({ isEnabled: true });
    mocks.verifyAuthenticationResponse.mockResolvedValue({ verified: true, authenticationInfo: { newCounter: 4, credentialDeviceType: "multiDevice", credentialBackedUp: true } });

    const result = await appRouter.createCaller(createContext()).customAuth.finishPasskeyLogin({ response: responseWithChallenge("login-challenge") as any });

    expect(result).toMatchObject({ success: true, requiresTwoFactor: false, firstPasskeySecurityNotice: true, user: { id: 77, username: "passkey-user" } });
    expect(mocks.consumePasskeyChallenge).toHaveBeenCalledWith("login-challenge", "authentication");
    expect(mocks.updatePasskeyCredentialUsage).toHaveBeenCalledWith({ credentialId: "credential-77", counter: 4, deviceType: "multiDevice", backedUp: true });
    expect(mocks.createSessionToken).toHaveBeenCalledWith("passkey-user", expect.objectContaining({ deviceId: expect.any(String) }));
    expect(mocks.setHeader).toHaveBeenCalledWith("Set-Cookie", expect.any(Array));
    expect(mocks.getTwoFactorAuthenticator).not.toHaveBeenCalled();
    expect(mocks.createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "firstPasskeyLogin", entityName: "我的 iPhone", details: expect.stringContaining('"firstUse":true') }));
  });

  it("曾使用過的通行密鑰登入不重複建立首次使用安全通知", async () => {
    mocks.consumePasskeyChallenge.mockResolvedValue({ challenge: "known-passkey-challenge", type: "authentication", rpId: "localhost", origin: "http://localhost:3000", expiresAt: new Date(Date.now() + 60_000) });
    mocks.getPasskeyCredentialByCredentialId.mockResolvedValue({ userId: 77, credentialId: "credential-77", publicKey: Buffer.from([1, 2, 3]).toString("base64url"), counter: 3, transports: "[\"internal\"]", name: "我的 iPhone", lastUsedAt: new Date("2026-08-12T00:00:00.000Z") });
    mocks.getUserById.mockResolvedValue(testUser);
    mocks.verifyAuthenticationResponse.mockResolvedValue({ verified: true, authenticationInfo: { newCounter: 4, credentialDeviceType: "multiDevice", credentialBackedUp: true } });

    const result = await appRouter.createCaller(createContext()).customAuth.finishPasskeyLogin({ response: responseWithChallenge("known-passkey-challenge") as any });

    expect(result).toMatchObject({ success: true, firstPasskeySecurityNotice: false });
    expect(mocks.createOperationLog).toHaveBeenCalledWith(expect.objectContaining({ action: "loginWithPasskey", details: expect.stringContaining('"firstUse":false') }));
  });

  it("創始管理員使用通行密鑰後仍須完成 PIN 挑戰，且不會提前建立工作階段", async () => {
    mocks.consumePasskeyChallenge.mockResolvedValue({ challenge: "founder-passkey-challenge", type: "authentication", rpId: "localhost", origin: "http://localhost:3000", expiresAt: new Date(Date.now() + 60_000) });
    mocks.getPasskeyCredentialByCredentialId.mockResolvedValue({ userId: 77, credentialId: "credential-77", publicKey: Buffer.from([1, 2, 3]).toString("base64url"), counter: 3, transports: "[\"internal\"]", name: "我的 iPhone" });
    mocks.getUserById.mockResolvedValue({ ...testUser, isFounder: true, founderPinSetupRequired: false, loginPinHash: "login-pin-hash", auditPinHash: "audit-pin-hash" });
    mocks.verifyAuthenticationResponse.mockResolvedValue({ verified: true, authenticationInfo: { newCounter: 4, credentialDeviceType: "multiDevice", credentialBackedUp: true } });

    const result = await appRouter.createCaller(createContext()).customAuth.finishPasskeyLogin({ response: responseWithChallenge("founder-passkey-challenge") as any });

    expect(result).toMatchObject({ success: false, requiresTwoFactor: false, requiresFounderPin: true, founderPinChallengeToken: expect.any(String) });
    expect(mocks.createTwoFactorLoginChallenge).toHaveBeenCalledWith(expect.objectContaining({ userId: 77, ipAddress: "203.0.113.88", loginMethod: "passkey" }));
    expect(mocks.createSessionToken).not.toHaveBeenCalled();
  });

  it("已啟用驗證器的創始管理員使用通行密鑰時僅保留 PIN 挑戰", async () => {
    mocks.consumePasskeyChallenge.mockResolvedValue({ challenge: "founder-2fa-passkey-challenge", type: "authentication", rpId: "localhost", origin: "http://localhost:3000", expiresAt: new Date(Date.now() + 60_000) });
    mocks.getPasskeyCredentialByCredentialId.mockResolvedValue({ userId: 77, credentialId: "credential-77", publicKey: Buffer.from([1, 2, 3]).toString("base64url"), counter: 3, transports: "[\"internal\"]", name: "我的 iPhone" });
    mocks.getUserById.mockResolvedValue({ ...testUser, isFounder: true, founderPinSetupRequired: false, loginPinHash: "login-pin-hash", auditPinHash: "audit-pin-hash" });
    mocks.getTwoFactorAuthenticator.mockResolvedValue({ isEnabled: true });
    mocks.verifyAuthenticationResponse.mockResolvedValue({ verified: true, authenticationInfo: { newCounter: 4, credentialDeviceType: "multiDevice", credentialBackedUp: true } });

    const result = await appRouter.createCaller(createContext()).customAuth.finishPasskeyLogin({ response: responseWithChallenge("founder-2fa-passkey-challenge") as any });

    expect(result).toMatchObject({ success: false, requiresTwoFactor: false, requiresFounderPin: true, founderPinChallengeToken: expect.any(String) });
    expect(mocks.getTwoFactorAuthenticator).not.toHaveBeenCalled();
    expect(mocks.createTwoFactorLoginChallenge).toHaveBeenCalledWith(expect.objectContaining({ loginMethod: "passkey" }));
    expect(mocks.createSessionToken).not.toHaveBeenCalled();
  });

  it("拒絕已逾時或已消耗的登入挑戰", async () => {
    mocks.consumePasskeyChallenge.mockResolvedValue(null);

    await expect(appRouter.createCaller(createContext()).customAuth.finishPasskeyLogin({ response: responseWithChallenge("expired-challenge") as any }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED", message: "通行密鑰驗證已逾時，請重新嘗試" });
    expect(mocks.getPasskeyCredentialByCredentialId).not.toHaveBeenCalled();
  });

  it("拒絕找不到的通行密鑰憑證，且不建立工作階段", async () => {
    mocks.consumePasskeyChallenge.mockResolvedValue({ challenge: "unknown-credential-challenge", type: "authentication", rpId: "localhost", origin: "http://localhost:3000", expiresAt: new Date(Date.now() + 60_000) });
    mocks.getPasskeyCredentialByCredentialId.mockResolvedValue(null);

    await expect(appRouter.createCaller(createContext()).customAuth.finishPasskeyLogin({ response: responseWithChallenge("unknown-credential-challenge") as any }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED", message: "無法驗證此通行密鑰，請改用帳號密碼登入" });
    expect(mocks.createSessionToken).not.toHaveBeenCalled();
    expect(mocks.createLoginAuditLog).toHaveBeenCalledWith(expect.objectContaining({ status: "failed", failureReason: "找不到通行密鑰憑證" }));
  });

  it("拒絕已停用帳號的通行密鑰登入，且不建立工作階段", async () => {
    mocks.consumePasskeyChallenge.mockResolvedValue({ challenge: "disabled-account-challenge", type: "authentication", rpId: "localhost", origin: "http://localhost:3000", expiresAt: new Date(Date.now() + 60_000) });
    mocks.getPasskeyCredentialByCredentialId.mockResolvedValue({ userId: 77, credentialId: "credential-77", publicKey: Buffer.from([1, 2, 3]).toString("base64url"), counter: 3, transports: "[\"internal\"]", name: "我的 iPhone" });
    mocks.getUserById.mockResolvedValue({ ...testUser, isActive: false });

    await expect(appRouter.createCaller(createContext()).customAuth.finishPasskeyLogin({ response: responseWithChallenge("disabled-account-challenge") as any }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED", message: "無法使用此通行密鑰登入" });
    expect(mocks.verifyAuthenticationResponse).not.toHaveBeenCalled();
    expect(mocks.createSessionToken).not.toHaveBeenCalled();
    expect(mocks.createLoginAuditLog).toHaveBeenCalledWith(expect.objectContaining({ status: "failed", failureReason: "帳號不存在或已停用" }));
  });

  it("WebAuthn 簽章驗證未通過時不更新憑證、不建立工作階段且留下稽核紀錄", async () => {
    mocks.consumePasskeyChallenge.mockResolvedValue({ challenge: "verification-failed-challenge", type: "authentication", rpId: "localhost", origin: "http://localhost:3000", expiresAt: new Date(Date.now() + 60_000) });
    mocks.getPasskeyCredentialByCredentialId.mockResolvedValue({ userId: 77, credentialId: "credential-77", publicKey: Buffer.from([1, 2, 3]).toString("base64url"), counter: 3, transports: "[\"internal\"]", name: "我的 iPhone" });
    mocks.getUserById.mockResolvedValue(testUser);
    mocks.verifyAuthenticationResponse.mockResolvedValue({ verified: false });

    await expect(appRouter.createCaller(createContext()).customAuth.finishPasskeyLogin({ response: responseWithChallenge("verification-failed-challenge") as any }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED", message: "無法驗證此通行密鑰，請重新嘗試" });
    expect(mocks.updatePasskeyCredentialUsage).not.toHaveBeenCalled();
    expect(mocks.createSessionToken).not.toHaveBeenCalled();
    expect(mocks.createLoginAuditLog).toHaveBeenCalledWith(expect.objectContaining({ status: "failed", failureReason: "通行密鑰簽章驗證失敗" }));
  });

  it("完成註冊時會儲存憑證公鑰與操作稽核紀錄", async () => {
    mocks.getUserById.mockResolvedValue(testUser);
    mocks.generateRegistrationOptions.mockResolvedValue({ challenge: "registration-challenge", rp: { id: "localhost" } });
    mocks.consumePasskeyChallenge.mockResolvedValue({ challenge: "registration-challenge", type: "registration", userId: 77, passkeyName: "我的 iPhone", rpId: "localhost", origin: "http://localhost:3000", expiresAt: new Date(Date.now() + 60_000) });
    mocks.verifyRegistrationResponse.mockResolvedValue({
      verified: true,
      registrationInfo: { credential: { id: "new-credential", publicKey: new Uint8Array([9, 8, 7]), counter: 0, transports: ["internal"] }, credentialDeviceType: "multiDevice", credentialBackedUp: true },
    });

    const caller = appRouter.createCaller(createContext(testUser));
    const options = await caller.accountSecurity.beginPasskeyRegistration({ name: "我的 iPhone" });
    const result = await caller.accountSecurity.finishPasskeyRegistration({ response: responseWithChallenge("registration-challenge", "new-credential") as any });

    expect(options.challenge).toBe("registration-challenge");
    expect(result).toEqual({ success: true, credentialId: "new-credential", emailNotification: "email_unavailable" });
    expect(mocks.createPasskeyCredential).toHaveBeenCalledWith(expect.objectContaining({
      userId: 77,
      credentialId: "new-credential",
      publicKey: Buffer.from([9, 8, 7]).toString("base64url"),
      counter: 0,
      name: "我的 iPhone",
      registeredDeviceLabel: "未知裝置",
    }));
    expect(mocks.createOperationLog).toHaveBeenCalledWith(expect.objectContaining({
      userId: 77,
      username: "passkey-user",
      action: "addPasskey",
      entityType: "accountSecurity",
      entityName: "我的 iPhone",
    }));
  });

  it("新增通行密鑰後會通知已驗證的帳戶電子郵件", async () => {
    const verifiedUser = { ...testUser, email: "verified@example.com" };
    mocks.getUserById.mockResolvedValue(verifiedUser);
    mocks.getLatestEmailVerification.mockResolvedValue({ isVerified: true });
    mocks.consumePasskeyChallenge.mockResolvedValue({ challenge: "email-registration", type: "registration", userId: 77, passkeyName: "我的 iPad", rpId: "localhost", origin: "http://localhost:3000", expiresAt: new Date(Date.now() + 60_000) });
    mocks.verifyRegistrationResponse.mockResolvedValue({ verified: true, registrationInfo: { credential: { id: "email-credential", publicKey: new Uint8Array([7, 7, 7]), counter: 0, transports: ["internal"] }, credentialDeviceType: "multiDevice", credentialBackedUp: true } });

    const result = await appRouter.createCaller(createContext(verifiedUser)).accountSecurity.finishPasskeyRegistration({ response: responseWithChallenge("email-registration", "email-credential") as any });

    expect(result.emailNotification).toBe("sent");
    expect(mocks.sendPasskeySecurityEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "verified@example.com",
      action: "added",
      passkeyName: "我的 iPad",
      ipAddress: "203.0.113.88",
      deviceSummary: "未知瀏覽器 · 未知裝置",
      occurredAt: expect.any(Date),
    }));
  });

  it("移除通行密鑰後會通知已驗證的帳戶電子郵件", async () => {
    const verifiedUser = { ...testUser, email: "verified@example.com" };
    mocks.getUserById.mockResolvedValue(verifiedUser);
    mocks.getLatestEmailVerification.mockResolvedValue({ isVerified: true });
    mocks.deletePasskeyCredential.mockResolvedValue({ credentialId: "credential-77", name: "我的 iPhone", registeredDeviceLabel: "iPhone" });

    const result = await appRouter.createCaller(createContext(verifiedUser)).accountSecurity.deletePasskey({ credentialId: "credential-77" });

    expect(result).toEqual({ success: true, emailNotification: "sent" });
    expect(mocks.sendPasskeySecurityEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "verified@example.com",
      action: "removed",
      passkeyName: "我的 iPhone",
      registeredDeviceLabel: "iPhone",
      ipAddress: "203.0.113.88",
      deviceSummary: "未知瀏覽器 · 未知裝置",
      occurredAt: expect.any(Date),
    }));
  });

  it("註冊簽章驗證失敗時不會建立憑證", async () => {
    mocks.consumePasskeyChallenge.mockResolvedValue({ challenge: "invalid-registration", type: "registration", userId: 77, passkeyName: "我的 Mac", rpId: "localhost", origin: "http://localhost:3000", expiresAt: new Date(Date.now() + 60_000) });
    mocks.verifyRegistrationResponse.mockResolvedValue({ verified: false, registrationInfo: undefined });

    await expect(appRouter.createCaller(createContext(testUser)).accountSecurity.finishPasskeyRegistration({ response: responseWithChallenge("invalid-registration", "invalid-credential") as any }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: "通行密鑰註冊未完成，請重新開始" });
    expect(mocks.createPasskeyCredential).not.toHaveBeenCalled();
  });
});
