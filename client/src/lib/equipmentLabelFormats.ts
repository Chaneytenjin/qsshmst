export type LabelPaperSize =
  | "a4-3x2"
  | "a4-2x2"
  | "a4-4x3"
  | "thermal-100x150"
  | "label-62x29"
  | "label-50x30";

export type EquipmentCodeMode = "qr" | "barcode" | "both";

export const EQUIPMENT_CODE_MODE_COPY: Record<EquipmentCodeMode, { label: string; shortLabel: string; scanHint: string }> = {
  qr: { label: "QR Code", shortLabel: "QR", scanHint: "掃描 QR Code" },
  barcode: { label: "Barcode", shortLabel: "BARCODE", scanHint: "掃描一維 Barcode" },
  both: { label: "QR Code + Barcode", shortLabel: "DUAL", scanHint: "自動辨識 QR Code 或 Barcode" },
};

export const LABEL_PAPER_SIZES: Record<LabelPaperSize, {
  name: string;
  description: string;
  pageSize: string;
  margin: string;
  columns: number;
  labelsPerPage: number;
  widthMm: number;
  heightMm: number;
  isLabelPrinter: boolean;
}> = {
  "a4-3x2": { name: "A4 標準 3 × 2", description: "每張 6 枚，適合一般 A4 標籤紙", pageSize: "A4 portrait", margin: "10mm", columns: 3, labelsPerPage: 6, widthMm: 210, heightMm: 297, isLabelPrinter: false },
  "a4-2x2": { name: "A4 大型 2 × 2", description: "每張 4 枚，適合較大的器材標籤", pageSize: "A4 portrait", margin: "10mm", columns: 2, labelsPerPage: 4, widthMm: 210, heightMm: 297, isLabelPrinter: false },
  "a4-4x3": { name: "A4 緊湊 4 × 3", description: "每張 12 枚，適合小型器材與收納盒", pageSize: "A4 portrait", margin: "8mm", columns: 4, labelsPerPage: 12, widthMm: 210, heightMm: 297, isLabelPrinter: false },
  "thermal-100x150": { name: "標籤機 100 × 150 mm", description: "每張 1 枚，適合熱感或單張標籤機", pageSize: "100mm 150mm", margin: "3mm", columns: 1, labelsPerPage: 1, widthMm: 100, heightMm: 150, isLabelPrinter: true },
  "label-62x29": { name: "標籤機 62 × 29 mm（橫式）", description: "每張 1 枚，適合常見熱感標籤與小型器材", pageSize: "62mm 29mm", margin: "0mm", columns: 1, labelsPerPage: 1, widthMm: 62, heightMm: 29, isLabelPrinter: true },
  "label-50x30": { name: "標籤機 50 × 30 mm（橫式）", description: "每張 1 枚，適合收納盒與小型器材", pageSize: "50mm 30mm", margin: "0mm", columns: 1, labelsPerPage: 1, widthMm: 50, heightMm: 30, isLabelPrinter: true },
};
