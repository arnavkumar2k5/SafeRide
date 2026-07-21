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
    console.log("Logged in user:", session.user);
    
    const adminResult = await pool.query(
      `
      SELECT school_id
      FROM users
      WHERE id = $1
      `,
      [session.user.id]
    );
    
    if (adminResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Admin not found" },
        { status: 404 }
      );
    }
    
    const schoolId = adminResult.rows[0].school_id;
    console.log("School ID:", schoolId);

    console.log("Logged in:", session.user.email);
    console.log("School:", schoolId);

    const buses = await pool.query(
      `
      SELECT
        buses.id,
        buses.bus_number,
        users.name AS driver_name
      FROM buses
      LEFT JOIN users
      ON buses.driver_id = users.id
      WHERE buses.school_id = $1
      `,
      [schoolId]
    );

    console.log("Buses:", buses.rows);

    const drivers = await pool.query(
      `
      SELECT COUNT(*)
      FROM users
      WHERE role='driver'
      AND school_id=$1
      `,
      [schoolId]
    );

    const students = await pool.query(
      `
      SELECT COUNT(*)
      FROM students
      WHERE school_id=$1
      `,
      [schoolId]
    );

    return NextResponse.json({
      buses: buses.rows,
      totalDrivers: drivers.rows[0].count,
      totalStudents: students.rows[0].count,
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    );
  }
}