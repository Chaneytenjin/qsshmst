import { describe, expect, it } from "vitest";
import { isTestAccount } from "../shared/accountClassification";

describe("測試帳號分類", () => {
  it.each([
    "login_test_1786514675140",
    "pin_test_1786514675669",
    "ui_test_1786514682037",
    "test_profile_1786514675127",
    "trpc_profile_1786514675299",
    "no_temp_1786514684696_0.8121903244259816",
  ])("辨識既有自動化測試命名規則：%s", (username) => {
    expect(isTestAccount({ username })).toBe(true);
  });

  it("不會以姓名或一般帳號名稱誤判正式帳號", () => {
    expect(isTestAccount({ username: "Chaney" })).toBe(false);
    expect(isTestAccount({ username: "tata" })).toBe(false);
    expect(isTestAccount({ username: "testing" })).toBe(false);
    expect(isTestAccount({ username: null })).toBe(false);
  });

  it("辨識無 username 的自動化 OAuth 測試帳號，但不誤判一般 OAuth 帳號", () => {
    expect(isTestAccount({ username: null, openId: "upsert_open_1786516443499_8t67d8" })).toBe(true);
    expect(isTestAccount({ username: null, openId: "manus-user-production" })).toBe(false);
  });
});
