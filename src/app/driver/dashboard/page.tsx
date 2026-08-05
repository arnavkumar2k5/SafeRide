"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";
import { BrandLogo } from "@/components/BrandLogo";


type Student = {

id: string;

student_id: string;

student_name: string;

stop_id: string;

stop_order: number;

stop_name: string;

status:
  | "waiting"
  | "boarded"
  | "arrived_school"
  | "dropped"
  | "absent";

pickup_time: string | null;

drop_time: string | null;
}

type School = {
  latitude: number;
  longitude: number;
};

type Stop = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

type TripStatus = "idle" | "pickup" | "at_school" | "drop" | "completed";

type TodayResponse = {
  students: Student[];
  trip_status: TripStatus;
};

const DriverMap = dynamic(() => import("@/components/DriverMap"), {
  ssr: false,
});

export default function DriverDashboard() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [tracking, setTracking] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [school, setSchool] = useState<School | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [completedStops, setCompletedStops] = useState<string[]>([]);
  const [tripStatus, setTripStatus] = useState<TripStatus | null>(null);

  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/driver/today");
      const data: TodayResponse = await res.json();
      setStudents(data.students);
      setTripStatus(data.trip_status);
      const progressRes = await fetch("/api/driver/stop-progress");
const progressData = await progressRes.json();

setCompletedStops(progressData.completedStops);
    } catch (error) {
      console.error(error);
    }
  };
  useEffect(() => {

    fetchStudents();

    const fetchSchool = async () => {
      try {
        const schoolRes = await fetch("/api/admin/school");
        const schoolJson = await schoolRes.json();
        setSchool(schoolJson);
      } catch (error) {
        console.error(error);
      }
    };

    fetchSchool();

    const fetchStops = async () => {
      try {
        const res = await fetch("/api/driver/stops");
        const data = await res.json();
        setStops(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
      }
    };

    fetchStops();

    let watchId: number;

    if (tracking) {
      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          setLocation({ lat, lng });

          try {
            await fetch("/api/driver/location", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                lat,
                lng,
                speed: position.coords.speed || 0,
              }),
            });

            socket.emit("bus-location", {
              lat,
              lng,
            });
          } catch (error) {
            console.error(error);
          }
        },
        (error) => {
          console.error(error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 5000,
        },
      );
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [tracking]);

  function interpolatePoints(
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    steps = 40,
  ) {
    const points = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;

      points.push({
        lat: start.lat + (end.lat - start.lat) * t,
        lng: start.lng + (end.lng - start.lng) * t,
      });
    }

    return points;
  }

  const pickupStudent = async (attendanceId: string) => {
  await fetch("/api/driver/pickup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      attendanceId,
    }),
  });

  fetchStudents();
};

const markAbsent = async (attendanceId: string) => {
  await fetch("/api/driver/absent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      attendanceId,
    }),
  });

  fetchStudents();
};

const markArrivedAtSchool = async () => {
  await fetch("/api/driver/arrived-school", {
    method: "POST",
  });

  fetchStudents();
};

const dropAllStudents = async () => {
  await fetch("/api/driver/drop-all", {
    method: "POST",
  });

  fetchStudents();
};

const dropStudent = async (attendanceId: string) => {
  await fetch("/api/driver/drop", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      attendanceId,
    }),
  });

  fetchStudents();
};

const currentStop = stops.find(
  (stop) => !completedStops.includes(stop.id)
);

const studentsAtCurrentStop = currentStop
  ? students.filter(
      (student) => student.stop_id === currentStop.id
    )
  : [];

const allStudentsHandled =
  studentsAtCurrentStop.every(
    (student) =>
      student.status === "boarded" ||
      student.status === "absent"
);

const updateTripStatus = async (
  status: Exclude<TripStatus, "idle">
) => {
  await fetch("/api/driver/trip-status", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status,
    }),
  });

  setTripStatus(status);
};

  const startSimulation = async () => {
    if (!school || stops.length === 0) return;
    // Don't clear completed stops.
// They are restored from the database.

    const schoolPoint = {
      lat: school.latitude,
      lng: school.longitude,
    };

    const route = [
      schoolPoint,
      ...stops.map((stop) => ({
        lat: stop.lat,
        lng: stop.lng,
      })),
      schoolPoint, // Return to school
    ];

    let path: { lat: number; lng: number }[] = [];

    for (let i = 0; i < route.length - 1; i++) {
      path.push(...interpolatePoints(route[i], route[i + 1], 80));
    }

    let index = 0;

    const timer = setInterval(async () => {
      if (index >= path.length) {
        clearInterval(timer);

        // Wait a moment so the user can see the bus at school
        setTimeout(() => {
          setCompletedStops([]);
          setLocation({
            lat: school.latitude,
            lng: school.longitude,
          });

          alert("Trip Completed! Bus returned to school.");
        }, 1500);

        return;
      }

      const point = path[index];

      setLocation(point);

      for (const stop of stops) {
        const distance = Math.sqrt(
          Math.pow(point.lat - stop.lat, 2) + Math.pow(point.lng - stop.lng, 2),
        );

        if (
    distance < 0.0002 &&
    allStudentsHandled
) {
    if (!completedStops.includes(stop.id)) {

    await fetch("/api/driver/stop-progress", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            stopId: stop.id,
        }),
    });

    setCompletedStops((prev) => [...prev, stop.id]);

}}
      }

      try {
        await fetch("/api/driver/location", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lat: point.lat,
            lng: point.lng,
            speed: 35,
          }),
        });

        socket.emit("bus-location", point);
      } catch (err) {
        console.error(err);
      }

      index++;
    }, 300);
  };

  return (
    <main className="dashboard-shell">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[260px_1fr] lg:px-8">
        <aside className="dashboard-sidebar sticky top-4 hidden h-[calc(100vh-2rem)] rounded-lg p-5 lg:block">
          <BrandLogo subtitle="Driver console" />
          <nav className="mt-8 space-y-2 text-sm font-semibold text-slate-600">
            <a
              className="block rounded-lg bg-slate-950 px-3 py-2 text-white"
              href="#route"
            >
              Route map
            </a>
            <a
              className="block rounded-lg px-3 py-2 hover:bg-slate-100"
              href="#students"
            >
              Student stops
            </a>
            <a
              className="block rounded-lg px-3 py-2 hover:bg-slate-100"
              href="#location"
            >
              Location status
            </a>
          </nav>
        </aside>

        <section className="flex min-w-0 flex-col gap-4">
          <header className="dashboard-card flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">
                Driver Dashboard
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">
                Route Operations
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage live tracking and student pickup status from one screen.
              </p>
            </div>
            <button
              className={`btn ${tracking ? "btn-red" : "btn-blue"} w-full sm:w-auto`}
              onClick={() => setTracking(!tracking)}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${tracking ? "bg-white" : "bg-blue-200"}`}
              />
              {tracking ? "Stop Tracking" : "Start Tracking"}
            </button>
            <button className="btn btn-green" onClick={startSimulation}>
              Start Simulation
            </button>
            {tripStatus === "idle" && (
  <button
    className="btn btn-green"
    onClick={() => updateTripStatus("pickup")}
  >
    Start Pickup
  </button>
)}

{tripStatus === "pickup" && (
  <button
    className="btn btn-yellow"
    onClick={() => updateTripStatus("at_school")}
  >
    Reached School
  </button>
)}

{tripStatus === "at_school" && (
  <>
    <button
      className="btn btn-green"
      onClick={markArrivedAtSchool}
    >
      Mark Arrived at School
    </button>

    <button
      className="btn btn-blue"
      onClick={() => updateTripStatus("drop")}
    >
      Start Drop Trip
    </button>
  </>
)}

{tripStatus === "drop" && (
  <button
    className="btn btn-red"
    onClick={() => updateTripStatus("completed")}
  >
    Finish Trip
  </button>
)}
          </header>

          <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
            <section id="route" className="dashboard-card overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    Assigned route
                  </h2>
                  <p className="text-sm text-slate-500">
                    School origin, planned stops, and live driver position.
                  </p>
                </div>
                <span
                  className={`status-pill ${
                    tracking
                      ? "bg-green-50 text-green-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${tracking ? "bg-green-500" : "bg-slate-400"}`}
                  />
                  {tracking ? "Broadcasting" : "Idle"}
                </span>
              </div>
              <div className="map-shell h-[430px] sm:h-[560px]">
                <DriverMap
                  location={location}
                  stops={stops}
                  school={school}
                  completedStops={completedStops}
                />
              </div>
            </section>

            <aside className="flex flex-col gap-4">
              <div id="location" className="dashboard-card p-5">
                <h2 className="text-lg font-bold text-slate-950">
                  Driver status
                </h2>
                <span>Trip Status

{tripStatus}</span>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="dashboard-card-muted p-3">
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Stops
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-950">
                      {stops.length}
                    </p>
                  </div>
                  <div className="dashboard-card-muted p-3">
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Students
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-950">
                      {students.length}
                    </p>
                  </div>
                </div>
                {location ? (
                  <dl className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Latitude</dt>
                      <dd className="font-semibold text-slate-950">
                        {location.lat.toFixed(6)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Longitude</dt>
                      <dd className="font-semibold text-slate-950">
                        {location.lng.toFixed(6)}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                    Start tracking to broadcast the current bus location.
                  </p>
                )}
              </div>

              <div className="dashboard-card p-5">
                <h2 className="text-lg font-bold text-slate-950">
                  Stop progression
                </h2>
                <div className="mt-4 space-y-3">
                  {stops.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No route stops assigned.
                    </p>
                  ) : (
                    stops.map((stop, index) => (
                      <div key={stop.id} className="flex items-center gap-3">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-950">
                            {stop.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {stop.lat}, {stop.lng}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </aside>
          </div>

          <section id="students" className="dashboard-card p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
    Current Stop
  </p>

  <h3 className="mt-1 text-xl font-bold text-slate-900">
    📍 {currentStop?.name ?? "Trip Completed"}
  </h3>

  <p className="mt-2 text-sm text-slate-600">
    {studentsAtCurrentStop.length} student(s)
  </p>
</div>
{!allStudentsHandled &&
currentStop && (
<div className="rounded-lg bg-yellow-50 border border-yellow-300 p-3 mb-4">

⚠ Please mark every student as
Pickup or Absent before leaving this stop.

</div>
)}
                <h2 className="text-lg font-bold text-slate-950">
                  Current Stop Students
                </h2>
                <p className="text-sm text-slate-500">
                  Mark students as Picked or Absent for the current stop.
                </p>
              </div>
              <span className="status-pill bg-amber-50 text-amber-700">
                {studentsAtCurrentStop.length} students
              </span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {studentsAtCurrentStop.length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                  No students are waiting at this stop.
                </p>
              ) : (
                studentsAtCurrentStop.map((student) => (
                  <div
                    key={student.student_id}
                    className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-bold text-slate-950">{student.student_name}</p>
                      
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                      {student.status === "waiting" && (
  <>
    <button
      className="btn btn-green"
      onClick={() => pickupStudent(student.id)}
    >
      Pickup
    </button>

    <button
      className="btn btn-gray"
      onClick={() => markAbsent(student.id)}
    >
      Absent
    </button>
  </>
)}

{tripStatus === "drop" &&
 student.status === "arrived_school" && (
  <button
    className="btn btn-red"
    onClick={() => dropStudent(student.id)}
  >
    Drop
  </button>
)}

{student.status === "dropped" && (
    <span className="font-semibold text-green-600">
        ✔ Completed
    </span>
)}

{student.status === "arrived_school" &&
 tripStatus !== "drop" && (
  <span className="font-semibold text-blue-600">
    🏫 At School
  </span>
)}

{student.status === "absent" && (
    <span className="font-semibold text-red-600">
        ❌ Absent
    </span>
)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
