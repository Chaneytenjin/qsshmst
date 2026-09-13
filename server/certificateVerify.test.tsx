// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CertificateVerify from "../client/src/pages/CertificateVerify";

const mocks = vi.hoisted(() => ({
  decodeFromConstraints: vi.fn(),
  stop: vi.fn(),
}));

vi.mock("@zxing/browser", () => ({
  BrowserQRCodeReader: class {
    decodeFromConstraints = mocks.decodeFromConstraints;
  },
}));

vi.mock("../client/src/lib/trpc", () => ({
  trpc: {
    activationCertificates: {
      verify: {
        useQuery: (input: { code?: string; certificateNumber?: string }) => ({
          isLoading: false,
          isError: false,
          data: input.code && input.code !== "pending" ? { isValid: true, status: "valid", certificateNumber: "QSM-ACT-91-TEST", issuedAt: new Date("2026-08-13T00:00:00.000Z"), documentType: "帳號啟用書" } : undefined,
        }),
      },
    },
  },
}));

vi.mock("../client/src/components/BrandLogo", () => ({ BrandLogo: () => <div>LOGO</div> }));

describe("公開啟用書 QR 鏡頭掃描", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("讀取 QR 驗證連結後會自動帶入 token、停止鏡頭並顯示有效文件結果", async () => {
    let onResult: ((result: { getText: () => string } | undefined) => void) | undefined;
    mocks.decodeFromConstraints.mockImplementation(async (_constraints: unknown, _video: unknown, callback: typeof onResult) => {
      onResult = callback;
      return { stop: mocks.stop };
    });

    render(<CertificateVerify />);
    fireEvent.click(screen.getByRole("button", { name: "使用手機鏡頭掃描 QR Code" }));

    await waitFor(() => expect(mocks.decodeFromConstraints).toHaveBeenCalledWith(expect.objectContaining({ video: expect.objectContaining({ facingMode: { ideal: "environment" } }) }), expect.anything(), expect.any(Function)));
    onResult?.({ getText: () => "https://qingshuimed.example/certificate-verify?code=scanned-token" });

    await waitFor(() => expect(screen.getByText("文件驗證通過")).toBeInTheDocument());
    expect(screen.getByDisplayValue("scanned-token")).toBeInTheDocument();
    await waitFor(() => expect(mocks.stop).toHaveBeenCalled());
  });
});
