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
    const timeCell = screen.getAllByRole("cell").at(-1);
    expect(timeCell).toBeDefined();
    expect(timeCell?.textContent).toContain("2026/08/13");
    expect(timeCell?.textContent).toMatch(/(?:13|21):05:06/);
    expect(timeCell?.textContent).not.toMatch(/上午|下午/);
  });
});
