"use client";

import { useMemo, useState } from "react";

import { getToken, login, registerAndLogin } from "../lib/api";

type Props = {
  role?: "sales_user" | "reviewer" | "admin";
};

export function ApiAuthBar({ role = "sales_user" }: Props) {
  const defaults = useMemo(() => {
    if (role === "reviewer") {
      return { email: "reviewer1@suncarban.local", password: "password1", fullName: "Reviewer One" };
    }
    if (role === "admin") {
      return { email: "admin@suncarban.local", password: "admin123", fullName: "System Admin" };
    }
    return { email: "sales1@suncarban.local", password: "password1", fullName: "Sales One" };
  }, [role]);

  const [email, setEmail] = useState(defaults.email);
  const [password, setPassword] = useState(defaults.password);
  const [fullName, setFullName] = useState(defaults.fullName);
  const [message, setMessage] = useState("");

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
      <p className="mb-2 font-medium text-emerald-900">API Auth ({role})</p>
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
      <p className="mt-2 text-xs text-slate-700">Token present: {getToken() ? "yes" : "no"}</p>
      {message ? <p className="mt-1 text-xs text-slate-700">{message}</p> : null}
    </div>
  );
}
