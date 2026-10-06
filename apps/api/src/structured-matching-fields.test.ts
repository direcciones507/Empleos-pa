import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCandidateStructuredFields, normalizeVacancyStructuredFields } from "./structured-matching-fields.js";

test("candidate structured fields accept minimum salary and preferences", () => {
  const result = normalizeCandidateStructuredFields({
    salary_minimum: 800,
    salary_period: "MES",
    employment_types: ["INDEFINIDO", "TEMPORAL"],
    schedule_preferences: { shifts: ["DIURNO"], weekends: false },
    structured_skills: [{ name: "Excel" }],
    structured_languages: [{ language: "INGLES", level: "BASICO" }],
    structured_licenses: [{ category: "D" }],
    mobility: { can_travel: true },
  });
  assert.ok(result);
  assert.equal(result.salary_minimum, 800);
  assert.equal(result.salary_period, "MES");
});

test("vacancy rejects inverted salary range", () => {
  assert.equal(normalizeVacancyStructuredFields({ salary_minimum: 1200, salary_maximum: 900, salary_period: "MES" }), null);
});

test("vacancy keeps required/preferred requirements as structured data", () => {
  const result = normalizeVacancyStructuredFields({
    employment_type: "INDEFINIDO",
    salary_minimum: 900,
    salary_maximum: 1100,
    salary_period: "MES",
    experience_min_years: 2,
    experience_scope: "PUESTO",
    job_level: "OPERATIVO",
    structured_requirements: [
      { type: "SKILL", value: "Soldadura", priority: "REQUIRED" },
      { type: "LANGUAGE", value: "Inglés", priority: "PREFERRED" },
    ],
  });
  assert.ok(result);
  assert.equal(result.experience_min_years, 2);
  assert.equal(result.structured_requirements.length, 2);
});

test("negative numeric values are rejected", () => {
  assert.equal(normalizeCandidateStructuredFields({ salary_minimum: -1 }), null);
  assert.equal(normalizeVacancyStructuredFields({ experience_min_years: -1 }), null);
});
