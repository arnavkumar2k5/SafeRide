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

    // Parents
    const parents = await pool.query(
      `
      SELECT id, name, email
      FROM users
      WHERE role = 'parent'
      AND school_id = $1
      `,
      [schoolId]
    );

    // Buses
    const buses = await pool.query(
      `
      SELECT id
      FROM buses
      WHERE school_id = $1
      `,
      [schoolId]
    );

    // Stops
    const stops = await pool.query(
      `
      SELECT id, name
      FROM stops
      WHERE school_id = $1
      `,
      [schoolId]
    );

    return NextResponse.json({
      parents: parents.rows,
      buses: buses.rows,
      stops: stops.rows,
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    );
  }
}