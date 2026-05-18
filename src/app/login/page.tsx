"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

type Role = "admin" | "parent" | "driver";
type Mode = "landing" | "signin-role" | "register-role" | "login" | "register" | "demo";

const roleCards: Record<
  Role,
  {
    title: string;
    badge: string;
    description: string;
    accent: string;
    icon: ReactNode;
  }
> = {
  admin: {
    title: "Admin",
    badge: "Fleet Command",
    description: "Manage buses, drivers, students, stops, and live operations from one control room.",
    accent: "border-amber-200 bg-amber-50 text-amber-700",
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
        <path d="M4 17V7.8C4 6.8 4.7 6 5.7 5.8l4.4-.8c1.3-.2 2.6-.2 3.9 0l4.3.8c1 .2 1.7 1 1.7 2v9.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M7 17h10M7 9.5h10M8 20h.1M16 20h.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  parent: {
    title: "Parent",
    badge: "Live ETA",
    description: "Track your child bus status, pickup progress, arrival estimates, and ride history.",
    accent: "border-sky-200 bg-sky-50 text-sky-700",
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
        <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  driver: {
    title: "Driver",
    badge: "Route Console",
    description: "Access assigned routes, stops, student status updates, and location reporting tools.",
    accent: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
        <path d="M7 15.5h10M8 19h.1M16 19h.1M5 15.5V9.2c0-.9.6-1.7 1.5-1.9A24 24 0 0 1 12 6.6c1.9 0 3.8.2 5.5.7.9.2 1.5 1 1.5 1.9v6.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8 4h8M6 11h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
};

const demos: Array<{
  role: Role;
  email: string;
  password: string;
  subtitle: string;
}> = [
  {
    role: "admin",
    email: "admin1@test.com",
    password: "123456",
    subtitle: "Inspect fleet dashboards, route tools, and school operations.",
  },
  {
    role: "parent",
    email: "parent2@test.com",
    password: "123456",
    subtitle: "Preview live ETA, attendance updates, and ride visibility.",
  },
  {
    role: "driver",
    email: "driver1@test.com",
    password: "123456",
    subtitle: "Try route execution, stops, and student status workflows.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("landing");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [copiedDemo, setCopiedDemo] = useState<Role | null>(null);

  const panelTitle = useMemo(() => {
    if (mode === "login" && selectedRole) return `${roleCards[selectedRole].title} Sign In`;
    if (mode === "register" && selectedRole) return `${roleCards[selectedRole].title} Registration`;
    if (mode === "signin-role") return "Choose Sign In Role";
    if (mode === "register-role") return "Choose Register Role";
    if (mode === "demo") return "Try Demo Workspace";
    return "Access SafeRide";
  }, [mode, selectedRole]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setMessage("");
  };

  const goToRoleSelection = (nextMode: "signin-role" | "register-role") => {
    setSelectedRole(null);
    resetForm();
    setMode(nextMode);
  };

  const chooseRole = (role: Role, nextMode: "login" | "register") => {
    setSelectedRole(role);
    resetForm();
    setMode(nextMode);
  };

  const routeAfterLogin = async () => {
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

  const handleLogin = async (loginEmail: string, loginPassword: string) => {
    setBusy(true);
    setMessage("");

    const result = await signIn("credentials", {
      email: loginEmail,
      password: loginPassword,
      redirect: false,
    });

    if (result?.error) {
      setMessage("Invalid email or password. Check the credentials and try again.");
      setBusy(false);
      return;
    }

    await routeAfterLogin();
  };

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await handleLogin(email, password);
  };

  const handleRegisterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRole || selectedRole === "driver") return;

    setBusy(true);
    setMessage("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        role: selectedRole,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMessage(data?.error || "Registration failed. Please try again.");
      setBusy(false);
      return;
    }

    await handleLogin(email, password);
  };

  const copyCredentials = async (demo: (typeof demos)[number]) => {
    await navigator.clipboard.writeText(`Email: ${demo.email}\nPassword: ${demo.password}`);
    setCopiedDemo(demo.role);
    window.setTimeout(() => setCopiedDemo(null), 1400);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[0.92fr_1.08fr]">
        <section className="relative overflow-hidden bg-slate-950 px-5 py-6 text-white sm:px-8 lg:flex lg:flex-col lg:justify-between lg:px-12">
          <div className="absolute inset-0 opacity-80">
            <div className="absolute left-8 top-10 h-40 w-40 rounded-full bg-amber-400/14 blur-3xl" />
            <div className="absolute bottom-16 right-8 h-52 w-52 rounded-full bg-sky-500/12 blur-3xl" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />
          </div>

          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-lg bg-amber-400 text-base font-black text-slate-950 shadow-lg shadow-amber-400/20">
                SR
              </div>
              <div>
                <p className="text-lg font-black">SafeRide</p>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Smart School Bus Tracking
                </p>
              </div>
            </div>

            <div className="max-w-xl py-12 lg:py-20">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
                GPS operations dashboard
              </p>
              <h1 className="mt-5 text-4xl font-black leading-tight text-white sm:text-5xl">
                Secure access for every school transport workflow.
              </h1>
              <p className="mt-5 text-base leading-7 text-slate-300 sm:text-lg">
                Sign in as an admin, parent, or driver and move straight into live fleet visibility,
                route control, attendance events, and ETA tracking.
              </p>
            </div>
          </div>

          <div className="relative grid gap-3 pb-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {[
              ["Live Fleet", "Route status and bus telemetry"],
              ["Student Safety", "Pickup and drop visibility"],
              ["ETA Alerts", "Parent-facing arrival updates"],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-lg border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-black/10">
                <p className="text-sm font-black text-white">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-screen items-center bg-slate-100 px-4 py-6 sm:px-6 lg:px-10">
          <div className="mx-auto w-full max-w-3xl">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600">
                  Authentication
                </p>
                <h2 className="mt-2 text-3xl font-black text-slate-950">{panelTitle}</h2>
              </div>
              {mode !== "landing" && (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setSelectedRole(null);
                    setMode("landing");
                  }}
                  className="btn btn-soft w-full sm:w-auto"
                >
                  Back to Start
                </button>
              )}
            </div>

            <div className="dashboard-card p-4 sm:p-6">
              {mode === "landing" && (
                <div className="grid gap-4 md:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => goToRoleSelection("signin-role")}
                    className="group rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-slate-900 hover:shadow-xl"
                  >
                    <span className="grid h-11 w-11 place-items-center rounded-lg bg-slate-950 text-white">
                      <AuthIcon kind="signin" />
                    </span>
                    <span className="mt-5 block text-xl font-black text-slate-950">Sign In</span>
                    <span className="mt-2 block text-sm leading-6 text-slate-500">
                      Continue to your assigned operations dashboard.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => goToRoleSelection("register-role")}
                    className="group rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-amber-400 hover:shadow-xl"
                  >
                    <span className="grid h-11 w-11 place-items-center rounded-lg bg-amber-400 text-slate-950">
                      <AuthIcon kind="register" />
                    </span>
                    <span className="mt-5 block text-xl font-black text-slate-950">Register</span>
                    <span className="mt-2 block text-sm leading-6 text-slate-500">
                      Create admin or parent access for SafeRide.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setMode("demo");
                    }}
                    className="group rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-sky-400 hover:shadow-xl"
                  >
                    <span className="grid h-11 w-11 place-items-center rounded-lg bg-sky-600 text-white">
                      <AuthIcon kind="demo" />
                    </span>
                    <span className="mt-5 block text-xl font-black text-slate-950">Try Demo</span>
                    <span className="mt-2 block text-sm leading-6 text-slate-500">
                      Launch a seeded admin, parent, or driver workspace.
                    </span>
                  </button>
                </div>
              )}

              {(mode === "signin-role" || mode === "register-role") && (
                <div className="grid gap-4 md:grid-cols-3">
                  {(Object.keys(roleCards) as Role[]).map((role) => {
                    const unavailable = mode === "register-role" && role === "driver";
                    const card = roleCards[role];

                    return (
                      <button
                        type="button"
                        key={role}
                        disabled={unavailable}
                        onClick={() => chooseRole(role, mode === "signin-role" ? "login" : "register")}
                        className="rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-slate-900 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 disabled:hover:border-slate-200 disabled:hover:shadow-sm"
                      >
                        <span className={`grid h-12 w-12 place-items-center rounded-lg border ${card.accent}`}>
                          {card.icon}
                        </span>
                        <span className="mt-4 flex items-center justify-between gap-3">
                          <span className="text-lg font-black text-slate-950">{card.title}</span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.06em] text-slate-500">
                            {unavailable ? "Invite Only" : card.badge}
                          </span>
                        </span>
                        <span className="mt-3 block text-sm leading-6 text-slate-500">
                          {unavailable ? "Driver accounts are provisioned by an administrator." : card.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {mode === "login" && selectedRole && (
                <form onSubmit={handleLoginSubmit} className="mx-auto max-w-md">
                  <RoleHeader role={selectedRole} />
                  <div className="mt-6 space-y-4">
                    <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
                    <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
                  </div>
                  {message && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{message}</p>}
                  <button type="submit" disabled={busy} className="btn btn-primary mt-6 w-full">
                    {busy ? "Signing In..." : `Sign In as ${roleCards[selectedRole].title}`}
                  </button>
                  <button type="button" onClick={() => signIn("google")} className="btn btn-soft mt-3 w-full">
                    Continue with Google
                  </button>
                </form>
              )}

              {mode === "register" && selectedRole && selectedRole !== "driver" && (
                <form onSubmit={handleRegisterSubmit} className="mx-auto max-w-md">
                  <RoleHeader role={selectedRole} />
                  <div className="mt-6 space-y-4">
                    <Field label="Full Name" type="text" value={name} onChange={setName} autoComplete="name" />
                    <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
                    <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
                  </div>
                  {message && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{message}</p>}
                  <button type="submit" disabled={busy} className="btn btn-yellow mt-6 w-full">
                    {busy ? "Creating Account..." : `Create ${roleCards[selectedRole].title} Account`}
                  </button>
                </form>
              )}

              {mode === "demo" && (
                <div className="grid gap-4 lg:grid-cols-3">
                  {demos.map((demo) => {
                    const card = roleCards[demo.role];

                    return (
                      <div key={demo.role} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                        <div className={`grid h-12 w-12 place-items-center rounded-lg border ${card.accent}`}>
                          {card.icon}
                        </div>
                        <h3 className="mt-4 text-xl font-black text-slate-950">{card.title} Demo</h3>
                        <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">{demo.subtitle}</p>
                        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                          <p className="font-bold text-slate-600">Email</p>
                          <p className="mt-1 break-all font-mono text-slate-950">{demo.email}</p>
                          <p className="mt-3 font-bold text-slate-600">Password</p>
                          <p className="mt-1 font-mono text-slate-950">{demo.password}</p>
                        </div>
                        <div className="mt-4 grid gap-2">
                          <button type="button" onClick={() => copyCredentials(demo)} className="btn btn-soft w-full">
                            {copiedDemo === demo.role ? "Copied" : "Copy Credentials"}
                          </button>
                          <button type="button" onClick={() => handleLogin(demo.email, demo.password)} disabled={busy} className="btn btn-primary w-full">
                            {busy ? "Signing In..." : "Quick Sign In"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <input
        required
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="field mt-2"
      />
    </label>
  );
}

function RoleHeader({ role }: { role: Role }) {
  const card = roleCards[role];

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start gap-4">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg border ${card.accent}`}>
          {card.icon}
        </div>
        <div>
          <p className="text-lg font-black text-slate-950">{card.title} Workspace</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">{card.description}</p>
        </div>
      </div>
    </div>
  );
}

function AuthIcon({ kind }: { kind: "signin" | "register" | "demo" }) {
  if (kind === "register") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "demo") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
        <path d="M7 4h10l3 5-8 11L4 9l3-5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M4 9h16" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M10 17l5-5-5-5M15 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 4h3a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
