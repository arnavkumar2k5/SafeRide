import pool from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../.../../../auth/[...nextauth]/route";

export async function GET(req: Request) {
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
      WHERE id=$1
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

    const { searchParams } = new URL(req.url);

    const date =
      searchParams.get("date") ??
      new Date().toISOString().split("T")[0];

    const busId = searchParams.get("busId");

    let query = `
      SELECT
        th.bus_id,
        b.bus_number,
        th.lat,
        th.lng,
        th.created_at
      FROM trip_history th
      JOIN buses b
        ON th.bus_id = b.id
      WHERE
        b.school_id=$1
        AND DATE(th.created_at)=$2
    `;

    const values: any[] = [schoolId, date];

    if (busId) {
      query += ` AND th.bus_id=$3`;
      values.push(busId);
    }

    query += `
      ORDER BY
      th.bus_id,
      th.created_at ASC
    `;

    const result = await pool.query(query, values);

    return NextResponse.json(result.rows);

  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    );
  }
}