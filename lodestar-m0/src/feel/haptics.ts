// Web haptics, honestly scoped. Android Chrome supports navigator.vibrate; iOS
// Safari effectively does NOT (no-op). So haptics are a progressive enhancement —
// the real "current pushing / pull caught" signal must live in the VISUAL layer.
// (See docs/research/game-feel-mobile-control.md.)

const supported = typeof navigator !== 'undefined' && 'vibrate' in navigator;
let enabled = true;

export function setHapticsEnabled(on: boolean) {
  enabled = on;
}

// discrete confirmation, e.g. "pull caught"
export function tick() {
  if (supported && enabled) navigator.vibrate(18);
}

// continuous-ish "you're losing to the current" — Android only; iOS gets nothing.
let lastBuzz = 0;
export function strain(intensity: number, nowMs: number) {
  if (!supported || !enabled) return;
  // throttle so we don't spam the motor; scale gap by how badly we're losing.
  if (nowMs - lastBuzz < 220) return;
  lastBuzz = nowMs;
  const on = Math.round(12 + intensity * 24);
  navigator.vibrate(on);
}
