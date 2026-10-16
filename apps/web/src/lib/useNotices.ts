import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchReports } from "./api";
import { useLocationState } from "./location";
import {
  buildNotices,
  loadReadNoticeIds,
  saveReadNoticeIds,
  type Notice,
} from "./notices";

export function useNotices() {
  const { coords } = useLocationState();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadNoticeIds());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const incidents = await fetchReports({ status: "all", limit: 500 });
        if (cancelled) return;
        setNotices(buildNotices(incidents, coords));
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Couldn't load Kilimani updates. Try again.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [coords, reload]);

  const unreadCount = useMemo(
    () => notices.filter((row) => !readIds.has(row.id)).length,
    [notices, readIds],
  );

  const markRead = useCallback((id: string) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      saveReadNoticeIds(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const row of notices) next.add(row.id);
      saveReadNoticeIds(next);
      return next;
    });
  }, [notices]);

  return {
    notices,
    unreadCount,
    readIds,
    error,
    loading,
    markRead,
    markAllRead,
    retry: () => {
      setLoading(true);
      setReload((n) => n + 1);
    },
  };
}
