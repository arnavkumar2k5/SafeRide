import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import pool from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const result = await pool.query(
      `SELECT 
  students.name AS student_name,
  buses.id AS bus_id,
  stops.name AS stop_name,
  ST_Y(stops.location::geometry) AS stop_lat,
  ST_X(stops.location::geometry) AS stop_lng,
  users.name AS driver_name
FROM students
JOIN buses ON students.bus_id = buses.id
JOIN stops ON students.stop_id = stops.id
JOIN users ON buses.driver_id = users.id
WHERE students.parent_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "No student found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}