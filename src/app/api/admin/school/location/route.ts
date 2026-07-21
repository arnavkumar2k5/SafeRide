import pool from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { latitude, longitude } = await req.json();

    if (
      latitude === undefined ||
      longitude === undefined
    ) {
      return NextResponse.json(
        { error: "Latitude and Longitude required" },
        { status: 400 }
      );
    }

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

    if (!schoolId) {
      return NextResponse.json(
        { error: "No school assigned." },
        { status: 400 }
      );
    }

    await pool.query(
      `
      UPDATE schools
      SET
        latitude = $1,
        longitude = $2
      WHERE id = $3
      `,
      [
        latitude,
        longitude,
        schoolId,
      ]
    );

    return NextResponse.json({
      message: "School location updated",
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    );
  }
}