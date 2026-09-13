import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, degrees, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { EQUIPMENT_CODE_MODE_COPY, LABEL_PAPER_SIZES, type EquipmentCodeMode, type LabelPaperSize } from "./equipmentLabelFormats";
import { SYSTEM_PDF_WATERMARK_TEXT } from "./pdfWatermark";

export const QR_PDF_FILENAME = "清水高中媒體服務隊管理系統-器材-識別碼-清單.pdf";
const PDF_CJK_FONT_URL = "/api/assets/pdf-cjk-font";

export type EquipmentLabelPdfItem = {
  id: number;
  name: string;
  codeId: string;
  location?: string | null;
  status?: string | null;
};

export type QrPdfExportOptions = {
  items: EquipmentLabelPdfItem[];
  codeMode: EquipmentCodeMode;
  labelPaperSize: LabelPaperSize;
  groupByLocation?: boolean;
  downloadedBy?: string | null;
};

type BarcodeBar = { x: number; y: number; width: number; height: number };

function dateLabel() {
  return new Date().toLocaleString("zh-TW", { dateStyle: "medium", timeStyle: "short", hour12: false });
}

async function loadCjkFont(pdf: PDFDocument): Promise<PDFFont> {
  const response = await fetch(PDF_CJK_FONT_URL);
  if (!response.ok) throw new Error("無法載入 PDF 中文字型");
  pdf.registerFontkit(fontkit);
  return pdf.embedFont(await response.arrayBuffer(), { subset: true });
}

function fitFontSize(font: PDFFont, text: string, maxWidth: number, initial: number, minimum = 5): number {
  let size = initial;
  while (size > minimum && font.widthOfTextAtSize(text, size) > maxWidth) size -= 0.5;
  return size;
}

function drawText(page: PDFPage, font: PDFFont, text: string, x: number, y: number, maxWidth: number, size: number, color = rgb(0.07, 0.09, 0.12)) {
  page.drawText(text || "未設定", { x, y, size: fitFontSize(font, text || "未設定", maxWidth, size), font, color, maxWidth });
}

function qrModules(value: string) {
  const qr = QRCode.create(value, { errorCorrectionLevel: "H" });
  return { size: qr.modules.size, data: qr.modules.data };
}

function drawQrVector(page: PDFPage, value: string, x: number, y: number, side: number) {
  const { size, data } = qrModules(value);
  const unit = side / size;
  page.drawRectangle({ x, y, width: side, height: side, color: rgb(1, 1, 1), borderColor: rgb(0.1, 0.1, 0.1), borderWidth: 0.25 });
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      if (data[row * size + column]) {
        page.drawRectangle({ x: x + column * unit, y: y + (size - row - 1) * unit, width: unit + 0.02, height: unit + 0.02, color: rgb(0, 0, 0) });
      }
    }
  }
}

function barcodeBars(value: string): { width: number; height: number; bars: BarcodeBar[] } {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(svg, value, { format: "CODE128", displayValue: false, width: 1, height: 48, margin: 0, background: "#ffffff", lineColor: "#000000" });
  const width = Number.parseFloat(svg.getAttribute("width") ?? "0");
  const height = Number.parseFloat(svg.getAttribute("height") ?? "48");
  const bars = Array.from(svg.querySelectorAll("rect"))
    .filter((rect) => (rect.getAttribute("fill") ?? "#000000").toLowerCase() !== "#ffffff")
    .map((rect) => ({
      x: Number.parseFloat(rect.getAttribute("x") ?? "0"),
      y: Number.parseFloat(rect.getAttribute("y") ?? "0"),
      width: Number.parseFloat(rect.getAttribute("width") ?? "0"),
      height: Number.parseFloat(rect.getAttribute("height") ?? "0"),
    }))
    .filter((bar) => bar.width > 0 && bar.height > 0);
  return { width: width || 1, height: height || 48, bars };
}

function drawBarcodeVector(page: PDFPage, value: string, x: number, y: number, width: number, height: number) {
  const barcode = barcodeBars(value);
  page.drawRectangle({ x, y, width, height, color: rgb(1, 1, 1), borderColor: rgb(0.1, 0.1, 0.1), borderWidth: 0.25 });
  barcode.bars.forEach((bar) => {
    page.drawRectangle({
      x: x + (bar.x / barcode.width) * width,
      y: y + height - ((bar.y + bar.height) / barcode.height) * height,
      width: (bar.width / barcode.width) * width,
      height: (bar.height / barcode.height) * height,
      color: rgb(0, 0, 0),
    });
  });
}

function drawCodeVisual(page: PDFPage, item: EquipmentLabelPdfItem, mode: EquipmentCodeMode, x: number, y: number, width: number, height: number) {
  if (mode === "qr") {
    const side = Math.min(width, height);
    drawQrVector(page, item.codeId, x + (width - side) / 2, y + (height - side) / 2, side);
    return;
  }
  if (mode === "barcode") {
    drawBarcodeVector(page, item.codeId, x, y + Math.max(0, (height - height * 0.58) / 2), width, height * 0.58);
    return;
  }
  const qrSide = Math.min(width * 0.44, height * 0.8);
  drawQrVector(page, item.codeId, x, y + (height - qrSide) / 2, qrSide);
  drawBarcodeVector(page, item.codeId, x + qrSide + width * 0.06, y + height * 0.22, width - qrSide - width * 0.06, height * 0.56);
}

function drawLabel(page: PDFPage, font: PDFFont, item: EquipmentLabelPdfItem, codeMode: EquipmentCodeMode, bounds: { x: number; y: number; width: number; height: number }, compact: boolean) {
  const { x, y, width, height } = bounds;
  const padding = compact ? 2 : 4;
  page.drawRectangle({ x, y, width, height, borderColor: rgb(0.08, 0.1, 0.12), borderWidth: 0.5, color: rgb(1, 1, 1) });
  const textWidth = compact ? width * 0.5 : width - padding * 2;
  const visualWidth = compact ? width * 0.43 : width - padding * 2;
  const visualHeight = compact ? height - padding * 2 : height * 0.47;
  const visualX = compact ? x + width - visualWidth - padding : x + padding;
  const visualY = compact ? y + padding : y + height * 0.23;
  const textX = x + padding;
  const textY = y + height - padding - (compact ? 4 : 5);
  const headingSize = compact ? 7 : 10;
  drawText(page, font, item.name, textX, textY, textWidth, headingSize);
  drawText(page, font, item.codeId, textX, textY - (compact ? 6.5 : 8), textWidth, compact ? 5.5 : 7, rgb(0.15, 0.17, 0.2));
  drawText(page, font, `位置：${item.location?.trim() || "未設定"}`, textX, textY - (compact ? 12.5 : 15), textWidth, compact ? 5 : 6, rgb(0.18, 0.2, 0.23));
  if (!compact) drawText(page, font, `狀態：${item.status || "未設定"}`, textX, textY - 22, textWidth, 6, rgb(0.18, 0.2, 0.23));
  drawCodeVisual(page, item, codeMode, visualX, visualY, visualWidth, visualHeight);
}

function drawDocumentHeader(page: PDFPage, font: PDFFont, codeMode: EquipmentCodeMode, downloadedBy?: string | null) {
  const { width, height } = page.getSize();
  drawText(page, font, "清水高中媒體服務隊管理系統", 10, height - 14, width - 20, 12);
  drawText(page, font, `器材識別碼清單 · ${EQUIPMENT_CODE_MODE_COPY[codeMode].label}`, 10, height - 21, width - 20, 8, rgb(0.22, 0.27, 0.33));
  drawText(page, font, `PDF 下載日期：${dateLabel()}　｜　管理人員：${downloadedBy?.trim() || "系統管理人員"}`, 10, 7, width - 20, 6, rgb(0.3, 0.34, 0.39));
}

function drawSystemPdfWatermark(page: PDFPage, font: PDFFont, compact = false) {
  const { width, height } = page.getSize();
  if (compact) {
    page.drawText("清水高中媒體服務隊", { x: 2, y: 2, size: 3.2, font, color: rgb(0.34, 0.55, 0.61), opacity: 0.32 });
    return;
  }
  page.drawText(SYSTEM_PDF_WATERMARK_TEXT, {
    x: width / 2 - font.widthOfTextAtSize(SYSTEM_PDF_WATERMARK_TEXT, 17) / 2,
    y: height / 2,
    size: 17,
    font,
    color: rgb(0.72, 0.84, 0.88),
    opacity: 0.42,
    rotate: degrees(35),
  });
}

function groupItems(items: EquipmentLabelPdfItem[], groupByLocation?: boolean) {
  if (!groupByLocation) return [{ location: "", items }];
  const groups = new Map<string, EquipmentLabelPdfItem[]>();
  items.forEach((item) => {
    const location = item.location?.trim() || "未設定";
    groups.set(location, [...(groups.get(location) ?? []), item]);
  });
  return Array.from(groups.entries()).map(([location, groupedItems]) => ({ location, items: groupedItems }));
}

/** 以原生文字與向量 QR／Barcode 產生可搜尋、可列印的器材識別碼 PDF */
export async function exportQrPrintSheetToPdf(options: QrPdfExportOptions): Promise<void> {
  if (options.items.length === 0) throw new Error("沒有可匯出的器材識別碼");
  const preset = LABEL_PAPER_SIZES[options.labelPaperSize];
  const pdf = await PDFDocument.create();
  const font = await loadCjkFont(pdf);
  const groups = groupItems(options.items, options.groupByLocation);

  if (preset.isLabelPrinter) {
    groups.flatMap((group) => group.items).forEach((item) => {
      const page = pdf.addPage([preset.widthMm * 2.83465, preset.heightMm * 2.83465]);
      drawLabel(page, font, item, options.codeMode, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() }, preset.heightMm <= 32);
      drawSystemPdfWatermark(page, font, true);
    });
  } else {
    const pageWidth = preset.widthMm * 2.83465;
    const pageHeight = preset.heightMm * 2.83465;
    const margin = 28.35;
    const headerHeight = 54;
    const footerHeight = 24;
    const rows = preset.labelsPerPage / preset.columns;
    const gap = 10;
    const labelWidth = (pageWidth - margin * 2 - gap * (preset.columns - 1)) / preset.columns;
    const labelHeight = (pageHeight - margin - headerHeight - footerHeight - gap * (rows - 1)) / rows;

    groups.forEach((group) => {
      group.items.forEach((item, index) => {
        if (index % preset.labelsPerPage === 0) {
          const page = pdf.addPage([pageWidth, pageHeight]);
          drawSystemPdfWatermark(page, font);
          drawDocumentHeader(page, font, options.codeMode, options.downloadedBy);
          if (group.location) drawText(page, font, `存放位置：${group.location}`, margin, pageHeight - 34, pageWidth - margin * 2, 8, rgb(0.2, 0.25, 0.3));
        }
        const page = pdf.getPages()[pdf.getPageCount() - 1];
        const localIndex = index % preset.labelsPerPage;
        const column = localIndex % preset.columns;
        const row = Math.floor(localIndex / preset.columns);
        drawLabel(page, font, item, options.codeMode, {
          x: margin + column * (labelWidth + gap),
          y: pageHeight - headerHeight - (row + 1) * labelHeight - row * gap,
          width: labelWidth,
          height: labelHeight,
        }, false);
      });
    });
  }

  const bytes = await pdf.save();
  const safeBytes = new Uint8Array(bytes.length);
  safeBytes.set(bytes);
  const blob = new Blob([safeBytes.buffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = QR_PDF_FILENAME;
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 0);
}
