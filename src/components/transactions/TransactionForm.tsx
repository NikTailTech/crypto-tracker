"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import {
  formatDateForInput,
  formatTimeForInput,
  parseDateAndTimeToISO,
  formatNumberForInput,
  europeanToDecimalString,
} from "@/lib/format";
import { d, toDecimalString } from "@/lib/decimal";
import type { Transaction, TransactionType } from "@/types";

const TYPES: TransactionType[] = [
  "buy",
  "sell",
  "swap",
  "transfer",
  "staking_reward",
  "airdrop",
  "fee_only",
];

interface TransactionFormProps {
  transaction?: Transaction;
  onClose: () => void;
  onSaved: () => void;
  onImportSuccess?: () => void;
}

const emptyTx = (): Transaction => ({
  id: `tx-${Date.now()}`,
  date: new Date().toISOString(),
  type: "buy",
  asset: "",
  amount: "0",
  price_per_unit: "0",
  total_value: "0",
  fee: "0",
  fee_asset: "CHF",
  currency: "CHF",
  wallet: "",
  exchange: "",
  notes: "",
});

export function TransactionForm({
  transaction,
  onClose,
  onSaved,
  onImportSuccess,
}: TransactionFormProps) {
  const safeMultiply = (a: string, b: string): string => {
    try {
      return toDecimalString(d(a || "0").times(b || "0"));
    } catch {
      return "0";
    }
  };

  const [form, setForm] = useState<Transaction>(() => transaction ?? emptyTx());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState("CHF");
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** Raw numeric input while typing (comma decimal); cleared on blur. */
  const [rawAmount, setRawAmount] = useState<string | null>(null);
  const [rawPrice, setRawPrice] = useState<string | null>(null);
  const [rawTotal, setRawTotal] = useState<string | null>(null);
  const [rawFee, setRawFee] = useState<string | null>(null);
  const [rawFeePrice, setRawFeePrice] = useState<string | null>(null);
  const [rawFxRate, setRawFxRate] = useState<string | null>(null);
  const [dateStr, setDateStr] = useState(() =>
    formatDateForInput((transaction ?? emptyTx()).date),
  );
  const [timeStr, setTimeStr] = useState(() =>
    formatTimeForInput((transaction ?? emptyTx()).date),
  );

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s: { default_currency?: string }) =>
        setDefaultCurrency(s.default_currency ?? "CHF"),
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!transaction) {
      setForm((f) => ({
        ...f,
        currency: defaultCurrency.toUpperCase() === "USD" ? "USD" : "CHF",
      }));
    }
  }, [defaultCurrency, transaction]);

  useEffect(() => {
    if (transaction) {
      setDateStr(formatDateForInput(transaction.date));
      setTimeStr(formatTimeForInput(transaction.date));
    }
  }, [transaction?.id]);

  const update = (key: keyof Transaction, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "amount" || key === "price_per_unit") {
      const amount = key === "amount" ? value : form.amount;
      const price = key === "price_per_unit" ? value : form.price_per_unit;
      setForm((f) => ({ ...f, total_value: safeMultiply(amount, price) }));
    }
  };

  const updateNumber = (
    key:
      | "amount"
      | "price_per_unit"
      | "total_value"
      | "fee"
      | "fee_price_per_unit",
    rawValue: string,
  ) => {
    const value = europeanToDecimalString(rawValue);
    if (key === "fee_price_per_unit") {
      setForm((f) => ({ ...f, [key]: value || undefined }));
      return;
    }
    update(key, value || "0");
    if (key === "amount" || key === "price_per_unit") {
      const amount = key === "amount" ? value : form.amount;
      const price = key === "price_per_unit" ? value : form.price_per_unit;
      setForm((f) => ({ ...f, total_value: safeMultiply(amount, price) }));
    }
  };

  const blurNumber = (
    key:
      | "amount"
      | "price_per_unit"
      | "total_value"
      | "fee"
      | "fee_price_per_unit",
    rawSetter: (v: string | null) => void,
  ) => {
    rawSetter(null);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.id.trim()) e.id = "ID required";
    if (!form.date) e.date = "Date required";
    if (!form.asset.trim()) e.asset = "Asset required";
    if (isNaN(parseFloat(form.amount))) e.amount = "Valid number required";
    if (isNaN(parseFloat(form.price_per_unit)))
      e.price_per_unit = "Valid number required";
    if (isNaN(parseFloat(form.fee))) e.fee = "Valid number required";
    const txCurrency = form.currency === "USD" ? "USD" : "CHF";
    const feeAssetIsCrypto =
      form.fee_asset.trim() &&
      !["CHF", "USD"].includes(form.fee_asset.toUpperCase());
    if (
      feeAssetIsCrypto &&
      parseFloat(form.fee) > 0 &&
      (!form.fee_price_per_unit || isNaN(parseFloat(form.fee_price_per_unit)))
    ) {
      e.fee_price_per_unit = `Enter the price of 1 ${form.fee_asset} in ${txCurrency} at transaction time`;
    }
    if (
      txCurrency !== "CHF" &&
      (!form.fx_pair || !form.fx_rate || isNaN(parseFloat(form.fx_rate)))
    ) {
      e.fx_rate = "Enter FX pair and rate to convert this transaction to CHF";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const convertedTotalChf = (() => {
    const total = parseFloat(form.total_value);
    const rate = parseFloat(form.fx_rate ?? "");
    if (Number.isNaN(total)) return null;
    if ((form.currency ?? "CHF") === "CHF") return total;
    if (Number.isNaN(rate) || rate <= 0) return null;
    if (form.fx_pair === "USD/CHF") return total * rate;
    if (form.fx_pair === "CHF/USD") return total / rate;
    return null;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const iso = parseDateAndTimeToISO(dateStr, timeStr);
    if (iso) {
      setForm((f) => ({ ...f, date: iso }));
      setDateStr(formatDateForInput(iso));
      setTimeStr(formatTimeForInput(iso));
    }
    if (!validate()) return;
    const payload: Transaction = {
      ...form,
      currency: form.currency === "USD" ? "USD" : "CHF",
      fx_pair:
        form.currency === "USD"
          ? form.fx_pair === "CHF/USD"
            ? "CHF/USD"
            : "USD/CHF"
          : undefined,
      fx_rate:
        form.currency === "USD" && form.fx_rate?.trim()
          ? form.fx_rate.trim()
          : undefined,
    };

    const url = transaction ? "/api/transactions" : "/api/transactions";
    const method = transaction ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setErrors({ submit: data.error ?? "Failed to save" });
      return;
    }
    onSaved();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const fd = new FormData();
    fd.set("file", file);
    try {
      const res = await fetch("/api/import/csv", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        onImportSuccess?.();
        onClose();
      } else {
        setErrors({ submit: data.error ?? "Import failed" });
      }
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {transaction ? "Edit transaction" : "Add transaction"}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleImport}
        />
        {onImportSuccess && (
          <Button
            variant="secondary"
            size="sm"
            className="mb-4"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            {importing ? "Importing…" : "Import CSV"}
          </Button>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-500">ID</label>
            <input
              value={form.id}
              onChange={(e) => update("id", e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 px-3 py-2"
              disabled={!!transaction}
            />
            {errors.id && (
              <p className="mt-1 text-xs text-red-400">{errors.id}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-500">
                Date (dd/mm/yyyy)
              </label>
              <input
                type="text"
                placeholder="dd/mm/yyyy"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                onBlur={() => {
                  const iso = parseDateAndTimeToISO(dateStr, timeStr);
                  if (iso) {
                    update("date", iso);
                    setDateStr(formatDateForInput(iso));
                    setTimeStr(formatTimeForInput(iso));
                  }
                }}
                className="mt-1 w-full rounded-lg border border-zinc-700 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500">
                Time (HH:mm)
              </label>
              <input
                type="text"
                placeholder="HH:mm"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                onBlur={() => {
                  const iso = parseDateAndTimeToISO(dateStr, timeStr);
                  if (iso) {
                    update("date", iso);
                    setDateStr(formatDateForInput(iso));
                    setTimeStr(formatTimeForInput(iso));
                  }
                }}
                className="mt-1 w-full rounded-lg border border-zinc-700 px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-500">Type</label>
            <select
              value={form.type}
              onChange={(e) => update("type", e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 px-3 py-2"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-500">Asset</label>
              <input
                value={form.asset}
                onChange={(e) => update("asset", e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-700 px-3 py-2"
              />
              {errors.asset && (
                <p className="mt-1 text-xs text-red-400">{errors.asset}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-zinc-500">Currency</label>
              <select
                value={form.currency ?? "CHF"}
                onChange={(e) => {
                  const next = e.target.value === "USD" ? "USD" : "CHF";
                  setForm((f) => ({
                    ...f,
                    currency: next,
                    fx_pair:
                      next === "USD"
                        ? (f.fx_pair ?? "USD/CHF")
                        : undefined,
                    fx_rate: next === "USD" ? f.fx_rate : undefined,
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-zinc-700 px-3 py-2"
              >
                <option value="CHF">CHF</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          {(form.currency ?? "CHF") === "USD" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-500">FX pair</label>
                <select
                  value={form.fx_pair ?? "USD/CHF"}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      fx_pair: e.target.value === "CHF/USD" ? "CHF/USD" : "USD/CHF",
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-700 px-3 py-2"
                >
                  <option value="USD/CHF">USD/CHF</option>
                  <option value="CHF/USD">CHF/USD</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-500">FX rate at trade time</label>
                <input
                  type="text"
                  value={
                    rawFxRate ??
                    (form.fx_rate ? formatNumberForInput(form.fx_rate, 8) : "")
                  }
                  onChange={(e) =>
                    {
                      setRawFxRate(e.target.value);
                      setForm((f) => ({
                        ...f,
                        fx_rate: europeanToDecimalString(e.target.value) || "",
                      }));
                    }
                  }
                  onBlur={() => setRawFxRate(null)}
                  placeholder="e.g. 0,88"
                  className="mt-1 w-full rounded-lg border border-zinc-700 px-3 py-2"
                />
                {errors.fx_rate && (
                  <p className="mt-1 text-xs text-red-400">{errors.fx_rate}</p>
                )}
              </div>
            </div>
          )}

          {convertedTotalChf !== null && (
            <p className="text-xs text-zinc-500">
              Converted total (CHF): {formatNumberForInput(String(convertedTotalChf), 8)}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-500">Amount</label>
              <input
                value={rawAmount ?? formatNumberForInput(form.amount)}
                onChange={(e) => {
                  setRawAmount(e.target.value);
                  updateNumber("amount", e.target.value);
                }}
                onBlur={() => blurNumber("amount", setRawAmount)}
                placeholder="0,5"
                className="mt-1 w-full rounded-lg border border-zinc-700 px-3 py-2"
              />
              {errors.amount && (
                <p className="mt-1 text-xs text-red-400">{errors.amount}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-500">
                Price per unit
              </label>
              <input
                value={rawPrice ?? formatNumberForInput(form.price_per_unit)}
                onChange={(e) => {
                  setRawPrice(e.target.value);
                  updateNumber("price_per_unit", e.target.value);
                }}
                onBlur={() => blurNumber("price_per_unit", setRawPrice)}
                placeholder="1.234,56"
                className="mt-1 w-full rounded-lg border border-zinc-700 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500">Total value</label>
              <input
                value={rawTotal ?? formatNumberForInput(form.total_value)}
                onChange={(e) => {
                  setRawTotal(e.target.value);
                  updateNumber("total_value", e.target.value);
                }}
                onBlur={() => blurNumber("total_value", setRawTotal)}
                placeholder="1.234,56"
                className="mt-1 w-full rounded-lg border border-zinc-700 px-3 py-2"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-500">Fee</label>
              <input
                value={rawFee ?? formatNumberForInput(form.fee)}
                onChange={(e) => {
                  setRawFee(e.target.value);
                  updateNumber("fee", e.target.value);
                }}
                onBlur={() => blurNumber("fee", setRawFee)}
                placeholder="0,5"
                className="mt-1 w-full rounded-lg border border-zinc-700 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500">Fee asset</label>
              <input
                value={form.fee_asset}
                onChange={(e) => update("fee_asset", e.target.value)}
                placeholder="CHF, BNB, etc."
                className="mt-1 w-full rounded-lg border border-zinc-700 px-3 py-2"
              />
            </div>
          </div>
          {form.fee_asset.trim() &&
            !["CHF", "USD"].includes(form.fee_asset.toUpperCase()) && (
              <div>
                <label className="block text-xs text-zinc-500">
                  Price of {form.fee_asset} at transaction (in {form.currency ?? "CHF"}
                  )
                </label>
                <p className="mt-0.5 text-xs text-zinc-500">
                  When the fee is paid in another crypto (e.g. BNB on Binance),
                  enter the price of 1 {form.fee_asset} in {form.currency ?? "CHF"} at
                  transaction time so cost basis is correct.
                </p>
                <input
                  value={
                    rawFeePrice ??
                    (form.fee_price_per_unit
                      ? formatNumberForInput(form.fee_price_per_unit)
                      : "")
                  }
                  onChange={(e) => {
                    setRawFeePrice(e.target.value);
                    updateNumber("fee_price_per_unit", e.target.value);
                  }}
                  onBlur={() =>
                    blurNumber("fee_price_per_unit", setRawFeePrice)
                  }
                  placeholder="e.g. 300 or 1.234,56"
                  className="mt-1 w-full rounded-lg border border-zinc-700 px-3 py-2"
                />
                {errors.fee_price_per_unit && (
                  <p className="mt-1 text-xs text-red-400">
                    {errors.fee_price_per_unit}
                  </p>
                )}
              </div>
            )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-500">Wallet</label>
              <input
                value={form.wallet}
                onChange={(e) => update("wallet", e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-700 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500">Exchange</label>
              <input
                value={form.exchange}
                onChange={(e) => update("exchange", e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-700 px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-500">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-zinc-700 px-3 py-2"
            />
          </div>
          {errors.submit && (
            <p className="text-sm text-red-400">{errors.submit}</p>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
