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

    const { attendanceId } = await req.json();

    const driverId = session.user.id;

    const result = await pool.query(
      `
      UPDATE trip_attendance ta
      SET
        status='boarded',
        pickup_time=NOW()
      FROM buses b
      WHERE ta.id=$1
        AND ta.bus_id = b.id
        AND b.driver_id = $2
        AND ta.trip_date = CURRENT_DATE
        AND ta.status='waiting'
      RETURNING ta.*
      `,
      [attendanceId, driverId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Student not found, already boarded, or not assigned to your bus today." },
        { status: 400 }
      );
    }

    const io = (global as any).io;

    if (io) {
      io.emit("attendance-update", {
        attendanceId,
        studentId: result.rows[0].student_id,
        status: "boarded",
        attendance: result.rows[0],
      });
    }

    return NextResponse.json({
      success: true,
    });

  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    );
  }
}