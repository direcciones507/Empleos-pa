import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as React from "react";
import * as JSX from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

function compile(path) {
  return ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
  }).outputText;
}
const componentExports = {};
vm.runInNewContext(compile("../app/components/StructuredMatchingFields.tsx"), {
  exports: componentExports,
  require(name) { assert.equal(name, "react/jsx-runtime"); return JSX; },
});
function harness(path, initial, api) {
  const values = [...initial], effects = [], refs = [], timers = [];
  let cursor = 0, refCursor = 0;
  const react = { ...React,
    useState(value) {
      const i = cursor++;
      if (!(i in values)) values[i] = value;
      return [values[i], next => { values[i] = typeof next === "function" ? next(values[i]) : next; }];
    },
    useRef(value) { const i = refCursor++; return refs[i] ??= { current: value }; },
    useEffect(fn) { effects.push(fn); },
  };
  const exports = {};
  const location = { search: "", href: "", assign(url) { this.href = url; } };
  vm.runInNewContext(compile(path), {
    exports, location, window: { location }, URLSearchParams,
    setTimeout(fn) { timers.push(fn); return timers.length; }, clearTimeout() {},
    require(name) {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return JSX;
      if (name.endsWith("/lib/api")) return { api };
      if (name.endsWith("/StructuredMatchingFields")) return componentExports;
      throw Error(name);
    },
  });
  function tree() { cursor = 0; refCursor = 0; return exports.default(); }
  return { tree, html: () => renderToStaticMarkup(tree()), values, effects, timers, location };
}
function nodes(tree, predicate) {
  if (!tree || typeof tree !== "object") return [];
  return [...(predicate(tree) ? [tree] : []), ...[tree.props?.children].flat(Infinity).flatMap(child => nodes(child, predicate))];
}
const flush = () => new Promise(resolve => setImmediate(resolve));
const profile = {
  work_profile: "Contadora", primary_job_area: "Contabilidad", available_from: "2026-10-10",
  work_locations: "Toda mi provincia", currently_working: false, availability_notes: "Diurno",
  salary_expectation: "800", salary_minimum: 850, salary_period: "MES", skills: "Excel, contabilidad",
  education: [{}], experience: [], confirmations: {}, contact_preference: "WhatsApp",
};

test("candidate structured fields use the existing hydration, autosave and next-step save", async () => {
  const calls = [];
  const h = harness("../app/candidato/perfil/page.tsx", [1, profile, ""], async (url, options) => {
    calls.push({ url, options });
    return { profile };
  });
  h.html(); h.effects[0](); await flush();
  const html = h.html();
  assert.ok(html.includes("Aspiración salarial"));
  assert.ok(html.includes("Salario mínimo que aceptarías"));
  assert.ok(html.includes("Disponible para comenzar"));
  const structured = nodes(h.tree(), node => node.type === componentExports.CandidateStructuredFields)[0];
  structured.props.set("salary_minimum", 950);
  await h.timers.at(-1)();
  const autosave = calls.find(call => call.options?.method === "PUT");
  const saved = JSON.parse(autosave.options.body);
  assert.equal(saved.salary_minimum, 950);
  assert.equal(saved.salary_expectation, profile.salary_expectation);
  assert.equal(saved.skills, profile.skills);
  assert.equal(saved.available_from, profile.available_from);
  const next = nodes(h.tree(), node => node.type === "button" && node.props.children === "Siguiente")[0];
  await next.props.onClick();
  assert.equal(h.values[0], 2);
  assert.equal(JSON.parse(calls.at(-1).options.body).salary_minimum, 950);
});

test("new vacancy keeps company validation and structured submission without legacy package pricing UI", async () => {
  const calls = [];
  const company = { name: "Empresa", contact_name: "Ana", email: "ana@example.com", mobile_whatsapp: "60000000", province: "Veraguas", district: "Santiago", corregimiento: "Santiago" };
  const vacancy = { request_type: "VACANTE", quantity: "2", requested_candidates: "2", skills: "Excel, contabilidad", salary: "800", salary_minimum: 850, employment_type: "INDEFINIDO", confirm_correct: true, confirm_terms: true, confirm_scope: true };
  const h = harness("../app/empresa/vacantes/nueva/page.tsx", [0, company, vacancy, "", []], async (url, options) => { calls.push({ url, options }); return {}; });
  let next = nodes(h.tree(), node => node.type === "button" && node.props.children === "Siguiente")[0];
  await next.props.onClick();
  assert.equal(calls[0].url, "/v1/company/profile");
  assert.deepEqual(JSON.parse(calls[0].options.body), company);
  assert.equal(h.values[0], 1);
  const legacy = h.html();
  assert.ok(legacy.includes("Cantidad"));
  assert.ok(!legacy.includes("Paquete de candidatos"));
  assert.ok(!legacy.includes("5 · $8.99"));
  assert.ok(!legacy.includes("10 · $10.99"));
  assert.ok(!legacy.includes("15 · $12.99"));
  assert.ok(!legacy.includes("Disponibles · $25"));
  assert.ok(legacy.includes("occupation-suggestions"));
  h.values[0] = 2;
  const requirements = h.html();
  for (const label of ["Educación mínima", "Experiencia requerida", "Habilidades / conocimientos", "Idiomas", "Licencia, si aplica", "Condiciones estructuradas", "Salario ofrecido desde"])
    assert.ok(requirements.includes(label), label);
  const structured = nodes(h.tree(), node => node.type === componentExports.VacancyStructuredFields)[0];
  structured.props.set("salary_minimum", 950);
  h.values[0] = 4;
  const submit = nodes(h.tree(), node => node.type === "button" && node.props.onClick?.name === "submit")[0];
  assert.ok(submit, "existing submit button remains connected");
  await submit.props.onClick();
  const call = calls.find(call => call.url === "/v1/company/vacancies");
  const payload = JSON.parse(call.options.body);
  assert.equal(payload.quantity, 2);
  assert.equal(payload.requested_candidates, 2);
  assert.equal(payload.skills, vacancy.skills);
  assert.equal(payload.salary, vacancy.salary);
  assert.equal(payload.salary_minimum, 950);
  assert.equal(h.location.href, "/empresa");
});
