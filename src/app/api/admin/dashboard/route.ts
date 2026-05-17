import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(){
    try {
        const buses = await pool.query(`
            SELECT buses.id, users.name AS driver_name
            FROM buses
            LEFT JOIN users
            ON buses.driver_id = users.id
        `);

        const drivers = await pool.query(`
            SELECT COUNT(*) FROM users
            WHERE role='driver'
        `);

        const students = await pool.query(`
            SELECT COUNT(*) FROM students
        `);

        return NextResponse.json({
            buses: buses.rows,
            totalDrivers: drivers.rows[0].count,
            totalStudents: students.rows[0].count,
        });
    } catch (error) {
        console.error(error);

        return NextResponse.json({error: "Server Error"}, {status: 500});
    }
}