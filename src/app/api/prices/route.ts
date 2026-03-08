import { NextResponse } from "next/server";
import {
  readPricesWithCurrency,
  writePricesWithCurrency,
  type PriceCurrency,
  type PriceEntry,
  type PricesWithCurrencyMap,
} from "@/lib/storage";

export async function GET() {
  try {
    const prices = await readPricesWithCurrency();
    return NextResponse.json(prices);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to read prices" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Body must be an object of symbol -> { value, currency }" },
        { status: 400 }
      );
    }
    const prices: PricesWithCurrencyMap = {};
    for (const [symbol, value] of Object.entries(body)) {
      if (symbol === "updated_at") continue;
      if (typeof value === "string" && value.trim() !== "") {
        prices[symbol] = { value: value.trim(), currency: "CHF" };
      } else if (typeof value === "number" && !Number.isNaN(value)) {
        prices[symbol] = { value: String(value), currency: "CHF" };
      } else if (value && typeof value === "object") {
        const entry = value as { value?: unknown; currency?: unknown };
        const priceValue =
          typeof entry.value === "number"
            ? String(entry.value)
            : typeof entry.value === "string"
              ? entry.value.trim()
              : "";
        if (!priceValue) continue;
        const currency: PriceCurrency = entry.currency === "USD" ? "USD" : "CHF";
        prices[symbol] = { value: priceValue, currency } satisfies PriceEntry;
      }
    }
    await writePricesWithCurrency(prices);
    return NextResponse.json(prices);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to save prices" },
      { status: 500 }
    );
  }
}
