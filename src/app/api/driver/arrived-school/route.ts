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

    const result = await pool.query(
      `
      UPDATE trip_attendance
      SET status = 'arrived_school'
      WHERE
        bus_id = $1
        AND trip_date = CURRENT_DATE
        AND status = 'boarded'
      RETURNING id, student_id, status, pickup_time, drop_time
      `,
      [bus.rows[0].id]
    );

    try {
      const io = (global as any).io;
      if (io) {
        for (const row of result.rows) {
          io.emit("attendance-update", {
            attendanceId: row.id,
            studentId: row.student_id,
            status: "arrived_school",
            attendance: row,
          });
        }
      }
    } catch (socketError) {
      console.error("Socket notification failed:", socketError);
    }

    return NextResponse.json({
      success: true,
      updatedCount: result.rowCount,
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    );
  }
}