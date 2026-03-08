import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
}

export function Card({ children, className = "", title }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-(--card-border) bg-(--card) shadow-lg ${className}`}
    >
      {title && (
        <h3 className="border-b border-(--card-border) px-3 py-2 text-sm font-semibold text-foreground sm:px-4 sm:py-3">
          {title}
        </h3>
      )}
      <div className="p-3 sm:p-4">{children}</div>
    </div>
  );
}
