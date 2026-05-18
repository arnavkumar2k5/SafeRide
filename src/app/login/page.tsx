"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = async (email: string, password: string) => {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      alert("Invalid credentials");
      return;
    }

    const res = await fetch("/api/auth/session");
    const session = await res.json();
    const role = session?.user?.role;

    if (role === "parent") {
      router.push("/parent/dashboard");
    } else if (role === "driver") {
      router.push("/driver/dashboard");
    } else if (role === "admin") {
      router.push("/admin/dashboard");
    }
  };

  const demoRoles = [
    {
      title: "Admin",
      subtitle: "Fleet control center",
      email: "admin1@test.com",
      password: "123456",
      className: "btn-primary",
    },
    {
      title: "Driver",
      subtitle: "Route and pickup console",
      email: "driver1@test.com",
      password: "123456",
      className: "btn-blue",
    },
    {
      title: "Parent",
      subtitle: "Live ETA and ride status",
      email: "parent2@test.com",
      password: "123456",
      className: "btn-yellow",
    },
  ];

  return (
    <main className="dashboard-shell min-h-screen">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
        <section>
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-amber-400 font-black text-slate-950">
              SR
            </div>
            <div>
              <p className="text-xl font-bold text-slate-950">SafeRide</p>
              <p className="text-sm text-slate-500">Transport management system</p>
            </div>
          </div>
          <h1 className="mt-8 max-w-2xl text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
            Sign in to your real-time operations dashboard.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
            Choose a role to review the admin, driver, or parent experience with live
            tracking, attendance updates, and route visibility.
          </p>
          <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
            {["GPS Tracking", "ETA Alerts", "Attendance"].map((item) => (
              <div key={item} className="dashboard-card-muted p-4 text-sm font-bold text-slate-700">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="dashboard-card p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">
              Demo Access
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">Select workspace</h2>
            <p className="mt-1 text-sm text-slate-500">
              These shortcuts use existing demo credentials.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            {demoRoles.map((role) => (
              <button
                key={role.title}
                onClick={() => handleLogin(role.email, role.password)}
                className={`btn ${role.className} w-full justify-between px-4 py-4 text-left`}
              >
                <span>
                  <span className="block">{role.title}</span>
                  <span className="block text-xs font-semibold opacity-75">{role.subtitle}</span>
                </span>
                <span aria-hidden="true">→</span>
              </button>
            ))}
          </div>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-bold uppercase text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <button onClick={() => signIn("google")} className="btn btn-soft w-full">
            Continue with Google
          </button>
        </section>
      </div>
    </main>
  );
}
