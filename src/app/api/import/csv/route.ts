import { NextResponse } from "next/server";
import { readTransactions, writeTransactions } from "@/lib/storage";
import { validateTransaction } from "@/lib/schemas";
import type { Transaction, TransactionType } from "@/types";
import { d, toDecimalString } from "@/lib/decimal";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

const TYPE_MAP: Record<string, TransactionType> = {
  buy: "buy",
  sell: "sell",
  swap: "swap",
  transfer: "transfer",
  staking_reward: "staking_reward",
  airdrop: "airdrop",
  fee_only: "fee_only",
};

export function normalizeDecimal(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, "");
  if (!trimmed) return "";
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
  const parsed = Number.parseFloat(normalized);
  if (Number.isNaN(parsed)) return "";
  return String(parsed);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      return NextResponse.json(
        { error: "CSV must have header and at least one row" },
        { status: 400 },
      );
    }

    const headers = parseCSVLine(lines[0]).map((h) =>
      h.toLowerCase().replace(/\s+/g, "_"),
    );
    const col = (name: string) => {
      const i = headers.indexOf(name);
      return i >= 0 ? i : -1;
    };

    const idCol = col("id") >= 0 ? col("id") : col("tx_id");
    const dateCol = col("date");
    const typeCol = col("type");
    const assetCol = col("asset");
    const amountCol = col("amount");
    const priceCol =
      col("price_per_unit") >= 0 ? col("price_per_unit") : col("price");
    const totalCol =
      col("total_value") >= 0 ? col("total_value") : col("total");
    const feeCol = col("fee");
    const feeAssetCol = col("fee_asset");
    const feePriceCol =
      col("fee_price_per_unit") >= 0 ? col("fee_price_per_unit") : -1;
    const currencyCol = col("currency");
    const fxPairCol = col("fx_pair");
    const fxRateCol = col("fx_rate") >= 0 ? col("fx_rate") : col("fx_rate_to_default");
    const walletCol = col("wallet");
    const exchangeCol = col("exchange");
    const notesCol = col("notes");

    const required = [dateCol, typeCol, assetCol, amountCol];
    if (required.some((i) => i < 0)) {
      return NextResponse.json(
        { error: "CSV must have columns: date, type, asset, amount" },
        { status: 400 },
      );
    }

    const existing = await readTransactions();
    const existingIds = new Set(existing.map((t) => t.id));
    const imported: Transaction[] = [];
    const errors: string[] = [];

    for (let rowIndex = 1; rowIndex < lines.length; rowIndex++) {
      const values = parseCSVLine(lines[rowIndex]);
      const get = (i: number) =>
        i >= 0 && i < values.length ? (values[i] ?? "") : "";
      const typeRaw = get(typeCol).toLowerCase().replace(/\s+/g, "_");
      const type = TYPE_MAP[typeRaw] ?? "buy";
      const amount = normalizeDecimal(get(amountCol)) || "0";
      const pricePerUnit = normalizeDecimal(get(priceCol)) || "0";
      const totalValue =
        normalizeDecimal(get(totalCol)) ||
        (amount && pricePerUnit ? toDecimalString(d(amount).times(pricePerUnit)) : "0");
      const fee = normalizeDecimal(get(feeCol)) || "0";
      const id = get(idCol) || `import-${Date.now()}-${rowIndex}`;
      if (existingIds.has(id)) {
        errors.push(`Row ${rowIndex + 1}: ID ${id} already exists, skipped`);
        continue;
      }
      const feePriceRaw = feePriceCol >= 0 ? get(feePriceCol).trim() : "";
      const fee_price_per_unit =
        feePriceRaw && !isNaN(parseFloat(feePriceRaw.replace(",", ".")))
          ? normalizeDecimal(feePriceRaw)
          : undefined;
      const currencyRaw = (currencyCol >= 0 ? get(currencyCol) : "").toUpperCase();
      const currency = currencyRaw === "USD" ? "USD" : "CHF";
      const fxPairRaw = fxPairCol >= 0 ? get(fxPairCol).trim().toUpperCase() : "";
      const fx_pair =
        fxPairRaw === "USD/CHF" || fxPairRaw === "CHF/USD"
          ? fxPairRaw
          : undefined;
      const fxRateRaw = fxRateCol >= 0 ? get(fxRateCol).trim() : "";
      const fx_rate =
        fxRateRaw && !isNaN(parseFloat(fxRateRaw.replace(",", ".")))
          ? normalizeDecimal(fxRateRaw)
          : undefined;
      const tx: Transaction = {
        id,
        date: new Date(get(dateCol) || Date.now()).toISOString(),
        type,
        asset: get(assetCol),
        amount,
        price_per_unit: pricePerUnit,
        total_value: totalValue,
        fee,
        fee_asset: get(feeAssetCol) || "CHF",
        currency,
        ...(fx_pair !== undefined && { fx_pair }),
        ...(fx_rate !== undefined && { fx_rate }),
        ...(fee_price_per_unit !== undefined && { fee_price_per_unit }),
        wallet: get(walletCol),
        exchange: get(exchangeCol),
        notes: get(notesCol),
      };
      try {
        validateTransaction(tx);
        imported.push(tx);
        existingIds.add(id);
      } catch (err) {
        errors.push(
          `Row ${rowIndex + 1}: ${err instanceof Error ? err.message : "Invalid"}`,
        );
      }
    }

    if (imported.length > 0) {
      await writeTransactions([...existing, ...imported]);
    }

    return NextResponse.json({
      imported: imported.length,
      errors,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to import CSV" },
      { status: 500 },
    );
  }
}
