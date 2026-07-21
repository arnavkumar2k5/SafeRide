"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupSchoolPage() {
  const router = useRouter();

  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [loading, setLoading] = useState(false);
  const [schoolName, setSchoolName] = useState("");

  useEffect(() => {
    fetch("/api/admin/school")
      .then((res) => res.json())
      .then((data) => {
        setSchoolName(data.name);
      });
  }, []);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toString());
        setLongitude(position.coords.longitude.toString());
      },
      () => {
        alert("Unable to fetch location");
      }
    );
  };

  const saveLocation = async () => {
    if (!latitude || !longitude) {
      alert("Enter latitude and longitude");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/admin/school/location", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        latitude,
        longitude,
      }),
    });

    const data = await res.json();

    setLoading(false);

    if (res.ok) {
      alert("School location saved.");
      router.push("/admin/dashboard");
    } else {
      alert(data.error);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 border rounded-lg">
      <h1 className="text-3xl font-bold mb-6">
        School Setup
      </h1>

      <div className="mb-5">
        <label className="font-semibold">
          School Name
        </label>

        <input
          className="w-full border p-2 rounded mt-1"
          value={schoolName}
          disabled
        />
      </div>

      <button
        onClick={useCurrentLocation}
        className="bg-blue-600 text-white px-4 py-2 rounded mb-5"
      >
        📍 Use Current Location
      </button>

      <div className="mb-4">
        <label>Latitude</label>

        <input
          className="w-full border rounded p-2"
          value={latitude}
          onChange={(e) => setLatitude(e.target.value)}
        />
      </div>

      <div className="mb-6">
        <label>Longitude</label>

        <input
          className="w-full border rounded p-2"
          value={longitude}
          onChange={(e) => setLongitude(e.target.value)}
        />
      </div>

      <button
        onClick={saveLocation}
        disabled={loading}
        className="bg-green-600 text-white px-5 py-2 rounded"
      >
        {loading ? "Saving..." : "Save"}
      </button>
    </div>
  );
}