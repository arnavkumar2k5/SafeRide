import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {

    try {

        // Get all parents
        const parents = await pool.query(`
            SELECT id, name, email
            FROM users
            WHERE role='parent'
        `);

        // Get all buses
        const buses = await pool.query(`
            SELECT id
            FROM buses
        `);

        // Get all stops
        const stops = await pool.query(`
            SELECT id, name
            FROM stops
        `);

        return NextResponse.json({
            parents: parents.rows,
            buses: buses.rows,
            stops: stops.rows,
        });

    } catch (error) {

        console.error(error);

        return NextResponse.json(
            { error: "Server Error" },
            { status: 500 }
        );
    }
}