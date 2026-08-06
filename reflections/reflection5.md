# Reflection #5

Pod Members: **Emmanuel, Dylan, Semir**

## Reflection Questions

* How was the pacing of the capstone project? (i.e too slow, just right, too fast)

The pacing was mostly just right, with the pressure loaded toward the middle. The first sprint felt calm because we were building the skeleton, models, and auth, and then Sprint 2 was the crunch because the recommendation engine, the AI sequencing, the map, and deployment all landed at once. Sprints 3 and 4 eased off since they were about user experience and polish rather than net-new systems. If anything, we would have moved a little of the Sprint 2 load earlier, because that was the week where too much depended on the AI step being merged before the rest of the app could be tested end to end.

* To what extent did your plan change over the course of development? Knowing that you know now, what would you do differently if you were starting over?

The plan changed a lot in the data and infrastructure layers and barely at all in the product vision. We always meant to build an AI group-itinerary planner for one city, and that is exactly what shipped. What changed was almost everything underneath: we dropped the live OSM pull for a hand-curated dataset, swapped MapLibre for Leaflet, split the overloaded Pin table into Pin plus ItineraryStop, added trip constraints and a members table back onto the itinerary after originally deciding to keep them off, and grew the endpoint list well past the original sketch. Starting over, we would design the venue-versus-visit split from day one instead of retrofitting it, and we would stand up a deployed environment in week one so that production-only issues like the proxy request cap and email delivery surfaced early instead of in the final sprint.

* How did the spec-driven workflow hold up across the full project? When did maintaining project_plan.md save time or prevent confusion, and when did it feel like overhead?

It held up well as a shared contract. The Data Model and Endpoints sections were precise enough that we could build directly against them and split work across three people without stepping on each other, and the user stories kept features honest. Maintaining the plan saved the most time during the bug bash and spec audits, when having a written "intended behavior" made it obvious where the running app had drifted, like a Discover filter querying a dropped column. It felt like overhead mainly in the middle sprints, when the code was moving faster than the doc and the plan would go stale for a week at a time. The fix was to treat reconciliation as its own task at the end of a sprint rather than trying to keep the doc live minute to minute.

* Where was Claude most useful during capstone development? Where did its output require the most revision, and what was missing from the spec when that happened?

Claude was most useful on well-scoped, well-specified work: generating controllers and Prisma queries from the endpoint contracts, writing tests, and building the deterministic fallback sequencer where the rules were clear. It needed the most revision on anything tied to the real deployed environment or to fuzzy data, like the AI generation timing out behind the proxy or recommendation quality on thinly tagged places. In those cases what was missing from the spec was the operational reality: the proxy request cap, real SMTP behavior, and how sparse the raw place data actually was. Once we wrote those constraints down, the output got much closer on the first try.

* Looking back at the spec you wrote in Week 6 vs. the final state of project_plan.md: what changed, and what stayed stable? What does the git history of your planning file tell you about how the project evolved?

The stable core is the product itself and the user stories, plus the like/bookmark model and the general page set. What changed is the plumbing: the schema grew from three tables to seven, the auth and pin endpoints were reshaped, and two AI features shipped where the Week 6 spec described one. The git history of project_plan.md tells the story clearly. There is a burst of edits early as we nailed down models and endpoints, then a quiet stretch during the heavy build sprints where the code outran the doc, then deliberate reconciliation commits ("reconcile project plan with as-built," "notes from Bug Bash") where we pulled the document back in line with reality. The gaps in the history are as telling as the commits: they mark the weeks we were building fastest.

* How did the AI Feature Decisions Log hold up? Was it useful to have a running record of how the AI feature changed across sprints?

It was one of the more useful parts of the doc. The AI feature moved the most of anything, from provider choice to scope to the fallback to a second image feature, and having a table that recorded what changed and why meant we never re-litigated a decision we had already made. It was especially helpful when we swapped providers and tuned the model for the deploy cap, because the log captured the reasoning ("worst case must stay under the ~100s proxy cap") that would otherwise have lived only in someone's memory.

* How helpful were the labs and weekly assignments in preparing you for capstone work? What topics do you still have questions about?

The labs on data modeling, REST endpoints, and React state mapped directly onto the capstone and gave us a shared vocabulary for splitting work. Auth was well covered enough that wiring Supabase felt familiar. The topics we still have the most questions about are the ones that only showed up at scale or in production: deployment configuration and environment variables, working within proxy and timeout limits, reliable email delivery, and how to design a recommendation and scoring system that stays sensible as the dataset grows. Those were the areas where we learned the most by hitting problems rather than from prior preparation.

* Which resources were most helpful during the capstone (mentors, instructors and TAs, ideation process, pod syncs, wireframes, sprint planning, bug bash, practice demo day, etc.)?

The bug bash was the single most valuable resource, because it showed us how real users experienced the app and surfaced UX problems we were blind to, like people struggling with the login flow and reacting to the AI-generated wording. Our mentors and managers were a close second for talking through user scenarios and helping us decide what to cut. Pod syncs kept the three of us aligned and cut down on merge surprises, the wireframes gave us a stable target for the UI, and the practice demo day forced us to polish the end-to-end flow before it mattered. The area we most wished for more support was Git workflow early on, since merge conflicts across parallel branches slowed us down in the first two sprints.
