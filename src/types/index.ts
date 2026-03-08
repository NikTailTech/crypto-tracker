/**
 * Core type definitions for the crypto tracker application.
 * No `any` types; strict typing throughout.
 */

export const TRANSACTION_TYPES = [
  "buy",
  "sell",
  "swap",
  "transfer",
  "staking_reward",
  "airdrop",
  "fee_only",
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export interface Transaction {
  id: string;
  date: string; // ISO 8601
  type: TransactionType;
  asset: string;
  amount: string; // decimal string for precision
  price_per_unit: string;
  total_value: string;
  fee: string;
  fee_asset: string;
  /** Currency used for price_per_unit and total_value on this transaction. */
  currency?: "CHF" | "USD";
  /** Optional explicit FX pair used at trade time, e.g. USD/CHF. */
  fx_pair?: "USD/CHF" | "CHF/USD";
  /** Optional FX rate at trade time for the selected pair. */
  fx_rate?: string;
  /** When fee is paid in another crypto (e.g. BNB on Binance), price of 1 unit of fee_asset in default currency at transaction time. Required for correct cost basis when fee_asset is not fiat. */
  fee_price_per_unit?: string;
  wallet: string;
  exchange: string;
  notes: string;
}

/** For swap: from_asset/from_amount (sold) and to_asset/to_amount (received) */
export interface SwapLeg {
  asset: string;
  amount: string;
  price_per_unit: string;
  total_value: string;
}

export interface Settings {
  default_currency: string;
  cost_basis_method: CostBasisMethod;
  wallets: string[];
  exchanges: string[];
  theme: "light" | "dark" | "system";
  platform_color: PlatformColor;
}

export type CostBasisMethod = "fifo" | "lifo" | "average_cost";
export type PlatformColor =
  | "gray"
  | "yellow"
  | "orange"
  | "red"
  | "pink"
  | "purple"
  | "green"
  | "dark_green"
  | "teal"
  | "cyan"
  | "azure"
  | "blue";

export interface Lot {
  id: string;
  asset: string;
  amount: string;
  cost_basis: string;
  date_acquired: string;
  fee_allocated: string;
  source_transaction_id: string;
}

export interface SoldLot {
  lot_id: string;
  amount_sold: string;
  cost_basis_used: string;
  proceeds: string;
  realized_gain_loss: string;
  date_acquired?: string;
  source_transaction_id?: string;
}

export interface RealizedEvent {
  id: string;
  date: string;
  asset: string;
  amount: string;
  cost_basis: string;
  proceeds: string;
  realized_gain_loss: string;
  method: CostBasisMethod;
  sold_lots: SoldLot[];
  unmatched_amount?: string;
}

export interface UnrealizedHolding {
  asset: string;
  amount: string;
  cost_basis: string;
  current_value: string;
  unrealized_gain_loss: string;
  cost_basis_per_unit: string;
}

export interface CostBasisResult {
  method: CostBasisMethod;
  realized_events: RealizedEvent[];
  unrealized_holdings: UnrealizedHolding[];
  total_realized_gain_loss: string;
  total_unrealized_gain_loss: string;
  total_fees_paid: string;
}

export interface PortfolioSummary {
  /** Current value of open positions only (holdings × current price). */
  total_value: string;
  /** Cost basis of current holdings. */
  total_invested: string;
  /** Realized P&L from closed positions (cash from sales minus cost). */
  realized_profit: string;
  unrealized_profit: string;
  /** Total equity = positions value + realized profit (cash). */
  total_equity: string;
  /** Total profit = total equity − total invested. */
  total_profit: string;
  /** ROI = total_profit / net_total_invested × 100. */
  roi_percent: string;
  /** Net cash invested = total spent on acquisitions − total received from sales. */
  net_total_invested: string;
  fees_paid: string;
  by_strategy: Record<CostBasisMethod, CostBasisResult>;
}

export interface AssetAllocationItem {
  symbol: string;
  value: string;
  percent: string;
  amount: string;
}

export interface PerformancePoint {
  date: string;
  value: string;
  label?: string;
}

export interface ExchangeRateEntry {
  date: string;
  from_currency: string;
  to_currency: string;
  rate: string;
}

export interface TaxableEventSummary {
  year: number;
  events: RealizedEvent[];
  total_short_term_gain: string;
  total_long_term_gain: string;
  total_fees: string;
}
