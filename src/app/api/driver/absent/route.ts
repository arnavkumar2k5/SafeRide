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

    console.log("ABSENT REQUEST:", {
      attendanceId,
      driverId,
    });

    if (!attendanceId) {
      return NextResponse.json(
        { error: "attendanceId is required" },
        { status: 400 }
      );
    }

    // First verify that this attendance belongs
    // to the driver's bus.
    const attendanceCheck = await pool.query(
      `
      SELECT
        ta.id,
        ta.student_id,
        ta.status,
        ta.bus_id,
        ta.trip_date
      FROM trip_attendance ta
      JOIN buses b
        ON b.id = ta.bus_id
      WHERE ta.id = $1
        AND b.driver_id = $2
        AND ta.trip_date = CURRENT_DATE
      `,
      [attendanceId, driverId]
    );

    console.log("ATTENDANCE CHECK:", attendanceCheck.rows);

    if (attendanceCheck.rows.length === 0) {
      return NextResponse.json(
        {
          error:
            "Attendance record not found for this driver's bus.",
        },
        { status: 404 }
      );
    }

    const attendance = attendanceCheck.rows[0];

    if (attendance.status !== "waiting") {
      return NextResponse.json(
        {
          error: `Student is already ${attendance.status}.`,
        },
        { status: 400 }
      );
    }

    // Mark student absent.
    const result = await pool.query(
      `
      UPDATE trip_attendance
      SET status = 'absent'
      WHERE id = $1
      RETURNING
        id,
        student_id,
        status,
        pickup_time,
        drop_time
      `,
      [attendanceId]
    );

    console.log("ABSENT UPDATE:", result.rows);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Failed to update attendance." },
        { status: 500 }
      );
    }

    const updatedAttendance = result.rows[0];

    // Socket notification is optional.
    // Don't let Socket.IO cause the API to fail.
    try {
      const io = (global as any).io;

      if (io) {
        io.emit("attendance-update", {
          attendanceId: updatedAttendance.id,
          studentId: updatedAttendance.student_id,
          status: "absent",
          attendance: updatedAttendance,
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
      attendance: updatedAttendance,
    });

  } catch (err: any) {
    console.error("ABSENT API ERROR:", err);

    return NextResponse.json(
      {
        error: err?.message || "Server Error",
      },
      { status: 500 }
    );
  }
}