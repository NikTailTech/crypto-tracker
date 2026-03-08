import { NextResponse } from "next/server";
import { readTransactions, writeTransactions, readSettings, writeSettings } from "@/lib/storage";
import { validateTransaction } from "@/lib/schemas";
import { validateSettings } from "@/lib/schemas";
import type { Transaction } from "@/types";
import type { Settings } from "@/types";

interface BackupPayload {
  transactions?: unknown[];
  settings?: unknown;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BackupPayload;
    const results = { transactions: { imported: 0, skipped: 0, errors: [] as string[] }, settings: false };

    if (Array.isArray(body.transactions)) {
      const existing = await readTransactions();
      const existingIds = new Set(existing.map((t) => t.id));
      const toWrite: Transaction[] = [...existing];

      for (let i = 0; i < body.transactions.length; i++) {
        try {
          const tx = validateTransaction(body.transactions[i]);
          if (existingIds.has(tx.id)) {
            results.transactions.skipped++;
            continue;
          }
          existingIds.add(tx.id);
          toWrite.push(tx);
          results.transactions.imported++;
        } catch (err) {
          results.transactions.errors.push(
            `Row ${i + 1}: ${err instanceof Error ? err.message : "Invalid transaction"}`
          );
        }
      }
      await writeTransactions(toWrite);
    }

    if (body.settings && typeof body.settings === "object") {
      try {
        const settings = validateSettings(body.settings) as Settings;
        await writeSettings(settings);
        results.settings = true;
      } catch {
        results.settings = false;
      }
    }

    return NextResponse.json(results);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Invalid import payload" },
      { status: 400 }
    );
  }
}
