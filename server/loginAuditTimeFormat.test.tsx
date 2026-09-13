// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import LoginAudit from "../client/src/pages/LoginAudit";

vi.mock("../client/src/lib/trpc", () => ({
  trpc: {
    auth: { me: { useQuery: () => ({ data: { isFounder: true } }) } },
    loginAudit: { list: { useQuery: () => ({ data: { logs: [{ id: 1, username: "admin", status: "success", failureReason: null, ipAddress: "203.0.113.1", loginAt: new Date("2026-08-13T13:05:06.000Z") }], total: 1, page: 1, totalPages: 1 }, isLoading: false, error: null }) } },
  },
}));

describe("登入稽核時間格式", () => {
  afterEach(cleanup);

  it("以 24 小時制顯示登入時間，不顯示上午或下午", () => {
    render(<LoginAudit />);
    const expected = new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, hourCycle: "h23" }).format(new Date("2026-08-13T13:05:06.000Z"));
    expect(screen.getByText(expected)).toBeInTheDocument();
    expect(screen.queryByText(/上午|下午/)).not.toBeInTheDocument();
  });
});
