import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { normalizeCandidateStructuredFields, normalizeVacancyStructuredFields } from "./structured-matching-fields.js";

const userId = "11111111-1111-4111-8111-111111111111";
type Call = { sql: string; params: any[] };
async function harness(kind: "company" | "candidate", fail = "") {
  const calls: Call[] = [];
  let releases = 0;
  const query = async (sql: string, params: any[] = []) => {
    calls.push({ sql, params });
    if (fail && sql.includes(fail)) throw Error("database failure");
    if (sql.includes("from companies")) return { rowCount: 1, rows: [{ company_id: "company" }] };
    if (sql.startsWith("select vacancy_id from vacancies")) return { rowCount: 1, rows: [{ vacancy_id: "vacancy" }] };
    if (sql.startsWith("select") && sql.includes("from candidate_profiles")) return { rowCount: 0, rows: [] };
    if (sql.startsWith("insert into vacancies")) return { rowCount: 1, rows: [{ vacancy_code: "VAC-000001", status: "APROBADA" }] };
    if (sql.startsWith("insert into candidate_profiles")) return { rowCount: 1, rows: [insertedValues({ sql, params })] };
    return { rowCount: 1, rows: [] };
  };
  const dependencies: Record<string, any> = {
    "./db.js": { db: { query, connect: async () => ({ query, release() { releases++; } }) } },
    "./config.js": { config: { requestPaymentMode: "FREE", candidateValidityDays: 45 } },
    "./rbac.js": { requireRoles: () => async (req: any) => { req.authUser = { user_id: userId }; } },
    "./structured-matching-fields.js": { normalizeCandidateStructuredFields, normalizeVacancyStructuredFields },
  };
  const exports: any = {};
  const source = readFileSync(new URL(`./${kind}-routes.ts`, import.meta.url), "utf8");
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, Object, require: (name: string) => {
    assert.ok(name in dependencies, name);
    return dependencies[name];
  } });
  const app = Fastify();
  await app.register(cookie);
  await exports[`${kind}Routes`](app);
  return { app, calls, releases: () => releases };
}
function insertedValues(call: Call): Record<string, any> {
  const columns = call.sql.match(/^insert into \w+\(([^)]+)\) values\(/)![1].split(",");
  const values = call.sql.split(") values(")[1].split(/\) (?:on conflict|returning)/)[0].split(",");
  assert.equal(columns.length, values.length, "each insert column has a value");
  const placeholders = values.flatMap(value => value.match(/\$(\d+)/)?.[1] ?? []);
  assert.equal(Math.max(...placeholders.map(Number)), call.params.length);
  return Object.fromEntries(columns.map((column, index) => {
    const placeholder = values[index].match(/\$(\d+)/);
    const value = placeholder ? call.params[Number(placeholder[1]) - 1] : values[index];
    return [column, values[index].includes("::jsonb") ? JSON.parse(value) : value];
  }));
}
const legacyVacancy = {
  position: " Asistente contable ", quantity: 2, work_location: "Santiago",
  province: "Veraguas", district: "Santiago", corregimiento: "Santiago",
  modality: "Presencial", schedule: "Lunes a viernes", estimated_start: "2099-01-01",
  salary: "800 a 1000", minimum_education: "Universitario", experience_requirement: "Un año",
  skills: "Excel, contabilidad", languages: "Español", license_requirement: "Opcional",
  main_functions: "Gestionar cuentas", profile_notes: "Atención al detalle", additional_info: "Entrevista",
  package: "PERFILES_10", confirm_correct: true, confirm_terms: true, confirm_scope: true,
};
const legacyCandidate = {
  full_name: " Ana Pérez ", contact_email: "ana@example.com", mobile_whatsapp: "60000000",
  identity_document_type: "Cédula", identity_document_number: "8-1-1", landline_phone: "",
  province: "Veraguas", district: "Santiago", corregimiento: "Santiago", address_reference: "Casa azul",
  work_profile: "Contadora", primary_job_area: "Contabilidad", other_job_areas: "Administración",
  currently_working: false, available_from: "2026-10-10", availability_notes: "Diurno",
  work_locations: "Toda mi provincia", salary_expectation: "800", education: [{ level: "Universitario" }],
  has_experience: true, experience: [{ position: "Auxiliar", duties: "Registro contable" }],
  skills: "Excel, contabilidad", languages: "Español e inglés", computer_skills: "Office",
  driver_license: "D", contact_preference: "WhatsApp",
  confirmations: { correct: true, data_processing: true, no_hiring_guarantee: true },
};
test("company disable retains cancellations, payments, both token revocations and cookie contract", async () => {
  const h = await harness("company");
  try {
    const r = await h.app.inject({ method: "POST", url: "/v1/company/account/disable", payload: { confirm: "DESACTIVAR" } });
    assert.equal(r.statusCode, 200);
    assert.deepEqual(r.json(), { ok: true, account_status: "DISABLED" });
    assert.match(String(r.headers["set-cookie"]), /empleos_session=;.*Path=\/;.*Expires=/);
    for (const fragment of ["delete from vacancy_candidates", "delete from vacancy_deliveries",
      "update vacancy_payments set status='RECHAZADO'", "update vacancies set status='CANCELADA'",
      "update users set status='DISABLED'", "update auth_sessions set revoked_at=now()",
      "update password_reset_tokens set used_at=now()"])
      assert.ok(h.calls.some(call => call.sql.startsWith(fragment)), fragment);
    for (const table of ["auth_sessions", "password_reset_tokens"]) {
      const call = h.calls.find(call => call.sql.startsWith(`update ${table}`))!;
      assert.deepEqual(Array.from(call.params), [userId]);
      assert.match(call.sql, /where user_id=\$1 and (?:revoked_at|used_at) is null$/);
    }
    assert.equal(h.calls[0].sql, "begin");
    assert.equal(h.calls.at(-1)!.sql, "commit");
    assert.equal(h.releases(), 1);
  } finally { await h.app.close(); }
});
test("failed token invalidation rolls back without clearing cookie or reporting success", async () => {
  const h = await harness("company", "update password_reset_tokens");
  try {
    const r = await h.app.inject({ method: "POST", url: "/v1/company/account/disable", payload: { confirm: "DESACTIVAR" } });
    assert.equal(r.statusCode, 500);
    assert.equal(r.headers["set-cookie"], undefined);
    assert.equal(h.calls.at(-1)!.sql, "rollback");
    assert.ok(!h.calls.some(call => call.sql === "commit"));
    assert.equal(h.releases(), 1);
  } finally { await h.app.close(); }
});
test("vacancy creation stores structured and legacy fields in the original transaction", async () => {
  const h = await harness("company");
  const structured = {
    employment_type: "TEMPORAL", employment_duration: "6 meses", salary_minimum: 800,
    salary_maximum: 1000, salary_period: "MES", salary_negotiable: true, experience_min_years: 1,
    experience_scope: "SECTOR", job_level: "TECNICO", schedule_structured: { shift: "DIURNO" },
    structured_requirements: [{ type: "SKILL", value: "Excel", priority: "REQUIRED" }],
    structured_skills: [{ name: "Excel" }], structured_languages: [{ language: "INGLES" }],
    structured_licenses: [], mobility_requirement: { travel_required: false }, occupation_code: "ACCOUNTING",
  };
  try {
    const r = await h.app.inject({ method: "POST", url: "/v1/company/vacancies", payload: { ...legacyVacancy, ...structured } });
    assert.equal(r.statusCode, 201);
    assert.deepEqual(r.json(), { vacancy: { vacancy_code: "VAC-000001", status: "APROBADA" } });
    const saved = insertedValues(h.calls.find(call => call.sql.startsWith("insert into vacancies"))!);
    for (const [key, value] of Object.entries({ ...legacyVacancy, ...structured }))
      if (!key.startsWith("confirm_") && key!=="package") assert.deepEqual(saved[key], typeof value === "string" ? value.trim() : value, key);
    assert.equal(saved.package_candidate_limit, null);
    assert.equal(saved.package_price, 0);
    assert.equal(saved.consent_version, "2026-09-25-v1");
    assert.ok(h.calls.some(call => call.sql.startsWith("insert into occupation_catalog")));
    assert.equal(h.calls.at(-1)!.sql, "commit");
  } finally { await h.app.close(); }
});
test("legacy package input remains accepted; new formal vacancies defer payment until selection", async () => {
  for (const eventual of [false, true]) {
    const h = await harness("company");
    try {
      const payload = eventual ? { ...legacyVacancy, request_type: "EVENTUAL", package: "EVENTUAL_399" } : legacyVacancy;
      const r = await h.app.inject({ method: "POST", url: "/v1/company/vacancies", payload });
      assert.equal(r.statusCode, 201);
      const saved = insertedValues(h.calls.find(call => call.sql.startsWith("insert into vacancies"))!);
      assert.equal(saved.skills, legacyVacancy.skills);
      assert.equal(saved.package, eventual ? "EVENTUAL_399" : null);
      assert.equal(saved.package_price, 0);
      assert.equal(saved.salary_minimum, null);
      assert.deepEqual(saved.structured_requirements, []);
      assert.equal(saved.occupation_code, null, "do not invent occupation codes from free text");
    } finally { await h.app.close(); }
  }
});
test("invalid structured vacancy is rejected before transaction or insert", async () => {
  const h = await harness("company");
  try {
    const r = await h.app.inject({ method: "POST", url: "/v1/company/vacancies", payload: { ...legacyVacancy, salary_minimum: 1000, salary_maximum: 800 } });
    assert.equal(r.statusCode, 400);
    assert.equal(r.json().error, "INVALID_STRUCTURED_VACANCY");
    assert.ok(!h.calls.some(call => call.sql === "begin" || call.sql.startsWith("insert into vacancies")));
  } finally { await h.app.close(); }
});
test("candidate autosave stores structured and legacy profile in a single write", async () => {
  const h = await harness("candidate");
  const structured = {
    salary_minimum: 850, salary_period: "MES", employment_types: ["INDEFINIDO"],
    schedule_preferences: { shift: "DIURNO" }, structured_skills: [{ name: "Excel" }],
    structured_languages: [], structured_licenses: [{ category: "D" }], mobility: { own_transport: true },
  };
  try {
    const r = await h.app.inject({ method: "PUT", url: "/v1/candidate/profile", payload: { ...legacyCandidate, ...structured } });
    assert.equal(r.statusCode, 200);
    for (const [key, value] of Object.entries({ ...legacyCandidate, ...structured }))
      assert.deepEqual(r.json().profile[key], typeof value === "string" ? value.trim() : value, key);
    const write = h.calls.find(call => call.sql.startsWith("insert into candidate_profiles"))!;
    for (const key of Object.keys(structured)) assert.ok(write.sql.includes(`${key}=excluded.${key}`), key);
    assert.equal(h.calls.filter(call => call.sql.startsWith("insert into candidate_profiles")).length, 1);
  } finally { await h.app.close(); }
});
test("legacy and partial candidate saves do not reset omitted structured fields", async () => {
  for (const additions of [{}, { salary_minimum: 900 }]) {
    const h = await harness("candidate");
    try {
      const r = await h.app.inject({ method: "PUT", url: "/v1/candidate/profile", payload: { ...legacyCandidate, ...additions } });
      assert.equal(r.statusCode, 200);
      const write = h.calls.find(call => call.sql.startsWith("insert into candidate_profiles"))!;
      const updates = write.sql.split("on conflict(user_id) do update set")[1];
      assert.ok(!updates.includes("structured_skills=excluded.structured_skills"));
      assert.ok(!updates.includes("mobility=excluded.mobility"));
      assert.equal(updates.includes("salary_minimum=excluded.salary_minimum"), "salary_minimum" in additions);
      assert.equal(r.json().profile.skills, legacyCandidate.skills);
    } finally { await h.app.close(); }
  }
});
test("invalid structured candidate does not persist partial legacy data", async () => {
  const h = await harness("candidate");
  try {
    const r = await h.app.inject({ method: "PUT", url: "/v1/candidate/profile", payload: { ...legacyCandidate, salary_minimum: -1 } });
    assert.equal(r.statusCode, 400);
    assert.equal(r.json().error, "INVALID_STRUCTURED_PROFILE");
    assert.ok(!h.calls.some(call => call.sql.startsWith("insert into candidate_profiles")));
  } finally { await h.app.close(); }
});
test("candidate lifecycle and notifications retain routes and original HTTP contracts", async () => {
  const h = await harness("candidate");
  try {
    for (const path of ["/profile/reactivate", "/account/disable", "/notifications/:id/read"])
      assert.ok(h.app.hasRoute({ method: "POST", url: `/v1/candidate${path}` }), path);
    assert.ok(h.app.hasRoute({ method: "GET", url: "/v1/candidate/notifications" }));
    const withdrawal = await h.app.inject({ method: "POST", url: "/v1/candidate/profile/withdraw", payload: {} });
    assert.equal(withdrawal.statusCode, 409);
    assert.equal(withdrawal.json().error, "PROFILE_NOT_WITHDRAWABLE", "main does not require a new RETIRAR confirmation");
    const renewal = await h.app.inject({ method: "POST", url: "/v1/candidate/profile/renew", payload: {} });
    assert.equal(renewal.statusCode, 409);
    assert.equal(renewal.json().error, "PROFILE_NOT_RENEWABLE");
    const disable = await h.app.inject({ method: "POST", url: "/v1/candidate/account/disable", payload: { confirm: "DESACTIVAR" } });
    assert.equal(disable.statusCode, 200);
    assert.deepEqual(disable.json(), { ok: true, profile_status: "RETIRADO" });
    const notification = await h.app.inject({ method: "POST", url: "/v1/candidate/notifications/invalid/read", payload: {} });
    assert.equal(notification.statusCode, 400);
    assert.equal(notification.json().error, "INVALID_NOTIFICATION_ID");
  } finally { await h.app.close(); }
});
test("0031 remains additive and 0032 does not turn ambiguous legacy text into exact items", () => {
  const schema = readFileSync(new URL("../migrations/0031_structured_matching_fields.sql", import.meta.url), "utf8");
  const backfill = readFileSync(new URL("../migrations/0032_structured_matching_legacy_backfill.sql", import.meta.url), "utf8");
  const executable = (sql: string) => sql.replace(/--[^\n]*/g, "");
  assert.doesNotMatch(executable(schema), /\b(drop|delete|truncate|rename|update)\b/i);
  assert.doesNotMatch(executable(backfill), /\b(update|insert|delete|truncate|drop|alter)\b/i);
  for (const column of ["salary_minimum", "structured_skills", "structured_languages", "structured_licenses"])
    assert.ok(schema.includes(`add column if not exists ${column}`));
});

test("formal vacancy creation ignores client totals and defers paid quantity until selection", async () => {
  const h = await harness("company");
  try {
    const r = await h.app.inject({ method: "POST", url: "/v1/company/vacancies", payload: { ...legacyVacancy, requested_candidates: 3, package_price: 0.01, total: 0.01, quantity: 2 } });
    assert.equal(r.statusCode, 201);
    const saved = insertedValues(h.calls.find(call => call.sql.startsWith("insert into vacancies"))!);
    assert.equal(saved.quantity, 2); assert.equal(saved.package_candidate_limit, null); assert.equal(saved.package_price, 0);
  } finally { await h.app.close(); }
});
test("invalid requested candidate counts never enter the vacancy transaction", async () => {
  for (const count of [0, -1, 101, 1.5, "NaN", null, true]) {
    const h = await harness("company");
    try { const r = await h.app.inject({ method: "POST", url: "/v1/company/vacancies", payload: { ...legacyVacancy, requested_candidates: count } }); assert.equal(r.statusCode, 400); assert.ok(!h.calls.some(c => c.sql === "begin")); } finally { await h.app.close(); }
  }
});
