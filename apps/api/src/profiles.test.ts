import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { destinationFor, isAdminAccount, profileForReturnTo } from "./profiles.js";

const dual = { role: "CANDIDATO" as const, profiles: ["CANDIDATO", "EMPRESA"] as ("CANDIDATO" | "EMPRESA")[] };

test("Busco empleo conserva intención candidato en Google", () => {
  assert.equal(destinationFor(dual, "CANDIDATO", "/candidato"), "/candidato");
});

test("Busco personal conserva intención empresa en Google", () => {
  assert.equal(destinationFor(dual, "EMPRESA", "/empresa"), "/empresa");
});

test("una cuenta con ambos perfiles entra a empresa desde Busco personal", () => {
  assert.equal(destinationFor(dual, undefined, "/empresa/vacantes"), "/empresa/vacantes");
});

test("una cuenta con ambos perfiles entra a candidato desde Busco empleo", () => {
  assert.equal(destinationFor(dual, undefined, "/candidato/perfil"), "/candidato/perfil");
});

test("Ofrezco servicios conserva el perfil separado de prestador", () => {
  assert.equal(profileForReturnTo("/servicios/ofrecer"), undefined);
  assert.equal(destinationFor(dual, undefined, "/servicios/ofrecer"), "/servicios/ofrecer");
  assert.equal(destinationFor(dual, "EMPRESA", "/servicios/ofrecer"), "/servicios/ofrecer");
  assert.equal(destinationFor(dual, "CANDIDATO", "/servicios/ofrecer"), "/servicios/ofrecer");
});

test("sin intención y con varios perfiles se pide una elección", () => {
  assert.equal(destinationFor(dual, undefined, "/"), "/elegir-perfil");
});

test("logout sigue regresando al home", () => {
  const source = readFileSync(new URL("../../web/components/LogoutButton.tsx", import.meta.url), "utf8");
  assert.match(source, /location\.href\s*=\s*["']\/["']/);
});

test("OAuth conserva rechazo de states vencidos, usados y replay", () => {
  const source = readFileSync(new URL("./google-oauth.ts", import.meta.url), "utf8");
  assert.match(source, /used_at is null and expires_at>now\(\)/);
  assert.match(source, /update oauth_states set used_at=now\(\)/);
  assert.match(source, /\/login\?oauth=expired/);
});

test("ADMIN ACTIVE es administrador; otros roles o estados no", () => {
  assert.equal(isAdminAccount({ role: "ADMIN", status: "ACTIVE" }), true);
  assert.equal(isAdminAccount({ role: "ADMIN", status: "DISABLED" }), false);
  assert.equal(isAdminAccount({ role: "CANDIDATO", status: "ACTIVE" }), false);
  assert.equal(isAdminAccount(null), false);
});

test("sessionUser expone is_admin y RoleGuard lo consume", () => {
  const auth = readFileSync(new URL("./auth.ts", import.meta.url), "utf8");
  assert.match(auth, /is_admin:\s*isAdminAccount\(row\)/);
});
