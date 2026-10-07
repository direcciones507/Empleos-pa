import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const routes=fs.readFileSync(new URL("../apps/api/src/company-matching-routes.ts",import.meta.url),"utf8");
const matching=fs.readFileSync(new URL("../apps/api/src/candidate-match-query.ts",import.meta.url),"utf8");
const ai=fs.readFileSync(new URL("../apps/api/src/ai-analysis.ts",import.meta.url),"utf8");

test("company matching is restricted to EMPRESA and owned vacancies",()=>{
  assert.match(routes,/requireRoles\("EMPRESA"\)/);
  assert.match(routes,/owner_user_id=\$2/);
});

test("company matching only considers active non-expired candidates",()=>{
  assert.match(matching,/status='ACTIVO'/);
  assert.match(matching,/valid_until>=current_date/);
});

test("provider key remains server side",()=>{
  assert.doesNotMatch(routes,/deepSeekApiKey/);
  assert.match(ai,/"authorization"\s*:\s*"Bearer "\s*\+\s*config\.deepSeekApiKey/);
});

test("AI policy prohibits ranking and hiring decisions",()=>{
  assert.match(ai,/No asignes puntuaciones, porcentajes, rankings, ganadores ni etiquetas de mejor\/peor/);
  assert.match(ai,/no decidas contratación/);
});

test("acceptance enforces candidate limits and price confirmation",()=>{
  assert.match(routes,/TOO_MANY_CANDIDATES/);
  assert.match(routes,/PRICE_CONFIRMATION_REQUIRED/);
  assert.match(routes,/CANDIDATE_SET_CHANGED/);
});

test("matching quote and vacancy UI use the approved 2.50 promotional unit",()=>{
 const pricing=fs.readFileSync(new URL("../apps/api/src/candidate-pricing.ts",import.meta.url),"utf8");
 assert.match(pricing,/unit_price: 2.50/);
 const page=fs.readFileSync(new URL("../apps/web/app/empresa/vacantes/[code]/page.tsx",import.meta.url),"utf8");
 assert.match(page,/UNIT_PRICE=2.50/);
});
