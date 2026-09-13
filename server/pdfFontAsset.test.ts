import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ storageGetSignedUrl: vi.fn() }));
vi.mock("./storage", () => mocks);

import { PDF_CJK_FONT_STORAGE_KEY, getPdfCjkFontBytes, servePdfCjkFont } from "./pdfFontAsset";

describe("PDF 中文字型同源代理", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.storageGetSignedUrl.mockResolvedValue("https://storage.example/font.otf");
  });

  it("會由伺服器取得簽名字型並轉成 Buffer，避免前端跨來源載入", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }));
    await expect(getPdfCjkFontBytes()).resolves.toEqual(Buffer.from([1, 2, 3]));
    expect(mocks.storageGetSignedUrl).toHaveBeenCalledWith(PDF_CJK_FONT_STORAGE_KEY);
  });

  it("以同源字型內容回應瀏覽器，並設定正確內容型別", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new Uint8Array([1, 2]).buffer }));
    const res = { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), send: vi.fn(), json: vi.fn() } as any;
    await servePdfCjkFont({} as any, res);
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "font/ttf");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(Buffer.from([1, 2]));
  });
});
