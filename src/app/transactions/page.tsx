"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import type { Transaction, TransactionType } from "@/types";
import { TransactionForm } from "@/components/transactions/TransactionForm";

const TYPES: TransactionType[] = [
  "buy",
  "sell",
  "swap",
  "transfer",
  "staking_reward",
  "airdrop",
  "fee_only",
];

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [assetFilter, setAssetFilter] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "asset" | "total_value">(
    "date",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchTx = () => {
    fetch("/api/transactions")
      .then((r) => r.json())
      .then(setTransactions)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTx();
  }, []);

  const filtered = useMemo(() => {
    let list = [...transactions];
    if (typeFilter) list = list.filter((t) => t.type === typeFilter);
    if (assetFilter)
      list = list.filter((t) =>
        t.asset.toLowerCase().includes(assetFilter.toLowerCase()),
      );
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "date")
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      else if (sortBy === "asset") cmp = a.asset.localeCompare(b.asset);
      else cmp = parseFloat(a.total_value) - parseFloat(b.total_value);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [transactions, typeFilter, assetFilter, sortBy, sortDir]);

  const assets = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.asset))).sort(),
    [transactions],
  );

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this transaction?")) return;
    const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    if (res.ok) fetchTx();
  };

  const handleSave = () => {
    setShowForm(false);
    setEditing(null);
    fetchTx();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-zinc-500">Loading transactions…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-zinc-100">Transactions</h1>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowForm(true)}
          >
            Import CSV
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            Add transaction
          </Button>
        </div>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap gap-4">
          <div>
            <label className="block text-xs text-zinc-500">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="mt-1 rounded-lg border border-zinc-700 px-3 py-2 text-sm"
            >
              <option value="">All</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500">Asset</label>
            <input
              type="text"
              value={assetFilter}
              onChange={(e) => setAssetFilter(e.target.value)}
              placeholder="Filter by symbol"
              className="mt-1 rounded-lg border border-zinc-700 px-3 py-2 text-sm w-40"
            />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-xs text-zinc-500">Sort</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm"
            >
              <option value="date">Date</option>
              <option value="asset">Asset</option>
              <option value="total_value">Value</option>
            </select>
            <button
              type="button"
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
            >
              {sortDir === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-zinc-400">
                <th className="pb-2 pr-4 font-medium">Date</th>
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 pr-4 font-medium">Asset</th>
                <th className="pb-2 pr-4 font-medium">Amount</th>
                <th className="pb-2 pr-4 font-medium">Price</th>
                <th className="pb-2 pr-4 font-medium">Total</th>
                <th className="pb-2 pr-4 font-medium">Fee</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => (
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
                  <td className="py-3 pr-4 font-medium">
                    <Link
                      href={`/assets/${encodeURIComponent(tx.asset)}`}
                      className="text-green-400 hover:underline"
                    >
                      {tx.asset}
                    </Link>
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
                  <td className="py-3 pr-4 text-zinc-500">
                    {formatCurrency(tx.fee)}
                  </td>
                  <td className="py-3 flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(tx);
                        setShowForm(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:bg-red-500/20"
                      onClick={() => handleDelete(tx.id)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="py-8 text-center text-zinc-500">
            No transactions match filters.
          </p>
        )}
      </Card>

      {showForm && (
        <TransactionForm
          transaction={editing ?? undefined}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={handleSave}
          onImportSuccess={handleSave}
        />
      )}
    </div>
  );
}
