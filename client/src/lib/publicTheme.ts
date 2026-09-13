export type DeviceTheme = "light" | "dark";

export function getDeviceTheme(prefersDark: boolean): DeviceTheme {
  return prefersDark ? "dark" : "light";
}

export function applyDocumentTheme(root: Pick<HTMLElement, "classList" | "dataset">, theme: DeviceTheme) {
  root.classList.toggle("dark", theme === "dark");
  root.dataset.appliedTheme = theme;
}
