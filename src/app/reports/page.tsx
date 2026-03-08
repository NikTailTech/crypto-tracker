"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/format";
import type { RealizedEvent } from "@/types";

interface TaxReport {
  year: number;
  method: string;
  events: RealizedEvent[];
  total_short_term_gain: string;
  total_long_term_gain: string;
  total_fees: string;
  currency: string;
}

export default function ReportsPage() {
  const [report, setReport] = useState<TaxReport | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  const years = Array.from(
    { length: 10 },
    (_, i) => new Date().getFullYear() - i,
  );

  const fetchReport = () => {
    setLoading(true);
    fetch(`/api/reports/tax?year=${year}`)
      .then((r) => r.json())
      .then((data) => {
        setReport(data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReport();
  }, [year]);

  const downloadCsv = () => {
    window.open(`/api/reports/export?year=${year}&format=csv`, "_blank");
  };

  const downloadJson = () => {
    window.open(`/api/reports/export?year=${year}&format=json`, "_blank");
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-zinc-100">Reports</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-500">Year</label>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <Button variant="secondary" size="sm" onClick={downloadCsv}>
            Export CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={downloadJson}>
            Download report (JSON)
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-zinc-500">Loading report…</p>
      ) : report ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                Tax year
              </p>
              <p className="mt-1 text-xl font-semibold">{report.year}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                Cost basis method
              </p>
              <p className="mt-1 text-xl font-semibold capitalize">
                {report.method.replace("_", " ")}
              </p>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                Short-term gain/loss
              </p>
              <p
                className={`mt-1 text-xl font-semibold ${
                  parseFloat(report.total_short_term_gain) >= 0
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {formatCurrency(report.total_short_term_gain, report.currency)}
              </p>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                Long-term gain/loss
              </p>
              <p
                className={`mt-1 text-xl font-semibold ${
                  parseFloat(report.total_long_term_gain) >= 0
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {formatCurrency(report.total_long_term_gain, report.currency)}
              </p>
            </Card>
          </div>

          <Card title="Taxable events">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-700 text-zinc-400">
                    <th className="pb-2 pr-4 font-medium">Date</th>
                    <th className="pb-2 pr-4 font-medium">Asset</th>
                    <th className="pb-2 pr-4 font-medium">Amount</th>
                    <th className="pb-2 pr-4 font-medium">Cost basis</th>
                    <th className="pb-2 pr-4 font-medium">Proceeds</th>
                    <th className="pb-2 font-medium">Realized P&amp;L</th>
                  </tr>
                </thead>
                <tbody>
                  {report.events.map((e) => (
                    <tr
                      key={e.id}
                      className="border-b border-zinc-800/80 hover:bg-zinc-800/30"
                    >
                      <td className="py-3 pr-4 text-zinc-300">
                        {formatDate(e.date)}
                      </td>
                      <td className="py-3 pr-4 font-medium text-zinc-200">
                        {e.asset}
                      </td>
                      <td className="py-3 pr-4 text-zinc-300">{e.amount}</td>
                      <td className="py-3 pr-4 text-zinc-300">
                        {formatCurrency(e.cost_basis, report.currency)}
                      </td>
                      <td className="py-3 pr-4 text-zinc-300">
                        {formatCurrency(e.proceeds, report.currency)}
                      </td>
                      <td
                        className={`py-3 ${
                          parseFloat(e.realized_gain_loss) >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {formatCurrency(e.realized_gain_loss, report.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {report.events.length === 0 && (
              <p className="py-6 text-center text-zinc-500">
                No taxable events for {report.year}.
              </p>
            )}
          </Card>
        </>
      ) : (
        <p className="text-zinc-500">No report data.</p>
      )}
    </div>
  );
}
