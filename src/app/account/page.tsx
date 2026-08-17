"use client";

import { useEffect, useState, FormEvent } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";

type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "driver" | "parent" | string;
  school_id?: string | null;
  school_name?: string | null;
};

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/account/me");
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login");
            return;
          }
          throw new Error("Failed to load user profile");
        }
        const data = await res.json();
        setProfile(data.user);
      } catch (err: any) {
        setProfileError(err.message || "Failed to load account profile");
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [router]);

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: "Please fill in all password fields.",
      });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({
        type: "error",
        text: "New password must be at least 6 characters.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: "New password and confirmation do not match.",
      });
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPasswordMessage({
          type: "error",
          text: data.error || "Failed to change password.",
        });
        return;
      }

      setPasswordMessage({
        type: "success",
        text: data.message || "Password updated successfully!",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordMessage({
        type: "error",
        text: err.message || "Network error. Please try again.",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const getDashboardHref = () => {
    if (!profile) return "/login";
    switch (profile.role) {
      case "admin":
        return "/admin/dashboard";
      case "driver":
        return "/driver/dashboard";
      case "parent":
        return "/parent/dashboard";
      default:
        return "/login";
    }
  };

  const getRoleBadgeClass = () => {
    switch (profile?.role) {
      case "admin":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "driver":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "parent":
        return "bg-sky-50 text-sky-700 border-sky-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  if (loading) {
    return (
      <main className="dashboard-shell flex min-h-screen items-center justify-center p-6">
        <div className="dashboard-card px-6 py-5 text-sm font-semibold text-slate-600">
          Loading account profile...
        </div>
      </main>
    );
  }

  if (profileError || !profile) {
    return (
      <main className="dashboard-shell flex min-h-screen items-center justify-center p-6">
        <div className="dashboard-card max-w-md border-red-200 px-6 py-5 text-red-700">
          <p className="font-bold">Error loading profile</p>
          <p className="mt-1 text-sm">{profileError || "User not found."}</p>
          <div className="mt-4 flex gap-3">
            <Link href="/login" className="btn btn-primary text-xs">
              Go to Login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-shell">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Top Header */}
        <header className="dashboard-card flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <BrandLogo subtitle="User Settings" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={getDashboardHref()}
              className="btn btn-soft text-xs"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="btn btn-primary text-xs"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          </div>
        </header>

        {/* Profile Card & Change Password Card */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Overview */}
          <section className="dashboard-card flex flex-col justify-between p-6">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">Profile Overview</h2>
                  <p className="text-xs text-slate-500">Your account identity and organization</p>
                </div>
                <span
                  className={`status-pill border capitalize ${getRoleBadgeClass()}`}
                >
                  <span className="h-2 w-2 rounded-full bg-current" />
                  {profile.role}
                </span>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Full Name
                  </label>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    {profile.name || "—"}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Email Address
                  </label>
                  <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
                    {profile.email}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Assigned Role
                  </label>
                  <p className="mt-1 text-sm font-medium capitalize text-slate-700">
                    {profile.role}
                  </p>
                </div>

                {profile.school_name && (
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      School / Institution
                    </label>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {profile.school_name}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 rounded-lg bg-slate-50 p-4 border border-slate-200/60 text-xs text-slate-500">
              <p className="font-semibold text-slate-700">Security Notice</p>
              <p className="mt-1">
                Your password is protected with industry-standard bcrypt hashing. Keep your credentials safe and never share your password.
              </p>
            </div>
          </section>

          {/* Change Password Form */}
          <section className="dashboard-card p-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-950">Change Password</h2>
              <p className="text-xs text-slate-500">Update your account credentials</p>
            </div>

            {passwordMessage && (
              <div
                className={`mt-4 rounded-lg p-3 text-sm font-medium ${
                  passwordMessage.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {passwordMessage.text}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="field"
                  autoComplete="current-password"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="field"
                  autoComplete="new-password"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="field"
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="btn btn-yellow w-full font-bold"
                >
                  {passwordLoading ? "Updating Password..." : "Change Password"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
