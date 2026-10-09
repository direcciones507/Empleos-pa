"use client";
import { FormEvent, useEffect, useState } from "react";
import { api, API_URL } from "../lib/api";
import { profileForReturnTo, publicProfile, safeReturn, type PublicProfile } from "../lib/auth-intent";

const GoogleMark = () => <span className="googleMark" aria-hidden="true"><svg viewBox="0 0 24 24" role="img"><path d="M21.35 12.27c0-.74-.07-1.45-.19-2.14H12v4.05h5.24a4.48 4.48 0 0 1-1.94 2.94v2.62h3.14c1.84-1.69 2.91-4.19 2.91-7.47Z"/><path d="M12 21.78c2.62 0 4.82-.87 6.43-2.35l-3.14-2.62c-.87.58-1.98.93-3.29.93-2.53 0-4.67-1.71-5.44-4.01H3.32v2.7A9.72 9.72 0 0 0 12 21.78Z"/><path d="M6.56 13.73A5.84 5.84 0 0 1 6.25 12c0-.6.1-1.18.31-1.73v-2.7H3.32A9.72 9.72 0 0 0 2.22 12c0 1.57.38 3.06 1.1 4.43l3.24-2.7Z"/><path d="M12 6.26c1.43 0 2.71.49 3.72 1.45l2.79-2.79A9.36 9.36 0 0 0 12 2.22a9.72 9.72 0 0 0-8.68 5.35l3.24 2.7c.77-2.3 2.91-4.01 5.44-4.01Z"/></svg></span>;

export function LoginForm({ compact = false }: { compact?: boolean } = {}) {
  const [error, setError] = useState("");
  const [returnTo, setReturnTo] = useState("");
  const [profile, setProfile] = useState<PublicProfile>();
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [reactivation, setReactivation] = useState(false);
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const destination = safeReturn(query.get("returnTo"));
    setReturnTo(destination);
    setProfile(publicProfile(query.get("role")) ?? profileForReturnTo(destination));
    if (query.get("oauth") === "expired")
      setError("Ese acceso con Google venció o ya fue utilizado. Inicia sesión nuevamente.");
    else if (query.get("oauth") === "reactivation-required") {
      setReactivation(true);
      setError("Esta cuenta está desactivada. Confirma abajo para reactivarla con Google.");
    }
    else if (query.get("oauth") === "disabled")
      setError("Esta cuenta está desactivada y no puede iniciar sesión.");
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await api(reactivation?"/v1/auth/reactivate":"/v1/auth/login", { method: "POST", body: JSON.stringify({ email: form.get("email"), password: form.get("password"), profile, return_to: returnTo }) });
      location.href = response.redirect_to;
    } catch (e:any) {
      if (!reactivation && e?.body?.error === "REACTIVATION_REQUIRED") {
        setReactivation(true);
        setError(e?.body?.method === "GOOGLE" ? "Esta cuenta está desactivada. Para reactivarla debes autenticarte nuevamente con Google." : "Esta cuenta está desactivada. Confirma tu contraseña para reactivarla.");
      } else if (e?.body?.error === "ACCOUNT_DISABLED") setError("Esta cuenta está bloqueada y no puede reactivarse desde aquí.");
      else setError("No pudimos iniciar sesión. Revisa tus datos.");
      setBusy(false);
    }
  }
  const params = new URLSearchParams();
  if (reactivation) params.set("returnTo", "/reactivate");
  else if (returnTo) params.set("returnTo", returnTo);
  if (profile) params.set("role", profile);
  const suffix = params.size ? `?${params.toString()}` : "";
  return <form className={compact ? "login compactLogin" : "login"} onSubmit={submit}><h2>Iniciar sesión</h2><p>Accede a tu cuenta de Empleos.pa.</p><label>Correo<input name="email" type="email" autoComplete="email" required placeholder="tu@correo.com"/></label><label>Contraseña<span style={{display:"flex",gap:8,alignItems:"center"}}><input style={{flex:1,minWidth:0}} name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required placeholder="••••••••"/><button type="button" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} style={{width:44,height:44,display:"grid",placeItems:"center",flexShrink:0,background:"#f3f7f6",color:"#214c40",border:"1px solid #d5e3dd",borderRadius:12,cursor:"pointer"}}><span aria-hidden="true" style={{fontSize:23,lineHeight:1}}>{showPassword ? "◉" : "◎"}</span></button></span></label>{error && <p className="formError" role="alert">{error}</p>}<button disabled={busy}>{busy ? "Procesando…" : reactivation?"Reactivar mi cuenta":"Entrar"}</button><a className="forgot" href="/recuperar">¿Olvidaste tu contraseña?</a><a className="google" href={`${API_URL}/v1/auth/google/start${suffix}`}><GoogleMark/><span>{reactivation?"Reactivar con Google":"Entrar con Google"}</span></a><small>¿No tienes cuenta? <a href={`/registro${suffix}`}>Crear cuenta</a></small></form>;
}
