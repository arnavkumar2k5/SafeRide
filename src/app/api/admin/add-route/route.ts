import pool from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

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
      WHERE id=$1
      `,
      [session.user.id]
    );

    const schoolId = admin.rows[0].school_id;

    const { name } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: "Route name required" },
        { status: 400 }
      );
    }

    const exists = await pool.query(
      `
      SELECT id
      FROM routes
      WHERE school_id=$1
      AND name=$2
      `,
      [schoolId, name]
    );

    if (exists.rows.length > 0) {
      return NextResponse.json(
        { error: "Route already exists" },
        { status: 409 }
      );
    }

    await pool.query(
      `
      INSERT INTO routes(
        id,
        school_id,
        name
      )
      VALUES(
        gen_random_uuid(),
        $1,
        $2
      )
      `,
      [schoolId, name]
    );

    return NextResponse.json({
      message: "Route Added Successfully",
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    );
  }
}