import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import pool from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const { name, stopOrder, lat, lng } = await request.json();

    if (
  !name ||
  stopOrder === undefined ||
  lat === undefined ||
  lng === undefined
) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const schoolResult = await pool.query(
      `
      SELECT school_id
      FROM users
      WHERE email = $1
      `,
      [session.user.email]
    );

    if (schoolResult.rows.length === 0) {
      return NextResponse.json(
        { error: "School not found" },
        { status: 404 }
      );
    }

    const schoolId = schoolResult.rows[0].school_id;

    const stopResult = await pool.query(
      `
      SELECT s.id
      FROM stops s
      JOIN routes r
        ON s.route_id = r.id
      WHERE
        s.id = $1
        AND r.school_id = $2
      `,
      [id, schoolId]
    );

    if (stopResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Stop not found" },
        { status: 404 }
      );
    }

    await pool.query(
  `
  UPDATE stops
  SET
      name = $1,
      stop_order = $2,
      location = ST_SetSRID(
        ST_MakePoint($3, $4),
        4326
      )::geography
  WHERE id = $5
  `,
  [
    name,
    stopOrder,
    lng, // longitude FIRST
    lat, // latitude SECOND
    id,
  ]
);

    return NextResponse.json({
      message: "Stop updated successfully",
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to update stop" },
      { status: 500 }
    );
  }
}