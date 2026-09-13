export type ReimbursementCategorySummaryExport = {
  month: string;
  totalAmount: number;
  claimCount: number;
  categories: Array<{ category: string; totalAmount: number; itemCount: number }>;
};

function escapeCsvCell(value: string | number): string {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function downloadReimbursementSummaryCsv(summary: ReimbursementCategorySummaryExport): void {
  const rows = [
    ["月份", "類別", "支出金額（TWD）", "明細筆數", "核准案件數"],
    ...summary.categories.map((item) => [summary.month, item.category, item.totalAmount.toFixed(2), item.itemCount, summary.claimCount]),
    [summary.month, "合計", summary.totalAmount.toFixed(2), summary.categories.reduce((total, item) => total + item.itemCount, 0), summary.claimCount],
  ];
  const csv = `\ufeff${rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `清水高中媒體服務隊管理系統-報帳分類支出統計-${summary.month}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadMultiMonthReimbursementSummaryCsv(summaries: ReimbursementCategorySummaryExport[]): void {
  const orderedSummaries = [...summaries].sort((left, right) => left.month.localeCompare(right.month));
  if (!orderedSummaries.length) return;
  const rows = [
    ["月份", "類別", "支出金額（TWD）", "明細筆數", "核准案件數"],
    ...orderedSummaries.flatMap((summary) => [
      ...summary.categories.map((item) => [summary.month, item.category, item.totalAmount.toFixed(2), item.itemCount, summary.claimCount]),
      [summary.month, "合計", summary.totalAmount.toFixed(2), summary.categories.reduce((total, item) => total + item.itemCount, 0), summary.claimCount],
    ]),
    ["全部月份", "總計", orderedSummaries.reduce((total, summary) => total + summary.totalAmount, 0).toFixed(2), orderedSummaries.reduce((total, summary) => total + summary.categories.reduce((count, item) => count + item.itemCount, 0), 0), orderedSummaries.reduce((total, summary) => total + summary.claimCount, 0)],
  ];
  const csv = `\ufeff${rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `清水高中媒體服務隊管理系統-報帳分類支出統計-${orderedSummaries[0]!.month}-至-${orderedSummaries[orderedSummaries.length - 1]!.month}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
