"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const schoolIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/167/167707.png",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const stopIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

type Props = {
  lat: string;
  lng: string;

  school: {
    latitude: number;
    longitude: number;
  } | null;

  selectedRoute: string;

  routes: {
    routeId: string;
    coordinates: [number, number][];
    stops: {
      id: string;
      name: string;
      stopOrder: number;
      lat: number;
      lng: number;
    }[];
  }[];

  onLocationSelect: (lat: number, lng: number) => void;

  // NEW
  editingStopId: string | null;

  editedLat: number | null;
editedLng: number | null;

  onStopMoved: (
    stopId: string,
    lat: number,
    lng: number
  ) => void;
};

function ClickHandler({
  onLocationSelect,
}: {
  onLocationSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}

function FitRoute({
  coordinates,
}: {
  coordinates: [number, number][];
}) {
  const map = useMap();

  useEffect(() => {
    if (coordinates.length > 0) {
      map.fitBounds(coordinates, {
        padding: [40, 40],
      });
    }
  }, [coordinates, map]);

  return null;
}

export default function StopPickerMap({
  lat,
  lng,
  school,
  selectedRoute,
  routes,
  onLocationSelect,
  editingStopId,
  editedLat,
    editedLng,
  onStopMoved,
}: Props) {
  const hasLocation = lat !== "" && lng !== "";

  const center: [number, number] = school
    ? [school.latitude, school.longitude]
    : [28.6139, 77.2090];

    const selectedRouteData = routes.find(
  (route) => route.routeId === selectedRoute
);

  return (
    <MapContainer
      center={center}
      zoom={15}
      style={{
        height: "300px",
        width: "100%",
        borderRadius: "12px",
      }}
    >
      <TileLayer
        attribution="© OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {selectedRouteData && (
  <Polyline
    positions={selectedRouteData.coordinates}
    pathOptions={{
      color: "#2563eb",
      weight: 5,
    }}
  />
)}
{selectedRouteData && (
  <FitRoute coordinates={selectedRouteData.coordinates} />
)}
{selectedRouteData?.stops.map((stop) => (
  <Marker
    key={stop.id}
    position={
    editingStopId === stop.id &&
    editedLat !== null &&
    editedLng !== null
        ? [editedLat, editedLng]
        : [stop.lat, stop.lng]
}
    icon={stopIcon}
    draggable={editingStopId === stop.id}
    eventHandlers={{
      dragend: (e) => {
        const marker = e.target;
        const pos = marker.getLatLng();

        onStopMoved(stop.id, pos.lat, pos.lng);
      },
    }}
  >
    <Popup>
      <strong>{stop.name}</strong>
      <br />
      Stop #{stop.stopOrder}
      {editingStopId === stop.id && (
        <>
          <br />
          <b>Drag me to change location</b>
        </>
      )}
    </Popup>
  </Marker>
))}
      {school && (
  <Marker
    position={[school.latitude, school.longitude]}
    icon={schoolIcon}
  >
    <Popup>School</Popup>
  </Marker>
)}

      <ClickHandler onLocationSelect={onLocationSelect} />

      {hasLocation && (
        <Marker
          position={[parseFloat(lat), parseFloat(lng)]}
        />
      )}
    </MapContainer>
  );
}