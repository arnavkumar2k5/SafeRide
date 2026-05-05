"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
});

type ParentData = {
    student_name: string;
    bus_id: string;
    stop_name: string;
}

export default function ParentDashboard(){
    const [data, setData] = useState<ParentData | any>();
    const [location, setLocation] = useState<any>(null);

    useEffect(() => {
        const fetchData = async() => {
            const res = await fetch('/api/parent/me');
            const json = await res.json();
            setData(json);
            const locRes = await fetch(`/api/bus/${json.bus_id}`);
            const locJson = await locRes.json();
            setLocation(locJson);
        };


        fetchData();
    }, []);
console.log("DATA:", data);
    if (!data || !location || !location.lat || !location.lng) {
  return <div>Loading map...</div>;
}

    return(
        <div>
            <h1>Parent Dashboard</h1>
            <div>
                <p><strong>Student:</strong>{data.student_name}</p>
                <p><strong>Bus Id:</strong>{data.bus_id}</p>
                <p><strong>Stops:</strong>{data.stop_name}</p>
            </div>
            <Map
  lat={location?.lat}
  lng={location?.lng}
  busId={data?.bus_id}
  driverName={data?.driver_name}
/>
        </div>
    );
}