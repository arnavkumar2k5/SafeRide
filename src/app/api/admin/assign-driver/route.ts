import pool from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest){
    try {
        const {busId, driverId} = await req.json();

        await pool.query(`
            UPDATE buses
            SET driver_id=$1
            WHERE id=$2
        `, [driverId, busId]);

        return NextResponse.json({
            message: "Driver Assgined",
        });
    } catch (error) {
        console.error(error);

        return NextResponse.json(
            {error: "Server Error"}, {status: 500}
        );
    }
}