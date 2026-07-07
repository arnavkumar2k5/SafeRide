import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(){
    try {
        const drivers = await pool.query(`
            SELECT id, name, email FROM users WHERE role='driver'
        `);

        const buses = await pool.query(`
            SELECT id, bus_number FROM buses
        `);

        return NextResponse.json({
            drivers: drivers.rows,
            buses: buses.rows,
        });
    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { error: "Server Error" },
            { status: 500 }
        );
    }
}