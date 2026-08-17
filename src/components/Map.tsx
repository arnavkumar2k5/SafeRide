"use client";

import L from "leaflet";
import "leaflet.marker.slideto";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";

import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown })
  ._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

const schoolIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/167/167707.png",
  iconSize: [40, 40],
});

const studentStopIcon = new L.Icon({
  iconUrl: "/icons/stop-pending.svg",
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

const regularStopIcon = new L.DivIcon({
  className: "custom-route-stop-icon",
  html: `<div style="background-color: #3b82f6; width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.35);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -10],
});

const busIcon = new L.Icon({
  iconUrl: "/icons/bus.svg",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

type RouteStop = {
  id: string;
  name: string;
  stop_order: number;
  lat: number;
  lng: number;
};

type Props = {
  lat: number;
  lng: number;
  busId?: string;
  busNumber?: string;
  driverName?: string;
  stopLat?: number;
  stopLng?: number;
  school: {
    latitude: number;
    longitude: number;
  } | null;
  routeCoordinates?: [number, number][];
  returnCoordinates?: [number, number][];
  routeStops?: RouteStop[];
};

function FitAllMarkers({
  lat,
  lng,
  stopLat,
  stopLng,
  school,
}: {
  lat: number;
  lng: number;
  stopLat?: number;
  stopLng?: number;
  school: Props["school"];
}) {
  const map = useMap();

  useEffect(() => {
    const bounds: [number, number][] = [[lat, lng]];

    if (stopLat !== undefined && stopLng !== undefined) {
      bounds.push([stopLat, stopLng]);
    }

    if (school && typeof school.latitude === "number" && typeof school.longitude === "number") {
      bounds.push([school.latitude, school.longitude]);
    }

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [lat, lng, stopLat, stopLng, school, map]);

  return null;
}

function findNearestIndex(coordinates: [number, number][], target: { lat: number; lng: number }) {
  let minDistance = Infinity;
  let nearestIndex = 0;

  coordinates.forEach((coord, index) => {
    const dist = Math.pow(coord[0] - target.lat, 2) + Math.pow(coord[1] - target.lng, 2);
    if (dist < minDistance) {
      minDistance = dist;
      nearestIndex = index;
    }
  });

  return nearestIndex;
}

export default function Map({
  lat,
  lng,
  busNumber,
  driverName,
  stopLat,
  stopLng,
  school,
  routeCoordinates,
  returnCoordinates,
  routeStops,
}: Props) {
  const markerRef = useRef<any>(null);
  const [fallbackRoute, setFallbackRoute] = useState<[number, number][]>([]);

  // Fallback to dynamic ORS fetch ONLY if backend routeCoordinates are unavailable
  useEffect(() => {
    if (routeCoordinates && routeCoordinates.length > 0) return;
    if (!lat || !lng || !stopLat || !stopLng) return;

    const fetchRoute = async () => {
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
                [lng, lat],
                [stopLng, stopLat],
              ],
            }),
          },
        );

        const data = await res.json();
        const coords = data.features[0].geometry.coordinates;
        const formatted = coords.map((coord: number[]) => [coord[1], coord[0]]);

        setFallbackRoute(formatted);
      } catch (error) {
        console.error("Fallback Route Error:", error);
      }
    };

    fetchRoute();
  }, [lat, lng, stopLat, stopLng, routeCoordinates]);

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.slideTo([lat, lng], {
        duration: 5000,
        keepAtCenter: false,
      });
    }
  }, [lat, lng]);

  const safeRoute = routeCoordinates && routeCoordinates.length > 0 ? routeCoordinates : [];
  const safeReturn = returnCoordinates && returnCoordinates.length > 0 ? returnCoordinates : [];

  let coveredCoordinates: [number, number][] = [];
  let remainingCoordinates: [number, number][] = [];
  let coveredReturn: [number, number][] = [];
  let remainingReturn: [number, number][] = [];

  if (safeRoute.length > 0) {
    const busIndex = findNearestIndex(safeRoute, { lat, lng });
    const pickupDistSq =
      Math.pow(safeRoute[busIndex][0] - lat, 2) +
      Math.pow(safeRoute[busIndex][1] - lng, 2);

    let isOnReturn = false;
    let returnBusIndex = 0;

    if (safeReturn.length > 0) {
      returnBusIndex = findNearestIndex(safeReturn, { lat, lng });
      const returnDistSq =
        Math.pow(safeReturn[returnBusIndex][0] - lat, 2) +
        Math.pow(safeReturn[returnBusIndex][1] - lng, 2);

      // If closer to return route and past the end of the pickup route
      if (returnDistSq < pickupDistSq && busIndex >= safeRoute.length - 2) {
        isOnReturn = true;
      }
    }

    if (isOnReturn) {
      coveredCoordinates = safeRoute;
      remainingCoordinates = [];
      coveredReturn = safeReturn.slice(0, returnBusIndex + 1);
      remainingReturn = safeReturn.slice(returnBusIndex);
    } else {
      coveredCoordinates = safeRoute.slice(0, busIndex + 1);
      remainingCoordinates = safeRoute.slice(busIndex);
      coveredReturn = [];
      remainingReturn = safeReturn;
    }
  }

  return (
    <MapContainer center={[lat, lng]} zoom={13} style={{ height: "100%", width: "100%" }}>
      <FitAllMarkers
        lat={lat}
        lng={lng}
        stopLat={stopLat}
        stopLng={stopLng}
        school={school}
      />

      <TileLayer
        attribution="© OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* RENDER POLYLINES */}
      {safeRoute.length > 0 ? (
        <>
          {coveredCoordinates.length > 0 && (
            <Polyline positions={coveredCoordinates} color="#10b981" weight={6} />
          )}
          {remainingCoordinates.length > 0 && (
            <Polyline positions={remainingCoordinates} color="#2563eb" weight={5} />
          )}
          {coveredReturn.length > 0 && (
            <Polyline positions={coveredReturn} color="#10b981" weight={6} />
          )}
          {remainingReturn.length > 0 && (
            <Polyline
              positions={remainingReturn}
              color="#6366f1"
              weight={4}
              dashArray="6, 8"
            />
          )}
        </>
      ) : (
        <Polyline positions={fallbackRoute} color="#2563eb" weight={5} />
      )}

      {school && typeof school.latitude === "number" && typeof school.longitude === "number" && (
        <Marker icon={schoolIcon} position={[school.latitude, school.longitude]}>
          <Popup>School campus</Popup>
        </Marker>
      )}

      <Marker ref={markerRef} position={[lat, lng]} icon={busIcon}>
        <Popup>
          Bus Number: {busNumber || "Not assigned"}
          <br />
          Driver: {driverName}
        </Popup>
      </Marker>

      {/* RENDER ALL ROUTE STOPS */}
      {Array.isArray(routeStops) && routeStops.length > 0 ? (
        routeStops.map((stop) => {
          const isMyChildStop =
            stopLat !== undefined &&
            stopLng !== undefined &&
            Math.abs(stop.lat - stopLat) < 0.0001 &&
            Math.abs(stop.lng - stopLng) < 0.0001;

          if (isMyChildStop) {
            return (
              <Marker
                key={stop.id || "my-child-stop"}
                position={[stop.lat, stop.lng]}
                icon={studentStopIcon}
              >
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold text-amber-600 uppercase tracking-wide">
                      Your Child&apos;s Stop
                    </p>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      Stop {stop.stop_order}: {stop.name}
                    </p>
                  </div>
                </Popup>
              </Marker>
            );
          }

          return (
            <Marker
              key={stop.id}
              position={[stop.lat, stop.lng]}
              icon={regularStopIcon}
            >
              <Popup>
                <div className="text-xs">
                  <p className="font-bold text-slate-500 uppercase tracking-wide">
                    Route Stop {stop.stop_order}
                  </p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {stop.name}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })
      ) : (
        stopLat !== undefined &&
        stopLng !== undefined && (
          <Marker position={[stopLat, stopLng]} icon={studentStopIcon}>
            <Popup>
              <div className="text-xs">
                <p className="font-bold text-amber-600 uppercase tracking-wide">
                  Your Child&apos;s Stop
                </p>
              </div>
            </Popup>
          </Marker>
        )
      )}
    </MapContainer>
  );
}
