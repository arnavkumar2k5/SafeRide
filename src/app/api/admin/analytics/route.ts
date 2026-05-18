import pool from "@/lib/db";

import {
  NextResponse
} from "next/server";

export async function GET() {

  try {

    // TOTAL TRIPS
    const trips =
      await pool.query(
        `
        SELECT COUNT(*)

        FROM trip_history
        `
      );

    // BOARDED
    const boarded =
      await pool.query(
        `
        SELECT COUNT(*)

        FROM student_status

        WHERE status='boarded'
        `
      );

    // DROPPED
    const dropped =
      await pool.query(
        `
        SELECT COUNT(*)

        FROM student_status
        WHERE status='dropped'
        `
      );

    // ACTIVE BUSES
    const activeBuses =
      await pool.query(
        `
        SELECT COUNT(*)

        FROM bus_locations
        `
      );

    return NextResponse.json({

      totalTrips:
        trips.rows[0].count,

      boarded:
        boarded.rows[0].count,

      dropped:
        dropped.rows[0].count,

      activeBuses:
        activeBuses.rows[0].count,
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        error:
          "Server Error",
      },
      {
        status: 500,
      }
    );
  }
}