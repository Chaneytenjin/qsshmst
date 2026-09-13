import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";

interface AuditPinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onVerify: (pin: string) => Promise<void>;
}

export function AuditPinDialog({
  open,
  onOpenChange,
  onSuccess,
  onVerify,
}: AuditPinDialogProps) {
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [lockTimeRemaining, setLockTimeRemaining] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setRemainingAttempts(null);
    setLockTimeRemaining(null);

    if (pin.length !== 6) {
      setError("PIN 碼必須為 6 位數");
      return;
    }

    if (!/^\d+$/.test(pin)) {
      setError("PIN 碼只能包含數字");
      return;
    }

    try {
      setIsLoading(true);
      await onVerify(pin);
      toast.success("稽核認證 PIN 驗證成功");
      setPin("");
      setRemainingAttempts(null);
      setLockTimeRemaining(null);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      const errorMessage = err.message || "PIN 碼驗證失敗";
      setError(errorMessage);
      toast.error(errorMessage);

      // 解析錯誤訊息以提取剩餘嘗試次數或鎖定時間
      if (errorMessage.includes("還有")) {
        // 格式: "PIN 碼不正確，還有 X 次嘗試機會"
        const match = errorMessage.match(/還有\s*(\d+)\s*次/);
        if (match) {
          setRemainingAttempts(parseInt(match[1], 10));
        }
      } else if (errorMessage.includes("已鎖定")) {
        // 格式: "PIN 碼已鎖定，請在 X 秒後重試"
        const match = errorMessage.match(/在\s*(\d+)\s*秒/);
        if (match) {
          setLockTimeRemaining(parseInt(match[1], 10));
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPin("");
    setError("");
    setRemainingAttempts(null);
    setLockTimeRemaining(null);
    onOpenChange(false);
  };

  const isLocked = lockTimeRemaining !== null && lockTimeRemaining > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock size={20} className="text-[oklch(0.70_0.15_40)]" />
            稽核認證 PIN 驗證
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">請輸入 6 位數稽核認證 PIN</label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={pin}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                setPin(value);
                setError("");
              }}
              className="text-center text-lg tracking-widest font-mono"
              disabled={isLoading || isLocked}
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-[oklch(0.25_0.20_25)] border border-[oklch(0.70_0.20_25)] rounded">
              <AlertCircle size={16} className="text-[oklch(0.70_0.20_25)] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-[oklch(0.70_0.20_25)]">{error}</p>
                {remainingAttempts !== null && remainingAttempts > 0 && (
                  <p className="text-xs text-[oklch(0.65_0.15_25)] mt-1">
                    ⚠️ 剩餘嘗試次數：{remainingAttempts}
                  </p>
                )}
              </div>
            </div>
          )}

          {isLocked && lockTimeRemaining !== null && (
            <div className="flex items-center gap-2 p-3 bg-[oklch(0.20_0.15_25)] border border-[oklch(0.60_0.15_25)] rounded">
              <Clock size={16} className="text-[oklch(0.60_0.15_25)] flex-shrink-0" />
              <p className="text-sm text-[oklch(0.60_0.15_25)]">
                帳號已鎖定，請在 {lockTimeRemaining} 秒後重試
              </p>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={isLoading || pin.length !== 6 || isLocked}
              className="bg-[oklch(0.70_0.15_40)] hover:bg-[oklch(0.75_0.15_40)]"
            >
              {isLoading ? "驗證中..." : "驗證"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
