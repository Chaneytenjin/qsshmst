import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(resolve(process.cwd(), "client/src/pages/BorrowRequests.tsx"), "utf8");
const styles = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");

describe("借用申請審核空狀態的淺色模式", () => {
  it("為無待審核申請狀態提供專用容器與明確文字、圖示對比", () => {
    expect(pageSource).toContain('className="borrow-requests-page animate-fade-in"');
    expect(pageSource).toContain('className="borrow-requests-empty-state empty-state"');
    expect(pageSource).toContain("目前無待審核申請");
    expect(styles).toContain("html:not(.dark) .borrow-requests-page .borrow-requests-empty-state {");
    expect(styles).toContain("background: linear-gradient(145deg, oklch(0.98 0.018 215), oklch(0.90 0.065 215));");
    expect(styles).toContain(".borrow-requests-empty-state .text-white");
    expect(styles).toContain(".borrow-requests-empty-state svg");
  });

  it("讓借用期間保留清楚日期文字且不使用方框樣式", () => {
    expect(pageSource).not.toContain('className="borrow-request-period"');
    expect(pageSource).toContain('className="borrow-request-period-date text-sm text-[oklch(0.75_0_0)]"');
    expect(styles).not.toContain("html:not(.dark) .borrow-requests-page .borrow-request-period {");
  });

  it("將審核操作保留為無方框圖示控制，同時提供鍵盤焦點與 aria 標示", () => {
    expect(pageSource).toContain('className="borrow-request-action p-1.5');
    expect(pageSource).toContain('aria-label={`核准申請 #${req.id}`}');
    expect(pageSource).toContain('aria-label={`拒絕申請 #${req.id}`}');
    expect(styles).toContain(".borrow-request-action {");
    expect(styles).toContain("border: 0;");
    expect(styles).toContain(".borrow-request-action:focus-visible {");
  });

  it("核准確認視窗不再顯示建立借用記錄與扣減可借數量的說明", () => {
    expect(pageSource).not.toContain("核准後將自動建立借用記錄並扣減可借數量");
    expect(pageSource).toContain('reviewTarget?.action === "rejected" ? <p');
  });
});
