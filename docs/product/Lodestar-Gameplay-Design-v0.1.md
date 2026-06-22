# Lodestar — Gameplay Design
### The verb, the level, the lesson · v0.1 · June 2026
*Companion to `Lodestar-Roadmap-v0.2.md`. The roadmap says what to build and in what order; this says **how the moment-to-moment play works**. Where the roadmap left gameplay as "Pillar A + §6," this fills it in. Synthesised from a 5-lens design fan-out (core verb · junctions · release/collateral · stakes/pacing · level layout).*

---

## 0. The spine: one gesture, three moments

The single idea everything hangs on: **the verb and the lesson are the same physical act** — *hold the blob steady against a pulsatile current with the external magnet* — performed three times with different outcomes.

| Moment | The same "hold station" gesture, but… | What it teaches |
|---|---|---|
| **Steering** the tree | held *while moving*, fighting flow off your line | the verb is real — a tug-of-war, not a cursor |
| **Clean release** on the tumour | held *perfectly* ~1.6 s in the calm distal bed → drug delivers | precision is possible *here* |
| **Collateral dump** | the *same* hold, broken by a current surge in the wrong place → drug releases where you sit | targeted > systemic, **by your own hand** |

The mechanical rule that makes the lesson land without a caption: **heat, once charged, has to go somewhere.** Charge is the AC-hyperthermia fiction made tactile; once you've heated the particle, imprecision means it releases into healthy tissue. That single rule *is* the chemo-vs-targeted argument.

> Design test for every feature: does it serve the spine? If it adds a *system* rather than deepening *this one gesture*, it's scope creep — cut it.

---

## 1. Layer 1 — the verb (feel-first; this is the Gate-0 kill test)

The diagnosis behind "the feel is off": the magnet currently out-muscles the current ~5–15×, so the blob glues to the cursor — exactly the "blob chases my finger" wrong-expectation. Flow is constant (no pulse) and authority is instantaneous (no catch). Four mechanisms fix it, in priority order:

1. **Radial flow profile (Poiseuille).** Flow is fastest at the lumen centre, ~zero at the wall. *Highest-leverage change* — it turns "drag cursor" into a tactic: **hug the inside wall to dodge the rush.** The vessel gains a skill gradient *across* its cross-section, not just along it.
2. **Pulsatile flow as a mechanic.** `Q(t) = Q₀·(1 + A·pulse(phase))`, an **asymmetric systolic spike** (fast rise, slow decay — *not* a sine), A≈0.6, ~67 bpm, driven by accumulated **sim** time so it stays deterministic. The skill becomes **advance on diastole, survive systole** — a rhythm you read. This is also what finally makes the haptics fire (a thump per beat at peak strain).
3. **Authority rebalance.** Target: peak magnet velocity ≈ **1.3–1.6× peak systolic flow at the stenosis centre**. Lower `maxPull`, steepen `controlExponent` (pull becomes *local* — you can't park far and coast), shrink the deadzone (kill the glued-to-cursor band). This ratio *is* the game.
4. **The "grab."** A one-pole lag on applied pull magnitude (τ≈0.12 s) so authority ramps in over ~120 ms — it *catches* rather than teleports. Generalise the existing constant lead into a flow-scaled upstream lead so the control itself teaches anticipation.

**Hard "do not": never add blob inertia/momentum.** Overdamped is the correct, teachable, science-backed regime. Weight comes from drag tension + pulse rhythm — mass would break determinism *and* make the precision release a slippery overshoot.

*Owner-metric (from roadmap Pillar A):* a measurable **control margin** — can a fresh player hold the blob in a zone the systolic current is actively pushing it out of? — and "3 more runs?" ≥ 60% in-hand on a real phone.

---

## 2. Layer 2 — junctions as decisions

A fork is gameplay only if the player can **read the trade-off before committing and feel responsible for the outcome.**

- **Readable upstream (~1.5–2 s of approach):** the drifting blood cells already encode current — at a fork, make one branch's cells *rush and streak* and the other's *drift lazily*. Plus honest lumen width (narrow = fast/hard, wide = forgiving) and a faint warmth-haze biased toward the correct *region* (never the exact edge — that's a rail).
- **Commitment is steered, not buttoned.** The integrator picks the outgoing edge by best-tangent-match, so **you commit by aiming your approach angle** with the magnet — the route choice *is* the verb. A capture-radius snap + a haptic `tick()` give the "click of commitment."
- **Soft-irreversible by flow, not by rule.** Once captured, the new branch's current carries you in; reversing means fighting upstream (hard, but never hard-locked). A real point-of-no-return *feel* with no game-over.
- **Cap at ≤4 junctions.** More turns reading-the-current from a pleasure into a chore.

**Failure mode to avoid: the maze** — choice-without-information, winnable only by die-learn-retry. Test every fork: *could a first-time player make a defensible choice from what's on screen right now?* If not, telegraph harder or cut it.

---

## 3. Layer 2 — release + collateral (Pillar B, the lesson-as-act)

**Charge-and-release, three simultaneous gates** on a `chargeLevel ∈ [0,1]` accumulator:
- **Proximity:** within `releaseRadius` (~0.6 lumen-radii) of the target `s`; outside, charge bleeds at 2×/s.
- **Steadiness:** charge only accrues while `|v_blob| < holdThreshold` (~0.25 world/s) — i.e. while you're *actively countering the current*. The lesson-moment reuses the verb.
- **Hold:** `chargeLevel += dt / chargeTime`, `chargeTime ≈ 1.6 s`.

**No release button.** Release auto-fires at full charge. **Failure = breaking a gate mid-charge:** if `chargeLevel > 0.3` and you're *not* on the tumour, the drug **dumps where you are** — heat's already triggered, it goes somewhere. That dump is the collateral.

**The collateral near-miss beat (manufactured situation, player-authored outcome):** site it at the main junction, where a **systolic surge** (the heartbeat tool) physically shoves *every* player toward the fast, tempting *wrong* branch that runs past a healthy-tissue zone. The geometry guarantees the tension; the player's skill decides whether they graze (healthy cells *wilt* — darken, recoil, desaturate; recoverable, never a corpse-pile) or hold the line. Seconds later, the *identical* hold in the calm tumour bed releases clean. **Same gesture, opposite outcomes the player caused** — that's the felt contrast. Captions only *name* it afterward.

**Scoring — one number, revealed once, on the share card only** (never a live HUD counter, which would make it a score-chase): `cleanliness = targetDose / (targetDose + k·healthyDose)` → "Clean delivery / On target / Collateral dose." The run *always* completes; a messy near-miss is good pedagogy, not a fail. Pillar C does the motivational work a retention loop normally would.

---

## 4. Stakes & pacing (no game-over, anti-retention)

**One tension shape, one real peak — the release, not the navigation.** Navigation is rising action; the climax is the charge-and-hold against the strongest current of the run.

```
hook → take control (valley: feel competent first) → feel current (first rise)
   → collateral beat (teaching spike, then resolve) → the run (held-breath plateau)
   → DELIVER (the one peak) → payoff (catharsis, tension floors out)
```

**Stakes without death** come from precision + visible bodily consequence + a social share-stake:
- visible healthy-tissue harm bites *immediately* but is recoverable;
- the shareable clean-delivery rating is the stake players self-impose;
- the current itself is the soft-fail enforcer — slip and you fight back upstream (costs effort/time-in-tension, never the run).

**The heartbeat is the pacing instrument:** calm BPM early; climbing toward the target (which *mechanically* strengthens the systolic surge and shortens diastolic rest); a hard surge that manufactures the near-miss; and a **cut-to-silence at release** before a calm rhythm over the shrinking tumour.

**Forgiving ≠ toothless:** teeth come from *spatial precision under a real current with visible consequence*, not speed/reflex/death — gentle to the player, merciless about the lesson.

---

## 5. The breast-cancer level (`breast-tumour.json`)

Tumour in the **upper-outer quadrant** (~50% of cases) — genuinely *lateral-thoracic-supplied*, so the gameplay-correct branch is also the anatomically-correct one. Catheter drop-off at the subclavian/proximal axillary (credible magnetic-steering entry; you don't gradient-pull through the high-flow ascending aorta — that's the science check's near-fatal framing).

```
subclavian/axillary (e0 · trunk · fast · hard pulsatile fight)
        │
      ┌─ J1 ─┐
      │      │
 internal    lateral thoracic (e2 · narrower, tortuous, CALMER · CORRECT)
 thoracic    │
 (e1 · wide, ├─ post. intercostal perforator (e5 · DEAD-END, looks inviting, blind)
 fast,       │
 TEMPTING,   └─ lateral mammary perforator (e3) → neovasculature (e4) → TUMOUR
 past healthy)
```

- **Flow gradient (the difficulty arc):** mean speed ~**0.90 → 0.45 → 0.22 → 0.08** as Q splits at each fork (total cross-section grows downstream — real physiology). Hardest at the trunk, calmest at the release. Pulse amplitude tapers downstream too (trunk throbs hard, tumour bed barely).
- **Beats mapped to anatomy:** *feel the current* on e0 → *the junction* at J1 (tempting medial vs correct lateral) → *collateral beat* in the healthy chest-wall/skin-perforator zone on early e1 → *the run* e2→J2→e3, with the e5 dead-end punishing non-anticipation → *deliver* in the e4 neovascular bed.
- **The tumour announces itself by shape + motion (colourblind-safe):** tortuous wobbling caliber, erratic swirling/eddying flow, **cells leaking out through the wall (extravasation — a motion signature nothing else has)**, and an *arrhythmic* wall throb.

---

## 6. Guardrails

**Science (for the eventual ETH sign-off):**
- The single "axillary bifurcation" J1 is an abstraction — the internal thoracic actually arises off the subclavian *proximally* (two serial take-offs). Acceptable for one clear decision point; flag it.
- Breast has rich medial↔lateral anastomoses, so frame the wrong branch as **"longer / collateral-risk," not "can't reach the tumour."**
- Breast is the *right* pivot off the roadmap's brain tumour (no blood–brain barrier; accessible, lower-flow). Keep **"emerging / animal-stage"** framing throughout.

**Tone (non-negotiable):** the tumour **shrinks, quiets, recedes** — never explodes. No blast / fireball / boom / screen-shake-kill. Verbs are *deliver / dissolve / shrink*, never *destroy / nuke*. Magnetic hyperthermia is gentle heat, not a bomb — and the cancer-touched audience must see hope and precision, not violence done to a body.

**Scope:** no procedural maps, no unlocks/currencies/lives, no live score meter. Variety comes from the same authored tree read differently + pulse-phase texture. Layer 2 adds `healthyZone` and dead-end/`terminal` flags to the `VesselEdge`/`Scenario` model (today's graph is single-edge).

---

## 7. Build order

1. **Layer 1 (now):** the four feel mechanisms in `flow.ts` / `field.ts` / `config.ts` / `integrator.ts` + heartbeat hookup in the render loop. This is the kill gate — nothing in Layer 2 is worth building on a mushy verb.
2. **Gate-0 in-hand playtest** on a real mid phone: control margin + "3 more runs?" ≥ 60%.
3. **Layer 2:** branching graph + junction selection + `breast-tumour.json` + the `healthyZone`/dead-end model, then charge-release + collateral.
</content>
</invoke>
