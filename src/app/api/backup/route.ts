import { NextResponse } from "next/server";
import { exportBackup } from "@/lib/storage";

export async function GET() {
  try {
    const backup = await exportBackup();
    const blob = JSON.stringify(
      { exported_at: new Date().toISOString(), ...backup },
      null,
      2
    );
    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="crypto-tracker-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to export backup" },
      { status: 500 }
    );
  }
}
