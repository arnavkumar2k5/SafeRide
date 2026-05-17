import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await pool.query(`
            SELECT
                buses.id AS bus_id,

                users.name AS driver_name,

                ST_Y(
                  bus_locations.location::geometry
                ) AS lat,

                ST_X(
                  bus_locations.location::geometry
                ) AS lng

            FROM buses

            LEFT JOIN users
            ON buses.driver_id = users.id

            LEFT JOIN bus_locations
            ON buses.id = bus_locations.bus_id
`);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error(error);

    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
