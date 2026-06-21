# Lodestar — M0 Verb Greybox

The real 3D engine with the art turned off. Its only job is to answer the kill-gate
question: **is steering the blob against the current fun and legible for ~60 seconds?**
Build beauty only after this is a yes. See `../docs/product/Lodestar-Roadmap-v0.2.md`.

## Run it
```bash
npm install      # already done once
npm run dev      # http://localhost:5173  — open on a phone via `npm run dev -- --host`
npm test         # pure-sim unit tests (deterministic, no DOM)
npm run build    # typecheck + production build
```
**Test it where it'll be played:** `npm run dev -- --host`, then open the Network URL on a real mid-range phone and drag with your thumb. Desktop will lie to you about feel.

## How it's wired (the three-layer separation)
```
src/sim/    PURE TypeScript, no three.js, deterministic step(state,input) — UNIT TESTED
src/render/ R3F components that READ sim state via refs each frame
src/feel/   haptics + (room for) deform/control-curve helpers — first-class, not polish
src/game/   engine.ts (sim singleton + low-freq HUD store) · GameLoop.tsx (the useFrame bridge)
src/ui/     Hud.tsx — reads the low-freq store only
```
**The one rule:** no `setState` in the frame loop. The sim lives in `engine.ts` outside
React; `GameLoop` advances it at a fixed 120 Hz and writes into three objects via refs;
React only hears about the world through `useHud` (~12 Hz).

## Where the fun-band knobs live
**`src/sim/config.ts` — `DEFAULT_CONFIG`.** This is the whole tuning surface. Sweep these
to find the fun band; touch nothing else:
- `inletFlow` — strength of the current you fight.
- `magnetStrength` (k) — your pull authority. The primary knob.
- `controlExponent` — effective falloff for FEEL. True physics is ~4 (1/d⁴); we start at
  2.2 so control is crisp instead of all-or-nothing. The *visualised* field still uses the
  true law (`field.ts → trueFieldFalloff`); only what MOVES the blob is reshaped.
- `controlDeadzone`, `maxPull` — keep the pull from snapping the blob to your finger.
- `mobility` (μ), `blobRadius`, `flowNoise`.

## What's real vs. stubbed (honest)
**Real:** pure deterministic sim (overdamped low-Re: `v = v_flow + μ·F_mag`); v∝1/r² flow
continuity with a visible stenosis; wall = clamp (no collision solver); varying-radius
translucent vessel; offset magnet control (magnet leads ~1.1u above the finger to dodge
thumb occlusion); ghost-pull line so the gradient pull is legible; instanced blood cells
drifting downstream as the current cue; velocity squash/stretch on the blob; eased
third-person follow camera; Android haptics with capability check; 6 passing unit tests.

**Stubbed / deliberately absent (later gates):** the charge-and-release mechanic; collateral
+ healthy zones; junctions/branching (the graph is single-edge but already shaped for it);
any art pass; sound; the cold-open; the share card. iOS Safari has effectively no web
haptics — the "current pushing" signal is carried by the visual layer on purpose.

## Watch in the first playtest (the known risks)
1. Does the offset distance feel right, or does the magnet feel disconnected? (`MAGNET_LEAD`
   in `GameLoop.tsx`, and the `controlExponent`/`deadzone` in config.)
2. Is the drift satisfying or mushy? If mushy, raise `magnetStrength` / lower `controlExponent`
   and lean harder on the deform + flow-particle feedback before adding anything.
3. Do people understand the blob doesn't chase their finger? (That's what the ghost line is for.)
