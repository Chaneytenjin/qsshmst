import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routerPath = new URL("./routers.ts", import.meta.url);
const scannerPath = new URL("../client/src/pages/QrCodeBorrowReturn.tsx", import.meta.url);

describe("動態使用者 QR Code 整合", () => {
  it("僅向登入本人發行短效 QR Code，並由教師或管理員驗證掃描載荷", () => {
    const router = readFileSync(routerPath, "utf8");
    expect(router).toContain("dynamicUserQrCode: protectedProcedure.query");
    expect(router).toContain("issueDynamicUserQrCode(ctx.user.id)");
    expect(router).toContain("resolveDynamicBorrowerQr: staffProcedure");
    expect(router).toContain("verifyDynamicUserQrCode(input.value)");
    expect(router).toContain("rejectDynamicBorrowerQr");
    expect(router).toContain("void notifyHighRiskOperation({");
    expect(router).toContain('actionLabel: "動態使用者 QR Code 驗證失敗"');
  });

  it("借還掃描流程會驗證動態使用者 QR Code，並拒絕既有靜態使用者 QR Code", () => {
    const scanner = readFileSync(scannerPath, "utf8");
    expect(scanner).toContain("trpc.equipment.resolveDynamicBorrowerQr.useMutation");
    expect(scanner).toContain("resolveDynamicBorrowerQrMutation.mutateAsync");
    expect(scanner).toContain("/^QSSH-USER-V2:/i");
    expect(scanner).toContain("借用者必須使用有效的個人資料 QR Code");
  });
});
