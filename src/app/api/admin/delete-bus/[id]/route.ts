import pool from "@/lib/db";

import {
  NextResponse
} from "next/server";

export async function DELETE(

  req: Request,

  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {

  try {

    const {
  id
} = await params;

// CHECK STUDENTS
const studentCheck =
  await pool.query(
    `
    SELECT id

    FROM students

    WHERE bus_id=$1
    `,
    [id]
  );

if (
  studentCheck.rows.length > 0
) {

  return NextResponse.json(
    {
      error:
        "Cannot delete bus. Students are assigned to it.",
    },
    {
      status: 400,
    }
  );
}

// DELETE BUS
await pool.query(
  `
  DELETE FROM buses

  WHERE id=$1
  `,
  [id]
);

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