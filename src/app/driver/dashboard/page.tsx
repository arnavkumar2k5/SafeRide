"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import io from "socket.io-client";

const socket = io("https://safe-ride-weld.vercel.app/");

type Student = {
  id: string;
  name: string;
};

type School = {
  latitude: number;
  longitude: number;
};

type Stop = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
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

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await fetch("/api/driver/students");
        const data = await res.json();
        setStudents(data);
      } catch (error) {
        console.error(error);
      }
    };

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

  const markStudent = async (student: Student, status: "boarded" | "dropped") => {
    try {
      await fetch("/api/driver/student-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: student.id,
          status,
        }),
      });

      socket.emit("student-status", {
        studentId: student.id,
        studentName: student.name,
        status,
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <main className="dashboard-shell">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[260px_1fr] lg:px-8">
        <aside className="dashboard-sidebar sticky top-4 hidden h-[calc(100vh-2rem)] rounded-lg p-5 lg:block">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-amber-400 font-black text-slate-950">
              SR
            </div>
            <div>
              <p className="font-bold text-slate-950">SafeRide</p>
              <p className="text-xs text-slate-500">Driver console</p>
            </div>
          </div>
          <nav className="mt-8 space-y-2 text-sm font-semibold text-slate-600">
            <a className="block rounded-lg bg-slate-950 px-3 py-2 text-white" href="#route">
              Route map
            </a>
            <a className="block rounded-lg px-3 py-2 hover:bg-slate-100" href="#students">
              Student stops
            </a>
            <a className="block rounded-lg px-3 py-2 hover:bg-slate-100" href="#location">
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
              <span className={`h-2.5 w-2.5 rounded-full ${tracking ? "bg-white" : "bg-blue-200"}`} />
              {tracking ? "Stop Tracking" : "Start Tracking"}
            </button>
          </header>

          <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
            <section id="route" className="dashboard-card overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Assigned route</h2>
                  <p className="text-sm text-slate-500">
                    School origin, planned stops, and live driver position.
                  </p>
                </div>
                <span
                  className={`status-pill ${
                    tracking ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${tracking ? "bg-green-500" : "bg-slate-400"}`} />
                  {tracking ? "Broadcasting" : "Idle"}
                </span>
              </div>
              <div className="map-shell h-[430px] sm:h-[560px]">
                <DriverMap location={location} stops={stops} school={school} />
              </div>
            </section>

            <aside className="flex flex-col gap-4">
              <div id="location" className="dashboard-card p-5">
                <h2 className="text-lg font-bold text-slate-950">Driver status</h2>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="dashboard-card-muted p-3">
                    <p className="text-xs font-bold uppercase text-slate-400">Stops</p>
                    <p className="mt-1 text-2xl font-bold text-slate-950">{stops.length}</p>
                  </div>
                  <div className="dashboard-card-muted p-3">
                    <p className="text-xs font-bold uppercase text-slate-400">Students</p>
                    <p className="mt-1 text-2xl font-bold text-slate-950">{students.length}</p>
                  </div>
                </div>
                {location ? (
                  <dl className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Latitude</dt>
                      <dd className="font-semibold text-slate-950">{location.lat.toFixed(6)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Longitude</dt>
                      <dd className="font-semibold text-slate-950">{location.lng.toFixed(6)}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                    Start tracking to broadcast the current bus location.
                  </p>
                )}
              </div>

              <div className="dashboard-card p-5">
                <h2 className="text-lg font-bold text-slate-950">Stop progression</h2>
                <div className="mt-4 space-y-3">
                  {stops.length === 0 ? (
                    <p className="text-sm text-slate-500">No route stops assigned.</p>
                  ) : (
                    stops.map((stop, index) => (
                      <div key={stop.id} className="flex items-center gap-3">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-950">{stop.name}</p>
                          <p className="text-xs text-slate-500">
                            {stop.latitude}, {stop.longitude}
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
                <h2 className="text-lg font-bold text-slate-950">Student manifest</h2>
                <p className="text-sm text-slate-500">Mark pickup and drop-off events in real time.</p>
              </div>
              <span className="status-pill bg-amber-50 text-amber-700">{students.length} assigned</span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {students.length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                  No students are assigned to this route.
                </p>
              ) : (
                students.map((student) => (
                  <div
                    key={student.id}
                    className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-bold text-slate-950">{student.name}</p>
                      <p className="text-sm text-slate-500">Student ID {student.id}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                      <button className="btn btn-green" onClick={() => markStudent(student, "boarded")}>
                        Picked Up
                      </button>
                      <button className="btn btn-red" onClick={() => markStudent(student, "dropped")}>
                        Dropped
                      </button>
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
