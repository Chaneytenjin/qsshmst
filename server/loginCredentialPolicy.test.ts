import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isValidLoginPassword,
  isValidLoginUsername,
  isLegacyUsername,
  sanitizeLoginPassword,
  sanitizeLoginUsername,
} from "@shared/loginCredentialPolicy";

describe("登入帳密字元政策", () => {
  it("帳號只保留英文字母與數字", () => {
    expect(sanitizeLoginUsername("Chen_y-01中文")).toBe("Cheny01");
    expect(isValidLoginUsername("Chaney3570001")).toBe(true);
    expect(isValidLoginUsername("Chaney_3570001")).toBe(false);
    expect(isLegacyUsername("legacy_user-01")).toBe(true);
  });

  it("密碼保留英數與可列印特殊符號，排除空白與非 ASCII 字元", () => {
    expect(sanitizeLoginPassword("Pa ss!中文#1")).toBe("Pass!#1");
    expect(isValidLoginPassword("Pass!#1")).toBe(true);
    expect(isValidLoginPassword("Pass word!1")).toBe(false);
  });

  it("登入頁與後端登入程序均採用共用字元政策", () => {
    const loginPage = readFileSync(resolve(import.meta.dirname, "../client/src/pages/Login.tsx"), "utf8");
    const router = readFileSync(resolve(import.meta.dirname, "../server/routers.ts"), "utf8");

    expect(loginPage).toContain("sanitizeLoginUsername");
    expect(loginPage).toContain("sanitizeLoginPassword");
    expect(loginPage).toContain('title="帳號僅限英文字母與數字"');
    expect(loginPage).toContain('title="密碼僅限英文字母、數字及特殊符號"');
    expect(router).toContain("loginUsernamePattern");
    expect(router).toContain("loginPasswordPattern");
    expect(router).toContain("isExistingLegacyUsername");
  });
});
