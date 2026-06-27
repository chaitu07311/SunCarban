import type { ReactNode } from "react";

export function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-emerald-800">{title}</h2>
      {children}
    </section>
  );
}
