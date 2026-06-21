# Lodestar — Product & Technical Roadmap
### One verb, one lesson, one share · v0.2 · June 2026
*Web-first · React Three Fiber · solo + AI-assisted. This consolidates and supersedes the v0.1 Prototype-Definition and Technical-Roadmap docs. Where they conflict, this wins.*

---

## 0. The one-paragraph thesis

A science-curious person sees the microrobot video, has three minutes on a phone, and feels *"whoa — how does that actually work?"* Lodestar answers that by hand: you **drive a speck of medicine through the bloodstream with a magnet, fighting the current, and release it exactly on the tumour — feeling, in your thumb, why a targeted dose beats poisoning the whole body.** Then you share the result. Everything in this roadmap serves that sentence. The ambition goes into **the fidelity of the explanation and the quality of the feel**, never into game systems.

**Two hard truths driving every decision in v0.2 (the lessons from reviewing v0.1):**
1. **Accurate ≠ fun.** Correct low-Reynolds physics is the *starting point* of feel, not the proof of it. We budget for juice as a first-class deliverable, not polish.
2. **The verb and the lesson must be the same act.** v0.1 risked making *navigation* the fun and *the lesson* a caption you read at the end. In v0.2 the lesson is delivered by **a thing you personally cause and feel** — the targeted release vs. the collateral you almost did.

---

## 1. Audience (unchanged, it was right)

**Design for one person — "the Curious Sharer."** ~16–34, follows science creators, plays casually on a phone, sound off, low patience, one hand, ~3 minutes. Win condition for them: *"Oh — I get it now. And it's beautiful. Sending this to the group chat."*

**Don't optimise for, don't break:**
- **Educators/students** → keep a sourced "how it really works" layer.
- **People touched by cancer/stroke** → governs *tone*: hopeful, dignified, never "blast the tumour." Non-negotiable.
- **Credibility gatekeepers** (ETH, SNSF, journalists) → must find it accurate and citable.

**Anti-audience (this is what protects scope):** core gamers wanting depth/retention; clinicians wanting a surgical sim; under-12s (subject is cancer; frame 13+). *"It can't be a simple 2D game"* must not mutate into *"so make it a deep game."* It's a 3D web explainer whose depth is realness and beauty, not systems.

---

## 2. The three pillars (this is the standout-product spec)

v0.1 had a render budget and a perf budget but **no feel budget and no share spec**. A feel-driven, anti-retention explainer lives or dies on exactly those two things. So the product is defined by three pillars, each with an owner-metric:

### Pillar A — The Verb feels alive
The blob must feel like a thing you're *holding against a current*, not a cursor in syrup.
- **Control:** offset/indirect magnet (your thumb never occludes the action — the magnet leads ahead of the touch point). The *true* 1/d⁴ falloff drives the **visualized** field; the *effective control response* is a tuned, clamped curve chosen for feel.
- **Feel-enhancers are core, not polish:** subtle lead/anticipation on the blob, blob deformation under flow and charge, a small "grab" response when the pull catches.
- **Haptics (mobile):** the single best channel for "the current is pushing you" and "the pull caught." Light continuous texture for flow, a distinct tick on junction commit, a rising pattern on charge, a satisfying thunk on release. Treat haptics as a primary output device.
- **Audio (optional, captioned, muted-first):** approach swell near target, current hiss, release chord — all redundant with visuals so it works silent.
- *Owner-metric:* in blind testing, **"would you play 3 more runs?" ≥ 60%** and a measurable **control margin** (can a fresh player hold the blob in a zone the current is actively pushing it out of).

### Pillar B — The Lesson is the act, not the caption
- The loop must make the player **personally cause** the difference between targeted and systemic.
- The collateral/release mechanic carries the teaching weight: an early, near-unavoidable beat where a sloppy/early release visibly harms healthy tissue — *contrasted seconds later* with a clean targeted release on the tumour. Comprehension comes from the difference *you* made.
- Captions are short, diegetic, redundant — they *name* what you just felt, they don't *deliver* it.
- *Owner-metric:* **≥70% of fresh players can restate "why targeted beats systemic"** unprompted, and point to the *moment in play* (not the end card) where they got it.

### Pillar C — The Share is the growth engine
This is an anti-retention single-run piece. The **share artifact is the product surface that actually spreads** — it gets the design attention a retention loop would get in a normal game.
- Personal + legible: your *path* through the tree, your *collateral score / "clean delivery" rating*, the tumour you shrank, in one beautiful OG card.
- A friend who's never heard of it must understand the hook from the image alone and want to tap.
- One tap to share, one tap to "this is real → the science → the other diseases."
- *Owner-metric:* **measurable share rate** and inbound from shared cards.

> If a feature doesn't strengthen A, B, or C, it's out of the prototype.

---

## 3. UX principles (tightened)

1. **Friction zero.** Link → playing in < 5s. No login, no menu, no tutorial wall. Mobile portrait first.
2. **One verb, instantly legible — but the verb is genuinely non-obvious,** so plan one *diegetic* teaching beat (a field-line "ghost pull" preview) to bridge the gap between "blob chases my finger" (wrong expectation) and gradient-pull. Pure no-text onboarding may fail *this specific verb*; budget for the bridge.
3. **Teach by doing** — the lesson lives in the release/collateral act (Pillar B). Words name, never lecture.
4. **Forgiving, not toothless.** Low-Re means no twitch demands — a gift for accessibility and the touched audience. But forgiving ≠ stakeless: collateral must *bite immediately and visibly*, and each run has one manufactured near-miss the current forces. No hard "game over"; failure teaches and you continue.
5. **Readable visual language.** Warm-glow blob; cool field lines; soft walls; tumour vs. healthy distinguished by **shape and motion, not just colour** (colourblind-safe); current shown as drifting blood cells.
6. **A payoff that lands on a fumble.** Target = catharsis (tumour shrinks). The "this is real" card always appears, win or stumble, and is always shareable.
7. **Accessibility as default:** colourblind-safe, captions, one-handed, reduced-motion toggle, zero time pressure, **skippable/abortable cold-open** (the push-in is the most nausea-prone moment and it's first — let people bail into play).

---

## 4. Flow

### Session arc (first run, ~3 min — trimmed from 4; the persona has three)
1. **Hook (0:00–0:15).** Black → heartbeat → short, eased push through tissue into a vessel. *"Today, treating a tumour means flooding the whole body with poison."* **Skippable.**
2. **Take control (0:15–0:35).** Capsule injected; you take the magnet. Field-line ghost shows the pull. *"You're driving the medicine."* Teach-by-doing, no text wall.
3. **Feel the current (0:35–1:05).** Flow pushes you downstream; you feel it fight the pull (haptics carry this). First junction — a *real* choice (see §6 level design).
4. **The collateral beat (1:05–1:45).** Healthy-tissue zone you must pass near. The near-miss: the current nudges you toward a premature release. If you slip, healthy cells visibly stress — the lesson lands *by doing*.
5. **The run (1:45–2:30).** Thread the tree to the tumour — anticipate current, choose branches, hug a wall to dodge flow. One real tension moment.
6. **Deliver (2:30–2:55).** At the tumour: *charge the external field* (hold) → particles heat → shell dissolves → drug releases → tumour shrinks. The clean release, felt against the memory of the collateral beat. Catharsis.
7. **Payoff (2:55–3:20).** Pull back: *"You just did what a magnet outside the body can now actually do."* Breadth beat (clot-buster → stroke; antibiotic → infection). *"This is real: ETH Zurich, 2025, in animal trials."* → **personal Share card / Learn more.**

### Core loop (the thing that must be fun)
Read current + path → place the magnet to set the pull → blob drifts *up the gradient against the flow* → correct → thread a junction → arrive → charge → **release with precision, feeling the cost of imprecision.** The fun *is* the tension between current and pull; the meaning *is* the precision of the release. Gate 0 tests the first half; Gate 1 tests that the two are one act.

---

## 5. Architecture (v0.1 was right — kept, condensed)

Three strictly separated layers. The separation is the risk-reduction strategy: greybox and tune with art off, beautify later without touching mechanics.

```
UI      React + zustand        low-freq (phase, meters) — never in the sim loop
Render  Three.js / R3F + drei  reads sim each frame via refs (no setState)
Sim     pure TS, deterministic step(state, input, dt) at fixed 120 Hz
```

- **Bridge:** one `GameLoop` runs `useFrame`, advances the sim via a fixed-timestep accumulator, writes into Three objects (blob matrix, instanced cells, camera target). Renderer interpolates.
- **Determinism:** fixed logical rate, pure `step()` → replayable. Essential for unit tests, **tuning sweeps**, and fair difficulty across devices.
- **Decisions carried over from v0.1 (all correct):** drop Rapier (custom ~30-line overdamped integrator); vessel **graph** not a tube; magnet stays **external**; third-person follow camera (endoscopic = cold-open cinematic only); split decorative anatomy asset from the hand-authored playable vessel graph.

### Core data model
```ts
interface VesselNode { id: string; pos: Vec3 }
interface VesselEdge { id; from; to; curve: CatmullRomCurve3; radius:(s)=>number; flowSign: 1|-1 }
interface VesselGraph { nodes; edges; inletFlow: number }            // Q (µL/s)
interface Blob { edgeId; s; offset: Vec2; payload; charge }
interface Field { magnetPos: Vec3; strength }                        // magnet OUTSIDE the vessel
interface Scenario { graph; startEdge; target:{edgeId;s;kind}; healthyZones:[]; payloadLabel }
```
Scenarios are pure JSON. Adding stroke/infection later is **authoring, not engineering.**

### The simulation (cheap *and* correct — with a feel caveat)
Low Reynolds ⇒ overdamped ⇒ solve velocity directly, never integrate acceleration:
```
v_blob = v_fluid + μ · F_mag         μ = 1/(6πηr)   (Stokes)
F_mag  = k · ∇|B|                     external dipole: |B| ∝ 1/d³ ⇒ pull ≈ 1/d⁴
v_flow(s) ∝ 1/r(s)²                   continuity: narrow vessels rush faster (true + free tension)
```
**Feel caveat (new in v0.2):** `k` *and* the effective falloff exponent are **tuned for feel**, not derived. The physically-true 1/d⁴ drives the *visualized* field lines; the control response the player actually feels is a clamped, reshaped curve. We keep the science on screen and the *feel* in the thumb — and we're honest that those are two layers.

Integrator per fixed step: sample gradient → `v` → advance `s`/`offset` → clamp `|offset| ≤ radius−blobRadius` (wall = clamp, no solver) → at a node pick outgoing edge by best tangent match → handle charge/heat/release + collateral.

---

## 6. Level & junction design (was missing — the difference between a verb and a chore)

A fork is only interesting if it's a **real trade-off**, not a maze. Author each junction with a visible tension:
- **fast-but-narrow** (rushing current, hard to hold) vs. **slow-but-wide** (calm, longer);
- a **collateral-laden shortcut** (faster, but threads past healthy tissue);
- the occasional **dead-end branch** that teaches "anticipate the current."

One scenario's worth of this philosophy is the Gate-1 deliverable: 3–4 branches, at least one genuine trade-off, exactly one manufactured near-miss. The "right" path should reward *anticipation*, not reflex.

---

## 7. Rendering & performance (kept from v0.1 — it was solid)

| Element | Approach |
|---|---|
| Gameplay vessels | `TubeGeometry` per visible edge; translucent wall; render only edges within N hops of the blob — O(local) |
| Blood cells | `InstancedMesh`, 2–5k biconcave discs drifting with `v_flow`, one draw call — doubles as the current cue |
| Blob | sphere + emissive/fresnel glow + flow/charge deformation (a *feel* element, see Pillar A) |
| Field viz | a few GPU-cheap field lines / gradient halo around the magnet (true 1/d⁴) |
| Camera | third-person eased follow, look-ahead toward flow |
| Context body | decimated Draco Z-Anatomy glb, semi-transparent, scripted **skippable** push-in + "you are here" minimap; lazy-loaded |

**Budget (60 fps on a ~2021 mid phone):** draw calls < ~80; visible tris < ~300k; cells 2–5k/1 call; context model < 50k tris, Draco ~1–2 MB; total gzip < ~4 MB; KTX2 textures ≤ 1–2k. **Hard rule: no `setState` in `useFrame` — mutate via refs.** That single rule is 60 fps vs. 20.

---

## 8. Tech stack & repo (kept)

| Concern | Choice |
|---|---|
| Build/lang | Vite + TypeScript |
| 3D | Three.js via R3F + `drei` |
| UI state | zustand (UI only) |
| Physics | custom TS integrator (no engine) |
| Asset prep | `gltfjsx` + `gltf-transform` (Draco/meshopt) |
| Haptics | Web Vibration API + capability detection (graceful no-op) |
| Audio | Howler / raw Web Audio (optional, captioned) |
| Analytics | Plausible / DataFast — completion, comprehension tap, **share rate** (no backend) |
| Hosting | Vercel / Netlify (static) |
| Tests | Vitest (sim) + Playwright (smoke) |

```
/src
  /sim       vesselGraph blob field flow integrator scenario sim     // pure, tested
  /render    VesselMesh BloodCells BlobMesh FieldLines FollowCamera ContextBody
  /feel      haptics.ts audioCues.ts blobDeform.ts controlCurve.ts   // Pillar A, first-class
  /ui        HUD PayoffCard SciencePanel ShareCard                   // ShareCard = Pillar C
  /game      GameLoop.tsx                                            // useFrame bridge
  /scenarios brain-tumour.json  (stroke.json, infection.json later)
  /assets    *.glb *.ktx2
```

---

## 9. Stage gates (each dies cheap or earns the next — sharpened with pre-registered numbers)

> ### Gate 0 — Verb greybox · the kill gate · ~4–5 days
> The only thing ever "simple": the real 3D engine with art off, to prove the verb **on a phone, in someone else's hand,** before spending an hour on beauty.
> **Build:** `/sim` core (single-edge graph, blob, field, low-Re integrator) + minimal `/render` (one grey tube, sphere, **offset** magnet control, follow camera) + `GameLoop` + constant flow + a **first pass at feel** (control curve, blob lead, basic haptic on mobile).
> **Not now:** art, anatomy, UI, sound design, levels, release mechanic.
> **Three questions, tested on a real mid phone:**
> 1. Is steering against the current satisfying for ~60s?
> 2. Does the control survive a thumb (occlusion, falloff feel)?
> 3. Do people understand why the blob doesn't chase their finger?
> **Pre-registered pass:** ≥60% of 5–8 fresh phone testers say "yes, 3 more runs"; measurable control margin; ≥half grasp the gradient pull within 10s (with the ghost-pull hint). **Miss any → rethink the verb/control, not the art.**

> ### Gate 1 — Vertical slice · the "aha" · ~2–3 weeks
> **Build:** branching graph + junction trade-offs (§6); flow continuity; radius profiles; **charge-and-release**; collateral + the **near-miss beat** (Pillar B); the contrast moment; payoff card; diegetic captions; one decimated Z-Anatomy cold-open (skippable); **a first real Share card** (Pillar C — specced here, not deferred). Scenario from `brain-tumour.json`.
> **Not now:** other diseases, menus, accounts, full art, sound design.
> **The questions:** Do fresh players finish, **restate why targeted beats systemic — pointing to the in-play moment, not the end card** — and smile at the release?
> **Pre-registered pass:** ~70% completion + ~70% comprehension *attributed to a play moment* across 5–8 testers. **This slice is the awareness MVP.**

> ### Gate 2 — Ship-ready · polish + the share engine + ride any wave · ~2–4 weeks
> **Build:** calm Osmos-grade art; cold-open cinematic; full **feel pass** (haptics, audio cues, blob juice); accessibility (colourblind shapes, reduced-motion, one-hand, skip); the **personal, beautiful Share card with OG image** (Pillar C, finished); analytics (completion / "did this make sense?" tap / **shares**); mobile perf pass (instancing, culling, LOD); hosting + domain.
> **The questions:** 60 fps on a mid phone? Do **strangers actually share it**?
> **Pre-registered pass:** stable 60 fps mid phone + bundle in budget + Lighthouse pass + **measurable share rate** + positive comprehension. → launch.
> *Note: the product must be shareable on its own merits. Any creator/Veritasium momentum is **upside, not plan** — don't bank the launch on a wave you don't control.*

> ### Gate 3 — Breadth + credibility + grant · after a launch signal
> **Build:** `stroke.json` (clot-buster) + `infection.json` (antibiotic) — three scenarios from pure data; sourced "the real science" panel; EN/DE i18n; **accuracy review + sign-off with the ETH lab.**
> **Pass:** lab endorses accuracy; slice anchors an SNSF Agora bid (ETH PI as applicant).

> ### Gate 4 — Stretch · only with traction/funding
> WebGPU path; Gaussian-splat photoreal context; eMNS "hard mode" (multi-coil); citizen-science layer *if* a partner has a real task; classroom edition.

---

## 10. Testing & validation

- **Sim unit tests (Vitest):** deterministic trajectories; flow continuity (`v∝1/r²`); wall clamping; junction selection; release/collateral logic.
- **Tuning harness:** headless sweep over `k`, viscosity, flow `Q`, falloff, **and the control-curve shape** — record *time-to-target* and *control margin* to find the fun band. (Determinism is what makes this possible.)
- **Feel testing (new):** on-device, in-hand, on a real mid phone from Gate 0 — feel and control failures are invisible in a desktop greybox.
- **Comprehension protocol:** the unprompted restate question + "where did you get it?" to confirm the lesson came from *play*, not the end card.
- **Smoke (Playwright):** loads, reaches release, payoff + share card show, no console errors; in CI.
- **Device matrix:** mid iPhone, mid Android, desktop Chrome/Safari/Firefox.
- **Scientific review checklist (Gate 3):** every on-screen claim → a source, signed off; "emerging / in animal trials" framing enforced.

---

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| **Overdamped verb feels mushy/inert** | `/feel` is first-class from Gate 0: control curve, lead, haptics; pre-registered "3 more runs" kill gate |
| **Lesson rides on captions, not the act** | Pillar B: near-miss + contrast moment; comprehension must attribute to a play moment |
| **Mobile control finicky (occlusion, 1/d⁴)** | Offset magnet; reshaped/clamped control response; test in-hand on a phone, not on desktop |
| **No stakes → walking sim** | Collateral bites immediately + one manufactured near-miss per run |
| **Share doesn't spread** | Share card specced at Gate 1, finished at Gate 2, with its own owner-metric |
| **Launch banks on an uncontrolled wave** | Standalone shareability; creator momentum is upside only |
| **React in the hot loop → jank** | §5 separation + no-`setState`-in-`useFrame` hard rule |
| **Asset/bundle bloat** | Decimate + Draco; lazy-load cold-open; procedural gameplay tubes |
| **Motion sickness** | Third-person eased follow; reduced-motion toggle; **skippable** endoscopic cold-open |
| **Determinism drift across devices** | Fixed timestep + pure `step()`; never tie physics to frame `dt` |
| **Scope creep toward "a real game"** | Anti-audience + each gate's single kill question; depth → explanation fidelity, not systems |
| **Tone misstep (cancer)** | Dignified framing reviewed against the touched-audience constraint; never "blast the tumour" |

---

## 12. Immediate next actions
1. Scaffold the repo (Vite + R3F + zustand + Vitest) with the `/sim /render /feel /ui /game` split.
2. Implement `VesselGraph` (single edge) + low-Re integrator + a Vitest trajectory test.
3. Wire `GameLoop` + grey tube + **offset** magnet control + follow camera + constant flow.
4. Add the **first feel pass** (control curve, blob lead, mobile haptic) and the ghost-pull hint.
5. Playtest Gate 0's **three** questions **on a real mid phone, in someone else's hand.** Pre-register the numbers. Decide go/no-go.

*The whole project is already de-risked behind one yes: is the verb fun and legible in a stranger's thumb? Everything else — the 3D body, the diseases, the grant — waits behind that.*

---
*Companion source files: `Lodestar-Prototype-Definition.md` (v0.1), `Lodestar-Technical-Roadmap.md` (v0.1), `Magnetic-Blob-Game-Feasibility-Proposal.md`.*
