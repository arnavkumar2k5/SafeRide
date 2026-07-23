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
};

export default function DriverMap({ location, stops, school }: Props) {
  if (!school) return null;

  const route: [number, number][] = [
  [school.latitude, school.longitude],
  ...stops.map((stop): [number, number] => [
    stop.lat,
    stop.lng,
  ]),
];

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

      <Marker position={[school.latitude, school.longitude]}>
        <Popup>School campus</Popup>
      </Marker>

      {Array.isArray(stops) &&
        stops.map((stop) => (
          <Marker key={stop.id} position={[stop.lat, stop.lng]}>
            <Popup>Stop: {stop.name}</Popup>
          </Marker>
        ))}

      {location && (
        <Marker position={[location.lat, location.lng]}>
          <Popup>Live bus</Popup>
        </Marker>
      )}

      <Polyline positions={route} color="#ef4444" weight={5} />
    </MapContainer>
  );
}
