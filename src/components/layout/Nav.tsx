"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/prices", label: "Prices" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
];

interface NavProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Nav({ mobileOpen = false, onMobileClose }: NavProps) {
  const pathname = usePathname();

  const navContent = (
    <>
      <div className="flex items-center justify-between gap-2 mb-4">
        <Link
          href="/dashboard"
          className="text-lg font-bold text-(--accent)"
          onClick={onMobileClose}
        >
          Crypto Tracker
        </Link>
        {onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors shrink-0"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          onClick={onMobileClose}
          className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            pathname === href
              ? "bg-(--accent-soft) text-(--accent)"
              : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          }`}
        >
          {label}
        </Link>
      ))}
    </>
  );

  return (
    <>
      {/* Desktop: always-visible sidebar */}
      <nav className="hidden md:flex md:flex-col gap-1 border-r border-(--card-border) bg-(--card) p-4 min-w-[200px]">
        {navContent}
      </nav>
      {/* Mobile: overlay drawer with close button */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div
            className="absolute inset-0 bg-zinc-950/50"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <nav className="absolute top-0 left-0 bottom-0 w-[min(280px,85vw)] flex flex-col gap-1 border-r border-(--card-border) bg-(--card) shadow-xl p-4">
            {navContent}
          </nav>
        </div>
      )}
    </>
  );
}
