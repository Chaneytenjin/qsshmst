// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import LocationAuditReport from "../client/src/pages/LocationAuditReport";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

const mocks = vi.hoisted(() => ({
  summaryUseQuery: vi.fn(),
  listUseQuery: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("../client/src/lib/trpc", () => ({
  trpc: {
    equipment: {
      list: { useQuery: mocks.listUseQuery },
      getMonthlyLocationAuditSummary: { useQuery: mocks.summaryUseQuery },
    },
  },
}));

const report = {
  month: "2026-08",
  totalChanges: 6,
  equipmentCount: 3,
  locationCount: 4,
  monthlyTrend: [
    { month: "2026-07", label: "2026/07", changes: 2, equipmentCount: 1, locationCount: 2 },
    { month: "2026-08", label: "2026/08", changes: 6, equipmentCount: 3, locationCount: 4 },
  ],
  equipmentBreakdown: [
    { equipmentId: 1, equipmentName: "Sony A7 相機", currentLocation: "器材室 A", changes: 4 },
    { equipmentId: 2, equipmentName: "無線麥克風", currentLocation: "器材室 B", changes: 2 },
  ],
  locationBreakdown: [
    { location: "器材室 A", changes: 5, incomingCount: 3, outgoingCount: 2, equipmentCount: 2 },
    { location: "器材室 B", changes: 3, incomingCount: 1, outgoingCount: 2, equipmentCount: 2 },
  ],
};

describe("LocationAuditReport", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("呈現月度跨器材與跨位置稽核摘要、趨勢圖與流向表", () => {
    mocks.listUseQuery.mockReturnValue({ data: [{ id: 1, name: "Sony A7 相機", qrCodeId: "QSSHMST0001", location: "器材室 A" }, { id: 2, name: "無線麥克風", qrCodeId: "QSSHMST0002", location: "器材室 B" }] });
    mocks.summaryUseQuery.mockReturnValue({ data: report, isLoading: false, error: null, isFetching: false, refetch: mocks.refetch });

    render(<LocationAuditReport />);

    expect(screen.getByRole("heading", { name: "位置異動月度稽核" })).toBeInTheDocument();
    expect(screen.getByText("近 12 個月異動趨勢")).toBeInTheDocument();
    expect(screen.getByText("器材異動排行")).toBeInTheDocument();
    expect(screen.getByText("位置流向明細")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Sony A7 相機/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "器材室 A" })).toBeInTheDocument();
  });

  it("將月份、器材與位置篩選條件傳入月度彙總查詢", () => {
    mocks.listUseQuery.mockReturnValue({ data: [{ id: 1, name: "Sony A7 相機", qrCodeId: "QSSHMST0001", location: "器材室 A" }] });
    mocks.summaryUseQuery.mockReturnValue({ data: report, isLoading: false, error: null, isFetching: false, refetch: mocks.refetch });

    render(<LocationAuditReport />);
    fireEvent.change(screen.getByLabelText("稽核月份"), { target: { value: "2026-08" } });
    fireEvent.change(screen.getByLabelText("指定器材"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("相關存放位置"), { target: { value: "器材室 A" } });

    expect(mocks.summaryUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ month: "2026-08", equipmentId: 1, location: "器材室 A" }));
  });
});
