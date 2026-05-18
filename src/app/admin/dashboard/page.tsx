"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";

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
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
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
  const [analytics, setAnalytics] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);

  const fetchTripHistory = async (busId: string) => {
    try {
      const res = await fetch(`/api/admin/trip-history/${busId}`);
      const data = await res.json();
      const formatted: [number, number][] = data.map((item: any) => [
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

        const schoolRes =
  await fetch(
    "/api/admin/school"
  );

const schoolJson =
  await schoolRes.json();

setSchool(
  schoolJson
);

        setAnalytics(analyticsJson);
      } catch (error: any) {
        console.error(error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedTripBus) {
      fetchTripHistory(selectedTripBus);
    }
  }, [selectedTripBus]);

  if (loading) return <div className="p-6">Loading Dashboard...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!data) return <div className="p-6">No data found</div>;

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
    if (
      !studentName ||
      !selectedParent ||
      !selectedStudentBus ||
      !selectedStop
    ) {
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
      setData((prev: any) => ({
        ...prev,
        buses: prev.buses.filter((b: any) => b.id !== busId),
      }));
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
      setData((prev: any) => ({
        ...prev,
        buses: [...prev.buses, { id: busNumber, driver_name: null }],
      }));
      setBusNumber("");
      setBuses((prev) => [
        ...prev,
        {
          id: busNumber,
          driver_name: null,
        },
      ]);
    } catch (error) {
      console.error(error);
    }
  };

  const saveBus = async (busId: string) => {
    try {
      await fetch(`/api/admin/edit-bus/${busId}`, {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          driverId: selectedEditDriver,
        }),
      });

      setData((prev: any) => ({
        ...prev,

        buses: prev.buses.map((b: any) =>
          b.id === busId
            ? {
                ...b,

                driver_name:
                  drivers.find((d) => d.id === selectedEditDriver)?.name ||
                  "Not Assigned",
              }
            : b,
        ),
      }));

      setEditingBus(null);
    } catch (error) {
      console.error(error);
    }
  };

  const addDriver = async () => {
    try {
      const res = await fetch("/api/admin/add-driver", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

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

      // REFRESH DRIVER LIST
      const assignRes = await fetch("/api/admin/assign-data");

      const assignJson = await assignRes.json();

      setDrivers(assignJson.drivers);

      // CLEAR INPUTS
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

        headers: {
          "Content-Type": "application/json",
        },

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

      // REFRESH STOPS
      const studentRes = await fetch("/api/admin/student-data");

      const studentJson = await studentRes.json();

      setStops(studentJson.stops);

      // CLEAR INPUTS
      setStopName("");
      setStopLat("");
      setStopLng("");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-blue-500 text-white p-6 rounded shadow">
          <h2 className="text-xl mb-2">Total Drivers</h2>
          <p className="text-4xl font-bold">{data.totalDrivers}</p>
        </div>
        <div className="bg-green-500 text-white p-6 rounded shadow">
          <h2 className="text-xl mb-2">Total Students</h2>
          <p className="text-4xl font-bold">{data.totalStudents}</p>
        </div>
      </div>

      {analytics && (
        <div
          className="
    grid
    grid-cols-2
    md:grid-cols-4
    gap-4
    mb-8
  "
        >
          <div
            className="
      bg-purple-500
      text-white
      p-6
      rounded
      shadow
    "
          >
            <h2
              className="
        text-lg
        mb-2
      "
            >
              Total Trips
            </h2>

            <p
              className="
        text-3xl
        font-bold
      "
            >
              {analytics.totalTrips}
            </p>
          </div>

          <div
            className="
      bg-green-500
      text-white
      p-6
      rounded
      shadow
    "
          >
            <h2
              className="
        text-lg
        mb-2
      "
            >
              Boarded
            </h2>

            <p
              className="
        text-3xl
        font-bold
      "
            >
              {analytics.boarded}
            </p>
          </div>

          <div
            className="
      bg-red-500
      text-white
      p-6
      rounded
      shadow
    "
          >
            <h2
              className="
        text-lg
        mb-2
      "
            >
              Dropped
            </h2>

            <p
              className="
        text-3xl
        font-bold
      "
            >
              {analytics.dropped}
            </p>
          </div>

          <div
            className="
      bg-blue-500
      text-white
      p-6
      rounded
      shadow
    "
          >
            <h2
              className="
        text-lg
        mb-2
      "
            >
              Active Buses
            </h2>

            <p
              className="
        text-3xl
        font-bold
      "
            >
              {analytics.activeBuses}
            </p>
          </div>
        </div>
      )}

      {/* Assign Driver */}
      <div className="bg-white text-black p-6 rounded shadow mb-8">
        <h2 className="text-2xl font-bold mb-4">Assign Driver To Bus</h2>
        <select
          value={selectedDriver}
          onChange={(e) => setSelectedDriver(e.target.value)}
          className="border p-2 rounded w-full mb-4"
        >
          <option value="">Select Driver</option>
          {drivers.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.name} ({driver.email})
            </option>
          ))}
        </select>
        <select
          value={selectedBus}
          onChange={(e) => setSelectedBus(e.target.value)}
          className="border p-2 rounded w-full mb-4"
        >
          <option value="">Select Bus</option>
          {buses.map((bus) => (
            <option key={bus.id} value={bus.id}>
              {bus.id}
            </option>
          ))}
        </select>
        <button
          onClick={assignDriver}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Assign Driver
        </button>
      </div>

      {/* Add Student */}
      <div className="bg-white p-6 rounded shadow mb-8 text-black">
        <h2 className="text-2xl font-bold mb-4">Add Student</h2>
        <input
          type="text"
          placeholder="Student Name"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          className="border p-2 rounded w-full mb-4"
        />
        <select
          value={selectedParent}
          onChange={(e) => setSelectedParent(e.target.value)}
          className="border p-2 rounded w-full mb-4"
        >
          <option value="">Select Parent</option>
          {parents.map((parent) => (
            <option key={parent.id} value={parent.id}>
              {parent.name} ({parent.email})
            </option>
          ))}
        </select>
        <select
          value={selectedStudentBus}
          onChange={(e) => setSelectedStudentBus(e.target.value)}
          className="border p-2 rounded w-full mb-4"
        >
          <option value="">Select Bus</option>
          {buses.map((bus) => (
            <option key={bus.id} value={bus.id}>
              {bus.id}
            </option>
          ))}
        </select>
        <select
          value={selectedStop}
          onChange={(e) => setSelectedStop(e.target.value)}
          className="border p-2 rounded w-full mb-4"
        >
          <option value="">Select Stop</option>
          {stops.map((stop) => (
            <option key={stop.id} value={stop.id}>
              {stop.name} ({stop.id})
            </option>
          ))}
        </select>
        <button
          onClick={addStudent}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Add Student
        </button>
      </div>

      {/* Students Table */}
      <div className="bg-white text-black p-6 rounded shadow mb-8">
        <h2 className="text-2xl font-bold mb-4">Students</h2>
        {students.length === 0 ? (
          <p>No students found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2">Student</th>
                  <th className="border p-2">Parent</th>
                  <th className="border p-2">Email</th>
                  <th className="border p-2">Bus</th>
                  <th className="border p-2">Stop</th>
                  <th className="border p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  // FIX: Use a fragment to allow sibling <tr> elements
                  <React.Fragment key={student.id}>
                    <tr>
                      <td className="border p-2">{student.student_name}</td>
                      <td className="border p-2">{student.parent_name}</td>
                      <td className="border p-2">{student.parent_email}</td>
                      <td className="border p-2">{student.bus_id}</td>
                      <td className="border p-2">{student.stop_name}</td>
                      {/* FIX: px-3 py-1 (was px-3py-1) */}
                      <td className="border p-2 flex gap-2">
                        <button
                          className="bg-red-600 text-white px-3 py-1 rounded"
                          onClick={() => deleteStudent(student.id)}
                        >
                          Delete
                        </button>
                        <button
                          className="bg-blue-600 text-white px-3 py-1 rounded"
                          onClick={() => {
                            setEditingStudent(student.id);
                            setEditName(student.student_name);
                            setEditBus(student.bus_id);
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>

                    {/* FIX: Edit row is a proper sibling <tr>, not nested inside a <td> */}
                    {editingStudent === student.id && (
                      <tr key={`edit-${student.id}`}>
                        <td colSpan={6} className="border p-4 bg-gray-100">
                          <div className="flex flex-col gap-3">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              placeholder="Student Name"
                              className="border p-2 rounded"
                            />
                            <select
                              value={editBus}
                              onChange={(e) => setEditBus(e.target.value)}
                              className="border p-2 rounded"
                            >
                              <option value="">Select Bus</option>
                              {buses.map((bus) => (
                                <option key={bus.id} value={bus.id}>
                                  {bus.id}
                                </option>
                              ))}
                            </select>
                            <div className="flex gap-2">
                              <button
                                className="bg-green-600 text-white px-4 py-2 rounded"
                                onClick={() => saveStudent(student)}
                              >
                                Save Changes
                              </button>
                              <button
                                className="bg-gray-400 text-white px-4 py-2 rounded"
                                onClick={() => setEditingStudent(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Live Bus Tracking */}
      <div className="bg-white p-6 rounded shadow mb-8">
        {/* FIX: Typo "Trackin" -> "Tracking" */}
        <h2 className="text-2xl font-bold mb-4">Live Bus Tracking</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            View Trip History For Bus:
          </label>
          <select
            value={selectedTripBus}
            onChange={(e) => setSelectedTripBus(e.target.value)}
            className="border p-2 rounded w-full text-black"
          >
            <option value="">Select a bus</option>
            {data.buses.map((bus) => (
              <option key={bus.id} value={bus.id}>
                {bus.id}
              </option>
            ))}
          </select>
          <button
            className="
    bg-purple-600
    text-white
    px-4
    py-2
    rounded
    mt-3
  "
            onClick={replayTrip}
          >
            ▶ Replay Trip
          </button>
        </div>
        <div className="h-125">
          <AdminMap
            buses={liveBuses}
  tripHistory={tripHistory}
  replayPosition={replayPosition}
  school={school}
/>
        </div>
      </div>

      <div
        className="
    bg-white
    text-black
    p-6
    rounded
    shadow
    mb-8
  "
      >
        <h2
          className="
      text-2xl
      font-bold
      mb-4
    "
        >
          Add Driver
        </h2>

        <div
          className="
      flex
      flex-col
      gap-4
    "
        >
          <input
            type="text"
            placeholder="Driver Name"
            value={driverName}
            onChange={(e) => setDriverName(e.target.value)}
            className="
        border
        p-2
        rounded
      "
          />

          <input
            type="email"
            placeholder="Driver Email"
            value={driverEmail}
            onChange={(e) => setDriverEmail(e.target.value)}
            className="
        border
        p-2
        rounded
      "
          />

          <input
            type="password"
            placeholder="Password"
            value={driverPassword}
            onChange={(e) => setDriverPassword(e.target.value)}
            className="
        border
        p-2
        rounded
      "
          />

          <button
            className="
        bg-blue-600
        text-white
        px-4
        py-2
        rounded
      "
            onClick={addDriver}
          >
            Add Driver
          </button>
        </div>
      </div>
      <div
        className="
    bg-white
    text-black
    p-6
    rounded
    shadow
    mb-8
  "
      >
        <h2
          className="
      text-2xl
      font-bold
      mb-4
    "
        >
          Add Stop
        </h2>

        <div
          className="
      flex
      flex-col
      gap-4
    "
        >
          <input
            type="text"
            placeholder="Stop Name"
            value={stopName}
            onChange={(e) => setStopName(e.target.value)}
            className="
        border
        p-2
        rounded
      "
          />

          <input
            type="number"
            placeholder="Latitude"
            value={stopLat}
            onChange={(e) => setStopLat(e.target.value)}
            className="
        border
        p-2
        rounded
      "
          />

          <input
            type="number"
            placeholder="Longitude"
            value={stopLng}
            onChange={(e) => setStopLng(e.target.value)}
            className="
        border
        p-2
        rounded
      "
          />

          <button
            className="
        bg-green-600
        text-white
        px-4
        py-2
        rounded
      "
            onClick={addStop}
          >
            Add Stop
          </button>
        </div>
      </div>
      {/* Bus List */}
      <div className="bg-white text-black p-6 rounded shadow mb-8">
        <h2 className="text-2xl font-bold mb-4">Buses</h2>
        {data.buses.length === 0 ? (
          <p>No buses found</p>
        ) : (
          <div className="space-y-4">
            {data.buses.map((bus) => (
              <div key={bus.id} className="border p-4 rounded">
                <p>
                  <strong>Bus ID:</strong> {bus.id}
                </p>
                <p>
                  <strong>Driver:</strong> {bus.driver_name || "Not Assigned"}
                </p>
                <button
                  className="bg-red-600 text-white px-3 py-1 rounded mt-3"
                  onClick={() => deleteBus(bus.id)}
                >
                  Delete Bus
                </button>
                <button
                  className="bg-blue-600 text-white px-3 py-1 rounded mt-3 ml-2"
                  onClick={() => {
                    setEditingBus(bus.id);
                  }}
                >
                  Edit Bus
                </button>
                {editingBus === bus.id && (
                  <div
                    className="
      mt-4
      flex
      gap-3
    "
                  >
                    <select
                      value={selectedEditDriver}
                      onChange={(e) => setSelectedEditDriver(e.target.value)}
                      className="
        border
        p-2
        rounded
      "
                    >
                      <option value="">Select Driver</option>

                      {drivers.map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.name}
                        </option>
                      ))}
                    </select>

                    <button
                      className="
        bg-green-600
        text-white
        px-4
        py-2
        rounded
      "
                      onClick={() => saveBus(bus.id)}
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add Bus */}
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-3">Add New Bus</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={busNumber}
              onChange={(e) => setBusNumber(e.target.value)}
              placeholder="Bus Number"
              className="border p-2 rounded flex-1"
            />
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded"
              onClick={addBus}
            >
              Add Bus
            </button>
          </div>
        </div>
      </div>

      {/* Attendance History */}
      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-2xl font-bold mb-4">Attendance History</h2>
        <div className="space-y-4">
          {attendanceHistory.map((item, index) => (
            <div
              key={index}
              className="border-b pb-3 flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">{item.student_name}</p>
                <p className="text-sm text-gray-500">
                  {item.status === "boarded" ? "✅ Boarded" : "🏫 Dropped"}
                </p>
                <p className="text-sm">🚌 {item.bus_id}</p>
                <p className="text-sm">👨‍✈️ {item.driver_name}</p>
              </div>
              <div className="text-sm text-gray-500">
                {new Date(item.updated_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
