"use client";

import { type ReactNode, useEffect, useState } from "react";
import { Nav } from "./Nav";
import { applyAppTheme, applyPlatformColor, isPlatformColor } from "@/lib/theme";

export function Layout({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((settings: { platform_color?: unknown; theme?: unknown }) => {
        if (cancelled) return;
        if (isPlatformColor(settings.platform_color)) {
          applyPlatformColor(settings.platform_color);
        }
        applyAppTheme(
          settings.theme === "light" || settings.theme === "dark"
            ? settings.theme
            : "system"
        );
      })
      .catch(() => {
        // Keep default accent color when settings cannot be loaded.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Nav
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <div className="min-w-0 flex-1 flex flex-col">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="md:hidden fixed top-3 left-3 z-40 flex items-center justify-center w-10 h-10 rounded-lg bg-(--card) border border-(--card-border) text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <main className="min-w-0 flex-1 overflow-auto p-4 pl-14 sm:pl-6 sm:p-6 md:pl-6">{children}</main>
      </div>
    </div>
  );
}
