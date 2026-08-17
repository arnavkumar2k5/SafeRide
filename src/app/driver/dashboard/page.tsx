"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Link from "next/link";
import { socket } from "@/lib/socket";
import { BrandLogo } from "@/components/BrandLogo";

type Student = {
  id: string;

  student_id: string;

  student_name: string;

  stop_id: string;

  stop_order: number;

  stop_name: string;

  status: "waiting" | "boarded" | "arrived_school" | "dropped" | "absent";

  pickup_time: string | null;

  drop_time: string | null;
};

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
  routeCoordinates?: [number, number][];
};

const DriverMap = dynamic(() => import("@/components/DriverMap"), {
  ssr: false,
});

export default function DriverDashboard() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [tracking, setTracking] = useState(false);
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [school, setSchool] = useState<School | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [completedStops, setCompletedStops] = useState<string[]>([]);
  const [tripStatus, setTripStatus] = useState<TripStatus | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  // const [arrivedAtSchool, setArrivedAtSchool] = useState(false);

  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/driver/today");
      const data: TodayResponse = await res.json();
      setStudents(data.students);
      setTripStatus(data.trip_status);
      setRouteCoordinates(data.routeCoordinates || []);
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
  try {
    const res = await fetch("/api/driver/absent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        attendanceId,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Failed to mark student absent.");
      return;
    }

    await fetchStudents();
  } catch (error) {
    console.error("Failed to mark student absent:", error);
    alert("Something went wrong while marking student absent.");
  }
};

  const markArrivedAtSchool = async () => {
    try {
      const res = await fetch("/api/driver/arrived-school", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to mark students as arrived at school.");
        return;
      }

      await fetchStudents();

      // setArrivedAtSchool(true);

      alert("Students marked as arrived at school.");
    } catch (error) {
      console.error(error);
      alert("Something went wrong while marking students as arrived.");
    }
  };

  const startDropTrip = async () => {
  if (!allBoardedStudentsArrived) {
    alert("Mark students as arrived at school first.");
    return;
  }

  await updateTripStatus("drop");
};

  // const dropAllStudents = async () => {
  //   await fetch("/api/driver/drop-all", {
  //     method: "POST",
  //   });

  //   fetchStudents();
  // };

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
  
  const isNearStop = (
    busLocation: { lat: number; lng: number } | null,
    stop: Stop | undefined,
  ) => {
    if (!busLocation || !stop) return false;
  
    const distance = Math.sqrt(
      Math.pow(busLocation.lat - stop.lat, 2) +
        Math.pow(busLocation.lng - stop.lng, 2),
    );
  
    return distance < 0.0002;
  };

  const currentStop = stops.find((stop) => !completedStops.includes(stop.id));

  const dropStops = stops.filter((stop) =>
    students.some(
      (student) =>
        student.stop_id === stop.id && student.status === "arrived_school",
    ),
  );

  const currentDropStop = dropStops[0];

  const studentsAtCurrentDropStop = currentDropStop
    ? students.filter(
        (student) =>
          student.stop_id === currentDropStop.id &&
          student.status === "arrived_school",
      )
    : [];
  
    
  const isAtCurrentDropStop = isNearStop(
  location,
  currentDropStop,
);

  const studentsAtCurrentStop = currentStop
    ? students.filter((student) => student.stop_id === currentStop.id)
    : [];

  const allStopsCompleted =
    stops.length > 0 && completedStops.length === stops.length;

  const allBoardedStudentsArrived = students
    .filter((student) => student.status !== "absent")
    .every((student) => student.status === "arrived_school");

  const allStudentsDropped = students
    .filter((student) => student.status !== "absent")
    .every((student) => student.status === "dropped");

  const dropCompletedStops = [
  ...new Set(
    students
      .filter((student) => student.status === "dropped")
      .map((student) => student.stop_id)
  ),
];

  const allStudentsHandled = studentsAtCurrentStop.every(
    (student) => student.status === "boarded" || student.status === "absent",
  );

  const updateTripStatus = async (status: Exclude<TripStatus, "idle">) => {
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
  if (!school || stops.length === 0 || simulationRunning) return;

  setSimulationRunning(true);

  try {
    // If the trip is idle, start pickup automatically.
    if (tripStatus === "idle") {
      await updateTripStatus("pickup");
    }

    const schoolPoint = {
      lat: school.latitude,
      lng: school.longitude,
    };

    // Move the simulated bus between two points.
    const moveToPoint = async (
      start: { lat: number; lng: number },
      end: { lat: number; lng: number },
    ) => {
      const points = interpolatePoints(start, end, 80);

      for (const point of points) {
        setLocation(point);

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
        } catch (error) {
          console.error("Simulation location error:", error);
        }

        await new Promise((resolve) =>
          setTimeout(resolve, 300),
        );
      }
    };

    // =====================================================
    // WAIT FOR PICKUP STOP
    // =====================================================

    const waitForPickupStop = async (stopId: string) => {
      while (true) {
        const res = await fetch("/api/driver/today");

        if (!res.ok) {
          throw new Error("Failed to fetch today's trip data");
        }

        const data: TodayResponse = await res.json();

        setStudents(data.students);
        setTripStatus(data.trip_status);

        const studentsAtStop = data.students.filter(
          (student) => student.stop_id === stopId,
        );

        const handled =
          studentsAtStop.length === 0 ||
          studentsAtStop.every(
            (student) =>
              student.status === "boarded" ||
              student.status === "absent",
          );

        if (handled) {
          return;
        }

        // Stay at the stop until driver handles everyone.
        await new Promise((resolve) =>
          setTimeout(resolve, 1000),
        );
      }
    };

    // =====================================================
    // WAIT FOR DRIVER TO START DROP TRIP
    // =====================================================

    const waitForDropTrip = async () => {
      while (true) {
        const res = await fetch("/api/driver/today");

        if (!res.ok) {
          throw new Error("Failed to fetch today's trip data");
        }

        const data: TodayResponse = await res.json();

        setStudents(data.students);
        setTripStatus(data.trip_status);

        if (data.trip_status === "drop") {
          return data.students;
        }

        if (data.trip_status === "completed") {
          return null;
        }

        // Driver still needs to:
        // Reached School
        // Mark Arrived at School
        // Start Drop Trip
        await new Promise((resolve) =>
          setTimeout(resolve, 1000),
        );
      }
    };

    // =====================================================
    // WAIT FOR STUDENTS TO BE DROPPED
    // =====================================================

    const waitForDropStop = async (stopId: string) => {
      while (true) {
        const res = await fetch("/api/driver/today");

        if (!res.ok) {
          throw new Error("Failed to fetch today's trip data");
        }

        const data: TodayResponse = await res.json();

        setStudents(data.students);
        setTripStatus(data.trip_status);

        const studentsAtStop = data.students.filter(
          (student) =>
            student.stop_id === stopId &&
            student.status === "arrived_school",
        );

        // Everyone who needs to be dropped at this stop
        // must be marked dropped by the driver.
        if (studentsAtStop.length === 0) {
          return;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, 1000),
        );
      }
    };

    // =====================================================
    // PICKUP ROUTE
    // =====================================================

    let previousPoint = schoolPoint;

    for (const stop of stops) {
      // Move to pickup stop.
      await moveToPoint(previousPoint, {
        lat: stop.lat,
        lng: stop.lng,
      });

      // STOP and wait for Pickup / Absent.
      await waitForPickupStop(stop.id);

      // Save completed pickup stop.
      try {
        await fetch("/api/driver/stop-progress", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            stopId: stop.id,
          }),
        });

        setCompletedStops((prev) =>
          prev.includes(stop.id)
            ? prev
            : [...prev, stop.id],
        );
      } catch (error) {
        console.error(
          "Failed to save stop progress:",
          error,
        );
      }

      previousPoint = {
        lat: stop.lat,
        lng: stop.lng,
      };
    }

    // =====================================================
    // RETURN TO SCHOOL
    // =====================================================

    await moveToPoint(previousPoint, schoolPoint);

    setLocation(schoolPoint);

    await fetchStudents();

    // =====================================================
    // WAIT FOR DRIVER TO START DROP
    // =====================================================

    const dropStudents = await waitForDropTrip();

    if (!dropStudents) {
      return;
    }

    // =====================================================
    // DROP ROUTE
    // =====================================================

    /*
     * Find the stops that contain students who need
     * to be dropped.
     *
     * Keep the original route order.
     */
    const dropStops = stops.filter((stop) =>
      dropStudents.some(
        (student) =>
          student.stop_id === stop.id &&
          student.status === "arrived_school",
      ),
    );

    previousPoint = schoolPoint;

    for (const stop of dropStops) {
      // Move to student's home stop.
      await moveToPoint(previousPoint, {
        lat: stop.lat,
        lng: stop.lng,
      });

      // STOP and wait for driver to click Drop.
      await waitForDropStop(stop.id);

      previousPoint = {
        lat: stop.lat,
        lng: stop.lng,
      };
    }

    // =====================================================
    // RETURN TO SCHOOL AFTER DROP
    // =====================================================

    await moveToPoint(previousPoint, schoolPoint);

    setLocation(schoolPoint);

    await fetchStudents();

    alert(
      "Drop route completed. Bus has returned to school.",
    );
  } catch (error) {
    console.error("Simulation failed:", error);
    alert("Simulation failed.");
  } finally {
    setSimulationRunning(false);
  }
};

  return (
    <main className="dashboard-shell">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[260px_1fr] lg:px-8">
        <aside className="dashboard-sidebar sticky top-4 hidden h-[calc(100vh-2rem)] rounded-lg p-5 lg:flex lg:flex-col lg:justify-between">
          <div>
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
          </div>
          <div className="border-t border-slate-200 pt-4">
            <Link
              href="/account"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Account & Profile
            </Link>
          </div>
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
            <div className="flex flex-wrap items-center gap-2">
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
            <button
              className={`btn ${tracking ? "btn-red" : "btn-blue"} w-full sm:w-auto`}
              onClick={() => setTracking(!tracking)}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${tracking ? "bg-white" : "bg-blue-200"}`}
              />
              {tracking ? "Stop Tracking" : "Start Tracking"}
            </button>
            <button
  className="btn btn-green"
  onClick={startSimulation}
  disabled={simulationRunning}
>
  {simulationRunning ? "Simulation Running..." : "Start Simulation"}
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
                onClick={() => updateTripStatus("at_school")}
                disabled={!allStopsCompleted}
                className={`rounded-lg px-4 py-2 font-medium transition ${
                  allStopsCompleted
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "cursor-not-allowed bg-gray-300 text-gray-600"
                }`}
              >
                Reached School
              </button>
            )}

            {tripStatus === "at_school" && (
  <>
    {!allBoardedStudentsArrived && (
      <button
        className="btn btn-green"
        onClick={markArrivedAtSchool}
      >
        Mark Arrived at School
      </button>
    )}

    {allBoardedStudentsArrived && (
      <button
        className="btn btn-blue"
        onClick={startDropTrip}
      >
        Start Drop Trip
      </button>
    )}
  </>
)}

            {tripStatus === "drop" && (
              <button
                className="btn btn-red"
                disabled={!allStudentsDropped}
                onClick={() => updateTripStatus("completed")}
              >
                Finish Trip
              </button>
            )}
            {tripStatus === "drop" && !allStudentsDropped && (
              <p className="mt-2 text-sm text-amber-600">
                Drop all students before finishing the trip.
              </p>
            )}
            {tripStatus === "pickup" && !allStopsCompleted && (
              <p className="mt-2 text-sm text-amber-600">
                Complete all route stops before reaching school.
              </p>
            )}
            </div>
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
    tripStatus === "pickup"
      ? "bg-blue-50 text-blue-700"
      : tripStatus === "at_school"
        ? "bg-green-50 text-green-700"
        : tripStatus === "drop"
          ? "bg-orange-50 text-orange-700"
          : tripStatus === "completed"
            ? "bg-green-50 text-green-700"
            : "bg-slate-100 text-slate-600"
  }`}
>
  <span
    className={`h-2 w-2 rounded-full ${
      tripStatus === "pickup"
        ? "bg-blue-500"
        : tripStatus === "at_school"
          ? "bg-green-500"
          : tripStatus === "drop"
            ? "bg-orange-500"
            : tripStatus === "completed"
              ? "bg-green-500"
              : "bg-slate-400"
    }`}
  />

  {tripStatus === "pickup"
    ? "Pickup"
    : tripStatus === "at_school"
      ? "At School"
      : tripStatus === "drop"
        ? "Drop"
        : tripStatus === "completed"
          ? "Completed"
          : "Idle"}
</span>
              </div>
              <div className="map-shell h-[430px] sm:h-[560px]">
                <DriverMap
                  location={location}
                  stops={stops}
                  school={school}
                  completedStops={completedStops}
                  dropCompletedStops={dropCompletedStops}
                  tripStatus={tripStatus ?? "idle"}
                  routeCoordinates={routeCoordinates}
                />
              </div>
            </section>

            <aside className="flex flex-col gap-4">
              <div id="location" className="dashboard-card p-5">
                <h2 className="text-lg font-bold text-slate-950">
                  Driver status
                </h2>
                <span>
                  Trip Status
                  {tripStatus}
                </span>
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
                    📍{" "}
                    {tripStatus === "drop"
                      ? (currentDropStop?.name ?? "All Students Dropped")
                      : (currentStop?.name ?? "Trip Completed")}
                      {tripStatus === "drop" && currentDropStop && (
  <p className="mt-1 text-sm font-medium text-slate-500">
    {isAtCurrentDropStop
      ? "Bus has reached this stop."
      : "Drive to this stop to drop students."}
  </p>
)}
                  </h3>

                  <p className="mt-2 text-sm text-slate-600">
                    {tripStatus === "drop"
                      ? studentsAtCurrentDropStop.length
                      : studentsAtCurrentStop.length}{" "}
                    student(s)
                  </p>
                </div>
                {!allStudentsHandled && currentStop && (
                  <div className="rounded-lg bg-yellow-50 border border-yellow-300 p-3 mb-4">
                    ⚠ Please mark every student as Pickup or Absent before
                    leaving this stop.
                  </div>
                )}
                <h2 className="text-lg font-bold text-slate-950">
                  Current Stop Students
                </h2>
                <p className="text-sm text-slate-500">
                  {tripStatus === "drop"
                    ? "Mark students as dropped at their stop."
                    : "Mark students as Picked or Absent for the current stop."}
                </p>
              </div>
              <span className="status-pill bg-amber-50 text-amber-700">
                {tripStatus === "drop"
                  ? studentsAtCurrentDropStop.length
                  : studentsAtCurrentStop.length}{" "}
                students
              </span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {(tripStatus === "drop"
                ? studentsAtCurrentDropStop
                : studentsAtCurrentStop
              ).length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                  {tripStatus === "drop"
                    ? "No students need to be dropped at this stop."
                    : "No students are waiting at this stop."}
                </p>
              ) : (
                (tripStatus === "drop"
                  ? studentsAtCurrentDropStop
                  : studentsAtCurrentStop
                ).map((student) => (
                  <div
                    key={student.student_id}
                    className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-bold text-slate-950">
                        {student.student_name}
                      </p>
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
  student.status === "arrived_school" &&
  isAtCurrentDropStop && (
    <button
      className="btn btn-red"
      onClick={() => dropStudent(student.id)}
    >
      Drop
    </button>
  )}
  {tripStatus === "drop" &&
  student.status === "arrived_school" &&
  !isAtCurrentDropStop && (
    <span className="text-sm font-semibold text-amber-600">
      Waiting for bus to reach stop
    </span>
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
