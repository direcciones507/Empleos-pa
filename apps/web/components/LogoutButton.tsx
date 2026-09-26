"use client";
import {useState} from "react";
import {api} from "../lib/api";
export function LogoutButton(){const [busy,setBusy]=useState(false);async function logout(){setBusy(true);try{await api("/v1/auth/logout",{method:"POST",body:"{}"});location.href="/login"}catch{setBusy(false);alert("No se pudo cerrar la sesión.")}}return <button className="accountLogout" onClick={logout} disabled={busy}>{busy?"Cerrando sesión…":"Cerrar sesión"}</button>}
