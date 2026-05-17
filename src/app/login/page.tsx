"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {

  const handleLogin = async (
    email: string,
    password: string
  ) => {

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
      window.location.href = "/parent/dashboard";
    }

    else if (role === "driver") {
      window.location.href = "/driver/dashboard";
    }

    else if (role === "admin") {
      window.location.href = "/admin/dashboard";
    }
  };

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="p-6 bg-white shadow rounded w-80">

        <h2 className="text-xl mb-4">
          Login
        </h2>

        {/* Parent */}
        <button
          onClick={() =>
            handleLogin(
              "parent2@test.com",
              "123456"
            )
          }
          className="w-full mb-2 bg-blue-500 text-white p-2 rounded"
        >
          Login as Parent
        </button>

        {/* Driver */}
        <button
          onClick={() =>
            handleLogin(
              "driver1@test.com",
              "123456"
            )
          }
          className="w-full mb-2 bg-green-500 text-white p-2 rounded"
        >
          Login as Driver
        </button>

        {/* Admin */}
        <button
          onClick={() =>
            handleLogin(
              "admin1@test.com",
              "123456"
            )
          }
          className="w-full mb-2 bg-black text-white p-2 rounded"
        >
          Login as Admin
        </button>

        <button
          onClick={() => signIn("google")}
          className="w-full bg-red-500 text-white p-2 rounded"
        >
          Login with Google
        </button>

      </div>
    </div>
  );
}