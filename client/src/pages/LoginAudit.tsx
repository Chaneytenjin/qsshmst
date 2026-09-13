import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { formatAuditActor } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function LoginAudit() {
  const { data: authData } = trpc.auth.me.useQuery();
  const [page, setPage] = useState(1);
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<"success" | "failed" | "all">("all");
  const [, setLocation] = useLocation();
  const isInitialMount = useRef(true);

  // 檢查是否是創始管理員
  const isFounder = authData?.isFounder === true;

  // 在頁面重整後檢查 PIN 驗證狀態（只在非首次掛載時檢查）
  useEffect(() => {
    // 首次掛載時不檢查，允許正常顯示頁面
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (isFounder === false) {
      // 不是創始管理員，顯示無權限頁面
      return;
    }

    // 檢查 PIN 驗證 Cookie
    const cookies = document.cookie;
    const auditPinVerifiedAtMatch = cookies.match(/auditPinVerifiedAt=(\d+)/);
    
    if (!auditPinVerifiedAtMatch) {
      // 沒有 PIN 驗證 Cookie，重定向回儀表板
      setLocation("/");
      return;
    }

    const auditPinVerifiedAt = parseInt(auditPinVerifiedAtMatch[1], 10);
    const now = Date.now();
    const expiryTime = 5 * 1000; // 5 秒過期

    if (now - auditPinVerifiedAt >= expiryTime) {
      // PIN 驗證已過期，重定向回儀表板
      setLocation("/");
    }
  }, [isFounder, setLocation]);

  // 監聽頁面可見性變化，在用戶返回標籤頁時檢查 PIN 驗證
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isFounder === true) {
        // 用戶返回標籤頁，檢查 PIN 驗證狀態
        const cookies = document.cookie;
        const auditPinVerifiedAtMatch = cookies.match(/auditPinVerifiedAt=(\d+)/);
        
        if (!auditPinVerifiedAtMatch) {
          setLocation("/");
          return;
        }

        const auditPinVerifiedAt = parseInt(auditPinVerifiedAtMatch[1], 10);
        const now = Date.now();
        const expiryTime = 5 * 1000; // 5 秒過期

        if (now - auditPinVerifiedAt >= expiryTime) {
          setLocation("/");
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isFounder, setLocation]);

  const { data, isLoading, error } = trpc.loginAudit.list.useQuery(
    {
      page,
      pageSize: 50,
      username: username || undefined,
      status: status !== "all" ? (status as "success" | "failed") : undefined,
    },
    {
      enabled: isFounder === true, // 只在是創始管理員時才查詢
    }
  );

  const formatTime = (date: any) => {
    if (!date) return "-";
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      hourCycle: "h23",
    });
  };

  // 如果不是創始管理員或驗證狀態不確定，顯示權限不足頁面
  if (isFounder === false) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight mb-2">登入稽核日誌</h1>
          <p className="text-gray-600">監控系統登入活動，追蹤異常行為</p>
        </div>
        <Card className="p-6 border-2 border-red-500 bg-red-50">
          <div className="flex items-center gap-3">
            <XCircle className="w-6 h-6 text-red-600" />
            <div>
              <p className="font-bold text-red-600">無權限訪問</p>
              <p className="text-sm text-red-500">登入稽核日誌僅限創始管理員查看</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-black tracking-tight mb-2">登入稽核日誌</h1>
        <p className="text-gray-600">監控系統登入活動，追蹤異常行為</p>
      </div>

      <Card className="p-6 border-2 border-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold mb-2">帳號搜尋</label>
            <Input
              placeholder="輸入帳號名稱"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setPage(1);
              }}
              className="border-2 border-gray-800"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">登入狀態</label>
            <Select
              value={status}
              onValueChange={(val) => {
                setStatus((val as "success" | "failed" | "all"));
                setPage(1);
              }}
            >
              <SelectTrigger className="border-2 border-gray-800">
                <SelectValue placeholder="全部狀態" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部狀態</SelectItem>
                <SelectItem value="success">成功</SelectItem>
                <SelectItem value="failed">失敗</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={() => {
                setUsername("");
                setStatus("all");
                setPage(1);
              }}
              variant="outline"
              className="w-full border-2 border-gray-800"
            >
              重置篩選
            </Button>
          </div>
        </div>
      </Card>

      {error && (
        <Card className="border-2 border-red-500 bg-red-50">
          <div className="p-4 text-red-700 font-bold">錯誤：{error.message}</div>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-800" />
        </div>
      ) : !data ? (
        <Card className="border-2 border-gray-800 p-8 text-center text-gray-500">
          無法載入登入日誌
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden border-2 border-gray-800">
            <Table>
              <TableHeader className="bg-gray-900 text-white">
                <TableRow>
                  <TableHead className="font-black">姓名（登入帳號）</TableHead>
                  <TableHead className="font-black">狀態</TableHead>
                  <TableHead className="font-black">失敗原因</TableHead>
                  <TableHead className="font-black">IP 位址</TableHead>
                  <TableHead className="font-black">登入時間</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.logs && data.logs.length > 0 ? (
                  data.logs.map((log: any) => (
                    <TableRow key={log.id} className="border-b-2 border-gray-200 hover:bg-gray-50">
                      <TableCell className="font-bold">{formatAuditActor(log)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {log.status === "success" ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-green-600 font-bold">成功</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 text-red-600" />
                              <span className="text-red-600 font-bold">失敗</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{log.failureReason || "-"}</TableCell>
                      <TableCell className="font-mono text-sm">{log.ipAddress || "-"}</TableCell>
                      <TableCell className="text-sm">{formatTime(log.loginAt)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      無登入記錄
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {data && (
              <div className="flex items-center justify-between p-4 border-t-2 border-gray-200">
                <div className="text-sm text-gray-600">
                  共 <span className="font-bold">{data.total}</span> 筆記錄 | 第 <span className="font-bold">{data.page}</span> 頁
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    variant="outline"
                    className="border-2 border-gray-800"
                  >
                    上一頁
                  </Button>
                  <Button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= data.totalPages}
                    variant="outline"
                    className="border-2 border-gray-800"
                  >
                    下一頁
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
