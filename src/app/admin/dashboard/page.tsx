"use client";

import dynamic from "next/dynamic";
import React, { useEffect, useState } from "react";

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
  const [parents, setParents] = useState<Parent[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [studentName, setStudentName] = useState("");
  const [selectedParent, setSelectedParent] = useState("");
  const [selectedStudentBus, setSelectedStudentBus] = useState("");
  const [selectedStop, setSelectedStop] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [liveBuses, setLiveBuses] = useState<LiveBus[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceItem[]>([]);
  const [tripHistory, setTripHistory] = useState<[number, number][]>([]);
  const [selectedTripBus, setSelectedTripBus] = useState<string>("");
  const [editingStudent, setEditingStudent] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBus, setEditBus] = useState("");
  const [busNumber, setBusNumber] = useState("");
  const [editingBus, setEditingBus] = useState<string | null>(null);
  const [selectedEditDriver, setSelectedEditDriver] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverEmail, setDriverEmail] = useState("");
  const [driverPassword, setDriverPassword] = useState("");
  const [stopName, setStopName] = useState("");
  const [stopLat, setStopLat] = useState("");
  const [stopLng, setStopLng] = useState("");
  const [replayPosition, setReplayPosition] = useState<[number, number] | null>(
    null,
  );
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [school, setSchool] = useState<School | null>(null);

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/admin/dashboard");
        if (!res.ok) throw new Error("Failed to fetch Dashboard");

        const json = await res.json();
        setData(json);

        if (json.buses.length > 0) {
          const firstBusId = json.buses[0].id;
          setSelectedTripBus(firstBusId);
          fetchTripHistory(firstBusId);
        }

        const assignRes = await fetch("/api/admin/assign-data");
        const assignJson = await assignRes.json();
        setDrivers(assignJson.drivers);
        setBuses(assignJson.buses);

        const studentRes = await fetch("/api/admin/student-data");
        const studentJson = await studentRes.json();
        setParents(studentJson.parents);
        setStops(studentJson.stops);

        const studentsRes = await fetch("/api/admin/students");
        const studentsJson = await studentsRes.json();
        setStudents(studentsJson);

        const liveRes = await fetch("/api/admin/live-buses");
        const liveJson = await liveRes.json();
        setLiveBuses(liveJson);

        const analyticsRes = await fetch("/api/admin/analytics");
        const analyticsJson = await analyticsRes.json();

        const schoolRes = await fetch("/api/admin/school");
        const schoolJson = await schoolRes.json();
        setSchool(schoolJson);

        setAnalytics(analyticsJson);
      } catch (error: unknown) {
        setError(error instanceof Error ? error.message : "Failed to fetch Dashboard");
      } finally {
        setLoading(false);
      }
    };

    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAttendance();
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedTripBus) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchTripHistory(selectedTripBus);
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
      alert(json.message);
    } catch (error) {
      console.error(error);
    }
  };

  const addStudent = async () => {
    if (!studentName || !selectedParent || !selectedStudentBus || !selectedStop) {
      alert("Fill all the fields");
      return;
    }
    try {
      const res = await fetch("/api/admin/add-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: studentName,
          parentId: selectedParent,
          busId: selectedStudentBus,
          stopId: selectedStop,
        }),
      });
      const json = await res.json();
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
      await fetch("/api/admin/add-bus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ busNumber }),
      });
      setData((prev) =>
        prev
          ? {
              ...prev,
              buses: [...prev.buses, { id: busNumber, driver_name: null }],
            }
          : prev,
      );
      setBusNumber("");
      setBuses((prev) => [...prev, { id: busNumber, driver_name: null }]);
    } catch (error) {
      console.error(error);
    }
  };

  const saveBus = async (busId: string) => {
    try {
      await fetch(`/api/admin/edit-bus/${busId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: selectedEditDriver }),
      });

      setData((prev) =>
        prev
          ? {
              ...prev,
              buses: prev.buses.map((b) =>
                b.id === busId
                  ? {
                      ...b,
                      driver_name:
                        drivers.find((d) => d.id === selectedEditDriver)?.name ||
                        "Not Assigned",
                    }
                  : b,
              ),
            }
          : prev,
      );

      setEditingBus(null);
    } catch (error) {
      console.error(error);
    }
  };

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

      alert(json.message);

      const assignRes = await fetch("/api/admin/assign-data");
      const assignJson = await assignRes.json();
      setDrivers(assignJson.drivers);

      setDriverName("");
      setDriverEmail("");
      setDriverPassword("");
    } catch (error) {
      console.error(error);
    }
  };

  const addStop = async () => {
    try {
      const res = await fetch("/api/admin/add-stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: stopName,
          lat: parseFloat(stopLat),
          lng: parseFloat(stopLng),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error);
        return;
      }

      alert(json.message);

      const studentRes = await fetch("/api/admin/student-data");
      const studentJson = await studentRes.json();
      setStops(studentJson.stops);

      setStopName("");
      setStopLat("");
      setStopLng("");
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
        <div className="dashboard-card px-6 py-5 text-slate-600">No data found.</div>
      </main>
    );
  }

  const statCards = [
    { label: "Active buses", value: analytics?.activeBuses ?? liveBuses.length, tone: "blue" },
    { label: "Total drivers", value: data.totalDrivers, tone: "slate" },
    { label: "Students", value: data.totalStudents, tone: "amber" },
    { label: "Trips", value: analytics?.totalTrips ?? 0, tone: "green" },
  ];

  return (
    <main className="dashboard-shell">
      <div className="mx-auto grid min-h-screen w-full max-w-[1500px] gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[270px_1fr] lg:px-8">
        <aside className="dashboard-sidebar sticky top-4 hidden h-[calc(100vh-2rem)] rounded-lg p-5 lg:block">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-amber-400 font-black text-slate-950">
              SR
            </div>
            <div>
              <p className="font-bold text-slate-950">SafeRide</p>
              <p className="text-xs text-slate-500">Fleet operations</p>
            </div>
          </div>
          <nav className="mt-8 space-y-2 text-sm font-semibold text-slate-600">
            {["Overview", "Live Map", "Students", "Fleet", "Attendance"].map((item) => (
              <a
                key={item}
                className="block rounded-lg px-3 py-2 hover:bg-slate-100 first:bg-slate-950 first:text-white"
                href={`#${item.toLowerCase().replace(" ", "-")}`}
              >
                {item}
              </a>
            ))}
          </nav>
        </aside>

        <section className="flex min-w-0 flex-col gap-4">
          <header id="overview" className="dashboard-card flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">
                Admin Control Center
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">
                Transport Operations
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Live fleet visibility, attendance, route replay, and resource management.
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
                <p className="mt-3 text-3xl font-bold text-slate-950">{stat.value}</p>
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

          <section id="live-map" className="grid gap-4 xl:grid-cols-[1fr_360px]">
            <div className="dashboard-card overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Live tracking and replay</h2>
                  <p className="text-sm text-slate-500">
                    Active bus markers with trip history overlay and replay position.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <select
                    value={selectedTripBus}
                    onChange={(e) => setSelectedTripBus(e.target.value)}
                    className="field min-w-44"
                  >
                    <option value="">Select bus</option>
                    {data.buses.map((bus) => (
                      <option key={bus.id} value={bus.id}>
                        {bus.id}
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
                  tripHistory={tripHistory}
                  replayPosition={replayPosition}
                  school={school}
                />
              </div>
            </div>

            <aside className="dashboard-card p-5">
              <h2 className="text-lg font-bold text-slate-950">Activity feed</h2>
              <div className="mt-4 space-y-3">
                {attendanceHistory.slice(0, 7).map((item, index) => (
                  <div key={index} className="flex gap-3 border-b border-slate-100 pb-3 last:border-0">
                    <span className={`mt-1 h-2.5 w-2.5 rounded-full ${item.status === "boarded" ? "bg-green-500" : "bg-amber-500"}`} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-950">{item.student_name}</p>
                      <p className="text-sm text-slate-500">
                        {item.status === "boarded" ? "Boarded" : "Dropped"} on bus {item.bus_id}
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
              <h2 className="text-lg font-bold text-slate-950">Assign driver</h2>
              <div className="mt-4 space-y-3">
                <select value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)} className="field">
                  <option value="">Select driver</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} ({driver.email})
                    </option>
                  ))}
                </select>
                <select value={selectedBus} onChange={(e) => setSelectedBus(e.target.value)} className="field">
                  <option value="">Select bus</option>
                  {buses.map((bus) => (
                    <option key={bus.id} value={bus.id}>
                      {bus.id}
                    </option>
                  ))}
                </select>
                <button onClick={assignDriver} className="btn btn-primary w-full">
                  Assign Driver
                </button>
              </div>
            </div>

            <div className="dashboard-card p-5">
              <h2 className="text-lg font-bold text-slate-950">Add driver</h2>
              <div className="mt-4 space-y-3">
                <input type="text" placeholder="Driver name" value={driverName} onChange={(e) => setDriverName(e.target.value)} className="field" />
                <input type="email" placeholder="Driver email" value={driverEmail} onChange={(e) => setDriverEmail(e.target.value)} className="field" />
                <input type="password" placeholder="Password" value={driverPassword} onChange={(e) => setDriverPassword(e.target.value)} className="field" />
                <button className="btn btn-blue w-full" onClick={addDriver}>
                  Add Driver
                </button>
              </div>
            </div>

            <div className="dashboard-card p-5">
              <h2 className="text-lg font-bold text-slate-950">Add stop</h2>
              <div className="mt-4 space-y-3">
                <input type="text" placeholder="Stop name" value={stopName} onChange={(e) => setStopName(e.target.value)} className="field" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" placeholder="Latitude" value={stopLat} onChange={(e) => setStopLat(e.target.value)} className="field" />
                  <input type="number" placeholder="Longitude" value={stopLng} onChange={(e) => setStopLng(e.target.value)} className="field" />
                </div>
                <button className="btn btn-green w-full" onClick={addStop}>
                  Add Stop
                </button>
              </div>
            </div>
          </section>

          <section id="students" className="dashboard-card p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Student management</h2>
                <p className="text-sm text-slate-500">Create, edit, and assign students to buses and stops.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[190px_220px_150px_150px_auto]">
                <input type="text" placeholder="Student name" value={studentName} onChange={(e) => setStudentName(e.target.value)} className="field" />
                <select value={selectedParent} onChange={(e) => setSelectedParent(e.target.value)} className="field">
                  <option value="">Parent</option>
                  {parents.map((parent) => (
                    <option key={parent.id} value={parent.id}>
                      {parent.name}
                    </option>
                  ))}
                </select>
                <select value={selectedStudentBus} onChange={(e) => setSelectedStudentBus(e.target.value)} className="field">
                  <option value="">Bus</option>
                  {buses.map((bus) => (
                    <option key={bus.id} value={bus.id}>
                      {bus.id}
                    </option>
                  ))}
                </select>
                <select value={selectedStop} onChange={(e) => setSelectedStop(e.target.value)} className="field">
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
                          <td className="font-semibold">{student.student_name}</td>
                          <td>{student.parent_name}</td>
                          <td>{student.parent_email}</td>
                          <td>
                            <span className="status-pill bg-blue-50 text-blue-700">{student.bus_id}</span>
                          </td>
                          <td>{student.stop_name}</td>
                          <td>
                            <div className="flex gap-2">
                              <button className="btn btn-soft min-h-9 px-3 py-1" onClick={() => {
                                setEditingStudent(student.id);
                                setEditName(student.student_name);
                                setEditBus(student.bus_id);
                              }}>
                                Edit
                              </button>
                              <button className="btn btn-red min-h-9 px-3 py-1" onClick={() => deleteStudent(student.id)}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                        {editingStudent === student.id && (
                          <tr>
                            <td colSpan={6} className="bg-slate-50">
                              <div className="grid gap-3 md:grid-cols-[1fr_180px_auto_auto]">
                                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="field" />
                                <select value={editBus} onChange={(e) => setEditBus(e.target.value)} className="field">
                                  <option value="">Select bus</option>
                                  {buses.map((bus) => (
                                    <option key={bus.id} value={bus.id}>
                                      {bus.id}
                                    </option>
                                  ))}
                                </select>
                                <button className="btn btn-green" onClick={() => saveStudent(student)}>
                                  Save
                                </button>
                                <button className="btn btn-soft" onClick={() => setEditingStudent(null)}>
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
                <h2 className="text-lg font-bold text-slate-950">Fleet management</h2>
                <p className="text-sm text-slate-500">Manage bus records and driver assignments.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input type="text" value={busNumber} onChange={(e) => setBusNumber(e.target.value)} placeholder="Bus number" className="field" />
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
                  <div key={bus.id} className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-400">Bus</p>
                        <p className="text-xl font-bold text-slate-950">{bus.id}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {bus.driver_name || "Not assigned"}
                        </p>
                      </div>
                      <span className={`status-pill ${bus.driver_name ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                        {bus.driver_name ? "Assigned" : "Open"}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button className="btn btn-soft min-h-9 px-3 py-1" onClick={() => setEditingBus(bus.id)}>
                        Edit
                      </button>
                      <button className="btn btn-red min-h-9 px-3 py-1" onClick={() => deleteBus(bus.id)}>
                        Delete
                      </button>
                    </div>
                    {editingBus === bus.id && (
                      <div className="mt-4 flex gap-2">
                        <select value={selectedEditDriver} onChange={(e) => setSelectedEditDriver(e.target.value)} className="field">
                          <option value="">Select driver</option>
                          {drivers.map((driver) => (
                            <option key={driver.id} value={driver.id}>
                              {driver.name}
                            </option>
                          ))}
                        </select>
                        <button className="btn btn-green" onClick={() => saveBus(bus.id)}>
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
            <h2 className="text-lg font-bold text-slate-950">Attendance history</h2>
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
                        <span className={`status-pill ${item.status === "boarded" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                          {item.status === "boarded" ? "Boarded" : "Dropped"}
                        </span>
                      </td>
                      <td>{item.bus_id}</td>
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
