import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import pool from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const school = await pool.query(
      `
      SELECT school_id
      FROM users
      WHERE email=$1
      `,
      [session.user.email]
    );

    if (school.rows.length === 0) {
      return NextResponse.json([]);
    }

    const schoolId = school.rows[0].school_id;

    const result = await pool.query(
      `
      SELECT
        s.id,
        s.name,
        s.stop_order,
        r.name AS route_name,
        ST_Y(s.location::geometry) AS lat,
        ST_X(s.location::geometry) AS lng
      FROM stops s
      JOIN routes r
        ON s.route_id=r.id
      WHERE r.school_id=$1
      ORDER BY r.name,s.stop_order
      `,
      [schoolId]
    );

    return NextResponse.json(result.rows);

  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Failed" },
      { status: 500 }
    );
  }
}