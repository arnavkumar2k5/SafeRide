"use client";

import { useEffect, useState } from "react";
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

type student = {
  id: string;
  student_name: string;
  parent_name: string;
  parent_email: string;
  bus_id: string;
  stop_name: string;
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
  const [students, setStudents] = useState<student[]>([]);
  const [livesBuses, setLiveBuses] = useState<LiveBus[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/admin/dashboard");
        if (!res.ok) {
          throw new Error("Failed to fetch Dashboard");
        }

        const json = await res.json();
        console.log(json);
        setData(json);

        const assingRes = await fetch("/api/admin/assign-data");
        const assingJson = await assingRes.json();
        setDrivers(assingJson.drivers);
        setBuses(assingJson.buses);

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
      } catch (error: any) {
        console.error(error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchAttendance =
  async () => {

    try {

      const res =
        await fetch(
          "/api/admin/attendance-history"
        );

      const data =
        await res.json();

      setAttendanceHistory(
        data
      );

    } catch (error) {

      console.error(error);
    }
  };
fetchAttendance();
    fetchData();
  }, []);

  if (loading) {
    return <div className="p-6">Loading Dashboard</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  if (!data) {
    return <div className="p-6">No data found</div>;
  }

  const assignDriver = async () => {
    if (!selectedDriver || !selectedBus) {
      alert("Select driver and bus");
      return;
    }

    try {
      const res = await fetch("/api/admin/assign-driver", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          driverId: selectedDriver,
          busId: selectedBus,
        }),
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
      alert("Fill all the Fields");
      return;
    }

    try {
      const res = await fetch("/api/admin/add-student", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

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
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {/* Drivers */}
        <div className="bg-blue-500 text-white p-6 rounded shadow">
          <h2 className="text-xl mb-2">Total Drivers</h2>

          <p className="text-4xl font-bold">{data.totalDrivers}</p>
        </div>

        {/* Students */}
        <div className="bg-green-500 text-white p-6 rounded shadow">
          <h2 className="text-xl mb-2">Total Students</h2>

          <p className="text-4xl font-bold">{data.totalStudents}</p>
        </div>
      </div>

      {/* Assign Driver */}
      <div className="bg-white text-black p-6 rounded shadow mb-8">
        <h2 className="text-2xl font-bold mb-4">Assign Driver To Bus</h2>

        {/* Driver Dropdown */}
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

        {/* Bus Dropdown */}
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

      <div className="bg-white p-6 rounded shadow mb-8 text-black">
        <h2 className="text-2xl font-bold mb-4">Add Student</h2>

        {/* Student Name */}
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
                </tr>
              </thead>

              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td className="border p-2">{student.student_name}</td>

                    <td className="border p-2">{student.parent_name}</td>

                    <td className="border p-2">{student.parent_email}</td>

                    <td className="border p-2">{student.bus_id}</td>

                    <td className="border p-2">{student.stop_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded shadow mb-8">
        <h2 className="text-2xl font-bold mb-4">Live Bus Trackin</h2>
        <div className="h-125">
          <AdminMap buses={livesBuses}/>
        </div>
      </div>

      {/* Bus List */}
      <div className="bg-white text-black p-6 rounded shadow">
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
              </div>
            ))}
          </div>
        )}
      </div>
      <div
  className="
    mt-8
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
      space-y-4
    "
  >

    {attendanceHistory.map(
      (
        item,
        index
      ) => (

        <div
          key={index}

          className="
            border-b
            pb-3
            flex
            justify-between
            items-center
          "
        >

          <div>

            <p
              className="
                font-semibold
              "
            >
              {item.student_name}
            </p>

            <p
              className="
                text-sm
                text-gray-500
              "
            >

              {item.status ===
                "boarded"
                ? "✅ Boarded"
                : "🏫 Dropped"
              }

            </p>

            <p className="text-sm">
  🚌 {item.bus_id}
</p>

<p className="text-sm">
  👨‍✈️ {item.driver_name}
</p>

          </div>

          <div
            className="
              text-sm
              text-gray-500
            "
          >

            {new Date(
              item.updated_at
            ).toLocaleString()}

          </div>

        </div>
      )
    )}

  </div>

</div>
    </div>
  );
}
