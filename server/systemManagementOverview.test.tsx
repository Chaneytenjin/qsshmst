// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import SystemManagementOverview from "../client/src/pages/SystemManagementOverview";

const mocks = vi.hoisted(() => ({
  user: { id: 1, name: "創始管理員", role: "admin", isFounder: true },
}));

vi.mock("../client/src/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock("wouter", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactElement }) => React.cloneElement(children as React.ReactElement<any>, { href }),
}));

describe("系統管理總覽子頁", () => {
  afterEach(() => {
    cleanup();
    mocks.user = { id: 1, name: "創始管理員", role: "admin", isFounder: true };
  });

  it("提供系統管理入口，且創始管理員可看到所有受授權功能", () => {
    render(<SystemManagementOverview />);

    expect(screen.getByTestId("system-management-overview")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "系統管理" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /位置異動月度稽核/ })).toHaveAttribute("href", "/location-audit-report");
    expect(screen.getByRole("link", { name: /管控中心/ })).toHaveAttribute("href", "/audit-center/login");
    expect(screen.getByRole("link", { name: /資料庫維護/ })).toHaveAttribute("href", "/database-maintenance");
    expect(screen.getByRole("link", { name: /帳號管理/ })).toHaveAttribute("href", "/users");
    expect(screen.getByRole("link", { name: /位置異動月度稽核/ })).toHaveClass("system-management-overview-card");
    expect(screen.getAllByText("進入").length).toBeGreaterThan(0);
  });

  it("一般管理員只會看到原本有權存取的管理功能", () => {
    mocks.user = { id: 2, name: "一般管理員", role: "admin", isFounder: false };
    render(<SystemManagementOverview />);

    expect(screen.getByRole("link", { name: /緊急公告追蹤/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /位置異動月度稽核/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /帳號管理/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /提醒歷程管理/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /管控中心/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /資料庫維護/ })).not.toBeInTheDocument();
  });

  it("教師可從系統管理存取位置異動月度稽核，但不會取得管理者專用功能", () => {
    mocks.user = { id: 3, name: "教師帳號", role: "teacher", isFounder: false };
    render(<SystemManagementOverview />);

    expect(screen.getByRole("link", { name: /位置異動月度稽核/ })).toHaveAttribute("href", "/location-audit-report");
    expect(screen.queryByRole("link", { name: /帳號管理/ })).not.toBeInTheDocument();
  });
});
