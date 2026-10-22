import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  archiveDataset,
  downloadDatasetBlob,
  fetchAdminDatasets,
  publishDataset,
  unpublishDataset,
  uploadDataset,
  type AdminDataset,
} from "../lib/api";

const TIER_CLASS: Record<string, string> = {
  open: "border-civic-verified/40 bg-civic-verifiedBg text-civic-verified",
  restricted: "border-civic-critical/30 bg-civic-criticalBg text-civic-critical",
  synthetic: "border-amber-500/40 bg-amber-50 text-amber-800",
};

export function CataloguePage() {
  const [datasets, setDatasets] = useState<AdminDataset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [neighbourhood, setNeighbourhood] = useState<"kilimani" | "kileleshwa">(
    "kileleshwa",
  );
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("planning");
  const [accessTier, setAccessTier] = useState<"open" | "restricted" | "synthetic">(
    "open",
  );
  const [publishOnUpload, setPublishOnUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminDatasets(neighbourhood);
      setDatasets(data.datasets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load catalogue.");
    } finally {
      setLoading(false);
    }
  }, [neighbourhood]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onUpload(ev: FormEvent) {
    ev.preventDefault();
    if (!file || !title.trim()) {
      setError("Title and file are required.");
      return;
    }
    setUploading(true);
    setError(null);
    setOkMsg(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("neighbourhood", neighbourhood);
      form.append("title", title.trim());
      form.append("category", category.trim() || "uncategorized");
      form.append("access_tier", accessTier);
      form.append("description", title.trim());
      form.append("geographic_coverage", neighbourhood);
      form.append("source_organization", "UrbanMesh admin upload");
      form.append("license", "TBD");
      form.append("quality_notes", "Admin-uploaded; review metadata before relying.");
      form.append("data_kind", accessTier === "synthetic" ? "synthetic" : "real");
      form.append("publish", publishOnUpload ? "true" : "false");
      await uploadDataset(form);
      setTitle("");
      setFile(null);
      setOkMsg("Dataset uploaded.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function withBusy(id: string, fn: () => Promise<void>) {
    setBusyId(id);
    setError(null);
    setOkMsg(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-6 lg:px-6">
      <div className="mx-auto max-w-4xl">
        <p className="um-eyebrow">Data package</p>
        <h2 className="text-xl font-semibold text-civic-ink">Dataset catalogue</h2>
        <p className="mt-2 text-sm leading-relaxed text-civic-slate">
          Upload, publish, and download datasets for the selected neighbourhood.
          Restricted files are never exposed on public routes.
        </p>

        <label className="mt-4 inline-flex items-center gap-2 text-sm">
          <span className="text-civic-muted">Neighbourhood</span>
          <select
            value={neighbourhood}
            onChange={(e) =>
              setNeighbourhood(e.target.value as "kilimani" | "kileleshwa")
            }
            className="min-h-10 rounded-card border border-civic-line bg-civic-surface px-3 text-sm font-semibold"
          >
            <option value="kileleshwa">Kileleshwa</option>
            <option value="kilimani">Kilimani</option>
          </select>
        </label>

        <form
          onSubmit={(e) => void onUpload(e)}
          className="mt-6 rounded-card border border-civic-line bg-civic-surface p-4"
        >
          <h3 className="text-sm font-semibold text-civic-ink">Upload dataset</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-civic-slate sm:col-span-2">
              Title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="mt-1.5 min-h-10 w-full rounded-card border border-civic-line bg-civic-paper px-3 text-sm font-normal text-civic-ink outline-none focus:border-civic-accent"
              />
            </label>
            <label className="block text-xs font-semibold text-civic-slate">
              Category
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1.5 min-h-10 w-full rounded-card border border-civic-line bg-civic-paper px-3 text-sm font-normal text-civic-ink outline-none focus:border-civic-accent"
              />
            </label>
            <label className="block text-xs font-semibold text-civic-slate">
              Access tier
              <select
                value={accessTier}
                onChange={(e) =>
                  setAccessTier(
                    e.target.value as "open" | "restricted" | "synthetic",
                  )
                }
                className="mt-1.5 min-h-10 w-full rounded-card border border-civic-line bg-civic-paper px-3 text-sm font-normal text-civic-ink outline-none focus:border-civic-accent"
              >
                <option value="open">Open</option>
                <option value="restricted">Restricted</option>
                <option value="synthetic">Synthetic</option>
              </select>
            </label>
            <label className="block text-xs font-semibold text-civic-slate sm:col-span-2">
              File
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="mt-1.5 block w-full text-sm font-normal text-civic-ink"
              />
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-civic-slate sm:col-span-2">
              <input
                type="checkbox"
                checked={publishOnUpload}
                onChange={(e) => setPublishOnUpload(e.target.checked)}
              />
              Publish immediately after upload
            </label>
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="mt-4 min-h-10 rounded-card bg-civic-accent px-4 text-sm font-semibold text-white hover:bg-civic-accentDark disabled:opacity-60"
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </form>

        {loading ? (
          <p className="mt-6 text-sm text-civic-muted">Loading…</p>
        ) : null}
        {error ? (
          <p className="mt-6 rounded-card border border-civic-critical/20 bg-civic-criticalBg px-3 py-2 text-sm text-civic-critical">
            {error}
          </p>
        ) : null}
        {okMsg ? (
          <p className="mt-6 rounded-card border border-civic-verified/30 bg-civic-verifiedBg px-3 py-2 text-sm text-civic-verified">
            {okMsg}
          </p>
        ) : null}

        {!loading && datasets.length === 0 ? (
          <p className="mt-6 text-sm text-civic-muted">
            No catalogue entries for this neighbourhood yet.
          </p>
        ) : null}

        <ul className="mt-6 space-y-3">
          {datasets.map((d) => (
            <li
              key={d.id}
              className="rounded-card border border-civic-line bg-civic-surface px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-civic-ink">
                    {d.title}
                  </h3>
                  <p className="mt-1 text-sm text-civic-slate">{d.description}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span
                    className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] ${
                      TIER_CLASS[d.access_tier] ??
                      "border-civic-line text-civic-muted"
                    }`}
                  >
                    {d.access_tier}
                  </span>
                  <span className="rounded-md border border-civic-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-civic-muted">
                    {d.published ? "Published" : "Draft"}
                  </span>
                  {d.archived ? (
                    <span className="rounded-md border border-civic-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-civic-muted">
                      Archived
                    </span>
                  ) : null}
                </div>
              </div>
              <dl className="mt-3 grid gap-2 text-xs text-civic-muted sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-civic-ink">Category</dt>
                  <dd className="mt-0.5">{d.category}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-civic-ink">Source</dt>
                  <dd className="mt-0.5">{d.source_organization}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-civic-ink">License</dt>
                  <dd className="mt-0.5">{d.license}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-civic-ink">File</dt>
                  <dd className="mt-0.5">
                    {d.has_file
                      ? d.original_filename ?? d.file_format ?? "Stored"
                      : "No file"}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                {!d.archived && !d.published ? (
                  <button
                    type="button"
                    disabled={busyId === d.id}
                    onClick={() =>
                      void withBusy(d.id, async () => {
                        await publishDataset(d.id);
                        setOkMsg(`Published “${d.title}”.`);
                      })
                    }
                    className="min-h-9 rounded-card bg-civic-accent px-3 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    Publish
                  </button>
                ) : null}
                {!d.archived && d.published ? (
                  <button
                    type="button"
                    disabled={busyId === d.id}
                    onClick={() =>
                      void withBusy(d.id, async () => {
                        await unpublishDataset(d.id);
                        setOkMsg(`Unpublished “${d.title}”.`);
                      })
                    }
                    className="min-h-9 rounded-card border border-civic-line px-3 text-xs font-semibold text-civic-ink hover:bg-civic-mist disabled:opacity-60"
                  >
                    Unpublish
                  </button>
                ) : null}
                {d.has_file && !d.archived ? (
                  <button
                    type="button"
                    disabled={busyId === d.id}
                    onClick={() =>
                      void withBusy(d.id, async () => {
                        const { blob, filename } = await downloadDatasetBlob(d.id);
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = filename;
                        a.click();
                        URL.revokeObjectURL(url);
                        setOkMsg(`Downloaded ${filename}.`);
                      })
                    }
                    className="min-h-9 rounded-card border border-civic-line px-3 text-xs font-semibold text-civic-ink hover:bg-civic-mist disabled:opacity-60"
                  >
                    Download
                  </button>
                ) : null}
                {!d.archived ? (
                  <button
                    type="button"
                    disabled={busyId === d.id}
                    onClick={() =>
                      void withBusy(d.id, async () => {
                        await archiveDataset(d.id);
                        setOkMsg(`Archived “${d.title}”.`);
                      })
                    }
                    className="min-h-9 rounded-card border border-civic-critical/30 px-3 text-xs font-semibold text-civic-critical hover:bg-civic-criticalBg disabled:opacity-60"
                  >
                    Archive
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
