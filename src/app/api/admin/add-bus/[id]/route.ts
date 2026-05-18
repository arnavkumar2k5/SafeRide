import pool from "@/lib/db";

import {
  NextResponse
} from "next/server";

export async function POST(
  req: Request
) {

  try {

    const {
      busNumber
    } = await req.json();

    if (!busNumber) {

      return NextResponse.json(
        {
          error:
            "Bus Number Required",
        },
        {
          status: 400,
        }
      );
    }

    await pool.query(
      `
      INSERT INTO buses(
        id
      )

      VALUES($1)
      `,
      [busNumber]
    );

    return NextResponse.json({
      message:
        "Bus Added",
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