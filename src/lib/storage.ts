import { promises as fs } from "fs";
import path from "path";
import type { Transaction } from "@/types";
import type { Settings } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const TRANSACTIONS_FILE = path.join(DATA_DIR, "transactions.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const PRICES_FILE = path.join(DATA_DIR, "prices.json");
const EXCHANGE_RATES_FILE = path.join(DATA_DIR, "exchange-rates.json");

export type PricesMap = Record<string, string>;
export type PriceCurrency = "CHF" | "USD";
export interface ExchangeRatesMap {
  "CHF/USD": string;
  "USD/CHF": string;
}
export interface PriceEntry {
  value: string;
  currency: PriceCurrency;
}
export type PricesWithCurrencyMap = Record<string, PriceEntry>;

const DEFAULT_SETTINGS: Settings = {
  default_currency: "CHF",
  cost_basis_method: "fifo",
  wallets: [],
  exchanges: [],
  theme: "dark",
  platform_color: "green",
};

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function writeFileAtomic(filePath: string, payload: string): Promise<void> {
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tempPath, payload, "utf-8");
  await fs.rename(tempPath, filePath);
}

export async function readTransactions(): Promise<Transaction[]> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(TRANSACTIONS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as Transaction[];
  } catch (err) {
    const code = err instanceof Error && "code" in err ? (err as NodeJS.ErrnoException).code : null;
    if (code === "ENOENT") return [];
    throw err;
  }
}

export async function writeTransactions(transactions: Transaction[]): Promise<void> {
  await ensureDataDir();
  await writeFileAtomic(TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2));
}

export async function readSettings(): Promise<Settings> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(SETTINGS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return { ...DEFAULT_SETTINGS, ...parsed } as Settings;
  } catch (err) {
    const code = err instanceof Error && "code" in err ? (err as NodeJS.ErrnoException).code : null;
    if (code === "ENOENT") return DEFAULT_SETTINGS;
    throw err;
  }
}

export async function writeSettings(settings: Settings): Promise<void> {
  await ensureDataDir();
  await writeFileAtomic(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

export async function readPrices(): Promise<PricesMap> {
  const withCurrency = await readPricesWithCurrency();
  const out: PricesMap = {};
  for (const [symbol, entry] of Object.entries(withCurrency)) {
    out[symbol] = entry.value;
  }
  return out;
}

export async function readPricesWithCurrency(): Promise<PricesWithCurrencyMap> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(PRICES_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};
    const out: PricesWithCurrencyMap = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (k === "updated_at") continue;
      if (typeof v === "string" && v.trim() !== "") {
        out[k] = { value: v.trim(), currency: "CHF" };
      } else if (typeof v === "number" && !Number.isNaN(v)) {
        out[k] = { value: String(v), currency: "CHF" };
      } else if (v && typeof v === "object") {
        const value = (v as { value?: unknown }).value;
        const currency = (v as { currency?: unknown }).currency;
        if (
          (typeof value === "string" && value.trim() !== "") ||
          (typeof value === "number" && !Number.isNaN(value))
        ) {
          out[k] = {
            value: typeof value === "string" ? value.trim() : String(value),
            currency: currency === "USD" ? "USD" : "CHF",
          };
        }
      }
    }
    return out;
  } catch (err) {
    const code = err instanceof Error && "code" in err ? (err as NodeJS.ErrnoException).code : null;
    if (code === "ENOENT") return {};
    throw err;
  }
}

export async function writePrices(prices: PricesMap): Promise<void> {
  const normalized: PricesWithCurrencyMap = {};
  for (const [symbol, value] of Object.entries(prices)) {
    normalized[symbol] = { value, currency: "CHF" };
  }
  await writePricesWithCurrency(normalized);
}

export async function writePricesWithCurrency(
  prices: PricesWithCurrencyMap
): Promise<void> {
  await ensureDataDir();
  const payload = {
    ...prices,
    updated_at: new Date().toISOString(),
  };
  await writeFileAtomic(PRICES_FILE, JSON.stringify(payload, null, 2));
}

export async function readExchangeRates(): Promise<ExchangeRatesMap> {
  await ensureDataDir();
  const defaults: ExchangeRatesMap = {
    "CHF/USD": "0.78",
    "USD/CHF": "1.28205128",
  };
  try {
    const raw = await fs.readFile(EXCHANGE_RATES_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const chfUsd = parsed["CHF/USD"];
    const usdChf = parsed["USD/CHF"];
    const validChfUsd =
      (typeof chfUsd === "string" && chfUsd.trim() !== "") ||
      (typeof chfUsd === "number" && !Number.isNaN(chfUsd));
    const validUsdChf =
      (typeof usdChf === "string" && usdChf.trim() !== "") ||
      (typeof usdChf === "number" && !Number.isNaN(usdChf));
    return {
      "CHF/USD": validChfUsd
        ? String(chfUsd).trim()
        : defaults["CHF/USD"],
      "USD/CHF": validUsdChf
        ? String(usdChf).trim()
        : defaults["USD/CHF"],
    };
  } catch (err) {
    const code = err instanceof Error && "code" in err ? (err as NodeJS.ErrnoException).code : null;
    if (code === "ENOENT") return defaults;
    throw err;
  }
}

export async function writeExchangeRates(
  rates: ExchangeRatesMap
): Promise<void> {
  await ensureDataDir();
  const payload = {
    ...rates,
    updated_at: new Date().toISOString(),
    source: "manual",
  };
  await writeFileAtomic(EXCHANGE_RATES_FILE, JSON.stringify(payload, null, 2));
}

export async function exportBackup(): Promise<{ transactions: Transaction[]; settings: Settings }> {
  const [transactions, settings] = await Promise.all([
    readTransactions(),
    readSettings(),
  ]);
  return { transactions, settings };
}

export function getDataDir(): string {
  return DATA_DIR;
}
