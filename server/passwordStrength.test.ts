import { describe, expect, it } from "vitest";
import { assessPasswordStrength } from "../client/src/lib/passwordStrength";

describe("password strength assessment", () => {
  it("會將空值與過短密碼判定為弱，且標示尚未符合最低規則", () => {
    expect(assessPasswordStrength("")).toMatchObject({ label: "尚未輸入", validByPolicy: false });
    expect(assessPasswordStrength("abc")).toMatchObject({ label: "弱", validByPolicy: false });
  });

  it("會將符合最低規則但仍可改善的密碼判定為中", () => {
    const result = assessPasswordStrength("school12");
    expect(result).toMatchObject({ label: "中", validByPolicy: true });
    expect(result.suggestions).toContain("加入符號可提高強度");
  });

  it("會將長度足夠且混合大小寫、數字及符號的密碼判定為強", () => {
    expect(assessPasswordStrength("Qingshui!2026Media")).toMatchObject({ label: "強", validByPolicy: true });
  });
});
