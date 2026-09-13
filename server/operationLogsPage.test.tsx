// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import OperationLogs from "../client/src/pages/OperationLogs";

const mocks = vi.hoisted(() => ({
  verifyPinUseMutation: vi.fn(),
  operationLogsUseQuery: vi.fn(),
}));

vi.mock("../client/src/lib/trpc", () => ({
  trpc: {
    auditPin: { verify: { useMutation: mocks.verifyPinUseMutation } },
    operationLogs: { list: { useQuery: mocks.operationLogsUseQuery } },
  },
}));

vi.mock("../client/src/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 1, role: "admin", isFounder: true } }),
}));

vi.mock("../client/src/components/AuditPinDialog", () => ({
  AuditPinDialog: () => null,
}));

describe("OperationLogs page shell", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("使用全站 AppLayout 提供的導覽，不再內嵌第二個 DashboardLayout", () => {
    mocks.verifyPinUseMutation.mockReturnValue({ mutateAsync: vi.fn() });
    mocks.operationLogsUseQuery.mockReturnValue({ data: undefined, isLoading: false, refetch: vi.fn() });

    render(<OperationLogs />);

    expect(screen.getByText("PIN 碼驗證")).toBeInTheDocument();
    expect(screen.getByText("需要驗證 PIN 碼才能查看操作日誌")).toBeInTheDocument();
    const source = readFileSync("client/src/pages/OperationLogs.tsx", "utf8");
    expect(source).not.toContain("DashboardLayout");
    expect(source).toContain("min-h-[60vh]");
  });
});
