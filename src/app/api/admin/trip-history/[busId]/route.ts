import pool from "@/lib/db";

import {
  NextResponse
} from "next/server";

export async function GET(
  req: Request,

  {
    params,
  }: {
    params: Promise<{
      busId: string;
    }>;
  }
) {

  try {

    const {
      busId
    } = await params;

    const result =
      await pool.query(
        `
        SELECT
          lat,
          lng,
          created_at

        FROM trip_history

        WHERE bus_id=$1

        ORDER BY created_at ASC
        `,
        [busId]
      );

    return NextResponse.json(
      result.rows
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