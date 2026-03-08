import { NextResponse } from "next/server";
import { readTransactions, readSettings, readExchangeRates } from "@/lib/storage";
import { runCostBasis } from "@/lib/engine/costBasis";
import { formatDate } from "@/lib/format";
import { convertTransactionToCurrency } from "@/lib/fx";

export function escapeCsvValue(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * GET ?year=2024&format=csv
 * Download taxable events as CSV.
 */
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
    const format = searchParams.get("format") ?? "json";

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

    if (format === "csv") {
      const headers = [
        "Date",
        "Asset",
        "Amount",
        "Cost Basis",
        "Proceeds",
        "Realized Gain/Loss",
      ];
      const rows = eventsInYear.map((e) =>
        [
          formatDate(e.date),
          e.asset,
          e.amount,
          e.cost_basis,
          e.proceeds,
          e.realized_gain_loss,
        ]
          .map((v) => escapeCsvValue(String(v)))
          .join(","),
      );
      const csv = [headers.join(","), ...rows].join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="taxable-events-${year}.csv"`,
        },
      });
    }

    const report = {
      year,
      method: settings.cost_basis_method,
      currency: "CHF",
      events: eventsInYear,
      total_realized_gain_loss: result.total_realized_gain_loss,
      total_fees_paid: result.total_fees_paid,
    };

    return new NextResponse(JSON.stringify(report, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="tax-report-${year}.json"`,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to export report" },
      { status: 500 },
    );
  }
}
