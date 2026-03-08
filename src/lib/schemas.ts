import { z } from "zod";

const transactionTypeEnum = z.enum([
  "buy",
  "sell",
  "swap",
  "transfer",
  "staking_reward",
  "airdrop",
  "fee_only",
]);

const decimalString = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, "Invalid decimal string");

export const transactionSchema = z.object({
  id: z.string().min(1, "ID is required"),
  date: z.string().datetime({ message: "Date must be valid ISO 8601" }),
  type: transactionTypeEnum,
  asset: z.string().min(1, "Asset is required"),
  amount: decimalString,
  price_per_unit: decimalString,
  total_value: decimalString,
  fee: decimalString,
  fee_asset: z.string(),
  currency: z.enum(["CHF", "USD"]).optional(),
  fx_pair: z.enum(["USD/CHF", "CHF/USD"]).optional(),
  fx_rate: z.optional(decimalString),
  fee_price_per_unit: z.optional(decimalString),
  wallet: z.string(),
  exchange: z.string(),
  notes: z.string(),
});

export const settingsSchema = z.object({
  default_currency: z.string().min(1),
  cost_basis_method: z.enum(["fifo", "lifo", "average_cost"]),
  wallets: z.array(z.string()),
  exchanges: z.array(z.string()),
  theme: z.enum(["light", "dark", "system"]),
  platform_color: z
    .enum([
      "gray",
      "yellow",
      "orange",
      "red",
      "pink",
      "purple",
      "green",
      "dark_green",
      "teal",
      "cyan",
      "azure",
      "blue",
    ])
    .default("green"),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;

export function validateTransaction(data: unknown): TransactionInput {
  return transactionSchema.parse(data);
}

export function validateSettings(data: unknown): SettingsInput {
  return settingsSchema.parse(data);
}

export function validateTransactionPartial(
  data: unknown,
): Partial<TransactionInput> {
  return transactionSchema.partial().parse(data);
}
