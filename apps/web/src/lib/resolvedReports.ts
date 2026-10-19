const KEY = "urbanmesh.resolvedReports";

type Store = Record<string, string>;

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Store;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function write(store: Store) {
  localStorage.setItem(KEY, JSON.stringify(store));
}

export function isReportResolved(id: string): boolean {
  return Boolean(read()[id]);
}

/** True if any member of a collapsed group is marked resolved on this device. */
export function isGroupResolved(memberIds: string[]): boolean {
  const store = read();
  return memberIds.some((id) => Boolean(store[id]));
}

export function setReportResolved(id: string, resolved: boolean) {
  const store = read();
  if (resolved) store[id] = new Date().toISOString();
  else delete store[id];
  write(store);
  window.dispatchEvent(new Event("urbanmesh:resolved-change"));
}

/** Mark or clear resolved for every id in a collapsed group. */
export function setGroupResolved(memberIds: string[], resolved: boolean) {
  const store = read();
  const at = new Date().toISOString();
  for (const id of memberIds) {
    if (resolved) store[id] = at;
    else delete store[id];
  }
  write(store);
  window.dispatchEvent(new Event("urbanmesh:resolved-change"));
}

export function useResolvedVersion(onChange: () => void) {
  if (typeof window === "undefined") return;
  window.addEventListener("urbanmesh:resolved-change", onChange);
  window.addEventListener("storage", onChange);
}
