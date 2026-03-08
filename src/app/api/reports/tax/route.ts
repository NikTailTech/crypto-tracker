import { NextResponse } from "next/server";
import { readTransactions, readSettings, readExchangeRates } from "@/lib/storage";
import { runCostBasis } from "@/lib/engine/costBasis";
import { convertTransactionToCurrency } from "@/lib/fx";
import { d, toDecimalString } from "@/lib/decimal";
import type { RealizedEvent } from "@/types";

export function splitTermGains(
  events: RealizedEvent[],
  oneYearMs: number = 365.25 * 24 * 60 * 60 * 1000
): { shortTerm: string; longTerm: string } {
  let shortTerm = d(0);
  let longTerm = d(0);
  for (const e of events) {
    const eventDate = new Date(e.date).getTime();
    for (const lot of e.sold_lots) {
      const gain = d(lot.realized_gain_loss);
      const acquiredAt = lot.date_acquired
        ? new Date(lot.date_acquired).getTime()
        : eventDate;
      if (eventDate - acquiredAt >= oneYearMs) {
        longTerm = longTerm.plus(gain);
      } else {
        shortTerm = shortTerm.plus(gain);
      }
    }
  }
  return {
    shortTerm: toDecimalString(shortTerm),
    longTerm: toDecimalString(longTerm),
  };
}

export async function GET(request: Request) {
  try {
    const [transactions, settings, exchangeRates] = await Promise.all([
      readTransactions(),
      readSettings(),
      readExchangeRates(),
    ]);

    const normalizedTransactions = transactions.map((tx) =>
      convertTransactionToCurrency(tx, "CHF", exchangeRates),
    );

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
    if (isNaN(year)) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }

    const currentPrices: Record<string, string> = {};
    for (const tx of normalizedTransactions) {
      if (tx.asset && tx.price_per_unit)
        currentPrices[tx.asset] = tx.price_per_unit;
    }

    const result = runCostBasis(
      normalizedTransactions,
      settings.cost_basis_method,
      currentPrices,
    );

    const eventsInYear = result.realized_events.filter(
      (e) => new Date(e.date).getFullYear() === year,
    );

    const termGains = splitTermGains(eventsInYear);

    const report = {
      year,
      method: settings.cost_basis_method,
      events: eventsInYear,
      total_short_term_gain: termGains.shortTerm,
      total_long_term_gain: termGains.longTerm,
      total_fees: result.total_fees_paid,
      currency: "CHF",
    };

    return NextResponse.json(report);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 },
    );
  }
}
