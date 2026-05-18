import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getDistance } from "geolib";

export async function POST(req: Request){
    try {
        const session = await getServerSession(authOptions);
        if(!session){
            return NextResponse.json({error: "Unauthorized"}, {status: 400});
        }

        const driverId = session.user.id;
        console.log("SESSION DRIVER ID:", driverId);
        const {lat, lng, speed} = await req.json();

        if(lat === undefined || lng === undefined){
            return NextResponse.json({error: "Missing Coordinates"}, {status: 400});
        }

        const busResult = await pool.query(
            `SELECT id FROM buses WHERE driver_id=$1`, [driverId]
        );

        if(busResult.rows.length === 0){
            return NextResponse.json({error: "No bus assigned"}, {status: 400});
        }

        const busId = busResult.rows[0].id;
        
        await pool.query(
  `INSERT INTO bus_locations (bus_id, location, speed, updated_at)
   VALUES (
      $1,
      ST_SetSRID(ST_MakePoint($3, $2), 4326),
      $4,
      NOW()
   )
   ON CONFLICT (bus_id)
   DO UPDATE SET
      location = EXCLUDED.location,
      speed = EXCLUDED.speed,
      updated_at = NOW()`,
  [busId, lat, lng, speed || 0]
);

const studentsResult =
  await pool.query(
    `
    SELECT

      students.id,

      students.name,

      stops.name
      AS stop_name,

      stops.latitude,

      stops.longitude

    FROM students

    JOIN stops
    ON students.stop_id
      = stops.id

    WHERE students.bus_id=$1
    `,
    [busId]
  );

studentsResult.rows.forEach(
  (student) => {

    const distance =
      getDistance(

        {
          latitude: lat,
          longitude: lng,
        },

        {
          latitude:
            student.latitude,

          longitude:
            student.longitude,
        }
      );

    console.log(
      `Distance to ${student.stop_name}:`,
      distance
    );

    if (distance < 100 && distance > 30) {

      (global as any).io.emit(
        "bus-near-stop",
        {

          studentId:
            student.id,

          studentName:
            student.name,

          stopName:
            student.stop_name,

          distance,
        }
      );
    }
  }
);

await pool.query(
  `
  INSERT INTO trip_history(
    bus_id,
    lat,
    lng
  )

  VALUES($1, $2, $3)
  `,
  [
    busId,
    lat,
    lng,
  ]
);

        return NextResponse.json({message: "Location Updated"});
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}