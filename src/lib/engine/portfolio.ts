import type {
  Transaction,
  CostBasisMethod,
  PortfolioSummary,
  AssetAllocationItem,
  PerformancePoint,
  CostBasisResult,
} from "@/types";
import { runCostBasis } from "./costBasis";
import { d, toDecimalString } from "@/lib/decimal";

const METHODS: CostBasisMethod[] = ["fifo", "lifo", "average_cost"];
const ACQUISITION_TYPES = ["buy", "staking_reward", "airdrop"] as const;

function feeValueInReportingCurrency(tx: Transaction) {
  if (tx.fee_price_per_unit) {
    return d(tx.fee).times(tx.fee_price_per_unit);
  }
  return d(tx.fee);
}

/**
 * Compute portfolio summary with all three cost basis strategies for comparison.
 */
export function computePortfolioSummary(
  transactions: Transaction[],
  currentPrices: Record<string, string>
): PortfolioSummary {
  const byStrategy: Record<CostBasisMethod, CostBasisResult> = {
    fifo: runCostBasis(transactions, "fifo", currentPrices),
    lifo: runCostBasis(transactions, "lifo", currentPrices),
    average_cost: runCostBasis(transactions, "average_cost", currentPrices),
  };

  const primary = byStrategy.fifo;
  const totalValue = primary.unrealized_holdings.reduce(
    (s, h) => s.plus(h.current_value),
    d(0)
  );
  const totalInvested = primary.unrealized_holdings.reduce(
    (s, h) => s.plus(h.cost_basis),
    d(0)
  );
  const realizedProfit = d(primary.total_realized_gain_loss);
  const unrealizedProfit = d(primary.total_unrealized_gain_loss);
  const totalEquity = totalValue.plus(realizedProfit);
  const totalProfit = totalEquity.minus(totalInvested);
  const feesPaid = d(primary.total_fees_paid);

  const totalSpent = transactions
    .filter((tx) => (ACQUISITION_TYPES as readonly string[]).includes(tx.type))
    .reduce(
      (sum, tx) => sum.plus(d(tx.total_value)).plus(feeValueInReportingCurrency(tx)),
      d(0)
    );
  const totalReceived = primary.realized_events.reduce(
    (sum, e) => sum.plus(e.proceeds),
    d(0)
  );
  const netTotalInvested = totalSpent.minus(totalReceived);
  const roi =
    netTotalInvested.gt(0)
      ? totalProfit.div(netTotalInvested).times(100)
      : d(0);

  return {
    total_value: toDecimalString(totalValue),
    total_invested: toDecimalString(totalInvested),
    realized_profit: toDecimalString(realizedProfit),
    unrealized_profit: toDecimalString(unrealizedProfit),
    total_equity: toDecimalString(totalEquity),
    total_profit: toDecimalString(totalProfit),
    roi_percent: toDecimalString(roi),
    net_total_invested: toDecimalString(netTotalInvested),
    fees_paid: toDecimalString(feesPaid),
    by_strategy: byStrategy,
  };
}

/**
 * Asset allocation (pie chart): each asset's current value and percent of total.
 */
export function computeAssetAllocation(
  transactions: Transaction[],
  currentPrices: Record<string, string>
): AssetAllocationItem[] {
  const result = runCostBasis(transactions, "fifo", currentPrices);
  const total = result.unrealized_holdings.reduce(
    (s, h) => s.plus(h.current_value),
    d(0)
  );
  if (total.lte(0)) return [];

  return result.unrealized_holdings.map((h) => ({
    symbol: h.asset,
    value: h.current_value,
    percent: toDecimalString(d(h.current_value).div(total).times(100)),
    amount: h.amount,
  }));
}

/**
 * Performance over time: portfolio value at each transaction date (and today).
 * Uses FIFO for consistency.
 */
export function computePerformanceOverTime(
  transactions: Transaction[],
  currentPrices: Record<string, string>
): PerformancePoint[] {
  const sortedTx = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const points: PerformancePoint[] = [];
  const txByDate = new Map<string, Transaction[]>();
  for (const tx of sortedTx) {
    const dateKey = tx.date.slice(0, 10);
    const list = txByDate.get(dateKey) ?? [];
    list.push(tx);
    txByDate.set(dateKey, list);
  }
  const sortedDates = Array.from(txByDate.keys()).sort();
  const runningTx: Transaction[] = [];

  for (const dateStr of sortedDates) {
    runningTx.push(...(txByDate.get(dateStr) ?? []));
    const result = runCostBasis(runningTx, "fifo", currentPrices);
    const value = result.unrealized_holdings.reduce(
      (s, h) => s.plus(h.current_value),
      d(0)
    );
    const realized = result.realized_events.reduce(
      (s, e) => s.plus(e.realized_gain_loss),
      d(0)
    );
    points.push({
      date: dateStr,
      value: toDecimalString(value.plus(realized)),
      label: dateStr,
    });
  }

  const lastDate = sortedDates[sortedDates.length - 1];
  const fullResult = runCostBasis(transactions, "fifo", currentPrices);
  const totalValue = fullResult.unrealized_holdings.reduce(
    (s, h) => s.plus(h.current_value),
    d(0)
  );
  const totalRealized = fullResult.realized_events.reduce(
    (s, e) => s.plus(e.realized_gain_loss),
    d(0)
  );
  const today = new Date().toISOString().slice(0, 10);
  if (today !== lastDate) {
    points.push({
      date: today,
      value: toDecimalString(totalValue.plus(totalRealized)),
      label: "Now",
    });
  }

  return points.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

export { runCostBasis };
