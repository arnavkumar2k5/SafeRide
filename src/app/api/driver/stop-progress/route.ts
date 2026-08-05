import pool from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

// GET -> Return today's completed stops for this driver's bus
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const driverId = session.user.id;

    // Find driver's bus
    const busResult = await pool.query(
      `
      SELECT id
      FROM buses
      WHERE driver_id = $1
      `,
      [driverId]
    );

    if (busResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Bus not assigned" },
        { status: 404 }
      );
    }

    const busId = busResult.rows[0].id;

    const progress = await pool.query(
      `
      SELECT stop_id
      FROM trip_stop_progress
      WHERE
        bus_id = $1
        AND trip_date = CURRENT_DATE
      ORDER BY completed_at ASC
      `,
      [busId]
    );

    return NextResponse.json({
      completedStops: progress.rows.map(
        (row) => row.stop_id
      ),
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    );
  }
}


// POST -> Save one completed stop
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const driverId = session.user.id;

    const { stopId } = await req.json();

    if (!stopId) {
      return NextResponse.json(
        { error: "stopId is required" },
        { status: 400 }
      );
    }

    const busResult = await pool.query(
      `
      SELECT id
      FROM buses
      WHERE driver_id = $1
      `,
      [driverId]
    );

    if (busResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Bus not assigned" },
        { status: 404 }
      );
    }

    const busId = busResult.rows[0].id;

    await pool.query(
      `
      INSERT INTO trip_stop_progress
      (
        bus_id,
        stop_id,
        trip_date
      )
      VALUES
      (
        $1,
        $2,
        CURRENT_DATE
      )
      ON CONFLICT
      (
        bus_id,
        stop_id,
        trip_date
      )
      DO NOTHING
      `,
      [busId, stopId]
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