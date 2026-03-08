import { d, toDecimalString } from "@/lib/decimal";
import type { Transaction } from "@/types";
import type { PriceEntry } from "@/lib/storage";
import type { ExchangeRatesMap } from "@/lib/storage";

type Fiat = "CHF" | "USD";

const DEFAULT_USD_CHF = "1.28205128";
const DEFAULT_CHF_USD = "0.78";

function normalizeFiat(value: string | undefined, fallback: Fiat = "CHF"): Fiat {
  return value === "USD" ? "USD" : fallback;
}

function resolveRate(
  from: Fiat,
  to: Fiat,
  pair?: string,
  rate?: string,
  exchangeRates?: ExchangeRatesMap
): string {
  if (from === to) return "1";
  if (rate && !Number.isNaN(parseFloat(rate)) && parseFloat(rate) > 0) {
    if (pair === `${from}/${to}`) return rate;
    if (pair === `${to}/${from}`) return toDecimalString(d(1).div(rate));
  }
  if (from === "USD" && to === "CHF")
    return exchangeRates?.["USD/CHF"] ?? DEFAULT_USD_CHF;
  if (from === "CHF" && to === "USD")
    return exchangeRates?.["CHF/USD"] ?? DEFAULT_CHF_USD;
  return "1";
}

function convertAmount(
  value: string,
  from: Fiat,
  to: Fiat,
  pair?: string,
  rate?: string,
  exchangeRates?: ExchangeRatesMap
): string {
  if (from === to) return value;
  const fx = resolveRate(from, to, pair, rate, exchangeRates);
  return toDecimalString(d(value).times(fx));
}

export function convertTransactionToCurrency(
  tx: Transaction,
  target: Fiat = "CHF",
  exchangeRates?: ExchangeRatesMap
): Transaction {
  const source = normalizeFiat(tx.currency, target);
  const converted: Transaction = {
    ...tx,
    currency: target,
    price_per_unit: convertAmount(
      tx.price_per_unit,
      source,
      target,
      tx.fx_pair,
      tx.fx_rate,
      exchangeRates
    ),
    total_value: convertAmount(
      tx.total_value,
      source,
      target,
      tx.fx_pair,
      tx.fx_rate,
      exchangeRates
    ),
  };

  if (tx.fee_price_per_unit) {
    converted.fee_price_per_unit = convertAmount(
      tx.fee_price_per_unit,
      source,
      target,
      tx.fx_pair,
      tx.fx_rate,
      exchangeRates,
    );
  }

  const feeAsset = normalizeFiat(tx.fee_asset, target);
  if (feeAsset === "CHF" || feeAsset === "USD") {
    converted.fee = convertAmount(
      tx.fee,
      feeAsset,
      target,
      tx.fx_pair,
      tx.fx_rate,
      exchangeRates
    );
    converted.fee_asset = target;
  }

  return converted;
}

export function convertPriceEntryToCurrency(
  entry: PriceEntry,
  target: Fiat = "CHF",
  exchangeRates?: ExchangeRatesMap
): string {
  const source = normalizeFiat(entry.currency, target);
  return convertAmount(entry.value, source, target, undefined, undefined, exchangeRates);
}
