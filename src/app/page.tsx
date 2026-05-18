import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export default function Home() {
  return (
    <main className="dashboard-shell min-h-screen">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-between px-4 py-5 sm:px-6 lg:px-8">
        <nav className="dashboard-card flex items-center justify-between px-5 py-4">
          <BrandLogo subtitle="School transport operations" />
          <Link className="btn btn-primary" href="/login">
            Open Console
          </Link>
        </nav>

        <div className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[1fr_520px]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600">
              Real-time fleet command
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight text-slate-950 sm:text-6xl">
              Smart school bus tracking for modern transport teams.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Live GPS visibility, route replay, attendance events, geofencing alerts,
              and parent ETA updates in one clean operations dashboard.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link className="btn btn-yellow" href="/login">
                Launch Dashboard
              </Link>
              <a className="btn btn-soft" href="#overview">
                View Platform
              </a>
            </div>
          </div>

          <div id="overview" className="dashboard-card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="text-sm font-bold text-slate-950">Fleet snapshot</p>
              <p className="text-sm text-slate-500">Operations-ready interface preview</p>
            </div>
            <div className="grid gap-3 p-5">
              {[
                ["Live buses", "24", "bg-blue-50 text-blue-700"],
                ["On-time arrivals", "96%", "bg-green-50 text-green-700"],
                ["Pending alerts", "3", "bg-red-50 text-red-700"],
              ].map(([label, value, tone]) => (
                <div key={label} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
                  <div>
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
                  </div>
                  <span className={`status-pill ${tone}`}>Live</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
