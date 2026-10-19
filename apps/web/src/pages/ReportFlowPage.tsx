import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
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
import { LocationPickerMap } from "../components/map/LocationPickerMap";
import { formatCoords } from "../lib/format";
import { rememberMyReport } from "../lib/myReports";
import { useLocationState } from "../lib/location";
import { UrbanMeshLogo } from "../components/ui/UrbanMeshLogo";
import { ErrorBanner } from "../components/ui/ReportCard";
import { ButtonLink } from "../components/ui/Button";
import { ThemeToggle } from "../lib/theme";

export function ReportFlowPage() {
  const navigate = useNavigate();
  const { coords, requestLocation, locating, error: locationError } = useLocationState();
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (coords) setCenter(coords);
  }, [coords]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [step, result]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!category || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      let photo_url: string | null = null;
      if (photoData) {
        try {
          photo_url = await uploadPhoto(photoData);
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Couldn't store the photo. Photograph the hazard again, or submit without it.",
          );
          setSubmitting(false);
          return;
        }
      }
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
      setError(err instanceof Error ? err.message : "Couldn't send the report. Try again.");
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
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          onSubmit={onSubmit}
        >
          {step === 1 ? (
            <section className="flex min-h-0 flex-1 flex-col lg:flex-row lg:overflow-hidden">
              <div className="shrink-0 px-4 pb-2 pt-3 lg:hidden [@media(max-height:560px)]:hidden">
                <p className="um-eyebrow">1 · Location</p>
                <h1 className="um-title mt-1 text-lg lg:text-lg">Where is the problem?</h1>
                <p className="um-meta mt-1">
                  Required. Pan the map so the crosshair sits on the hazard.
                </p>
              </div>
              <div className="relative min-h-[160px] flex-1 lg:min-h-0">
                <div className="absolute inset-0">
                  <LocationPickerMap
                    center={center}
                    onMove={setCenter}
                    flyTo={coords}
                  />
                </div>
                <div className="pointer-events-none absolute inset-0 z-[1100] flex items-center justify-center">
                  <div className="relative um-crosshair" />
                </div>
              </div>
              <div className="shrink-0 space-y-3 border-t border-civic-line bg-civic-surface px-4 py-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] lg:w-[380px] lg:overflow-y-auto lg:border-l lg:border-t-0 lg:px-5 lg:py-6">
                <div className="hidden lg:block">
                  <p className="um-eyebrow">1 · Location</p>
                  <h1 className="um-title mt-1">Where is the problem?</h1>
                  <p className="um-meta mt-1">
                    Required. Pan the map so the crosshair sits on the hazard.
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
                {locationError ? (
                  <p className="text-sm font-semibold text-civic-critical">{locationError}</p>
                ) : null}
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                  <button
                    type="button"
                    onClick={() => {
                      requestLocation();
                      if (coords) setCenter(coords);
                    }}
                    className="w-full min-h-12 rounded-card border border-civic-line py-3 text-sm font-semibold transition-colors hover:bg-civic-mist"
                  >
                    {locating ? "Locating…" : "Use my location"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-full min-h-12 rounded-card bg-civic-accent py-3 text-sm font-semibold text-white transition-colors hover:bg-civic-accentDark active:scale-[0.98] motion-reduce:active:scale-100"
                  >
                    Confirm location
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <>
              <div ref={scrollRef} className="min-h-0 flex-1 um-scroll">
                <section className="mx-auto w-full max-w-4xl px-4 py-4 lg:px-6 lg:py-8">
                  <p className="um-eyebrow">2 · Hazard</p>
                  <h1 className="um-title mt-1">What is the problem?</h1>
                  <p className="um-meta mt-1">Required. Pick one Kilimani hazard type.</p>
                  <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
                    {HAZARD_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setCategory(opt.value)}
                        className={`min-h-[6.5rem] rounded-card border p-3.5 text-left transition-colors lg:min-h-[8rem] lg:p-4 ${
                          category === opt.value
                            ? "border-civic-ink bg-civic-mist shadow-card"
                            : "border-civic-line bg-civic-surface hover:border-civic-slate hover:bg-civic-paper"
                        }`}
                      >
                        <CategoryIcon
                          category={opt.value}
                          className="h-7 w-7 text-civic-accent"
                        />
                        <p className="mt-3 text-sm font-semibold tracking-tight">{opt.label}</p>
                        <p className="um-meta mt-1.5">{opt.hint}</p>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
              <ReportStepFooter>
                <button
                  type="button"
                  disabled={!category}
                  onClick={() => setStep(3)}
                  className="w-full min-h-12 rounded-card bg-civic-accent py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Continue
                </button>
              </ReportStepFooter>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <div ref={scrollRef} className="min-h-0 flex-1 um-scroll">
                <section className="mx-auto w-full max-w-5xl px-4 py-4 lg:px-6 lg:py-8">
                  <p className="um-eyebrow">3 · Evidence</p>
                  <h1 className="um-title mt-1">Add evidence</h1>
                  <p className="um-meta mt-1">
                    Photograph the hazard now. Gallery uploads are not accepted.
                  </p>
                  <div className="mt-4 flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                    <div className="order-2 lg:order-none">
                      <label className="block text-sm font-semibold">
                        Photo <span className="font-medium text-civic-muted">(optional)</span>
                      </label>
                      <div className="mt-2">
                        <CameraCapture
                          photoData={photoData}
                          onCapture={setPhotoData}
                          onRetake={() => setPhotoData(null)}
                        />
                      </div>
                    </div>
                    <div className="order-1 lg:order-none">
                      <label className="block text-sm font-semibold" htmlFor="desc">
                        Short description <span className="font-medium text-civic-muted">(required)</span>
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
                        className="mt-2 min-h-[6.5rem] w-full scroll-mb-28 rounded-card border border-civic-line bg-civic-surface px-3 py-3 text-base outline-none focus:border-civic-accent lg:min-h-[12rem] lg:text-sm"
                      />
                      <p className="mt-3 text-xs font-medium text-civic-muted">
                        Detected location · {formatCoords(center.lat, center.lng)}
                      </p>
                      <p className="mt-2 text-xs text-civic-muted">
                        Photo is recommended for stronger evidence but optional if the camera is unavailable.
                      </p>
                    </div>
                  </div>
                </section>
              </div>
              <ReportStepFooter>
                <button
                  type="button"
                  disabled={!description.trim()}
                  onClick={() => setStep(4)}
                  className="w-full min-h-12 rounded-card bg-civic-accent py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Review
                </button>
              </ReportStepFooter>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <div ref={scrollRef} className="min-h-0 flex-1 um-scroll">
                <section className="mx-auto w-full max-w-4xl px-4 py-4 lg:px-6 lg:py-8">
                  <p className="um-eyebrow">4 · Review</p>
                  <h1 className="um-title mt-1">Review and submit</h1>
                  <dl className="mt-4 grid gap-4 rounded-card border border-civic-line bg-civic-surface p-4 text-sm lg:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-civic-muted">
                        Location (required)
                      </dt>
                      <dd className="mt-1 font-medium">{formatCoords(center.lat, center.lng)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-civic-muted">
                        Hazard type (required)
                      </dt>
                      <dd className="mt-1 font-medium">{selected?.label}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-civic-muted">
                        Description (required)
                      </dt>
                      <dd className="mt-1 font-medium">{description}</dd>
                    </div>
                    <div className="lg:row-span-3">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-civic-muted">
                        Photo (optional)
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
                </section>
              </div>
              <ReportStepFooter>
                <button
                  type="submit"
                  disabled={submitting}
                  aria-busy={submitting}
                  className="w-full min-h-12 rounded-card bg-civic-accent py-3 text-sm font-semibold text-white disabled:pointer-events-none disabled:opacity-60"
                >
                  {submitting ? "Sending…" : "Submit report"}
                </button>
              </ReportStepFooter>
            </>
          ) : null}
        </form>
      )}
    </div>
  );
}

function ReportStepFooter({ children }: { children: ReactNode }) {
  return (
    <div className="shrink-0 border-t border-civic-line bg-civic-surface px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:px-6">
      <div className="mx-auto w-full max-w-4xl">{children}</div>
    </div>
  );
}

function ResultState({ result }: { result: ReportResponse }) {
  const verified = result.is_verified;
  return (
    <div className="um-enter um-scroll mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col px-5 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] lg:max-w-xl lg:justify-center">
      <p className="um-eyebrow">5 · Submission</p>
      <h1 className="um-display mt-3">
        {verified ? "Community-supported" : "Pending corroboration"}
      </h1>
      <p className="um-body mt-4 text-base">
        {verified
          ? `${Math.max(result.nearby_count, 3)} same-category reports now sit within 15 metres. That spatial corroboration — not a field inspection — is what UrbanMesh treats as planning evidence.`
          : "Your report is logged as pending. It becomes community-supported only when two more same-category sightings land within 15 metres."}
      </p>
      <p className="um-meta mt-6">
        Nairobi City County has not inspected this site. Field-verified and Resolved are not live states yet.
      </p>
      <ButtonLink to={`/?select=${result.incident_id}`} className="mt-8 w-full">
        View on map
      </ButtonLink>
      <ButtonLink to={`/hazards/${result.incident_id}`} variant="secondary" className="mt-3 w-full">
        View evidence
      </ButtonLink>
    </div>
  );
}
