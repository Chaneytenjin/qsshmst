import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { resolveSystemMode } from "../systemMode";
import { ENV } from "./env";

const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.length > 0;

export function getSessionTokenFromRequestHeaders(headers: Pick<Request["headers"], "authorization" | "cookie">): string | undefined {
  const authorization = Array.isArray(headers.authorization) ? headers.authorization[0] : headers.authorization;
  const bearer = authorization?.match(/^Bearer\s+([A-Za-z0-9._~-]+)$/i)?.[1];
  if (bearer) return bearer;
  return parseCookieHeader(headers.cookie || "")[COOKIE_NAME];
}

export type SessionPayload = {
  username: string;
  appId: string;
  name: string;
  deviceId?: string;
};

export type AuthenticatedUser = User & {
  taskUid?: string;
  isCron?: boolean;
  sessionDeviceId?: string;
};

function sessionSecret() {
  const configuredSecret = ENV.cookieSecret;
  const secret = configuredSecret && configuredSecret.length >= 32
    ? configuredSecret
    : process.env.NODE_ENV === "test" || process.env.VITEST === "true"
      ? "standalone-test-secret-that-is-longer-than-thirty-two-characters"
      : "";
  if (secret.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters");
  return new TextEncoder().encode(secret);
}

class StandaloneAuthService {
  async createSessionToken(username: string, options: { expiresInMs?: number; name?: string; deviceId?: string } = {}) {
    return this.signSession({ username, appId: ENV.appId, name: options.name || "", deviceId: options.deviceId }, options);
  }

  async signSession(payload: SessionPayload, options: { expiresInMs?: number } = {}) {
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    return new SignJWT({ username: payload.username, appId: payload.appId, name: payload.name, deviceId: payload.deviceId })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt()
      .setExpirationTime(Math.floor((Date.now() + expiresInMs) / 1000))
      .sign(sessionSecret());
  }

  async verifySession(token: string | undefined | null): Promise<{ username: string; appId: string; name: string; deviceId?: string } | null> {
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, sessionSecret(), { algorithms: ["HS256"] });
      const { username, appId, name, deviceId } = payload as Record<string, unknown>;
      if (!isNonEmptyString(username) || !isNonEmptyString(appId)) return null;
      return { username, appId, name: isNonEmptyString(name) ? name : "", deviceId: isNonEmptyString(deviceId) ? deviceId : undefined };
    } catch {
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    const cronSecret = req.headers["x-cron-secret"];
    if (ENV.cronSecret && cronSecret === ENV.cronSecret) return buildCronUser();

    const token = getSessionTokenFromRequestHeaders(req.headers);
    const session = await this.verifySession(token);
    if (!session) throw ForbiddenError("Invalid session cookie");

    const user = await db.getUserByUsername(session.username);
    if (!user) throw ForbiddenError("User not found");
    if (user.isActive === false) throw ForbiddenError("Account has been disabled");

    if (session.deviceId) {
      const device = await db.getLoginDeviceById(session.deviceId);
      if (!device || device.userId !== user.id || device.revokedAt) throw ForbiddenError("This login device has been revoked");
    }

    const systemMode = resolveSystemMode(await db.getSystemMaintenanceSettings()).systemMode;
    if (systemMode !== "online" && !user.isFounder) {
      throw ForbiddenError(systemMode === "maintenance" ? "系統維護中，工作階段已被安全結束" : "系統離線中，工作階段已被安全結束");
    }

    if (user.username) await db.upsertUser({ username: user.username, lastSignedIn: new Date() });
    return { ...user, sessionDeviceId: session.deviceId };
  }
}

function buildCronUser(): AuthenticatedUser {
  const now = new Date();
  return {
    id: -1,
    openId: "standalone-cron",
    name: "Standalone Scheduled Task",
    email: null,
    loginMethod: "cron",
    role: "admin",
    isActive: true,
    studentId: null,
    department: null,
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    isCron: true,
  } as AuthenticatedUser;
}

export const sdk = new StandaloneAuthService();
