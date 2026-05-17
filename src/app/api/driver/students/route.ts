import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const driverId = session.user.id;

    const busResult = pool.query(`SELECT id FROM buses WHERE driver_id=$1`, [
      driverId,
    ]);

    if ((await busResult).rows.length === 0) return NextResponse.json([]);

    const busId = (await busResult).rows[0].id;

    const students = await pool.query(
      `SELECT id, name FROM students WHERE bus_id=$1`,
      [busId],
    );

    return NextResponse.json(students.rows);
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
