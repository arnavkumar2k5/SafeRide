"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

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

const busIcon = new L.Icon({
  iconUrl: "/icons/bus.svg",
  iconSize: [40, 40],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
});

const schoolIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/167/167707.png",
  iconSize: [40, 40],
});

type Bus = {
  bus_id: string;
  bus_number: string;
  driver_name: string;
  route_name: string;
  lat: number;
  lng: number;
  speed: number | null;
  updated_at: string | null;
};

type RouteLine = {
  busId: string;
  busNumber: string;
  routeName: string;
  coordinates: [number, number][];
  stops: {
    name: string;
    stopOrder: number;
    lat: number;
    lng: number;
  }[];
};

type Props = {
  buses: Bus[];
  routes: RouteLine[];
  selectedBus: string;
  tripHistory?: [number, number][];
  replayPosition?: [number, number] | null;
  school: {
  latitude: number;
  longitude: number;
  name: string;
} | null;
};

function FitBounds({
  buses,
  routes,
  school,
}: {
  buses: Bus[];
  routes: RouteLine[];
  school: {
    latitude: number;
    longitude: number;
  } | null;
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [];

    buses.forEach((bus) => {
      if (bus.lat && bus.lng) {
        points.push([bus.lat, bus.lng]);
      }
    });

    routes.forEach((route) => {
      points.push(...route.coordinates);
    });

    if (school) {
      points.push([
        school.latitude,
        school.longitude,
      ]);
    }

    if (points.length > 0) {
      map.fitBounds(points, {
        padding: [50, 50],
      });
    }
  }, [map, buses, routes, school]);

  return null;
}

export default function AdminMap({
  buses,
  routes,
  selectedBus,
  tripHistory,
  replayPosition,
  school,
}: Props) {
  const busesToShow =
  selectedBus === "all"
    ? buses
    : buses.filter((bus) => bus.bus_id === selectedBus);
    console.log(JSON.stringify(routes, null, 2));
  return (
    <MapContainer
      center={[28.7041, 77.1025]}
      zoom={11}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution="© OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {school && (
        <Marker icon={schoolIcon} position={[school.latitude, school.longitude]}>
          <Popup>
  <div className="space-y-1">
    <h3 className="font-semibold">{school.name}</h3>

    <p>
      <strong>Routes:</strong> {routes.length}
    </p>

    <p>
      <strong>Buses:</strong> {buses.length}
    </p>
  </div>
</Popup>
        </Marker>
      )}

      <FitBounds
  buses={busesToShow}
  routes={routes.filter(
    (r) =>
      selectedBus === "all" || r.busId === selectedBus
  )}
  school={school}
/>

      {busesToShow
        .filter((bus) => bus.lat !== null && bus.lng !== null)
        .map((bus) => (
          <Marker
  key={bus.bus_id}
  position={[bus.lat, bus.lng]}
  icon={busIcon}
>
            <Popup>
  <div className="space-y-1 min-w-[180px]">
    <h3 className="font-bold">
      🚌 {bus.bus_number}
    </h3>

    <p>
      <strong>Driver:</strong> {bus.driver_name}
    </p>

    <p>
      <strong>Route:</strong> {bus.route_name}
    </p>

    <p>
      <strong>Speed:</strong>{" "}
      {bus.speed ?? 0} km/h
    </p>

    <p>
      <strong>Updated:</strong>{" "}
      {bus.updated_at
        ? new Date(bus.updated_at).toLocaleTimeString()
        : "N/A"}
    </p>
  </div>
</Popup>
          </Marker>
        ))}

        {routes
  .filter(
    (route) =>
      selectedBus === "all" || route.busId === selectedBus
  )
  .map((route, index) => (
    <Polyline
      key={route.busId}
      positions={route.coordinates}
      color={
        [
          "red",
          "blue",
          "green",
          "purple",
          "orange",
          "teal",
          "brown",
          "pink",
        ][index % 8]
      }
      weight={5}
    />
))}
{routes
  .filter(
    (route) =>
      selectedBus === "all" || route.busId === selectedBus
  )
  .flatMap((route) =>
    route.stops.map((stop) => (
      <Marker
        key={`${route.busId}-${stop.stopOrder}`}
        position={[stop.lat, stop.lng]}
      >
        <Popup>
  <div className="space-y-1">
    <h3 className="font-semibold">
      📍 {stop.name}
    </h3>

    <p>
      <strong>Route:</strong> {route.routeName}
    </p>

    <p>
      <strong>Bus:</strong> {route.busNumber}
    </p>

    <p>
      <strong>Stop Order:</strong> {stop.stopOrder}
    </p>
  </div>
</Popup>
      </Marker>
    ))
  )}

      {tripHistory && tripHistory.length > 0 && (
        <Polyline positions={tripHistory} color="#ef4444" weight={6} />
      )}

      {replayPosition && (
        <Marker position={replayPosition}>
          <Popup>Replay position</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
