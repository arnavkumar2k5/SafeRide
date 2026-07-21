import { NextResponse, NextRequest } from "next/server";
import pool from "@/lib/db";
import bcrypt from "bcrypt";

export async function POST(req: NextRequest) {
  const client = await pool.connect();

  try {
    const { name, email, password, role } = await req.json();

    const hashedPassword = await bcrypt.hash(password, 10);

    await client.query("BEGIN");

    let schoolId = null;

    if (role === "admin") {
      const schoolResult = await client.query(
        `
        INSERT INTO schools (id, name)
        VALUES (gen_random_uuid(), $1)
        RETURNING id
        `,
        [`${name}'s School`] // Later you can replace this with a schoolName field
      );

      schoolId = schoolResult.rows[0].id;
    }

    const result = await client.query(
      `
      INSERT INTO users (
        name,
        email,
        password,
        role,
        school_id
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, role, school_id
      `,
      [name, email, hashedPassword, role, schoolId]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      message: "User registered",
      user: result.rows[0],
    });

  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error(error);

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}