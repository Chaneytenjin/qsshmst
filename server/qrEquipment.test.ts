import { describe, expect, it } from "vitest";
import { buildUserQrCodeValue, findEquipmentByCodeId, findEquipmentByQrCodeId, parseBorrowerId } from "../client/src/lib/qrEquipment";

const equipmentList = [
  { id: 1, qrCodeId: "QSSHMST0001", name: "Sony A7" },
  { id: 2, qrCodeId: "QSSHMST0002", name: "無線麥克風" },
];

describe("器材 QR Code／Barcode 共用識別碼查找", () => {
  it("可依 QR 或 Barcode 掃描出的相同器材代碼查找器材，並忽略前後空白", () => {
    expect(findEquipmentByCodeId(equipmentList, " QSSHMST0002 ")).toMatchObject({
      id: 2,
      name: "無線麥克風",
    });
    expect(findEquipmentByQrCodeId(equipmentList, "QSSHMST0001")).toMatchObject({ id: 1 });
    expect(findEquipmentByCodeId(equipmentList, "qsshmst0001\u200B")).toMatchObject({ id: 1 });
  });

  it("找不到器材識別碼或尚未取得器材清單時會回傳 undefined", () => {
    expect(findEquipmentByCodeId(equipmentList, "QSSHMST9999")).toBeUndefined();
    expect(findEquipmentByCodeId(undefined, "QSSHMST0001")).toBeUndefined();
  });
});

describe("QR Code 借用者 ID 驗證", () => {
  it("僅接受大於零的整數借用者 ID", () => {
    expect(parseBorrowerId(" 42 ")).toBe(42);
    expect(parseBorrowerId("0")).toBeNull();
    expect(parseBorrowerId("-1")).toBeNull();
    expect(parseBorrowerId("1.5")).toBeNull();
    expect(parseBorrowerId("1abc")).toBeNull();
  });

  it("可建立不含個人資料的使用者 QR Code，並解析為借用者 ID", () => {
    expect(buildUserQrCodeValue(42)).toBe("QSSH-USER:42");
    expect(parseBorrowerId("QSSH-USER:42")).toBe(42);
    expect(parseBorrowerId("qssh-user:42")).toBe(42);
    expect(parseBorrowerId("QSSH-USER:0")).toBeNull();
    expect(parseBorrowerId("QSSH-USER:abc")).toBeNull();
  });
});
