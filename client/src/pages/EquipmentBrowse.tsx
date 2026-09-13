import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { Search, Package, X, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { Skeleton } from "@/components/ui/skeleton";

type BorrowForm = {
  borrowDate: string;
  returnDate: string;
  purpose: string;
  quantity: number;
};

export default function EquipmentBrowse() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>();
  const [borrowTarget, setBorrowTarget] = useState<any>(null);
  const [locationSort, setLocationSort] = useState<"none" | "asc" | "desc">("none");

  const { data: equipmentList, isLoading } = trpc.equipment.list.useQuery({
    search: search || undefined,
    categoryId: categoryFilter,
    status: "available",
  });
  const { data: categories } = trpc.equipment.categories.useQuery();

  const borrowMutation = trpc.borrowRequests.create.useMutation({
    onSuccess: () => {
      utils.equipment.list.invalidate();
      toast.success("借用申請已提交，等待審核");
      setBorrowTarget(null);
      reset();
    },
    onError: (e) => toast.error(e.message),
  });

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<BorrowForm>({
    defaultValues: { quantity: 1, purpose: "" },
  });

  const today = new Date().toISOString().split("T")[0];
  const watchBorrowDate = watch("borrowDate");

  const onSubmit = (data: BorrowForm) => {
    if (!borrowTarget) return;
    borrowMutation.mutate({
      equipmentId: borrowTarget.id,
      quantity: data.quantity,
      borrowDate: new Date(data.borrowDate),
      returnDate: new Date(data.returnDate),
      purpose: data.purpose.trim(),
    });
  };

  const sortedEquipmentList = [...(equipmentList ?? [])].sort((left, right) => {
    if (locationSort === "none") return 0;
    const leftLocation = left.location?.trim() || "未設定";
    const rightLocation = right.location?.trim() || "未設定";
    const result = leftLocation.localeCompare(rightLocation, "zh-Hant");
    return locationSort === "asc" ? result : -result;
  });

  return (
    <div className="animate-fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">器材瀏覽</h1>
          <p className="page-subtitle">EQUIPMENT CATALOG</p>
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
          aria-label="依器材分類篩選"
          className="industrial-input min-w-40 w-auto"
          value={categoryFilter ?? ""}
          onChange={(event) => setCategoryFilter(event.target.value ? Number(event.target.value) : undefined)}
        >
          <option value="">全部分類</option>
          {categories?.map((category: any) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <select
          aria-label="依瀏覽器材存放位置排序"
          className="industrial-input w-auto"
          value={locationSort}
          onChange={(e) => setLocationSort(e.target.value as "none" | "asc" | "desc")}
        >
          <option value="none">存放位置：原始順序</option>
          <option value="asc">存放位置：由近至遠</option>
          <option value="desc">存放位置：由遠至近</option>
        </select>
        {(search || categoryFilter) && (
          <button onClick={() => { setSearch(""); setCategoryFilter(undefined); }} className="btn-secondary text-xs">
            <X size={12} className="inline mr-1" />清除
          </button>
        )}
      </div>

      {/* Equipment Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in" data-testid="equipment-browse-skeleton">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="brutalist-card p-4">
              <Skeleton className="mb-3 h-32 w-full rounded-none" />
              <Skeleton className="mb-2 h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : !equipmentList || equipmentList.length === 0 ? (
        <div className="empty-state equipment-browse-empty-state">
          <Package size={32} className="mb-3 opacity-30" />
          <p className="text-white font-bold mb-1">無可借用器材</p>
          <p className="label-caps">目前沒有符合條件的可借用器材</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedEquipmentList.map((item: any, i: number) => (
            <div
              key={item.id}
              className="brutalist-card flex flex-col overflow-hidden animate-fade-in"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {/* Image */}
              <div className="equipment-browse-image relative w-full h-36 bg-[oklch(0.12_0_0)] border-b border-[oklch(0.18_0_0)] flex items-center justify-center overflow-hidden">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="equipment-browse-image-media w-full h-full object-cover" />
                ) : (
                  <Package size={28} className="equipment-browse-image-placeholder text-[oklch(0.25_0_0)]" />
                )}
                <div className="absolute top-2 right-2">
                  <StatusBadge status={item.status} />
                </div>
              </div>

              {/* Info */}
              <div className="p-4 flex flex-col flex-1">
                <p className="label-caps mb-1">{(item as any).categoryName ?? "未分類"}</p>
                <h3 className="text-white font-bold text-sm leading-tight mb-2">{item.name}</h3>
                {item.description && (
                  <p className="text-[oklch(0.50_0_0)] text-xs leading-relaxed mb-3 line-clamp-2">{item.description}</p>
                )}
                <div className="mt-auto flex items-center justify-between">
                  <div>
                    <p className="label-caps">可借數量</p>
                    <p className="font-mono text-white font-bold text-lg">{item.availableQuantity}</p>
                  </div>
                  <button
                    onClick={() => { setBorrowTarget(item); reset({ quantity: 1 }); }}
                    disabled={item.availableQuantity === 0}
                    className={`px-4 py-2 text-xs font-bold tracking-wider uppercase border transition-all ${
                      item.availableQuantity > 0
                        ? "bg-white text-black border-white hover:bg-[oklch(0.85_0_0)] active:scale-95"
                        : "bg-transparent text-[oklch(0.30_0_0)] border-[oklch(0.22_0_0)] cursor-not-allowed"
                    }`}
                  >
                    {item.availableQuantity > 0 ? "申請借用" : "已借完"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Borrow Form Dialog */}
      <Dialog open={borrowTarget !== null} onOpenChange={(o) => { if (!o) { setBorrowTarget(null); reset(); } }}>
        <DialogContent className="bg-[oklch(0.12_0_0)] border border-[oklch(0.22_0_0)] rounded-none max-w-md text-white">
          <DialogHeader>
            <DialogTitle className="text-white font-bold">提交借用申請</DialogTitle>
          </DialogHeader>
          {borrowTarget && (
            <div className="mt-2">
              {/* Equipment Preview */}
              <div className="borrow-equipment-preview flex items-center gap-3 p-3 bg-[oklch(0.16_0_0)] border border-[oklch(0.22_0_0)] mb-5">
                {borrowTarget.imageUrl ? (
                  <img src={borrowTarget.imageUrl} alt={borrowTarget.name} className="borrow-equipment-preview-media w-12 h-12 object-cover border border-[oklch(0.22_0_0)]" />
                ) : (
                  <div className="borrow-equipment-preview-placeholder w-12 h-12 bg-[oklch(0.20_0_0)] flex items-center justify-center">
                    <Package size={18} className="text-[oklch(0.35_0_0)]" />
                  </div>
                )}
                <div>
                  <p className="text-white font-bold text-sm">{borrowTarget.name}</p>
                  <p className="label-caps">可借數量：{borrowTarget.availableQuantity}</p>
                </div>
              </div>

              <form noValidate onSubmit={handleSubmit(onSubmit, () => toast.error("請先填寫所有標示 * 的必填欄位"))} className="space-y-4">
                <div>
                  <label htmlFor="borrow-request-quantity" className="label-caps mb-1.5 block">借用數量 *</label>
                  <select
                    id="borrow-request-quantity"
                    aria-label="借用數量"
                    aria-invalid={Boolean(errors.quantity)}
                    className="industrial-input"
                    required
                    {...register("quantity", { valueAsNumber: true, min: { value: 1, message: "請選擇借用數量" }, max: { value: borrowTarget.availableQuantity, message: "借用數量不可超過可借數量" }, required: "請選擇借用數量" })}
                  >
                    {Array.from({ length: Math.max(0, borrowTarget.availableQuantity) }, (_, index) => index + 1).map((quantity) => (
                      <option key={quantity} value={quantity}>{quantity}</option>
                    ))}
                  </select>
                  {errors.quantity ? <p role="alert" className="form-field-error mt-1 text-xs">{errors.quantity.message}</p> : null}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-caps mb-1.5 block" htmlFor="borrow-request-borrow-date">借用日期 *</label>
                    <input
                      id="borrow-request-borrow-date"
                      type="date"
                      min={today}
                      aria-label="借用日期"
                      aria-invalid={Boolean(errors.borrowDate)}
                      className="industrial-input"
                      {...register("borrowDate", { required: "請選擇借用日期" })}
                    />
                    {errors.borrowDate ? <p role="alert" className="form-field-error mt-1 text-xs">{errors.borrowDate.message}</p> : null}
                  </div>
                  <div>
                    <label className="label-caps mb-1.5 block" htmlFor="borrow-request-return-date">歸還日期 *</label>
                    <input
                      id="borrow-request-return-date"
                      type="date"
                      min={watchBorrowDate || today}
                      aria-label="歸還日期"
                      aria-invalid={Boolean(errors.returnDate)}
                      className="industrial-input"
                      {...register("returnDate", { required: "請選擇歸還日期" })}
                    />
                    {errors.returnDate ? <p role="alert" className="form-field-error mt-1 text-xs">{errors.returnDate.message}</p> : null}
                  </div>
                </div>
                <div>
                  <label htmlFor="borrow-request-purpose" className="label-caps mb-1.5 block">借用用途 *</label>
                  <textarea
                    id="borrow-request-purpose"
                    className="industrial-input resize-none"
                    rows={2}
                    aria-invalid={Boolean(errors.purpose)}
                    {...register("purpose", { required: "請填寫借用用途", validate: (value) => value.trim().length > 0 || "請填寫借用用途" })}
                    placeholder="請說明借用用途"
                    required
                  />
                  {errors.purpose ? <p role="alert" className="form-field-error mt-1 text-xs">{errors.purpose.message}</p> : null}
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="submit" className="btn-primary flex-1" disabled={borrowMutation.isPending}>
                    {borrowMutation.isPending ? "提交中..." : "提交申請"}
                  </button>
                  <button type="button" onClick={() => { setBorrowTarget(null); reset(); }} className="btn-secondary">取消</button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
