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

        let result;
    if (session.user.role === "parent") {
      result = await pool.query(
        `
        SELECT
          schools.id,
          schools.name,
          schools.latitude,
          schools.longitude
        FROM schools
        INNER JOIN students
          ON students.school_id = schools.id
        WHERE students.parent_id = $1
        LIMIT 1
        `,
        [session.user.id]
      );
    } else {
      result = await pool.query(
        `
        SELECT
          schools.id,
          schools.name,
          schools.latitude,
          schools.longitude
        FROM schools
        INNER JOIN users
          ON users.school_id = schools.id
        WHERE users.id = $1
        `,
        [session.user.id]
      );
    }

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "School not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    );
  }
}