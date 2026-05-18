import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {

    try {

        const result = await pool.query(`
            SELECT
                students.id,
                students.name AS student_name,

                students.parent_id,
                students.stop_id,

                users.name AS parent_name,
                users.email AS parent_email,

                buses.id AS bus_id,

                stops.name AS stop_name

            FROM students

            LEFT JOIN users
            ON students.parent_id = users.id

            LEFT JOIN buses
            ON students.bus_id = buses.id

            LEFT JOIN stops
            ON students.stop_id = stops.id
        `);

        return NextResponse.json(
            result.rows
        );

    } catch (error) {

        console.error(error);

        return NextResponse.json(
            { error: "Server Error" },
            { status: 500 }
        );
    }
}