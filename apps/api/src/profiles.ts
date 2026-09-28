import type { Role } from "./auth.js";

export type PublicProfile = "CANDIDATO" | "EMPRESA";

export function publicProfile(value: unknown): PublicProfile | undefined {
  return value === "CANDIDATO" || value === "EMPRESA" ? value : undefined;
}

export function normalizeProfiles(values: unknown): PublicProfile[] {
  if (!Array.isArray(values)) return [];
  return [
    ...new Set(
      values.filter(
        (value): value is PublicProfile =>
          value === "CANDIDATO" || value === "EMPRESA",
      ),
    ),
  ].sort();
}

export function profileForReturnTo(value: unknown): PublicProfile | undefined {
  const destination = safeReturn(value);
  if (destination.startsWith("/candidato")) return "CANDIDATO";
  if (destination.startsWith("/empresa")) return "EMPRESA";
  return undefined;
}

export function safeReturn(value: unknown) {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
    ? value
    : "/";
}

export function hasRole(
  user: { role: Role; profiles: PublicProfile[] },
  required: Role,
) {
  return required === "ADMIN"
    ? user.role === "ADMIN"
    : user.profiles.includes(required);
}

export function destinationFor(
  user: { role: Role; profiles: PublicProfile[] },
  requested: unknown,
  returnTo: unknown,
) {
  const safe = safeReturn(returnTo);
  if (safe.startsWith("/servicios/ofrecer")) return safe;
  const explicit = publicProfile(requested) ?? profileForReturnTo(safe);
  if (explicit && user.profiles.includes(explicit)) {
    return profileForReturnTo(safe) === explicit
      ? safe
      : explicit === "CANDIDATO"
        ? "/candidato"
        : "/empresa";
  }
  if (user.role === "ADMIN") return "/admin";
  if (user.profiles.length === 1)
    return user.profiles[0] === "CANDIDATO" ? "/candidato" : "/empresa";
  if (user.profiles.length > 1) return "/elegir-perfil";
  return "/registro?oauth=choose-role";
}
