import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const routes=fs.readFileSync(new URL("../apps/api/src/company-matching-routes.ts",import.meta.url),"utf8");
const ai=fs.readFileSync(new URL("../apps/api/src/ai-analysis.ts",import.meta.url),"utf8");

test("company matching is restricted to EMPRESA and owned vacancies",()=>{
  assert.match(routes,/requireRoles\("EMPRESA"\)/);
  assert.match(routes,/owner_user_id=\$2/);
});

test("company matching only considers active non-expired candidates",()=>{
  assert.match(routes,/status='ACTIVO'/);
  assert.match(routes,/valid_until>=current_date/);
});

test("provider key remains server side",()=>{
  assert.doesNotMatch(routes,/deepSeekApiKey/);
  assert.match(ai,/authorization:\"Bearer \"\+config\.deepSeekApiKey/);
});

test("AI policy prohibits ranking and hiring decisions",()=>{
  assert.match(ai,/No asignes puntuaciones, porcentajes, rankings, ganadores ni etiquetas de mejor\/peor/);
  assert.match(ai,/no decidas contratación/);
});

test("acceptance enforces candidate and package limits",()=>{
  assert.match(routes,/TOO_MANY_CANDIDATES/);
  assert.match(routes,/PACKAGE_CANDIDATE_LIMIT/);
  assert.match(routes,/CANDIDATE_SET_CHANGED/);
});
