import React, { type HTMLAttributes } from "react";

export const BRAND_LOGO_ALT = "清水高中媒體服務隊管理系統圓形識別標誌";

type BrandLogoProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  alt?: string;
};

/**
 * 依第六屆媒服識別構圖建立的純向量品牌標誌
 * 不載入圖片、外部資產或備援照片，任何尺寸下皆由 SVG 直接繪製
 */
export function BrandLogo({ alt = BRAND_LOGO_ALT, className, "aria-hidden": ariaHidden, "aria-label": ariaLabel, ...props }: BrandLogoProps) {
  const isDecorative = ariaHidden === true || ariaHidden === "true";

  return (
    <span
      {...props}
      role={isDecorative ? undefined : "img"}
      aria-hidden={isDecorative || undefined}
      aria-label={isDecorative ? undefined : (ariaLabel ?? alt)}
      data-brand-logo-vector="true"
      data-brand-logo-loaded="true"
      className={`brand-logo-vector inline-grid aspect-square shrink-0 place-items-center overflow-hidden rounded-full ${className ?? ""}`}
    >
      <svg viewBox="0 0 240 240" className="h-full w-full" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
        <circle cx="120" cy="120" r="119" fill="#1bacc4" />
        <circle cx="120" cy="120" r="114" fill="none" stroke="#fffdf4" strokeOpacity="0.86" strokeWidth="2.4" />

        <g fill="none" stroke="#fffdf4" strokeLinecap="square" strokeWidth="3.2">
          <path d="M28 76V58h18" />
          <path d="M194 58h18v18" />
          <path d="M28 164v18h18" />
          <path d="M194 182h18v-18" />
        </g>

        <g data-brand-logo-text-layout="spaced" fontFamily="Noto Sans TC, Microsoft JhengHei, PingFang TC, sans-serif" fontWeight="900" fill="#fffdf4" textAnchor="middle">
          <text x="120" y="104" fontSize="57" letterSpacing="-1">清水</text>
          <text x="120" y="140" fontSize="23" letterSpacing="0.8">媒體服務隊</text>
          <text x="120" y="168" fontSize="19" letterSpacing="0.4">第6屆</text>
        </g>

        <g aria-hidden="true">
          <circle cx="48" cy="69" r="3.4" fill="#df403b" />
          <text x="56" y="72" fill="#fffdf4" fontFamily="Space Mono, monospace" fontSize="7" fontWeight="700" letterSpacing="1">REC</text>
          <rect x="184" y="63" width="20" height="10" rx="1.2" fill="none" stroke="#fffdf4" strokeWidth="1.8" />
          <path d="M205.7 66v4" stroke="#fffdf4" strokeWidth="1.8" />
          <path d="M187 65.3h3.3v5.4H187zm4.6 0h3.3v5.4h-3.3zm4.6 0h3.3v5.4h-3.3z" fill="#fffdf4" />
          <path d="M66 182h36m37 0h35" stroke="#fffdf4" strokeWidth="1.9" />
          <path d="m108 182 4.2 2.4-4.2 2.4-4.2-2.4zM132 182l4.2 2.4-4.2 2.4-4.2-2.4z" fill="#fffdf4" />
        </g>
      </svg>
    </span>
  );
}
