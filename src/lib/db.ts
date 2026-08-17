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

const routeLegCache: Record<
  string,
  [number, number][]
> = {};

export async function getRouteLegGeometry(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  cacheKey: string,
): Promise<[number, number][]> {
  if (routeLegCache[cacheKey]) {
    return routeLegCache[cacheKey];
  }

  try {
    const res = await fetch(
      "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: process.env.NEXT_PUBLIC_ORS_API_KEY!,
        },
        body: JSON.stringify({
          coordinates: [
            [startLng, startLat],
            [endLng, endLat],
          ],
        }),
      },
    );

    if (!res.ok) {
      throw new Error(`ORS leg route failed: ${res.status}`);
    }

    const data = await res.json();

    const orsCoords =
      data.features[0].geometry.coordinates;

    const formatted: [number, number][] =
      orsCoords.map((c: number[]) => [
        c[1],
        c[0],
      ]);

    routeLegCache[cacheKey] = formatted;

    return formatted;
  } catch (error) {
    console.error(
      `Failed to calculate route leg ${cacheKey}:`,
      error,
    );

    const fallback: [number, number][] = [
      [startLat, startLng],
      [endLat, endLng],
    ];

    routeLegCache[cacheKey] = fallback;

    return fallback;
  }
}

const returnRouteCache: Record<string, [number, number][]> = {};

export async function getDirectReturnGeometry(
  startLat: number,
  startLng: number,
  schoolLat: number,
  schoolLng: number,
  cacheKeySuffix?: string
): Promise<[number, number][]> {
  const cacheKey = cacheKeySuffix
    ? `return_${cacheKeySuffix}`
    : `return_${startLat.toFixed(5)}_${startLng.toFixed(5)}_${schoolLat.toFixed(5)}_${schoolLng.toFixed(5)}`;

  if (returnRouteCache[cacheKey]) {
    return returnRouteCache[cacheKey];
  }

  try {
    const res = await fetch(
      "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: process.env.NEXT_PUBLIC_ORS_API_KEY!,
        },
        body: JSON.stringify({
          coordinates: [
            [startLng, startLat],
            [schoolLng, schoolLat],
          ],
        }),
      }
    );

    if (!res.ok) {
      throw new Error(`ORS Return API status ${res.status}`);
    }

    const data = await res.json();
    const orsCoords = data.features[0].geometry.coordinates;
    const formatted: [number, number][] = orsCoords.map((c: number[]) => [c[1], c[0]]);

    returnRouteCache[cacheKey] = formatted;
    return formatted;
  } catch (error) {
    console.error("Direct return ORS failed, using straight line fallback:", error);
    const fallback: [number, number][] = [
      [startLat, startLng],
      [schoolLat, schoolLng],
    ];
    returnRouteCache[cacheKey] = fallback;
    return fallback;
  }
}

export async function getDetailedRouteGeometry(
  routeId: string,
  schoolLat: number,
  schoolLng: number
): Promise<{
  pickupCoordinates: [number, number][];
  returnCoordinates: [number, number][];
}> {
  const pickupCoordinates = await getRouteGeometry(routeId, schoolLat, schoolLng);

  try {
    const stopsResult = await pool.query(
      `
      SELECT 
        id,
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
      return {
        pickupCoordinates,
        returnCoordinates: [[schoolLat, schoolLng]],
      };
    }

    const finalStop = stops[stops.length - 1];
    const returnCoordinates = await getDirectReturnGeometry(
      Number(finalStop.lat),
      Number(finalStop.lng),
      schoolLat,
      schoolLng,
      `${routeId}_${finalStop.id}_return`
    );

    return {
      pickupCoordinates,
      returnCoordinates,
    };
  } catch (error) {
    console.error("Failed to get return geometry for route:", error);
    return {
      pickupCoordinates,
      returnCoordinates: [[schoolLat, schoolLng]],
    };
  }
}

export function clearRouteCache(routeId?: string) {
  if (routeId) {
    delete routeCache[routeId];
    for (const key in returnRouteCache) {
      if (key.includes(routeId)) {
        delete returnRouteCache[key];
      }
    }
  } else {
    for (const key in routeCache) {
      delete routeCache[key];
    }
    for (const key in returnRouteCache) {
      delete returnRouteCache[key];
    }
  }
}

export default pool;
