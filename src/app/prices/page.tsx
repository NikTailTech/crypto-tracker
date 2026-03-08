"use client";

import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { PricesWithCurrencyMap } from "@/lib/storage";

export default function PricesPage() {
  const [prices, setPrices] = useState<PricesWithCurrencyMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const newSymbolRef = useRef<HTMLInputElement>(null);
  const newPriceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/prices")
      .then((r) => r.json())
      .then((data: PricesWithCurrencyMap) => {
        setPrices(typeof data === "object" && data !== null ? data : {});
      })
      .finally(() => setLoading(false));
  }, []);

  const updatePrice = (symbol: string, value: string) => {
    setPrices((prev) => ({
      ...prev,
      [symbol]: { ...(prev[symbol] ?? { currency: "CHF" as const }), value },
    }));
  };

  const updateCurrency = (symbol: string, currency: "CHF" | "USD") => {
    setPrices((prev) => ({
      ...prev,
      [symbol]: { ...(prev[symbol] ?? { value: "" }), currency },
    }));
  };

  const removePrice = (symbol: string) => {
    setPrices((prev) => {
      const next = { ...prev };
      delete next[symbol];
      return next;
    });
  };

  const addPrice = () => {
    const symbol = newSymbolRef.current?.value?.trim().toUpperCase();
    const price = newPriceRef.current?.value?.trim();
    if (!symbol) return;
    setPrices((prev) => ({
      ...prev,
      [symbol]: { value: price ?? "", currency: "CHF" },
    }));
    if (newSymbolRef.current) newSymbolRef.current.value = "";
    if (newPriceRef.current) newPriceRef.current.value = "";
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/prices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prices),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Prices saved.");
      } else {
        setMessage((data as { error?: string }).error ?? "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-zinc-500">Loading prices…</p>
      </div>
    );
  }

  const entries = Object.entries(prices).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">Prices</h1>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
      {message && (
        <p
          className={
            message.startsWith("Prices saved")
              ? "text-green-400"
              : "text-red-400"
          }
        >
          {message}
        </p>
      )}

      <Card title="Current prices">
        <p className="text-sm text-zinc-500 mb-4">
          Edit prices per coin and set whether each quote is in CHF or USD.
          Used for portfolio valuation.
        </p>
        {entries.length === 0 ? (
          <p className="text-zinc-500">No prices yet. Add one below.</p>
        ) : (
          <ul className="space-y-3">
            {entries.map(([symbol, entry]) => (
              <li
                key={symbol}
                className="flex flex-wrap items-center gap-2 sm:gap-4"
              >
                <span className="font-mono font-medium text-zinc-200 w-16 sm:w-20">
                  {symbol}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={entry.value}
                  onChange={(e) => updatePrice(symbol, e.target.value)}
                  placeholder="0"
                  className="flex-1 min-w-[100px] max-w-[200px] rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-zinc-100 placeholder:text-zinc-500"
                />
                <select
                  value={entry.currency}
                  onChange={(e) =>
                    updateCurrency(symbol, e.target.value === "USD" ? "USD" : "CHF")
                  }
                  className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100"
                >
                  <option value="CHF">CHF</option>
                  <option value="USD">USD</option>
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300"
                  onClick={() => removePrice(symbol)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 pt-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 mb-2">Add a coin</p>
          <div className="flex flex-wrap gap-2">
            <input
              ref={newSymbolRef}
              type="text"
              placeholder="Symbol (e.g. SOL)"
              className="w-24 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm placeholder:text-zinc-500"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addPrice();
                }
              }}
            />
            <input
              ref={newPriceRef}
              type="text"
              inputMode="decimal"
              placeholder="Price"
              className="w-28 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm placeholder:text-zinc-500"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addPrice();
                }
              }}
            />
            <Button variant="secondary" size="sm" onClick={addPrice}>
              Add
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
