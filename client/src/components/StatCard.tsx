import React from "react";
import { LucideIcon } from "lucide-react";
import { Link } from "wouter";

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  accentColor?: string;
  description?: string;
  className?: string;
  href?: string;
}

export function StatCard({ label, value, icon: Icon, accentColor = "oklch(0.40 0 0)", description, className = "", href }: StatCardProps) {
  const content = (
    <>
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: accentColor }}
      />
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="label-caps mb-3">{label}</p>
          <p className="display-number">{value}</p>
          {description && (
            <p className="mt-2 text-xs text-[oklch(0.45_0_0)] tracking-wide">{description}</p>
          )}
        </div>
        {Icon && (
          <div className="stat-card-icon ml-4 p-2.5 border">
            <Icon size={20} strokeWidth={1.5} />
          </div>
        )}
      </div>
    </>
  );

  const classNames = `stat-card tech-stat-card animate-fade-in ${href ? "tech-stat-card-link" : ""} ${className}`;
  const style = { "--accent": accentColor } as React.CSSProperties;

  if (href) {
    return <Link href={href} className={classNames} style={style} aria-label={`查看${label}詳情`}>{content}</Link>;
  }

  return <div className={classNames} style={style}>{content}</div>;
}
