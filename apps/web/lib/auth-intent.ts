export type PublicProfile = "CANDIDATO" | "EMPRESA";

export function publicProfile(value: string | null): PublicProfile | undefined {
  return value === "CANDIDATO" || value === "EMPRESA" ? value : undefined;
}

export function safeReturn(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "";
}

export function profileForReturnTo(value: string) {
  if (value.startsWith("/candidato") || value.startsWith("/servicios/ofrecer"))
    return "CANDIDATO" as const;
  if (value.startsWith("/empresa")) return "EMPRESA" as const;
  return undefined;
}

export function destinationForIntent(profile: PublicProfile, returnTo: string) {
  return profileForReturnTo(returnTo) === profile
    ? returnTo
    : profile === "CANDIDATO"
      ? "/candidato"
      : "/empresa";
}
