"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
});

type ParentData = {
  student_name: string;
  bus_id: string;
  stop_name: string;
  driver_name?: string;
  stop_lat?: number;
  stop_lng?: number;
};

export default function ParentDashboard() {
  const [data, setData] = useState<ParentData | null>(null);
  const [location, setLocation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [eta, setEta] = useState<{ distance: string; duration: string } | null>(
    null,
  );
  const [busNear, setBusNear] = useState(false);
  const [busArrived, setBusArrived] = useState(false);
  const [studentNotification, setStudentNotification] = useState<{
    name: string;
    status: string;
  } | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/parent/me");

        if (!res.ok) {
          const errorData = await res.json();
          setError(errorData.error || `Failed to fetch: ${res.status}`);
          setLoading(false);
          return;
        }

        const json = await res.json();
        console.log("Parent data:", json);
        setData(json);

        if (json.bus_id) {
          const locRes = await fetch(`/api/bus/${json.bus_id}`);

          if (!locRes.ok) {
            const errorData = await locRes.json();
            console.error("Bus location error:", errorData);
            setError(errorData.error || "Failed to fetch bus location");
            setLoading(false);
            return;
          }

          const locJson = await locRes.json();
          console.log("Bus location:", locJson);
          setLocation(locJson);

          if (json.stop_lat !== undefined && json.stop_lng !== undefined) {
            try {
              const res = await fetch(
                "https://api.openrouteservice.org/v2/directions/driving-car",
                {
                  method: "POST",

                  headers: {
                    "Content-Type": "application/json",

                    Authorization: process.env.NEXT_PUBLIC_ORS_API_KEY!,
                  },

                  body: JSON.stringify({
                    coordinates: [
                      [locJson.lng, locJson.lat],

                      [json.stop_lng, json.stop_lat],
                    ],
                  }),
                },
              );

              const routeData = await res.json();

              const summary = routeData.routes[0].summary;

              setEta({
                distance: (summary.distance / 1000).toFixed(2),

                duration: (summary.duration / 60).toFixed(0),
              });

              const distance = summary.distance;

              if (distance <= 50) {
                setBusArrived(true);
                setBusNear(false);
              } else if (distance <= 500) {
                setBusNear(true);
                setBusArrived(false);
              } else {
                setBusArrived(false);
                setBusNear(false);
              }
            } catch (error) {
              console.error("ETA Error:", error);
            }
          }
        } else {
          setError("No bus ID found");
        }
        const historyRes =
  await fetch(
    "/api/parent/history"
  );

const historyData =
  await historyRes.json();

setHistory(
  historyData.history
);
        setLoading(false);
      } catch (err: any) {
        console.error("Fetch error:", err);
        setError(err.message || "An error occurred");
        setLoading(false);
      }
    };

    fetchData();

    socket.on("bus-location-update", async (liveData) => {
      console.log("Live Update:", liveData);

      setLocation({ lat: liveData.lat, lng: liveData.lng });

      if (data?.stop_lat !== undefined && data?.stop_lng !== undefined) {
        try {
          const res = await fetch(
            "https://api.openrouteservice.org/v2/directions/driving-car",
            {
              method: "POST",

              headers: {
                "Content-Type": "application/json",

                Authorization: process.env.NEXT_PUBLIC_ORS_API_KEY!,
              },

              body: JSON.stringify({
                coordinates: [
                  [liveData.lng, liveData.lat],
                  [data.stop_lng, data.stop_lat],
                ],
              }),
            },
          );

          const routeData = await res.json();

          const summary = routeData.routes[0].summary;

          setEta({
            distance: (summary.distance / 1000).toFixed(2),
            duration: (summary.duration / 60).toFixed(0),
          });

          const distance = summary.distance;

          if (distance <= 50) {
            setBusArrived(true);
            setBusNear(false);
          } else if (distance <= 500) {
            setBusNear(true);
            setBusArrived(false);
          } else {
            setBusArrived(false);
            setBusNear(false);
          }
        } catch (error) {
          console.error("ETA error:", error);
        }
      }
    });

    socket.on("student-status-update", (liveData) => {
      console.log("Student Status:", liveData);

      setStudentNotification({
        name: liveData.studentName,
        status: liveData.status,
      });
      setHistory((prev) => [

  {
    status: liveData.status,

    updated_at:
      new Date(),
  },

  ...prev,
]);
    });
    return () => {
      socket.off("bus-location-update");

      socket.off("student-status-update");
    };
  }, []);

  if (loading) {
    return <div className="p-4">Loading map...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }

  if (!data || !location || !location.lat || !location.lng) {
    return <div className="p-4">No data available. Please try again.</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Parent Dashboard</h1>
      <div className="bg-white p-4 rounded shadow mb-4">
        <p>
          <strong>Student:</strong> {data.student_name}
        </p>
        <p>
          <strong>Bus ID:</strong> {data.bus_id}
        </p>
        <p>
          <strong>Stop:</strong> {data.stop_name}
        </p>
        {data.driver_name && (
          <p>
            <strong>Driver:</strong> {data.driver_name}
          </p>
        )}
        {eta && (
          <div className="text-yellow-400">
            <p>
              <strong>Distance:</strong> {eta.distance}km
            </p>

            <p>
              <strong>ETA:</strong> {eta.duration} mins
            </p>
          </div>
        )}
        {busNear && (
          <div
            className="
      bg-yellow-500
      text-black
      p-3
      rounded
      mb-4
      font-semibold
    "
          >
            🚌 Bus is near your stop
          </div>
        )}
        {busArrived && (
          <div
            className="
      bg-green-600
      text-white
      p-3
      rounded
      mb-4
      font-semibold
    "
          >
            📍 Bus has arrived
          </div>
        )}
        {studentNotification && (
          <div
            className="
      bg-blue-600
      text-white
      p-3
      rounded
      mb-4
      font-semibold
    "
          >
            {studentNotification.status === "boarded"
              ? `✅ ${studentNotification.name} boarded the bus`
              : `🏫 ${studentNotification.name} was dropped safely`}
          </div>
        )}
      </div>
      <div className="h-96">
        <Map
          lat={location?.lat}
          lng={location?.lng}
          busId={data?.bus_id}
          driverName={data?.driver_name}
          stopLat={data?.stop_lat}
          stopLng={data?.stop_lng}
        />
      </div>
      <div
  className="
    mt-6
    bg-white
    p-4
    rounded
    shadow
  "
>

  <h2
    className="
      text-2xl
      font-bold
      mb-4
    "
  >
    Attendance History
  </h2>

  <div
    className="
      space-y-3
    "
  >

    {history.map(
      (
        item,
        index
      ) => (

        <div
          key={index}

          className="
            border-b
            pb-2
          "
        >

          <p
            className="
              font-semibold
            "
          >

            {item.status ===
              "boarded"
              ? "✅ Boarded"
              : "🏫 Dropped"
            }

          </p>

          <p
            className="
              text-gray-500
              text-sm
            "
          >

            {new Date(
              item.updated_at
            ).toLocaleString()}

          </p>

        </div>
      )
    )}

  </div>

</div>
    </div>
  );
}
