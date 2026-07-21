import pool from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";

export async function GET(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      busId: string;
    }>;
  }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { busId } = await params;

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

    // Verify this bus belongs to this school
    const bus = await pool.query(
      `
      SELECT id
      FROM buses
      WHERE id = $1
      AND school_id = $2
      `,
      [busId, schoolId]
    );

    if (bus.rows.length === 0) {
      return NextResponse.json(
        { error: "Bus not found" },
        { status: 404 }
      );
    }

    const result = await pool.query(
      `
      SELECT
        lat,
        lng,
        created_at
      FROM trip_history
      WHERE bus_id = $1
      ORDER BY created_at ASC
      `,
      [busId]
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