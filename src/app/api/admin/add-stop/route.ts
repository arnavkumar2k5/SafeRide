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
      WHERE id = $1
      `,
      [session.user.id]
    );

    if (admin.rows.length === 0) {
      return NextResponse.json(
        { error: "Admin not found" },
        { status: 404 }
      );
    }

    const schoolId = admin.rows[0].school_id;

    const {
    name,
    routeId,
    lat,
    lng,
} = await req.json();

    if (!name || !routeId || lat === undefined || lng === undefined) {
  return NextResponse.json(
    { error: "All fields required" },
    { status: 400 }
  );
}

    // Optional: Prevent duplicate stop names within the same school
    const exists = await pool.query(
      `
      SELECT id
      FROM stops
      WHERE name = $1
      AND school_id = $2
      `,
      [name.trim(), schoolId]
    );

    if (exists.rows.length > 0) {
      return NextResponse.json(
        { error: "Stop already exists" },
        { status: 409 }
      );
    }

    // Verify that the selected route belongs to this school
const route = await pool.query(
  `
  SELECT id
  FROM routes
  WHERE id = $1
  AND school_id = $2
  `,
  [routeId, schoolId]
);

if (route.rows.length === 0) {
  return NextResponse.json(
    { error: "Invalid route" },
    { status: 400 }
  );
}

// Calculate the next stop order for this route
const order = await pool.query(
  `
  SELECT COALESCE(MAX(stop_order), 0) + 1 AS next_order
  FROM stops
  WHERE route_id = $1
  `,
  [routeId]
);

const stopOrder = order.rows[0].next_order;

await pool.query(
  `
  INSERT INTO stops (
    id,
    name,
    route_id,
    location,
    stop_order,
    school_id
  )
  VALUES (
    gen_random_uuid(),
    $1,
    $2,
    ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography,
    $5,
    $6
  )
  `,
  [
    name.trim(),   // $1
    routeId,       // $2
    lng,           // $3 (longitude)
    lat,           // $4 (latitude)
    stopOrder,     // $5
    schoolId,      // $6
  ]
);

    return NextResponse.json({
      message: "Stop Added",
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    );
  }
}