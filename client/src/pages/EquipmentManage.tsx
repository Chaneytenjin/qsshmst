import React, { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatAuditActor } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Filter, X, Package, Printer, History, MapPin, ArrowRight, Clock, Download, FileDown, RotateCcw, CheckCircle2, FileSignature, ShieldCheck, CircleDashed } from "lucide-react";
import { exportLocationHistoryToCsv, exportLocationHistoryToPdf } from "@/lib/locationHistoryExport";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

type EquipmentForm = {
  name: string;
  categoryId?: number;
  description?: string;
  totalQuantity?: number;
  availableQuantity?: number;
  status?: "available" | "maintenance" | "retired";
  imageUrl?: string;
  serialNumber?: string;
  scanIdSuffix?: string;
  location?: string;
  locationNote?: string;
};

type CategoryForm = { name: string; description?: string };

export default function EquipmentManage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const signatureAccountName = user?.username?.trim() || user?.openId?.trim() || "";

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [pendingLocationUpdate, setPendingLocationUpdate] = useState<EquipmentForm | null>(null);
  const [locationNoteDraft, setLocationNoteDraft] = useState("");
  const [isLocationNoteValidationVisible, setIsLocationNoteValidationVisible] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [categoryEditTarget, setCategoryEditTarget] = useState<{ id: number; name: string; description: string | null } | null>(null);
  const [categoryEditName, setCategoryEditName] = useState("");
  const [categoryEditDescription, setCategoryEditDescription] = useState("");
  const [isCategoryEditNameValidationVisible, setIsCategoryEditNameValidationVisible] = useState(false);
  const [categoryDeleteConfirm, setCategoryDeleteConfirm] = useState<number | null>(null);
  const [categoryDeleteConfirmationStep, setCategoryDeleteConfirmationStep] = useState<"preview" | "confirm">("preview");
  const [categoryDeleteConfirmationText, setCategoryDeleteConfirmationText] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleteConfirmationStep, setDeleteConfirmationStep] = useState<"preview" | "confirm">("preview");
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<number[]>([]);
  const [batchCategoryId, setBatchCategoryId] = useState("");
  const [showBatchCategoryDialog, setShowBatchCategoryDialog] = useState(false);
  const [locationSort, setLocationSort] = useState<"none" | "asc" | "desc">("none");
  const [historyItem, setHistoryItem] = useState<any>(null);
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");
  const [historyOperatorId, setHistoryOperatorId] = useState<number | undefined>();
  const [isExportingHistoryPdf, setIsExportingHistoryPdf] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<any>(null);
  const [reviewStatusDraft, setReviewStatusDraft] = useState<"approved" | "rejected">("approved");
  const [reviewNoteDraft, setReviewNoteDraft] = useState("");
  const [signatureTarget, setSignatureTarget] = useState<any>(null);
  const [signatureConfirmation, setSignatureConfirmation] = useState("");
  const [selectedLocationHistoryIds, setSelectedLocationHistoryIds] = useState<number[]>([]);
  const [showBatchReviewDialog, setShowBatchReviewDialog] = useState(false);
  const [batchReviewStatus, setBatchReviewStatus] = useState<"approved" | "rejected">("approved");
  const [batchReviewNote, setBatchReviewNote] = useState("");

  const { data: equipmentList, isLoading } = trpc.equipment.list.useQuery({
    search: search || undefined,
    categoryId: categoryFilter,
    status: statusFilter,
  });
  const { data: categories } = trpc.equipment.categories.useQuery();
  const { data: categoryManagementList, isLoading: isCategoryManagementLoading } = trpc.equipment.categoryManagementList.useQuery(
    undefined,
    { enabled: showCategoryManager && (user?.role === "admin" || user?.role === "teacher") }
  );
  const categoryDeletePreviewInput = useMemo(() => ({ id: categoryDeleteConfirm ?? 0 }), [categoryDeleteConfirm]);
  const { data: categoryDeletePreview, isLoading: isCategoryDeletePreviewLoading, error: categoryDeletePreviewError } = trpc.equipment.categoryDeletePreview.useQuery(
    categoryDeletePreviewInput,
    { enabled: categoryDeleteConfirm !== null && user?.role === "admin" }
  );
  const equipmentDeletePreviewInput = useMemo(() => ({ id: deleteConfirm ?? 0 }), [deleteConfirm]);
  const { data: equipmentDeletePreview, isLoading: isEquipmentDeletePreviewLoading, error: equipmentDeletePreviewError } = trpc.equipment.deletePreview.useQuery(
    equipmentDeletePreviewInput,
    { enabled: deleteConfirm !== null }
  );
  const historyQueryInput = useMemo(() => ({
    equipmentId: historyItem?.id ?? 0,
    changedById: historyOperatorId,
    changedAtFrom: historyStartDate ? new Date(`${historyStartDate}T00:00:00`) : undefined,
    changedAtTo: historyEndDate ? new Date(`${historyEndDate}T23:59:59.999`) : undefined,
  }), [historyEndDate, historyItem?.id, historyOperatorId, historyStartDate]);
  const {
    data: locationHistory,
    isLoading: isLocationHistoryLoading,
    error: locationHistoryError,
    refetch: refetchLocationHistory,
  } = trpc.equipment.getLocationHistory.useQuery(
    historyQueryInput,
    { enabled: Boolean(historyItem) }
  );
  const {
    data: locationHistoryOperators,
    isLoading: isLocationHistoryOperatorsLoading,
    error: locationHistoryOperatorsError,
    refetch: refetchLocationHistoryOperators,
  } = trpc.equipment.getLocationHistoryOperators.useQuery(
    { equipmentId: historyItem?.id ?? 0 },
    { enabled: Boolean(historyItem) }
  );

  const createMutation = trpc.equipment.create.useMutation({
    onSuccess: (result) => { utils.equipment.list.invalidate(); toast.success(`器材新增成功，掃描 ID：${result.qrCodeId}`); setShowForm(false); reset(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.equipment.update.useMutation({
    onSuccess: () => { utils.equipment.list.invalidate(); utils.equipment.getLocationHistory.invalidate(); toast.success("器材更新成功"); setPendingLocationUpdate(null); setLocationNoteDraft(""); setIsLocationNoteValidationVisible(false); setShowForm(false); setEditItem(null); reset(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.equipment.delete.useMutation({
    onSuccess: (_result, variables) => { utils.equipment.list.invalidate(); toast.success("器材已刪除"); setSelectedEquipmentIds((current) => current.filter((id) => id !== variables.id)); setDeleteConfirm(null); setDeleteConfirmationStep("preview"); setDeleteConfirmationText(""); },
    onError: (e) => toast.error(e.message),
  });
  const createCategoryMutation = trpc.equipment.createCategory.useMutation({
    onSuccess: () => { utils.equipment.categories.invalidate(); utils.equipment.categoryManagementList.invalidate(); toast.success("分類新增成功"); setShowCategoryForm(false); catReset(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteCategoryMutation = trpc.equipment.deleteCategory.useMutation({
    onSuccess: () => { utils.equipment.categories.invalidate(); utils.equipment.categoryManagementList.invalidate(); utils.equipment.list.invalidate(); toast.success("器材分類已刪除"); setCategoryDeleteConfirm(null); setCategoryDeleteConfirmationStep("preview"); setCategoryDeleteConfirmationText(""); },
    onError: (e) => toast.error(e.message),
  });
  const updateCategoryMutation = trpc.equipment.updateCategory.useMutation({
    onSuccess: () => { utils.equipment.categories.invalidate(); utils.equipment.categoryManagementList.invalidate(); utils.equipment.list.invalidate(); toast.success("器材分類已更新"); setCategoryEditTarget(null); setCategoryEditName(""); setCategoryEditDescription(""); },
    onError: (e) => toast.error(e.message),
  });
  const batchReassignCategoryMutation = trpc.equipment.batchReassignCategory.useMutation({
    onSuccess: (result) => { utils.equipment.list.invalidate(); utils.equipment.categoryManagementList.invalidate(); toast.success(`${result.changedCount} 項器材已重新分類為「${result.destinationName}」`); setSelectedEquipmentIds([]); setBatchCategoryId(""); setShowBatchCategoryDialog(false); },
    onError: (e) => toast.error(e.message),
  });
  const reviewLocationHistoryMutation = trpc.equipment.reviewLocationHistory.useMutation({
    onSuccess: () => { utils.equipment.getLocationHistory.invalidate(); toast.success("異動紀錄覆核結果已儲存"); setReviewTarget(null); setReviewNoteDraft(""); setReviewStatusDraft("approved"); },
    onError: (e) => toast.error(e.message),
  });
  const batchReviewLocationHistoryMutation = trpc.equipment.batchReviewLocationHistory.useMutation({
    onSuccess: (result) => { utils.equipment.getLocationHistory.invalidate(); toast.success(`已完成 ${result.reviewedCount} 筆異動紀錄覆核`); setSelectedLocationHistoryIds([]); setShowBatchReviewDialog(false); setBatchReviewStatus("approved"); setBatchReviewNote(""); },
    onError: (e) => toast.error(e.message),
  });
  const signLocationHistoryMutation = trpc.equipment.signLocationHistory.useMutation({
    onSuccess: () => { utils.equipment.getLocationHistory.invalidate(); toast.success("異動紀錄已完成電子簽核"); setSignatureTarget(null); setSignatureConfirmation(""); },
    onError: (e) => toast.error(e.message),
  });
  const canReviewLocationHistory = user?.role === "admin";
  const reviewableLocationHistoryIds = (locationHistory ?? []).filter((entry) => entry.signatureStatus !== "signed").map((entry) => entry.id);
  const isAllReviewableLocationHistorySelected = reviewableLocationHistoryIds.length > 0 && reviewableLocationHistoryIds.every((id) => selectedLocationHistoryIds.includes(id));
  const toggleLocationHistorySelection = (historyId: number) => {
    setSelectedLocationHistoryIds((current) => current.includes(historyId) ? current.filter((id) => id !== historyId) : [...current, historyId]);
  };
  const toggleAllLocationHistorySelection = () => {
    setSelectedLocationHistoryIds(isAllReviewableLocationHistorySelected ? [] : reviewableLocationHistoryIds);
  };

  const newEquipmentFormDefaults: EquipmentForm = {
    name: "",
    categoryId: undefined,
    description: "",
    totalQuantity: undefined,
    availableQuantity: undefined,
    status: undefined,
    imageUrl: "",
    serialNumber: "",
    scanIdSuffix: "",
    location: "",
    locationNote: "",
  };
  const { register, handleSubmit, reset, setValue, getValues, watch, setError, formState: { errors } } = useForm<EquipmentForm>({
    defaultValues: newEquipmentFormDefaults,
  });
  const totalQuantity = watch("totalQuantity");
  const normalizedTotalQuantity = typeof totalQuantity === "number" && Number.isFinite(totalQuantity) ? totalQuantity : 0;
  const maxAvailableQuantity = normalizedTotalQuantity >= 1 ? Math.floor(normalizedTotalQuantity) : 0;
  const availableQuantityOptions = maxAvailableQuantity > 0 ? Array.from({ length: maxAvailableQuantity + 1 }, (_, index) => index) : [];
  const totalQuantityRegistration = register("totalQuantity", {
    valueAsNumber: true,
    required: "請填寫總數量",
    min: { value: 1, message: "總數量至少為 1" },
  });
  const availableQuantityRegistration = register("availableQuantity", {
    valueAsNumber: true,
    required: "請填寫可借數量",
    min: { value: 0, message: "可借數量不可小於 0" },
    max: { value: maxAvailableQuantity, message: "可借數量不可超過總數量" },
  });
  const { register: catRegister, handleSubmit: catHandleSubmit, reset: catReset, formState: { errors: catErrors } } = useForm<CategoryForm>();

  const openEdit = (item: any) => {
    setEditItem(item);
    setValue("name", item.name);
    setValue("categoryId", item.categoryId ?? undefined);
    setValue("description", item.description ?? "");
    setValue("totalQuantity", item.totalQuantity);
    setValue("availableQuantity", item.availableQuantity ?? undefined);
    setValue("status", item.status);
    setValue("imageUrl", item.imageUrl ?? "");
    setValue("serialNumber", item.serialNumber ?? "");
    setValue("location", item.location ?? "");
    setValue("locationNote", "");
    setShowForm(true);
  };

  const onSubmit = (data: EquipmentForm) => {
    const { locationNote: _locationNote, scanIdSuffix, ...equipmentData } = data;
    if (editItem) {
      if (!data.totalQuantity || !data.categoryId || !data.status || data.availableQuantity === undefined || !data.location?.trim()) {
        if (!data.totalQuantity) setError("totalQuantity", { type: "required", message: "請填寫總數量" });
        if (!data.categoryId) setError("categoryId", { type: "required", message: "請選擇分類" });
        if (!data.status) setError("status", { type: "required", message: "請選擇狀態" });
        if (data.availableQuantity === undefined) setError("availableQuantity", { type: "required", message: "請填寫可借數量" });
        if (!data.location?.trim()) setError("location", { type: "required", message: "請填寫存放位置" });
        toast.error("請先填寫所有標示 * 的必填欄位");
        return;
      }
      const nextLocation = data.location.trim();
      const previousLocation = (editItem.location ?? "").trim();
      if (previousLocation !== nextLocation) {
        setPendingLocationUpdate({ ...data, location: nextLocation });
        setLocationNoteDraft("");
        setIsLocationNoteValidationVisible(false);
        return;
      }
      updateMutation.mutate({ id: editItem.id, ...equipmentData, totalQuantity: data.totalQuantity, categoryId: data.categoryId, status: data.status, availableQuantity: data.availableQuantity, location: nextLocation });
    } else {
      if (!data.totalQuantity || !data.categoryId || !data.status || data.availableQuantity === undefined || !data.location?.trim()) {
        if (!data.totalQuantity) setError("totalQuantity", { type: "required", message: "請填寫總數量" });
        if (!data.categoryId) setError("categoryId", { type: "required", message: "請選擇分類" });
        if (!data.status) setError("status", { type: "required", message: "請選擇狀態" });
        if (data.availableQuantity === undefined) setError("availableQuantity", { type: "required", message: "請填寫可借數量" });
        if (!data.location?.trim()) setError("location", { type: "required", message: "請填寫存放位置" });
        toast.error("請先填寫所有標示 * 的必填欄位");
        return;
      }
      createMutation.mutate({
        ...equipmentData,
        totalQuantity: data.totalQuantity,
        categoryId: data.categoryId,
        status: data.status,
        availableQuantity: data.availableQuantity,
        location: data.location.trim(),
        scanIdSuffix: scanIdSuffix?.trim() || undefined,
      });
    }
  };

  const openLocationHistory = (item: any) => {
    setHistoryItem(item);
    setHistoryStartDate("");
    setHistoryEndDate("");
    setHistoryOperatorId(undefined);
    setSelectedLocationHistoryIds([]);
    setShowBatchReviewDialog(false);
  };

  const clearLocationHistoryFilters = () => {
    setHistoryStartDate("");
    setHistoryEndDate("");
    setHistoryOperatorId(undefined);
  };

  const retryLocationHistoryQueries = () => {
    void refetchLocationHistory?.();
    void refetchLocationHistoryOperators?.();
  };

  const getLocationHistoryExportData = () => historyItem ? {
    equipmentName: historyItem.name,
    currentLocation: historyItem.location,
    entries: locationHistory ?? [],
    exportedBy: user?.realName || user?.name || user?.username || "系統管理人員",
  } : null;

  const handleExportLocationHistoryCsv = () => {
    const exportData = getLocationHistoryExportData();
    if (!exportData?.entries.length) {
      toast.error("目前篩選條件下沒有可匯出的異動紀錄");
      return;
    }
    exportLocationHistoryToCsv(exportData);
    toast.success("位置異動紀錄 CSV 已開始下載");
  };

  const handleExportLocationHistoryPdf = async () => {
    const exportData = getLocationHistoryExportData();
    if (!exportData?.entries.length) {
      toast.error("目前篩選條件下沒有可匯出的異動紀錄");
      return;
    }
    setIsExportingHistoryPdf(true);
    try {
      await exportLocationHistoryToPdf(exportData);
      toast.success("位置異動紀錄 PDF 已開始下載");
    } catch (error) {
      console.error("位置異動紀錄 PDF 匯出失敗", error);
      toast.error("位置異動紀錄 PDF 匯出失敗，請稍後再試");
    } finally {
      setIsExportingHistoryPdf(false);
    }
  };

  const sortedEquipmentList = [...(equipmentList ?? [])].sort((left, right) => {
    if (locationSort === "none") return 0;
    const leftLocation = left.location?.trim() || "未設定";
    const rightLocation = right.location?.trim() || "未設定";
    const result = leftLocation.localeCompare(rightLocation, "zh-Hant");
    return locationSort === "asc" ? result : -result;
  });
  const selectableEquipmentIds = sortedEquipmentList.map((item) => item.id);
  const selectedCount = selectedEquipmentIds.length;
  const isAllVisibleSelectableSelected = selectableEquipmentIds.length > 0 && selectableEquipmentIds.every((id) => selectedEquipmentIds.includes(id));
  const printableSelectedEquipmentIds = selectedEquipmentIds.filter((id) => sortedEquipmentList.some((item) => item.id === id && item.qrCodeId));
  const canManageEquipment = user?.role === "admin" || user?.role === "teacher";

  const toggleEquipmentSelection = (equipmentId: number) => {
    setSelectedEquipmentIds((current) => current.includes(equipmentId)
      ? current.filter((id) => id !== equipmentId)
      : [...current, equipmentId]);
  };

  const toggleSelectAllVisible = () => {
    setSelectedEquipmentIds((current) => isAllVisibleSelectableSelected
      ? current.filter((id) => !selectableEquipmentIds.includes(id))
      : Array.from(new Set([...current, ...selectableEquipmentIds])));
  };

  return (
    <div className="equipment-management-page animate-fade-in">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="page-title">器材管理</h1>
          <p className="page-subtitle">EQUIPMENT MANAGEMENT</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCategoryManager(true)} className="btn-secondary text-xs">
            <Filter size={13} className="mr-1 inline" />管理分類
          </button>
          {user?.role === "admin" || user?.role === "teacher" ? (
            <button onClick={() => { setEditItem(null); setPendingLocationUpdate(null); setLocationNoteDraft(""); reset(newEquipmentFormDefaults); setShowForm(true); }} className="btn-primary text-xs">
              <Plus size={13} className="inline mr-1" />新增器材
            </button>
          ) : null}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(0.40_0_0)]" />
          <input
            className="industrial-input pl-8"
            placeholder="搜尋器材名稱..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="industrial-input w-auto"
          value={categoryFilter ?? ""}
          onChange={(e) => setCategoryFilter(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">全部分類</option>
          {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          className="industrial-input w-auto"
          value={statusFilter ?? ""}
          onChange={(e) => setStatusFilter(e.target.value || undefined)}
        >
          <option value="">全部狀態</option>
          <option value="available">可借用</option>
          <option value="maintenance">維修中</option>
          <option value="retired">已報廢</option>
        </select>
        <select
          aria-label="依存放位置排序"
          className="industrial-input w-auto"
          value={locationSort}
          onChange={(e) => setLocationSort(e.target.value as "none" | "asc" | "desc")}
        >
          <option value="none">存放位置：原始順序</option>
          <option value="asc">存放位置：由近至遠</option>
          <option value="desc">存放位置：由遠至近</option>
        </select>
        {(search || categoryFilter || statusFilter) && (
          <button onClick={() => { setSearch(""); setCategoryFilter(undefined); setStatusFilter(undefined); }} className="btn-secondary text-xs">
            <X size={12} className="inline mr-1" />清除篩選
          </button>
        )}
      </div>

      {selectedCount > 0 && (
        <div className="equipment-selection-summary mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3 animate-fade-in">
          <p className="equipment-selection-summary-copy text-sm">已選取 <span className="font-mono font-bold">{selectedCount}</span> 項器材</p>
          <div className="flex gap-2">
            <button onClick={() => setSelectedEquipmentIds([])} className="btn-secondary text-xs">取消選取</button>
            {canManageEquipment && <button type="button" onClick={() => { setBatchCategoryId(""); setShowBatchCategoryDialog(true); }} className="btn-secondary text-xs" disabled={batchReassignCategoryMutation.isPending}>{batchReassignCategoryMutation.isPending ? "重新分類中…" : "批次重新分類"}</button>}
            <button onClick={() => setLocation(`/qrcode-print-list?print=${printableSelectedEquipmentIds.join(",")}`)} className="btn-primary text-xs" disabled={!printableSelectedEquipmentIds.length}>
              <Printer size={13} className="mr-1 inline" />批次列印 QR Code（{printableSelectedEquipmentIds.length}）
            </button>
          </div>
        </div>
      )}

      <Dialog open={showBatchCategoryDialog} onOpenChange={(open) => { setShowBatchCategoryDialog(open); if (!open) setBatchCategoryId(""); }}>
        <DialogContent className="equipment-management-dialog border border-[oklch(0.22_0_0)] bg-[oklch(0.12_0_0)] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold tracking-tight text-white"><Filter size={18} />批次重新分類</DialogTitle>
            <DialogDescription className="text-[oklch(0.68_0_0)]">將為已選取的 {selectedCount} 項器材設定新的分類</DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <label className="label-caps block" htmlFor="batch-reassign-category">目標分類
              <select id="batch-reassign-category" aria-label="批次重新分類目標" className="industrial-input mt-1" value={batchCategoryId} onChange={(event) => setBatchCategoryId(event.target.value)}>
                <option value="" disabled>選擇新分類</option>
                {categories?.map((category: any) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            <div className="flex gap-3">
              <button type="button" onClick={() => batchCategoryId && batchReassignCategoryMutation.mutate({ equipmentIds: selectedEquipmentIds, categoryId: Number(batchCategoryId) })} className="btn-primary flex-1" disabled={!batchCategoryId || batchReassignCategoryMutation.isPending}>{batchReassignCategoryMutation.isPending ? "重新分類中…" : "確認重新分類"}</button>
              <button type="button" onClick={() => { setShowBatchCategoryDialog(false); setBatchCategoryId(""); }} className="btn-secondary" disabled={batchReassignCategoryMutation.isPending}>取消</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <div className="brutalist-card overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-5 animate-fade-in" data-testid="equipment-manage-skeleton">
            <div className="grid grid-cols-[2rem_minmax(12rem,2fr)_repeat(5,minmax(4rem,1fr))_5rem] gap-4 border-b border-[oklch(0.22_0_0)] pb-3">
              {Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-4 w-full" />)}
            </div>
            {Array.from({ length: 6 }, (_, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-[2rem_minmax(12rem,2fr)_repeat(5,minmax(4rem,1fr))_5rem] items-center gap-4 py-2">
                <div className="flex items-center gap-3"><Skeleton className="h-9 w-9 flex-none" /><Skeleton className="h-4 w-32" /></div>
                {Array.from({ length: 7 }, (_, columnIndex) => <Skeleton key={columnIndex} className="h-4 w-full" />)}
              </div>
            ))}
          </div>
        ) : !equipmentList || equipmentList.length === 0 ? (
          <div className="equipment-empty-state empty-state" data-testid="equipment-empty-state">
            <Package size={32} className="mb-3 opacity-30" />
            <p className="text-white font-bold mb-1">尚無器材資料</p>
            <p className="label-caps">點擊「新增器材」開始建立器材清單</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      aria-label="選取全部可列印器材"
                      className="equipment-selection-checkbox"
                      checked={isAllVisibleSelectableSelected}
                      disabled={selectableEquipmentIds.length === 0}
                      onChange={toggleSelectAllVisible}
                    />
                  </th>
                  <th>器材名稱</th>
                  <th>分類</th>
                  <th>總數量</th>
                  <th>可借數量</th>
                  <th>狀態</th>
                  <th>存放位置</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {sortedEquipmentList.map((item: any) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`選取 ${item.name} 進行批次操作`}
                        className="equipment-selection-checkbox"
                        checked={selectedEquipmentIds.includes(item.id)}
                        onChange={() => toggleEquipmentSelection(item.id)}
                      />
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="equipment-thumbnail-frame" data-testid={`equipment-thumbnail-frame-${item.id}`}>
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="equipment-thumbnail" />
                          ) : (
                            <div className="equipment-thumbnail equipment-thumbnail--placeholder" data-testid={`equipment-thumbnail-placeholder-${item.id}`} aria-label={`${item.name} 尚未設定圖片`}>
                              <Package size={15} aria-hidden="true" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{item.name}</p>
                          {item.serialNumber && <p className="label-caps">{item.serialNumber}</p>}
                        </div>
                      </div>
                    </td>
                    <td><span className="label-caps">{item.categoryName ?? "—"}</span></td>
                    <td><span className="font-mono text-white">{item.totalQuantity}</span></td>
                    <td>
                      <span className={`font-mono font-bold ${item.availableQuantity === 0 ? "text-[oklch(0.60_0.20_15)]" : "text-white"}`}>
                        {item.availableQuantity}
                      </span>
                    </td>
                    <td><StatusBadge status={item.status} /></td>
                    <td><span className="equipment-location-cell">{item.location ?? "—"}</span></td>
                    <td>
                      <div className="equipment-action-group">
                        {item.qrCodeId && (
                          <button
                            onClick={() => setLocation(`/qrcode-print-list?print=${item.id}`)}
                            className="equipment-action-button equipment-action-button--primary"
                            aria-label={`前往列印 ${item.name} QR Code`}
                            title="前往單獨列印 QR Code"
                          >
                            <Printer size={13} />
                          </button>
                        )}
                          <button
                            onClick={() => openLocationHistory(item)}
                            className="equipment-action-button equipment-action-button--primary"
                          aria-label={`查看 ${item.name} 的位置異動紀錄`}
                          title="器材異動紀錄"
                        >
                          <History size={13} />
                        </button>
                        <button onClick={() => openEdit(item)} aria-label={`編輯 ${item.name}`} className="equipment-action-button equipment-action-button--primary">
                          <Pencil size={13} />
                        </button>
                        {user?.role === "admin" && (
                          <button onClick={() => { setDeleteConfirm(item.id); setDeleteConfirmationStep("preview"); setDeleteConfirmationText(""); }} className="equipment-action-button equipment-action-button--destructive" aria-label={`刪除 ${item.name}`} title="刪除器材">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Equipment Form Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditItem(null); reset(); } }}>
        <DialogContent className={`equipment-management-dialog equipment-form-dialog ${editItem ? "equipment-edit-dialog" : ""} bg-[oklch(0.12_0_0)] border border-[oklch(0.22_0_0)] rounded-none max-w-lg text-white`}>
          <DialogHeader>
            <DialogTitle className="text-white font-bold text-lg tracking-tight">
              {editItem ? "編輯器材" : "新增器材"}
            </DialogTitle>
          </DialogHeader>
          <form noValidate onSubmit={handleSubmit(onSubmit, () => toast.error("請先填寫所有標示 * 的必填欄位"))} className="equipment-form-scroll-region mt-2 space-y-4">
            <div>
              <label className="label-caps mb-1.5 block">器材名稱 *</label>
              <input aria-label="器材名稱" aria-invalid={Boolean(errors.name)} className="industrial-input" {...register("name", { required: "請填寫器材名稱" })} placeholder="輸入器材名稱" />
              {errors.name && <p role="alert" className="form-field-error mt-1 text-xs">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-caps mb-1.5 block">分類 *</label>
                <select aria-label="器材分類" className="industrial-input" required aria-invalid={Boolean(errors.categoryId)} defaultValue="" {...register("categoryId", { valueAsNumber: true, validate: (value) => (Number.isInteger(value) && (value ?? 0) > 0) || "請選擇分類" })}>
                  <option value="" disabled>請選擇分類</option>
                  {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.categoryId && <p role="alert" className="form-field-error mt-1 text-xs">{errors.categoryId.message}</p>}
              </div>
              <div>
                <label className="label-caps mb-1.5 block">狀態 *</label>
                <select aria-label="器材狀態" className="industrial-input" required aria-invalid={Boolean(errors.status)} defaultValue="" {...register("status", { required: "請選擇狀態" })}>
                  <option value="" disabled>請選擇狀態</option>
                  <option value="available">可借用</option>
                  <option value="borrowed">借出中</option>
                  <option value="maintenance">維修中</option>
                  <option value="retired">已報廢</option>
                </select>
                {errors.status && <p role="alert" className="form-field-error mt-1 text-xs">{errors.status.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-caps mb-1.5 block">總數量 *</label>
                <input aria-label="總數量" type="number" min={1} required aria-invalid={Boolean(errors.totalQuantity)} className="industrial-input" {...totalQuantityRegistration} onChange={(event) => { totalQuantityRegistration.onChange(event); const nextTotal = Number(event.target.value); const currentAvailableQuantity = getValues("availableQuantity"); if (!Number.isFinite(nextTotal) || nextTotal < 1) setValue("availableQuantity", undefined, { shouldValidate: true }); else if (currentAvailableQuantity !== undefined && currentAvailableQuantity > nextTotal) setValue("availableQuantity", Math.max(0, Math.floor(nextTotal)), { shouldValidate: true }); }} placeholder="輸入數量" />
                {errors.totalQuantity ? <p role="alert" className="form-field-error mt-1 text-xs">{errors.totalQuantity.message}</p> : null}
              </div>
              <div>
                <label className="label-caps mb-1.5 block">可借數量 *</label>
                <select aria-label="可借數量" required aria-invalid={Boolean(errors.availableQuantity)} className="industrial-input" value={watch("availableQuantity") ?? ""} {...availableQuantityRegistration}>
                  <option value="" disabled>請選擇可借數量</option>
                  {availableQuantityOptions.map((quantity) => <option key={quantity} value={quantity}>{quantity}</option>)}
                </select>
                {errors.availableQuantity ? <p role="alert" className="form-field-error mt-1 text-xs">{errors.availableQuantity.message}</p> : null}
              </div>
            </div>
            <div>
              <label className="label-caps mb-1.5 block">存放位置 *</label>
              <input aria-label="器材存放位置" required aria-invalid={Boolean(errors.location)} className="industrial-input" {...register("location", { validate: (value) => Boolean(value?.trim()) || "請填寫存放位置" })} placeholder="例如：器材室 A-01" />
              {errors.location && <p role="alert" className="form-field-error mt-1 text-xs">{errors.location.message}</p>}
            </div>
            {editItem ? (
              <div>
                <label className="label-caps mb-1.5 block" htmlFor="equipment-scan-id-preview">ID</label>
                <input id="equipment-scan-id-preview" aria-label="ID（僅供預覽）" className="industrial-input cursor-default font-mono text-[oklch(0.72_0.08_210)]" value={editItem.qrCodeId || "未設定"} readOnly aria-readonly="true" />
                <p className="mt-1 text-xs text-[oklch(0.55_0_0)]">ID 僅供預覽，無法修改</p>
              </div>
            ) : (
              <div>
                <label className="label-caps mb-1.5 block" htmlFor="equipment-scan-id-suffix">ID</label>
                <div className="flex items-stretch">
                  <span className="equipment-scan-id-prefix inline-flex items-center rounded-l-md border border-r-0 border-[oklch(0.36_0.08_210)] bg-[oklch(0.16_0.03_220)] px-3 font-mono text-sm font-bold text-[oklch(0.78_0.12_210)]">QSSHMST</span>
                  <input id="equipment-scan-id-suffix" aria-label="ID 後段" className="industrial-input rounded-l-none font-mono uppercase" {...register("scanIdSuffix")} placeholder="留空自動產生" maxLength={64} autoCapitalize="characters" spellCheck={false} />
                </div>
              </div>
            )}
            <div>
              <label className="label-caps mb-1.5 block">圖片網址</label>
              <input className="industrial-input" {...register("imageUrl")} placeholder="https://..." />
            </div>
            <div>
              <label className="label-caps mb-1.5 block">說明</label>
              <textarea className="industrial-input resize-none" rows={2} {...register("description")} placeholder="選填" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? "處理中..." : editItem ? "儲存變更" : "新增器材"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditItem(null); reset(); }} className="btn-secondary">取消</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={pendingLocationUpdate !== null} onOpenChange={(open) => { if (!open) { setPendingLocationUpdate(null); setLocationNoteDraft(""); setIsLocationNoteValidationVisible(false); } }}>
        <DialogContent className="equipment-management-dialog border border-[oklch(0.22_0_0)] bg-[oklch(0.12_0_0)] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold tracking-tight text-white">
              <MapPin size={18} />
              填寫位置異動原因
            </DialogTitle>
            <DialogDescription className="text-[oklch(0.68_0_0)]">
              存放位置將由「{(editItem?.location ?? "未設定").trim() || "未設定"}」變更為「{pendingLocationUpdate?.location ?? "未設定"}」，請填寫移轉原因或自訂備註後確認
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-2">
            <label className="label-caps block" htmlFor="equipment-location-note">移轉原因／自訂備註 *</label>
            <textarea
              id="equipment-location-note"
              aria-label="移轉原因／自訂備註"
              aria-invalid={isLocationNoteValidationVisible && !locationNoteDraft.trim()}
              className="industrial-input resize-none"
              rows={3}
              value={locationNoteDraft}
              onChange={(event) => { setLocationNoteDraft(event.target.value); if (event.target.value.trim()) setIsLocationNoteValidationVisible(false); }}
              placeholder="例：拍攝活動結束後歸位至器材室 A-01"
              maxLength={500}
            />
            {isLocationNoteValidationVisible && !locationNoteDraft.trim() ? <p role="alert" className="form-field-error text-xs">請填寫移轉原因／自訂備註</p> : null}
          </div>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              className="btn-primary flex-1"
              disabled={updateMutation.isPending}
              onClick={() => {
                if (!pendingLocationUpdate || !editItem) return;
                const locationNote = locationNoteDraft.trim();
                if (!locationNote) { setIsLocationNoteValidationVisible(true); toast.error("請填寫移轉原因／自訂備註"); return; }
                const { locationNote: _locationNote, scanIdSuffix: _scanIdSuffix, ...equipmentData } = pendingLocationUpdate;
                updateMutation.mutate({ id: editItem.id, ...equipmentData, totalQuantity: pendingLocationUpdate.totalQuantity!, categoryId: pendingLocationUpdate.categoryId!, status: pendingLocationUpdate.status!, availableQuantity: pendingLocationUpdate.availableQuantity!, location: pendingLocationUpdate.location!.trim(), locationNote });
              }}
            >
              {updateMutation.isPending ? "儲存中..." : "確認儲存"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => { setPendingLocationUpdate(null); setLocationNoteDraft(""); setIsLocationNoteValidationVisible(false); }} disabled={updateMutation.isPending}>返回編輯</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Equipment Location History Dialog */}
      <Dialog open={historyItem !== null} onOpenChange={(open) => !open && setHistoryItem(null)}>
        <DialogContent className="equipment-management-dialog equipment-location-history-dialog border border-[oklch(0.22_0_0)] bg-[oklch(0.12_0_0)] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold tracking-tight text-white">
              <History size={18} />
              位置異動紀錄
            </DialogTitle>
          </DialogHeader>
          <div className="equipment-location-history-content">
          {historyItem && (
            <div className="equipment-location-history-summary mt-2 rounded-md border border-[oklch(0.22_0_0)] bg-[oklch(0.15_0_0)] p-4">
              <p className="font-medium text-white">{historyItem.name}</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-[oklch(0.6_0_0)]">
                <MapPin size={14} />目前存放位置：{historyItem.location?.trim() || "未設定"}
              </p>
            </div>
          )}

          <div className="equipment-location-history-filter mt-4 rounded-md border border-[oklch(0.22_0_0)] bg-[oklch(0.14_0_0)] p-3" aria-label="位置異動紀錄篩選">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-sm font-medium text-white"><Filter size={14} />篩選與稽核匯出</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-secondary text-xs" onClick={() => historyItem && setLocation(`/location-audit-report?equipmentId=${historyItem.id}`)}>
                  <History size={13} className="mr-1 inline" />查看本器材月度趨勢
                </button>
                <button type="button" className="btn-secondary text-xs" onClick={handleExportLocationHistoryCsv} disabled={Boolean(locationHistoryError) || !locationHistory?.length}>
                  <Download size={13} className="mr-1 inline" />匯出 CSV
                </button>
                <button type="button" className="btn-secondary text-xs" onClick={handleExportLocationHistoryPdf} disabled={Boolean(locationHistoryError) || !locationHistory?.length || isExportingHistoryPdf}>
                  <FileDown size={13} className="mr-1 inline" />{isExportingHistoryPdf ? "匯出中..." : "匯出 PDF"}
                </button>
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <label className="location-history-filter-label text-xs text-[oklch(0.62_0_0)]">
                開始日期
                <input
                  aria-label="位置異動開始日期"
                  type="date"
                  className="location-history-date-input industrial-input mt-1 text-sm"
                  value={historyStartDate}
                  max={historyEndDate || undefined}
                  onChange={(event) => setHistoryStartDate(event.target.value)}
                />
              </label>
              <label className="location-history-filter-label text-xs text-[oklch(0.62_0_0)]">
                結束日期
                <input
                  aria-label="位置異動結束日期"
                  type="date"
                  className="location-history-date-input industrial-input mt-1 text-sm"
                  value={historyEndDate}
                  min={historyStartDate || undefined}
                  onChange={(event) => setHistoryEndDate(event.target.value)}
                />
              </label>
              <label className="location-history-filter-label text-xs text-[oklch(0.62_0_0)]">
                操作人員
                <select
                  aria-label="篩選位置異動操作人員"
                  className="industrial-input mt-1 w-full text-sm"
                  value={historyOperatorId ?? ""}
                  disabled={isLocationHistoryOperatorsLoading || Boolean(locationHistoryOperatorsError)}
                  onChange={(event) => setHistoryOperatorId(event.target.value ? Number(event.target.value) : undefined)}
                >
                  <option value="">全部人員</option>
                  {locationHistoryOperators?.map((operator) => {
                    const operatorName = formatAuditActor({ displayName: operator.changedByRealName || operator.changedByName, username: operator.changedByUsername });
                    return <option key={operator.changedById} value={operator.changedById}>{operatorName}</option>;
                  })}
                </select>
              </label>
              <div className="flex items-end">
                <button type="button" className="btn-secondary w-full text-xs" onClick={clearLocationHistoryFilters}>
                  <RotateCcw size={13} className="mr-1 inline" />清除篩選
                </button>
              </div>
            </div>
            {isLocationHistoryOperatorsLoading && <p className="mt-2 text-xs text-[oklch(0.58_0_0)]">正在載入操作人員清單…</p>}
            {locationHistoryOperatorsError && (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded border border-[oklch(0.55_0.16_25)] bg-[oklch(0.18_0.04_25)] px-3 py-2 text-xs text-[oklch(0.82_0.1_25)]" role="alert">
                <span>操作人員清單載入失敗，仍可使用日期篩選</span>
                <button type="button" className="underline underline-offset-2" onClick={() => void refetchLocationHistoryOperators?.()}>重試人員清單</button>
              </div>
            )}
          </div>

          {canReviewLocationHistory && !isLocationHistoryLoading && !locationHistoryError && locationHistory?.length ? (
            <div className="equipment-location-history-review mt-4 rounded-md border border-sky-400/25 bg-sky-400/5 p-3" aria-label="位置異動批次覆核">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="location-history-review-selection flex cursor-pointer items-center gap-2 text-sm font-medium text-sky-100">
                  <input type="checkbox" aria-label="選取全部未簽核異動" className="location-history-review-checkbox h-4 w-4 accent-sky-400" checked={isAllReviewableLocationHistorySelected} onChange={toggleAllLocationHistorySelection} disabled={!reviewableLocationHistoryIds.length} />
                  選取全部未簽核異動
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-sky-200">已選取 {selectedLocationHistoryIds.length} 筆</span>
                  <button type="button" className="btn-primary text-xs" disabled={selectedLocationHistoryIds.length < 2} onClick={() => setShowBatchReviewDialog(true)}><ShieldCheck size={13} className="mr-1 inline" />批次覆核</button>
                </div>
              </div>
              <p className="mt-2 text-xs text-sky-200/75">僅可選取尚未電子簽核的紀錄；送出前系統會再次檢查每筆簽核狀態，並逐筆留下操作稽核</p>
            </div>
          ) : null}

          <section className="equipment-location-history-timeline mt-5" aria-label="位置異動時間軸">
            {isLocationHistoryLoading ? (
              <div className="space-y-4" data-testid="location-history-loading">
                {[0, 1, 2].map((index) => <Skeleton key={index} className="h-20 w-full" />)}
              </div>
            ) : locationHistoryError ? (
              <div className="rounded-md border border-[oklch(0.55_0.16_25)] bg-[oklch(0.18_0.04_25)] px-4 py-7 text-center" role="alert">
                <p className="font-medium text-[oklch(0.88_0.1_25)]">位置異動紀錄載入失敗</p>
                <p className="mt-1 text-sm text-[oklch(0.7_0.06_25)]">{locationHistoryError.message || "請確認網路連線後重試"}</p>
                <button type="button" className="btn-secondary mt-4 text-xs" onClick={retryLocationHistoryQueries}>重試載入異動紀錄</button>
              </div>
            ) : locationHistory?.length ? (
              <ol className="relative ml-2 space-y-5 border-l border-[oklch(0.32_0.03_240)] pl-6">
                {locationHistory.map((entry) => {
                  const changedBy = formatAuditActor({ displayName: entry.changedByRealName || entry.changedByName, username: entry.changedByUsername });
                  const reviewedBy = formatAuditActor({ displayName: entry.reviewedByRealName || entry.reviewedByName || "管理員", username: entry.reviewedByUsername });
                  const signedBy = formatAuditActor({ displayName: entry.signedByRealName || entry.signedByName || "管理員", username: entry.signedByUsername });
                  const changedAt = new Date(entry.changedAt).toLocaleString("zh-TW", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  });
                  return (
                    <li key={entry.id} className="relative">
                      <span className="location-history-timeline-marker absolute -left-[1.95rem] top-1 flex h-4 w-4 items-center justify-center rounded-full border border-[oklch(0.38_0.11_210)] bg-[oklch(0.14_0.02_210)]">
                        <MapPin size={9} className="text-[oklch(0.72_0.13_210)]" />
                      </span>
                      <div className="equipment-location-history-entry rounded-md border border-[oklch(0.22_0_0)] bg-[oklch(0.14_0_0)] p-4">
                        {canReviewLocationHistory && entry.signatureStatus !== "signed" && <label className="location-history-review-selection mb-3 flex cursor-pointer items-center gap-2 border-b border-[oklch(0.24_0_0)] pb-3 text-xs text-sky-200"><input type="checkbox" aria-label={`選取異動紀錄 ${entry.id} 進行批次覆核`} className="location-history-review-checkbox h-4 w-4 accent-sky-400" checked={selectedLocationHistoryIds.includes(entry.id)} onChange={() => toggleLocationHistorySelection(entry.id)} />選取此筆異動進行批次覆核</label>}
                        <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-white">
                          <span>{entry.previousLocation || "初始位置"}</span>
                          <ArrowRight size={14} className="text-[oklch(0.55_0_0)]" />
                          <span>{entry.newLocation || "未設定"}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[oklch(0.58_0_0)]">
                          <span className="flex items-center gap-1"><Clock size={12} />{changedAt}</span>
                          <span>異動人員：{changedBy}</span>
                        </div>
                        {entry.note && <p className="mt-2 text-xs text-[oklch(0.66_0_0)]">{entry.note}</p>}
                        <div className="mt-3 border-t border-[oklch(0.25_0_0)] pt-3">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            {entry.reviewStatus === "approved" ? <span className="location-history-review-status--approved inline-flex items-center gap-1 border border-emerald-400/40 bg-emerald-400/10 px-2 py-1 text-emerald-200"><CheckCircle2 size={13} />已覆核通過</span> : entry.reviewStatus === "rejected" ? <span className="location-history-review-status--rejected inline-flex items-center gap-1 border border-rose-400/40 bg-rose-400/10 px-2 py-1 text-rose-200"><X size={13} />覆核退回</span> : <span className="location-history-review-status--pending inline-flex items-center gap-1 border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-amber-200"><CircleDashed size={13} />待管理員覆核</span>}
                            {entry.signatureStatus === "signed" ? <span className="location-history-signature-status--signed inline-flex items-center gap-1 border border-sky-400/40 bg-sky-400/10 px-2 py-1 text-sky-200"><FileSignature size={13} />已電子簽核</span> : <span className="location-history-signature-status--pending inline-flex items-center gap-1 border border-[oklch(0.35_0_0)] px-2 py-1 text-[oklch(0.62_0_0)]"><FileSignature size={13} />尚未電子簽核</span>}
                          </div>
                          {entry.reviewedAt && <p className="mt-2 text-xs text-[oklch(0.62_0_0)]">覆核：{reviewedBy} · {new Date(entry.reviewedAt).toLocaleString("zh-TW", { dateStyle: "medium", timeStyle: "short" })}{entry.reviewNote ? ` · ${entry.reviewNote}` : ""}</p>}
                          {entry.signedAt && <p className="location-history-signed-detail mt-1 text-xs text-sky-200">簽核：{signedBy} · {new Date(entry.signedAt).toLocaleString("zh-TW", { dateStyle: "medium", timeStyle: "short" })} · 已登入帳號電子簽核</p>}
                          {canReviewLocationHistory && entry.signatureStatus !== "signed" && <div className="location-history-action-row mt-3 flex flex-wrap gap-2"><button type="button" className="btn-secondary text-xs" onClick={() => { setReviewTarget(entry); setReviewStatusDraft(entry.reviewStatus === "rejected" ? "rejected" : "approved"); setReviewNoteDraft(entry.reviewNote ?? ""); }}><ShieldCheck size={13} className="mr-1 inline" />管理員覆核</button>{entry.reviewStatus === "approved" && <button type="button" className="btn-secondary text-xs" onClick={() => { setSignatureTarget(entry); setSignatureConfirmation(""); }}><FileSignature size={13} className="mr-1 inline" />電子簽核</button>}</div>}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="equipment-location-history-empty rounded-md border border-dashed border-[oklch(0.3_0_0)] px-4 py-8 text-center text-sm text-[oklch(0.6_0_0)]">
                尚無位置異動紀錄日後更新存放位置後，系統會自動保留異動時間與操作人員
              </div>
            )}
          </section>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewTarget !== null} onOpenChange={(open) => { if (!open) { setReviewTarget(null); setReviewNoteDraft(""); setReviewStatusDraft("approved"); } }}>
        <DialogContent className="equipment-management-dialog location-history-review-dialog border border-[oklch(0.22_0_0)] bg-[oklch(0.12_0_0)] text-white sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-white"><ShieldCheck size={18} />管理員覆核異動紀錄</DialogTitle></DialogHeader>
          {reviewTarget && <div className="mt-2 space-y-4"><p className="rounded border border-[oklch(0.28_0_0)] bg-[oklch(0.15_0_0)] p-3 text-sm text-[oklch(0.72_0_0)]">{reviewTarget.previousLocation || "初始位置"} <ArrowRight size={13} className="mx-1 inline" /> {reviewTarget.newLocation || "未設定"}</p><label className="block text-sm font-medium text-white">覆核結果<select aria-label="覆核結果" className="industrial-input mt-1 w-full" value={reviewStatusDraft} onChange={(event) => { setReviewStatusDraft(event.target.value as "approved" | "rejected"); setReviewNoteDraft(""); }}><option value="approved">通過覆核</option><option value="rejected">退回異動</option></select></label><label className="block text-sm font-medium text-white">覆核意見{reviewStatusDraft === "rejected" ? "（必填）" : "（選填）"}<textarea aria-label="覆核意見" className="industrial-input mt-1 min-h-24 w-full resize-y" value={reviewNoteDraft} onChange={(event) => setReviewNoteDraft(event.target.value)} placeholder={reviewStatusDraft === "rejected" ? "請說明退回原因" : "可補充覆核說明"} /></label><p className="text-xs text-[oklch(0.58_0_0)]">儲存後仍可在電子簽核前調整覆核結果；電子簽核完成後將鎖定覆核內容</p><div className="flex gap-2"><button type="button" className="btn-primary flex-1" disabled={reviewLocationHistoryMutation.isPending || (reviewStatusDraft === "rejected" && !reviewNoteDraft.trim())} onClick={() => reviewLocationHistoryMutation.mutate({ historyId: reviewTarget.id, reviewStatus: reviewStatusDraft, reviewNote: reviewNoteDraft.trim() || undefined })}>{reviewLocationHistoryMutation.isPending ? "儲存中…" : "儲存覆核結果"}</button><button type="button" className="btn-secondary" onClick={() => setReviewTarget(null)}>取消</button></div></div>}
        </DialogContent>
      </Dialog>

      <Dialog open={showBatchReviewDialog} onOpenChange={(open) => { if (!open) { setShowBatchReviewDialog(false); setBatchReviewStatus("approved"); setBatchReviewNote(""); } }}>
        <DialogContent className="equipment-management-dialog border border-sky-400/35 bg-[oklch(0.12_0_0)] text-white sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-white"><ShieldCheck size={18} />批次覆核位置異動紀錄</DialogTitle></DialogHeader>
          <div className="mt-2 space-y-4">
            <div className="location-history-batch-review-summary rounded border border-sky-400/25 bg-sky-400/10 p-3 text-sm text-sky-100"><p className="font-bold">將一次覆核 {selectedLocationHistoryIds.length} 筆異動紀錄</p><p className="mt-1 text-xs text-sky-200">每筆紀錄都會以目前登入的管理員帳號寫入覆核結果與獨立稽核紀錄；已電子簽核的紀錄會阻擋整批送出，避免部分更新</p></div>
            <label className="block text-sm font-medium text-white">批次覆核結果<select aria-label="批次覆核結果" className="industrial-input mt-1 w-full" value={batchReviewStatus} onChange={(event) => setBatchReviewStatus(event.target.value as "approved" | "rejected")}><option value="approved">通過覆核</option><option value="rejected">退回異動</option></select></label>
            <label className="block text-sm font-medium text-white">批次覆核意見{batchReviewStatus === "rejected" ? "（必填）" : "（選填）"}<textarea aria-label="批次覆核意見" className="industrial-input mt-1 min-h-24 w-full resize-y" value={batchReviewNote} onChange={(event) => setBatchReviewNote(event.target.value)} placeholder={batchReviewStatus === "rejected" ? "請說明本批次退回原因" : "可補充本批次覆核說明"} /></label>
            <div className="flex gap-2"><button type="button" className="btn-primary flex-1" disabled={batchReviewLocationHistoryMutation.isPending || selectedLocationHistoryIds.length < 2 || (batchReviewStatus === "rejected" && !batchReviewNote.trim())} onClick={() => batchReviewLocationHistoryMutation.mutate({ historyIds: selectedLocationHistoryIds, reviewStatus: batchReviewStatus, reviewNote: batchReviewNote.trim() || undefined })}>{batchReviewLocationHistoryMutation.isPending ? "覆核中…" : "確認批次覆核"}</button><button type="button" className="btn-secondary" onClick={() => setShowBatchReviewDialog(false)}>取消</button></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={signatureTarget !== null} onOpenChange={(open) => { if (!open) { setSignatureTarget(null); setSignatureConfirmation(""); } }}>
        <DialogContent className="equipment-management-dialog location-history-signature-dialog border border-sky-400/35 bg-[oklch(0.12_0_0)] text-white sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-white"><FileSignature size={18} />電子簽核確認</DialogTitle></DialogHeader>
          {signatureTarget && <div className="mt-2 space-y-4"><div className="border border-sky-400/25 bg-sky-400/10 p-3 text-sm text-sky-100"><p className="font-bold">將以目前已登入的管理員帳號完成電子簽核</p></div><p className="text-sm text-[oklch(0.72_0_0)]">異動：{signatureTarget.previousLocation || "初始位置"} <ArrowRight size={13} className="mx-1 inline" /> {signatureTarget.newLocation || "未設定"}</p><label className="block text-sm font-medium text-white">輸入目前登入帳號「{signatureAccountName || "未取得帳號"}」以確認<input aria-label="電子簽核確認帳號" className="industrial-input mt-1 w-full" value={signatureConfirmation} onChange={(event) => setSignatureConfirmation(event.target.value)} autoComplete="username" placeholder="請輸入帳號名稱" /></label><div className="flex gap-2"><button type="button" className="btn-primary flex-1" disabled={signLocationHistoryMutation.isPending || !signatureAccountName || signatureConfirmation.trim() !== signatureAccountName} onClick={() => signLocationHistoryMutation.mutate({ historyId: signatureTarget.id, confirmation: signatureConfirmation.trim() })}>{signLocationHistoryMutation.isPending ? "簽核中…" : "確認電子簽核"}</button><button type="button" className="btn-secondary" onClick={() => setSignatureTarget(null)}>取消</button></div></div>}
        </DialogContent>
      </Dialog>

      {/* Category Form Dialog */}
      <Dialog open={showCategoryForm} onOpenChange={(open) => { setShowCategoryForm(open); if (!open) catReset(); }}>
        <DialogContent className="equipment-management-dialog bg-[oklch(0.12_0_0)] border border-[oklch(0.22_0_0)] rounded-none max-w-sm text-white">
          <DialogHeader>
            <DialogTitle className="text-white font-bold">新增器材分類</DialogTitle>
          </DialogHeader>
          <form noValidate onSubmit={catHandleSubmit((d) => createCategoryMutation.mutate(d), () => toast.error("請先填寫所有標示 * 的必填欄位"))} className="space-y-4 mt-2">
            <div>
              <label className="label-caps mb-1.5 block">分類名稱 *</label>
              <input aria-label="分類名稱" aria-invalid={Boolean(catErrors.name)} className="industrial-input" {...catRegister("name", { required: "請填寫分類名稱" })} placeholder="例：攝影器材" />
              {catErrors.name && <p role="alert" className="form-field-error mt-1 text-xs">{catErrors.name.message}</p>}
            </div>
            <div>
              <label className="label-caps mb-1.5 block">說明</label>
              <input className="industrial-input" {...catRegister("description")} placeholder="選填" />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary flex-1" disabled={createCategoryMutation.isPending}>
                {createCategoryMutation.isPending ? "處理中..." : "新增分類"}
              </button>
              <button type="button" onClick={() => { setShowCategoryForm(false); catReset(); }} className="btn-secondary">取消</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Category Management Dialog */}
      <Dialog open={showCategoryManager} onOpenChange={setShowCategoryManager}>
        <DialogContent className="equipment-management-dialog equipment-category-manager-dialog max-h-[85vh] overflow-y-auto border border-[oklch(0.22_0_0)] bg-[oklch(0.12_0_0)] text-white sm:max-w-3xl">
          <DialogHeader className="category-management-header gap-3 pr-7">
            <div>
              <DialogTitle className="text-lg font-bold text-white">器材分類管理</DialogTitle>
              <p className="category-management-header-note mt-1 text-xs">管理分類名稱、說明與使用狀況</p>
            </div>
            <div className="category-management-toolbar flex w-full justify-end border-t pt-3">
              <button type="button" onClick={() => { catReset(); setShowCategoryForm(true); }} className="btn-primary shrink-0 text-xs">新增分類</button>
            </div>
          </DialogHeader>
          {isCategoryManagementLoading ? (
            <div className="mt-5 space-y-3" data-testid="category-management-loading">{[0, 1, 2].map((index) => <Skeleton key={index} className="h-16 w-full" />)}</div>
          ) : !categoryManagementList?.length ? (
            <div className="category-management-empty-state mt-5 border border-dashed border-[oklch(0.3_0_0)] px-4 py-8 text-center text-sm text-[oklch(0.62_0_0)]">目前尚未建立器材分類</div>
          ) : (
            <div className="category-management-table-shell mt-5 overflow-x-auto border border-[oklch(0.22_0_0)]">
              <table className="category-management-table data-table min-w-[34rem]">
                <thead><tr><th>分類</th><th>說明</th><th>使用器材</th><th>建立時間</th><th>操作</th></tr></thead>
                <tbody>{categoryManagementList.map((category) => (
                  <tr key={category.id}>
                    <td className="font-medium text-white">{category.name}</td>
                    <td className="max-w-48 truncate text-sm text-[oklch(0.64_0_0)]" title={category.description || ""}>{category.description || "—"}</td>
                    <td><span className={`category-usage-count ${category.equipmentCount > 0 ? "category-usage-count--used" : "category-usage-count--empty"}`}>{category.equipmentCount} 項</span></td>
                    <td className="category-created-at">{new Date(category.createdAt).toLocaleDateString("zh-TW")}</td>
                    <td className="category-management-actions"><div className="flex flex-wrap gap-2">{canManageEquipment && <button type="button" onClick={() => { setCategoryEditTarget(category); setCategoryEditName(category.name); setCategoryEditDescription(category.description || ""); setIsCategoryEditNameValidationVisible(false); }} className="category-management-action category-management-action--edit" aria-label={`編輯分類 ${category.name}`}><Pencil size={12} />編輯</button>}{user?.role === "admin" ? <button type="button" onClick={() => { setCategoryDeleteConfirm(category.id); setCategoryDeleteConfirmationStep("preview"); setCategoryDeleteConfirmationText(""); }} className="category-management-action category-management-action--delete" aria-label={`刪除分類 ${category.name}`}><Trash2 size={12} />刪除</button> : <span className="category-management-admin-note">僅管理員可刪除</span>}</div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Category Edit Dialog */}
      <Dialog open={categoryEditTarget !== null} onOpenChange={(open) => { if (!open && !updateCategoryMutation.isPending) { setCategoryEditTarget(null); setCategoryEditName(""); setCategoryEditDescription(""); setIsCategoryEditNameValidationVisible(false); } }}>
        <DialogContent className="equipment-management-dialog border border-[oklch(0.22_0_0)] bg-[oklch(0.12_0_0)] text-white sm:max-w-md">
          <DialogHeader><DialogTitle className="font-bold text-white">編輯器材分類</DialogTitle></DialogHeader>
          <form noValidate className="mt-3 space-y-4" onSubmit={(event) => { event.preventDefault(); if (!categoryEditName.trim()) { setIsCategoryEditNameValidationVisible(true); toast.error("請先填寫所有標示 * 的必填欄位"); return; } if (categoryEditTarget) updateCategoryMutation.mutate({ id: categoryEditTarget.id, name: categoryEditName.trim(), description: categoryEditDescription.trim() || undefined }); }}>
            <div><label className="label-caps mb-1.5 block" htmlFor="edit-category-name">分類名稱 *</label><input id="edit-category-name" aria-invalid={isCategoryEditNameValidationVisible && !categoryEditName.trim()} aria-describedby={isCategoryEditNameValidationVisible && !categoryEditName.trim() ? "edit-category-name-error" : undefined} className="industrial-input" value={categoryEditName} onChange={(event) => { setCategoryEditName(event.target.value); if (event.target.value.trim()) setIsCategoryEditNameValidationVisible(false); }} maxLength={128} autoFocus />{isCategoryEditNameValidationVisible && !categoryEditName.trim() ? <p id="edit-category-name-error" role="alert" className="form-field-error mt-1 text-xs">請填寫分類名稱</p> : null}</div>
            <div><label className="label-caps mb-1.5 block" htmlFor="edit-category-description">分類說明</label><textarea id="edit-category-description" className="industrial-input resize-none" rows={3} value={categoryEditDescription} onChange={(event) => setCategoryEditDescription(event.target.value)} maxLength={2000} placeholder="選填" /></div>
            <div className="flex gap-3"><button type="submit" className="btn-primary flex-1" disabled={updateCategoryMutation.isPending}>{updateCategoryMutation.isPending ? "儲存中…" : "儲存分類"}</button><button type="button" className="btn-secondary" onClick={() => { setCategoryEditTarget(null); setCategoryEditName(""); setCategoryEditDescription(""); setIsCategoryEditNameValidationVisible(false); }} disabled={updateCategoryMutation.isPending}>取消</button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Category Delete Confirm Dialog */}
      <Dialog open={categoryDeleteConfirm !== null} onOpenChange={(open) => { if (!open && !deleteCategoryMutation.isPending) { setCategoryDeleteConfirm(null); setCategoryDeleteConfirmationStep("preview"); setCategoryDeleteConfirmationText(""); } }}>
        <DialogContent className="equipment-management-dialog equipment-category-delete-dialog border border-[oklch(0.22_0_0)] bg-[oklch(0.12_0_0)] text-white sm:max-w-xl">
          <DialogHeader><DialogTitle className="font-bold text-white">{categoryDeleteConfirmationStep === "preview" ? "分類刪除前使用狀況" : "二次確認刪除分類"}</DialogTitle></DialogHeader>
          {isCategoryDeletePreviewLoading ? <p className="mt-3 text-sm text-[oklch(0.65_0_0)]">正在檢查分類使用狀況…</p> : categoryDeletePreviewError ? <p role="alert" className="mt-3 border border-red-400/50 bg-red-950/30 p-3 text-sm text-red-100">{categoryDeletePreviewError.message || "無法載入分類刪除預覽"}</p> : categoryDeletePreview ? <div className="mt-3 space-y-4">
            <div className="border border-amber-300/30 bg-amber-500/10 p-3 text-sm"><p className="font-bold text-amber-100">{categoryDeletePreview.target.name}</p><p className="mt-1 text-xs text-amber-100/80">目前有 {categoryDeletePreview.dependentRecordCount} 項器材使用此分類</p></div>
            {categoryDeletePreview.blockingReasons.map((reason) => <p key={reason} role="alert" className="border border-red-400/50 bg-red-950/30 p-3 text-sm text-red-100">{reason}</p>)}
            {categoryDeletePreview.assignedEquipment.length > 0 && <div className="max-h-40 overflow-y-auto border border-[oklch(0.24_0_0)] p-3 text-sm"><p className="mb-2 font-bold text-white">使用此分類的器材（最多顯示 20 項）</p><ul className="space-y-1 text-[oklch(0.68_0_0)]">{categoryDeletePreview.assignedEquipment.map((item) => <li key={item.id}>• {item.name}{item.serialNumber ? `（${item.serialNumber}）` : ""}</li>)}</ul></div>}
            {categoryDeletePreview.canDelete && categoryDeleteConfirmationStep === "confirm" && <label className="block text-sm text-[oklch(0.7_0_0)]">請輸入分類名稱 <strong className="text-white">{categoryDeletePreview.target.name}</strong> 以確認<input className="industrial-input mt-2" value={categoryDeleteConfirmationText} onChange={(event) => setCategoryDeleteConfirmationText(event.target.value)} placeholder="輸入分類名稱" autoFocus /></label>}
            <div className="flex gap-3">
              {categoryDeletePreview.canDelete ? <button type="button" onClick={() => categoryDeleteConfirmationStep === "preview" ? setCategoryDeleteConfirmationStep("confirm") : categoryDeleteConfirm !== null && deleteCategoryMutation.mutate({ id: categoryDeleteConfirm, confirmed: true })} className="btn-danger flex-1" disabled={deleteCategoryMutation.isPending || (categoryDeleteConfirmationStep === "confirm" && categoryDeleteConfirmationText.trim() !== categoryDeletePreview.target.name)}>{deleteCategoryMutation.isPending ? "刪除中…" : categoryDeleteConfirmationStep === "preview" ? "繼續二次確認" : "永久刪除分類"}</button> : null}
              <button type="button" onClick={() => { setCategoryDeleteConfirm(null); setCategoryDeleteConfirmationStep("preview"); setCategoryDeleteConfirmationText(""); }} className={categoryDeletePreview.canDelete ? "btn-secondary" : "btn-secondary flex-1"} disabled={deleteCategoryMutation.isPending}>取消</button>
            </div>
          </div> : null}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirm !== null} onOpenChange={(o) => { if (!o && !deleteMutation.isPending) { setDeleteConfirm(null); setDeleteConfirmationStep("preview"); setDeleteConfirmationText(""); } }}>
        <DialogContent className="equipment-management-dialog equipment-delete-dialog bg-[oklch(0.12_0_0)] border border-[oklch(0.22_0_0)] rounded-none max-w-sm text-white">
          <DialogHeader>
            <DialogTitle className="text-white font-bold">{deleteConfirmationStep === "preview" ? "移除前歷程保留預覽" : "二次確認移除器材"}</DialogTitle>
          </DialogHeader>
          {isEquipmentDeletePreviewLoading ? <p className="mt-3 text-sm text-[oklch(0.65_0_0)]">正在計算相依資料…</p> : equipmentDeletePreviewError ? <p role="alert" className="mt-3 border border-red-400/50 bg-red-950/30 p-3 text-sm text-red-100">{equipmentDeletePreviewError.message || "無法載入移除預覽"}</p> : equipmentDeletePreview ? <div className="mt-3 space-y-4"><div className="border border-amber-300/30 bg-amber-500/10 p-3 text-sm"><p className="font-bold text-amber-100">{equipmentDeletePreview.target.name}</p><p className="mt-1 text-xs text-amber-100/80">將保留 {equipmentDeletePreview.dependentRecordCount} 筆既有歷程供稽核；器材將自一般清單移除</p></div>{equipmentDeletePreview.blockingReasons.map((reason) => <p key={reason} role="alert" className="mt-3 border border-red-400/50 bg-red-950/30 p-3 text-sm text-red-100">{reason}</p>)}{equipmentDeletePreview.dependencies.length ? <ul className="max-h-44 space-y-2 overflow-y-auto border border-[oklch(0.24_0_0)] p-3 text-sm">{equipmentDeletePreview.dependencies.map((entry) => <li key={entry.key} className="flex justify-between gap-3"><span>{entry.label}</span><span className="font-mono text-[oklch(0.72_0_0)]">{entry.count} 筆</span></li>)}</ul> : <p className="text-sm text-emerald-200">未發現需保留的相依資料</p>}{deleteConfirmationStep === "confirm" && <label className="block text-sm text-[oklch(0.7_0_0)]">請輸入器材名稱 <strong className="text-white">{equipmentDeletePreview.target.name}</strong> 以確認<input className="industrial-input mt-2" value={deleteConfirmationText} onChange={(event) => setDeleteConfirmationText(event.target.value)} placeholder="請輸入器材名稱" autoFocus /></label>}<div className="flex gap-3"><button type="button" onClick={() => deleteConfirmationStep === "preview" ? setDeleteConfirmationStep("confirm") : deleteConfirm !== null && deleteMutation.mutate({ id: deleteConfirm, confirmed: true })} className="btn-danger flex-1" disabled={!equipmentDeletePreview.canDelete || deleteMutation.isPending || (deleteConfirmationStep === "confirm" && deleteConfirmationText.trim() !== equipmentDeletePreview.target.name)}>{deleteMutation.isPending ? "移除中…" : deleteConfirmationStep === "preview" ? "繼續二次確認" : "移除器材"}</button><button type="button" onClick={() => { setDeleteConfirm(null); setDeleteConfirmationStep("preview"); setDeleteConfirmationText(""); }} className="btn-secondary" disabled={deleteMutation.isPending}>取消</button></div></div> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
