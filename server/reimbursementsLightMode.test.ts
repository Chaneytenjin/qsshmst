import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");
const reimbursementsSource = readFileSync(new URL("../client/src/pages/Reimbursements.tsx", import.meta.url), "utf8");
const reimbursementReviewSource = readFileSync(new URL("../client/src/pages/ReimbursementReview.tsx", import.meta.url), "utf8");

describe("報帳管理淺色模式可讀性", () => {
  it("為頁首頁、報帳卡片、狀態與操作按鈕提供獨立的高對比樣式", () => {
    expect(reimbursementsSource).toContain("reimbursements-page");
    expect(reimbursementsSource).toContain("reimbursements-hero");
    expect(reimbursementsSource).toContain("reimbursement-claim-card");
    expect(reimbursementsSource).toContain("reimbursement-status-badge");
    expect(reimbursementsSource).toContain("reimbursement-action-button");
    expect(reimbursementsSource).toContain("reimbursement-detail-button");
    expect(reimbursementsSource).toContain("reimbursements-create-button");
    expect(reimbursementsSource).toContain("reimbursement-create-dialog");
    expect(reimbursementsSource).toContain("reimbursement-create-dialog-scroll");
    expect(reimbursementsSource).toContain("reimbursement-detail-dialog");
    expect(styles).toContain("html:not(.dark) .reimbursements-page .reimbursements-hero");
    expect(styles).toContain("html:not(.dark) .reimbursements-page .reimbursement-claim-card");
    expect(styles).toContain("html:not(.dark) .reimbursements-page .reimbursement-status-badge[data-status=\"submitted\"]");
    expect(styles).toContain("html:not(.dark) .reimbursements-page .reimbursement-action-button");
    expect(styles).toContain("html:not(.dark) .reimbursements-page .reimbursement-detail-button");
    expect(styles).toContain(".reimbursement-detail-button:focus-visible");
    expect(styles).toContain("html:not(.dark) .reimbursements-page .reimbursements-create-button");
    expect(styles).toContain(".reimbursements-create-button:focus-visible");
    expect(styles).toContain("html:not(.dark) .reimbursement-create-dialog {");
    expect(styles).toContain(".reimbursement-create-dialog-scroll { scrollbar-color:");
    expect(styles).toContain(".reimbursement-create-save-button");
    expect(styles).toContain("html:not(.dark) .reimbursement-detail-dialog {");
    expect(styles).toContain(".reimbursement-detail-dialog table");
  });

  it("將報帳審核拆分為獨立子頁，並讓主頁提供具權限限制的入口", () => {
    expect(reimbursementsSource).toContain('href="/reimbursement-review"');
    expect(reimbursementsSource).not.toContain('className="reimbursements-review-section');
    expect(reimbursementReviewSource).toContain("reimbursement-review-page");
    expect(reimbursementReviewSource).toContain("reimbursement-return-link");
    expect(reimbursementReviewSource).toContain("claimsQuery = trpc.reimbursements.list.useQuery()");
    expect(reimbursementReviewSource).toContain("reviewClaim.mutateAsync");
    expect(styles).toContain(".reimbursement-return-link:focus-visible");
    expect(styles).toContain("html:not(.dark) .reimbursement-return-link");
  });
});
