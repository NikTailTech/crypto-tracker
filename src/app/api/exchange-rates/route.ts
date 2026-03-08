import { NextResponse } from "next/server";
import { readExchangeRates, writeExchangeRates } from "@/lib/storage";

function normalizeRate(value: unknown): string | null {
  if (typeof value === "string" && value.trim() !== "") {
    return value.trim().replace(",", ".");
  }
  if (typeof value === "number" && !Number.isNaN(value)) {
    return String(value);
  }
  return null;
}

function toPositiveNumber(value: string): number | null {
  const num = Number.parseFloat(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num;
}

export async function GET() {
  try {
    const rates = await readExchangeRates();
    return NextResponse.json(rates);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to read exchange rates" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const chfUsdRaw = normalizeRate(body["CHF/USD"]);
    const usdChfRaw = normalizeRate(body["USD/CHF"]);
    const chfUsdNum = chfUsdRaw ? toPositiveNumber(chfUsdRaw) : null;
    const usdChfNum = usdChfRaw ? toPositiveNumber(usdChfRaw) : null;

    if (!chfUsdNum && !usdChfNum) {
      return NextResponse.json(
        { error: "Provide CHF/USD and/or USD/CHF with a positive number" },
        { status: 400 }
      );
    }

    const chfUsd = chfUsdNum ?? 1 / (usdChfNum as number);
    const usdChf = 1 / chfUsd;

    await writeExchangeRates({
      "CHF/USD": String(chfUsd),
      "USD/CHF": String(usdChf),
    });
    return NextResponse.json({
      "CHF/USD": String(chfUsd),
      "USD/CHF": String(usdChf),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to save exchange rates" },
      { status: 500 }
    );
  }
}
