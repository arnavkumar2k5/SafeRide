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
        students.id,
        students.name AS student_name,

        students.parent_id,
        students.stop_id,

        users.name AS parent_name,
        users.email AS parent_email,

        buses.id AS bus_id,
        buses.bus_number,

        stops.name AS stop_name

      FROM students

      LEFT JOIN users
        ON students.parent_id = users.id

      LEFT JOIN buses
        ON students.bus_id = buses.id

      LEFT JOIN stops
        ON students.stop_id = stops.id

      WHERE students.school_id = $1
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