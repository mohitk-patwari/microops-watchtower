import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";

export async function GET() {
  try {
    const db = await connectToDatabase();
    await db.command({ ping: 1 });
    return NextResponse.json({
      ok: true,
      message: "MongoDB connection OK",
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 }
    );
  }
}