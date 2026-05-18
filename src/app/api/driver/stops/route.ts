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
        SELECT DISTINCT

          stops.id,

          stops.name,

          stops.latitude,

          stops.longitude

        FROM students

        JOIN stops
        ON students.stop_id
          = stops.id

        WHERE students.bus_id=$1
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