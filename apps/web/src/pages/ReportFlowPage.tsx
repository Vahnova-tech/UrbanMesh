import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { cellForLatLng } from "../lib/geo";
import {
  submitHazardReport,
  uploadPhoto,
  type ReportResponse,
} from "../lib/api";
import {
  HAZARD_OPTIONS,
  type HazardCategoryValue,
} from "../lib/categories";
import { CategoryIcon } from "../components/ui/StatusBadge";
import { CameraCapture } from "../components/report/CameraCapture";
import { KILIMANI_CENTER } from "../components/map/LiveMap";
import { formatCoords } from "../lib/format";
import { rememberMyReport } from "../lib/myReports";
import { useLocationState } from "../lib/location";
import { UrbanMeshLogo } from "../components/ui/UrbanMeshLogo";
import { ErrorBanner } from "../components/ui/ReportCard";
import { ThemeToggle, useTheme } from "../lib/theme";
import { tilesFor } from "../lib/mapStyle";

export function ReportFlowPage() {
  const navigate = useNavigate();
  const { coords, requestLocation, locating, error: locationError } = useLocationState();
  const { dark } = useTheme();
  const tiles = tilesFor(dark);
  const [step, setStep] = useState(1);
  const [center, setCenter] = useState(
    coords ?? { lat: KILIMANI_CENTER[0], lng: KILIMANI_CENTER[1] },
  );
  const [category, setCategory] = useState<HazardCategoryValue | "">("");
  const [description, setDescription] = useState("");
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReportResponse | null>(null);

  const selected = HAZARD_OPTIONS.find((o) => o.value === category);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (coords) setCenter(coords);
  }, [coords]);

  useEffect(() => {
    formRef.current?.scrollTo({ top: 0 });
  }, [step, result]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!category) return;
    setSubmitting(true);
    setError(null);
    try {
      let photo_url: string | null = null;
      if (photoData) photo_url = await uploadPhoto(photoData);
      const response = await submitHazardReport({
        category,
        description: description.trim(),
        lat: center.lat,
        lng: center.lng,
        h3_index: cellForLatLng(center.lat, center.lng),
        photo_url,
      });
      rememberMyReport(response.incident_id);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full max-h-full w-full flex-col overflow-hidden bg-civic-paper">
      <header className="shrink-0 border-b border-civic-line bg-civic-surface pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-2.5 lg:px-6">
        <button
          type="button"
          onClick={() => (step > 1 && !result ? setStep(step - 1) : navigate(-1))}
          className="text-sm font-semibold text-civic-slate"
        >
          Back
        </button>
        <UrbanMeshLogo compact />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <span className="text-xs font-semibold tabular-nums text-civic-muted">
            {result ? "Submitted" : `${step} / 4`}
          </span>
        </div>
        </div>
      </header>

      {result ? (
        <ResultState result={result} />
      ) : (
        <form
          ref={formRef}
          className={`min-h-0 flex-1 um-scroll ${
            step === 1 ? "flex flex-col lg:overflow-hidden" : ""
          }`}
          onSubmit={onSubmit}
        >
          {step === 1 ? (
            <section className="flex min-h-0 flex-1 flex-col lg:flex-row lg:overflow-hidden">
              <div className="px-4 pb-2 pt-4 lg:hidden">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-civic-muted">
                  1 · Location
                </p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight">
                  Where is the problem?
                </h1>
                <p className="mt-1 text-sm text-civic-muted">
                  Pan the map so the crosshair sits on the hazard.
                </p>
              </div>
              <div className="relative h-[38svh] min-h-[200px] max-h-[280px] shrink-0 lg:h-auto lg:max-h-none lg:min-h-0 lg:flex-1">
                <div className="absolute inset-0">
                <MapContainer
                  center={[center.lat, center.lng]}
                  zoom={17}
                  className="h-full w-full"
                  scrollWheelZoom
                  zoomControl={false}
                >
                  <TileLayer
                    key={dark ? "dark" : "light"}
                    url={tiles.url}
                    attribution={tiles.attribution}
                  />
                  <MoveTracker onMove={setCenter} />
                  {coords ? <FlyTo lat={coords.lat} lng={coords.lng} /> : null}
                </MapContainer>
                </div>
                <div className="pointer-events-none absolute inset-0 z-[1100] flex items-center justify-center">
                  <div className="relative um-crosshair" />
                </div>
              </div>
              <div className="space-y-3 border-t border-civic-line bg-civic-surface px-4 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:w-[380px] lg:shrink-0 lg:overflow-y-auto lg:border-l lg:border-t-0 lg:px-5 lg:py-6">
                <div className="hidden lg:block">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-civic-muted">
                    1 · Location
                  </p>
                  <h1 className="mt-1 text-xl font-semibold tracking-tight">
                    Where is the problem?
                  </h1>
                  <p className="mt-1 text-sm text-civic-muted">
                    Pan the map so the crosshair sits on the hazard.
                  </p>
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-civic-muted">
                  Selected location
                </p>
                <p className="font-mono text-xs text-civic-slate">
                  {formatCoords(center.lat, center.lng)}
                </p>
                {locating ? (
                  <p className="text-sm text-civic-muted">Reading GPS…</p>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    requestLocation();
                    if (coords) setCenter(coords);
                  }}
                  className="w-full min-h-12 rounded-card border border-civic-line py-3 text-sm font-semibold"
                >
                  {locating ? "Locating…" : "Use my location"}
                </button>
                {locationError ? (
                  <p className="text-sm font-semibold text-civic-critical">{locationError}</p>
                ) : null}
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full min-h-12 rounded-card bg-civic-accent py-3 text-sm font-semibold text-white"
                >
                  Confirm location
                </button>
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="mx-auto w-full max-w-4xl px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:px-6 lg:py-8">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-civic-muted">
                2 · Hazard
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight">
                What is the problem?
              </h1>
              <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
                {HAZARD_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCategory(opt.value)}
                    className={`min-h-[6.5rem] rounded-card border p-3 text-left lg:min-h-[7.5rem] lg:p-4 ${
                      category === opt.value
                        ? "border-civic-ink bg-civic-mist"
                        : "border-civic-line bg-civic-surface"
                    }`}
                  >
                    <CategoryIcon
                      category={opt.value}
                      className="h-6 w-6 text-civic-accent"
                    />
                    <p className="mt-3 text-sm font-semibold">{opt.label}</p>
                    <p className="mt-1 text-xs text-civic-muted">{opt.hint}</p>
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={!category}
                onClick={() => setStep(3)}
                className="mt-5 w-full rounded-card bg-civic-accent py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                Continue
              </button>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="mx-auto w-full max-w-5xl px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:px-6 lg:py-8">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-civic-muted">
                3 · Evidence
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight">Add evidence</h1>
              <p className="mt-1 text-sm text-civic-muted">
                Photograph the hazard now. Gallery uploads are not accepted.
              </p>
              <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <div>
                  <label className="block text-sm font-semibold">Photo</label>
                  <div className="mt-2">
                    <CameraCapture
                      photoData={photoData}
                      onCapture={setPhotoData}
                      onRetake={() => setPhotoData(null)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold" htmlFor="desc">
                    Short description
                  </label>
                  <textarea
                    id="desc"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onFocus={(e) => {
                      window.setTimeout(() => {
                        e.target.scrollIntoView({ block: "center", behavior: "smooth" });
                      }, 280);
                    }}
                    placeholder="e.g. Open manhole on Argwings Kodhek pedestrian verge, no barrier."
                    className="mt-2 min-h-[6.5rem] w-full rounded-card border border-civic-line bg-civic-surface px-3 py-3 text-base outline-none focus:border-civic-accent lg:min-h-[12rem] lg:text-sm"
                  />
                  <p className="mt-3 text-xs font-medium text-civic-muted">
                    Detected location · {formatCoords(center.lat, center.lng)}
                  </p>
                  <button
                    type="button"
                    disabled={!description.trim()}
                    onClick={() => setStep(4)}
                    className="mt-5 w-full rounded-card bg-civic-accent py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Review
                  </button>
                  <p className="mt-2 text-xs text-civic-muted">
                    Photo is recommended for stronger evidence but optional if the camera is unavailable.
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          {step === 4 ? (
            <section className="mx-auto w-full max-w-4xl px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:px-6 lg:py-8">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-civic-muted">
                4 · Review
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight">Review and submit</h1>
              <dl className="mt-4 grid gap-4 rounded-card border border-civic-line bg-civic-surface p-4 text-sm lg:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-civic-muted">
                    Location
                  </dt>
                  <dd className="mt-1 font-medium">{formatCoords(center.lat, center.lng)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-civic-muted">
                    Hazard
                  </dt>
                  <dd className="mt-1 font-medium">{selected?.label}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-civic-muted">
                    Evidence
                  </dt>
                  <dd className="mt-1 font-medium">{description}</dd>
                </div>
                <div className="lg:row-span-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-civic-muted">
                    Photo
                  </dt>
                  <dd className="mt-1">
                    {photoData ? (
                      <img
                        src={photoData}
                        alt="Captured hazard evidence"
                        className="max-h-40 w-full rounded-card object-cover lg:max-h-72"
                      />
                    ) : (
                      <span className="font-medium">Not taken</span>
                    )}
                  </dd>
                </div>
              </dl>
              {error ? <div className="mt-3"><ErrorBanner message={error} /></div> : null}
              <button
                type="submit"
                disabled={submitting}
                className="mt-5 w-full rounded-card bg-civic-accent py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submitting ? "Sending…" : "Submit report"}
              </button>
            </section>
          ) : null}
        </form>
      )}
    </div>
  );
}

function MoveTracker({
  onMove,
}: {
  onMove: (coords: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    moveend(e) {
      const c = e.target.getCenter();
      onMove({ lat: c.lat, lng: c.lng });
    },
  });
  return null;
}

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 17, { duration: 0.6 });
  }, [map, lat, lng]);
  return null;
}

function ResultState({ result }: { result: ReportResponse }) {
  const verified = result.is_verified;
  return (
    <div className="um-enter um-scroll mx-auto flex w-full max-w-lg flex-1 flex-col px-5 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] lg:max-w-xl lg:justify-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-civic-muted">
        5 · Submission
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {verified ? "Community verified" : "Report logged"}
      </h1>
      <p className="mt-3 text-base leading-relaxed text-civic-slate">
        {verified
          ? `${Math.max(result.nearby_count, 3)} nearby reports confirm this hazard.`
          : "Waiting for nearby reports to confirm this hazard."}
      </p>
      <p className="mt-6 text-sm leading-relaxed text-civic-muted">
        This is {verified ? "a verified spatial cluster" : "an individual report"}.
        Three same-category sightings within 15 metres become planning evidence.
      </p>
      <Link
        to={`/hazards/${result.incident_id}`}
        className="mt-8 rounded-card bg-civic-accent py-3 text-center text-sm font-semibold text-white"
      >
        View evidence
      </Link>
      <Link
        to="/"
        className="mt-3 rounded-card border border-civic-line py-3 text-center text-sm font-semibold"
      >
        Back to map
      </Link>
    </div>
  );
}
