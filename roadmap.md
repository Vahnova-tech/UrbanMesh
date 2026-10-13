# UrbanMesh — 90-Day Pilot Roadmap

**Team UrbanMesh · Kilimani, Nairobi**

*From working MVP to a supervised street pilot on Kilimani’s corridors*

Living product snapshot (what the code does **now**): **[`STATUS.md`](./STATUS.md)**

---

## Current baseline (working MVP)

The 90-day plan below is **not** a build-from-zero backlog. The demo stack already exists:

| Already in the repo | Still required for a street pilot |
| --- | --- |
| Citizen report form + GPS + live H3 cells | Installable PWA, map-pin fallback, offline cache |
| PostGIS 15 m / ≥3 self-verify (env-configurable) | Threshold tuned on real corridor density |
| County dashboard + LPDP PDF | Named LPDP desk access, official ward polygons |
| Empty incidents table (no authored demo reports) | Real resident reports on two corridors |
| — | KCF hosting, reporter cohort, moderation, runbook |

Phase 1 is **harden + partner**. Phase 2 is **live usage**. Phase 3 is **validate + handover**.

---

## Pilot overview

This plan turns the MVP into a supervised, real-world pilot across two of Kilimani’s most heavily reported corridors:

| Corridor | Focus |
| --- | --- |
| **Argwings Kodhek Road** | Mobility & surface damage |
| **Kirichwa Kubwa river corridor** | Sewer, sanitation & environmental hazards |

These corridors already have named map geometry and copy, so Day 1 of the pilot is a cold launch on real reports rather than authored pins.

| Phase | Days | Owning question |
| --- | --- | --- |
| **Foundation** | 1–30 | Is the platform ready for real residents to use unsupervised? |
| **Community pilot** | 31–60 | Does real usage produce verifiable, useful evidence? |
| **Validate & handover** | 61–90 | Is the evidence good enough to hand to a permanent operator? |

---

## Phase 1 · Days 1–30 — Foundation

**Goal:** Harden the MVP, lock in institutional partners, recruit the first reporters.

| Window | Workstream | Owner | Status |
| --- | --- | --- | --- |
| Wk 1 | Confirm **KCF** as the platform’s long-term community host; agree moderation responsibilities and a point of contact for verified-cluster review. | Team lead + KCF | Not started |
| Wk 1–2 | Harden the reporting API: stronger validation, photo storage ops, error handling, and **wire** rate-limiting against spam. | Backend / spatial tech | Partial (photos + CORS; rate limit stubbed) |
| Wk 2 | Live client-side H3 calculation so real GPS resolves to real spatial cells. | Frontend | **Done** |
| Wk 2–3 | Recruit a first cohort of **15–20 community reporters** along the two pilot corridors. | KCF + civic design | Not started |
| Wk 3 | Reporter orientation (categories, what “verified” means, privacy basics). | Civic design | Not started |
| Wk 4 | Dry-run the full pipeline end-to-end with the cohort; fix breakage before broader open. | Full team | Not started |

### Phase 1 exit criteria

- [ ] KCF hosting agreement in writing
- [ ] 15+ onboarded reporters
- [ ] End-to-end dry run completed with **zero data-loss incidents**

---

## Phase 2 · Days 31–60 — Community pilot

**Goal:** Real residents reporting real hazards; platform separates noise from genuine clusters.

| Window | Workstream | Owner | Status |
| --- | --- | --- | --- |
| Wk 5–6 | Open live reporting to the full cohort on both corridors; monitor volume and clustering daily. | KCF (moderation) | Blocked on Phase 1 |
| Wk 6 | Tune the **15-metre / 3-report** self-verify threshold against real density. | Spatial tech | Not started |
| Wk 7 | Expand beyond the cohort via QR at **Kiota School** and KCF touchpoints. | Civic design | Not started |
| Wk 7–8 | Share read-only dashboard access with a named LPDP planning desk contact. | Data systems | Dashboard exists; access TBD |
| Wk 8 | Generate the first live **LPDP Policy Report PDF** from real pilot data with the county contact. | Data systems + team lead | Generator exists; live data TBD |

### Phase 2 exit criteria

- [ ] Minimum of **50 verified (clustered) reports** across both corridors
- [ ] One LPDP Policy Report reviewed by an actual county contact
- [ ] Clustering threshold tuned and documented

---

## Phase 3 · Days 61–90 — Validate & handover

**Goal:** Confirm the evidence holds up; transfer ownership to the long-term operator.

| Window | Workstream | Owner | Status |
| --- | --- | --- | --- |
| Wk 9 | Joint review with KCF and county: does verified-cluster data match KCF’s 2025 assessment? | Full team + KCF + County | Not started |
| Wk 9–10 | Adjust hazard taxonomy from what residents actually reported (stay within privacy scope). | Spatial tech + data systems | Not started |
| Wk 10–11 | Operations runbook: moderate reports, regenerate LPDP PDF, add a corridor. | Full team | Not started |
| Wk 11 | Formal handover with KCF (note, repo access, architecture diagram). | Team lead | Not started |
| Wk 12 | Public pilot summary back to the Kilimani community — close the feedback loop. | Civic design + KCF | Not started |

### Phase 3 exit criteria

- [ ] Operations runbook complete
- [ ] Handover session held with KCF
- [ ] Pilot summary shared publicly

---

## Key risks

| Risk | Mitigation |
| --- | --- |
| Low reporter turnout outside the recruited cohort | Lean on KCF channels and Kiota School as a physical touchpoint. |
| False or duplicate reports gaming the 3-report threshold | Keep KCF moderation in Phase 1–2; treat auto-verify as a priority signal. **Ship rate limits before opening the cohort.** |
| County contact turnover | Secure a named LPDP desk contact **in writing during Phase 1**. |
| Clustering miscalibrated for corridor density | Week 6 tuning; keep radius and report-count **configurable**. |
| Team availability after launch | Handover runbook and KCF ownership planned from **Phase 1**. |
| Docs over-claim hardening | `STATUS.md` is the source of truth for wired vs stubbed. |

---

*UrbanMesh · Kilimani · 90-Day Pilot Plan*
