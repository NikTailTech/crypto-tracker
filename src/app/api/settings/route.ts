import { NextResponse } from "next/server";
import { readSettings, writeSettings } from "@/lib/storage";
import { validateSettings } from "@/lib/schemas";

export async function GET() {
  try {
    const settings = await readSettings();
    return NextResponse.json(settings);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to read settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const settings = validateSettings(body);
    await writeSettings(settings);
    return NextResponse.json(settings);
  } catch (e) {
    if (e instanceof Error && "issues" in e) {
      return NextResponse.json(
        { error: "Validation failed", details: (e as { issues: unknown }).issues },
        { status: 400 }
      );
    }
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
