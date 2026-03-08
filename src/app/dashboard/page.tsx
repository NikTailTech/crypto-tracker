"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import type { PortfolioSummary, AssetAllocationItem } from "@/types";

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#a855f7", "#ef4444", "#06b6d4"];

export default function DashboardPage() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [allocation, setAllocation] = useState<AssetAllocationItem[]>([]);
  const [currency, setCurrency] = useState("CHF");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/portfolio")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          throw new Error(data?.error ?? r.statusText ?? "Failed to load portfolio");
        }
        return data;
      })
      .then((data) => {
        setSummary(data.summary);
        setAllocation(data.allocation ?? []);
        setCurrency(data.currency ?? "CHF");
      })
      .catch((e) => setError(e?.message ?? "Failed to load portfolio"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-zinc-500">Loading portfolio…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-red-400">
        {error}
      </div>
    );
  }
  if (!summary) {
    return <p className="text-zinc-500">No portfolio data.</p>;
  }

  const strat = summary.by_strategy;
  const methods = ["fifo", "lifo", "average_cost"] as const;

  const positive = "text-emerald-400";
  const negative = "text-rose-400";

  return (
    <div className="min-w-0 space-y-8 pb-10 sm:space-y-10 sm:pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">
          Dashboard
        </h1>
        <Button
          variant="secondary"
          size="sm"
          className="shrink-0"
          onClick={() => window.open("/api/backup", "_blank")}
        >
          Export backup
        </Button>
      </div>

      {/* Overview — key metrics */}
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">
          Overview
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-xl ring-1 ring-zinc-800/50 sm:p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Total equity
            </p>
            <p className="mt-2 text-xl font-bold tracking-tight text-zinc-100 sm:text-2xl md:text-3xl">
              {formatCurrency(summary.total_equity, currency)}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-lg sm:p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Total profit
            </p>
            <p
              className={`mt-2 text-xl font-bold tracking-tight sm:text-2xl md:text-3xl ${
                parseFloat(summary.total_profit) >= 0 ? positive : negative
              }`}
            >
              {formatCurrency(summary.total_profit, currency)}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-lg sm:p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              ROI
            </p>
            <p
              className={`mt-2 text-xl font-bold tracking-tight sm:text-2xl md:text-3xl ${
                parseFloat(summary.roi_percent) >= 0 ? positive : negative
              }`}
            >
              {formatPercent(summary.roi_percent)}
            </p>
          </div>
        </div>
      </section>

      {/* Positions */}
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">
          Positions
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="transition hover:border-zinc-700">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Portfolio value
            </p>
            <p className="mt-1.5 text-xl font-semibold text-zinc-100">
              {formatCurrency(summary.total_value, currency)}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">Current holdings only</p>
          </Card>
          <Card className="transition hover:border-zinc-700">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Total invested
            </p>
            <p className="mt-1.5 text-xl font-semibold text-zinc-100">
              {formatCurrency(summary.total_invested, currency)}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">Cost basis of current positions</p>
          </Card>
          <Card className="transition hover:border-zinc-700">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Net invested
            </p>
            <p className="mt-1.5 text-xl font-semibold text-zinc-100">
              {formatCurrency(summary.net_total_invested, currency)}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">Cash in minus cash out</p>
          </Card>
        </div>
      </section>

      {/* P&L & costs */}
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">
          P&amp;L &amp; costs
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="transition hover:border-zinc-700">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Cash (realized)
            </p>
            <p
              className={`mt-1.5 text-xl font-semibold ${
                parseFloat(summary.realized_profit) >= 0 ? positive : negative
              }`}
            >
              {formatCurrency(summary.realized_profit, currency)}
            </p>
          </Card>
          <Card className="transition hover:border-zinc-700">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Unrealized P&amp;L
            </p>
            <p
              className={`mt-1.5 text-xl font-semibold ${
                parseFloat(summary.unrealized_profit) >= 0 ? positive : negative
              }`}
            >
              {formatCurrency(summary.unrealized_profit, currency)}
            </p>
          </Card>
          <Card className="transition hover:border-zinc-700">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Total P&amp;L
            </p>
            <p
              className={`mt-1.5 text-xl font-semibold ${
                parseFloat(summary.realized_profit) + parseFloat(summary.unrealized_profit) >= 0
                  ? positive
                  : negative
              }`}
            >
              {formatCurrency(
                String(
                  parseFloat(summary.realized_profit) + parseFloat(summary.unrealized_profit)
                ),
                currency
              )}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">Realized + unrealized</p>
          </Card>
          <Card className="transition hover:border-zinc-700">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Fees paid
            </p>
            <p className="mt-1.5 text-xl font-semibold text-zinc-400">
              {formatCurrency(summary.fees_paid, currency)}
            </p>
          </Card>
        </div>
      </section>

      {/* Holdings by asset */}
      {allocation.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">
            Holdings
          </h2>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[200px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-700 text-zinc-400">
                    <th className="pb-2 pr-3 font-medium sm:pb-3 sm:pr-4">Asset</th>
                    <th className="pb-2 font-medium sm:pb-3">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {allocation.map((a) => (
                    <tr
                      key={a.symbol}
                      className="border-b border-zinc-800/80 transition hover:bg-zinc-800/30"
                    >
                      <td className="py-2 pr-3 font-medium text-zinc-200 sm:py-3 sm:pr-4">
                        {a.symbol}
                      </td>
                      <td className="py-2 text-zinc-300 sm:py-3">
                        {formatNumber(a.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      )}

      {/* Charts */}
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">
          Charts
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:gap-6">
          <Card title="Asset allocation" className="overflow-hidden">
            {allocation.length === 0 ? (
              <p className="text-zinc-500 text-sm">No holdings</p>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                <div className="h-36 w-36 shrink-0 self-center sm:h-44 sm:w-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocation.map((a, i) => ({
                          name: a.symbol,
                          value: parseFloat(a.value),
                          color: COLORS[i % COLORS.length],
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={64}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {allocation.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number | undefined) =>
                          v != null ? formatCurrency(String(v), currency) : ""
                        }
                        contentStyle={{
                          backgroundColor: "#18181b",
                          border: "1px solid #27272a",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex min-w-0 flex-1 flex-wrap justify-center gap-2 sm:justify-start sm:gap-3">
                  {allocation.map((a, i) => (
                    <div
                      key={a.symbol}
                      className="flex min-w-0 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-800/30 px-2.5 py-1.5 sm:px-3 sm:py-2"
                      style={{
                        borderLeftWidth: "3px",
                        borderLeftColor: COLORS[i % COLORS.length],
                      }}
                    >
                      <span className="truncate font-medium text-zinc-200">
                        {a.symbol}
                      </span>
                      <span className="shrink-0 text-xs text-zinc-500 sm:text-sm">
                        {formatCurrency(a.value, currency)} (
                        {formatPercent(a.percent)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </section>

      {/* Strategy comparison */}
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">
          Cost basis methods
        </h2>
        <Card title="Strategy comparison">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-zinc-400">
                <th className="pb-2 pr-3 font-medium sm:pb-2 sm:pr-4">Method</th>
                <th className="pb-2 pr-3 font-medium sm:pb-2 sm:pr-4">Realized P&amp;L</th>
                <th className="pb-2 pr-3 font-medium sm:pb-2 sm:pr-4">Unrealized P&amp;L</th>
                <th className="pb-2 font-medium sm:pb-2">Fees paid</th>
              </tr>
            </thead>
            <tbody>
              {methods.map((m) => (
                <tr
                  key={m}
                  className="border-b border-zinc-800/80 transition hover:bg-zinc-800/30"
                >
                  <td className="py-2 pr-3 font-medium text-zinc-200 capitalize sm:py-3 sm:pr-4">
                    {m.replace("_", " ")}
                  </td>
                  <td
                    className={`py-2 pr-3 sm:py-3 sm:pr-4 ${
                      parseFloat(strat[m].total_realized_gain_loss) >= 0
                        ? positive
                        : negative
                    }`}
                  >
                    {formatCurrency(
                      strat[m].total_realized_gain_loss,
                      currency
                    )}
                  </td>
                  <td
                    className={`py-2 pr-3 sm:py-3 sm:pr-4 ${
                      parseFloat(strat[m].total_unrealized_gain_loss) >= 0
                        ? positive
                        : negative
                    }`}
                  >
                    {formatCurrency(
                      strat[m].total_unrealized_gain_loss,
                      currency
                    )}
                  </td>
                  <td className="py-2 text-zinc-400 sm:py-3">
                    {formatCurrency(strat[m].total_fees_paid, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </Card>
      </section>
    </div>
  );
}
