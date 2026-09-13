import React, { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { trpc } from "../lib/trpc";
import { findEquipmentByCodeId } from "../lib/qrEquipment";
import { formatAuditActor } from "../lib/utils";
import { exportQrPrintSheetToPdf } from "../lib/qrPdfExport";
import { EQUIPMENT_CODE_MODE_COPY, LABEL_PAPER_SIZES, type EquipmentCodeMode, type LabelPaperSize } from "../lib/equipmentLabelFormats";
import { QRCodeCanvas } from "qrcode.react";
import JsBarcode from "jsbarcode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Barcode, CheckSquare, Clock3, Eye, FileDown, History, Printer, QrCode, Ruler, ScanLine, Search, Square, X } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/_core/hooks/useAuth";

function EquipmentBarcode({ value, className = "" }: { value: string; className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    JsBarcode(svgRef.current, value, {
      format: "CODE128",
      displayValue: false,
      height: 72,
      width: 2,
      margin: 8,
      background: "transparent",
      lineColor: "#111827",
    });
  }, [value]);

  return <svg ref={svgRef} className={className} aria-label={`Barcode ${value}`} role="img" />;
}

function EquipmentCodeVisual({ value, mode, compact = false }: { value: string; mode: EquipmentCodeMode; compact?: boolean }) {
  const qrSize = compact ? 72 : 128;
  if (mode === "qr") return <QRCodeCanvas value={value} size={qrSize} level="H" className="border bg-white p-1.5" />;
  if (mode === "barcode") return <div className="flex min-h-16 w-full items-center justify-center border bg-white px-2"><EquipmentBarcode value={value} className={compact ? "h-10 max-w-full" : "h-14 max-w-full"} /></div>;
  return <div className="flex w-full flex-col items-center gap-2"><QRCodeCanvas value={value} size={qrSize} level="H" className="border bg-white p-1.5" /><div className="flex min-h-12 w-full items-center justify-center border bg-white px-2"><EquipmentBarcode value={value} className={compact ? "h-8 max-w-full" : "h-12 max-w-full"} /></div></div>;
}

function getScannerFormats(codeMode: EquipmentCodeMode) {
  const barcodeFormats = [Html5QrcodeSupportedFormats.CODE_128];
  if (codeMode === "qr") return [Html5QrcodeSupportedFormats.QR_CODE];
  if (codeMode === "barcode") return barcodeFormats;
  return [Html5QrcodeSupportedFormats.QR_CODE, ...barcodeFormats];
}

function getBorrowScannerFormats(codeMode: EquipmentCodeMode, needsBorrowerQr: boolean) {
  return needsBorrowerQr ? [Html5QrcodeSupportedFormats.QR_CODE] : getScannerFormats(codeMode);
}

function QrCodePageSkeleton() {
  return (
    <div className="container mx-auto p-4 animate-fade-in" data-testid="qr-code-page-skeleton">
      <Skeleton className="h-9 w-72" />
      <Skeleton className="mt-3 h-9 w-52" />
      <div className="mt-7 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {[0, 1].map((item) => (
          <Card key={item} className="border-[oklch(0.22_0_0)] bg-[oklch(0.12_0_0)]">
            <CardHeader><Skeleton className="h-6 w-28" /></CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
      <section className="mt-8 border-t border-[oklch(0.25_0_0)] pt-6" data-testid="qr-print-skeleton">
        <Skeleton className="h-24 w-full" />
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <Card key={item} className="border-[oklch(0.22_0_0)] bg-[oklch(0.12_0_0)]">
              <CardContent className="flex flex-col items-center gap-4 pt-6">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-32 w-32" />
                <Skeleton className="h-4 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function formatRecentActivityTime(value: Date | string | null | undefined) {
  if (!value) return "時間未記錄";
  return new Date(value).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatPrintHistoryTime(value: Date | string | null | undefined) {
  if (!value) return "時間未記錄";
  return new Date(value).toLocaleString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
}

type BorrowBatchItem = {
  equipmentId: number;
  name: string;
  qrCodeId: string;
};

export default function QrCodeBorrowReturn({ initialView = "scanner" }: { initialView?: "scanner" | "print" }) {
  const { user } = useAuth();
  const { data: equipmentList, isLoading, error, refetch } = trpc.equipment.list.useQuery();
  const recentRecordsQuery = trpc.borrowRecords.list.useQuery();
  const printHistoryQuery = trpc.equipment.getQrPrintHistory.useQuery({ limit: 10 });
  const borrowMutation = trpc.equipment.borrow.useMutation();
  const returnMutation = trpc.equipment.return.useMutation();
  const resolveDynamicBorrowerQrMutation = trpc.equipment.resolveDynamicBorrowerQr.useMutation();
  const recordQrPrintMutation = trpc.equipment.recordQrPrint.useMutation({
    onSuccess: () => { void printHistoryQuery.refetch(); },
    onError: (error) => toast.error(error.message || "無法記錄列印歷程"),
  });

  const [borrowQrCodeId, setBorrowQrCodeId] = useState("");
  const [borrowUserId, setBorrowUserId] = useState("");
  const [authenticatedBorrowerId, setAuthenticatedBorrowerId] = useState<number | null>(null);
  const [borrowerScanStatus, setBorrowerScanStatus] = useState<string | null>(null);
  const [borrowBatchQueue, setBorrowBatchQueue] = useState<BorrowBatchItem[]>([]);
  const [isBatchConfirmOpen, setIsBatchConfirmOpen] = useState(false);
  const [isBatchBorrowing, setIsBatchBorrowing] = useState(false);
  const [returnQrCodeId, setReturnQrCodeId] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const [scanMode, setScanMode] = useState<"borrow" | "return">("borrow");
  const [equipmentCodeMode, setEquipmentCodeMode] = useState<EquipmentCodeMode>("both");
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState("準備掃描");
  const [isProcessing, setIsProcessing] = useState(false);
  const [printSelection, setPrintSelection] = useState<number[]>([]);
  const [hasExplicitPrintSelection, setHasExplicitPrintSelection] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [groupPdfByLocation, setGroupPdfByLocation] = useState(false);
  const [printSearch, setPrintSearch] = useState("");
  const [printCategoryFilter, setPrintCategoryFilter] = useState<number | undefined>();
  const [printLocationFilter, setPrintLocationFilter] = useState<string | undefined>();
  const [printLocationSort, setPrintLocationSort] = useState<"none" | "asc" | "desc">("none");
  const [labelPaperSize, setLabelPaperSize] = useState<LabelPaperSize>("a4-3x2");
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrReaderRef = useRef<HTMLDivElement>(null);
  const qrPrintSheetRef = useRef<HTMLElement>(null);
  const printStyleRef = useRef<HTMLStyleElement | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const borrowBatchQueueRef = useRef<BorrowBatchItem[]>([]);
  const needsBorrowerQr = scanMode === "borrow" && !borrowUserId;

  useEffect(() => {
    if (!scannerActive || !qrReaderRef.current) return;

    let disposed = false;
    const scanner = new Html5Qrcode(qrReaderRef.current.id, {
      verbose: false,
      formatsToSupport: getBorrowScannerFormats(equipmentCodeMode, needsBorrowerQr),
      useBarCodeDetectorIfSupported: !needsBorrowerQr && equipmentCodeMode !== "qr",
    });
    const clearScanner = () => {
      try { scanner.clear(); } catch { /* The scanner may already be cleared after a failed permission request */ }
    };
    const stopAndClear = () => {
      if (scanner.isScanning) {
        void scanner.stop().catch(() => {}).finally(clearScanner);
      } else {
        clearScanner();
      }
    };

    scannerRef.current = scanner;
    setScannerError(null);
    setScanFeedback("正在請求相機權限");

    void scanner.start(
      { facingMode: { ideal: "environment" } },
      {
        fps: 10,
        qrbox: !needsBorrowerQr && equipmentCodeMode === "barcode" ? { width: 340, height: 150 } : { width: 250, height: 250 },
        aspectRatio: !needsBorrowerQr && equipmentCodeMode === "barcode" ? 2.2 : 1.0,
        videoConstraints: !needsBorrowerQr && equipmentCodeMode === "barcode"
          ? { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: { ideal: "environment" } },
      },
      (decodedText) => { void handleScanResult(decodedText); },
      (error) => { console.debug("QR scan attempt:", error); }
    ).then(() => {
      if (disposed) {
        stopAndClear();
        return;
      }
      setScanFeedback(needsBorrowerQr ? "相機已啟動，請掃描使用者個人 QR Code" : "相機已啟動，請掃描器材識別碼");
    }).catch((err: unknown) => {
      if (disposed) return;
      const message = err instanceof Error ? err.message : String(err);
      const permissionDenied = /permission|notallowed|denied/i.test(message);
      setScannerError(permissionDenied ? "尚未取得相機權限，請允許瀏覽器使用相機後再試一次" : `無法啟動相機: ${message}`);
      setScanFeedback(permissionDenied ? "相機權限尚未允許" : "相機啟動失敗，請檢查權限後重試");
      setScannerActive(false);
    });

    return () => {
      disposed = true;
      if (scannerRef.current === scanner) scannerRef.current = null;
      stopAndClear();
    };
  }, [scannerActive, scanMode, equipmentCodeMode, needsBorrowerQr]);

  useEffect(() => {
    const resetPrintSelection = () => {
      printStyleRef.current?.remove();
      printStyleRef.current = null;
      setPrintSelection([]);
      setHasExplicitPrintSelection(false);
    };
    window.addEventListener("afterprint", resetPrintSelection);
    return () => window.removeEventListener("afterprint", resetPrintSelection);
  }, []);

  useEffect(() => {
    const printEquipmentIds = Array.from(new Set(
      (new URLSearchParams(window.location.search).get("print") ?? "")
        .split(",")
        .map(Number)
        .filter((id) => Number.isInteger(id) && equipmentList?.some((equipment) => equipment.id === id))
    ));
    if (printEquipmentIds.length === 0) return;

    setPrintSearch("");
    setPrintCategoryFilter(undefined);
    setPrintSelection(printEquipmentIds);
    setHasExplicitPrintSelection(true);
  }, [equipmentList]);

  const queueBorrowEquipment = (codeValue: string) => {
    const normalizedCode = codeValue.trim();
    const equipmentToBorrow = findEquipmentByCodeId(equipmentList, normalizedCode);
    if (!equipmentToBorrow) {
      toast.error("找不到該識別碼對應的器材");
      return;
    }

    if (borrowBatchQueueRef.current.some((item) => item.equipmentId === equipmentToBorrow.id)) {
      toast.error(`器材 ${equipmentToBorrow.name} 已在待確認清單中`);
      return;
    }

    const nextQueue = [...borrowBatchQueueRef.current, { equipmentId: equipmentToBorrow.id, name: equipmentToBorrow.name, qrCodeId: normalizedCode }];
    borrowBatchQueueRef.current = nextQueue;
    setBorrowBatchQueue(nextQueue);
    setBorrowQrCodeId("");
    setScanFeedback(`已加入 ${equipmentToBorrow.name}，可繼續掃描`);
    lastScanTimeRef.current = 0;
    toast.success(`已加入 ${equipmentToBorrow.name}，可繼續掃描或確認批量借用`);
  };

  const resetBorrowScanSession = () => {
    setBorrowQrCodeId("");
    setBorrowUserId("");
    setAuthenticatedBorrowerId(null);
    setBorrowerScanStatus(null);
    borrowBatchQueueRef.current = [];
    setBorrowBatchQueue([]);
  };

  const confirmBorrowBatch = async () => {
    if (!authenticatedBorrowerId || !borrowUserId || borrowBatchQueue.length === 0) {
      toast.error("請先完成借用者認證並掃描至少一項器材");
      return;
    }

    setIsBatchBorrowing(true);
    const succeededEquipmentIds: number[] = [];
    const failedEquipmentNames: string[] = [];

    try {
      const currentBorrowerId = (await resolveDynamicBorrowerQrMutation.mutateAsync({ value: borrowUserId.trim() })).userId;
      for (const item of borrowBatchQueue) {
        try {
          await borrowMutation.mutateAsync({ equipmentId: item.equipmentId, userId: currentBorrowerId });
          succeededEquipmentIds.push(item.equipmentId);
        } catch {
          failedEquipmentNames.push(item.name);
        }
      }

      if (succeededEquipmentIds.length > 0) {
        const nextQueue = borrowBatchQueueRef.current.filter((item) => !succeededEquipmentIds.includes(item.equipmentId));
        borrowBatchQueueRef.current = nextQueue;
        setBorrowBatchQueue(nextQueue);
        refetch();
        void recentRecordsQuery.refetch();
      }

      if (failedEquipmentNames.length > 0) {
        toast.error(`以下器材借用失敗，已保留在清單中：${failedEquipmentNames.join("、")}`);
        return;
      }

      toast.success(`已完成 ${succeededEquipmentIds.length} 項器材借用`);
      setIsBatchConfirmOpen(false);
      setScannerActive(false);
      resetBorrowScanSession();
    } finally {
      setIsBatchBorrowing(false);
    }
  };

  const handleScanResult = async (codeValue: string) => {
    // Prevent duplicate scans within 2 seconds
    const now = Date.now();
    if (now - lastScanTimeRef.current < 2000) {
      return;
    }
    lastScanTimeRef.current = now;

    if (isProcessing) {
      return;
    }

    setIsProcessing(true);

    try {
      if (scanMode === "borrow") {
        if (!borrowUserId) {
          if (!/^QSSH-USER-V2:/i.test(codeValue.trim())) {
            setScanFeedback("請先掃描有效的使用者個人資料 QR Code");
            toast.error("請先掃描使用者個人資料 QR Code，器材識別碼請在下一步掃描");
            return;
          }
          const borrower = await resolveDynamicBorrowerQrMutation.mutateAsync({ value: codeValue.trim() });
          setBorrowUserId(codeValue.trim());
          setAuthenticatedBorrowerId(borrower.userId);
          setScanFeedback(`使用者 #${borrower.userId} 已驗證，請掃描器材`);
          setBorrowerScanStatus(`已驗證使用者 #${borrower.userId}；請繼續掃描器材識別碼`);
          lastScanTimeRef.current = 0;
          toast.success("使用者個人資料 QR Code 已驗證，請繼續掃描器材");
          return;
        }
        queueBorrowEquipment(codeValue);
      } else {
        setReturnQrCodeId(codeValue);
        setScanFeedback("已讀取器材識別碼，正在處理歸還");
        await performReturn(codeValue);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const performBorrow = async (codeValue: string, userQrCode: string) => {
    try {
      const borrowerCode = userQrCode.trim();
      if (!/^QSSH-USER-V2:/i.test(borrowerCode)) {
        toast.error("借用者必須使用有效的個人資料 QR Code，請重新掃描");
        return;
      }
      const borrowerId = (await resolveDynamicBorrowerQrMutation.mutateAsync({ value: borrowerCode })).userId;
      const equipmentToBorrow = findEquipmentByCodeId(equipmentList, codeValue);
      if (!equipmentToBorrow) {
        toast.error("找不到該識別碼對應的器材");
        return;
      }
      await borrowMutation.mutateAsync({
        equipmentId: equipmentToBorrow.id,
        userId: borrowerId,
      });
      toast.success(`器材 ${equipmentToBorrow.name} 借用成功！`);
      setScanFeedback(`已完成 ${equipmentToBorrow.name} 借用`);
      setBorrowQrCodeId("");
      resetBorrowScanSession();
      // Stop scanner after successful borrow
      setScannerActive(false);
      refetch();
      void recentRecordsQuery.refetch();
    } catch (err: any) {
      toast.error(`借用失敗: ${err.message}`);
    }
  };

  const performReturn = async (codeValue: string) => {
    try {
      const equipmentToReturn = findEquipmentByCodeId(equipmentList, codeValue);
      if (!equipmentToReturn) {
        toast.error("找不到該識別碼對應的器材");
        return;
      }
      await returnMutation.mutateAsync({
        equipmentId: equipmentToReturn.id,
      });
      toast.success(`器材 ${equipmentToReturn.name} 歸還成功！`);
      setScanFeedback(`已完成 ${equipmentToReturn.name} 歸還`);
      setReturnQrCodeId("");
      // Stop scanner after successful return
      setScannerActive(false);
      refetch();
      void recentRecordsQuery.refetch();
    } catch (err: any) {
      toast.error(`歸還失敗: ${err.message}`);
    }
  };

  const handleBorrow = async () => {
    if (!borrowQrCodeId || !borrowUserId) {
      toast.error("請先掃描或輸入器材識別碼與借用者個人資料 QR Code");
      return;
    }
    setIsProcessing(true);
    try {
      await performBorrow(borrowQrCodeId, borrowUserId);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReturn = async () => {
    if (!returnQrCodeId) {
      toast.error("請輸入器材識別碼");
      return;
    }
    setIsProcessing(true);
    try {
      await performReturn(returnQrCodeId);
    } finally {
      setIsProcessing(false);
    }
  };

  const openPrintDialog = () => {
    const preset = LABEL_PAPER_SIZES[labelPaperSize];
    printStyleRef.current?.remove();
    const printStyle = document.createElement("style");
    printStyle.media = "print";
    printStyle.textContent = `@page { size: ${preset.pageSize}; margin: ${preset.margin}; }`;
    document.head.appendChild(printStyle);
    printStyleRef.current = printStyle;
    setIsPrintPreviewOpen(false);
    window.setTimeout(() => window.print(), 0);
  };

  const openPrintPreview = (equipmentIds?: number[]) => {
    const nextEquipmentIds = equipmentIds ?? filteredEquipmentList
      .filter((equipment) => Boolean(equipment.qrCodeId))
      .map((equipment) => equipment.id);
    setPrintSelection(Array.from(new Set(nextEquipmentIds)));
    setHasExplicitPrintSelection(true);
    setIsPrintPreviewOpen(true);
  };

  const handlePrintAll = () => openPrintPreview();

  const handlePrintSelected = () => openPrintPreview(printSelection);

  const handlePrintSingle = (equipmentId: number) => openPrintPreview([equipmentId]);

  const confirmBatchPrint = async () => {
    const selectedEquipmentIds = printableSelectedEquipment.map((equipment) => equipment.id);
    if (selectedEquipmentIds.length === 0) {
      toast.error("請至少保留一項器材再列印");
      return;
    }
    try {
      await recordQrPrintMutation.mutateAsync({
        equipmentIds: selectedEquipmentIds,
        locationFilter: printLocationFilter,
        labelPaperSize,
      });
      openPrintDialog();
    } catch {
      // mutation callback already supplies a concise error, do not open the print dialog without a history record.
    }
  };

  const togglePrintSelection = (equipmentId: number) => {
    setHasExplicitPrintSelection(true);
    setPrintSelection((current) => current.includes(equipmentId)
      ? current.filter((id) => id !== equipmentId)
      : [...current, equipmentId]);
  };

  const selectAllFilteredForPrint = () => {
    const printableIds = filteredEquipmentList.filter((equipment) => Boolean(equipment.qrCodeId)).map((equipment) => equipment.id);
    const areAllSelected = printableIds.length > 0 && printableIds.every((id) => printSelection.includes(id));
    setHasExplicitPrintSelection(true);
    setPrintSelection((current) => areAllSelected
      ? current.filter((id) => !printableIds.includes(id))
      : Array.from(new Set([...current, ...printableIds])));
  };

  const handleExportPdf = async () => {
    if (printableSelectedEquipment.length === 0) {
      toast.error("沒有可匯出的器材識別碼");
      return;
    }

    setIsExportingPdf(true);
    try {
      await exportQrPrintSheetToPdf({
        items: printableSelectedEquipment.map((equipment) => ({
          id: equipment.id,
          name: equipment.name,
          codeId: equipment.qrCodeId!,
          location: equipment.location,
          status: equipment.status,
        })),
        codeMode: equipmentCodeMode,
        labelPaperSize,
        groupByLocation: groupPdfByLocation,
        downloadedBy: user?.realName || user?.name || user?.username || "系統管理人員",
      });
      toast.success(`${activeEquipmentCodeMode.label} 清單 PDF 已開始下載`);
    } catch (error) {
      console.error("PDF 匯出失敗", error);
      toast.error("PDF 匯出失敗，請稍後再試");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const printCategories = Array.from(
    new Map(
      (equipmentList ?? [])
        .map((equipment) => ({
          id: equipment.categoryId,
          name: (equipment as typeof equipment & { categoryName?: string | null }).categoryName,
        }))
        .filter((category): category is { id: number; name: string } => typeof category.id === "number" && Boolean(category.name))
        .map((category) => [category.id, category] as const)
    ).values()
  );
  const normalizedPrintSearch = printSearch.trim().toLocaleLowerCase();
  const filteredEquipmentList = (equipmentList ?? []).filter((equipment) => {
    const categoryName = (equipment as typeof equipment & { categoryName?: string | null }).categoryName ?? "";
    const matchesSearch = !normalizedPrintSearch || [
      equipment.name,
      equipment.qrCodeId,
      equipment.location,
      equipment.serialNumber,
      categoryName,
    ].some((value) => value?.toLocaleLowerCase().includes(normalizedPrintSearch));
    const matchesCategory = printCategoryFilter === undefined || equipment.categoryId === printCategoryFilter;
    const location = equipment.location?.trim() || "未設定";
    const matchesLocation = printLocationFilter === undefined || location === printLocationFilter;
    return matchesSearch && matchesCategory && matchesLocation;
  }).sort((left, right) => {
    if (printLocationSort === "none") return 0;
    const leftLocation = left.location?.trim() || "未設定";
    const rightLocation = right.location?.trim() || "未設定";
    const result = leftLocation.localeCompare(rightLocation, "zh-Hant");
    return printLocationSort === "asc" ? result : -result;
  });
  const printLocations = Array.from(new Set((equipmentList ?? []).map((equipment) => equipment.location?.trim() || "未設定"))).sort((left, right) => left.localeCompare(right, "zh-Hant"));
  const hasPrintFilters = Boolean(printSearch || printCategoryFilter !== undefined || printLocationFilter !== undefined);
  const printableFilteredEquipmentCount = filteredEquipmentList.filter((equipment) => Boolean(equipment.qrCodeId)).length;
  const areAllFilteredEquipmentSelected = printableFilteredEquipmentCount > 0 && filteredEquipmentList.filter((equipment) => Boolean(equipment.qrCodeId)).every((equipment) => printSelection.includes(equipment.id));
  const printableSelectedEquipment = hasExplicitPrintSelection
    ? filteredEquipmentList.filter((equipment) => Boolean(equipment.qrCodeId) && printSelection.includes(equipment.id))
    : filteredEquipmentList.filter((equipment) => Boolean(equipment.qrCodeId));
  const printableSelectedEquipmentCount = printableSelectedEquipment.length;
  const activeLabelPaper = LABEL_PAPER_SIZES[labelPaperSize];
  const activeEquipmentCodeMode = EQUIPMENT_CODE_MODE_COPY[equipmentCodeMode];
  const estimatedPrintPages = printableSelectedEquipmentCount === 0 ? 0 : Math.ceil(printableSelectedEquipmentCount / activeLabelPaper.labelsPerPage);
  const previewEquipment = printableSelectedEquipment.slice(0, Math.min(activeLabelPaper.labelsPerPage, 6));
  const recentBorrowRecords = (recentRecordsQuery.data ?? []).slice(0, 6);

  if (isLoading) return <QrCodePageSkeleton />;
  if (error) return <div className="text-center py-8 text-red-500">載入失敗: {error.message}</div>;

  return (
    <div className="qr-borrow-return-page container mx-auto p-4">
      <div className="print-hidden mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{initialView === "print" ? "器材識別碼列印清單" : "器材借用／歸還（QR Code・Barcode）"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{initialView === "print" ? "篩選、預覽、列印與匯出器材 QR Code、Barcode 或雙格式識別碼" : "同一組器材識別碼可產生 QR Code、Code 128 Barcode，或使用掃描器與手動輸入完成借用歸還"}</p>
        </div>
        <div className="qr-code-mode-switcher rounded-md border border-cyan-400/30 bg-cyan-500/5 p-1" role="group" aria-label="切換器材識別碼格式" data-testid="equipment-code-mode-switcher">
          {(["qr", "barcode", "both"] as EquipmentCodeMode[]).map((mode) => <Button key={mode} type="button" variant={equipmentCodeMode === mode ? "default" : "ghost"} size="sm" disabled={scannerActive} onClick={() => setEquipmentCodeMode(mode)} className="gap-1.5">{mode === "qr" ? <QrCode size={15} /> : mode === "barcode" ? <Barcode size={15} /> : <ScanLine size={15} />}{EQUIPMENT_CODE_MODE_COPY[mode].label}</Button>)}
        </div>
      </div>

      <div className="print-hidden mb-6 flex justify-end">
        {initialView === "scanner" ? (
          <Link href="/qrcode-print-list" className="qr-print-list-link inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold">
            <Printer size={16} />器材識別碼列印清單
          </Link>
        ) : (
          <Link href="/qrcode-borrow-return" className="qr-print-list-link inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold">
            <ScanLine size={16} />返回器材借用／歸還
          </Link>
        )}
      </div>

      <Tabs defaultValue="scanner" className={initialView === "scanner" ? "print-hidden w-full" : "hidden"}>
        <TabsList className="qr-borrow-return-tabs grid w-full grid-cols-2">
          <TabsTrigger value="scanner" className="qr-borrow-return-tab">掃描器</TabsTrigger>
          <TabsTrigger value="manual" className="qr-borrow-return-tab">手動輸入</TabsTrigger>
        </TabsList>

        <TabsContent value="scanner" className="space-y-4">
          {scannerError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{scannerError}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="qr-scanner-control-card">
              <CardHeader>
                <CardTitle>掃描模式</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>選擇操作模式</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={scanMode === "borrow" ? "default" : "outline"}
                      onClick={() => {
                        setScanMode("borrow");
                        setScannerError(null);
                      }}
                      disabled={scannerActive}
                    >
                      借用
                    </Button>
                    <Button
                      variant={scanMode === "return" ? "default" : "outline"}
                      onClick={() => {
                        setScanMode("return");
                        setScannerError(null);
                      }}
                      disabled={scannerActive}
                    >
                      歸還
                    </Button>
                  </div>
                </div>

                <div className="qr-scan-mode-hint rounded border border-cyan-400/20 bg-cyan-500/5 p-3 text-sm">
                  <p className="font-semibold text-cyan-100">目前掃描格式：{activeEquipmentCodeMode.label}</p>
                  <p className="mt-1 text-xs text-cyan-100/70">{activeEquipmentCodeMode.scanHint}切換格式前請先停止相機掃描</p>
                </div>
                {equipmentCodeMode === "barcode" && (
                  <p className="qr-barcode-scan-hint rounded border border-amber-400/35 bg-amber-400/10 p-3 text-xs text-amber-100">桌面掃描建議：請讓 Barcode 橫向置中、佔辨識框約七成寬度，保持螢幕亮度與環境照明；若相機選擇器出現，請選擇解析度較高的鏡頭</p>
                )}

                {scanMode === "borrow" && (
                  <div className="rounded border border-cyan-400/30 bg-cyan-500/10 p-3" data-testid="borrower-qr-scan-stage">
                    <p className="text-sm font-bold text-cyan-100">步驟 {borrowUserId ? "2／2：掃描器材" : "1／2：掃描借用者個人資料 QR Code"}</p>
                    <p className="mt-1 text-xs text-cyan-100/80">{borrowerScanStatus || "請先掃描使用者在個人設定頁顯示的動態 QR Code；完成驗證後，系統會切換為器材 QR／Barcode 掃描"}</p>
                    {borrowUserId && <Button type="button" size="sm" variant="outline" className="mt-3 border-cyan-200/70 text-cyan-100 hover:bg-cyan-200/10" onClick={resetBorrowScanSession}>重新掃描借用者</Button>}
                  </div>
                )}

                {scanMode === "borrow" && borrowUserId && (
                  <div className="qr-borrow-batch-queue rounded border border-cyan-400/30 bg-cyan-500/10 p-3" data-testid="borrow-batch-queue" aria-live="polite">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-cyan-100">待確認借用器材 {borrowBatchQueue.length} 項</p>
                        <p className="mt-1 text-xs text-cyan-100/80">使用者已認證，掃描器保持可用，可連續加入器材後再統一確認</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={borrowBatchQueue.length === 0 || isProcessing}
                        onClick={() => { setScannerActive(false); setIsBatchConfirmOpen(true); }}
                      >
                        確認批量借用（{borrowBatchQueue.length} 項）
                      </Button>
                    </div>
                    {borrowBatchQueue.length > 0 && (
                      <ul className="mt-3 space-y-2" aria-label="待確認借用器材">
                        {borrowBatchQueue.map((item) => (
                          <li key={item.equipmentId} className="flex items-center justify-between gap-3 rounded border border-cyan-300/20 bg-slate-950/20 px-3 py-2 text-xs">
                            <span className="min-w-0 truncate text-cyan-50">{item.name}・{item.qrCodeId}</span>
                            <Button type="button" size="sm" variant="ghost" className="shrink-0" onClick={() => {
                              const nextQueue = borrowBatchQueueRef.current.filter((queued) => queued.equipmentId !== item.equipmentId);
                              borrowBatchQueueRef.current = nextQueue;
                              setBorrowBatchQueue(nextQueue);
                            }} aria-label={`移除 ${item.name}`}>移除</Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <Button
                  onClick={() => {
                    const nextActive = !scannerActive;
                    setScannerActive(nextActive);
                    if (!nextActive) setScanFeedback("掃描已暫停");
                  }}
                  className="qr-scanner-toggle w-full"
                  disabled={isProcessing}
                  aria-pressed={scannerActive}
                >
                  <ScanLine size={17} />
                  {scannerActive ? "停止掃描" : "開始掃描"}
                </Button>
              </CardContent>
            </Card>

            <Card className="qr-scan-result-card">
              <CardHeader>
                <CardTitle>掃描結果</CardTitle>
              </CardHeader>
              <CardContent>
                {scanMode === "borrow" && borrowQrCodeId && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">器材識別碼：</p>
                    <p className="font-mono text-lg">{borrowQrCodeId}</p>
                    <p className="text-sm font-semibold">借用者個人 QR Code：</p>
                    <p className="font-mono text-lg">{borrowUserId}</p>
                  </div>
                )}
                {scanMode === "return" && returnQrCodeId && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">器材識別碼：</p>
                    <p className="font-mono text-lg">{returnQrCodeId}</p>
                  </div>
                )}
                {!borrowQrCodeId && !returnQrCodeId && (
                  <p className="text-gray-500">{activeEquipmentCodeMode.scanHint}以顯示結果</p>
                )}
                {isProcessing && (
                  <p className="text-blue-500 text-sm mt-2">處理中...</p>
                )}
              </CardContent>
            </Card>
          </div>

          <section className={`qr-scanner-shell ${scannerActive ? "is-active" : "is-idle"}`} data-testid="qr-scanner-shell" aria-label="QR／Barcode 相機掃描器">
            <div className="qr-scanner-shell-header">
              <div className="flex min-w-0 items-center gap-3">
                <span className="qr-scanner-status-dot" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="qr-scanner-eyebrow">LIVE CAPTURE</p>
                  <p className="truncate text-sm font-semibold">{scannerActive ? "相機掃描中" : "掃描器待機"}</p>
                </div>
              </div>
              <span className="qr-scanner-format-badge">{activeEquipmentCodeMode.label}</span>
            </div>
            <div className="qr-scanner-viewport" data-testid="qr-scanner-viewport">
              <div className="qr-scanner-grid" aria-hidden="true" />
              <div className="qr-scanner-frame" aria-hidden="true"><span /><span /><span /><span /></div>
              <div className="qr-scanner-sweep" aria-hidden="true" />
              <div className="qr-scanner-instruction">
                <ScanLine size={17} aria-hidden="true" />
                <span>{scannerActive ? (needsBorrowerQr ? "請將使用者個人 QR Code 對準框線" : activeEquipmentCodeMode.scanHint) : "按下開始掃描，啟用裝置相機"}</span>
              </div>
              <div
                id="qr-reader"
                ref={qrReaderRef}
                style={{
                  width: "100%",
                  maxWidth: "500px",
                  margin: "0 auto",
                  display: scannerActive ? "block" : "none",
                }}
              />
              {!scannerActive && <div className="qr-scanner-idle-state" aria-hidden="true"><ScanLine size={40} /><span>READY TO SCAN</span></div>}
            </div>
            <div className="qr-scanner-statusbar" aria-live="polite">
              <div className="min-w-0">
                <span className="qr-scanner-status-label">STATUS</span>
                <span className="ml-2 truncate" data-testid="qr-scanner-status">{scanFeedback}</span>
              </div>
              {scanMode === "borrow" && borrowUserId && <span className="qr-scanner-queue-count">待確認 {borrowBatchQueue.length} 項</span>}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>借用器材</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="borrowQrCodeId">器材識別碼</Label>
                  <Input
                    id="borrowQrCodeId"
                    value={borrowQrCodeId}
                    onChange={(e) => setBorrowQrCodeId(e.target.value)}
                    placeholder="輸入 QR Code 或 Barcode 的器材識別碼"
                  />
                </div>
                <div>
                  <Label htmlFor="borrowUserId">借用者個人 QR Code</Label>
                  <Input
                    id="borrowUserId"
                    value={borrowUserId}
                    onChange={(e) => { setBorrowUserId(e.target.value); setBorrowerScanStatus(null); }}
                    placeholder="掃描或輸入 QSSH-USER-V2 個人 QR Code"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">請使用使用者個人設定頁即時顯示的動態 QR Code，不接受手動借用者 ID</p>
                </div>
                <Button onClick={handleBorrow} disabled={borrowMutation.isPending || isProcessing}>
                  {borrowMutation.isPending ? "借用中..." : "確認借用"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>歸還器材</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="returnQrCodeId">器材識別碼</Label>
                  <Input
                    id="returnQrCodeId"
                    value={returnQrCodeId}
                    onChange={(e) => setReturnQrCodeId(e.target.value)}
                    placeholder="輸入 QR Code 或 Barcode 的器材識別碼"
                  />
                </div>
                <Button onClick={handleReturn} disabled={returnMutation.isPending || isProcessing}>
                  {returnMutation.isPending ? "歸還中..." : "確認歸還"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isBatchConfirmOpen} onOpenChange={setIsBatchConfirmOpen}>
        <DialogContent className="qr-borrow-batch-confirm-dialog sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>確認批量借用</DialogTitle>
            <DialogDescription>將以已驗證使用者身分一次處理下列 {borrowBatchQueue.length} 項器材，送出後會寫入各筆借用與稽核紀錄</DialogDescription>
          </DialogHeader>
          <ul className="max-h-56 space-y-2 overflow-y-auto pr-1" aria-label="即將借用的器材">
            {borrowBatchQueue.map((item) => <li key={item.equipmentId} className="rounded border px-3 py-2 text-sm"><span className="font-semibold">{item.name}</span><span className="ml-2 font-mono text-xs text-muted-foreground">{item.qrCodeId}</span></li>)}
          </ul>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={isBatchBorrowing} onClick={() => { setIsBatchConfirmOpen(false); setScannerActive(true); }}>繼續掃描</Button>
            <Button type="button" disabled={isBatchBorrowing || borrowBatchQueue.length === 0} onClick={confirmBorrowBatch}>{isBatchBorrowing ? "借用處理中..." : `確認借用 ${borrowBatchQueue.length} 項`}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section className={initialView === "scanner" ? "print-hidden mt-8" : "hidden"} aria-labelledby="recent-borrow-return-title" data-testid="qr-recent-activity">
        <Card className="qr-recent-activity-card border-[oklch(0.24_0_0)] bg-[oklch(0.12_0_0)]">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle id="recent-borrow-return-title" className="flex items-center gap-2 text-white"><Clock3 size={18} className="text-[oklch(0.72_0.11_210)]" />最近借還紀錄</CardTitle>
              <p className="mt-1 text-sm text-[oklch(0.58_0_0)]">顯示最近六筆器材借用或歸還活動</p>
            </div>
            <span className="font-mono text-xs text-[oklch(0.58_0_0)]">{recentBorrowRecords.length} / 6</span>
          </CardHeader>
          <CardContent>
            {recentRecordsQuery.isLoading ? (
              <div className="space-y-3" data-testid="qr-recent-activity-skeleton"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
            ) : recentRecordsQuery.error ? (
              <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>最近借還紀錄載入失敗：{recentRecordsQuery.error.message}</AlertDescription></Alert>
            ) : recentBorrowRecords.length === 0 ? (
              <p className="py-4 text-center text-sm text-[oklch(0.58_0_0)]">目前尚無借還紀錄</p>
            ) : (
              <ol className="divide-y divide-[oklch(0.22_0_0)]">
                {recentBorrowRecords.map((record: any) => {
                  const isReturned = record.status === "returned";
                  const activityTime = isReturned ? record.actualReturnAt : record.borrowedAt;
                  return <li key={record.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><span className={isReturned ? "border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-200" : "border border-sky-400/30 bg-sky-500/10 px-2 py-0.5 text-xs font-semibold text-sky-200"}>{isReturned ? "歸還" : "借用"}</span><p className="truncate font-medium text-white">{record.equipmentName ?? "未命名器材"}</p></div><p className="mt-1 text-xs text-[oklch(0.58_0_0)]">借用人：{record.borrowerName ?? `帳號 #${record.borrowerId}`}{record.quantity > 1 ? ` · ${record.quantity} 件` : ""}</p></div><time className="shrink-0 font-mono text-xs text-[oklch(0.64_0_0)]">{formatRecentActivityTime(activityTime)}</time></li>;
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      </section>

      <section
        ref={qrPrintSheetRef}
        className={`qr-print-sheet mt-8 animate-fade-in ${initialView === "print" ? "" : "hidden"}`}
        data-testid="qr-print-sheet"
        data-print-mode={hasExplicitPrintSelection ? "selected" : "all"}
        data-label-paper-size={labelPaperSize}
        data-label-printer={activeLabelPaper.isLabelPrinter ? "true" : "false"}
      >
        <header className="qr-print-brand-header" data-testid="qr-print-brand-header">
          <div className="flex items-center gap-4">
            <BrandLogo
              data-testid="qr-print-brand-logo"
              className="brand-logo h-12 w-12 flex-shrink-0 border border-white/20 object-cover"
            />
            <div className="min-w-0">
              <p className="text-sm font-bold tracking-wide text-white">清水高中媒體服務隊管理系統</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-white">器材識別碼列印清單</h2>
              <p className="mt-1 text-xs tracking-[0.16em] text-[oklch(0.62_0_0)]">EQUIPMENT MANAGEMENT · {activeEquipmentCodeMode.shortLabel} INVENTORY</p>
            </div>
          </div>
          <p className="hidden font-mono text-xs tracking-[0.18em] text-[oklch(0.55_0_0)] sm:block">QSSM / PRINT</p>
        </header>

        <div className="qr-print-controls print-hidden mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white">器材 {activeEquipmentCodeMode.label} 批次列印</h3>
            <p className="mt-1 text-sm text-[oklch(0.55_0_0)]">依目前紙張尺寸排列器材識別碼與存放位置；可直接列印，或匯出含可搜尋文字與向量條碼的 PDF</p>
          </div>
          <div className="flex flex-wrap gap-2 self-start">
            {hasExplicitPrintSelection && printSelection.length > 0 ? (
              <Button type="button" variant="outline" onClick={handlePrintSelected} className="gap-2">
                <Eye size={16} />
                預覽已選取 {printSelection.length} 項
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={handlePrintAll} className="gap-2">
                <Eye size={16} />
                預覽 {activeEquipmentCodeMode.label} 清單
              </Button>
            )}
            {hasExplicitPrintSelection && printSelection.length > 0 && (
              <Button type="button" variant="ghost" onClick={() => { setPrintSelection([]); setHasExplicitPrintSelection(false); }} className="gap-2">
                列印全部
              </Button>
            )}
            <Button type="button" variant="outline" onClick={handleExportPdf} disabled={isExportingPdf} className="gap-2">
              <FileDown size={16} />
              {isExportingPdf ? "匯出中..." : "匯出為 PDF"}
            </Button>
            <label htmlFor="group-pdf-by-location" className="flex cursor-pointer items-center gap-2 rounded-md border border-[oklch(0.26_0_0)] px-3 py-2 text-sm text-[oklch(0.78_0_0)]">
              <Checkbox
                id="group-pdf-by-location"
                checked={groupPdfByLocation}
                onCheckedChange={(checked) => setGroupPdfByLocation(checked === true)}
              />
              依存放位置自動分頁
            </label>
          </div>
        </div>
        <div className="qr-print-filter-panel print-hidden mt-4 flex flex-col gap-3 rounded-md border border-[oklch(0.22_0_0)] bg-[oklch(0.12_0_0)] p-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(0.5_0_0)]" />
            <Input
              aria-label="搜尋器材識別碼"
              className="pl-9"
              placeholder="搜尋名稱、識別碼、存放位置或序號"
              value={printSearch}
              onChange={(event) => setPrintSearch(event.target.value)}
            />
          </div>
          <select
            aria-label="篩選器材識別碼分類"
            className="industrial-input min-w-36 sm:w-44"
            value={printCategoryFilter ?? ""}
            onChange={(event) => setPrintCategoryFilter(event.target.value ? Number(event.target.value) : undefined)}
          >
            <option value="">全部分類</option>
            {printCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <select
            aria-label="篩選器材識別碼存放位置"
            className="industrial-input min-w-40 sm:w-48"
            value={printLocationFilter ?? ""}
            onChange={(event) => setPrintLocationFilter(event.target.value || undefined)}
          >
            <option value="">全部存放位置</option>
            {printLocations.map((location) => <option key={location} value={location}>{location}</option>)}
          </select>
          <select
            aria-label="依器材識別碼存放位置排序"
            className="industrial-input min-w-40 sm:w-48"
            value={printLocationSort}
            onChange={(event) => setPrintLocationSort(event.target.value as "none" | "asc" | "desc")}
          >
            <option value="none">存放位置：原始順序</option>
            <option value="asc">存放位置：由近至遠</option>
            <option value="desc">存放位置：由遠至近</option>
          </select>
          {hasPrintFilters && (
            <Button type="button" variant="ghost" size="sm" className="gap-1 self-start sm:self-auto" onClick={() => { setPrintSearch(""); setPrintCategoryFilter(undefined); setPrintLocationFilter(undefined); }}>
              <X size={14} />清除
            </Button>
          )}
        </div>
        <div className="qr-print-selection-summary print-hidden mt-3 flex flex-wrap items-center justify-between gap-3 border border-[oklch(0.28_0.06_210)] bg-[oklch(0.15_0.02_210)] px-3 py-2">
          <p className="text-sm text-[oklch(0.82_0_0)]"><span className="font-mono font-bold text-white">{hasExplicitPrintSelection ? printSelection.length : printableFilteredEquipmentCount}</span> 項將納入目前批次列印{hasExplicitPrintSelection ? "（已選取）" : "（全部篩選結果）"}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={selectAllFilteredForPrint} disabled={printableFilteredEquipmentCount === 0} className="gap-1.5">
              {areAllFilteredEquipmentSelected ? <CheckSquare size={15} /> : <Square size={15} />}{areAllFilteredEquipmentSelected ? "取消全選" : "全選篩選結果"}
            </Button>
            {hasExplicitPrintSelection && <Button type="button" variant="ghost" size="sm" onClick={() => { setPrintSelection([]); setHasExplicitPrintSelection(false); }}>改列印全部</Button>}
          </div>
        </div>
        <div className="qr-print-paper-settings print-hidden mt-3 grid gap-3 border border-[oklch(0.24_0_0)] bg-[oklch(0.11_0_0)] p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <label htmlFor="qr-label-paper-size" className="mb-1.5 flex items-center gap-2 text-sm font-bold text-white"><Ruler size={15} />標籤紙尺寸</label>
            <select id="qr-label-paper-size" aria-label="選擇器材識別碼標籤紙尺寸" className="industrial-input w-full" value={labelPaperSize} onChange={(event) => setLabelPaperSize(event.target.value as LabelPaperSize)}>
              {Object.entries(LABEL_PAPER_SIZES).map(([value, preset]) => <option key={value} value={value}>{preset.name}</option>)}
            </select>
            <p className="mt-1.5 text-xs text-[oklch(0.58_0_0)]">{activeLabelPaper.description}瀏覽器列印時會自動套用此紙張尺寸</p>
          </div>
          <div className="border-l border-[oklch(0.26_0_0)] pl-0 text-left md:pl-4 md:text-right"><p className="text-xs text-[oklch(0.58_0_0)]">預估列印總頁數</p><p aria-label="預估列印總頁數" className="font-mono text-2xl font-black text-white">約 {estimatedPrintPages} 頁</p></div>
        </div>
        {equipmentList?.length === 0 ? (
          <div className="qr-print-empty text-center py-8 text-gray-500">
            <p className="text-4xl mb-4">📦</p>
            <p className="text-lg">目前沒有器材</p>
            <p className="text-sm">請在器材管理頁面新增器材</p>
          </div>
        ) : filteredEquipmentList.length === 0 ? (
          <div className="qr-print-empty text-center py-8 text-[oklch(0.55_0_0)]" data-testid="qr-print-empty-filter">
            <p className="text-lg text-white">找不到符合條件的器材</p>
            <p className="mt-1 text-sm">請調整關鍵字或分類篩選條件</p>
          </div>
        ) : (
          <div className="qr-print-grid qr-batch-print-layout mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="qr-batch-print-layout">
            {filteredEquipmentList.map((equipment, index) => (
              <Card
                key={equipment.id}
                data-testid="qr-print-card"
                data-print-selected={printSelection.includes(equipment.id) ? "true" : undefined}
                data-location={equipment.location || "未設定"}
                className="qr-print-card animate-fade-in"
                style={{ animationDelay: `${index * 45}ms` }}
              >
                <CardHeader className="qr-print-card-header">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="qr-print-card-kicker">{activeEquipmentCodeMode.shortLabel} EQUIPMENT LABEL</p><CardTitle className="truncate">{equipment.name}</CardTitle></div>
                    <label className="print-hidden flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-[oklch(0.72_0_0)]">
                      <Checkbox aria-label={`選取 ${equipment.name} 於識別碼列印版面`} checked={printSelection.includes(equipment.id)} disabled={!equipment.qrCodeId} onCheckedChange={() => togglePrintSelection(equipment.id)} />選取
                    </label>
                  </div>
                </CardHeader>
                <CardContent className="qr-print-card-content flex flex-col items-center space-y-2">
                  {equipment.qrCodeId ? (
                    <EquipmentCodeVisual value={equipment.qrCodeId} mode={equipmentCodeMode} />
                  ) : (
                    <div className="w-32 h-32 flex items-center justify-center border text-sm text-gray-500">
                      無器材識別碼
                    </div>
                  )}
                  <p className="qr-print-id text-sm font-mono">ID: {equipment.qrCodeId || "N/A"}</p>
                  <div className="qr-print-meta-grid"><p>狀態: {equipment.status}</p><p>存放位置: {equipment.location || "未設定"}</p></div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="print-hidden mt-2 gap-2"
                    onClick={() => handlePrintSingle(equipment.id)}
                    aria-label={`列印 ${equipment.name} ${activeEquipmentCodeMode.label}`}
                  >
                    <Printer size={14} />
                    單獨列印
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
      <section className={initialView === "print" ? "print-hidden mt-6" : "hidden"} aria-labelledby="qr-print-history-title" data-testid="qr-print-history">
        <Card className="qr-print-history-card border-[oklch(0.24_0_0)] bg-[oklch(0.12_0_0)]">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div><CardTitle id="qr-print-history-title" className="flex items-center gap-2 text-white"><History size={18} className="text-[oklch(0.72_0.11_210)]" />器材識別碼列印歷程</CardTitle><p className="mt-1 text-sm text-[oklch(0.58_0_0)]">保留最近十筆已確認的批次列印時間、數量與使用的標籤尺寸</p></div>
            <span className="font-mono text-xs text-[oklch(0.58_0_0)]">{printHistoryQuery.data?.length ?? 0} / 10</span>
          </CardHeader>
          <CardContent>
            {printHistoryQuery.isLoading ? <div className="space-y-3" data-testid="qr-print-history-skeleton"><Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-full" /></div> : printHistoryQuery.error ? <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>列印歷程載入失敗：{printHistoryQuery.error.message}</AlertDescription></Alert> : (printHistoryQuery.data?.length ?? 0) === 0 ? <p className="py-4 text-center text-sm text-[oklch(0.58_0_0)]">尚未有已確認的器材識別碼批次列印紀錄</p> : <ol className="divide-y divide-[oklch(0.22_0_0)]">{printHistoryQuery.data?.map((entry) => <li key={entry.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-medium text-white">{entry.equipmentCount} 項器材 · {LABEL_PAPER_SIZES[entry.labelPaperSize as LabelPaperSize]?.name ?? entry.labelPaperSize}</p><p className="mt-1 truncate text-xs text-[oklch(0.58_0_0)]">操作人：{entry.printedByName || entry.printedByUsername ? formatAuditActor({ name: entry.printedByName, username: entry.printedByUsername }) : `帳號 #${entry.printedById}`} · 位置：{entry.locationFilter || "全部位置"}</p></div><time className="shrink-0 font-mono text-xs text-[oklch(0.64_0_0)]">{formatPrintHistoryTime(entry.printedAt)}</time></li>)}</ol>}
          </CardContent>
        </Card>
      </section>
      <Dialog open={isPrintPreviewOpen} onOpenChange={setIsPrintPreviewOpen}>
        <DialogContent className="qr-print-preview-dialog max-w-3xl border-2 border-[oklch(0.28_0_0)] bg-[oklch(0.12_0_0)] text-white sm:rounded-none">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-black"><Eye className="h-5 w-5 text-[oklch(0.72_0.11_210)]" />{activeEquipmentCodeMode.label} 批次列印預覽</DialogTitle>
            <DialogDescription className="text-[oklch(0.65_0_0)]">請確認標籤紙尺寸、器材數量與預估頁數後，再開啟系統列印視窗</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem]">
            <div className="border border-[oklch(0.25_0_0)] bg-[oklch(0.1_0_0)] p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-bold">標籤內容預覽</span><span className="font-mono text-xs text-[oklch(0.6_0_0)]">前 {previewEquipment.length} 項</span></div>
              <div className={`grid gap-2 ${activeLabelPaper.columns === 1 ? "grid-cols-1" : activeLabelPaper.columns === 2 ? "grid-cols-2" : activeLabelPaper.columns === 3 ? "grid-cols-3" : "grid-cols-4"}`} data-testid="qr-print-preview-grid">
                {previewEquipment.map((equipment) => <div key={equipment.id} className="min-w-0 border border-dashed border-[oklch(0.36_0_0)] bg-white p-2 text-black"><p className="truncate text-xs font-black">{equipment.name}</p>{equipment.qrCodeId && <div className="my-2 flex min-h-16 w-full items-center justify-center"><EquipmentCodeVisual value={equipment.qrCodeId} mode={equipmentCodeMode} compact /></div>}<p className="truncate font-mono text-[0.6rem]">{equipment.qrCodeId}</p><p className="mt-1 truncate text-[0.6rem]">{equipment.location || "未設定"}</p></div>)}
              </div>
            </div>
            <aside className="space-y-3 border border-[oklch(0.25_0_0)] bg-[oklch(0.1_0_0)] p-4">
              <div><p className="text-xs text-[oklch(0.58_0_0)]">標籤尺寸</p><p className="mt-1 text-sm font-bold">{activeLabelPaper.name}</p></div>
              <div><p className="text-xs text-[oklch(0.58_0_0)]">列印標籤</p><p className="mt-1 font-mono text-2xl font-black">{printableSelectedEquipmentCount} 枚</p></div>
              <div><p className="text-xs text-[oklch(0.58_0_0)]">預估頁數</p><p className="mt-1 font-mono text-2xl font-black text-[oklch(0.76_0.11_210)]">約 {estimatedPrintPages} 頁</p></div>
              <p className="border-t border-[oklch(0.25_0_0)] pt-3 text-xs text-[oklch(0.58_0_0)]">PDF 匯出與瀏覽器列印都會套用目前尺寸；PDF 以原生文字與向量識別碼建立，不使用畫面截圖</p>
            </aside>
          </div>
          <div className="max-h-48 overflow-y-auto border border-[oklch(0.25_0_0)] p-3" aria-label="預覽列印項目排除清單"><div className="mb-2 flex items-center justify-between gap-3"><p className="text-sm font-bold">列印項目</p><p className="text-xs text-[oklch(0.58_0_0)]">取消勾選可排除此項</p></div><div className="grid gap-2 sm:grid-cols-2">{printableSelectedEquipment.map((equipment) => <label key={equipment.id} className="flex cursor-pointer items-center gap-2 border border-[oklch(0.26_0_0)] px-2 py-2 text-sm text-[oklch(0.85_0_0)]"><Checkbox aria-label={`保留 ${equipment.name} 於列印預覽`} checked onCheckedChange={(checked) => { if (checked !== true) togglePrintSelection(equipment.id); }} /><span className="min-w-0 flex-1 truncate">{equipment.name}</span><span className="shrink-0 text-xs text-[oklch(0.58_0_0)]">{equipment.location || "未設定"}</span></label>)}</div></div>
          <DialogFooter className="gap-2 sm:gap-2"><Button type="button" variant="outline" onClick={() => setIsPrintPreviewOpen(false)}>返回調整</Button><Button type="button" onClick={confirmBatchPrint} disabled={printableSelectedEquipmentCount === 0 || recordQrPrintMutation.isPending} className="bg-white text-black hover:bg-gray-200"><Printer className="mr-2 h-4 w-4" />{recordQrPrintMutation.isPending ? "記錄中..." : "確認並開啟列印"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
