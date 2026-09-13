import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAuditActor(actor: {
  displayName?: string | null;
  realName?: string | null;
  name?: string | null;
  username?: string | null;
}): string {
  const displayName = actor.displayName?.trim() || actor.realName?.trim() || actor.name?.trim();
  const username = actor.username?.trim();
  if (displayName && username && displayName !== username) return `${displayName}（${username}）`;
  return displayName || username || "未知人員";
}
