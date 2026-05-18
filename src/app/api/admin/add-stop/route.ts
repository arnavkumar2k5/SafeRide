import pool from "@/lib/db";

import {
  NextResponse
} from "next/server";

export async function POST(
  req: Request
) {

  try {

    const {

      name,
      lat,
      lng,

    } = await req.json();

    if (
      !name ||
      lat === undefined ||
      lng === undefined
    ) {

      return NextResponse.json(
        {
          error:
            "All fields required",
        },
        {
          status: 400,
        }
      );
    }

    await pool.query(
      `
      INSERT INTO stops(

        name,
        latitude,
        longitude

      )

      VALUES(
        $1,
        $2,
        $3
      )
      `,
      [
        name,
        lat,
        lng,
      ]
    );

    return NextResponse.json({
      message:
        "Stop Added",
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