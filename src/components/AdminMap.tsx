"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
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

type Bus = {
  bus_id: string;
  driver_name: string;
  lat: number;
  lng: number;
};

type Props = {
  buses: Bus[];
};

export default function AdminMap({
  buses,
}: Props) {

  return (

    <MapContainer
      center={[28.7041, 77.1025]}
      zoom={11}
      style={{
        height: "500px",
        width: "100%",
      }}
    >

      <TileLayer
        attribution="© OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {buses
  .filter(
    (bus) =>
      bus.lat !== null &&
      bus.lng !== null
  )
  .map((bus) => (

    <Marker
      key={bus.bus_id}
      position={[
        bus.lat,
        bus.lng
      ]}
    >

      <Popup>

        🚍 Bus:
        {" "}
        {bus.bus_id}

        <br />

        👨‍✈️ Driver:
        {" "}
        {bus.driver_name}

      </Popup>

    </Marker>

))}

    </MapContainer>
  );
}