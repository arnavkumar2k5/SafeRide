import { NextResponse, NextRequest } from "next/server";
import pool from "@/lib/db";
import bcrypt from "bcrypt";

export async function POST(req: NextRequest) {
    try {
        const { name, email, password, role } = await req.json();

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users(name, email, password, role)
            VALUES($1, $2, $3, $4)
            RETURNING id, email, role`,
            [name, email, hashedPassword, role]
        );

        return NextResponse.json({
            message: "User registered",
            user: result.rows[0],
        });

    } catch (error: any) {
        console.error(error);

        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}