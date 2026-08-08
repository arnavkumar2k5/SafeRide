import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import pool from "@/lib/db";

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

    const { attendanceId } = await req.json();

    if (!attendanceId) {
      return NextResponse.json(
        { error: "attendanceId is required" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      UPDATE trip_attendance ta

      SET
        status = 'dropped',
        drop_time = NOW()

      FROM buses b

      WHERE ta.id = $1
        AND ta.bus_id = b.id
        AND b.driver_id = $2
        AND ta.trip_date = CURRENT_DATE
        AND ta.status = 'arrived_school'

      RETURNING
        ta.id,
        ta.student_id,
        ta.status,
        ta.pickup_time,
        ta.drop_time
      `,
      [attendanceId, driverId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          error:
            "Student is not ready to be dropped.",
        },
        { status: 400 }
      );
    }

    const attendance = result.rows[0];

    // Notify connected clients if Socket.IO is available.
    try {
      const io = (global as any).io;

      if (io) {
        io.emit("attendance-update", {
          attendanceId: attendance.id,
          studentId: attendance.student_id,
          status: "dropped",
          attendance,
        });
      }
    } catch (socketError) {
      console.error(
        "Socket notification failed:",
        socketError
      );
    }

    return NextResponse.json({
      success: true,
      attendance,
    });

  } catch (err) {
    console.error("Drop API error:", err);

    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    );
  }
}