"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
} from "react-leaflet";

delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown })
  ._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

type Stop = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

type Props = {
  location: {
    lat: number;
    lng: number;
  } | null;

  stops: Stop[];

  school: {
    latitude: number;
    longitude: number;
  } | null;

  completedStops: string[];

  dropCompletedStops: string[];

  tripStatus: string;

  routeCoordinates?: [number, number][];
  returnCoordinates?: [number, number][];
};

const busIcon = new L.Icon({
  iconUrl: "/icons/bus.svg",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const schoolIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/167/167707.png",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const pendingStopIcon = new L.Icon({
  iconUrl: "/icons/stop-pending.svg",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const completedStopIcon = new L.Icon({
  iconUrl: "/icons/stop-completed.svg",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

function findNearestIndex(
  coordinates: [number, number][],
  target: { lat: number; lng: number },
): number {
  if (!coordinates || coordinates.length === 0) return 0;
  let nearestIndex = 0;
  let minDistance = Infinity;

  for (let i = 0; i < coordinates.length; i++) {
    const dLat = coordinates[i][0] - target.lat;
    const dLng = coordinates[i][1] - target.lng;
    const distSq = dLat * dLat + dLng * dLng;

    if (distSq < minDistance) {
      minDistance = distSq;
      nearestIndex = i;
    }
  }

  return nearestIndex;
}

export default function DriverMap({
  location,
  stops,
  school,
  completedStops,
  dropCompletedStops,
  tripStatus,
  routeCoordinates,
  returnCoordinates,
}: Props) {
  if (!school) return null;

  const polylinePositions: [number, number][] =
    routeCoordinates && routeCoordinates.length > 1
      ? routeCoordinates
      : ([
          [school.latitude, school.longitude],
          ...stops.map((stop): [number, number] => [stop.lat, stop.lng]),
        ] as [number, number][]);

  const safeRoute =
    routeCoordinates && routeCoordinates.length > 0
      ? routeCoordinates
      : polylinePositions;
  const safeReturn =
    returnCoordinates && returnCoordinates.length > 0 ? returnCoordinates : [];

  let coveredCoordinates: [number, number][] = [];
  let remainingCoordinates: [number, number][] = [];
  let coveredReturn: [number, number][] = [];
  let remainingReturn: [number, number][] = [];

  if (safeRoute.length > 0 && location) {
    const busIndex = findNearestIndex(safeRoute, location);
    const pickupDistSq =
      Math.pow(safeRoute[busIndex][0] - location.lat, 2) +
      Math.pow(safeRoute[busIndex][1] - location.lng, 2);

    let isOnReturn = false;
    let returnBusIndex = 0;

    if (safeReturn.length > 0) {
      returnBusIndex = findNearestIndex(safeReturn, location);
      const returnDistSq =
        Math.pow(safeReturn[returnBusIndex][0] - location.lat, 2) +
        Math.pow(safeReturn[returnBusIndex][1] - location.lng, 2);

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
  } else {
    remainingCoordinates = safeRoute;
    remainingReturn = safeReturn;
  }

  return (
    <MapContainer
      center={[school.latitude, school.longitude]}
      zoom={11}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution="© OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker position={[school.latitude, school.longitude]} icon={schoolIcon}>
        <Popup>School campus</Popup>
      </Marker>

      {Array.isArray(stops) &&
        stops.map((stop) => (
          <Marker
            key={stop.id}
            position={[stop.lat, stop.lng]}
            icon={
              tripStatus === "drop"
                ? dropCompletedStops.includes(stop.id)
                  ? completedStopIcon
                  : pendingStopIcon
                : completedStops.includes(stop.id)
                  ? completedStopIcon
                  : pendingStopIcon
            }
          >
            <Popup>{stop.name}</Popup>
          </Marker>
        ))}

      {location && (
        <Marker position={[location.lat, location.lng]} icon={busIcon}>
          <Popup>Live bus</Popup>
        </Marker>
      )}

      {/* Covered Route (Green) */}
      {coveredCoordinates.length > 0 && (
        <Polyline positions={coveredCoordinates} color="#10b981" weight={6} />
      )}

      {/* Remaining Pickup Route (Red) */}
      {remainingCoordinates.length > 0 && (
        <Polyline positions={remainingCoordinates} color="#ef4444" weight={5} />
      )}

      {/* Covered Return-to-School Route (Green) */}
      {coveredReturn.length > 0 && (
        <Polyline positions={coveredReturn} color="#10b981" weight={6} />
      )}

      {/* Remaining Return-to-School Route (Indigo/Dashed) */}
      {remainingReturn.length > 0 && (
        <Polyline
          positions={remainingReturn}
          color="#6366f1"
          weight={4}
          dashArray="6, 8"
        />
      )}
    </MapContainer>
  );
}
