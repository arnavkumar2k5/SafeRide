import pool from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, {params}: {params: Promise<{id: string;}>;}){
    try {
        const {id} = await params;
        
        const {name, parentId, busId, stopId} = await req.json();

        await pool.query(`
            UPDATE students SET name=$1, parent_id$2, bus_id=$3, stop_id=$4 WHERE id=$5`, [name, parentId, busId, stopId, id]);

        return NextResponse.json({message: "Student Updated"});
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