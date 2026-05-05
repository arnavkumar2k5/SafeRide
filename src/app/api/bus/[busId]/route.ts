import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ busId: string }> }
) {
  try {
    // ✅ FIX: await params
    const { busId } = await params;

    if (!busId) {
      return NextResponse.json({ error: "No busId" }, { status: 400 });
    }

    const result = await pool.query(
  `SELECT 
    ST_Y(bl.location::geometry) AS lat,
    ST_X(bl.location::geometry) AS lng,
    b.id AS bus_id,
    u.name AS driver_name
   FROM bus_locations bl
   JOIN buses b ON bl.bus_id = b.id
   JOIN users u ON b.driver_id = u.id
   WHERE bl.bus_id = $1`,
  [busId]
);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "No location found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}