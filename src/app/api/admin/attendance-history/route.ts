import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await pool.query(`
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

      ORDER BY student_status.updated_at DESC
    `);

    return NextResponse.json(result.rows);

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    );
  }
}