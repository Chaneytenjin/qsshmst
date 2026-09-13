// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-chart">{children}</div>,
  Tooltip: () => null,
  Legend: () => null,
}));

import { ChartContainer, ChartTooltipContent } from "../client/src/components/ui/chart";

function TestChart({ data }: { data: unknown[] }) {
  return <div data-testid="test-chart" data-point-count={data.length} />;
}

describe("圖表主題與大量資料可讀性", () => {
  it("資料點超過八筆時提供可捲動的密集圖表容器", () => {
    const data = Array.from({ length: 24 }, (_, index) => ({ label: `08/${String(index + 1).padStart(2, "0")}`, count: index }));
    const { container } = render(
      <ChartContainer config={{ count: { label: "事件數", color: "oklch(0.72 0.14 210)" } }}>
        <TestChart data={data} />
      </ChartContainer>
    );

    expect(container.querySelector('[data-density="dense"]')).toHaveAttribute("data-chart-points", "24");
    expect(container.querySelector(".dashboard-chart-viewport")).toHaveAttribute("aria-label", "圖表含 24 筆資料，可水平捲動檢視");
    expect(container.querySelector(".dashboard-chart-canvas")).toHaveStyle({ minWidth: "1344px" });
  });

  it("資料提示框顯示資料點標籤、零值與清楚的主題表面類別", () => {
    render(
      <ChartContainer config={{ count: { label: "事件數", color: "oklch(0.72 0.14 210)" } }}>
        <ChartTooltipContent active label="08/15" payload={[{ dataKey: "count", name: "count", value: 0, color: "#4cc9f0", payload: { label: "08/15" } } as never]} />
      </ChartContainer>
    );

    expect(screen.getByText("08/15")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(document.querySelector(".chart-tooltip-surface")).toBeInTheDocument();
  });
});
