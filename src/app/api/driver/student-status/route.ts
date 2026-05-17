import pool from "@/lib/db";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { studentId, status } = await req.json();

    await pool.query(
      `
      INSERT INTO student_status(
        student_id,
        status
      )

      VALUES($1, $2)
      `,
      [studentId, status],
    );

    return NextResponse.json({
      message: "Status updated",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Server Error",
      },
      {
        status: 500,
      },
    );
  }
}
