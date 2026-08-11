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

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Bus not assigned" },
        { status: 404 }
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