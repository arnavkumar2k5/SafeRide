import pool from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(req: Request) {
  try {
    // Get logged in admin
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get admin's school
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
        { error: "Admin has no school assigned" },
        { status: 400 }
      );
    }

    const { busNumber, routeId } = await req.json();

    if (
    !busNumber ||
    busNumber.trim() === "" ||
    !routeId
) {
    return NextResponse.json(
        { error: "Bus number and route are required" },
        { status: 400 }
    );
}

    // Duplicate check
    const exists = await pool.query(
      `
      SELECT id
      FROM buses
      WHERE bus_number = $1
      AND school_id = $2
      `,
      [busNumber.trim(), schoolId]
    );

    if (exists.rows.length > 0) {
      return NextResponse.json(
        { error: "Bus already exists" },
        { status: 409 }
      );
    }

    // Get first route of this school
    const validRoute = await pool.query(
  `
  SELECT id
  FROM routes
  WHERE id = $1
    AND school_id = $2
  `,
  [routeId, schoolId]
);

if (validRoute.rows.length === 0) {
  return NextResponse.json(
    { error: "Invalid route selected" },
    { status: 400 }
  );
}

    // Get first driver of this school (optional)
    const driverResult = await pool.query(
      `
      SELECT id
      FROM users
      WHERE role = 'driver'
      AND school_id = $1
      LIMIT 1
      `,
      [schoolId]
    );

    const driverId =
      driverResult.rows.length > 0
        ? driverResult.rows[0].id
        : null;

    // Insert bus
    const result = await pool.query(
      `
      INSERT INTO buses (
        id,
        school_id,
        route_id,
        driver_id,
        bus_number
      )
      VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4
      )
      RETURNING *
      `,
      [
        schoolId,
        routeId,
        driverId,
        busNumber.trim(),
      ]
    );

    return NextResponse.json(
      {
        message: "Bus Added Successfully",
        bus: result.rows[0],
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Add Bus Error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal Server Error",
      },
      {
        status: 500,
      }
    );
  }
}