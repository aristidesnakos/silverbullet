# Research — Game-Feel & Mobile-Control Prior Art
### De-risking the two thin spots before M0 · June 2026

> ⚠️ The **haptics** findings are confirmed against MDN (Vibration API) and Apple Developer docs. The **game-feel / touch-UX** sections rest on established design literature (Swink's *Game Feel*; Osmos/flOw/Flower postmortems; Vogel & Baudisch's *Shift*) recalled rather than freshly fetched — re-verify before quoting. Live web search was unavailable this run.

## Thin spot 1 — make overdamped drift feel ALIVE, not mushy
**Core insight:** Osmos, flOw, and Flower keep slow/momentumless motion from feeling like molasses by **never letting the screen be still or silent in response to input.** The blob's velocity is honest physics; *everything decorating it* responds instantly with anticipation. The fun lives in the **feedback layer, not the simulation layer** — which is exactly what keeps the science honest. The failure mode is *perceived input latency* (you act, the slow blob visibly does nothing for ~200ms). Every technique attacks that gap without adding inertia.

**Ranked shortlist to prototype in M0:**
1. **Instant "intent" layer that leads the blob.** Magnet, blob aura/halo, and field lines snap to the finger with **zero damping** even though the blob crawls (Osmos fires the jet instantly though the mote barely moves). Player reads "the system heard me" in <16ms and forgives the slow body. **Highest leverage — build first.**
2. **Velocity-proportional deformation + trail.** Squash/stretch the blob 5–15% along its travel vector + a comet-tail of particles. Physically honest (a real low-Re blob deforms), converts "barely moving" into "moving with effort." No fake inertia.
3. **Continuously flowing field/current visualization.** Advecting blood-cell streaklines past the blob + live field lines bending toward the magnet. Drift now reads as *being carried by a force you negotiate with*. The contrast between downstream particles and your upstream progress *is* the emotional read of the verb.
4. **Nonlinear pull response curve (gentle near-target, firm at distance).** Pure linear feels mushy near the goal where correction force fades. An ease/deadzone-then-gain curve gives crisp precision near the blob without overpowering the flow far away. **Primary feel knob — A/B 3–4 curves.**
5. **Effort swell ported to visuals (ships sound-off).** Field-line density / aura brightness / edge vignette intensifies when pulling hard against strong flow — a continuous "I'm working / I'm winning" analog a position readout can't give.

**Cross-cutting rule:** add feel only to *reactive decoration that can be instant* (aura, deformation, particles, field lines, swell). **Never** add it to the blob's position integration — that preserves low-Reynolds honesty while killing the latency feel.

## Thin spot 2 — junction UX on mobile, one-handed, under current
**Touch patterns (anti-occlusion):**
1. **Offset/indirect control — blob leads ~1–1.5 cm above the finger** (the *Shift* / offset-cursor pattern). Thumb never sits on the decision; occlusion is worst at the bottom of the screen for thumb play, so a consistent upward offset is essential. Make the offset **visible** (a tether line) so it's learnable.
2. **Author the junction in the readable upper-middle third.** Let the current carry the blob up into a clear band; the hand stays low. A free level-design fix that removes most fumble risk.
3. **Lean-and-commit fork assist.** As the blob nears the fork, softly attract toward the leaned-to branch; once past the carina, lightly commit so the current can't yank it back. Converts a precision maneuver into a readable lean-and-confirm (like racing-game lane-change snapping). Telegraph early (both branches pulse, the favored one brightens).
4. **Early, large, low-stress affordance.** Show the bifurcation well before arrival. The blob's *slowness is the advantage here* — a long runway to read and adjust. Lean into slowness as the feature.

**Web mobile haptics — honest 2026 status (confirmed):**
- **Android Chrome: works.** `navigator.vibrate(pattern)` supported; needs sticky user-activation; fails silently if unsupported; suppressed in Silent/DND.
- **iOS Safari: effectively none.** MDN marks Vibration API "Limited availability — not Baseline" because it does **not** work in iOS Safari; Apple exposes no WebKit haptic API. `navigator.vibrate` is a no-op on iOS. The one vector (verify before relying): a native-styled `<input type="checkbox" switch>` toggle triggers a *single fixed system tick* — discrete confirmation only, never continuous. Real iOS haptics = native wrapper (Capacitor), out of scope for web M0.
- **Use it as:** "pull caught" = one short Android pulse `vibrate(20)` (+ visual flash/aura snap that carries it on iOS); "current pushing" = Android-only patterned rumble `vibrate([30,120])` scaled by how badly you're losing (**iOS must read this fully from the visual swell — build the visual version first**). Gate behind a first-tap activation check + `'vibrate' in navigator` test + a settings toggle.
- **Bottom line:** primary "current pushing" / "pull caught" feedback lives in the **visual layer**; haptics are a progressive enhancement (two-state on Android, one tick at best on iOS).

## What to build first in M0 (consolidated)
1. Instant intent layer (magnet + aura + field lines snap to finger, zero damping).
2. Offset control with a visible tether + first junction in the upper-middle third.
3. Velocity-deformation + flow-particle field.
4. Lean-and-commit fork assist.
5. Tunable nonlinear pull curve (the main feel knob — A/B 3–4).

## References (re-verify the design ones; haptics confirmed)
MDN Vibration API `developer.mozilla.org/en-US/docs/Web/API/Vibration_API` · MDN Navigator.vibrate · Apple Developer WebKit / Playing Haptics · Swink *Game Feel* · Vogel & Baudisch *Shift* · Osmos / flOw / Flower postmortems.
