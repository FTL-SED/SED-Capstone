# Reflection #2

Pod Members: **Emmanuel, Dylan, Semir**

## Reflection Questions

* Name at least one thing that went well this sprint.

  A lot came together this sprint. The AI itinerary sequencing (`POST /ai-agent`) that was still in a PR last week is now built and merged, so the full flow works end to end: the trip form feeds the recommendation engine, which feeds the AI, which returns an ordered day. We also enriched our place data heavily — we imported thousands of venues from an OpenStreetMap NorCal extract, deduped near-duplicate and chain locations, and started AI-enriching descriptions and tags, which directly fixed last sprint's "recommendations look sparse" risk. On the frontend, we wired up the itinerary viewer with a Leaflet map and numbered pins, cover-image upload, the discover page, like/bookmark, and made every page mobile-responsive. We also deployed the app so it's publicly accessible.

* What challenges did your team face?

  Data quality was the biggest one. The OSM import gave us volume (~4,300 venues) but most came in with null ratings and generic tags, which diluted recommendation quality — so we had to build dedup and enrichment passes on top of it. We also hit merge friction again from working on parallel branches that touched the same files. A recurring theme was drift between what the spec said and what we'd actually built (for example, the plan called for MapLibre + a live OSM/Overpass pull, but we shipped Leaflet + a hand-curated/imported static dataset), which forced a mid-sprint audit to catch bugs the drift had hidden.

* Did you finish all of your planned tasks? If not, what contributed to that? 

  We finished most of Milestone 3 and a good chunk of Milestone 4: the itinerary viewer, discover page, like/bookmark, edit/delete/copy, mobile responsiveness, and deployment are all done. What's not finished is mostly enrichment and polish: AI-enriching the thousands of imported OSM venues' ratings and tags is planned but not built (it's a cost-bearing batch job), and the venue-taxonomy redesign that would meaningfully improve recommendation quality is spec'd but deferred pending team review. These slipped less from misestimation and more because the OSM import surfaced a data-quality problem we hadn't scoped — it created follow-on work (dedup, enrichment, taxonomy) that wasn't in the original plan.

* Did your team perform a spec audit this sprint? What did you find — were there gaps between the documented and actual behavior? Is the "Spec Reconciliation — Sprint 2 Midpoint" section committed to your repo?**

  Yes, we ran a core-functionality audit across the spec, backend, frontend, database, and AI layers. It found real gaps between the documented and actual behavior, including: the Discover interest filter still queried a database column we'd since dropped (a 500 on any interest filter); the like endpoint leaked private-draft metadata; four user stories (edit, delete, copy, and the "created" dashboard carousel) had working backends but no frontend wiring; and like/bookmark toggles had a race condition on rapid clicks. We fixed all of these and recorded the "as built" reality directly in `project_plan.md` (e.g. Leaflet-not-MapLibre, static-dataset-not-live-API) and in our decisions log.

  However — the audit was **not** committed under a section literally titled **"Spec Reconciliation — Sprint 2 Midpoint."** That named section does not yet exist in the repo. Adding it (consolidating the audit findings and "as built" notes into one committed section) is a Sprint 3 action item.

* Which spec sections were most useful during development? Which were too vague to be actionable, and how did you address that?

  Most useful: the **Data Model** and **Endpoints** sections were precise enough to build directly against — request/response shapes, relations, and the like/bookmark join tables translated almost one-to-one into Prisma and controllers. The **user stories** kept the like/bookmark/copy features aligned with what we actually needed.

  Too vague / wrong: the **Milestone 2** guidance ("Set up OSM and MapLibre on the backend to handle fetching/displaying place data") was not actionable as written — a live OSM/Overpass pull proved unreliable and MapLibre was more than we needed. We addressed it by pivoting to a hand-curated + OSM-imported static dataset and Leaflet on the frontend, then annotating the milestone with an explicit "As built" note so the spec reflects reality. The recommendation-engine "enrichment" step was also left underspecified; we captured a concrete plan for it (AI enrichment + a venue-taxonomy redesign) in dated design specs rather than leaving it hand-wavy.

* Were there features you cut for MVP? Did you update the spec to reflect those decisions — and record them in the Decisions Log?

  Yes. We cut/deferred: Google Places enrichment (unnecessary once the static dataset carried real ratings/prices — a no-op hook remains), natural-language itinerary editing (`POST /ai-agent/edit`, designed but not built), and the saved-user-preferences and friend-requests features (stretch). We updated the spec's Stretch Goals with "As built" notes for each, and our decisions are recorded — though currently they live richly in `.claude/rules/memory-decisions.md` while the **Sprint 2 section of `project_plan.md`'s Decision Log is still empty.** Backfilling that Sprint 2 section is a Sprint 3 action item so the cuts are recorded in the canonical log, not just the working notes.

* Which features and user stories are "at risk"? How will you adjust your plan for Sprint 3?

  At risk:
  - **Recommendation/AI quality (Stories #4 "reflect group interests" and #5/#6 the AI itineraries).** The engine and AI work, but the thousands of OSM-imported venues still have null ratings and coarse tags, so results can feel generic. Sprint 3: run the planned AI enrichment batch job and evaluate the venue-taxonomy redesign so interest matching is meaningful.
  - **Natural-language editing (part of Story #7).** Basic edit/delete/copy is done, but the AI-driven edit endpoint is unbuilt. If it stays at risk we'll ship it as a clear stretch and lean on the working manual edit flow for MVP.

  Plan adjustments for Sprint 3: (1) commit the "Spec Reconciliation — Sprint 2 Midpoint" section and backfill the Sprint 2 Decision Log so documentation matches reality; (2) prioritize data enrichment over new features, since recommendation quality gates the app's core value; (3) tighten our branch/merge order to cut down the recurring merge conflicts.
