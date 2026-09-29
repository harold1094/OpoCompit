export function usernameKey(username: string): string {
  return username.trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return /^[A-Za-z0-9_]{3,20}$/.test(username.trim());
}

export function socialEdgeId(firstUid: string, secondUid: string): string {
  return [firstUid, secondUid].sort().join("_");
}
