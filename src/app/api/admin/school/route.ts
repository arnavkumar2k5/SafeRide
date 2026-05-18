import pool from "@/lib/db";

import {
  NextResponse
} from "next/server";

export async function GET() {

  try {

    const result =
      await pool.query(
        `
        SELECT *

        FROM school_settings

        LIMIT 1
        `
      );

    return NextResponse.json(
      result.rows[0]
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