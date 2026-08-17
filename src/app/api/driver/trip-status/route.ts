import pool from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { status } = await req.json();

    const allowed = [
      "idle",
      "pickup",
      "at_school",
      "drop",
      "completed",
    ];

    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    const driverId = session.user.id;

    const result = await pool.query(
      `
      UPDATE buses
      SET trip_status = $1
      WHERE driver_id = $2
      RETURNING id, bus_number, trip_status
      `,
      [status, driverId]
    );

    const busId = result.rows[0].id;

    // When starting a new trip run (pickup), reset today's demo attendance and stop progress
    if (status === "pickup") {
      await pool.query(
        `
        UPDATE trip_attendance
        SET status = 'waiting',
            pickup_time = NULL,
            drop_time = NULL
        WHERE bus_id = $1
          AND trip_date = CURRENT_DATE
        `,
        [busId]
      );

      await pool.query(
        `
        DELETE FROM trip_stop_progress
        WHERE bus_id = $1
          AND trip_date = CURRENT_DATE
        `,
        [busId]
      );
    }

    try {
      const io = (global as any).io;
      if (io) {
        io.emit("trip-status-update", {
          busId: result.rows[0].id,
          tripStatus: status,
        });
      }
    } catch (socketError) {
      console.error("Socket notification failed:", socketError);
    }

    return NextResponse.json(result.rows[0]);

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    );
  }
}