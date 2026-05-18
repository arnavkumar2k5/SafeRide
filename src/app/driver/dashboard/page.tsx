"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

type Student = {
  id: string;
  name: string;
}

const DriverMap = dynamic(
  () =>
    import("@/components/DriverMap"),
  {
    ssr: false,
  }
);

export default function DriverDashboard() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [tracking, setTracking] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [school, setSchool] = useState<any>(null);
  const [stops, setStops] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchStudents = async() => {
      try {
        const res = await fetch("/api/driver/students");
        const data = await res.json();
        setStudents(data);
        console.log(
  "Stops:",
  data
);
      } catch (error) {
        console.error(error);
      }
    };

    fetchStudents();

    const fetchSchool = async () => {

  try {

    const schoolRes =
      await fetch(
        "/api/admin/school"
      );

    const schoolJson =
      await schoolRes.json();

    setSchool(
      schoolJson
    );

  } catch (error) {

    console.error(error);
  }
};

fetchSchool();

const fetchStops = async () => {

  try {

    const res =
      await fetch(
        "/api/driver/stops"
      );

    const data =
      await res.json();

    setStops(
  Array.isArray(data)
    ? data
    : []
);

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

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Driver Dashboard</h1>

      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={() => setTracking(!tracking)}
      >
        {tracking ? "Stop Tracking" : "Start Tracking"}
      </button>
      <div className="mt-6">
        <h2 className="text-2xl font-bold mb-4">Students</h2>
        <div className="space-y-4">
          {students.map((student) => (
            <div key={student.id} className="bg-white p-4 rounded shadow flex justify-between items-center">
              <div>
              <p className="font-semibold">{student.name}</p>
              </div>
              <div className="flex gap-2">
                <button className="bg-green-600 text-white px-4 py-2 rounded"
                onClick={async () => {
                  try {
                    await fetch("/api/driver/student-status",{
                      method: "POST",
                       headers: {
                        "Content-Type":
                          "application/json",
                      },

                      body:
                        JSON.stringify({

                          studentId:
                            student.id,

                          status:
                            "boarded",
                        }),
                    });

                    socket.emit("student-status", {
                      studentId: student.id,
                      studentName: student.name,
                      status: "boarded",
                    });
                  } catch (error) {
                    console.error(error);
                  }
                }}>✅ Picked Up</button>
                <button className="bg-red-600 text-white px-4 py-2 rounded"
                onClick={async () => {
                  try {
                    await fetch("/api/driver/student-status",{
                      method: "POST",
                       headers: {
                        "Content-Type":
                          "application/json",
                      },

                      body:
                        JSON.stringify({

                          studentId:
                            student.id,

                          status:
                            "dropped",
                        }),
                    });

                    socket.emit("student-status", {
                      studentId: student.id,
                      studentName: student.name,
                      status: "dropped",
                    });
                  } catch (error) {
                    console.error(error);
                  }
                }}>🏫 Dropped</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {location && (
        <div className="mt-6 bg-white p-4 rounded shadow">
          <p>
            <strong>Latitute:</strong> {location.lat}
          </p>
          <p>
            <strong>Longitude:</strong> {location.lng}
          </p>
        </div>
      )}
      <div className="mt-6">

  <DriverMap
    location={location}
    stops={stops}
    school={school}
  />

</div>
    </div>
  );
}
