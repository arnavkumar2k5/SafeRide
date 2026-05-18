import pool from "@/lib/db";

import {
  NextResponse
} from "next/server";

export async function PUT(

  req: Request,

  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {

  try {

    const {
      id
    } = await params;

    const {
      driverId
    } = await req.json();

    await pool.query(
      `
      UPDATE buses

      SET
        driver_id=$1

      WHERE id=$2
      `,
      [
        driverId,
        id,
      ]
    );

    return NextResponse.json({
      message:
        "Bus Updated",
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