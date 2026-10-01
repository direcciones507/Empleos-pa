"use client";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

export function RoleGuard({ role, children }: { role: "CANDIDATO" | "EMPRESA" | "ADMIN"; children: React.ReactNode }) {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    api("/v1/auth/me").then(async (response) => {
      if ((role === "ADMIN" && (response?.user?.is_admin || (response?.user?.role === "ADMIN" && response?.user?.status === "ACTIVE"))) || (role !== "ADMIN" && response?.user?.profiles?.includes(role))) { setAllowed(true); return; }
      if (role !== "ADMIN" && response?.user) {
        await api(`/v1/auth/profiles/${role}/enable`, { method: "POST" });
        setAllowed(true); return;
      }
      window.location.replace("/");
    }).catch(() => {
      const returnTo = window.location.pathname + window.location.search;
      window.location.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    });
  }, [role]);
  if (!allowed) return <main className="accountPage"><section className="loginPage"><a className="miniBrand" href="/">Empleos<span>.pa</span></a><p>Verificando acceso…</p></section></main>;
  return <>{children}</>;
}
