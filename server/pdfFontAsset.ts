import type { Request, Response } from "express";
import { storageGetSignedUrl } from "./storage";

export const PDF_CJK_FONT_STORAGE_KEY = "WenQuanYiZenHei_b459bdd3.ttf";

export async function getPdfCjkFontBytes(): Promise<Buffer> {
  const signedUrl = await storageGetSignedUrl(PDF_CJK_FONT_STORAGE_KEY);
  const response = await fetch(signedUrl);
  if (!response.ok) throw new Error(`PDF 字型下載失敗（${response.status}）`);
  return Buffer.from(await response.arrayBuffer());
}

/** 以同源回應提供 PDF 字型，避免瀏覽器追隨儲存簽名網址時遭受跨來源限制 */
export async function servePdfCjkFont(_req: Request, res: Response): Promise<void> {
  try {
    const fontBytes = await getPdfCjkFontBytes();
    res.setHeader("Content-Type", "font/ttf");
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader("Content-Length", String(fontBytes.length));
    res.status(200).send(fontBytes);
  } catch (error) {
    console.error("[PDF] CJK font proxy failed", error);
    res.status(503).json({ error: "PDF_FONT_UNAVAILABLE" });
  }
}
