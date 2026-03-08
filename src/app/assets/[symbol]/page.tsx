"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import type { Transaction } from "@/types";
import type { UnrealizedHolding } from "@/types";

export default function AssetPage() {
  const params = useParams();
  const symbol = decodeURIComponent((params.symbol as string) ?? "");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [holding, setHolding] = useState<UnrealizedHolding | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!symbol) return;
    Promise.all([
      fetch("/api/transactions").then((r) => r.json()),
      fetch("/api/portfolio").then((r) => r.json()),
    ])
      .then(([txList, portfolio]) => {
        setTransactions(
          (txList as Transaction[]).filter(
            (t) => t.asset.toUpperCase() === symbol.toUpperCase(),
          ),
        );
        const h = (
          portfolio.allocation as {
            symbol: string;
            amount: string;
            value: string;
          }[]
        )?.find((a) => a.symbol.toUpperCase() === symbol.toUpperCase());
        const unrealized = (
          portfolio.summary?.by_strategy?.fifo?.unrealized_holdings as
            | UnrealizedHolding[]
            | undefined
        )?.find((u) => u.asset.toUpperCase() === symbol.toUpperCase());
        setHolding(unrealized ?? null);
      })
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-zinc-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/transactions"
          className="rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
        >
          ← Transactions
        </Link>
        <h1 className="text-2xl font-bold text-zinc-100">{symbol}</h1>
      </div>

      {holding && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Balance
            </p>
            <p className="mt-1 text-xl font-semibold">
              {formatNumber(holding.amount)}
            </p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Cost basis
            </p>
            <p className="mt-1 text-xl font-semibold text-zinc-300">
              {formatCurrency(holding.cost_basis)}
            </p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Current value
            </p>
            <p className="mt-1 text-xl font-semibold text-zinc-100">
              {formatCurrency(holding.current_value)}
            </p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Unrealized P&amp;L
            </p>
            <p
              className={`mt-1 text-xl font-semibold ${
                parseFloat(holding.unrealized_gain_loss) >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {formatCurrency(holding.unrealized_gain_loss)}
            </p>
          </Card>
        </div>
      )}

      <Card title="Transactions">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-zinc-400">
                <th className="pb-2 pr-4 font-medium">Date</th>
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 pr-4 font-medium">Amount</th>
                <th className="pb-2 pr-4 font-medium">Price</th>
                <th className="pb-2 pr-4 font-medium">Total</th>
                <th className="pb-2 font-medium">Fee</th>
              </tr>
            </thead>
            <tbody>
              {transactions
                .sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime(),
                )
                .map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-zinc-800/80 hover:bg-zinc-800/30"
                  >
                    <td className="py-3 pr-4 text-zinc-300">
                      {formatDate(tx.date)}
                    </td>
                    <td className="py-3 pr-4 capitalize text-zinc-300">
                      {tx.type.replace("_", " ")}
                    </td>
                    <td className="py-3 pr-4 text-zinc-300">
                      {formatNumber(tx.amount)}
                    </td>
                    <td className="py-3 pr-4 text-zinc-300">
                      {formatCurrency(tx.price_per_unit)}
                    </td>
                    <td className="py-3 pr-4 text-zinc-300">
                      {formatCurrency(tx.total_value)}
                    </td>
                    <td className="py-3 text-zinc-500">
                      {formatCurrency(tx.fee)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {transactions.length === 0 && (
          <p className="py-6 text-center text-zinc-500">
            No transactions for this asset.
          </p>
        )}
      </Card>
    </div>
  );
}
