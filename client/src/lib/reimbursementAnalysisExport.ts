import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { applySystemPdfWatermark } from "./pdfWatermark";

export async function exportReimbursementAnalysisPdf(input: { element: HTMLElement; year: number; exportedBy: string }) {
  const canvas = await html2canvas(input.element, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,
    logging: false,
  });
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 12;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const availableWidth = pageWidth - margin * 2;
  const imageHeight = (canvas.height / canvas.width) * availableWidth;
  const image = canvas.toDataURL("image/png");
  pdf.setFontSize(12);
  pdf.text(`${input.year} 年度報帳分析`, margin, margin);
  pdf.setFontSize(8);
  pdf.text(`匯出人員：${input.exportedBy}　匯出時間：${new Date().toLocaleString("zh-TW", { hour12: false })}`, margin, margin + 5);
  let renderedHeight = 0;
  let page = 0;
  const firstPageTop = margin + 10;
  const usableFirstHeight = pageHeight - firstPageTop - margin;
  while (renderedHeight < imageHeight) {
    if (page > 0) pdf.addPage();
    const top = page === 0 ? firstPageTop : margin;
    const usableHeight = page === 0 ? usableFirstHeight : pageHeight - margin * 2;
    const sourceOffset = (renderedHeight / imageHeight) * canvas.height;
    const sourceHeight = Math.min((usableHeight / imageHeight) * canvas.height, canvas.height - sourceOffset);
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = Math.ceil(sourceHeight);
    const context = slice.getContext("2d");
    if (!context) throw new Error("無法建立圖表 PDF 畫布");
    context.drawImage(canvas, 0, sourceOffset, canvas.width, sourceHeight, 0, 0, canvas.width, slice.height);
    const renderedSliceHeight = (slice.height / canvas.width) * availableWidth;
    pdf.addImage(slice.toDataURL("image/png"), "PNG", margin, top, availableWidth, renderedSliceHeight, undefined, "FAST");
    renderedHeight += renderedSliceHeight;
    page += 1;
  }
  applySystemPdfWatermark(pdf);
  pdf.save(`報帳年度分析-${input.year}.pdf`);
}
