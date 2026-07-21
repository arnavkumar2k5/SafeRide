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

    const result = await pool.query(
      `
      SELECT
    buses.id AS bus_id,
    buses.bus_number,

    users.name AS driver_name,

    routes.name AS route_name,

    ST_Y(bus_locations.location::geometry) AS lat,
    ST_X(bus_locations.location::geometry) AS lng,

    bus_locations.speed,

    bus_locations.updated_at

FROM buses

LEFT JOIN users
ON buses.driver_id = users.id

LEFT JOIN routes
ON buses.route_id = routes.id

LEFT JOIN bus_locations
ON buses.id = bus_locations.bus_id

WHERE buses.school_id = $1
      `,
      [schoolId]
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