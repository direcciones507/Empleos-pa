"use client";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../../../lib/api";

const quickQuestions = [
  "Hazme el reporte de hoy.",
  "Resume los últimos 7 días.",
  "¿Qué requiere atención?",
  "Compara esta semana con la anterior.",
];

const errorMessage = (error: any) => {
  const code = error?.body?.error ?? error?.message;
  if (code === "DEEPSEEK_NOT_CONFIGURED") return "Asistente IA no configurado. El resto del panel continúa disponible.";
  if (code === "QUESTION_REQUIRED") return "Escribe una pregunta.";
  if (code === "QUESTION_TOO_LONG") return "La pregunta supera el límite permitido.";
  if (code === "DEEPSEEK_TIMEOUT") return "DeepSeek tardó demasiado en responder. Intenta nuevamente.";
  if (code === "DEEPSEEK_UNAVAILABLE") return "DeepSeek no está disponible en este momento.";
  if (code === "DEEPSEEK_FACT_CONFLICT") return "La respuesta fue descartada porque contenía una cifra no respaldada por los datos administrativos.";
  return "No se pudo consultar el asistente administrativo.";
};

export default function AdminAssistantPage() {
  const [question, setQuestion] = useState(quickQuestions[0]);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    api("/v1/admin/assistant/status")
      .then((result) => setConfigured(Boolean(result.configured)))
      .catch(() => setError("No se pudo comprobar el estado del asistente."));
  }, []);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    setError("");
    setAnswer("");
    setLoading(true);
    try {
      const result = await api("/v1/admin/assistant/query", { method: "POST", body: JSON.stringify({ question }) });
      setAnswer(result.answer ?? "El asistente no devolvió una respuesta.");
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  return <main className="admin">
    <header><a href="/admin">Empleos.pa</a><span>Asistente IA</span></header>
    <section className="adminAssistant">
      <p className="eyebrowDark">ADMINISTRACIÓN · SOLO LECTURA</p>
      <h1>Asistente administrativo</h1>
      <p>Consulta métricas calculadas por Empleos.pa. DeepSeek solo interpreta el contexto estructurado y no puede modificar datos ni ejecutar acciones.</p>
      {configured === false && <div className="assistantNotice">Asistente IA no configurado. Agrega la clave únicamente en el backend cuando se active el servicio.</div>}
      <div className="assistantQuickActions" aria-label="Consultas rápidas">
        {quickQuestions.map((item) => <button key={item} type="button" onClick={() => setQuestion(item)}>{item.replace(/[¿?.]/g, "")}</button>)}
      </div>
      <form onSubmit={submit} className="assistantForm">
        <label htmlFor="admin-assistant-question">Pregunta administrativa</label>
        <textarea id="admin-assistant-question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={600} rows={5} disabled={loading || configured === false} />
        <div><small>{question.length}/600</small><button type="submit" className="adminPrimary" disabled={loading || configured === false}>{loading ? "Consultando…" : "Consultar"}</button></div>
      </form>
      {error && <p className="formError" role="alert">{error}</p>}
      {answer && <article className="assistantAnswer" aria-live="polite"><span>Respuesta</span><p>{answer}</p></article>}
    </section>
  </main>;
}
