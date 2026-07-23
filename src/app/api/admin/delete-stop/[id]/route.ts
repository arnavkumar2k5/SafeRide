import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import pool from "@/lib/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const schoolResult = await pool.query(
      `
      SELECT school_id
      FROM users
      WHERE email = $1
      `,
      [session.user.email]
    );

    if (schoolResult.rows.length === 0) {
      return NextResponse.json(
        { error: "School not found" },
        { status: 404 }
      );
    }

    const schoolId = schoolResult.rows[0].school_id;

    const stopResult = await pool.query(
      `
      SELECT s.id
      FROM stops s
      JOIN routes r
        ON s.route_id = r.id
      WHERE
        s.id = $1
        AND r.school_id = $2
      `,
      [id, schoolId]
    );

    // Check stop belongs to school

if (stopResult.rows.length === 0) {
  return NextResponse.json(
    { error: "Stop not found" },
    { status: 404 }
  );
}

// NEW CODE STARTS HERE
const studentResult = await pool.query(
  `
  SELECT COUNT(*) AS count
  FROM students
  WHERE stop_id = $1
  `,
  [id]
);

const count = Number(studentResult.rows[0].count);

if (count > 0) {
  return NextResponse.json(
    {
      error: `Cannot delete stop. ${count} student(s) are assigned to it.`,
    },
    {
      status: 400,
    }
  );
}
// NEW CODE ENDS HERE

await pool.query(
  `
  DELETE FROM stops
  WHERE id = $1
  `,
  [id]
);

    return NextResponse.json({
      message: "Stop deleted successfully",
    });

  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Failed to delete stop" },
      { status: 500 }
    );
  }
}