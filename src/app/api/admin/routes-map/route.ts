import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import pool from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const school = await pool.query(
      `
      SELECT school_id
      FROM users
      WHERE email=$1
      `,
      [session.user.email],
    );

    if (school.rows.length === 0) {
      return NextResponse.json([]);
    }

    const schoolId = school.rows[0].school_id;
    const schoolLocation = await pool.query(
  `
  SELECT
    latitude,
    longitude
  FROM schools
  WHERE id = $1
  `,
  [schoolId]
);

const schoolLat = Number(schoolLocation.rows[0].latitude);
const schoolLng = Number(schoolLocation.rows[0].longitude);

    const result = await pool.query(
      `
      SELECT
    b.id AS bus_id,
    b.bus_number,
    r.id AS route_id,
    r.name AS route_name,
    s.id AS stop_id,
s.name AS stop_name,
ST_Y(s.location::geometry) AS lat,
    ST_X(s.location::geometry) AS lng,
    s.stop_order
      FROM buses b
      JOIN routes r
        ON b.route_id = r.id
      JOIN stops s
        ON s.route_id = r.id
      WHERE b.school_id = $1
      ORDER BY
        b.bus_number,
        s.stop_order
      `,
      [schoolId],
    );

    const routes: Record<string, any> = {};

    for (const row of result.rows) {
      if (!routes[row.bus_id]) {
        routes[row.bus_id] = {
  busId: row.bus_id,
  busNumber: row.bus_number,
  routeId: row.route_id,
  routeName: row.route_name,
  coordinates: [[schoolLat, schoolLng]],
  stops: [],
};
      }

      const lat = Number(row.lat);
      const lng = Number(row.lng);

      routes[row.bus_id].coordinates.push([lat, lng]);

      routes[row.bus_id].stops.push({
        id: row.stop_id,
        name: row.stop_name,
        stopOrder: row.stop_order,
        lat,
        lng,
      });
    }

    return NextResponse.json(Object.values(routes));
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Failed to load routes" },
      { status: 500 },
    );
  }
}
