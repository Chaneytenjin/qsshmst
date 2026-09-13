// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EquipmentBrowse from "../client/src/pages/EquipmentBrowse";
import EquipmentManage from "../client/src/pages/EquipmentManage";

const mocks = vi.hoisted(() => ({
  listUseQuery: vi.fn(),
  categoriesUseQuery: vi.fn(),
  createBorrowRequest: vi.fn(),
  createEquipment: vi.fn(),
  updateEquipment: vi.fn(),
  deleteEquipment: vi.fn(),
  deleteMutationOptions: null as any,
  deletePreviewUseQuery: vi.fn(),
  createCategory: vi.fn(),
  categoryManagementList: vi.fn(),
  categoryDeletePreview: vi.fn(),
  deleteCategory: vi.fn(),
  updateEquipmentCategory: vi.fn(),
  batchReassignCategory: vi.fn(),
  getLocationHistory: vi.fn(),
  getLocationHistoryOperators: vi.fn(),
  reviewLocationHistory: vi.fn(),
  signLocationHistory: vi.fn(),
  batchReviewLocationHistory: vi.fn(),
  exportLocationHistoryToCsv: vi.fn(),
  exportLocationHistoryToPdf: vi.fn(),
  refetchLocationHistory: vi.fn(),
  refetchLocationHistoryOperators: vi.fn(),
  setLocation: vi.fn(),
}));

vi.mock("../client/src/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ equipment: { list: { invalidate: vi.fn() }, categories: { invalidate: vi.fn() }, categoryManagementList: { invalidate: vi.fn() }, getLocationHistory: { invalidate: vi.fn() } } }),
    equipment: {
      list: { useQuery: mocks.listUseQuery },
      categories: { useQuery: mocks.categoriesUseQuery },
      create: { useMutation: () => ({ mutate: mocks.createEquipment, isPending: false }) },
      update: { useMutation: () => ({ mutate: mocks.updateEquipment, isPending: false }) },
      delete: { useMutation: (options: any) => { mocks.deleteMutationOptions = options; return { mutate: mocks.deleteEquipment, isPending: false }; } },
      deletePreview: { useQuery: mocks.deletePreviewUseQuery },
      createCategory: { useMutation: () => ({ mutate: mocks.createCategory, isPending: false }) },
      categoryManagementList: { useQuery: mocks.categoryManagementList },
      categoryDeletePreview: { useQuery: mocks.categoryDeletePreview },
      deleteCategory: { useMutation: () => ({ mutate: mocks.deleteCategory, isPending: false }) },
      updateCategory: { useMutation: () => ({ mutate: mocks.updateEquipmentCategory, isPending: false }) },
      batchReassignCategory: { useMutation: () => ({ mutate: mocks.batchReassignCategory, isPending: false }) },
      getLocationHistory: { useQuery: mocks.getLocationHistory },
      getLocationHistoryOperators: { useQuery: mocks.getLocationHistoryOperators },
      reviewLocationHistory: { useMutation: () => ({ mutate: mocks.reviewLocationHistory, isPending: false }) },
      signLocationHistory: { useMutation: () => ({ mutate: mocks.signLocationHistory, isPending: false }) },
      batchReviewLocationHistory: { useMutation: () => ({ mutate: mocks.batchReviewLocationHistory, isPending: false }) },
    },
    borrowRequests: { create: { useMutation: () => ({ mutate: mocks.createBorrowRequest, isPending: false }) } },
  },
}));

vi.mock("../client/src/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { role: "admin", username: "admin-user" } }),
}));

vi.mock("../client/src/components/StatusBadge", () => ({
  StatusBadge: () => <span>狀態</span>,
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("wouter", () => ({ useLocation: () => ["/equipment", mocks.setLocation] }));
vi.mock("../client/src/lib/locationHistoryExport", () => ({
  exportLocationHistoryToCsv: mocks.exportLocationHistoryToCsv,
  exportLocationHistoryToPdf: mocks.exportLocationHistoryToPdf,
}));

const equipmentRows = [
  { id: 1, name: "B 區攝影機", categoryId: 1, categoryName: "攝影器材", totalQuantity: 1, availableQuantity: 1, status: "available", location: "B-02", qrCodeId: "QSSHMST0001", imageUrl: "https://images.example.test/camera.jpg" },
  { id: 2, name: "A 區麥克風", categoryId: 2, categoryName: "音訊器材", totalQuantity: 1, availableQuantity: 1, status: "available", location: "A-01", qrCodeId: "QSSHMST0002" },
];

describe("器材列表載入體驗", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getLocationHistory.mockReturnValue({ data: [], isLoading: false, error: null, refetch: mocks.refetchLocationHistory });
    mocks.getLocationHistoryOperators.mockReturnValue({ data: [], isLoading: false, error: null, refetch: mocks.refetchLocationHistoryOperators });
    mocks.deletePreviewUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: null });
    mocks.deleteMutationOptions = null;
    mocks.categoryManagementList.mockReturnValue({ data: [], isLoading: false, error: null });
    mocks.categoryDeletePreview.mockReturnValue({ data: undefined, isLoading: false, error: null });
    mocks.exportLocationHistoryToPdf.mockResolvedValue(undefined);
  });

  afterEach(() => cleanup());

  it("器材管理列表會在載入時顯示表格骨架與搜尋分類控制項", () => {
    mocks.listUseQuery.mockReturnValue({ data: undefined, isLoading: true });
    mocks.categoriesUseQuery.mockReturnValue({ data: [] });

    render(<EquipmentManage />);

    expect(screen.getByPlaceholderText("搜尋器材名稱...")).toBeInTheDocument();
    expect(screen.getAllByRole("combobox")).toHaveLength(3);
    expect(screen.getByTestId("equipment-manage-skeleton")).toBeInTheDocument();
  });

  it("無器材資料時顯示器材管理專用的空狀態容器", () => {
    mocks.listUseQuery.mockReturnValue({ data: [], isLoading: false });
    mocks.categoriesUseQuery.mockReturnValue({ data: [] });

    render(<EquipmentManage />);

    expect(screen.getByTestId("equipment-empty-state")).toHaveClass("equipment-empty-state", "empty-state");
    expect(screen.getByText("尚無器材資料")).toBeInTheDocument();
  });

  it("器材圖片與未設定圖片的預設圖示都置於可套用高對比主題的縮圖容器", () => {
    mocks.listUseQuery.mockReturnValue({ data: equipmentRows, isLoading: false });
    mocks.categoriesUseQuery.mockReturnValue({ data: [] });

    render(<EquipmentManage />);

    const image = screen.getByRole("img", { name: "B 區攝影機" });
    expect(image).toHaveClass("equipment-thumbnail");
    expect(image.parentElement).toHaveClass("equipment-thumbnail-frame");
    expect(screen.getByTestId("equipment-thumbnail-placeholder-2")).toHaveClass("equipment-thumbnail", "equipment-thumbnail--placeholder");
    expect(screen.getByTestId("equipment-thumbnail-frame-2")).toContainElement(screen.getByTestId("equipment-thumbnail-placeholder-2"));
  });

  it("器材存放位置與操作欄使用深色模式高對比語意樣式", () => {
    mocks.listUseQuery.mockReturnValue({ data: equipmentRows, isLoading: false });
    mocks.categoriesUseQuery.mockReturnValue({ data: [] });

    render(<EquipmentManage />);

    expect(screen.getByText("B-02")).toHaveClass("equipment-location-cell");
    expect(screen.getByRole("button", { name: "編輯 B 區攝影機" })).toHaveClass("equipment-action-button", "equipment-action-button--primary");
  });

  it("新增器材時會要求分類、狀態、可借數量與存放位置", async () => {
    const user = userEvent.setup();
    mocks.listUseQuery.mockReturnValue({ data: equipmentRows, isLoading: false });
    mocks.categoriesUseQuery.mockReturnValue({ data: [{ id: 1, name: "攝影器材" }] });

    render(<EquipmentManage />);
    await user.click(screen.getByRole("button", { name: /新增器材/ }));

    expect(screen.getByRole("combobox", { name: "器材分類" })).toBeRequired();
    expect(screen.getByRole("combobox", { name: "器材狀態" })).toBeRequired();
    expect(screen.getByRole("combobox", { name: "可借數量" })).toBeRequired();
    expect(screen.getByRole("textbox", { name: "器材存放位置" })).toBeRequired();
    expect(screen.getByRole("option", { name: "請選擇分類" })).toBeDisabled();
    expect(screen.getByRole("option", { name: "請選擇狀態" })).toBeDisabled();
    expect(screen.getByRole("option", { name: "請選擇可借數量" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "器材分類" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "器材狀態" })).toHaveValue("");
    expect(screen.getByRole("spinbutton", { name: "總數量" })).toHaveAttribute("placeholder", "輸入數量");
    const totalQuantityInput = screen.getByRole("spinbutton", { name: "總數量" });
    const availableQuantitySelect = screen.getByRole("combobox", { name: "可借數量" });
    expect(totalQuantityInput).toHaveValue(null);
    expect(within(availableQuantitySelect).getAllByRole("option").map((option) => option.getAttribute("value"))).toEqual([""]);
    await user.clear(totalQuantityInput);
    await user.type(totalQuantityInput, "3");
    expect(within(availableQuantitySelect).getAllByRole("option").map((option) => option.getAttribute("value"))).toEqual(["", "0", "1", "2", "3"]);
    await user.selectOptions(availableQuantitySelect, "3");
    expect(availableQuantitySelect).toHaveValue("3");
    await user.clear(totalQuantityInput);
    await user.type(totalQuantityInput, "2");
    expect(within(availableQuantitySelect).getAllByRole("option").map((option) => option.getAttribute("value"))).toEqual(["", "0", "1", "2"]);
    await user.selectOptions(availableQuantitySelect, "2");
    expect(availableQuantitySelect).toHaveValue("2");
    await user.click(screen.getByRole("button", { name: "新增器材" }));
    expect(screen.getByRole("textbox", { name: "器材名稱" })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("textbox", { name: "器材存放位置" })).toHaveAttribute("aria-invalid", "true");
  });

  it("新增器材未填必填欄位時會顯示紅框，關閉後重開不預先顯示錯誤", async () => {
    const user = userEvent.setup();
    mocks.listUseQuery.mockReturnValue({ data: equipmentRows, isLoading: false });
    mocks.categoriesUseQuery.mockReturnValue({ data: [{ id: 1, name: "攝影器材" }] });

    render(<EquipmentManage />);
    await user.click(screen.getByRole("button", { name: /新增器材/ }));
    await user.click(screen.getByRole("button", { name: "新增器材" }));

    expect(screen.getByRole("textbox", { name: "器材名稱" })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("combobox", { name: "器材分類" })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("combobox", { name: "器材狀態" })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("spinbutton", { name: "總數量" })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("combobox", { name: "可借數量" })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("textbox", { name: "器材存放位置" })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getAllByRole("alert")).not.toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "取消" }));
    await user.click(screen.getByRole("button", { name: /新增器材/ }));
    expect(screen.getByRole("textbox", { name: "器材名稱" })).toHaveAttribute("aria-invalid", "false");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("編輯器材使用不滿版的專屬矩形彈窗容器，且可借數量預設為目前實際值", async () => {
    const user = userEvent.setup();
    mocks.listUseQuery.mockReturnValue({ data: equipmentRows, isLoading: false });
    mocks.categoriesUseQuery.mockReturnValue({ data: [{ id: 1, name: "攝影器材" }] });

    render(<EquipmentManage />);
    await user.click(screen.getByRole("button", { name: "編輯 B 區攝影機" }));

    expect(screen.getByRole("dialog", { name: "編輯器材" })).toHaveClass("equipment-form-dialog", "equipment-edit-dialog");
    expect(screen.getByRole("combobox", { name: "可借數量" })).toHaveValue("1");
    expect(screen.getByRole("option", { name: "請選擇可借數量" })).toBeDisabled();
  });

  it("分類管理移除冗長說明，並為使用器材與操作提供可套用對比樣式的語意類別", async () => {
    const user = userEvent.setup();
    mocks.listUseQuery.mockReturnValue({ data: equipmentRows, isLoading: false });
    mocks.categoriesUseQuery.mockReturnValue({ data: [{ id: 1, name: "攝影器材" }] });
    mocks.categoryManagementList.mockReturnValue({ data: [{ id: 1, name: "攝影器材", description: "攝影設備", createdAt: new Date("2026-08-01T00:00:00Z"), equipmentCount: 2 }], isLoading: false, error: null });

    render(<EquipmentManage />);
    await user.click(screen.getByRole("button", { name: "管理分類" }));

    expect(screen.queryByText("可檢視各分類的使用狀況管理員僅能刪除未被任何器材使用的分類")).not.toBeInTheDocument();
    expect(screen.getByText("2 項")).toHaveClass("category-usage-count", "category-usage-count--used");
    expect(screen.getByText("2026/8/1")).toHaveClass("category-created-at");
    expect(screen.getByRole("button", { name: "編輯分類 攝影器材" })).toHaveClass("category-management-action", "category-management-action--edit");
  });

  it("將新增分類入口收納於管理分類彈窗內", async () => {
    const user = userEvent.setup();
    mocks.listUseQuery.mockReturnValue({ data: equipmentRows, isLoading: false });
    mocks.categoriesUseQuery.mockReturnValue({ data: [{ id: 1, name: "攝影器材" }] });
    mocks.categoryManagementList.mockReturnValue({ data: [], isLoading: false, error: null });

    render(<EquipmentManage />);
    expect(screen.queryByRole("button", { name: "+ 新增分類" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "管理分類" }));
    const categoryManager = screen.getByRole("dialog", { name: "器材分類管理" });
    const createCategoryButton = within(categoryManager).getByRole("button", { name: "新增分類" });
    expect(createCategoryButton).toHaveClass("btn-primary");
    await user.click(createCategoryButton);
    expect(screen.getByRole("dialog", { name: "新增器材分類" })).toBeInTheDocument();
  });

  it("新增與編輯分類的必填紅框會在下次開啟時重設", async () => {
    const user = userEvent.setup();
    mocks.listUseQuery.mockReturnValue({ data: equipmentRows, isLoading: false });
    mocks.categoriesUseQuery.mockReturnValue({ data: [] });
    mocks.categoryManagementList.mockReturnValue({ data: [{ id: 7, name: "攝影器材", description: "相機與鏡頭", equipmentCount: 0, createdAt: new Date("2026-08-01T00:00:00.000Z") }], isLoading: false });

    render(<EquipmentManage />);
    await user.click(screen.getByRole("button", { name: "管理分類" }));
    await user.click(screen.getByRole("button", { name: "新增分類" }));
    await user.click(screen.getByRole("button", { name: "新增分類" }));
    expect(screen.getByRole("textbox", { name: "分類名稱" })).toHaveAttribute("aria-invalid", "true");
    await user.click(screen.getByRole("button", { name: "取消" }));
    await user.click(screen.getByRole("button", { name: "新增分類" }));
    expect(screen.getByRole("textbox", { name: "分類名稱" })).toHaveAttribute("aria-invalid", "false");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "取消" }));

    await user.click(screen.getByRole("button", { name: "編輯分類 攝影器材" }));
    const editName = screen.getByRole("textbox", { name: "分類名稱 *" });
    await user.clear(editName);
    await user.click(screen.getByRole("button", { name: "儲存分類" }));
    expect(editName).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("請填寫分類名稱");
    await user.click(screen.getByRole("button", { name: "取消" }));
    await user.click(screen.getByRole("button", { name: "編輯分類 攝影器材" }));
    expect(screen.getByRole("textbox", { name: "分類名稱 *" })).toHaveAttribute("aria-invalid", "false");
  });

  it("管理員可檢視分類使用量，並看見仍有器材使用的刪除保護", async () => {
    const user = userEvent.setup();
    mocks.listUseQuery.mockReturnValue({ data: equipmentRows, isLoading: false });
    mocks.categoriesUseQuery.mockReturnValue({ data: [{ id: 1, name: "攝影器材" }] });
    mocks.categoryManagementList.mockReturnValue({ data: [{ id: 1, name: "攝影器材", description: "攝影設備", createdAt: new Date("2026-08-01T00:00:00Z"), equipmentCount: 2 }], isLoading: false, error: null });
    mocks.categoryDeletePreview.mockReturnValue({ data: { target: { id: 1, name: "攝影器材", description: "攝影設備" }, canDelete: false, blockingReasons: ["此分類仍套用於 2 項器材；請先將器材改為其他分類或未分類後再刪除"], dependencies: [{ key: "assignedEquipment", label: "使用此分類的器材", count: 2, effect: "需先重新分類" }], dependentRecordCount: 2, assignedEquipment: [{ id: 1, name: "B 區攝影機", serialNumber: null, status: "available" }] }, isLoading: false, error: null });

    render(<EquipmentManage />);
    await user.click(screen.getByRole("button", { name: "管理分類" }));
    const categoryManager = screen.getByRole("dialog", { name: "器材分類管理" });
    expect(within(categoryManager).getByText("攝影器材")).toBeInTheDocument();
    expect(within(categoryManager).getByText("2 項")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "刪除分類 攝影器材" }));
    expect(screen.getByRole("dialog", { name: "分類刪除前使用狀況" })).toHaveClass("equipment-category-delete-dialog");
    expect(screen.getByText("分類刪除前使用狀況")).toBeInTheDocument();
    expect(screen.getByText("使用此分類的器材（最多顯示 20 項）")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "繼續二次確認" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "永久刪除分類" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "取消" })).toHaveClass("flex-1");
    expect(screen.getByRole("button", { name: "取消" })).toBeEnabled();
  });

  it("教師以上可重新命名器材分類並更新說明", async () => {
    const user = userEvent.setup();
    mocks.listUseQuery.mockReturnValue({ data: equipmentRows, isLoading: false });
    mocks.categoriesUseQuery.mockReturnValue({ data: [{ id: 1, name: "攝影器材" }] });
    mocks.categoryManagementList.mockReturnValue({ data: [{ id: 1, name: "攝影器材", description: "攝影設備", createdAt: new Date("2026-08-01T00:00:00Z"), equipmentCount: 2 }], isLoading: false, error: null });

    render(<EquipmentManage />);
    await user.click(screen.getByRole("button", { name: "管理分類" }));
    await user.click(screen.getByRole("button", { name: "編輯分類 攝影器材" }));
    const dialog = screen.getByRole("dialog", { name: "編輯器材分類" });
    const categoryNameInput = dialog.querySelector("#edit-category-name") as HTMLInputElement;
    const categoryDescriptionInput = dialog.querySelector("#edit-category-description") as HTMLTextAreaElement;
    await user.clear(categoryNameInput);
    await user.type(categoryNameInput, "影像器材");
    await user.clear(categoryDescriptionInput);
    await user.type(categoryDescriptionInput, "攝影與錄影相關設備");
    await user.click(within(dialog).getByRole("button", { name: "儲存分類" }));
    expect(mocks.updateEquipmentCategory).toHaveBeenCalledWith({ id: 1, name: "影像器材", description: "攝影與錄影相關設備" });
  });

  it("可多選器材後於確認視窗選擇既有分類再批次重新分類，且不提供未分類選項", async () => {
    const user = userEvent.setup();
    mocks.listUseQuery.mockReturnValue({ data: equipmentRows, isLoading: false });
    mocks.categoriesUseQuery.mockReturnValue({ data: [{ id: 1, name: "攝影器材" }] });

    render(<EquipmentManage />);
    await user.click(screen.getByRole("checkbox", { name: "選取 B 區攝影機 進行批次操作" }));
    await user.click(screen.getByRole("checkbox", { name: "選取 A 區麥克風 進行批次操作" }));
    await user.click(screen.getByRole("button", { name: "批次重新分類" }));
    const dialog = screen.getByRole("dialog", { name: "批次重新分類" });
    expect(within(dialog).getByText("將為已選取的 2 項器材設定新的分類")).toBeInTheDocument();
    expect(within(dialog).getByRole("combobox", { name: "批次重新分類目標" })).toHaveValue("");
    expect(within(dialog).queryByRole("option", { name: "未分類" })).not.toBeInTheDocument();
    expect(mocks.batchReassignCategory).not.toHaveBeenCalled();
    await user.selectOptions(within(dialog).getByRole("combobox", { name: "批次重新分類目標" }), "1");
    await user.click(within(dialog).getByRole("button", { name: "確認重新分類" }));
    expect(mocks.batchReassignCategory).toHaveBeenCalledWith({ equipmentIds: [1, 2], categoryId: 1 });
  });

  it("器材刪除成功後會自目前選取清單移除該筆器材", async () => {
    const user = userEvent.setup();
    mocks.listUseQuery.mockReturnValue({ data: equipmentRows, isLoading: false });
    mocks.categoriesUseQuery.mockReturnValue({ data: [{ id: 1, name: "攝影器材" }] });

    render(<EquipmentManage />);
    const deletedEquipmentCheckbox = screen.getByRole("checkbox", { name: "選取 B 區攝影機 進行批次操作" });
    const remainingEquipmentCheckbox = screen.getByRole("checkbox", { name: "選取 A 區麥克風 進行批次操作" });
    await user.click(deletedEquipmentCheckbox);
    await user.click(remainingEquipmentCheckbox);
    expect(screen.getByText((_, element) => element?.textContent === "已選取 2 項器材")).toBeInTheDocument();

    await act(async () => { mocks.deleteMutationOptions.onSuccess({ success: true }, { id: 1, confirmed: true }); });

    expect(screen.getByText((_, element) => element?.textContent === "已選取 1 項器材")).toBeInTheDocument();
    expect(deletedEquipmentCheckbox).not.toBeChecked();
    expect(remainingEquipmentCheckbox).toBeChecked();
  });

  it("器材瀏覽列表會在載入時顯示卡片骨架並維持搜尋分類控制項", () => {
    mocks.listUseQuery.mockReturnValue({ data: undefined, isLoading: true });
    mocks.categoriesUseQuery.mockReturnValue({ data: [] });

    render(<EquipmentBrowse />);

    expect(screen.getByPlaceholderText("搜尋器材名稱...")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "依器材分類篩選" })).toHaveValue("");
    expect(screen.getByRole("option", { name: "全部分類" })).toBeInTheDocument();
    expect(screen.getByTestId("equipment-browse-skeleton")).toBeInTheDocument();
  });

  it("可多選器材後進入批次 QR Code 列印，並依存放位置排序", async () => {
    const user = userEvent.setup();
    mocks.listUseQuery.mockReturnValue({ data: equipmentRows, isLoading: false });
    mocks.categoriesUseQuery.mockReturnValue({ data: [] });

    render(<EquipmentManage />);

    await user.click(screen.getByRole("checkbox", { name: "選取全部可列印器材" }));
    const selectionSummary = screen.getByText((_, element) => element?.textContent === "已選取 2 項器材");
    expect(selectionSummary).toHaveClass("equipment-selection-summary-copy");
    expect(selectionSummary.parentElement).toHaveClass("equipment-selection-summary");
    await user.click(screen.getByRole("button", { name: /^批次列印 QR Code/ }));
    expect(mocks.setLocation).toHaveBeenCalledWith("/qrcode-print-list?print=1,2");

    await user.selectOptions(screen.getByRole("combobox", { name: "依存放位置排序" }), "asc");
    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("A 區麥克風");
    expect(rows[2]).toHaveTextContent("B 區攝影機");
  });

  it("可在器材詳細資訊檢視位置異動時間軸", async () => {
    const user = userEvent.setup();
    mocks.listUseQuery.mockReturnValue({ data: equipmentRows, isLoading: false });
    mocks.categoriesUseQuery.mockReturnValue({ data: [] });
    mocks.getLocationHistory.mockReturnValue({
      data: [{
        id: 4,
        previousLocation: "器材室",
        newLocation: "A-01",
        changedAt: new Date("2026-08-12T08:00:00.000Z"),
        changedByName: "王小明",
        changedByUsername: "wang",
        changedByRealName: null,
        note: "更新器材存放位置",
      }],
      isLoading: false,
    });

    render(<EquipmentManage />);

    const historyButton = screen.getByRole("button", { name: "查看 B 區攝影機 的位置異動紀錄" });
    expect(historyButton).not.toHaveTextContent("異動紀錄");
    expect(historyButton).toHaveAttribute("title", "器材異動紀錄");
    await user.click(historyButton);

    expect(screen.getByRole("heading", { name: "位置異動紀錄" })).toBeInTheDocument();
    const historyDialog = screen.getByRole("dialog");
    expect(historyDialog).toHaveClass("equipment-location-history-dialog");
    expect(within(historyDialog).getByText("目前存放位置：B-02")).toBeInTheDocument();
    expect(within(historyDialog).getByText("器材室")).toBeInTheDocument();
    expect(within(historyDialog).getByText("A-01")).toBeInTheDocument();
    expect(within(historyDialog).getByText("異動人員：王小明（wang）")).toBeInTheDocument();
  });

  it("管理者可為待覆核異動填寫覆核結果", async () => {
    const user = userEvent.setup();
    mocks.listUseQuery.mockReturnValue({ data: equipmentRows, isLoading: false });
    mocks.categoriesUseQuery.mockReturnValue({ data: [] });
    mocks.getLocationHistory.mockReturnValue({ data: [{ id: 4, previousLocation: "器材室", newLocation: "A-01", changedAt: new Date("2026-08-12T08:00:00.000Z"), changedByName: "王小明", changedByUsername: "wang", changedByRealName: null, note: "更新器材存放位置", reviewStatus: "pending", reviewNote: null, reviewedAt: null, signatureStatus: "unsigned", signedAt: null }], isLoading: false });

    render(<EquipmentManage />);
    await user.click(screen.getByRole("button", { name: "查看 B 區攝影機 的位置異動紀錄" }));
    expect(screen.getByText("待管理員覆核")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /管理員覆核/ }));
    const dialog = screen.getByRole("dialog", { name: "管理員覆核異動紀錄" });
    await user.type(within(dialog).getByLabelText("覆核意見"), "位置與交接內容均已核對");
    await user.selectOptions(within(dialog).getByRole("combobox", { name: "覆核結果" }), "rejected");
    expect(within(dialog).getByLabelText("覆核意見")).toHaveValue("");
    await user.type(within(dialog).getByLabelText("覆核意見"), "需要補充交接說明");
    await user.selectOptions(within(dialog).getByRole("combobox", { name: "覆核結果" }), "approved");
    expect(within(dialog).getByLabelText("覆核意見")).toHaveValue("");
    await user.type(within(dialog).getByLabelText("覆核意見"), "位置與交接內容均已核對");
    await user.click(within(dialog).getByRole("button", { name: "儲存覆核結果" }));
    expect(mocks.reviewLocationHistory).toHaveBeenCalledWith({ historyId: 4, reviewStatus: "approved", reviewNote: "位置與交接內容均已核對" });
  });

  it("管理者可對已通過覆核的異動完成確認式電子簽核", async () => {
    const user = userEvent.setup();
    mocks.listUseQuery.mockReturnValue({ data: equipmentRows, isLoading: false });
    mocks.categoriesUseQuery.mockReturnValue({ data: [] });
    mocks.getLocationHistory.mockReturnValue({ data: [{ id: 4, previousLocation: "器材室", newLocation: "A-01", changedAt: new Date("2026-08-12T08:00:00.000Z"), changedByName: "王小明", changedByUsername: "wang", changedByRealName: null, note: "更新器材存放位置", reviewStatus: "approved", reviewNote: "位置已核對", reviewedAt: new Date("2026-08-12T09:00:00.000Z"), reviewedByName: "李管理員", signatureStatus: "unsigned", signedAt: null }], isLoading: false });

    render(<EquipmentManage />);
    await user.click(screen.getByRole("button", { name: "查看 B 區攝影機 的位置異動紀錄" }));
    expect(screen.getByText("已覆核通過")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /電子簽核/ }));
    const dialog = screen.getByRole("dialog", { name: "電子簽核確認" });
    expect(within(dialog).getByLabelText("電子簽核確認帳號")).toHaveAttribute("placeholder", "請輸入帳號名稱");
    await user.type(within(dialog).getByLabelText("電子簽核確認帳號"), "admin-user");
    await user.click(within(dialog).getByRole("button", { name: "確認電子簽核" }));
    expect(mocks.signLocationHistory).toHaveBeenCalledWith({ historyId: 4, confirmation: "admin-user" });
  });

  it("管理者可勾選多筆未簽核異動後一次退回並附上共同覆核意見", async () => {
    const user = userEvent.setup();
    mocks.listUseQuery.mockReturnValue({ data: equipmentRows, isLoading: false });
    mocks.categoriesUseQuery.mockReturnValue({ data: [] });
    mocks.getLocationHistory.mockReturnValue({ data: [
      { id: 4, previousLocation: "器材室", newLocation: "A-01", changedAt: new Date("2026-08-12T08:00:00.000Z"), changedByName: "王小明", changedByUsername: "wang", changedByRealName: null, note: "更新器材存放位置", reviewStatus: "pending", reviewNote: null, reviewedAt: null, signatureStatus: "unsigned", signedAt: null },
      { id: 5, previousLocation: "B-02", newLocation: "器材室", changedAt: new Date("2026-08-12T09:00:00.000Z"), changedByName: "林同學", changedByUsername: "lin", changedByRealName: null, note: "活動歸位", reviewStatus: "pending", reviewNote: null, reviewedAt: null, signatureStatus: "unsigned", signedAt: null },
    ], isLoading: false });

    render(<EquipmentManage />);
    await user.click(screen.getByRole("button", { name: "查看 B 區攝影機 的位置異動紀錄" }));
    await user.click(screen.getByRole("checkbox", { name: "選取異動紀錄 4 進行批次覆核" }));
    await user.click(screen.getByRole("checkbox", { name: "選取異動紀錄 5 進行批次覆核" }));
    await user.click(screen.getByRole("button", { name: "批次覆核" }));
    const dialog = screen.getByRole("dialog", { name: "批次覆核位置異動紀錄" });
    await user.selectOptions(within(dialog).getByRole("combobox", { name: "批次覆核結果" }), "rejected");
    await user.type(within(dialog).getByLabelText("批次覆核意見"), "請補齊兩筆器材交接說明");
    await user.click(within(dialog).getByRole("button", { name: "確認批次覆核" }));
    expect(mocks.batchReviewLocationHistory).toHaveBeenCalledWith({ historyIds: [4, 5], reviewStatus: "rejected", reviewNote: "請補齊兩筆器材交接說明" });
  });

  it("變更存放位置時會先開啟移轉原因彈窗，確認後才送出更新", async () => {
    const user = userEvent.setup();
    mocks.listUseQuery.mockReturnValue({ data: equipmentRows, isLoading: false });
    mocks.categoriesUseQuery.mockReturnValue({ data: [{ id: 1, name: "攝影器材" }, { id: 2, name: "音訊器材" }] });

    render(<EquipmentManage />);

    await user.click(screen.getByRole("button", { name: "編輯 B 區攝影機" }));
    await user.clear(screen.getByRole("textbox", { name: "器材存放位置" }));
    await user.type(screen.getByRole("textbox", { name: "器材存放位置" }), "器材室 A-01");
    await user.selectOptions(screen.getByRole("combobox", { name: "可借數量" }), "1");
    await user.click(screen.getByRole("button", { name: "儲存變更" }));

    const dialog = screen.getByRole("dialog", { name: "填寫位置異動原因" });
    expect(within(dialog).getByText(/存放位置將由「B-02」變更為「器材室 A-01」/)).toBeInTheDocument();
    expect(mocks.updateEquipment).not.toHaveBeenCalled();
    const noteInput = within(dialog).getByRole("textbox", { name: "移轉原因／自訂備註" });
    expect(noteInput).toHaveAttribute("aria-invalid", "false");
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "確認儲存" }));
    expect(noteInput).toHaveAttribute("aria-invalid", "true");
    expect(within(dialog).getByRole("alert")).toHaveTextContent("請填寫移轉原因／自訂備註");
    await user.type(noteInput, "拍攝活動結束後歸位");
    await user.click(within(dialog).getByRole("button", { name: "確認儲存" }));

    expect(mocks.updateEquipment).toHaveBeenCalledWith(expect.objectContaining({
      id: 1,
      location: "器材室 A-01",
      locationNote: "拍攝活動結束後歸位",
    }));
  });

  it("未變更存放位置時不開啟移轉原因彈窗，直接送出器材更新", async () => {
    const user = userEvent.setup();
    mocks.listUseQuery.mockReturnValue({ data: equipmentRows, isLoading: false });
    mocks.categoriesUseQuery.mockReturnValue({ data: [{ id: 1, name: "攝影器材" }, { id: 2, name: "音訊器材" }] });

    render(<EquipmentManage />);

    await user.click(screen.getByRole("button", { name: "編輯 B 區攝影機" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "可借數量" }), "1");
    await user.click(screen.getByRole("button", { name: "儲存變更" }));

    expect(screen.queryByRole("dialog", { name: "填寫位置異動原因" })).not.toBeInTheDocument();
    expect(mocks.updateEquipment).toHaveBeenCalledWith(expect.objectContaining({ id: 1, location: "B-02" }));
    expect(mocks.updateEquipment.mock.calls.at(-1)?.[0]).not.toHaveProperty("locationNote");
  });

  it("可依日期與操作人員篩選位置紀錄並匯出 CSV/PDF", async () => {
    const user = userEvent.setup();
    const entries = [{
      id: 4,
      previousLocation: "器材室",
      newLocation: "A-01",
      changedAt: new Date("2026-08-12T08:00:00.000Z"),
      changedById: 7,
      changedByName: "王小明",
      changedByUsername: "wang",
      changedByRealName: null,
      note: "更新器材存放位置",
    }];
    mocks.listUseQuery.mockReturnValue({ data: equipmentRows, isLoading: false });
    mocks.categoriesUseQuery.mockReturnValue({ data: [] });
    mocks.getLocationHistory.mockReturnValue({ data: entries, isLoading: false });
    mocks.getLocationHistoryOperators.mockReturnValue({
      data: [{ changedById: 7, changedByName: "王小明", changedByUsername: "wang", changedByRealName: null }],
    });

    render(<EquipmentManage />);

    await user.click(screen.getByRole("button", { name: "查看 B 區攝影機 的位置異動紀錄" }));
    await user.type(screen.getByLabelText("位置異動開始日期"), "2026-08-01");
    await user.type(screen.getByLabelText("位置異動結束日期"), "2026-08-31");
    await user.selectOptions(screen.getByRole("combobox", { name: "篩選位置異動操作人員" }), "7");

    await waitFor(() => {
      const queryInput = mocks.getLocationHistory.mock.calls.at(-1)?.[0];
      expect(queryInput).toMatchObject({ equipmentId: 1, changedById: 7 });
      expect(queryInput.changedAtFrom.toISOString()).toBe("2026-08-01T00:00:00.000Z");
      expect(queryInput.changedAtTo.toISOString()).toBe("2026-08-31T23:59:59.999Z");
    });

    await user.click(screen.getByRole("button", { name: /匯出 CSV/ }));
    await user.click(screen.getByRole("button", { name: /匯出 PDF/ }));

    expect(mocks.exportLocationHistoryToCsv).toHaveBeenCalledWith(expect.objectContaining({ equipmentName: "B 區攝影機", entries }));
    await waitFor(() => expect(mocks.exportLocationHistoryToPdf).toHaveBeenCalledWith(expect.objectContaining({ equipmentName: "B 區攝影機", entries })));
  });

  it("位置異動紀錄查詢失敗時會顯示錯誤、保護匯出並可重試", async () => {
    const user = userEvent.setup();
    mocks.listUseQuery.mockReturnValue({ data: equipmentRows, isLoading: false });
    mocks.categoriesUseQuery.mockReturnValue({ data: [] });
    mocks.getLocationHistory.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: "稽核服務暫時無法使用" },
      refetch: mocks.refetchLocationHistory,
    });

    render(<EquipmentManage />);

    await user.click(screen.getByRole("button", { name: "查看 B 區攝影機 的位置異動紀錄" }));

    expect(screen.getByText("位置異動紀錄載入失敗")).toBeInTheDocument();
    expect(screen.getByText("稽核服務暫時無法使用")).toBeInTheDocument();
    expect(screen.queryByText(/尚無位置異動紀錄/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /匯出 CSV/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /匯出 PDF/ })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "重試載入異動紀錄" }));
    expect(mocks.refetchLocationHistory).toHaveBeenCalledOnce();
    expect(mocks.refetchLocationHistoryOperators).toHaveBeenCalledOnce();
  });

  it("操作人員清單查詢失敗時會保留日期篩選並提供獨立重試", async () => {
    const user = userEvent.setup();
    mocks.listUseQuery.mockReturnValue({ data: equipmentRows, isLoading: false });
    mocks.categoriesUseQuery.mockReturnValue({ data: [] });
    mocks.getLocationHistory.mockReturnValue({ data: [], isLoading: false, error: null, refetch: mocks.refetchLocationHistory });
    mocks.getLocationHistoryOperators.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: "人員資料讀取失敗" },
      refetch: mocks.refetchLocationHistoryOperators,
    });

    render(<EquipmentManage />);

    await user.click(screen.getByRole("button", { name: "查看 B 區攝影機 的位置異動紀錄" }));

    expect(screen.getByText("操作人員清單載入失敗，仍可使用日期篩選")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "篩選位置異動操作人員" })).toBeDisabled();
    expect(screen.getByLabelText("位置異動開始日期")).not.toBeDisabled();

    await user.click(screen.getByRole("button", { name: "重試人員清單" }));
    expect(mocks.refetchLocationHistoryOperators).toHaveBeenCalledOnce();
  });

  it("器材瀏覽列表可依存放位置排序", async () => {
    const user = userEvent.setup();
    mocks.listUseQuery.mockReturnValue({ data: equipmentRows, isLoading: false });
    mocks.categoriesUseQuery.mockReturnValue({ data: [] });

    render(<EquipmentBrowse />);

    await user.selectOptions(screen.getByRole("combobox", { name: "依瀏覽器材存放位置排序" }), "asc");
    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings[0]).toHaveTextContent("A 區麥克風");
    expect(headings[1]).toHaveTextContent("B 區攝影機");
  });

  it("器材瀏覽以分類下拉選單提供全部分類及個別分類篩選", async () => {
    const user = userEvent.setup();
    mocks.listUseQuery.mockReturnValue({ data: equipmentRows, isLoading: false });
    mocks.categoriesUseQuery.mockReturnValue({ data: [{ id: 1, name: "攝影器材" }, { id: 2, name: "音訊器材" }] });

    render(<EquipmentBrowse />);

    const categorySelect = screen.getByRole("combobox", { name: "依器材分類篩選" });
    expect(categorySelect).toHaveValue("");
    expect(within(categorySelect).getAllByRole("option").map((option) => option.textContent)).toEqual(["全部分類", "攝影器材", "音訊器材"]);
    await user.selectOptions(categorySelect, "2");
    expect(mocks.listUseQuery.mock.calls.at(-1)?.[0]).toMatchObject({ categoryId: 2, status: "available" });
  });

  it("提交借用申請會要求用途，且借用數量只提供可借數量範圍內的選項", async () => {
    const user = userEvent.setup();
    mocks.listUseQuery.mockReturnValue({ data: [{ ...equipmentRows[0], availableQuantity: 3 }], isLoading: false });
    mocks.categoriesUseQuery.mockReturnValue({ data: [] });

    render(<EquipmentBrowse />);

    await user.click(screen.getByRole("button", { name: "申請借用" }));

    const quantitySelect = screen.getByRole("combobox", { name: "借用數量" });
    expect(quantitySelect).toBeRequired();
    expect(within(quantitySelect).getAllByRole("option").map((option) => option.getAttribute("value"))).toEqual(["1", "2", "3"]);
    expect(screen.getByRole("textbox", { name: "借用用途 *" })).toBeRequired();
    expect(screen.getByRole("textbox", { name: "借用用途 *" })).toHaveAttribute("placeholder", "請說明借用用途");
  });

  it("借用申請未填日期或用途時會顯示紅框，重開表單後不保留紅字", async () => {
    const user = userEvent.setup();
    mocks.listUseQuery.mockReturnValue({ data: [{ ...equipmentRows[0], availableQuantity: 3 }], isLoading: false });
    mocks.categoriesUseQuery.mockReturnValue({ data: [] });

    render(<EquipmentBrowse />);
    await user.click(screen.getByRole("button", { name: "申請借用" }));
    await user.click(screen.getByRole("button", { name: "提交申請" }));

    expect(screen.getByLabelText("借用日期")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("歸還日期")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("借用用途 *")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getAllByRole("alert")).not.toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "取消" }));
    await user.click(screen.getByRole("button", { name: "申請借用" }));
    expect(screen.getByLabelText("借用日期")).toHaveAttribute("aria-invalid", "false");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
