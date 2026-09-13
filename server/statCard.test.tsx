// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatCard } from "../client/src/components/StatCard";

vi.mock("wouter", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));

describe("儀表板資訊卡", () => {
  it("保留可存取的導頁名稱，但不顯示查看詳情提示文字", () => {
    render(<StatCard label="待審核申請" value={2} href="/requests" />);

    expect(screen.getByRole("link", { name: "查看待審核申請詳情" })).toHaveAttribute("href", "/requests");
    expect(screen.queryByText("查看詳情")).not.toBeInTheDocument();
    expect(document.querySelector(".stat-card-link-hint")).not.toBeInTheDocument();
  });

  it("將數字色彩交由主題樣式控制，淺色模式使用深藍高對比數字", () => {
    const { container } = render(<StatCard label="借出中器材" value={12} href="/records" />);
    const number = container.querySelector(".display-number");
    const stylesheet = readFileSync("client/src/index.css", "utf8");

    expect(number).toHaveTextContent("12");
    expect(number).not.toHaveClass("text-white");
    expect(stylesheet).toContain("html:not(.dark) .stat-card .display-number");
    expect(stylesheet).toContain("color: oklch(0.18 0.07 235)");
    expect(stylesheet).toContain("font-weight: 900");
  });
});
