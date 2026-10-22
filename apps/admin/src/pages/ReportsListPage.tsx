import { useCallback, useEffect, useState } from "react";
import { ReportsTable } from "../components/ReportsTable";
import {
  fetchAdminReports,
  type AdminIncident,
  type ReviewStatus,
} from "../lib/api";
import { HAZARD_CATEGORIES } from "../lib/categories";

const PAGE_SIZE = 50;

export function ReportsListPage({
  title,
  subtitle,
  defaultReview = "all",
  onLogout,
}: {
  title: string;
  subtitle?: string;
  defaultReview?: ReviewStatus | "all" | "queue";
  onLogout: () => void;
}) {
  const [review, setReview] = useState<ReviewStatus | "all" | "queue">(
    defaultReview,
  );
  const [category, setCategory] = useState("all");
  const [field, setField] = useState<"any" | "verified" | "unverified">("any");
  const [community, setCommunity] = useState<"any" | "supported" | "pending">(
    "any",
  );
  const [sort, setSort] = useState<
    "created_desc" | "created_asc" | "updated_desc"
  >("created_desc");
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<AdminIncident[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

  useEffect(() => {
    setReview(defaultReview);
    setOffset(0);
  }, [defaultReview]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminReports({
        review,
        category,
        q,
        field,
        community,
        sort,
        limit: PAGE_SIZE,
        offset,
      });
      setRows(data.incidents);
      setTotal(data.total_matching);
      setFetchedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load reports.");
      if (err instanceof Error && /sign-in/i.test(err.message)) onLogout();
    } finally {
      setLoading(false);
    }
  }, [review, category, q, field, community, sort, offset, onLogout]);

  useEffect(() => {
    void load();
  }, [load]);

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-civic-line bg-civic-surface px-4 py-4 lg:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-civic-ink">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-sm text-civic-slate">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2 text-xs text-civic-muted">
            {fetchedAt ? (
              <span>Updated {fetchedAt.toLocaleTimeString()}</span>
            ) : null}
            <button
              type="button"
              onClick={() => void load()}
              className="min-h-9 rounded-full border border-civic-line px-3 font-semibold text-civic-ink hover:bg-civic-mist"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {defaultReview === "all" ? (
            <select
              value={review}
              onChange={(e) => {
                setOffset(0);
                setReview(e.target.value as typeof review);
              }}
              className="min-h-9 rounded-card border border-civic-line bg-civic-paper px-2 text-xs"
            >
              <option value="all">All statuses</option>
              <option value="queue">Review queue</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under review</option>
              <option value="flagged">Flagged</option>
              <option value="approved">Field-verified</option>
              <option value="resolved">Resolved</option>
              <option value="disproved">Disproved</option>
              <option value="archived">Deleted / archived</option>
            </select>
          ) : null}
          <select
            value={category}
            onChange={(e) => {
              setOffset(0);
              setCategory(e.target.value);
            }}
            className="min-h-9 rounded-card border border-civic-line bg-civic-paper px-2 text-xs"
          >
            <option value="all">All categories</option>
            {HAZARD_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            value={field}
            onChange={(e) => {
              setOffset(0);
              setField(e.target.value as typeof field);
            }}
            className="min-h-9 rounded-card border border-civic-line bg-civic-paper px-2 text-xs"
          >
            <option value="any">Field: any</option>
            <option value="verified">Field-verified</option>
            <option value="unverified">Not field-verified</option>
          </select>
          <select
            value={community}
            onChange={(e) => {
              setOffset(0);
              setCommunity(e.target.value as typeof community);
            }}
            className="min-h-9 rounded-card border border-civic-line bg-civic-paper px-2 text-xs"
          >
            <option value="any">Community: any</option>
            <option value="supported">Community-supported</option>
            <option value="pending">Spatial pending</option>
          </select>
          <select
            value={sort}
            onChange={(e) => {
              setOffset(0);
              setSort(e.target.value as typeof sort);
            }}
            className="min-h-9 rounded-card border border-civic-line bg-civic-paper px-2 text-xs"
          >
            <option value="created_desc">Newest first</option>
            <option value="created_asc">Oldest first</option>
            <option value="updated_desc">Recently updated</option>
          </select>
          <input
            value={q}
            onChange={(e) => {
              setOffset(0);
              setQ(e.target.value);
            }}
            placeholder="Search id, corridor, description…"
            className="min-h-9 min-w-[12rem] flex-1 rounded-card border border-civic-line bg-civic-paper px-3 text-sm outline-none focus:border-civic-accent"
          />
        </div>
      </div>

      {error ? (
        <p className="mx-4 mt-3 rounded-card border border-civic-critical/20 bg-civic-criticalBg px-3 py-2 text-sm font-medium text-civic-critical lg:mx-6">
          {error}
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto bg-civic-surface">
        <ReportsTable rows={rows} loading={loading} />
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-civic-line bg-civic-surface px-4 py-3 text-xs text-civic-muted lg:px-6">
        <span>
          {total} matching · page {page} of {pages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={offset <= 0 || loading}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            className="min-h-9 rounded-card border border-civic-line px-3 font-semibold text-civic-ink disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={offset + PAGE_SIZE >= total || loading}
            onClick={() => setOffset(offset + PAGE_SIZE)}
            className="min-h-9 rounded-card border border-civic-line px-3 font-semibold text-civic-ink disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
