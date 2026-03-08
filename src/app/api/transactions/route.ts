import { NextResponse } from "next/server";
import { readTransactions, writeTransactions } from "@/lib/storage";
import { validateTransaction } from "@/lib/schemas";

export async function GET() {
  try {
    const transactions = await readTransactions();
    return NextResponse.json(transactions);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to read transactions" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const transaction = validateTransaction(body);
    const transactions = await readTransactions();
    if (transactions.some((t) => t.id === transaction.id)) {
      return NextResponse.json(
        { error: "Transaction with this ID already exists" },
        { status: 409 }
      );
    }
    transactions.push(transaction);
    await writeTransactions(transactions);
    return NextResponse.json(transaction, { status: 201 });
  } catch (e) {
    if (e instanceof Error && "issues" in e) {
      return NextResponse.json(
        { error: "Validation failed", details: (e as { issues: unknown }).issues },
        { status: 400 }
      );
    }
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const transaction = validateTransaction(body);
    const transactions = await readTransactions();
    const index = transactions.findIndex((t) => t.id === transaction.id);
    if (index === -1) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }
    transactions[index] = transaction;
    await writeTransactions(transactions);
    return NextResponse.json(transaction);
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
