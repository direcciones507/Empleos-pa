import assert from "node:assert/strict";
import test from "node:test";
import {canSelfReactivateWithGoogle,roleReturn} from "./account-reactivation.js";

test("candidate voluntary disable can reactivate without changing role",()=>{
  const user={status:"DISABLED",disabled_reason:"USER_REQUEST",google_subject:"google-candidate",role:"CANDIDATO" as const};
  assert.equal(canSelfReactivateWithGoogle(user,"google-candidate"),true);
  assert.equal(roleReturn(user.role,"/empresa"),"/candidato");
});

test("company voluntary disable can reactivate without changing role",()=>{
  const user={status:"DISABLED",disabled_reason:"USER_REQUEST",google_subject:"google-company",role:"EMPRESA" as const};
  assert.equal(canSelfReactivateWithGoogle(user,"google-company"),true);
  assert.equal(roleReturn(user.role,"/candidato"),"/empresa");
});

test("administrative disable cannot self-reactivate",()=>{
  assert.equal(canSelfReactivateWithGoogle({status:"DISABLED",disabled_reason:"ADMIN_BLOCK",google_subject:"subject",role:"CANDIDATO"},"subject"),false);
  assert.equal(canSelfReactivateWithGoogle({status:"DISABLED",disabled_reason:null,google_subject:"subject",role:"EMPRESA"},"subject"),false);
});

test("a different Google identity cannot reactivate the account",()=>{
  assert.equal(canSelfReactivateWithGoogle({status:"DISABLED",disabled_reason:"USER_REQUEST",google_subject:"original",role:"CANDIDATO"},"different"),false);
});

test("active accounts stay on the existing login path",()=>{
  assert.equal(canSelfReactivateWithGoogle({status:"ACTIVE",disabled_reason:null,google_subject:"subject",role:"EMPRESA"},"subject"),false);
});
