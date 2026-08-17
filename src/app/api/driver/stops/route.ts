import { getServerSession } from "next-auth";

import { authOptions }
from "../../auth/[...nextauth]/route";

import { NextResponse }
from "next/server";

import pool from "@/lib/db";

export async function GET() {

  try {

    const session =
      await getServerSession(
        authOptions
      );

    if (!session) {

      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const driverId =
      session.user.id;

    const busResult =
      await pool.query(
        `
        SELECT id

        FROM buses

        WHERE driver_id=$1
        `,
        [driverId]
      );

    if (
      busResult.rows.length === 0
    ) {

      return NextResponse.json(
        []
      );
    }

    const busId =
      busResult.rows[0].id;

    const stops =
      await pool.query(
        `
        SELECT
          stops.id,
          stops.name,
          stops.stop_order,
          ST_Y(stops.location::geometry) AS lat,
          ST_X(stops.location::geometry) AS lng
        FROM stops
        JOIN buses ON stops.route_id = buses.route_id
        WHERE buses.id = $1
        ORDER BY stops.stop_order ASC;
        `,
        [busId]
      );

    return NextResponse.json(
      stops.rows
    );

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