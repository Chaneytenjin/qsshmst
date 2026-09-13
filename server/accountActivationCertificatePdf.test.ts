import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import PDFDocument from "pdfkit";
import { buildAccountActivationCertificatePdf } from "./accountActivationCertificatePdf";

describe("帳號啟用書 PDF 附件", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("產生可附加的 PDF，且 PDF 輸入契約不包含登入憑證", async () => {
    const font = await readFile("/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf");
    const seal = Buffer.from("circular-seal-test-buffer");
    const userRoundMark = Buffer.from("user-round-mark-test-buffer");
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      const asset = url.endsWith(".otf") || url.endsWith(".ttf") ? font : url.includes("user-round-mark") ? userRoundMark : seal;
      return { ok: true, arrayBuffer: async () => asset.buffer.slice(asset.byteOffset, asset.byteOffset + asset.byteLength) };
    });
    vi.stubGlobal("fetch", fetchMock);
    const imageSpy = vi.spyOn(PDFDocument.prototype, "image") as any;
    imageSpy.mockImplementation(function (this: PDFDocument) { return this; });
    const textSpy = vi.spyOn(PDFDocument.prototype, "text");
    const rotateSpy = vi.spyOn(PDFDocument.prototype, "rotate");
    const fillColorSpy = vi.spyOn(PDFDocument.prototype, "fillColor");
    const opacitySpy = vi.spyOn(PDFDocument.prototype, "opacity");
    const fontSpy = vi.spyOn(PDFDocument.prototype, "font");

    const pdf = await buildAccountActivationCertificatePdf({
      account: {
        id: 42,
        username: "media-student",
        name: "媒體同學",
        role: "student",
        createdAt: new Date("2026-08-12T00:00:00.000Z"),
      },
      certificate: {
        certificateNumber: "QSM-ACT-42-TEST",
        issuedAt: new Date("2026-08-12T01:00:00.000Z"),
        accountLabel: "media-student",
      },
      isTemporaryPassword: true,
      assetBaseUrl: "https://app.example.com",
    });

    expect(fetchMock).toHaveBeenCalledWith("https://app.example.com/storage/NotoSansCJKtc-Regular_ca19d3ec.otf");
    expect(fetchMock).toHaveBeenCalledWith("https://app.example.com/storage/qingshui-media-service-circular-seal-alpha_cf98cb70.png");
    expect(fetchMock).toHaveBeenCalledWith("https://app.example.com/storage/qingshui-media-service-user-round-mark_fb0d86b2.png");
    expect(fetchMock).toHaveBeenCalledWith("https://app.example.com/storage/WindSong-Medium_edcce91e.ttf");
    expect(rotateSpy).toHaveBeenCalledWith(-33, { origin: [297, 412] });
    expect(fillColorSpy).toHaveBeenNthCalledWith(1, "#0e7490");
    expect(opacitySpy).toHaveBeenNthCalledWith(1, 0.065);
    expect(textSpy.mock.calls.filter(([text]) => text === "清水高中媒體服務隊管理系統")).toHaveLength(1);
    expect(textSpy.mock.calls.findIndex(([text]) => text === "清水高中媒體服務隊管理系統")).toBeLessThan(textSpy.mock.calls.findIndex(([text]) => text === "帳號啟用書"));
    expect(textSpy.mock.calls.some(([text]) => text === "掃描 QR Code 驗證文件")).toBe(true);
    expect(textSpy.mock.calls.some(([text, x, y]) => text === "文件簽核" && x === 60 && y === 704)).toBe(true);
    expect(textSpy.mock.calls.some(([text, x, y]) => text === "文件簽核" && x === 48 && y === 680)).toBe(false);
    expect(textSpy.mock.calls.some(([text]) => text === "負責人")).toBe(true);
    expect(textSpy.mock.calls.some(([text]) => text === "系統辦理員")).toBe(false);
    expect(textSpy.mock.calls.some(([text]) => text === "Chaney")).toBe(true);
    expect(textSpy.mock.calls.some(([text]) => text === "系統產生簽核樣式（非手寫）")).toBe(false);
    expect(fontSpy).toHaveBeenCalledWith("WindSong");
    expect(imageSpy).toHaveBeenCalledTimes(3);
    expect(imageSpy.mock.calls.some(([source, x, y, options]) => source.equals(userRoundMark) && x === 459 && y === 55 && options?.fit?.[0] === 70 && options?.fit?.[1] === 70)).toBe(true);
    expect(imageSpy.mock.calls.some(([, x, y, options]) => x === 122 && y === 699 && options?.fit?.[0] === 64)).toBe(true);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.byteLength).toBeGreaterThan(1_000);
    expect(pdf.toString("utf8")).not.toContain("Qingshui-Temp-87");
  });
});
