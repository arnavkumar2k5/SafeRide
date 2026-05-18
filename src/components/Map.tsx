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

type Props = {
  lat: number;
  lng: number;
  busId?: string;
  driverName?: string;
  stopLat?: number;
  stopLng?: number;
  school: {
    latitude: number;
    longitude: number;
  } | null;
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

    if (school) {
      bounds.push([school.latitude, school.longitude]);
    }

    map.fitBounds(bounds, { padding: [32, 32] });
  }, [lat, lng, stopLat, stopLng, school, map]);

  return null;
}

export default function Map({
  lat,
  lng,
  busId,
  driverName,
  stopLat,
  stopLng,
  school,
}: Props) {
  const markerRef = useRef<L.Marker>(null);
  const [routePositions, setRoutePositions] = useState<[number, number][]>([]);

  useEffect(() => {
    const fetchRoute = async () => {
      if (stopLat === undefined || stopLng === undefined) return;

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

        setRoutePositions(formatted);
      } catch (error) {
        console.error("Route Error:", error);
      }
    };

    fetchRoute();
  }, [lat, lng, stopLat, stopLng]);

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.slideTo([lat, lng], {
        duration: 5000,
        keepAtCenter: false,
      });
    }
  }, [lat, lng]);

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
      <Polyline positions={routePositions} color="#2563eb" weight={5} />

      {school && (
        <Marker icon={schoolIcon} position={[school.latitude, school.longitude]}>
          <Popup>School campus</Popup>
        </Marker>
      )}

      <Marker ref={markerRef} position={[lat, lng]}>
        <Popup>
          Bus ID: {busId}
          <br />
          Driver: {driverName}
        </Popup>
      </Marker>

      {stopLat !== undefined && stopLng !== undefined && (
        <Marker position={[stopLat, stopLng]}>
          <Popup>Student stop</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
