"use client";

import { useEffect, useMemo, useState } from "react";

import { getToken, login, registerAndLogin } from "../lib/api";

type Props = {
  role?: "sales_user" | "reviewer" | "admin";
};

export function ApiAuthBar({ role = "sales_user" }: Props) {
  const titleByRole: Record<NonNullable<Props["role"]>, string> = {
    sales_user: "Sales Team",
    reviewer: "Reviewer",
    admin: "Administrator",
  };

  const defaults = useMemo(() => {
    if (role === "reviewer") {
      return { email: "reviewer@suncarban.local", password: "reviewer123", fullName: "System Reviewer" };
    }
    if (role === "admin") {
      return { email: "admin@suncarban.local", password: "admin123", fullName: "System Admin" };
    }
    return { email: "sales@suncarban.local", password: "sales123", fullName: "System Sales" };
  }, [role]);

  const [email, setEmail] = useState(defaults.email);
  const [password, setPassword] = useState(defaults.password);
  const [fullName, setFullName] = useState(defaults.fullName);
  const [message, setMessage] = useState("");
  const [tokenPresent, setTokenPresent] = useState(false);

  useEffect(() => {
    setTokenPresent(Boolean(getToken()));
  }, []);

  async function handleLogin() {
    try {
      await login(email, password);
      setMessage("Login successful. Token saved locally.");
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  async function handleRegister() {
    try {
      await registerAndLogin(email, password, fullName, role);
      setMessage("User registered and logged in.");
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  return (
    <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm">
      <p className="mb-2 font-medium text-emerald-900">{titleByRole[role]}</p>
      <div className="grid gap-2 md:grid-cols-4">
        <input className="rounded border border-emerald-200 px-2 py-1" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
        <input className="rounded border border-emerald-200 px-2 py-1" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" type="password" />
        <input className="rounded border border-emerald-200 px-2 py-1" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="full name" />
        <div className="flex gap-2">
          <button type="button" className="rounded bg-emerald-700 px-3 py-1 text-white" onClick={handleLogin}>
            Login
          </button>
          <button type="button" className="rounded bg-slate-700 px-3 py-1 text-white" onClick={handleRegister}>
            Register
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-700">Token present: {tokenPresent ? "yes" : "no"}</p>
      {message ? <p className="mt-1 text-xs text-slate-700">{message}</p> : null}
    </div>
  );
}
