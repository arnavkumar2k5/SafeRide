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

    const result = await pool.query(
      `
      UPDATE trip_attendance
      SET
        status='boarded',
        pickup_time=NOW()
      WHERE
        id=$1
        AND status='waiting'
      RETURNING *
      `,
      [attendanceId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Student already boarded." },
        { status: 400 }
      );
    }

    const io = (global as any).io;

if (io) {
  io.emit("attendance-update", {
    attendanceId,
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