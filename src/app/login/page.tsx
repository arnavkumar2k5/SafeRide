"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="p-6 bg-white shadow rounded w-80">
        <h2 className="text-xl mb-4">Login</h2>

        <button
          onClick={() =>
            signIn("credentials", {
              email: "parent@test.com",
              password: "123456",
              callbackUrl: "/parent/dashboard",
            })
          }
          className="w-full mb-2 bg-blue-500 text-white p-2 rounded"
        >
          Login with Email
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