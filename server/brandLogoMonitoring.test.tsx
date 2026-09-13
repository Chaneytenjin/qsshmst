// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import BrandLogoMonitoring from "../client/src/pages/BrandLogoMonitoring";

const mocks = vi.hoisted(() => ({
  listUseQuery: vi.fn(),
  summary24hUseQuery: vi.fn(),
  setAlertThresholdUseMutation: vi.fn(),
  setAlertThresholdMutate: vi.fn(),
  invalidateSummary: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("../client/src/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ brandLogoMonitoring: { summary24h: { invalidate: mocks.invalidateSummary } } }),
    brandLogoMonitoring: {
      list: { useQuery: mocks.listUseQuery },
      summary24h: { useQuery: mocks.summary24hUseQuery },
      setAlertThreshold: { useMutation: mocks.setAlertThresholdUseMutation },
    },
  },
}));

describe("BrandLogoMonitoring", () => {
  beforeEach(() => {
    mocks.setAlertThresholdUseMutation.mockReturnValue({ mutate: mocks.setAlertThresholdMutate, isPending: false });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("會呈現 Logo 載入異常事件，並依裝置類型重新查詢", () => {
    mocks.summary24hUseQuery.mockReturnValue({ data: { total: 1, switched: 1, textFallback: 0, windowHours: 24, since: new Date(), alert: { thresholdCount: 3, isEnabled: true } }, isLoading: false });
    mocks.listUseQuery.mockReturnValue({
      data: {
        total: 1,
        page: 1,
        pageSize: 30,
        totalPages: 1,
        events: [{
          id: 1,
          pagePath: "/login",
          failedSrc: "/manus-storage/qingshui-media-team-logo-96.webp",
          deviceClass: "mobile",
          viewportWidth: 390,
          failureStage: "fallback",
          fallbackSrc: "/manus-storage/logo-google-drive.png",
          recoveryOutcome: "switched",
          userAgent: "Vitest",
          reporterUserId: null,
          reportedAt: new Date("2026-08-12T08:00:00.000Z"),
          reporterName: null,
          reporterUsername: null,
          reporterRealName: null,
        }],
      },
      isLoading: false,
      error: null,
      refetch: mocks.refetch,
      isFetching: false,
    });

    render(<BrandLogoMonitoring />);

    expect(screen.getByText("Logo 異常監測")).toBeInTheDocument();
    expect(screen.getByText("啟用文字備援")).toBeInTheDocument();
    expect(screen.getByText("已切換備援圖片")).toBeInTheDocument();
    expect(screen.getByText("→ /manus-storage/logo-google-drive.png")).toBeInTheDocument();
    expect(screen.getByText("未登入訪客")).toBeInTheDocument();
    expect(screen.getByText("390px")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: "篩選 Logo 異常裝置類型" }), { target: { value: "mobile" } });
    expect(mocks.listUseQuery).toHaveBeenLastCalledWith({ deviceClass: "mobile", page: 1, pageSize: 30 });
  });

  it("查詢失敗時顯示錯誤與重試操作", () => {
    mocks.summary24hUseQuery.mockReturnValue({ data: undefined, isLoading: false });
    mocks.listUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: "監測服務暫時無法使用" },
      refetch: mocks.refetch,
      isFetching: false,
    });

    render(<BrandLogoMonitoring />);

    expect(screen.getByRole("alert")).toHaveTextContent("Logo 異常紀錄載入失敗");
    expect(screen.getByText("監測服務暫時無法使用")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重試載入" }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  it("回報者同時提供姓名與登入帳號時會並列顯示", () => {
    mocks.summary24hUseQuery.mockReturnValue({ data: { total: 1, switched: 0, textFallback: 1, windowHours: 24, since: new Date(), alert: { thresholdCount: 3, isEnabled: true } }, isLoading: false });
    mocks.listUseQuery.mockReturnValue({
      data: {
        total: 1, page: 1, pageSize: 30, totalPages: 1,
        events: [{ id: 2, pagePath: "/", failedSrc: "/logo.webp", deviceClass: "desktop", failureStage: "initial", recoveryOutcome: "text_fallback", reporterUserId: 5, reportedAt: new Date(), reporterRealName: "王小明", reporterName: "王小明", reporterUsername: "wang" }],
      },
      isLoading: false, error: null, refetch: mocks.refetch, isFetching: false,
    });

    render(<BrandLogoMonitoring />);

    expect(screen.getByText("王小明（wang）")).toBeInTheDocument();
  });

  it("可暫時關閉 Logo 異常監測並保留既有警示門檻", () => {
    mocks.summary24hUseQuery.mockReturnValue({ data: { total: 0, switched: 0, textFallback: 0, windowHours: 24, since: new Date(), alert: { thresholdCount: 7, isEnabled: true } }, isLoading: false });
    mocks.listUseQuery.mockReturnValue({ data: { total: 0, page: 1, pageSize: 30, totalPages: 0, events: [] }, isLoading: false, error: null, refetch: mocks.refetch, isFetching: false });

    render(<BrandLogoMonitoring />);

    fireEvent.click(screen.getByRole("button", { name: "暫時關閉異常監測" }));
    expect(mocks.setAlertThresholdMutate).toHaveBeenCalledWith({ thresholdCount: 7, isEnabled: false });
  });
});
