import { NextResponse, NextRequest } from "next/server";
import pool from "@/lib/db";
import bcrypt from "bcrypt";

export async function POST(req: NextRequest){
    try {
        const {name, email, password} = await req.json();

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users(name, email, password, role)
            VALUES($1, $2, $3, 'admin')
            RETURNING id, email`, [name, email, hashedPassword]
        );

        return NextResponse.json({
            message: "School/Admin registered",
            user: result.rows[0],
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Error" }, { status: 500 });
    }
}