// The breast-cancer level as pure data. Upper-outer-quadrant lesion (the most common
// site), which is genuinely lateral-thoracic-supplied — so the gameplay-correct branch
// is also the anatomically-correct one. Catheter drop-off at the subclavian/axillary,
// NOT the high-flow ascending aorta. Flow CALMS distally (Q splits at each fork: total
// cross-section grows downstream) so the run is a hard pulsatile fight up top and a calm
// precision bed at the tumour. See docs/product/Lodestar-Gameplay-Design-v0.1.md §5/§6.
//
// Frame: +x lateral, +y superior, play plane z=0.

import { compileScenario } from '../sim/scenario';
import type { ScenarioSpec } from '../sim/scenario';

export const BREAST_TUMOUR_SPEC: ScenarioSpec = {
  nodes: [
    { id: 'n_inlet', pos: [-7, 4, 0] }, // subclavian — catheter drop-off
    { id: 'n_J1', pos: [0, 3.5, 0] }, // axillary bifurcation — THE junction
    { id: 'n_medEnd', pos: [-3, -3, 0] }, // medial / chest-wall terminus
    { id: 'n_J2', pos: [3, 0.5, 0] }, // lateral split
    { id: 'n_dead', pos: [1.5, 2.5, 0] }, // blind take-off
    { id: 'n_J3', pos: [4, -1.5, 0] }, // tumour feeder
    { id: 'n_tumour', pos: [4.5, -2.5, 0] }, // upper-outer-quadrant lesion
  ],
  edges: [
    // trunk: wide, fast, big throb — establishes the fight.
    {
      id: 'e0',
      from: 'n_inlet',
      to: 'n_J1',
      points: [[-7, 4, 0], [-3.5, 4.2, 0], [0, 3.5, 0]],
      radius: { base: 1.0, taperTo: 0.9 },
      flowQ: 1.41,
      pulseScale: 1.0,
    },
    // internal thoracic — TEMPTING wrong branch: wide & fast, but threads past healthy
    // chest-wall tissue and dead-ends medially (anastomotic, "longer/collateral-risk",
    // not literally unreachable — see the ETH sign-off note in the design doc).
    // TODO(tuning): as currently aimed, the natural heading at J1 favours e2 (correct),
    // so e1 doesn't yet feel like the seductive default the design intends. Re-aim the
    // e0→J1 approach and/or e1's entry tangent so reflex drifts you toward e1 and the
    // CORRECT path (e2) rewards anticipation. Do this alongside the near-miss surge
    // (Layer-2 part B) and verify in-hand. (Found by junction-traversal testing.)
    {
      id: 'e1',
      from: 'n_J1',
      to: 'n_medEnd',
      points: [[0, 3.5, 0], [-1.5, 0.5, 0], [-3, -3, 0]],
      radius: { base: 0.85, taperTo: 0.6 },
      flowQ: 0.9,
      pulseScale: 0.9,
      healthyZones: [{ sRange: [0.1, 0.45], tissue: 'chest-wall / skin perforator' }],
    },
    // lateral thoracic — the CORRECT branch: narrower, tortuous, but immediately calmer.
    {
      id: 'e2',
      from: 'n_J1',
      to: 'n_J2',
      points: [[0, 3.5, 0], [2, 2, 0], [3, 0.5, 0]],
      radius: { base: 0.6, taperTo: 0.5 },
      flowQ: 0.25,
      pulseScale: 0.6,
    },
    // lateral mammary perforator → toward the feeder.
    {
      id: 'e3',
      from: 'n_J2',
      to: 'n_J3',
      points: [[3, 0.5, 0], [3.6, -0.5, 0], [4, -1.5, 0]],
      radius: { base: 0.4, taperTo: 0.34 },
      flowQ: 0.055,
      pulseScale: 0.4,
    },
    // posterior intercostal perforator — DEAD-END: looks inviting, ends blind. Backing
    // out means fighting upstream (the hardest thing in the game). Teaches anticipation.
    {
      id: 'e5',
      from: 'n_J2',
      to: 'n_dead',
      points: [[3, 0.5, 0], [2.2, 1.5, 0], [1.5, 2.5, 0]],
      radius: { base: 0.5, taperTo: 0.4 },
      flowQ: 0.12,
      pulseScale: 0.5,
    },
    // tumour neovasculature — chaotic caliber (wobble), barely pulses, calm: the release
    // bed. Render gives it the leaky/arrhythmic tells; here it's just the target geometry.
    {
      id: 'e4',
      from: 'n_J3',
      to: 'n_tumour',
      points: [[4, -1.5, 0], [4.3, -2.0, 0], [4.5, -2.5, 0]],
      radius: { base: 0.3, wobbleAmp: 0.1, wobbleFreq: 6 },
      flowQ: 0.011,
      pulseScale: 0.15,
      tumour: true,
    },
  ],
  startEdge: 'e0',
  target: { edgeId: 'e4', s: 0.6, kind: 'tumour' },
  payloadLabel: 'doxorubicin-loaded SPION',
};

export const breastTumourScenario = compileScenario(BREAST_TUMOUR_SPEC);
