"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { socket } from "@/lib/socket";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
});

type RouteStop = {
  id: string;
  name: string;
  stop_order: number;
  lat: number;
  lng: number;
};

type ParentData = {
  student_id: string;
  student_name: string;
  bus_id: string;
  bus_number?: string;
  bus_trip_status?: string;
  student_status?: string;
  student_pickup_time?: string | null;
  student_drop_time?: string | null;
  student_absent_time?: string | null;
  stop_name: string;
  driver_name?: string;
  stop_lat?: number;
  stop_lng?: number;
  route_coordinates?: [number, number][];
  route_stops?: RouteStop[];
};

type BusLocation = {
  lat: number;
  lng: number;
};

type School = {
  latitude: number;
  longitude: number;
};

type BusLocationUpdate = {
  busId: string;
  lat: number;
  lng: number;
  speed?: number;
};

function getHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function findNearestCoordIndex(
  coords: [number, number][],
  target: { lat: number; lng: number },
): number {
  if (!coords || coords.length === 0) return 0;
  let nearestIdx = 0;
  let minDistance = Infinity;

  for (let i = 0; i < coords.length; i++) {
    const dLat = coords[i][0] - target.lat;
    const dLng = coords[i][1] - target.lng;
    const distSq = dLat * dLat + dLng * dLng;
    if (distSq < minDistance) {
      minDistance = distSq;
      nearestIdx = i;
    }
  }

  return nearestIdx;
}

type LiveEtaResult = {
  eta: { distance: string; duration: string } | null;
  isNear: boolean;
  isArrived: boolean;
  isPassed: boolean;
};

function computeLiveEtaAndProximity(
  busLoc: { lat: number; lng: number },
  stopLoc: { lat: number; lng: number },
  routeCoords: [number, number][] | undefined,
  studentStatus: string | undefined,
  liveSpeed?: number,
): LiveEtaResult {
  if (studentStatus === "dropped") {
    return {
      eta: null,
      isNear: false,
      isArrived: false,
      isPassed: true,
    };
  }

  const directMetersToStop = getHaversineDistanceMeters(
    busLoc.lat,
    busLoc.lng,
    stopLoc.lat,
    stopLoc.lng,
  );

  // 1. Bus is right at the stop (Arrival threshold)
  if (directMetersToStop <= 60) {
    return {
      eta: { distance: "0.00", duration: "Arrived" },
      isNear: false,
      isArrived: true,
      isPassed: false,
    };
  }

  // 2. Road coordinate matching
  if (routeCoords && routeCoords.length > 1) {
    const busIdx = findNearestCoordIndex(routeCoords, busLoc);
    const stopIdx = findNearestCoordIndex(routeCoords, stopLoc);

    // Bus is approaching parent's stop
    if (busIdx < stopIdx) {
      let totalMeters = 0;
      for (let i = busIdx; i < stopIdx; i++) {
        totalMeters += getHaversineDistanceMeters(
          routeCoords[i][0],
          routeCoords[i][1],
          routeCoords[i + 1][0],
          routeCoords[i + 1][1],
        );
      }

      const isNear = totalMeters > 60 && totalMeters <= 500;
      const distanceKm = totalMeters / 1000;
      const effectiveSpeedKmh =
        liveSpeed && liveSpeed > 5 && !isNaN(liveSpeed) ? liveSpeed : 30;
      const durationMinutes = Math.max(
        1,
        Math.round((distanceKm / effectiveSpeedKmh) * 60),
      );

      return {
        eta: {
          distance: distanceKm.toFixed(2),
          duration: `${durationMinutes}`,
        },
        isNear,
        isArrived: false,
        isPassed: false,
      };
    }

    // Bus has passed parent's stop (busIdx >= stopIdx and directMeters > 60)
    return {
      eta: null,
      isNear: false,
      isArrived: false,
      isPassed: true,
    };
  }

  // Fallback if routeCoords are unavailable
  const distanceKm = directMetersToStop / 1000;
  return {
    eta: {
      distance: distanceKm.toFixed(2),
      duration: Math.max(1, Math.round((distanceKm / 30) * 60)).toString(),
    },
    isNear: directMetersToStop <= 500,
    isArrived: false,
    isPassed: false,
  };
}

type BusNearStopEvent = {
  stopName: string;
};

type StudentStatusEvent = {
  attendanceId: string;
  studentId?: string;
  status: string;
  attendance?: {
    id: string;
    student_id: string;
    status: string;
    pickup_time?: string | null;
    drop_time?: string | null;
  };
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
  const [busPassed, setBusPassed] = useState(false);
  const [studentNotification, setStudentNotification] = useState<{
    name: string;
    status: string;
  } | null>(null);
  const [school, setSchool] = useState<School | null>(null);

  const dataRef = useRef<ParentData | null>(null);
  const schoolRef = useRef<School | null>(null);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    schoolRef.current = school;
  }, [school]);

  const getStudentStatusText = (status?: string, busTripStatus?: string) => {
    if (status === "arrived_school" && busTripStatus === "drop") {
      return "Returning Home";
    }
    switch (status) {
      case "waiting":
        return "Waiting for pickup";
      case "boarded":
        return "Picked Up";
      case "absent":
        return "Absent";
      case "arrived_school":
        return "At School";
      case "dropped":
        return "Dropped Home";
      default:
        return "Waiting for pickup";
    }
  };

  const getFormattedDateTime = (isoString?: string | null) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) + ' at ' + date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getTimelineItems = () => {
    if (!data || !data.student_status) return [];

    const items = [];

    // 1. waiting: shows no events (empty array)

    // 3. absent
    if (data.student_status === "absent") {
      items.push({
        status: "absent",
        label: "Absent",
        time: getFormattedDateTime(data.student_absent_time) || "Today",
        color: "bg-red-500",
      });
    }

    // 2. boarded
    if (
      data.student_status === "boarded" ||
      data.student_status === "arrived_school" ||
      data.student_status === "dropped"
    ) {
      if (data.student_pickup_time) {
        items.push({
          status: "boarded",
          label: "Picked Up",
          time: getFormattedDateTime(data.student_pickup_time),
          color: "bg-green-500",
        });
      }
    }

    // 5. arrived_school
    if (data.student_status === "arrived_school" || data.student_status === "dropped") {
      items.push({
        status: "arrived_school",
        label: "At School",
        time: "Today",
        color: "bg-blue-500",
      });
    }

    // 6. returning_home
    const isReturning = data.student_status === "arrived_school" && data.bus_trip_status === "drop";
    if (isReturning || data.student_status === "dropped") {
      items.push({
        status: "returning_home",
        label: "Returning Home",
        time: "Today",
        color: "bg-orange-500",
      });
    }

    // 4. dropped
    if (data.student_status === "dropped") {
      if (data.student_drop_time) {
        items.push({
          status: "dropped",
          label: "Dropped Home",
          time: getFormattedDateTime(data.student_drop_time),
          color: "bg-green-500",
        });
      }
    }

    return items.reverse(); // Show most recent events first
  };

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
          let locJson = null;
          try {
            const locRes = await fetch(`/api/bus/${json.bus_id}`);

            if (locRes.ok) {
              locJson = await locRes.json();
              setLocation(locJson);
            } else {
              setLocation(null);
            }
          } catch (locErr) {
            console.error("Failed to fetch initial bus location:", locErr);
            setLocation(null);
          }

          try {
            const schoolRes = await fetch("/api/admin/school");
            if (schoolRes.ok) {
              const schoolJson = await schoolRes.json();
              setSchool(schoolJson);
            } else {
              setSchool(null);
            }
          } catch (schoolErr) {
            console.error("Failed to fetch school info:", schoolErr);
            setSchool(null);
          }

          if (
            locJson &&
            json.stop_lat !== undefined &&
            json.stop_lng !== undefined
          ) {
            const result = computeLiveEtaAndProximity(
              locJson,
              { lat: json.stop_lat, lng: json.stop_lng },
              json.route_coordinates,
              json.student_status,
            );
            setEta(result.eta);
            setBusNear(result.isNear);
            setBusArrived(result.isArrived);
            setBusPassed(result.isPassed);
          }
        } else {
          setError("No bus ID found");
        }

        setLoading(false);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setLoading(false);
      }
    };

    fetchData();

    socket.on("bus-location-update", (liveData: BusLocationUpdate) => {
      const currentData = dataRef.current;

      if (!currentData) {
        return;
      }

      if (liveData.busId !== currentData.bus_id) {
        return;
      }

      setLocation({
        lat: liveData.lat,
        lng: liveData.lng,
      });

      if (
        currentData.stop_lat !== undefined &&
        currentData.stop_lng !== undefined
      ) {
        const result = computeLiveEtaAndProximity(
          { lat: liveData.lat, lng: liveData.lng },
          { lat: currentData.stop_lat, lng: currentData.stop_lng },
          currentData.route_coordinates,
          currentData.student_status,
          liveData.speed,
        );

        setEta(result.eta);
        setBusNear(result.isNear);
        setBusArrived(result.isArrived);
        setBusPassed(result.isPassed);
      }
    });

    socket.on("bus-near-stop", (liveData: BusNearStopEvent & { studentId?: string }) => {
      const currentData = dataRef.current;
      if (currentData && liveData.studentId === currentData.student_id) {
        showNotification("Bus Near Stop", `Bus is near ${liveData.stopName}`);
      }
    });

    socket.on("trip-status-update", (liveData: { busId: string; tripStatus: string }) => {
      const currentData = dataRef.current;
      if (currentData && liveData.busId === currentData.bus_id) {
        setData((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            bus_trip_status: liveData.tripStatus,
          };
        });
      }
    });

    socket.on("attendance-update", (liveData: StudentStatusEvent) => {
      const currentData = dataRef.current;
      const targetStudentId = liveData.studentId || liveData.attendance?.student_id;

      if (currentData && targetStudentId === currentData.student_id) {
        showNotification(
          "Student Update",
          `${currentData.student_name} is now: ${getStudentStatusText(liveData.status)}`
        );

        setStudentNotification({
          name: currentData.student_name,
          status: getStudentStatusText(liveData.status),
        });

        if (liveData.status === "dropped") {
          setEta(null);
          setBusNear(false);
          setBusArrived(false);
          setBusPassed(true);
        }

        setData((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            student_status: liveData.status,
            student_pickup_time: liveData.status === "boarded" ? new Date().toISOString() : prev.student_pickup_time,
            student_drop_time: liveData.status === "dropped" ? new Date().toISOString() : prev.student_drop_time,
            student_absent_time: liveData.status === "absent" ? new Date().toISOString() : prev.student_absent_time,
          };
        });
      }
    });

    return () => {
      socket.off("bus-location-update");
      socket.off("bus-near-stop");
      socket.off("attendance-update");
      socket.off("trip-status-update");
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

  if (!data) {
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
          <div className="flex items-start gap-4">
            <BrandLogo />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">
                Parent Portal
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">
                {data.student_name}&apos;s Live Ride
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Bus Number: {data.bus_number || "Not assigned"} to {data.stop_name}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="status-pill bg-blue-50 text-blue-700">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Bus: {routeStatus}
            </span>
            <span className={`status-pill ${
              data.student_status === "boarded" || data.student_status === "arrived_school" || data.student_status === "dropped"
                ? "bg-green-50 text-green-700"
                : data.student_status === "absent"
                  ? "bg-red-50 text-red-700"
                  : "bg-amber-50 text-amber-700"
            }`}>
              <span className={`h-2 w-2 rounded-full ${
                data.student_status === "boarded" || data.student_status === "arrived_school" || data.student_status === "dropped"
                  ? "bg-green-500"
                  : data.student_status === "absent"
                    ? "bg-red-500"
                    : "bg-amber-500"
              }`} />
              Student: {getStudentStatusText(data.student_status, data.bus_trip_status)}
            </span>
            <Link
              href="/account"
              className="btn btn-soft text-xs"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Account
            </Link>
          </div>
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
              {data.student_status === "dropped" ? (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-1.5 text-right border border-green-200">
                  <span className="text-green-700 font-bold text-sm">✔ Child dropped off safely</span>
                </div>
              ) : busArrived ? (
                <div className="rounded-lg bg-green-50 px-3 py-1.5 text-right border border-green-200">
                  <p className="text-xs font-semibold uppercase text-green-700">Arrival Status</p>
                  <p className="text-sm font-bold text-green-800">Bus has arrived at your stop</p>
                </div>
              ) : eta ? (
                <div className="grid grid-cols-2 gap-2 text-right">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">Distance</p>
                    <p className="text-lg font-bold text-slate-950">{eta.distance} km</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">ETA</p>
                    <p className="text-lg font-bold text-amber-600">{eta.duration === "Arrived" ? "Arrived" : `${eta.duration} min`}</p>
                  </div>
                </div>
              ) : busPassed ? (
                <div className="rounded-lg bg-amber-50 px-3 py-1.5 text-right border border-amber-200">
                  <p className="text-xs font-semibold uppercase text-amber-700">Status</p>
                  <p className="text-sm font-bold text-amber-800">
                    Bus has passed your stop • Waiting for drop-off
                  </p>
                </div>
              ) : null}
            </div>
            <div className="map-shell h-[420px] sm:h-[520px]">
              {location && location.lat && location.lng ? ( 
                 <Map
                  lat={location.lat}
                  lng={location.lng}
                  busId={data?.bus_id}
                  busNumber={data?.bus_number}
                  driverName={data?.driver_name}
                  stopLat={data?.stop_lat}
                  stopLng={data?.stop_lng}
                  school={school}
                  routeCoordinates={(data as any)?.route_coordinates}
                  returnCoordinates={(data as any)?.return_coordinates}
                  routeStops={data?.route_stops}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center bg-slate-50 text-slate-500 p-6 text-center">
                  <span className="text-4xl mb-2">🚌</span>
                  <p className="font-semibold text-slate-700">Live tracking is not active</p>
                  <p className="text-sm mt-1 text-slate-500">The map and ETA will become visible once the bus starts its trip.</p>
                </div>
              )}
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
                  <dt className="text-slate-500">Student Status</dt>
                  <dd className={`font-semibold ${
                    data.student_status === "boarded" || data.student_status === "arrived_school" || data.student_status === "dropped"
                      ? "text-green-600"
                      : data.student_status === "absent"
                        ? "text-red-600"
                        : "text-amber-600"
                  }`}>{getStudentStatusText(data.student_status, data.bus_trip_status)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Bus Number</dt>
                  <dd className="font-semibold text-slate-950">{data.bus_number || "Not assigned"}</dd>
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

            {(busNear || busArrived || busPassed || studentNotification || data.student_status === "dropped") && (
              <div className="dashboard-card p-5">
                <h2 className="text-lg font-bold text-slate-950">Live alerts</h2>
                <div className="mt-4 space-y-3">
                  {data.student_status === "dropped" && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-800">
                      Child dropped off safely.
                    </div>
                  )}
                  {busArrived && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-800">
                      Bus has arrived at your stop.
                    </div>
                  )}
                  {busNear && !busArrived && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                      Bus is near your stop.
                    </div>
                  )}
                  {busPassed && !busArrived && data.student_status !== "dropped" && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                      Bus has passed your stop. Waiting for drop-off.
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
                {getTimelineItems().length === 0 ? (
                  <p className="text-sm text-slate-500">No attendance events yet.</p>
                ) : (
                  getTimelineItems().map((item, index) => (
                    <div key={index} className="flex gap-3 border-b border-slate-100 pb-3 last:border-0">
                      <span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${item.color}`} />
                      <div>
                        <p className="font-semibold text-slate-950">
                          {item.label}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {item.time}
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
