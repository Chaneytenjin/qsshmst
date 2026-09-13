import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const templatePath = new URL("../references/gmail-apps-script-offline-command.gs", import.meta.url);

describe("Gmail Apps Script 離線指令範本", () => {
  it("以官方 Authentication-Results 標頭及原始標頭回退檢查 SPF、DKIM 與 DMARC", () => {
    const source = readFileSync(templatePath, "utf8");

    expect(source).toContain("message.getHeader('Authentication-Results')");
    expect(source).toContain("message.getRawContent()");
    expect(source).toContain("spf=pass");
    expect(source).toContain("dkim=pass");
    expect(source).toContain("dmarc=pass");
  });

  it("將 Gmail 驗證結果與不可重放的指令內容納入 HMAC canonical payload", () => {
    const source = readFileSync(templatePath, "utf8");

    expect(source).toContain("authenticationPassed: hasAuthenticatedSender_(message)");
    expect(source).toContain("payload.authenticationPassed ? '1' : '0'");
    expect(source).toContain("message.getId()");
    expect(source).toContain("QSSH MEDIA SERVICE SYSTEM");
    expect(source).toContain("Media Server System is abnormal,Please go offline immediately.");
  });

  it("只在系統明確接受指令時標示已處理，並隔離已拒絕或已重放郵件", () => {
    const source = readFileSync(templatePath, "utf8");

    expect(source).toContain("result.accepted === true");
    expect(source).toContain("QSSH_OFFLINE_REJECTED");
    expect(source).toContain("gmail_replay_rejected");
    expect(source).toContain("-label:${QSSH_REJECTED_LABEL}");
  });
});
