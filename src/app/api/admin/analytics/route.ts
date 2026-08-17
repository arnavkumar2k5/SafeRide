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

    // TOTAL TRIPS: count completed bus runs for this school
    const trips = await pool.query(
      `
      SELECT COUNT(DISTINCT (ta.bus_id, ta.trip_date)) AS count
      FROM trip_attendance ta
      JOIN buses b ON ta.bus_id = b.id
      WHERE b.school_id = $1
        AND (
          b.trip_status = 'completed'
          OR (
            ta.status = 'dropped'
            AND NOT EXISTS (
              SELECT 1 FROM trip_attendance ta2
              WHERE ta2.bus_id = ta.bus_id
                AND ta2.trip_date = ta.trip_date
                AND ta2.status IN ('waiting', 'boarded', 'arrived_school')
            )
          )
        )
      `,
      [schoolId]
    );


const attendance = await pool.query(
  `
  SELECT
      COUNT(*) FILTER (WHERE status = 'boarded') AS boarded,
      COUNT(*) FILTER (WHERE status = 'dropped') AS dropped
  FROM trip_attendance
  WHERE school_id = $1
    AND trip_date = CURRENT_DATE
  `,
  [schoolId]
);

    // ACTIVE BUSES
    const activeBuses = await pool.query(
      `
      SELECT COUNT(*)
      FROM bus_locations
      JOIN buses
        ON bus_locations.bus_id = buses.id
      WHERE buses.school_id = $1
      `,
      [schoolId]
    );

    return NextResponse.json({
  totalTrips: trips.rows[0].count,
  boarded: attendance.rows[0].boarded,
  dropped: attendance.rows[0].dropped,
  activeBuses: activeBuses.rows[0].count,
});

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    );
  }
}