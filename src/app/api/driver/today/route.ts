import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import pool from "@/lib/db";

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
      SELECT id, school_id, trip_status
      FROM buses
      WHERE driver_id=$1
      `,
      [driverId]
    );

    if (busResult.rows.length === 0) {
      return NextResponse.json(
        { error: "No bus assigned." },
        { status: 404 }
      );
    }

    const bus = busResult.rows[0];

    // Check if today's attendance exists
    await pool.query(
  `
  INSERT INTO trip_attendance
  (
    school_id,
    bus_id,
    driver_id,
    student_id,
    trip_date,
    status
  )

  SELECT
    s.school_id,
    s.bus_id,
    $1,
    s.id,
    CURRENT_DATE,
    'waiting'

  FROM students s

  WHERE s.bus_id = $2

  AND NOT EXISTS (
    SELECT 1
    FROM trip_attendance ta
    WHERE ta.student_id = s.id
      AND ta.bus_id = s.bus_id
      AND ta.trip_date = CURRENT_DATE
  )
  `,
  [driverId, bus.id]
);

    const today = await pool.query(
      `
      SELECT

ta.id,

ta.student_id,

s.name AS student_name,

st.id AS stop_id,

st.stop_order,

st.name AS stop_name,

ta.status,

ta.pickup_time,

ta.drop_time

      FROM trip_attendance ta

      JOIN students s
      ON ta.student_id=s.id

      JOIN stops st
      ON s.stop_id=st.id

      WHERE

      ta.bus_id=$1

      AND ta.trip_date=CURRENT_DATE

      ORDER BY st.stop_order
      `,
      [bus.id]
    );

    return NextResponse.json({
      students: today.rows,
      trip_status: bus.trip_status || "idle",
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
