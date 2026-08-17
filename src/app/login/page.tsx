"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [documentNumber, setDocumentNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentNumber, password }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "No fue posible iniciar sesión.");
      router.replace("/");
      router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No fue posible iniciar sesión."); }
    finally { setLoading(false); }
  }

  return <main className="login-page"><section className="login-copy"><a href="/solicitar-ayuda" className="public-brand"><b>m</b> Manos <span>Cerca</span></a><div><p className="public-eyebrow">Espacio del equipo</p><h1>Organizar la ayuda también es <em>cuidar</em>.</h1><p>Ingresa para gestionar solicitudes, entregas y el trabajo de la red comunitaria.</p></div><small>Acceso exclusivo para personas autorizadas.</small></section><section className="login-panel"><form onSubmit={login}><p className="public-eyebrow">Bienvenida de nuevo</p><h2>Inicia sesión</h2><p>Usa tu número de documento y contraseña.</p><label>Número de documento<input inputMode="numeric" autoComplete="username" value={documentNumber} onChange={(event) => setDocumentNumber(event.target.value.replace(/\D/g, ""))} placeholder="Ej. 1000000001" required /></label><label>Contraseña<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Tu contraseña" required /></label>{error && <div className="login-error" role="alert">{error}</div>}<button className="public-primary" disabled={loading} type="submit">{loading ? "Verificando…" : "Ingresar"} <span>→</span></button><a className="forgot-link" href="mailto:soporte@turaayuda.local">¿Olvidaste tu contraseña?</a></form></section></main>;
}
