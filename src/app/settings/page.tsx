"use client";

import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { Settings } from "@/types";
import {
  applyAppTheme,
  applyPlatformColor,
  PLATFORM_COLORS,
  PLATFORM_COLOR_PALETTES,
  type PlatformColor,
} from "@/lib/theme";

interface ExchangeRates {
  "CHF/USD": string;
  "USD/CHF": string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({
    "CHF/USD": "",
    "USD/CHF": "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const backupInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/exchange-rates").then((r) => r.json()),
    ])
      .then(([settingsData, ratesData]) => {
        const typedSettings = settingsData as Settings;
        setSettings(typedSettings);
        applyPlatformColor(typedSettings.platform_color);
        applyAppTheme(typedSettings.theme);
        setExchangeRates({
          "CHF/USD": String((ratesData as Record<string, unknown>)["CHF/USD"] ?? ""),
          "USD/CHF": String((ratesData as Record<string, unknown>)["USD/CHF"] ?? ""),
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
    if (key === "platform_color") {
      applyPlatformColor(value as PlatformColor);
    }
    if (key === "theme") {
      applyAppTheme(value as Settings["theme"]);
    }
  };

  const updateRate = (pair: keyof ExchangeRates, value: string) => {
    setExchangeRates((prev) => ({ ...prev, [pair]: value }));
  };

  const toColorLabel = (color: PlatformColor) =>
    color
      .split("_")
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join(" ");

  const syncInverse = (pair: keyof ExchangeRates) => {
    const raw = exchangeRates[pair].trim().replace(",", ".");
    const num = parseFloat(raw);
    if (!Number.isFinite(num) || num <= 0) return;
    const inverse = String(1 / num);
    if (pair === "CHF/USD") {
      setExchangeRates((prev) => ({ ...prev, "USD/CHF": inverse }));
    } else {
      setExchangeRates((prev) => ({ ...prev, "CHF/USD": inverse }));
    }
  };

  const addToList = (key: "wallets" | "exchanges", value: string) => {
    if (!settings || !value.trim()) return;
    const list = [...settings[key], value.trim()];
    setSettings({ ...settings, [key]: list });
  };

  const removeFromList = (key: "wallets" | "exchanges", index: number) => {
    if (!settings) return;
    const list = settings[key].filter((_, i) => i !== index);
    setSettings({ ...settings, [key]: list });
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const [settingsRes, ratesRes] = await Promise.all([
        fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        }),
        fetch("/api/exchange-rates", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(exchangeRates),
        }),
      ]);
      const [settingsData, ratesData] = await Promise.all([
        settingsRes.json(),
        ratesRes.json(),
      ]);
      if (settingsRes.ok && ratesRes.ok) {
        setMessage("Settings saved.");
      } else {
        const sErr = (settingsData as { error?: string }).error;
        const rErr = (ratesData as { error?: string }).error;
        setMessage(sErr ?? rErr ?? "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-zinc-500">Loading settings…</p>
      </div>
    );
  }
  if (!settings) {
    return <p className="text-zinc-500">No settings.</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
      {message && (
        <p
          className={
            message.startsWith("Settings saved")
              ? "text-(--accent)"
              : "text-red-400"
          }
        >
          {message}
        </p>
      )}

      <Card title="Exchange rates">
        <p className="mb-3 text-xs text-zinc-500">
          Used to convert mixed-currency transactions and prices to CHF.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-zinc-500">CHF/USD</label>
            <input
              value={exchangeRates["CHF/USD"]}
              onChange={(e) => updateRate("CHF/USD", e.target.value)}
              onBlur={() => syncInverse("CHF/USD")}
              placeholder="e.g. 0,78"
              className="mt-1 w-full rounded-lg border border-zinc-700 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500">USD/CHF</label>
            <input
              value={exchangeRates["USD/CHF"]}
              onChange={(e) => updateRate("USD/CHF", e.target.value)}
              onBlur={() => syncInverse("USD/CHF")}
              placeholder="e.g. 1,282051"
              className="mt-1 w-full rounded-lg border border-zinc-700 px-3 py-2"
            />
          </div>
        </div>
      </Card>

      <Card title="Backup &amp; restore">
        <div className="flex flex-wrap gap-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.open("/api/backup", "_blank")}
          >
            Export backup (JSON)
          </Button>
          <input
            ref={backupInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setImporting(true);
              setMessage(null);
              try {
                const text = await file.text();
                const body = JSON.parse(text);
                const res = await fetch("/api/import", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    transactions: body.transactions ?? body.data?.transactions,
                    settings: body.settings ?? body.data?.settings,
                  }),
                });
                const data = await res.json();
                if (res.ok) {
                  setMessage(
                    `Imported ${data.transactions?.imported ?? 0} transactions; settings: ${data.settings ? "yes" : "no"}.`,
                  );
                  if (data.settings && data.transactions?.imported === 0) {
                    const sRes = await fetch("/api/settings");
                    const s = (await sRes.json()) as Settings;
                    setSettings(s);
                    applyPlatformColor(s.platform_color);
                    applyAppTheme(s.theme);
                  }
                } else {
                  setMessage(data.error ?? "Import failed");
                }
              } catch (err) {
                setMessage(err instanceof Error ? err.message : "Invalid file");
              } finally {
                setImporting(false);
                e.target.value = "";
              }
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            disabled={importing}
            onClick={() => backupInputRef.current?.click()}
          >
            {importing ? "Importing…" : "Import backup (JSON)"}
          </Button>
        </div>
      </Card>

      <Card title="General">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-500">
              Default currency
            </label>
            <input
              value={settings.default_currency}
              onChange={(e) => update("default_currency", e.target.value)}
              className="mt-1 w-full max-w-xs rounded-lg border border-zinc-700 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500">
              Cost basis method
            </label>
            <select
              value={settings.cost_basis_method}
              onChange={(e) =>
                update(
                  "cost_basis_method",
                  e.target.value as Settings["cost_basis_method"],
                )
              }
              className="mt-1 w-full max-w-xs rounded-lg border border-zinc-700 px-3 py-2"
            >
              <option value="fifo">FIFO</option>
              <option value="lifo">LIFO</option>
              <option value="average_cost">Average cost</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500">Theme</label>
            <select
              value={settings.theme}
              onChange={(e) =>
                update("theme", e.target.value as Settings["theme"])
              }
              className="mt-1 w-full max-w-xs rounded-lg border border-zinc-700 px-3 py-2"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500">Platform color</label>
            <div className="mt-2 flex max-w-xs items-center gap-3">
              <span
                aria-hidden="true"
                className="h-4 w-4 shrink-0 rounded-sm border border-zinc-700"
                style={{
                  backgroundColor:
                    PLATFORM_COLOR_PALETTES[settings.platform_color].accent,
                }}
              />
              <select
                value={settings.platform_color}
                onChange={(e) =>
                  update("platform_color", e.target.value as PlatformColor)
                }
                className="w-full rounded-lg border border-zinc-700 px-3 py-2"
              >
                {PLATFORM_COLORS.map((color) => (
                  <option key={color} value={color}>
                    {toColorLabel(color)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Wallets">
        <ul className="space-y-2">
          {settings.wallets.map((w, i) => (
            <li key={w} className="flex items-center gap-2">
              <span className="text-zinc-300">{w}</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-400"
                onClick={() => removeFromList("wallets", i)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            placeholder="New wallet name"
            className="flex-1 rounded-lg border border-zinc-700 px-3 py-2 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const target = e.target as HTMLInputElement;
                addToList("wallets", target.value);
                target.value = "";
              }
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              const input = (e.target as HTMLElement)
                .previousElementSibling as HTMLInputElement;
              if (input) {
                addToList("wallets", input.value);
                input.value = "";
              }
            }}
          >
            Add
          </Button>
        </div>
      </Card>

      <Card title="Exchanges">
        <ul className="space-y-2">
          {settings.exchanges.map((ex, i) => (
            <li key={ex} className="flex items-center gap-2">
              <span className="text-zinc-300">{ex}</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-400"
                onClick={() => removeFromList("exchanges", i)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            placeholder="New exchange name"
            className="flex-1 rounded-lg border border-zinc-700 px-3 py-2 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const target = e.target as HTMLInputElement;
                addToList("exchanges", target.value);
                target.value = "";
              }
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              const input = (e.target as HTMLElement)
                .previousElementSibling as HTMLInputElement;
              if (input) {
                addToList("exchanges", input.value);
                input.value = "";
              }
            }}
          >
            Add
          </Button>
        </div>
      </Card>
    </div>
  );
}
