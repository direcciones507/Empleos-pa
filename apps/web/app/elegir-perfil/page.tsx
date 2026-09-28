"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { destinationForIntent, profileForReturnTo, publicProfile, safeReturn, type PublicProfile } from "../../lib/auth-intent";

export default function ElegirPerfil() {
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const returnTo = safeReturn(query.get("returnTo"));
    const intended = publicProfile(query.get("role")) ?? profileForReturnTo(returnTo);
    api("/v1/auth/me").then(async (response) => {
      const available = response.user.profiles ?? [];
      if (intended) {
        if (!available.includes(intended)) await api(`/v1/auth/profiles/${intended}/enable`, { method: "POST" });
        location.replace(destinationForIntent(intended, returnTo));
        return;
      }
      if (available.length === 1) location.replace(available[0] === "CANDIDATO" ? "/candidato" : "/empresa");
      else setProfiles(available);
    }).catch(() => location.replace("/login"));
  }, []);
  async function enable(profile: PublicProfile) {
    try { await api(`/v1/auth/profiles/${profile}/enable`, { method: "POST" }); location.href = profile === "CANDIDATO" ? "/candidato" : "/empresa"; }
    catch { setError("No pudimos activar ese perfil. Inténtalo nuevamente."); }
  }
  return <main className="accountPage"><section className="accountCard"><a className="miniBrand" href="/">Empleos<span>.pa</span></a><h1>¿Qué quieres hacer?</h1><p>Elige el contexto que quieres usar ahora. Puedes cambiar después sin cerrar sesión.</p>{profiles.includes("CANDIDATO") && <a className="contextChoice" href="/candidato">Buscar empleo</a>}{profiles.includes("EMPRESA") && <a className="contextChoice" href="/empresa">Publicar / gestionar vacantes</a>}{profiles.length === 0 && <><button className="contextChoice" onClick={() => enable("CANDIDATO")}>Buscar empleo</button><button className="contextChoice" onClick={() => enable("EMPRESA")}>Publicar / gestionar vacantes</button></>}{error && <p className="formError" role="alert">{error}</p>}</section></main>;
}
