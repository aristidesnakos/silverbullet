# Lodestar — Planning Docs

A 3-minute web science-explainer game: drive a speck of magnetic medicine through the bloodstream against the current and release it on the tumour — feeling why targeted delivery beats poisoning the whole body. Web-first (React Three Fiber), solo + AI-assisted.

## Structure
- **`product/`** — vision, roadmap, and decision docs.
  - [`Lodestar-Roadmap-v0.2.md`](product/Lodestar-Roadmap-v0.2.md) — the live roadmap. Three pillars (Verb feels alive · Lesson is the act · Share is the growth engine), five gates with pre-registered pass/fail numbers. **Supersedes the v0.1 prototype + tech docs.**
  - [`Open-Questions-Go-No-Go-v0.1.md`](product/Open-Questions-Go-No-Go-v0.1.md) — what we decide ourselves vs. what needs others; "build then pitch" sequencing. **Verdict: start M0 now.**
- **`research/`** — de-risking briefings (⚠️ all produced with web access blocked → knowledge-based, flagged for live-source verification before anything ships).
  - [`science-sanity-check.md`](research/science-sanity-check.md) — premise is sound; **YELLOW** pending live verification of the ETH source. Soften "deep infection," treat brain-tumour as a long-term goal, frame everything "emerging / animal-stage."
  - [`ip-health-claim-triage.md`](research/ip-health-claim-triage.md) — **GREEN** overall. Explain the science freely; never reuse Veritasium assets/branding; Z-Anatomy SA does NOT infect your code; two YELLOW to-dos (real Z-Anatomy license check + "Lodestar" trademark search).
  - [`game-feel-mobile-control.md`](research/game-feel-mobile-control.md) — how to keep overdamped drift from feeling mushy (instant intent layer, deformation, flow viz, nonlinear pull curve) + mobile junction UX (offset control, lean-and-commit fork) + honest web-haptics status (Android works, iOS effectively none).

## Status (June 2026)
- Roadmap v0.2 + Go/No-Go: **done.** Verdict — start M0.
- Research streams (science / IP / game-feel): **done, knowledge-based** — re-run with web access to verify sources before on-screen claims.
- M0 greybox (`../lodestar-m0/`): **built and running.** Vite + R3F + zustand; the pure `sim/` core with 6 passing deterministic unit tests; offset magnet control, ghost-pull line, drifting blood cells, eased follow camera. `npm run dev` (add `-- --host` for phone). Build + tests green. Fun-band knobs in `src/sim/config.ts`.

## Next action
**Playtest M0 on a real mid phone** (`npm run dev -- --host`): is steering the blob against the current fun and legible for 60 seconds? Sweep `config.ts` for the fun band. Kill-or-continue per the Go/No-Go bar.
