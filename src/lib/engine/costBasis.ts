import type {
  Transaction,
  CostBasisMethod,
  SoldLot,
  RealizedEvent,
  UnrealizedHolding,
  CostBasisResult,
} from "@/types";
import Decimal from "decimal.js";
import { d, toDecimalString } from "@/lib/decimal";

const ACQUISITION_TYPES = ["buy", "staking_reward", "airdrop"] as const;
const DISPOSAL_TYPES = ["sell", "swap"] as const;

function isAcquisition(type: Transaction["type"]): boolean {
  return (ACQUISITION_TYPES as readonly string[]).includes(type);
}

function isDisposal(type: Transaction["type"]): boolean {
  return (DISPOSAL_TYPES as readonly string[]).includes(type);
}

interface InternalLot {
  id: string;
  asset: string;
  amount: Decimal;
  costBasis: Decimal;
  dateAcquired: string;
  feeAllocated: Decimal;
  sourceTransactionId: string;
}

/** Fee value in same currency as total_value (e.g. USD). When fee is in another crypto, use fee_price_per_unit to convert. */
function feeValueInReportingCurrency(tx: Transaction): Decimal {
  if (tx.fee_price_per_unit) {
    return d(tx.fee).times(tx.fee_price_per_unit);
  }
  return d(tx.fee);
}

/** Build lots from transactions (acquisitions only), sorted by date for FIFO/LIFO */
function buildLots(transactions: Transaction[]): InternalLot[] {
  const lots: InternalLot[] = [];
  for (const tx of transactions) {
    if (!isAcquisition(tx.type)) continue;
    const amount = d(tx.amount);
    if (amount.lte(0)) continue;
    const feeValue = feeValueInReportingCurrency(tx);
    const totalCost = d(tx.total_value).plus(feeValue);
    const costBasis = totalCost;
    const feeAllocated = feeValue;
    lots.push({
      id: `lot-${tx.id}`,
      asset: tx.asset,
      amount,
      costBasis,
      dateAcquired: tx.date,
      feeAllocated,
      sourceTransactionId: tx.id,
    });
  }
  return lots.sort(
    (a, b) => new Date(a.dateAcquired).getTime() - new Date(b.dateAcquired).getTime()
  );
}

/** Allocate fee proportionally to cost basis (fee adds to basis) - already included in buildLots */

/** FIFO: consume oldest lots first */
function consumeLotsFIFO(
  lots: Map<string, InternalLot[]>,
  asset: string,
  amountToDispose: Decimal,
  pricePerUnit: Decimal,
  txId: string,
  txDate: string
): { soldLots: SoldLot[]; remainingLots: InternalLot[] } {
  const assetLots = (lots.get(asset) ?? []).slice();
  const soldLots: SoldLot[] = [];
  let remaining = amountToDispose;
  const proceedsPerUnit = pricePerUnit;

  for (let i = 0; i < assetLots.length && remaining.gt(0); i++) {
    const lot = assetLots[i];
    const take = Decimal.min(lot.amount, remaining);
    if (take.lte(0)) continue;
    const costBasisPerUnit = lot.costBasis.div(lot.amount);
    const costBasisUsed = costBasisPerUnit.times(take);
    const proceeds = proceedsPerUnit.times(take);
    const realizedGainLoss = proceeds.minus(costBasisUsed);

    soldLots.push({
      lot_id: lot.id,
      amount_sold: toDecimalString(take),
      cost_basis_used: toDecimalString(costBasisUsed),
      proceeds: toDecimalString(proceeds),
      realized_gain_loss: toDecimalString(realizedGainLoss),
      date_acquired: lot.dateAcquired,
      source_transaction_id: lot.sourceTransactionId,
    });

    lot.amount = lot.amount.minus(take);
    lot.costBasis = lot.costBasis.minus(costBasisUsed);
    lot.feeAllocated = lot.feeAllocated.mul(lot.amount).div(lot.amount.plus(take)); // proportional fee reduction
    remaining = remaining.minus(take);
  }

  const remainingLots = assetLots.filter((l) => l.amount.gt(0));
  return { soldLots, remainingLots };
}

/** Clone a lot so mutations do not affect the map. */
function cloneLot(lot: InternalLot): InternalLot {
  return {
    ...lot,
    amount: d(lot.amount.toString()),
    costBasis: d(lot.costBasis.toString()),
    feeAllocated: d(lot.feeAllocated.toString()),
  };
}

/** LIFO: consume newest lots first. Sort by dateAcquired descending and consume in order. */
function consumeLotsLIFO(
  lots: Map<string, InternalLot[]>,
  asset: string,
  amountToDispose: Decimal,
  pricePerUnit: Decimal,
  _txId: string,
  _txDate: string
): { soldLots: SoldLot[]; remainingLots: InternalLot[] } {
  const raw = lots.get(asset) ?? [];
  const cloned = raw.map(cloneLot);
  const assetLots = cloned.sort(
    (a, b) => new Date(b.dateAcquired).getTime() - new Date(a.dateAcquired).getTime()
  );
  const soldLots: SoldLot[] = [];
  let remaining = amountToDispose;
  const proceedsPerUnit = pricePerUnit;

  for (let i = 0; i < assetLots.length && remaining.gt(0); i++) {
    const lot = assetLots[i];
    const take = Decimal.min(lot.amount, remaining);
    if (take.lte(0)) continue;
    const costBasisPerUnit = lot.costBasis.div(lot.amount);
    const costBasisUsed = costBasisPerUnit.times(take);
    const proceeds = proceedsPerUnit.times(take);
    const realizedGainLoss = proceeds.minus(costBasisUsed);

    soldLots.push({
      lot_id: lot.id,
      amount_sold: toDecimalString(take),
      cost_basis_used: toDecimalString(costBasisUsed),
      proceeds: toDecimalString(proceeds),
      realized_gain_loss: toDecimalString(realizedGainLoss),
      date_acquired: lot.dateAcquired,
      source_transaction_id: lot.sourceTransactionId,
    });

    lot.amount = lot.amount.minus(take);
    lot.costBasis = lot.costBasis.minus(costBasisUsed);
    lot.feeAllocated = lot.feeAllocated.mul(lot.amount).div(lot.amount.plus(take));
    remaining = remaining.minus(take);
  }

  const remainingLots = assetLots
    .filter((l) => l.amount.gt(0))
    .sort((a, b) => new Date(a.dateAcquired).getTime() - new Date(b.dateAcquired).getTime());
  return { soldLots, remainingLots };
}

/** Average cost: single average basis for asset; on disposal use that average */
function consumeLotsAverageCost(
  lots: Map<string, InternalLot[]>,
  asset: string,
  amountToDispose: Decimal,
  pricePerUnit: Decimal,
  _txId: string,
  _txDate: string
): { soldLots: SoldLot[]; remainingLots: InternalLot[] } {
  const assetLots = (lots.get(asset) ?? []).slice();
  const totalAmount = assetLots.reduce((s, l) => s.plus(l.amount), d(0));
  const totalCost = assetLots.reduce((s, l) => s.plus(l.costBasis), d(0));
  if (totalAmount.lte(0)) {
    return { soldLots: [], remainingLots: [] };
  }
  const avgCostPerUnit = totalCost.div(totalAmount);
  const take = Decimal.min(amountToDispose, totalAmount);
  const soldLots: SoldLot[] = [];

  let remainingToDeduct = take;
  const newLots: InternalLot[] = [];
  for (const lot of assetLots) {
    if (remainingToDeduct.lte(0)) {
      newLots.push({ ...lot });
      continue;
    }
    const deduct = Decimal.min(lot.amount, remainingToDeduct);
    const newAmount = lot.amount.minus(deduct);
    const ratio = newAmount.div(lot.amount);
    const newCostBasis = lot.costBasis.mul(ratio);
    const newFeeAllocated = lot.feeAllocated.mul(ratio);
    const costBasisUsed = avgCostPerUnit.times(deduct);
    const proceeds = pricePerUnit.times(deduct);
    const realizedGainLoss = proceeds.minus(costBasisUsed);
    soldLots.push({
      lot_id: lot.id,
      amount_sold: toDecimalString(deduct),
      cost_basis_used: toDecimalString(costBasisUsed),
      proceeds: toDecimalString(proceeds),
      realized_gain_loss: toDecimalString(realizedGainLoss),
      date_acquired: lot.dateAcquired,
      source_transaction_id: lot.sourceTransactionId,
    });
    remainingToDeduct = remainingToDeduct.minus(deduct);
    if (newAmount.gt(0)) {
      newLots.push({
        ...lot,
        amount: newAmount,
        costBasis: newCostBasis,
        feeAllocated: newFeeAllocated,
      });
    }
  }

  return { soldLots, remainingLots: newLots };
}

export function runCostBasis(
  transactions: Transaction[],
  method: CostBasisMethod,
  currentPrices: Record<string, string>
): CostBasisResult {
  const sortedTx = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const lotsByAsset = new Map<string, InternalLot[]>();
  const consumeFn =
    method === "fifo"
      ? consumeLotsFIFO
      : method === "lifo"
        ? consumeLotsLIFO
        : consumeLotsAverageCost;

  const realizedEvents: RealizedEvent[] = [];
  let totalFeesPaid = d(0);

  for (const tx of sortedTx) {
    const fv = feeValueInReportingCurrency(tx);
    if (fv.gt(0)) totalFeesPaid = totalFeesPaid.plus(fv);

    if (isAcquisition(tx.type)) {
      const amount = d(tx.amount);
      if (amount.gt(0)) {
        const feeValue = feeValueInReportingCurrency(tx);
        const totalCost = d(tx.total_value).plus(feeValue);
        const lot: InternalLot = {
          id: `lot-${tx.id}`,
          asset: tx.asset,
          amount,
          costBasis: totalCost,
          dateAcquired: tx.date,
          feeAllocated: feeValue,
          sourceTransactionId: tx.id,
        };
        const list = lotsByAsset.get(tx.asset) ?? [];
        list.push({ ...lot });
        lotsByAsset.set(tx.asset, list);
      }
      continue;
    }

    if (!isDisposal(tx.type)) continue;

    const amountToDispose = d(tx.amount);
    if (amountToDispose.lte(0)) continue;

    const pricePerUnit = d(tx.price_per_unit);
    const { soldLots, remainingLots } = consumeFn(
      lotsByAsset,
      tx.asset,
      amountToDispose,
      pricePerUnit,
      tx.id,
      tx.date
    );

    lotsByAsset.set(tx.asset, remainingLots);

    if (soldLots.length > 0) {
      const totalDisposed = soldLots.reduce((s, sl) => s.plus(sl.amount_sold), d(0));
      const totalCostBasis = soldLots.reduce(
        (s, sl) => s.plus(sl.cost_basis_used),
        d(0)
      );
      const grossProceeds = soldLots.reduce((s, sl) => s.plus(sl.proceeds), d(0));
      const disposalFee = feeValueInReportingCurrency(tx);
      const netProceeds = grossProceeds.minus(disposalFee);
      const totalRealized = netProceeds.minus(totalCostBasis);
      realizedEvents.push({
        id: tx.id,
        date: tx.date,
        asset: tx.asset,
        amount: toDecimalString(totalDisposed),
        cost_basis: toDecimalString(totalCostBasis),
        proceeds: toDecimalString(netProceeds),
        realized_gain_loss: toDecimalString(totalRealized),
        method,
        sold_lots: soldLots,
        unmatched_amount: amountToDispose.gt(totalDisposed)
          ? toDecimalString(amountToDispose.minus(totalDisposed))
          : undefined,
      });
    }
  }

  const unrealizedHoldings: UnrealizedHolding[] = [];
  let totalUnrealized = d(0);

  for (const [asset, lots] of lotsByAsset.entries()) {
    const totalAmount = lots.reduce((s, l) => s.plus(l.amount), d(0));
    const totalCostBasis = lots.reduce((s, l) => s.plus(l.costBasis), d(0));
    if (totalAmount.lte(0)) continue;

    const costBasisPerUnit = totalCostBasis.div(totalAmount);
    const currentPrice = d(currentPrices[asset] ?? 0);
    const currentValue = currentPrice.times(totalAmount);
    const unrealizedGainLoss = currentValue.minus(totalCostBasis);

    unrealizedHoldings.push({
      asset,
      amount: toDecimalString(totalAmount),
      cost_basis: toDecimalString(totalCostBasis),
      current_value: toDecimalString(currentValue),
      unrealized_gain_loss: toDecimalString(unrealizedGainLoss),
      cost_basis_per_unit: toDecimalString(costBasisPerUnit),
    });
    totalUnrealized = totalUnrealized.plus(unrealizedGainLoss);
  }

  const totalRealizedGainLoss = realizedEvents.reduce(
    (s, e) => s.plus(e.realized_gain_loss),
    d(0)
  );

  return {
    method,
    realized_events: realizedEvents,
    unrealized_holdings: unrealizedHoldings,
    total_realized_gain_loss: toDecimalString(totalRealizedGainLoss),
    total_unrealized_gain_loss: toDecimalString(totalUnrealized),
    total_fees_paid: toDecimalString(totalFeesPaid),
  };
}
