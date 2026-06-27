import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = {
  title: "SunCarbon Proposal Co-Pilot",
  description: "Business-ready trial proposal generation",
};

const navItems = [
  ["Dashboard", "/"],
  ["Client Brief", "/brief"],
  ["Knowledge Base", "/knowledge-base"],
  ["Proposal Generator", "/proposal-generator"],
  ["Proposal Viewer", "/proposal-viewer"],
  ["Review Workflow", "/review-workflow"],
  ["Audit Trail", "/audit-trail"],
  ["Admin", "/admin-settings"],
] as const;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <header className="border-b border-emerald-200 bg-white/70 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
              <h1 className="text-xl font-semibold text-brand-700">SunCarbon Co-Pilot</h1>
              <nav className="flex flex-wrap gap-3 text-sm">
                {navItems.map(([label, href]) => (
                  <Link key={href} href={href} className="rounded bg-emerald-50 px-2 py-1 text-emerald-700 hover:bg-emerald-100">
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
