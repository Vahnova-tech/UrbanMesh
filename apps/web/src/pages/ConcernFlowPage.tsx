import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  fetchDataPack,
  submitConcern,
  type ConcernEvidenceType,
} from "../lib/api";
import { LocationPickerMap } from "../components/map/LocationPickerMap";
import { formatCoords } from "../lib/format";
import { useLocationState } from "../lib/location";
import { useNeighbourhood } from "../lib/neighbourhood";
import { UrbanMeshLogo } from "../components/ui/UrbanMeshLogo";
import { ErrorBanner } from "../components/ui/ReportCard";
import { ThemeToggle } from "../lib/theme";

const EVIDENCE_OPTIONS: {
  value: ConcernEvidenceType;
  label: string;
  hint: string;
}[] = [
  {
    value: "community",
    label: "Community observation",
    hint: "Something you or neighbours noticed",
  },
  {
    value: "public_doc",
    label: "Public document",
    hint: "Plan, gazette, or published reference",
  },
  {
    value: "field",
    label: "Field note",
    hint: "Structured site observation (no personal IDs)",
  },
];

export function ConcernFlowPage() {
  const navigate = useNavigate();
  const { id, neighbourhood } = useNeighbourhood();
  const { coords, requestLocation, locating, error: locationError } =
    useLocationState();

  const [taxonomy, setTaxonomy] = useState<
    { code: string; label: string; description: string }[]
  >([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [concernType, setConcernType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceType, setEvidenceType] =
    useState<ConcernEvidenceType>("community");
  const [includeLocation, setIncludeLocation] = useState(false);
  const [center, setCenter] = useState(() =>
    coords ?? {
      lat: neighbourhood.center[0],
      lng: neighbourhood.center[1],
    },
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPlanning =
    neighbourhood.reporting_mode === "community_planning" ||
    id === "kileleshwa";

  useEffect(() => {
    if (coords) setCenter(coords);
  }, [coords]);

  useEffect(() => {
    if (!isPlanning) return;
    let cancelled = false;
    void fetchDataPack("kileleshwa")
      .then((pack) => {
        if (cancelled) return;
        setTaxonomy(pack.concern_taxonomy ?? []);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error
              ? err.message
              : "Couldn't load concern types. Try again.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isPlanning]);

  if (!isPlanning) {
    return <Navigate to="/reports/new" replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!concernType || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitConcern({
        neighbourhood_id: "kileleshwa",
        concern_type_code: concernType,
        title: title.trim(),
        description: description.trim(),
        evidence_type: evidenceType,
        lat: includeLocation ? center.lat : null,
        lng: includeLocation ? center.lng : null,
      });
      navigate(`/concerns/${result.concern_id}`, {
        replace: true,
        state: { justSubmitted: true },
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't send the concern. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const selected = taxonomy.find((t) => t.code === concernType);
  const canSubmit =
    Boolean(concernType) &&
    title.trim().length >= 3 &&
    description.trim().length >= 10;

  return (
    <div className="flex h-full max-h-full w-full flex-col overflow-hidden bg-civic-paper">
      <header className="shrink-0 border-b border-civic-line bg-civic-surface pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-2.5 lg:px-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-sm font-semibold text-civic-slate"
          >
            Back
          </button>
          <UrbanMeshLogo compact />
          <ThemeToggle />
        </div>
      </header>

      <form className="um-scroll min-h-0 flex-1" onSubmit={onSubmit}>
        <div className="mx-auto w-full max-w-3xl px-4 py-5 pb-[max(6rem,calc(4rem+env(safe-area-inset-bottom)))] lg:px-6 lg:py-8">
          <h1 className="um-title">New concern</h1>
          <p className="mt-2 text-sm text-civic-slate">
            Reviewed before it is published. No names, phone numbers, or ID numbers.
            Pins are generalized to about 100&nbsp;m.
          </p>

          {loadError ? (
            <div className="mt-4">
              <ErrorBanner message={loadError} />
            </div>
          ) : null}

          <fieldset className="mt-6">
            <legend className="text-sm font-semibold text-civic-ink">
              Concern type
            </legend>
            <p className="um-meta mt-1">Required.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {taxonomy.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setConcernType(item.code)}
                  className={`rounded-card border px-3 py-3 text-left transition-colors ${
                    concernType === item.code
                      ? "border-civic-accent bg-civic-verifiedBg"
                      : "border-civic-line bg-civic-surface hover:bg-civic-mist/50"
                  }`}
                >
                  <p className="text-sm font-semibold text-civic-ink">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs text-civic-muted">
                    {item.description}
                  </p>
                </button>
              ))}
            </div>
          </fieldset>

          <label className="mt-6 block">
            <span className="text-sm font-semibold text-civic-ink">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={160}
              placeholder="Short label for the concern"
              className="mt-2 min-h-11 w-full rounded-card border border-civic-line bg-civic-surface px-3 text-sm outline-none focus:border-civic-accent"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-sm font-semibold text-civic-ink">
              Description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              maxLength={4000}
              placeholder="What is happening, where (general area), and what evidence supports it — without personal identifiers."
              className="mt-2 w-full rounded-card border border-civic-line bg-civic-surface px-3 py-3 text-sm outline-none focus:border-civic-accent"
            />
          </label>

          <fieldset className="mt-6">
            <legend className="text-sm font-semibold text-civic-ink">
              Evidence type
            </legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {EVIDENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEvidenceType(opt.value)}
                  className={`rounded-card border px-3 py-3 text-left ${
                    evidenceType === opt.value
                      ? "border-civic-accent bg-civic-verifiedBg"
                      : "border-civic-line bg-civic-surface"
                  }`}
                >
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className="mt-1 text-xs text-civic-muted">{opt.hint}</p>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="mt-6 rounded-card border border-civic-line bg-civic-surface p-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={includeLocation}
                onChange={(e) => setIncludeLocation(e.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="text-sm font-semibold text-civic-ink">
                  Add a generalized map location
                </span>
                <span className="mt-0.5 block text-xs text-civic-muted">
                  Optional. Coordinates are rounded to ~100&nbsp;m before
                  storage.
                </span>
              </span>
            </label>

            {includeLocation ? (
              <div className="mt-4">
                <div className="relative h-56 overflow-hidden rounded-card border border-civic-line">
                  <LocationPickerMap
                    center={center}
                    onMove={setCenter}
                    flyTo={coords}
                  />
                  <div className="pointer-events-none absolute inset-0 z-[1100] flex items-center justify-center">
                    <div className="relative um-crosshair" />
                  </div>
                </div>
                <p className="mt-2 font-mono text-xs text-civic-slate">
                  {formatCoords(center.lat, center.lng)}
                </p>
                {locating ? (
                  <p className="mt-1 text-xs text-civic-muted">Reading GPS…</p>
                ) : null}
                {locationError ? (
                  <p className="mt-1 text-xs font-semibold text-civic-critical">
                    {locationError}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    requestLocation();
                    if (coords) setCenter(coords);
                  }}
                  className="mt-2 min-h-10 rounded-card border border-civic-line px-3 text-xs font-semibold hover:bg-civic-mist"
                >
                  Use my location
                </button>
              </div>
            ) : null}
          </div>

          {selected ? (
            <p className="mt-4 text-xs text-civic-muted">
              Selected type · {selected.label}
            </p>
          ) : null}

          {error ? (
            <div className="mt-4">
              <ErrorBanner message={error} />
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              aria-busy={submitting}
              className="min-h-12 flex-1 rounded-card bg-civic-accent px-4 text-sm font-semibold text-white disabled:opacity-50 sm:flex-none"
            >
              {submitting ? "Sending…" : "Submit for review"}
            </button>
            <Link
              to="/kileleshwa"
              className="inline-flex min-h-12 items-center rounded-card border border-civic-line px-4 text-sm font-semibold text-civic-ink hover:bg-civic-mist"
            >
              Data pack
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
