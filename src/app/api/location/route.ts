import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Location endpoint is not configured" }, { status: 404 });
}
