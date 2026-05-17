import pool from "@/lib/db";

import {
  NextResponse
} from "next/server";

import {
  getServerSession
} from "next-auth";

import { authOptions }
from "../../auth/[...nextauth]/route";

export async function GET() {

  try {

    const session =
      await getServerSession(
        authOptions
      );

    if (!session) {

      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const parentId =
      session.user.id;

    // FIND STUDENT
    const studentResult =
      await pool.query(
        `
        SELECT
          id,
          name

        FROM students

        WHERE parent_id=$1
        `,
        [parentId]
      );

    if (
      studentResult.rows.length === 0
    ) {

      return NextResponse.json(
        []
      );
    }

    const student =
      studentResult.rows[0];

    // HISTORY
    const history =
      await pool.query(
        `
        SELECT
          status,
          updated_at

        FROM student_status

        WHERE student_id=$1

        ORDER BY updated_at DESC
        `,
        [student.id]
      );

    return NextResponse.json({

      studentName:
        student.name,

      history:
        history.rows,
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