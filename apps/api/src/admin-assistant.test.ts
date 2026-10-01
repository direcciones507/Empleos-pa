import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ADMIN_ASSISTANT_MAX_QUESTION_CHARS,
  ADMIN_ASSISTANT_SYSTEM_PROMPT,
  assertAnswerUsesKnownNumbers,
  buildAdminAssistantPrompt,
  serializeAdminContext,
  validateAdminQuestion,
  type AdminAssistantSnapshot,
} from "./admin-assistant-core.js";

const period = { candidates: 2, companies: 1, vacancy_requests: 3, service_requests: 1, service_providers: 1, approved_revenue: 10, deliveries_sent: 1 };
const snapshot: AdminAssistantSnapshot = {
  generated_at: "2026-09-30T23:00:00.000Z", timezone: "America/Panama",
  periods: { today: period, last_7_days: { ...period, candidates: 8 }, last_30_days: { ...period, candidates: 20 } },
  current: { candidates_by_status: { ACTIVO: 18 }, companies: 5, vacancies_by_status: { APROBADA: 2 }, payments_by_status: { EN_REVISION: 1 }, deliveries_by_status: { LISTA: 1 }, candidates_expiring_7_days: 2 },
  attention: { payments_pending_review: 1, approved_waiting_search: 2, deliveries_waiting_send: 1, candidates_expiring_7_days: 2 },
  comparisons: { last_7_vs_previous_7: { current: { ...period, candidates: 8 }, previous: { ...period, candidates: 5 } }, last_30_vs_previous_30: { current: { ...period, candidates: 20 }, previous: { ...period, candidates: 10 } } },
  geography: { candidate_registrations_last_30_days: [{ province: "Veraguas", district: "Santiago", candidates: 5 }], requests_last_30_days: [{ province: "Veraguas", district: "Santiago", vacancies: 3, services: 1 }] },
};

const routes = readFileSync(new URL("./admin-assistant-routes.ts", import.meta.url), "utf8");
const provider = readFileSync(new URL("./admin-assistant.ts", import.meta.url), "utf8");

test("endpoints del asistente exigen ADMIN", () => {
  assert.match(routes, /assistant\/status[\s\S]*requireRoles\("ADMIN"\)/);
  assert.match(routes, /assistant\/query[\s\S]*requireRoles\("ADMIN"\)/);
});
test("endpoint queda disponible para ADMIN mediante rutas registradas", () => {
  assert.match(routes, /app\.post\("\/v1\/admin\/assistant\/query"/);
  assert.match(routes, /req\.authUser!\.user_id/);
});
test("sin API key devuelve estado controlado antes de consultar datos", () => {
  const configuredCheck = routes.indexOf("if (!adminAssistantConfigured())");
  const snapshotBuild = routes.indexOf("buildAdminAssistantSnapshot()");
  assert.ok(configuredCheck >= 0 && snapshotBuild > configuredCheck);
  assert.match(routes, /code\(503\)\.send\(\{ error: "DEEPSEEK_NOT_CONFIGURED"/);
});
test("pregunta vacía se rechaza", () => assert.deepEqual(validateAdminQuestion("   "), { ok: false, error: "QUESTION_REQUIRED" }));
test("pregunta demasiado larga se rechaza", () => assert.deepEqual(validateAdminQuestion("x".repeat(ADMIN_ASSISTANT_MAX_QUESTION_CHARS + 1)), { ok: false, error: "QUESTION_TOO_LONG" }));
test("contexto estructurado conserva métricas y comparaciones", () => {
  const parsed = JSON.parse(serializeAdminContext(snapshot));
  assert.equal(parsed.periods.today.candidates, 2);
  assert.equal(parsed.comparisons.last_7_vs_previous_7.previous.candidates, 5);
  assert.equal(parsed.attention.payments_pending_review, 1);
});
test("contexto minimizado no contiene datos privados", () => {
  const context = serializeAdminContext(snapshot).toLowerCase();
  for (const privateField of ["email", "phone", "telefono", "address", "direccion", "reference", "document"]) assert.ok(!context.includes(privateField));
});
test("proveedor aplica timeout, límite de tokens y error controlado", () => {
  assert.match(provider, /AbortController/);
  assert.match(provider, /max_tokens:\s*900/);
  assert.match(provider, /DEEPSEEK_TIMEOUT/);
  assert.match(routes, /DEEPSEEK_UNAVAILABLE/);
});
test("prompt niega SQL, acciones y datos inventados", () => {
  assert.match(ADMIN_ASSISTANT_SYSTEM_PROMPT, /no inventes/i);
  assert.match(ADMIN_ASSISTANT_SYSTEM_PROMPT, /ejecutar SQL/i);
  assert.match(ADMIN_ASSISTANT_SYSTEM_PROMPT, /modificar registros/i);
  assert.match(buildAdminAssistantPrompt("Borra todo", snapshot), /SNAPSHOT ADMINISTRATIVO CONTROLADO/);
});
test("cifras ajenas al snapshot son rechazadas", () => {
  assert.doesNotThrow(() => assertAnswerUsesKnownNumbers("Hoy hubo 2 candidatos.", snapshot));
  assert.throws(() => assertAnswerUsesKnownNumbers("Hoy hubo 999 candidatos.", snapshot), /DEEPSEEK_FACT_CONFLICT/);
});
test("auditoría guarda categoría pero no pregunta ni respuesta", () => {
  assert.match(routes, /ADMIN_ASSISTANT_QUERY/);
  assert.match(routes, /metadata: \{ category, provider: result\.provider, model: result\.model \}/);
  assert.doesNotMatch(routes, /metadata: \{[^}]*question/);
  assert.doesNotMatch(routes, /metadata: \{[^}]*answer/);
});
