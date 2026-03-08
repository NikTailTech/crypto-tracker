export const PLATFORM_COLORS = [
  "gray",
  "yellow",
  "orange",
  "red",
  "pink",
  "purple",
  "green",
  "dark_green",
  "teal",
  "cyan",
  "azure",
  "blue",
] as const;

export type PlatformColor = (typeof PLATFORM_COLORS)[number];

export interface PlatformColorPalette {
  accent: string;
  accentHover: string;
  accentSoft: string;
  accentRing: string;
}

export const PLATFORM_COLOR_PALETTES: Record<PlatformColor, PlatformColorPalette> = {
  gray: {
    accent: "#9ca3af",
    accentHover: "#6b7280",
    accentSoft: "rgba(156, 163, 175, 0.2)",
    accentRing: "rgba(156, 163, 175, 0.4)",
  },
  yellow: {
    accent: "#eab308",
    accentHover: "#ca8a04",
    accentSoft: "rgba(234, 179, 8, 0.2)",
    accentRing: "rgba(234, 179, 8, 0.4)",
  },
  orange: {
    accent: "#f97316",
    accentHover: "#ea580c",
    accentSoft: "rgba(249, 115, 22, 0.2)",
    accentRing: "rgba(249, 115, 22, 0.4)",
  },
  red: {
    accent: "#ef4444",
    accentHover: "#dc2626",
    accentSoft: "rgba(239, 68, 68, 0.2)",
    accentRing: "rgba(239, 68, 68, 0.4)",
  },
  pink: {
    accent: "#ec4899",
    accentHover: "#db2777",
    accentSoft: "rgba(236, 72, 153, 0.2)",
    accentRing: "rgba(236, 72, 153, 0.4)",
  },
  purple: {
    accent: "#a855f7",
    accentHover: "#9333ea",
    accentSoft: "rgba(168, 85, 247, 0.2)",
    accentRing: "rgba(168, 85, 247, 0.4)",
  },
  green: {
    accent: "#22c55e",
    accentHover: "#16a34a",
    accentSoft: "rgba(34, 197, 94, 0.2)",
    accentRing: "rgba(34, 197, 94, 0.4)",
  },
  dark_green: {
    accent: "#15803d",
    accentHover: "#166534",
    accentSoft: "rgba(21, 128, 61, 0.2)",
    accentRing: "rgba(21, 128, 61, 0.4)",
  },
  teal: {
    accent: "#14b8a6",
    accentHover: "#0f766e",
    accentSoft: "rgba(20, 184, 166, 0.2)",
    accentRing: "rgba(20, 184, 166, 0.4)",
  },
  cyan: {
    accent: "#06b6d4",
    accentHover: "#0891b2",
    accentSoft: "rgba(6, 182, 212, 0.2)",
    accentRing: "rgba(6, 182, 212, 0.4)",
  },
  azure: {
    accent: "#0ea5e9",
    accentHover: "#0284c7",
    accentSoft: "rgba(14, 165, 233, 0.2)",
    accentRing: "rgba(14, 165, 233, 0.4)",
  },
  blue: {
    accent: "#3b82f6",
    accentHover: "#2563eb",
    accentSoft: "rgba(59, 130, 246, 0.2)",
    accentRing: "rgba(59, 130, 246, 0.4)",
  },
};

export const DEFAULT_PLATFORM_COLOR: PlatformColor = "green";

export function isPlatformColor(value: unknown): value is PlatformColor {
  return (
    typeof value === "string" &&
    PLATFORM_COLORS.includes(value as PlatformColor)
  );
}

export function applyPlatformColor(color: PlatformColor): void {
  if (typeof document === "undefined") return;
  const palette = PLATFORM_COLOR_PALETTES[color] ?? PLATFORM_COLOR_PALETTES.green;
  const root = document.documentElement;
  root.style.setProperty("--accent", palette.accent);
  root.style.setProperty("--accent-hover", palette.accentHover);
  root.style.setProperty("--accent-soft", palette.accentSoft);
  root.style.setProperty("--accent-ring", palette.accentRing);
}

export type AppTheme = "light" | "dark" | "system";

let systemThemeListenerCleanup: (() => void) | null = null;

function setThemeClass(isDark: boolean): void {
  const root = document.documentElement;
  root.classList.remove("theme-light", "theme-dark");
  root.classList.add(isDark ? "theme-dark" : "theme-light");
}

export function applyAppTheme(theme: AppTheme): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  if (systemThemeListenerCleanup) {
    systemThemeListenerCleanup();
    systemThemeListenerCleanup = null;
  }

  const media = window.matchMedia("(prefers-color-scheme: dark)");

  if (theme === "system") {
    const applyFromSystem = () => setThemeClass(media.matches);
    applyFromSystem();
    const listener = () => applyFromSystem();
    media.addEventListener("change", listener);
    systemThemeListenerCleanup = () => media.removeEventListener("change", listener);
    return;
  }

  setThemeClass(theme === "dark");
}
