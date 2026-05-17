import pool from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(req: NextRequest){
    try {
        const session = await getServerSession(authOptions);
        if(!session){
            return NextResponse.json(
                {error: "Unauthorized"},
                {status: 401}
            );
        }

        const {name, parentId, busId, stopId} = await req.json();


        const adminResult = await pool.query(`SELECT school_id FROM users WHERE id=$1`, [session.user.id]);

        const schoolId = adminResult.rows[0].school_id;
        
        await pool.query(`
            INSERT INTO students(name, school_id, parent_id, bus_id, stop_id) Values($1, $2, $3, $4, $5)`, [name, schoolId, parentId, busId, stopId]);

        return NextResponse.json({
            message: "Students Added",
        });
    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { error: "Server Error" },
            { status: 500 }
        );
    }
}