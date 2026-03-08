/** Locale: comma as decimal separator, dot as thousands separator (e.g. 1.234,56). */
const NUMBER_LOCALE = "de-DE";

/**
 * Format numbers for display. Inputs are decimal strings.
 */
export function formatCurrency(
  value: string,
  currency: string = "CHF",
  decimals: number = 2,
): string {
  const num = parseFloat(value);
  if (Number.isNaN(num)) return "—";
  return new Intl.NumberFormat(NUMBER_LOCALE, {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatPercent(value: string, decimals: number = 2): string {
  const num = parseFloat(value);
  if (Number.isNaN(num)) return "—";
  const formatted = num.toFixed(decimals).replace(".", ",");
  return `${num >= 0 ? "+" : ""}${formatted}%`;
}

export function formatNumber(value: string, decimals: number = 4): string {
  const num = parseFloat(value);
  if (Number.isNaN(num)) return "—";
  return new Intl.NumberFormat(NUMBER_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(num);
}

/** Parse European number string (e.g. "1.234,56" or "0,5") to number. */
export function parseEuropeanNumber(str: string): number {
  if (str.trim() === "") return NaN;
  const normalized = str.trim().replace(/\./g, "").replace(",", ".");
  return parseFloat(normalized);
}

/** Format a dot-decimal string for display in inputs (comma decimal, dot thousands). */
export function formatNumberForInput(
  value: string,
  maxDecimals: number = 8,
): string {
  const num = parseFloat(value);
  if (Number.isNaN(num)) return "";
  return new Intl.NumberFormat(NUMBER_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(num);
}

/** Convert European input string to dot-decimal string for storage. */
export function europeanToDecimalString(str: string): string {
  const num = parseEuropeanNumber(str);
  if (Number.isNaN(num)) return "";
  return String(num);
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/** Format ISO date to dd/mm/yyyy (local date). */
export function formatDateForInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/** Format ISO date to HH:mm (local time). */
export function formatTimeForInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}

/** Parse "dd/mm/yyyy" and "HH:mm" (local) to ISO string. */
export function parseDateAndTimeToISO(
  dateStr: string,
  timeStr: string,
): string {
  const [d, m, y] = dateStr
    .trim()
    .split(/[/.-]/)
    .map((x) => parseInt(x, 10));
  const [hr, min] = timeStr
    .trim()
    .split(":")
    .map((x) => parseInt(x, 10) || 0);
  if (
    !Number.isFinite(d) ||
    !Number.isFinite(m) ||
    !Number.isFinite(y) ||
    !Number.isFinite(hr) ||
    !Number.isFinite(min)
  ) {
    return "";
  }
  const date = new Date(y, m - 1, d, hr, min, 0, 0);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}
