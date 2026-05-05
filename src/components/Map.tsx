"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

type Props = {
  lat: number;
  lng: number;
  busId?: string;
  driverName?: string;
};

export default function Map({ lat, lng, busId, driverName }: Props) {
  const position: [number, number] = [
    lat || 28.6139,
    lng || 77.2090,
  ];

  const markerRef = useRef<L.Marker>(null);

useEffect(() => {
  if (markerRef.current) {
    markerRef.current.openPopup();
  }
}, []);

  return (
    <MapContainer
      center={position}
      zoom={13}
      style={{ height: "400px", width: "100%" }}
    >
      <TileLayer
        attribution='© OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker ref={markerRef} position={position}>
  <Popup>
    🚍 Bus ID: {busId} <br />
    👨‍✈️ Driver: {driverName}
  </Popup>
</Marker>
    </MapContainer>
  );
}