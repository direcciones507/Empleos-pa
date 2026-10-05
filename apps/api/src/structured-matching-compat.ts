import { normalizeCandidateStructuredFields, normalizeVacancyStructuredFields } from "./structured-matching-fields.js";

export function candidateStructuredPayload(body: Record<string, unknown>) {
  const normalized = normalizeCandidateStructuredFields(body);
  if (!normalized) return null;
  return {
    salary_minimum: normalized.salary_minimum,
    salary_period: normalized.salary_period,
    employment_types: JSON.stringify(normalized.employment_types),
    schedule_preferences: JSON.stringify(normalized.schedule_preferences),
    structured_skills: JSON.stringify(normalized.structured_skills),
    structured_languages: JSON.stringify(normalized.structured_languages),
    structured_licenses: JSON.stringify(normalized.structured_licenses),
    mobility: JSON.stringify(normalized.mobility),
  };
}

export function vacancyStructuredPayload(body: Record<string, unknown>) {
  const normalized = normalizeVacancyStructuredFields(body);
  if (!normalized) return null;
  return {
    ...normalized,
    schedule_structured: JSON.stringify(normalized.schedule_structured),
    structured_requirements: JSON.stringify(normalized.structured_requirements),
    structured_skills: JSON.stringify(normalized.structured_skills),
    structured_languages: JSON.stringify(normalized.structured_languages),
    structured_licenses: JSON.stringify(normalized.structured_licenses),
    mobility_requirement: JSON.stringify(normalized.mobility_requirement),
  };
}

export function hasStructuredCandidateInput(body: Record<string, unknown>) {
  return ["salary_minimum", "salary_period", "employment_types", "schedule_preferences", "structured_skills", "structured_languages", "structured_licenses", "mobility"].some((key) => body[key] !== undefined);
}

export function hasStructuredVacancyInput(body: Record<string, unknown>) {
  return ["employment_type", "employment_duration", "schedule_structured", "salary_minimum", "salary_maximum", "salary_period", "salary_negotiable", "experience_min_years", "experience_scope", "structured_requirements", "structured_skills", "structured_languages", "structured_licenses", "mobility_requirement", "job_level", "occupation_code"].some((key) => body[key] !== undefined);
}
