"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
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

type BusLocation = {
  lat: number;
  lng: number;
};

type School = {
  latitude: number;
  longitude: number;
};

type HistoryItem = {
  status: string;
  updated_at: string | Date;
};

export default function ParentDashboard() {
  const [data, setData] = useState<ParentData | null>(null);
  const [location, setLocation] = useState<BusLocation | null>(null);
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
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [school, setSchool] = useState<School | null>(null);

  const showNotification = (title: string, body: string) => {
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      new Notification(title, { body });
    }
  };

  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }

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
        setData(json);

        if (json.bus_id) {
          const locRes = await fetch(`/api/bus/${json.bus_id}`);

          if (!locRes.ok) {
            const errorData = await locRes.json();
            setError(errorData.error || "Failed to fetch bus location");
            setLoading(false);
            return;
          }

          const locJson = await locRes.json();
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

              const schoolRes = await fetch("/api/admin/school");
              const schoolJson = await schoolRes.json();
              setSchool(schoolJson);

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

        const historyRes = await fetch("/api/parent/history");
        const historyData = await historyRes.json();
        setHistory(historyData.history);
        setLoading(false);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setLoading(false);
      }
    };

    fetchData();

    socket.on("bus-location-update", async (liveData) => {
      setLocation({ lat: liveData.lat, lng: liveData.lng });

      if (school && data?.stop_lat !== undefined && data?.stop_lng !== undefined) {
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
                  [school!.longitude, school!.latitude],
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

    socket.on("bus-near-stop", (data) => {
      showNotification("Bus Near Stop", `Bus is near ${data.stopName}`);
    });

    socket.on("student-status-update", (liveData) => {
      showNotification("Student Update", `${liveData.studentName} ${liveData.status}`);
      setStudentNotification({
        name: liveData.studentName,
        status: liveData.status,
      });
      setHistory((prev) => [
        {
          status: liveData.status,
          updated_at: new Date(),
        },
        ...prev,
      ]);
    });

    return () => {
      socket.off("bus-location-update");
      socket.off("bus-near-stop");
      socket.off("student-status-update");
    };
    // The socket subscriptions intentionally match the original mount-only flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <main className="dashboard-shell flex min-h-screen items-center justify-center p-6">
        <div className="dashboard-card px-6 py-5 text-sm font-semibold text-slate-600">
          Loading live tracking...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="dashboard-shell flex min-h-screen items-center justify-center p-6">
        <div className="dashboard-card max-w-md border-red-200 px-6 py-5 text-red-700">
          Error: {error}
        </div>
      </main>
    );
  }

  if (!data || !location || !location.lat || !location.lng) {
    return (
      <main className="dashboard-shell flex min-h-screen items-center justify-center p-6">
        <div className="dashboard-card px-6 py-5 text-slate-600">
          No tracking data is available yet. Please try again.
        </div>
      </main>
    );
  }

  const routeStatus = busArrived
    ? "Arrived"
    : busNear
      ? "Approaching stop"
      : "Tracking live";

  return (
    <main className="dashboard-shell">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <header className="dashboard-card flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">
              Parent Portal
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">
              {data.student_name}&apos;s Live Ride
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Bus {data.bus_id} to {data.stop_name}
            </p>
          </div>
          <span className="status-pill bg-blue-50 text-blue-700">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            {routeStatus}
          </span>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="dashboard-card overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Live route map</h2>
                <p className="text-sm text-slate-500">
                  School, student stop, route line, and live bus position.
                </p>
              </div>
              {eta && (
                <div className="grid grid-cols-2 gap-2 text-right">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">Distance</p>
                    <p className="text-lg font-bold text-slate-950">{eta.distance} km</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">ETA</p>
                    <p className="text-lg font-bold text-amber-600">{eta.duration} min</p>
                  </div>
                </div>
              )}
            </div>
            <div className="map-shell h-[420px] sm:h-[520px]">
              <Map
                lat={location?.lat}
                lng={location?.lng}
                busId={data?.bus_id}
                driverName={data?.driver_name}
                stopLat={data?.stop_lat}
                stopLng={data?.stop_lng}
                school={school}
              />
            </div>
          </div>

          <aside className="flex flex-col gap-4">
            <div className="dashboard-card p-5">
              <h2 className="text-lg font-bold text-slate-950">Ride details</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Student</dt>
                  <dd className="font-semibold text-slate-950">{data.student_name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Bus</dt>
                  <dd className="font-semibold text-slate-950">{data.bus_id}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Stop</dt>
                  <dd className="text-right font-semibold text-slate-950">{data.stop_name}</dd>
                </div>
                {data.driver_name && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Driver</dt>
                    <dd className="font-semibold text-slate-950">{data.driver_name}</dd>
                  </div>
                )}
              </dl>
            </div>

            {(busNear || busArrived || studentNotification) && (
              <div className="dashboard-card p-5">
                <h2 className="text-lg font-bold text-slate-950">Live alerts</h2>
                <div className="mt-4 space-y-3">
                  {busNear && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                      Bus is near your stop.
                    </div>
                  )}
                  {busArrived && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-800">
                      Bus has arrived at the stop.
                    </div>
                  )}
                  {studentNotification && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-800">
                      {studentNotification.name} {studentNotification.status}.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="dashboard-card p-5">
              <h2 className="text-lg font-bold text-slate-950">Attendance timeline</h2>
              <div className="mt-4 space-y-3">
                {history.length === 0 ? (
                  <p className="text-sm text-slate-500">No attendance events yet.</p>
                ) : (
                  history.map((item, index) => (
                    <div key={index} className="flex gap-3 border-b border-slate-100 pb-3 last:border-0">
                      <span
                        className={`mt-1 h-2.5 w-2.5 rounded-full ${
                          item.status === "boarded" ? "bg-green-500" : "bg-amber-500"
                        }`}
                      />
                      <div>
                        <p className="font-semibold text-slate-950">
                          {item.status === "boarded" ? "Boarded" : "Dropped safely"}
                        </p>
                        <p className="text-sm text-slate-500">
                          {new Date(item.updated_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
