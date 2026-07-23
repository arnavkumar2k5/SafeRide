"use client";

import dynamic from "next/dynamic";
import React, { useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
const StopPickerMap = dynamic(() => import("../components/StopPickerMap"), {
  ssr: false,
});

const AdminMap = dynamic(() => import("@/components/AdminMap"), {
  ssr: false,
});

type LiveBus = {
  bus_id: string;
  driver_name: string;
  lat: number;
  lng: number;
};

type Bus = {
  id: string;
  bus_number: string;
  driver_name: string | null;
};

type DashboardData = {
  buses: Bus[];
  totalDrivers: string;
  totalStudents: string;
};

type Driver = {
  id: string;
  name: string;
  email: string;
};

type Parent = {
  id: string;
  name: string;
  email: string;
};

type Stop = {
  id: string;
  name: string;
};

type Student = {
  id: string;
  student_name: string;
  parent_name: string;
  parent_email: string;
  bus_id: string;
  bus_number: string;
  stop_name: string;
  parent_id: string;
  stop_id: string;
};

type TripPoint = {
  lat: number;
  lng: number;
};

type AttendanceItem = {
  student_name: string;
  status: string;
  bus_id: string;
  bus_number: string;
  driver_name: string;
  updated_at: string | Date;
};

type Analytics = {
  totalTrips?: number;
  boarded?: number;
  dropped?: number;
  activeBuses?: number;
};

type School = {
  latitude: number;
  longitude: number;
};

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [selectedBus, setSelectedBus] = useState("");
  const [stops, setStops] = useState<Stop[]>([]);
  const [studentName, setStudentName] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [selectedStudentBus, setSelectedStudentBus] = useState("");
  const [selectedStop, setSelectedStop] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [liveBuses, setLiveBuses] = useState<LiveBus[]>([]);
  const [allStops, setAllStops] = useState<StopItem[]>([]);

  type RouteMap = {
    busId: string;
    busNumber: string;
    routeId: string;
    routeName: string;
    coordinates: [number, number][];

    stops: {
      id: string;
      name: string;
      stopOrder: number;
      lat: number;
      lng: number;
    }[];
  };

  type StopItem = {
    id: string;
    name: string;
    route_name: string;
    stop_order: number;
    lat: number;
    lng: number;
  };

  const [editingStop, setEditingStop] = useState<string | null>(null);

const [editStopName, setEditStopName] = useState("");
const [editStopOrder, setEditStopOrder] = useState("");

  const [routeLines, setRouteLines] = useState<RouteMap[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceItem[]>(
    [],
  );
  const [tripHistory, setTripHistory] = useState<[number, number][]>([]);
  const [selectedTripBus, setSelectedTripBus] = useState<string>("all");
  const [editingStudent, setEditingStudent] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBus, setEditBus] = useState("");
  const [busNumber, setBusNumber] = useState("");
  const [editingBus, setEditingBus] = useState<string | null>(null);
  const [selectedEditDriver, setSelectedEditDriver] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverEmail, setDriverEmail] = useState("");
  const [driverPassword, setDriverPassword] = useState("");
  const [routeName, setRouteName] = useState("");
  const [stopName, setStopName] = useState("");
  const [stopLat, setStopLat] = useState("");
  const [stopLng, setStopLng] = useState("");
  const [routes, setRoutes] = useState<{ id: string; name: string }[]>([]);
  const [selectedRoute, setSelectedRoute] = useState("");
  const [replayPosition, setReplayPosition] = useState<[number, number] | null>(
    null,
  );
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [selectedBusRoute, setSelectedBusRoute] = useState("");

  const [editedLat, setEditedLat] = useState<number | null>(null);
const [editedLng, setEditedLng] = useState<number | null>(null);

const onStopMoved = (
    stopId: string,
    lat: number,
    lng: number
) => {
    setEditedLat(lat);
    setEditedLng(lng);
};

  const fetchTripHistory = async (busId: string) => {
    try {
      const res = await fetch(`/api/admin/trip-history/${busId}`);
      const data = await res.json();
      const formatted: [number, number][] = data.map((item: TripPoint) => [
        item.lat,
        item.lng,
      ]);
      setTripHistory(formatted);
    } catch (error) {
      console.error(error);
    }
  };

  const replayTrip = () => {
    if (tripHistory.length === 0) return;

    let index = 0;
    const interval = setInterval(() => {
      setReplayPosition(tripHistory[index]);
      index++;

      if (index >= tripHistory.length) {
        clearInterval(interval);
      }
    }, 1000);
  };

  const fetchAttendance = async () => {
    try {
      const res = await fetch("/api/admin/attendance-history");
      const data = await res.json();
      setAttendanceHistory(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/dashboard");
      if (!res.ok) throw new Error("Failed to fetch Dashboard");

      const json = await res.json();
      setData(json);

      const assignRes = await fetch("/api/admin/assign-data");
      const assignJson = await assignRes.json();
      setDrivers(assignJson.drivers);
      setBuses(assignJson.buses);

      const studentRes = await fetch("/api/admin/student-data");
      const studentJson = await studentRes.json();
      setStops(studentJson.stops);

      const routesRes = await fetch("/api/admin/routes");
      const routesJson = await routesRes.json();
      setRoutes(routesJson);

      const studentsRes = await fetch("/api/admin/students");
      const studentsJson = await studentsRes.json();
      setStudents(studentsJson);

      const liveRes = await fetch("/api/admin/live-buses");

      const routesMapRes = await fetch("/api/admin/routes-map");
      const routesMapJson = await routesMapRes.json();

      setRouteLines(routesMapJson);

      const liveJson = await liveRes.json();
      setLiveBuses(liveJson);

      const analyticsRes = await fetch("/api/admin/analytics");
      const analyticsJson = await analyticsRes.json();

      const schoolRes = await fetch("/api/admin/school");
      const schoolJson = await schoolRes.json();
      setSchool(schoolJson);

      setAnalytics(analyticsJson);

      const stopsRes = await fetch("/api/admin/stops");
      const stopsJson = await stopsRes.json();

      setAllStops(stopsJson);
    } catch (error: unknown) {
      setError(
        error instanceof Error ? error.message : "Failed to fetch Dashboard",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAttendance();
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedTripBus !== "all") {
      fetchTripHistory(selectedTripBus);
    } else {
      setTripHistory([]);
      setReplayPosition(null);
    }
  }, [selectedTripBus]);

  const assignDriver = async () => {
    if (!selectedDriver || !selectedBus) {
      alert("Select driver and bus");
      return;
    }
    try {
      const res = await fetch("/api/admin/assign-driver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: selectedDriver, busId: selectedBus }),
      });
      const json = await res.json();

      if (!res.ok) {
        alert(json.error);
        return;
      }

      await fetchData();

      alert(json.message);
    } catch (error) {
      console.error(error);
    }
  };

  const addStudent = async () => {
    if (
      !studentName ||
      !parentName ||
      !parentEmail ||
      !selectedStudentBus ||
      !selectedStop
    ) {
      alert("Fill all fields");
      return;
    }
    try {
      const res = await fetch("/api/admin/add-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName,
          parentName,
          parentEmail,
          busId: selectedStudentBus,
          stopId: selectedStop,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        alert(json.error);
        return;
      }

      await fetchData();
      setStudentName("");
      setParentName("");
      setParentEmail("");
      setSelectedStudentBus("");
      setSelectedStop("");
      alert(json.message);
    } catch (error) {
      console.error(error);
    }
  };

  const deleteStudent = async (id: string) => {
    try {
      await fetch(`/api/admin/delete-student/${id}`, { method: "DELETE" });
      setStudents((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  const saveStudent = async (student: Student) => {
    try {
      await fetch(`/api/admin/edit-student/${student.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          parentId: student.parent_id,
          busId: editBus,
          stopId: student.stop_id,
        }),
      });
      setStudents((prev) =>
        prev.map((s) =>
          s.id === student.id
            ? { ...s, student_name: editName, bus_id: editBus }
            : s,
        ),
      );
      setEditingStudent(null);
      setStudentName("");
      setParentName("");
      setParentEmail("");
      setSelectedStudentBus("");
      setSelectedStop("");
    } catch (error) {
      console.error(error);
    }
  };

  const deleteBus = async (busId: string) => {
    try {
      const res = await fetch(`/api/admin/delete-bus/${busId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error);
        return;
      }
      setData((prev) =>
        prev
          ? {
              ...prev,
              buses: prev.buses.filter((b) => b.id !== busId),
            }
          : prev,
      );
      setBuses((prev) => prev.filter((b) => b.id !== busId));
    } catch (error) {
      console.error(error);
    }
  };

  const addBus = async () => {
    try {
      const res = await fetch("/api/admin/add-bus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          busNumber,
          routeId: selectedBusRoute,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error);
        return;
      }

      await fetchData();

      setBusNumber("");
      setSelectedBusRoute("");
      alert(json.message);
    } catch (error) {
      console.error(error);
    }
  };

  const saveBus = async (busId: string) => {
    try {
      const res = await fetch(`/api/admin/edit-bus/${busId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          driverId: selectedEditDriver,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error);
        return;
      }

      await fetchData();

      setEditingBus(null);

      alert(json.message);
    } catch (error) {
      console.error(error);
    }
  };

  const filteredStops = selectedRoute
  ? allStops.filter(
      (stop) =>
        routes.find((r) => r.id === selectedRoute)?.name === stop.route_name
    )
  : allStops;

  const addDriver = async () => {
    try {
      const res = await fetch("/api/admin/add-driver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: driverName,
          email: driverEmail,
          password: driverPassword,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error);
        return;
      }

      await fetchData();

      setDriverName("");
      setDriverEmail("");
      setDriverPassword("");

      alert(json.message);
    } catch (error) {
      console.error(error);
    }
  };

  const addRoute = async () => {
    try {
      const res = await fetch("/api/admin/add-route", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: routeName,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error);
        return;
      }

      setRouteName("");

      await fetchData();

      alert(json.message);
    } catch (error) {
      console.error(error);
    }
  };

  const addStop = async () => {
    try {
      if (!stopName || !selectedRoute || !stopLat || !stopLng) {
        alert("Please fill all fields and select a location on the map.");
        return;
      }
      const res = await fetch("/api/admin/add-stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: stopName,
          routeId: selectedRoute,
          lat: parseFloat(stopLat),
          lng: parseFloat(stopLng),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error);
        return;
      }

      await fetchData();

      setStopName("");
      setStopLat("");
      setStopLng("");
      setSelectedRoute("");

      setStopLat("");
      setStopLng("");
      alert(json.message);
    } catch (error) {
      console.error(error);
    }
  };

  const deleteStop = async (id: string) => {
  const confirmDelete = window.confirm(
    "Are you sure you want to delete this stop?"
  );

  if (!confirmDelete) return;

  try {
    const res = await fetch(`/api/admin/delete-stop/${id}`, {
      method: "DELETE",
    });

    const json = await res.json();

    if (!res.ok) {
      alert(json.error);
      return;
    }

    await fetchData();

    alert(json.message);
  } catch (error) {
    console.error(error);
  }
};

const saveStop = async (id: string) => {
  try {
    const res = await fetch(`/api/admin/edit-stop/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
    name: editStopName,
    stopOrder: Number(editStopOrder),
    lat: editedLat,
    lng: editedLng,
}),
    });

    const json = await res.json();

    if (!res.ok) {
      alert(json.error);
      return;
    }

    await fetchData();

    setEditingStop(null);

    alert(json.message);
  } catch (error) {
    console.error(error);
  }
};

  if (loading) {
    return (
      <main className="dashboard-shell flex min-h-screen items-center justify-center p-6">
        <div className="dashboard-card px-6 py-5 text-sm font-semibold text-slate-600">
          Loading operations center...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="dashboard-shell flex min-h-screen items-center justify-center p-6">
        <div className="dashboard-card border-red-200 px-6 py-5 text-red-700">
          {error}
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="dashboard-shell flex min-h-screen items-center justify-center p-6">
        <div className="dashboard-card px-6 py-5 text-slate-600">
          No data found.
        </div>
      </main>
    );
  }

  const statCards = [
    {
      label: "Active buses",
      value: analytics?.activeBuses ?? liveBuses.length,
      tone: "blue",
    },
    { label: "Total drivers", value: data.totalDrivers, tone: "slate" },
    { label: "Students", value: data.totalStudents, tone: "amber" },
    { label: "Trips", value: analytics?.totalTrips ?? 0, tone: "green" },
  ];

  return (
    <main className="dashboard-shell">
      <div className="mx-auto grid min-h-screen w-full max-w-[1500px] gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[270px_1fr] lg:px-8">
        <aside className="dashboard-sidebar sticky top-4 hidden h-[calc(100vh-2rem)] rounded-lg p-5 lg:block">
          <BrandLogo subtitle="Fleet operations" />
          <nav className="mt-8 space-y-2 text-sm font-semibold text-slate-600">
            {["Overview", "Live Map", "Students", "Fleet", "Attendance"].map(
              (item) => (
                <a
                  key={item}
                  className="block rounded-lg px-3 py-2 hover:bg-slate-100 first:bg-slate-950 first:text-white"
                  href={`#${item.toLowerCase().replace(" ", "-")}`}
                >
                  {item}
                </a>
              ),
            )}
          </nav>
        </aside>

        <section className="flex min-w-0 flex-col gap-4">
          <header
            id="overview"
            className="dashboard-card flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">
                Admin Control Center
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">
                Transport Operations
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Live fleet visibility, attendance, route replay, and resource
                management.
              </p>
            </div>
            <span className="status-pill bg-green-50 text-green-700">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Realtime monitor
            </span>
          </header>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((stat) => (
              <div key={stat.label} className="dashboard-card p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  {stat.label}
                </p>
                <p className="mt-3 text-3xl font-bold text-slate-950">
                  {stat.value}
                </p>
                <div className="mt-4 h-1.5 rounded-full bg-slate-100">
                  <div
                    className={`h-1.5 rounded-full ${
                      stat.tone === "blue"
                        ? "bg-blue-500"
                        : stat.tone === "green"
                          ? "bg-green-500"
                          : stat.tone === "amber"
                            ? "bg-amber-400"
                            : "bg-slate-800"
                    }`}
                    style={{ width: "72%" }}
                  />
                </div>
              </div>
            ))}
          </section>

          <section
            id="live-map"
            className="grid gap-4 xl:grid-cols-[1fr_360px]"
          >
            <div className="dashboard-card overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    Live tracking and replay
                  </h2>
                  <p className="text-sm text-slate-500">
                    Active bus markers with trip history overlay and replay
                    position.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <select
                    value={selectedTripBus}
                    onChange={(e) => setSelectedTripBus(e.target.value)}
                    className="field min-w-44"
                  >
                    <option value="all">All Buses</option>
                    {data.buses.map((bus) => (
                      <option key={bus.id} value={bus.id}>
                        {bus.bus_number}
                      </option>
                    ))}
                  </select>
                  <button className="btn btn-yellow" onClick={replayTrip}>
                    Replay Trip
                  </button>
                </div>
              </div>
              <div className="map-shell h-[430px] sm:h-[560px]">
                <AdminMap
                  buses={liveBuses}
                  routes={routeLines}
                  selectedBus={selectedTripBus}
                  tripHistory={tripHistory}
                  replayPosition={replayPosition}
                  school={school}
                />
              </div>
            </div>

            <aside className="dashboard-card p-5">
              <h2 className="text-lg font-bold text-slate-950">
                Activity feed
              </h2>
              <div className="mt-4 space-y-3">
                {attendanceHistory.slice(0, 7).map((item, index) => (
                  <div
                    key={index}
                    className="flex gap-3 border-b border-slate-100 pb-3 last:border-0"
                  >
                    <span
                      className={`mt-1 h-2.5 w-2.5 rounded-full ${item.status === "boarded" ? "bg-green-500" : "bg-amber-500"}`}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-950">
                        {item.student_name}
                      </p>
                      <p className="text-sm text-slate-500">
                        {item.status === "boarded" ? "Boarded" : "Dropped"} on
                        bus {item.bus_id}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(item.updated_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                {attendanceHistory.length === 0 && (
                  <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                    No recent attendance events.
                  </p>
                )}
              </div>
            </aside>
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <div className="dashboard-card p-5">
              <h2 className="text-lg font-bold text-slate-950">
                Assign driver
              </h2>
              <div className="mt-4 space-y-3">
                <select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  className="field"
                >
                  <option value="">Select driver</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} ({driver.email})
                    </option>
                  ))}
                </select>
                <select
                  value={selectedBus}
                  onChange={(e) => setSelectedBus(e.target.value)}
                  className="field"
                >
                  <option value="">Select bus</option>
                  {buses.map((bus) => (
                    <option key={bus.id} value={bus.id}>
                      {bus.bus_number}
                    </option>
                  ))}
                </select>
                <button
                  onClick={assignDriver}
                  className="btn btn-primary w-full"
                >
                  Assign Driver
                </button>
              </div>
            </div>

            <div className="dashboard-card p-5">
              <h2 className="text-lg font-bold text-slate-950">Add Route</h2>

              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  className="field"
                  placeholder="Route Name"
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                />

                <button className="btn btn-primary w-full" onClick={addRoute}>
                  Add Route
                </button>
              </div>
            </div>

            <div className="dashboard-card p-5">
              <h2 className="text-lg font-bold text-slate-950">Add driver</h2>
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  placeholder="Driver name"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="field"
                />
                <input
                  type="email"
                  placeholder="Driver email"
                  value={driverEmail}
                  onChange={(e) => setDriverEmail(e.target.value)}
                  className="field"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={driverPassword}
                  onChange={(e) => setDriverPassword(e.target.value)}
                  className="field"
                />
                <button className="btn btn-blue w-full" onClick={addDriver}>
                  Add Driver
                </button>
              </div>
            </div>

            <div className="dashboard-card p-5">
              <h2 className="text-lg font-bold text-slate-950">Add stop</h2>
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  placeholder="Stop name"
                  value={stopName}
                  onChange={(e) => setStopName(e.target.value)}
                  className="field"
                />
                <select
                  value={selectedRoute}
                  onChange={(e) => setSelectedRoute(e.target.value)}
                  className="field"
                >
                  <option value="">Select Route</option>

                  {routes.map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.name}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    placeholder="Latitude"
                    value={stopLat}
                    onChange={(e) => setStopLat(e.target.value)}
                    className="field"
                  />

                  <input
                    type="number"
                    placeholder="Longitude"
                    value={stopLng}
                    onChange={(e) => setStopLng(e.target.value)}
                    className="field"
                  />
                </div>

                <div className="mt-3">
                  <StopPickerMap
  lat={stopLat}
  lng={stopLng}
  school={school}
  selectedRoute={selectedRoute}
  routes={routeLines}
  editingStopId={editingStop}
  editedLat={editedLat}
    editedLng={editedLng}
  onStopMoved={onStopMoved}
  onLocationSelect={(lat, lng) => {
    setStopLat(lat.toFixed(6));
    setStopLng(lng.toFixed(6));
  }}
/>
                </div>
                <button className="btn btn-green w-full" onClick={addStop}>
                  Add Stop
                </button>
              </div>
            </div>

            <div className="dashboard-card p-5 mt-4">
  <h2 className="text-lg font-bold">
    Manage Stops
  </h2>

  <table className="ops-table mt-4">
    <thead>
      <tr>
        <th>Name</th>
        <th>Route</th>
        <th>Order</th>
        <th>Latitude</th>
        <th>Longitude</th>
        <th>Actions</th>
      </tr>
    </thead>

    <tbody>

      {filteredStops.map((stop) => (
  <React.Fragment key={stop.id}>
        <tr key={stop.id}>

          <td>{stop.name}</td>

          <td>{stop.route_name}</td>

          <td>{stop.stop_order}</td>

          <td>{stop.lat.toFixed(5)}</td>

          <td>{stop.lng.toFixed(5)}</td>

          <td>
  <div className="flex gap-2">
    <button
  className="btn btn-soft min-h-9 px-3 py-1"
  onClick={() => {
  setEditingStop(stop.id);
  setEditStopName(stop.name);
  setEditStopOrder(String(stop.stop_order));

  // NEW
  setEditedLat(stop.lat);
  setEditedLng(stop.lng);
}}
>
  Edit
</button>

    <button
      className="btn btn-red min-h-9 px-3 py-1"
      onClick={() => deleteStop(stop.id)}
    >
      Delete
    </button>
  </div>
</td>

        </tr>
    

    {editingStop === stop.id && (
      <tr>
        <td colSpan={6} className="bg-slate-50">

          <div className="grid gap-3 md:grid-cols-[1fr_120px_auto_auto]">

            <input
              className="field"
              value={editStopName}
              onChange={(e) => setEditStopName(e.target.value)}
            />

            <input
              className="field"
              type="number"
              value={editStopOrder}
              onChange={(e) => setEditStopOrder(e.target.value)}
            />

            <button
              className="btn btn-green"
              onClick={() => saveStop(stop.id)}
            >
              Save
            </button>

            <button
              className="btn btn-soft"
              onClick={() => setEditingStop(null)}
            >
              Cancel
            </button>

          </div>

        </td>
      </tr>
    )}

  </React.Fragment>
))}

    </tbody>

  </table>
</div>
          </section>

          <section id="students" className="dashboard-card p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Student management
                </h2>
                <p className="text-sm text-slate-500">
                  Create, edit, and assign students to buses and stops.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[180px_180px_220px_150px_150px_auto]">
                <input
                  type="text"
                  placeholder="Student name"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="field"
                />
                <input
                  type="text"
                  placeholder="Parent Name"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  className="field"
                />

                <input
                  type="email"
                  placeholder="Parent Email"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  className="field"
                />
                <select
                  value={selectedStudentBus}
                  onChange={(e) => setSelectedStudentBus(e.target.value)}
                  className="field"
                >
                  <option value="">Bus</option>
                  {buses.map((bus) => (
                    <option key={bus.id} value={bus.id}>
                      {bus.bus_number}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedStop}
                  onChange={(e) => setSelectedStop(e.target.value)}
                  className="field"
                >
                  <option value="">Stop</option>
                  {stops.map((stop) => (
                    <option key={stop.id} value={stop.id}>
                      {stop.name}
                    </option>
                  ))}
                </select>
                <button onClick={addStudent} className="btn btn-yellow">
                  Add
                </button>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
              {students.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">No students found.</p>
              ) : (
                <table className="ops-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Parent</th>
                      <th>Email</th>
                      <th>Bus</th>
                      <th>Stop</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <React.Fragment key={student.id}>
                        <tr>
                          <td className="font-semibold">
                            {student.student_name}
                          </td>
                          <td>{student.parent_name}</td>
                          <td>{student.parent_email}</td>
                          <td>
                            <span className="status-pill bg-blue-50 text-blue-700">
                              {student.bus_number}
                            </span>
                          </td>
                          <td>{student.stop_name}</td>
                          <td>
                            <div className="flex gap-2">
                              <button
                                className="btn btn-soft min-h-9 px-3 py-1"
                                onClick={() => {
                                  setEditingStudent(student.id);
                                  setEditName(student.student_name);
                                  setEditBus(student.bus_id);
                                }}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-red min-h-9 px-3 py-1"
                                onClick={() => deleteStudent(student.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                        {editingStudent === student.id && (
                          <tr>
                            <td colSpan={6} className="bg-slate-50">
                              <div className="grid gap-3 md:grid-cols-[1fr_180px_auto_auto]">
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="field"
                                />
                                <select
                                  value={editBus}
                                  onChange={(e) => setEditBus(e.target.value)}
                                  className="field"
                                >
                                  <option value="">Select bus</option>
                                  {buses.map((bus) => (
                                    <option key={bus.id} value={bus.id}>
                                      {bus.bus_number}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  className="btn btn-green"
                                  onClick={() => saveStudent(student)}
                                >
                                  Save
                                </button>
                                <button
                                  className="btn btn-soft"
                                  onClick={() => setEditingStudent(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <section id="fleet" className="dashboard-card p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Fleet management
                </h2>
                <p className="text-sm text-slate-500">
                  Manage bus records and driver assignments.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={busNumber}
                  onChange={(e) => setBusNumber(e.target.value)}
                  placeholder="Bus number"
                  className="field"
                />
                <select
                  value={selectedBusRoute}
                  onChange={(e) => setSelectedBusRoute(e.target.value)}
                  className="field"
                >
                  <option value="">Select Route</option>

                  {routes.map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.name}
                    </option>
                  ))}
                </select>
                <button className="btn btn-primary" onClick={addBus}>
                  Add Bus
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.buses.length === 0 ? (
                <p className="text-sm text-slate-500">No buses found.</p>
              ) : (
                data.buses.map((bus) => (
                  <div
                    key={bus.id}
                    className="rounded-lg border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-400">
                          Bus
                        </p>
                        <p className="text-xl font-bold text-slate-950">
                          {bus.bus_number}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {bus.driver_name || "Not assigned"}
                        </p>
                      </div>
                      <span
                        className={`status-pill ${bus.driver_name ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}
                      >
                        {bus.driver_name ? "Assigned" : "Open"}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        className="btn btn-soft min-h-9 px-3 py-1"
                        onClick={() => setEditingBus(bus.id)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-red min-h-9 px-3 py-1"
                        onClick={() => deleteBus(bus.id)}
                      >
                        Delete
                      </button>
                    </div>
                    {editingBus === bus.id && (
                      <div className="mt-4 flex gap-2">
                        <select
                          value={selectedEditDriver}
                          onChange={(e) =>
                            setSelectedEditDriver(e.target.value)
                          }
                          className="field"
                        >
                          <option value="">Select driver</option>
                          {drivers.map((driver) => (
                            <option key={driver.id} value={driver.id}>
                              {driver.name}
                            </option>
                          ))}
                        </select>
                        <button
                          className="btn btn-green"
                          onClick={() => saveBus(bus.id)}
                        >
                          Save
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          <section id="attendance" className="dashboard-card p-5">
            <h2 className="text-lg font-bold text-slate-950">
              Attendance history
            </h2>
            <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Status</th>
                    <th>Bus</th>
                    <th>Driver</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceHistory.map((item, index) => (
                    <tr key={index}>
                      <td className="font-semibold">{item.student_name}</td>
                      <td>
                        <span
                          className={`status-pill ${item.status === "boarded" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}
                        >
                          {item.status === "boarded" ? "Boarded" : "Dropped"}
                        </span>
                      </td>
                      <td>{item.bus_number}</td>
                      <td>{item.driver_name}</td>
                      <td>{new Date(item.updated_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
