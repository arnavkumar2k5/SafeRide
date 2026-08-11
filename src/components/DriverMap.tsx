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

export default function DriverMap({
  location,
  stops,
  school,
  completedStops,
  dropCompletedStops,
  tripStatus,
  routeCoordinates,
}: Props) {
  if (!school) return null;

  const polylinePositions: [number, number][] = routeCoordinates && routeCoordinates.length > 0
    ? routeCoordinates
    : [
        [school.latitude, school.longitude],
        ...stops.map((stop): [number, number] => [stop.lat, stop.lng]),
        [school.latitude, school.longitude]
      ] as [number, number][];

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

      <Polyline positions={polylinePositions} color="#ef4444" weight={5} />
    </MapContainer>
  );
}
