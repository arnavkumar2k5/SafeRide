import pool from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const admin = await pool.query(
      `
      SELECT school_id
      FROM users
      WHERE id = $1
      `,
      [session.user.id]
    );

    if (admin.rows.length === 0) {
      return NextResponse.json(
        { error: "Admin not found" },
        { status: 404 }
      );
    }

    const schoolId = admin.rows[0].school_id;

    const {
      name,
      email,
      password,
    } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "All fields required" },
        { status: 400 }
      );
    }

    const existing = await pool.query(
      `
      SELECT id
      FROM users
      WHERE email = $1
      `,
      [email]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: "Driver already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `
      INSERT INTO users (
        name,
        email,
        password,
        role,
        school_id
      )
      VALUES (
        $1,
        $2,
        $3,
        'driver',
        $4
      )
      `,
      [
        name,
        email,
        hashedPassword,
        schoolId,
      ]
    );

    return NextResponse.json({
      message: "Driver Added",
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    );
  }
}