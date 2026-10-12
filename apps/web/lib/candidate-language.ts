// Use the generic occupational term without guessing gender from profile text.
// This also fixes presentation of retained analyses without rewriting snapshots.
export function candidateLanguage(text: string): string {
  return text.replace(/\bde la candidata\b/gi, match => match[0] === "D" ? "Del candidato" : "del candidato")
    .replace(/\ba la candidata\b/gi, match => match[0] === "A" ? "Al candidato" : "al candidato")
    .replace(/\blas candidatas\b/gi, match => match[0] === "L" ? "Los candidatos" : "los candidatos")
    .replace(/\bla candidata\b/gi, match => match[0] === "L" ? "El candidato" : "el candidato")
    .replace(/\bcandidatas\b/gi, match => match[0] === "C" ? "Candidatos" : "candidatos")
    .replace(/\bcandidata\b/gi, match => match[0] === "C" ? "Candidato" : "candidato");
}
