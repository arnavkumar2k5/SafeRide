import pool from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await pool.query(
    `SELECT school_id FROM users WHERE id=$1`,
    [session.user.id]
  );

  const schoolId = admin.rows[0].school_id;

  const routes = await pool.query(
    `
    SELECT id, name
    FROM routes
    WHERE school_id=$1
    ORDER BY name
    `,
    [schoolId]
  );

  return NextResponse.json(routes.rows);
}