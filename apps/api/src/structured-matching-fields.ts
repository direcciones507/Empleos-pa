export const SALARY_PERIODS = ["HORA", "DIA", "QUINCENA", "MES"] as const;
export const EMPLOYMENT_TYPES = ["INDEFINIDO", "TEMPORAL", "OBRA", "DIA_HORA", "EVENTUAL"] as const;
export const EXPERIENCE_SCOPES = ["PUESTO", "SECTOR", "GENERAL"] as const;
export const JOB_LEVELS = ["OPERATIVO", "TECNICO", "SUPERVISOR", "GERENCIAL"] as const;

type JsonObject = Record<string, unknown>;

function plainObject(value: unknown): value is JsonObject {
  return !!value && !Array.isArray(value) && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
}

function finiteNonNegative(value: unknown): number | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return undefined;
  return value;
}

function enumValue(value: unknown, allowed: readonly string[]) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !allowed.includes(value)) return undefined;
  return value;
}

function boundedArray(value: unknown, max = 100) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > max) return undefined;
  return value;
}

function boundedObject(value: unknown) {
  if (value === undefined || value === null) return {};
  return plainObject(value) ? value : undefined;
}

export function normalizeCandidateStructuredFields(body: JsonObject) {
  const salary_minimum = finiteNonNegative(body.salary_minimum);
  const salary_period = enumValue(body.salary_period, SALARY_PERIODS);
  const employment_types = boundedArray(body.employment_types, 10);
  const schedule_preferences = boundedObject(body.schedule_preferences);
  const structured_skills = boundedArray(body.structured_skills, 100);
  const structured_languages = boundedArray(body.structured_languages, 30);
  const structured_licenses = boundedArray(body.structured_licenses, 30);
  const mobility = boundedObject(body.mobility);
  if ([salary_minimum, salary_period, employment_types, schedule_preferences, structured_skills, structured_languages, structured_licenses, mobility].some((v) => v === undefined)) return null;
  return { salary_minimum, salary_period, employment_types, schedule_preferences, structured_skills, structured_languages, structured_licenses, mobility };
}

export function normalizeVacancyStructuredFields(body: JsonObject) {
  const employment_type = enumValue(body.employment_type, EMPLOYMENT_TYPES);
  const salary_minimum = finiteNonNegative(body.salary_minimum);
  const salary_maximum = finiteNonNegative(body.salary_maximum);
  const salary_period = enumValue(body.salary_period, SALARY_PERIODS);
  const experience_min_years = finiteNonNegative(body.experience_min_years);
  const experience_scope = enumValue(body.experience_scope, EXPERIENCE_SCOPES);
  const job_level = enumValue(body.job_level, JOB_LEVELS);
  const schedule_structured = boundedObject(body.schedule_structured);
  const structured_requirements = boundedArray(body.structured_requirements, 100);
  const structured_skills = boundedArray(body.structured_skills, 100);
  const structured_languages = boundedArray(body.structured_languages, 30);
  const structured_licenses = boundedArray(body.structured_licenses, 30);
  const mobility_requirement = boundedObject(body.mobility_requirement);
  if ([employment_type, salary_minimum, salary_maximum, salary_period, experience_min_years, experience_scope, job_level, schedule_structured, structured_requirements, structured_skills, structured_languages, structured_licenses, mobility_requirement].some((v) => v === undefined)) return null;
  if (salary_minimum !== null && salary_maximum !== null && salary_maximum < salary_minimum) return null;
  return {
    employment_type,
    employment_duration: typeof body.employment_duration === "string" ? body.employment_duration.trim().slice(0, 200) || null : null,
    schedule_structured,
    salary_minimum,
    salary_maximum,
    salary_period,
    salary_negotiable: body.salary_negotiable === true,
    experience_min_years,
    experience_scope,
    structured_requirements,
    structured_skills,
    structured_languages,
    structured_licenses,
    mobility_requirement,
    job_level,
    occupation_code: typeof body.occupation_code === "string" ? body.occupation_code.trim().slice(0, 120) || null : null,
  };
}
