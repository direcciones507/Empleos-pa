"use client";
import { FormEvent, useEffect, useState } from "react";
import { api, API_URL } from "../../lib/api";
import { destinationForIntent, safeReturn } from "../../lib/auth-intent";

const GoogleMark = () => <span className="googleMark" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.24-.2-1.79H12v3.4h5.52a4.72 4.72 0 0 1-2.05 3.1v2.2h3.32c1.94-1.79 3.06-4.43 3.06-7.56l-.25.65z"/><path fill="#34A853" d="M12 22c2.77 0 5.1-.91 6.79-2.47l-3.32-2.58c-.92.62-2.1.99-3.47.99-2.67 0-4.94-1.8-5.75-4.22H2.82v2.66A10.25 10.25 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.25 13.72A6.16 6.16 0 0 1 5.93 12c0-.6.11-1.18.32-1.72V7.62H2.82A10 10 0 0 0 1.75 12c0 1.58.38 3.08 1.07 4.38l3.43-2.66z"/><path fill="#EA4335" d="M12 6.06c1.51 0 2.86.52 3.93 1.54l2.94-2.94C17.09 3 14.77 2 12 2a10.25 10.25 0 0 0-9.18 5.62l3.43 2.66C7.06 7.86 9.33 6.06 12 6.06z"/></svg></span>;

export default function Registro() {
  const [role, setRole] = useState<"CANDIDATO" | "EMPRESA">("CANDIDATO");
  const [requestType, setRequestType] = useState("");
  const [returnTo, setReturnTo] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    if (query.get("tipo") === "empresa" || query.get("role") === "EMPRESA") setRole("EMPRESA");
    if (query.get("tipo") === "candidato" || query.get("role") === "CANDIDATO") setRole("CANDIDATO");
    const request = query.get("solicitud");
    if (request === "vacante" || request === "eventual") setRequestType(request.toUpperCase());
    setReturnTo(safeReturn(query.get("returnTo")));
  }, []);
  const intended = returnTo || (role === "EMPRESA" && requestType ? `/empresa/vacantes/nueva?solicitud=${requestType.toLowerCase()}` : role === "CANDIDATO" ? "/candidato" : "/empresa");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget), password = String(form.get("password") ?? "");
    if (password.length < 10 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) { setError("La contraseña debe tener al menos 10 caracteres, una letra y un número."); setBusy(false); return; }
    try {
      await api("/v1/auth/register", { method: "POST", body: JSON.stringify({ email: form.get("email"), password, role }) });
      location.href = destinationForIntent(role, intended);
    } catch (caught: any) { setError(caught?.status === 409 ? "Ya existe una cuenta con ese correo." : caught?.status === 400 ? "Revisa el correo y la contraseña. Usa al menos 10 caracteres, una letra y un número." : "No pudimos crear la cuenta. Inténtalo nuevamente."); setBusy(false); }
  }
  const loginQuery = new URLSearchParams({ role, returnTo: intended });
  return <main className="accountPage"><section className="accountCard"><a className="miniBrand" href="/">Empleos<span>.pa</span></a><h1>Crear cuenta</h1><p>Elige cómo vas a usar Empleos.pa.</p><div className="rolePicker" role="group" aria-label="Tipo de cuenta"><button type="button" aria-pressed={role === "CANDIDATO"} className={role === "CANDIDATO" ? "selected" : ""} onClick={() => setRole("CANDIDATO")}>Busco empleo</button><button type="button" aria-pressed={role === "EMPRESA"} className={role === "EMPRESA" ? "selected" : ""} onClick={() => setRole("EMPRESA")}>Busco personal</button></div><form onSubmit={submit}><label>Correo<input name="email" type="email" required autoComplete="email"/></label><label>Contraseña<span style={{display:"flex",gap:8,alignItems:"center"}}><input style={{flex:1,minWidth:0}} name="password" type={showPassword ? "text" : "password"} required autoComplete="new-password" minLength={10} aria-describedby="password-help"/><button type="button" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} style={{width:48,flexShrink:0,background:"transparent",color:"inherit",border:"1px solid #cbd5e1",borderRadius:10,cursor:"pointer"}}>{showPassword ? "Ocultar" : "Ver"}</button></span><small id="password-help">Mínimo 10 caracteres, con al menos una letra y un número.</small></label>{error && <p className="formError" role="alert" aria-live="polite">{error}</p>}<button className="submit" disabled={busy}>{busy ? "Creando…" : "Crear cuenta"}</button></form><a className="google" href={`${API_URL}/v1/auth/google/start?${loginQuery.toString()}`}><GoogleMark/><span>Continuar con Google</span></a><small>¿Ya tienes cuenta? <a href={`/login?${loginQuery.toString()}`}>Iniciar sesión</a></small></section></main>;
}
