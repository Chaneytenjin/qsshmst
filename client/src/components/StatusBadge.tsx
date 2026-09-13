import React from "react";

const STATUS_LABELS: Record<string, string> = {
  pending: "待審核",
  approved: "已核准",
  rejected: "已拒絕",
  cancelled: "已取消",
  active: "借出中",
  returned: "已歸還",
  overdue: "逾期未還",
  overdue_returned: "逾期歸還",
  available: "可借用",
  maintenance: "維修中",
  retired: "已報廢",
  admin: "管理員",
  teacher: "教師",
  student: "學生",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-${status} ${className}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function RoleBadge({ role, className = "" }: { role: string; className?: string }) {
  const colors: Record<string, string> = {
    admin: "text-white border-white/40",
    teacher: "text-[oklch(0.75_0.12_85)] border-[oklch(0.75_0.12_85)]",
    student: "text-[oklch(0.65_0.15_220)] border-[oklch(0.65_0.15_220)]",
  };
  const labels: Record<string, string> = { admin: "管理員", teacher: "教師", student: "學生" };
  return (
    <span
      className={`role-badge role-badge--${role} inline-flex items-center px-2 py-0.5 text-[0.65rem] font-semibold tracking-widest uppercase border ${colors[role] ?? "text-gray-400 border-gray-400"} ${className}`}
    >
      {labels[role] ?? role}
    </span>
  );
}
