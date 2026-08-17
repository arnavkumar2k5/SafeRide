import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import pool from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await pool.query(
      `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.school_id,
        s.name AS school_name
      FROM users u
      LEFT JOIN schools s ON u.school_id = s.id
      WHERE u.id = $1
      `,
      [session.user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: result.rows[0],
    });
  } catch (error: any) {
    console.error("Error fetching account details:", error);
    return NextResponse.json(
      { error: "Failed to fetch account profile" },
      { status: 500 }
    );
  }
}
