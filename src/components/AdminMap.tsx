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

const schoolIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/167/167707.png",
  iconSize: [40, 40],
});

type Bus = {
  bus_id: string;
  driver_name: string;
  lat: number;
  lng: number;
};

type Props = {
  buses: Bus[];
  tripHistory?: [number, number][];
  replayPosition?: [number, number] | null;
  school: {
    latitude: number;
    longitude: number;
  } | null;
};

function FitBounds({ tripHistory }: { tripHistory: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (tripHistory.length > 0) {
      map.fitBounds(tripHistory, { padding: [32, 32] });
    }
  }, [map, tripHistory]);

  return null;
}

export default function AdminMap({
  buses,
  tripHistory,
  replayPosition,
  school,
}: Props) {
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
          <Popup>School campus</Popup>
        </Marker>
      )}

      {tripHistory && tripHistory.length > 0 && (
        <FitBounds tripHistory={tripHistory} />
      )}

      {buses
        .filter((bus) => bus.lat !== null && bus.lng !== null)
        .map((bus) => (
          <Marker key={bus.bus_id} position={[bus.lat, bus.lng]}>
            <Popup>
              Bus: {bus.bus_id}
              <br />
              Driver: {bus.driver_name}
            </Popup>
          </Marker>
        ))}

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
