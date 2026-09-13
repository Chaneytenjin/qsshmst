import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  sessionDeviceId?: string;
  auditPinVerified?: boolean;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let auditPinVerified = false;
  let sessionDeviceId: string | undefined;

  try {
    const authenticatedUser = await sdk.authenticateRequest(opts.req);
    user = authenticatedUser;
    sessionDeviceId = authenticatedUser.sessionDeviceId;
  } catch (error) {
    // Authentication is optional for public procedures.
    // 工作階段若因帳號狀態、裝置撤銷或系統維護／離線限制被拒絕，
    // 立即移除 Cookie，避免使用者保留失效的登入憑證。
    opts.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(opts.req), maxAge: -1 });
    user = null;
  }

  // 檢查 PIN 驗證 Cookie
  if (user?.isFounder) {
    const cookies = opts.req.headers.cookie || "";
    const auditPinVerifiedAtMatch = cookies.match(/auditPinVerifiedAt=(\d+)/);
    
    if (auditPinVerifiedAtMatch) {
      const auditPinVerifiedAt = parseInt(auditPinVerifiedAtMatch[1], 10);
      const now = Date.now();
      const expiryTime = 30 * 60 * 1000; // 30 分鐘過期
      auditPinVerified = now - auditPinVerifiedAt < expiryTime;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    sessionDeviceId,
    auditPinVerified,
  };
}
