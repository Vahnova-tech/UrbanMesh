const KEY = "urbanmesh.adminToken";

export function loadAdminToken(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function saveAdminToken(token: string) {
  sessionStorage.setItem(KEY, token);
}

export function clearAdminToken() {
  sessionStorage.removeItem(KEY);
}
