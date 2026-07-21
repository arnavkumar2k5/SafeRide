import pool from "@/lib/db";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const {
      studentName,
      parentName,
      parentEmail,
      busId,
      stopId,
    } = await req.json();

    if (
      !studentName ||
      !parentName ||
      !parentEmail ||
      !busId ||
      !stopId
    ) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
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

    const schoolId = admin.rows[0].school_id;

    // Check if parent already exists
    const parentResult = await pool.query(
      `
      SELECT id
      FROM users
      WHERE email = $1
      AND role = 'parent'
      `,
      [parentEmail]
    );

    let parentId: string;

    if (parentResult.rows.length > 0) {
      parentId = parentResult.rows[0].id;
    } else {
      // Temporary password
      const tempPassword = Math.random().toString(36).slice(-8);

      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const newParent = await pool.query(
        `
        INSERT INTO users
        (
          name,
          email,
          password,
          role,
          school_id
        )
        VALUES
        (
          $1,
          $2,
          $3,
          'parent',
          $4
        )
        RETURNING id
        `,
        [
          parentName,
          parentEmail,
          hashedPassword,
          schoolId,
        ]
      );

      parentId = newParent.rows[0].id;

      // Later you can email tempPassword to the parent
    }

    await pool.query(
      `
      INSERT INTO students
      (
        name,
        school_id,
        parent_id,
        bus_id,
        stop_id
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4,
        $5
      )
      `,
      [
        studentName,
        schoolId,
        parentId,
        busId,
        stopId,
      ]
    );

    return NextResponse.json({
      message: "Student Added Successfully",
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    );
  }
}