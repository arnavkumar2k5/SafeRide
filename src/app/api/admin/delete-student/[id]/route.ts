import pool from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(req: NextRequest, {params}: {params: Promise<{id: string}>;}){
    try {
        const {id} = await params;

        await pool.query(`DELETE FROM students WHERE id=$1`, [id]);

        return NextResponse.json({message: "Student Deleted"});
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