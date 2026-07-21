import pool from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { busId, driverId } = await req.json();

    if (!busId || !driverId) {
      return NextResponse.json(
        { error: "Bus and Driver are required" },
        { status: 400 }
      );
    }

    // Check if driver is already assigned to another bus
    const existing = await pool.query(
      `
      SELECT id, bus_number
      FROM buses
      WHERE driver_id = $1
        AND id <> $2
      `,
      [driverId, busId]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        {
          error: `Driver is already assigned to bus ${existing.rows[0].bus_number}`,
        },
        { status: 409 }
      );
    }

    await pool.query(
      `
      UPDATE buses
      SET driver_id = $1
      WHERE id = $2
      `,
      [driverId, busId]
    );

    return NextResponse.json({
      message: "Driver assigned successfully",
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    );
  }
}