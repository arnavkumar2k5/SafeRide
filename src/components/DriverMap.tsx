"use client";

import L from "leaflet";

import "leaflet/dist/leaflet.css";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";

delete (L.Icon.Default.prototype as any)
  ._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",

  iconUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",

  shadowUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

type Stop = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
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


export default function DriverMap({
  location,
  stops, school,
}: Props) {
if (!school) return null;
const route: [number, number][] = [

  [
  school.latitude,
  school.longitude
],

  ...stops.map(
    (stop): [number, number] => [

      stop.latitude,
      stop.longitude,
    ]
  ),
];

  return (

    <MapContainer
      center={[
        school.latitude,
        school.longitude,
      ]}
      zoom={11}
      style={{
        height: "500px",
        width: "100%",
      }}
    >

      <TileLayer
        attribution="© OpenStreetMap"

        url="
https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
"
      />

      {/* SCHOOL */}

      <Marker
        position={[
          school.latitude,
          school.longitude,
        ]}
      >

        <Popup>
          🏫 School
        </Popup>

      </Marker>

      {/* STOPS */}

      {Array.isArray(stops) && stops.map((stop) => (

        <Marker
          key={stop.id}

          position={[
            stop.latitude,
            stop.longitude,
          ]}
        >

          <Popup>
            🚌 {stop.name}
          </Popup>

        </Marker>

      ))}

      {/* LIVE BUS */}

      {location && (

        <Marker
          position={[
            location.lat,
            location.lng,
          ]}
        >

          <Popup>
            🚍 Live Bus
          </Popup>

        </Marker>

      )}

      {/* ROUTE */}

      <Polyline
        positions={route}
        color="red"
      />

    </MapContainer>
  );
}