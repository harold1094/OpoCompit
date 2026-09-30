const groupCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeGroupName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  const hasControlCharacter = Array.from(normalized).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
  if (normalized.length < 3 || normalized.length > 40 || hasControlCharacter) {
    return null;
  }
  return normalized;
}

export function normalizeGroupCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "");
  return /^[A-HJ-NP-Z2-9]{8}$/.test(normalized) ? normalized : null;
}

export function groupCodeFromBytes(bytes: Uint8Array): string {
  if (bytes.length < 8) throw new Error("At least eight random bytes are required.");
  return Array.from(bytes.slice(0, 8), (value) =>
    groupCodeAlphabet[value % groupCodeAlphabet.length],
  ).join("");
}
