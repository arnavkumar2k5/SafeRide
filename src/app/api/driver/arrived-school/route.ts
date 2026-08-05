import pool from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const driverId = session.user.id;

    const bus = await pool.query(
      `
      SELECT id
      FROM buses
      WHERE driver_id = $1
      `,
      [driverId]
    );

    if (bus.rows.length === 0) {
      return NextResponse.json(
        { error: "Bus not found" },
        { status: 404 }
      );
    }

    await pool.query(
      `
      UPDATE trip_attendance
      SET status = 'arrived_school'
      WHERE
        bus_id = $1
        AND trip_date = CURRENT_DATE
        AND status = 'boarded'
      `,
      [bus.rows[0].id]
    );

    return NextResponse.json({
      success: true,
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    );
  }
}