import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Student endpoint is not configured" }, { status: 404 });
}
