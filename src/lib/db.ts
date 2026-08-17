import { Pool } from "pg";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on("connect", (client) => {
  client.query("SET search_path TO public").catch((error) => {
    console.error("Failed to set database search path:", error);
  });
});

const routeCache: Record<string, [number, number][]> = {};

export async function getRouteGeometry(routeId: string, schoolLat: number, schoolLng: number): Promise<[number, number][]> {
  if (routeCache[routeId]) {
    return routeCache[routeId];
  }

  try {
    const stopsResult = await pool.query(
      `
      SELECT 
        ST_Y(location::geometry) AS lat,
        ST_X(location::geometry) AS lng
      FROM stops
      WHERE route_id = $1
      ORDER BY stop_order
      `,
      [routeId]
    );

    const stops = stopsResult.rows;

    if (stops.length === 0) {
      const coords: [number, number][] = [[schoolLat, schoolLng]];
      routeCache[routeId] = coords;
      return coords;
    }

    const coordsForORS = [
      [schoolLng, schoolLat],
      ...stops.map(s => [Number(s.lng), Number(s.lat)]),
    ];

    const res = await fetch(
      "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: process.env.NEXT_PUBLIC_ORS_API_KEY!,
        },
        body: JSON.stringify({
          coordinates: coordsForORS,
        }),
      }
    );

    if (!res.ok) {
      throw new Error(`ORS API status ${res.status}`);
    }

    const data = await res.json();
    const orsCoords = data.features[0].geometry.coordinates;
    const formatted: [number, number][] = orsCoords.map((c: number[]) => [c[1], c[0]]);
    
    routeCache[routeId] = formatted;
    return formatted;
  } catch (error) {
    console.error(`ORS route calculation failed for route ${routeId}:`, error);
    // Fallback to straight lines
    try {
      const stopsResult = await pool.query(
        `
        SELECT 
          ST_Y(location::geometry) AS lat,
          ST_X(location::geometry) AS lng
        FROM stops
        WHERE route_id = $1
        ORDER BY stop_order
        `,
        [routeId]
      );
      const stops = stopsResult.rows;
      const fallback: [number, number][] = [
        [schoolLat, schoolLng],
        ...stops.map((s): [number, number] => [Number(s.lat), Number(s.lng)]),
      ];
      return fallback;
    } catch (fallbackError) {
      console.error("Fallback query failed:", fallbackError);
      return [[schoolLat, schoolLng]];
    }
  }
}

export function clearRouteCache(routeId?: string) {
  if (routeId) {
    delete routeCache[routeId];
  } else {
    for (const key in routeCache) {
      delete routeCache[key];
    }
  }
}

export default pool;
