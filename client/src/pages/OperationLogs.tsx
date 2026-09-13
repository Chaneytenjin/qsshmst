import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { trpc } from "@/lib/trpc";
import { formatAuditActor } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
import { AuditPinDialog } from "@/components/AuditPinDialog";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { Search, RefreshCw } from "lucide-react";

const PAGE_SIZE = 20;

const operationTypeLabels: Record<string, string> = {
  create: "新增",
  update: "修改",
  delete: "刪除",
  activate: "啟用",
  deactivate: "停用",
  approve: "核准",
  reject: "拒絕",
  cancel: "取消",
  return: "歸還",
  resetPassword: "重置密碼",
};

const resourceTypeLabels: Record<string, string> = {
  equipment: "器材",
  user: "帳號",
  borrowRequest: "借用申請",
  borrowRecord: "借用記錄",
};

const getOperationColor = (type: string) => {
  switch (type) {
    case "create":
      return "bg-green-100 text-green-800";
    case "delete":
      return "bg-red-100 text-red-800";
    case "update":
      return "bg-blue-100 text-blue-800";
    case "approve":
      return "bg-emerald-100 text-emerald-800";
    case "reject":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export default function OperationLogs() {
  const { user } = useAuth();
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [operationTypeFilter, setOperationTypeFilter] = useState<string>("");
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>("");

  const verifyPinMutation = trpc.auditPin.verify.useMutation();

  const { data: logsData, isLoading, refetch } = trpc.operationLogs.list.useQuery(
    {
      username: searchText || undefined,
      action: operationTypeFilter || undefined,
      entityType: resourceTypeFilter || undefined,
      page: currentPage,
      pageSize: PAGE_SIZE,
    },
    {
      enabled: pinVerified,
    }
  );

  // 檢查權限：只有創始管理員可以查看
  if (!user?.isFounder) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-red-600">
              您沒有權限訪問此頁面只有創始管理員可以查看操作日誌
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 如果未驗證 PIN 碼，顯示驗證對話框
  if (!pinVerified) {
    return (
      <>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>PIN 碼驗證</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                需要驗證 PIN 碼才能查看操作日誌
              </p>
              <Button
                onClick={() => setPinDialogOpen(true)}
                className="w-full"
              >
                驗證 PIN 碼
              </Button>
            </CardContent>
          </Card>
        </div>
        <AuditPinDialog
          open={pinDialogOpen}
          onOpenChange={setPinDialogOpen}
          onSuccess={() => {
            setPinVerified(true);
            setPinDialogOpen(false);
          }}
          onVerify={async (pin) => {
            await verifyPinMutation.mutateAsync({ pin });
          }}
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">操作日誌</h1>
          <p className="text-gray-600 mt-2">查看系統中所有使用者的操作記錄</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>篩選和搜尋</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">帳號名稱</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="搜尋帳號..."
                    value={searchText}
                    onChange={(e) => {
                      setSearchText(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">操作類型</label>
                <Select
                  value={operationTypeFilter}
                  onValueChange={(value) => {
                    setOperationTypeFilter(value === "all" ? "" : value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="全部" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="create">新增</SelectItem>
                    <SelectItem value="update">修改</SelectItem>
                    <SelectItem value="delete">刪除</SelectItem>
                    <SelectItem value="approve">核准</SelectItem>
                    <SelectItem value="reject">拒絕</SelectItem>
                    <SelectItem value="return">歸還</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">資源類型</label>
                <Select
                  value={resourceTypeFilter}
                  onValueChange={(value) => {
                    setResourceTypeFilter(value === "all" ? "" : value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="全部" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="equipment">器材</SelectItem>
                    <SelectItem value="user">帳號</SelectItem>
                    <SelectItem value="borrowRequest">借用申請</SelectItem>
                    <SelectItem value="borrowRecord">借用記錄</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  onClick={() => refetch()}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  重新整理
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              操作日誌 ({logsData?.total || 0} 筆)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-600">載入中...</p>
                </div>
              </div>
            ) : logsData?.logs && logsData.logs.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>時間</TableHead>
                        <TableHead>姓名（登入帳號）</TableHead>
                        <TableHead>操作</TableHead>
                        <TableHead>資源類型</TableHead>
                        <TableHead>資源名稱</TableHead>
                        <TableHead>IP 地址</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logsData.logs.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss", {
                              locale: zhTW,
                            })}
                          </TableCell>
                          <TableCell className="font-medium">{formatAuditActor(log)}</TableCell>
                          <TableCell>
                            <Badge className={getOperationColor(log.action)}>
                              {operationTypeLabels[log.action] || log.action}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {resourceTypeLabels[log.entityType] || log.entityType}
                          </TableCell>
                          <TableCell className="text-sm">{log.entityName || "-"}</TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {log.ipAddress || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {logsData.totalPages > 1 && (
                  <div className="mt-4 flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() =>
                              currentPage > 1 && setCurrentPage((p) => Math.max(1, p - 1))
                            }
                          />
                        </PaginationItem>

                        {Array.from({ length: logsData.totalPages }, (_, i) => i + 1).map(
                          (page) => (
                            <PaginationItem key={page}>
                              <PaginationLink
                                onClick={() => setCurrentPage(page)}
                                isActive={currentPage === page}
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          )
                        )}

                        <PaginationItem>
                          <PaginationNext
                            onClick={() =>
                              currentPage < logsData.totalPages && setCurrentPage((p) =>
                                Math.min(logsData.totalPages, p + 1)
                              )
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">沒有找到操作日誌</p>
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
