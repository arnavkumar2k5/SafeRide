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
        students.name AS student_name,
        student_status.status,
        student_status.updated_at,

        buses.id AS bus_id,
        buses.bus_number,

        users.name AS driver_name

      FROM student_status

      JOIN students
        ON student_status.student_id = students.id

      JOIN buses
        ON students.bus_id = buses.id

      LEFT JOIN users
        ON buses.driver_id = users.id

      WHERE students.school_id = $1

      ORDER BY student_status.updated_at DESC
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