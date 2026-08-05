import pool from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const admin = await pool.query(
      `
      SELECT school_id
      FROM users
      WHERE id = $1
      `,
      [session.user.id]
    );

    if (admin.rows.length === 0) {
      return NextResponse.json(
        { error: "Admin not found" },
        { status: 404 }
      );
    }

    const schoolId = admin.rows[0].school_id;

    const result = await pool.query(
  `
  SELECT
    s.name AS student_name,

    ta.status,

    TO_CHAR(ta.trip_date, 'YYYY-MM-DD') AS trip_date,

    ta.pickup_time,

    ta.drop_time,

    ta.created_at,

    b.id AS bus_id,

    b.bus_number,

    u.name AS driver_name

  FROM trip_attendance ta

  JOIN students s
  ON ta.student_id = s.id

  JOIN buses b
  ON ta.bus_id = b.id

  LEFT JOIN users u
  ON ta.driver_id = u.id

  WHERE ta.school_id = $1

  ORDER BY ta.trip_date DESC,
           COALESCE(ta.drop_time, ta.pickup_time, ta.created_at) DESC
  `,
  [schoolId]
);

    return NextResponse.json(result.rows);

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    );
  }
}