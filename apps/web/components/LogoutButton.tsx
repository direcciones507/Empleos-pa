"use client";
import { useState } from "react";
import { api } from "../lib/api";
export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    try {
      await api("/v1/auth/logout", { method: "POST", body: "{}" });
      location.href = "/login";
    } catch {
      setBusy(false);
      alert("No se pudo cerrar la sesión.");
    }
  }
  return (
    <button
      className="accountLogout"
      type="button"
      onClick={logout}
      disabled={busy}
      style={{
        marginLeft: 8,
        border: "1px solid rgba(255,255,255,.42)",
        background: "rgba(255,255,255,.10)",
        color: "white",
        borderRadius: 12,
        padding: "10px 14px",
        font: "inherit",
        fontWeight: 800,
        cursor: busy ? "wait" : "pointer",
        opacity: busy ? 0.7 : 1,
      }}
    >
      {busy ? "Cerrando sesión…" : "Cerrar sesión"}
    </button>
  );
}
