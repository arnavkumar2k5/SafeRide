import pool from "@/lib/db";

import {
  NextResponse
} from "next/server";
import bcrypt from "bcryptjs";

export async function POST(
  req: Request
) {

  try {

    const {

      name,
      email,
      password,

    } = await req.json();

    if (
      !name ||
      !email ||
      !password
    ) {

      return NextResponse.json(
        {
          error:
            "All fields required",
        },
        {
          status: 400,
        }
      );
    }

    // CHECK EXISTING
    const existing =
      await pool.query(
        `
        SELECT id

        FROM users

        WHERE email=$1
        `,
        [email]
      );

    if (
      existing.rows.length > 0
    ) {

      return NextResponse.json(
        {
          error:
            "Driver already exists",
        },
        {
          status: 400,
        }
      );
    }

    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );

    await pool.query(
      `
      INSERT INTO users(

        name,
        email,
        password,
        role

      )

      VALUES(
        $1,
        $2,
        $3,
        'driver'
      )
      `,
      [
        name,
        email,
        hashedPassword,
      ]
    );

    return NextResponse.json({
      message:
        "Driver Added",
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        error:
          "Server Error",
      },
      {
        status: 500,
      }
    );
  }
}