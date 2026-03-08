import { NextResponse } from "next/server";
import {
  readTransactions,
  readPricesWithCurrency,
  readExchangeRates,
} from "@/lib/storage";
import {
  computePortfolioSummary,
  computeAssetAllocation,
  computePerformanceOverTime,
} from "@/lib/engine/portfolio";
import { convertPriceEntryToCurrency, convertTransactionToCurrency } from "@/lib/fx";

/**
 * GET ?prices=BTC:50000,ETH:3000
 * Returns summary, allocation, performance.
 * Price source order: 1) query param, 2) data/prices.json, 3) last tx price per asset.
 */
export async function GET(request: Request) {
  try {
    const [transactions, storedPrices, exchangeRates] = await Promise.all([
      readTransactions(),
      readPricesWithCurrency(),
      readExchangeRates(),
    ]);

    const normalizedTransactions = transactions.map((tx) =>
      convertTransactionToCurrency(tx, "CHF", exchangeRates)
    );

    const { searchParams } = new URL(request.url);
    const pricesParam = searchParams.get("prices");
    const currentPrices: Record<string, string> = {};

    if (pricesParam) {
      for (const pair of pricesParam.split(",")) {
        const [symbol, price] = pair.split(":").map((s) => s.trim());
        if (symbol && price) currentPrices[symbol] = price;
      }
    }

    if (
      Object.keys(currentPrices).length === 0 &&
      Object.keys(storedPrices).length > 0
    ) {
      for (const [symbol, entry] of Object.entries(storedPrices)) {
        if (entry?.value)
          currentPrices[symbol] = convertPriceEntryToCurrency(
            entry,
            "CHF",
            exchangeRates
          );
      }
    }

    const byDate = [...normalizedTransactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const lastTxPriceByAsset: Record<string, string> = {};
    for (const tx of byDate) {
      if (tx.asset && tx.price_per_unit) {
        lastTxPriceByAsset[tx.asset] = tx.price_per_unit;
      }
    }
    for (const [asset, price] of Object.entries(lastTxPriceByAsset)) {
      if (!currentPrices[asset]) {
        currentPrices[asset] = price;
      }
    }

    const summary = computePortfolioSummary(normalizedTransactions, currentPrices);
    const allocation = computeAssetAllocation(normalizedTransactions, currentPrices);
    const performance = computePerformanceOverTime(normalizedTransactions, currentPrices);

    return NextResponse.json({
      summary,
      allocation,
      performance,
      currency: "CHF",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to compute portfolio" },
      { status: 500 }
    );
  }
}
