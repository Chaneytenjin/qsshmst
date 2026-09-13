import { describe, expect, it } from "vitest";
import { EQUIPMENT_QR_CODE_PREFIX, normalizeQrCodeIdSuffix } from "./db";

describe("器材掃描 ID 後段格式", () => {
  it("固定使用 QSSHMST 前綴並將使用者後段正規化為大寫", () => {
    expect(EQUIPMENT_QR_CODE_PREFIX).toBe("QSSHMST");
    expect(normalizeQrCodeIdSuffix("cam-a_01")).toBe("CAM-A_01");
  });

  it("空白後段會交由系統自動產生完整掃描 ID", () => {
    expect(normalizeQrCodeIdSuffix("   ")).toBeUndefined();
    expect(normalizeQrCodeIdSuffix()).toBeUndefined();
  });

  it("拒絕不安全字元與重複輸入固定前綴", () => {
    expect(() => normalizeQrCodeIdSuffix("CAM 01")).toThrow("INVALID_QR_CODE_ID_SUFFIX");
    expect(() => normalizeQrCodeIdSuffix("QSSHMST0001")).toThrow("INVALID_QR_CODE_ID_SUFFIX");
  });
});
