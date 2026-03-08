import { NextResponse } from "next/server";
import { readTransactions, writeTransactions } from "@/lib/storage";
import type { Transaction } from "@/types";
import { validateTransaction, validateTransactionPartial } from "@/lib/schemas";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const transactions = await readTransactions();
    const tx = transactions.find((t) => t.id === id);
    if (!tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    return NextResponse.json(tx);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to read transaction" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const transactions = await readTransactions();
    const filtered = transactions.filter((t) => t.id !== id);
    if (filtered.length === transactions.length) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }
    await writeTransactions(filtered);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = validateTransactionPartial(
      (await request.json()) as Partial<Transaction>
    );
    const transactions = await readTransactions();
    const index = transactions.findIndex((t) => t.id === id);
    if (index === -1) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }
    const updated = validateTransaction({ ...transactions[index], ...body, id });
    transactions[index] = updated;
    await writeTransactions(transactions);
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Error && "issues" in e) {
      return NextResponse.json(
        { error: "Validation failed", details: (e as { issues: unknown }).issues },
        { status: 400 }
      );
    }
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 }
    );
  }
}
