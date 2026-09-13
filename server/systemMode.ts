import type { SystemMaintenanceSettings } from "../drizzle/schema";

export type EffectiveSystemMode = "online" | "maintenance" | "offline";

export function resolveSystemMode(settings: SystemMaintenanceSettings | null, now = new Date()): {
  systemMode: EffectiveSystemMode;
  scheduledMode: "maintenance" | "offline" | null;
  scheduledFor: Date | null;
  isScheduled: boolean;
  isRestricted: boolean;
  maintenanceMode: boolean;
  announcement: string | null;
  estimatedRestoredAt: Date | null;
} {
  const scheduledMode = settings?.scheduledMode ?? null;
  const scheduledFor = settings?.scheduledFor ?? null;
  const scheduleIsDue = Boolean(scheduledMode && scheduledFor && scheduledFor.getTime() <= now.getTime());
  const configuredMode = settings?.systemMode ?? (settings?.maintenanceMode ? "maintenance" : "online");
  const systemMode: EffectiveSystemMode = scheduleIsDue ? scheduledMode! : configuredMode;

  return {
    systemMode,
    scheduledMode: scheduleIsDue ? null : scheduledMode,
    scheduledFor: scheduleIsDue ? null : scheduledFor,
    isScheduled: Boolean(scheduledMode && scheduledFor && !scheduleIsDue),
    isRestricted: systemMode !== "online",
    maintenanceMode: systemMode === "maintenance",
    announcement: settings?.announcement?.trim() || null,
    estimatedRestoredAt: settings?.estimatedRestoredAt ?? null,
  };
}
