// Minimal greybox HUD. Reads the low-freq store only — never the sim directly.
// Just enough to read the verb: how far you've gotten, and whether you're winning
// the fight against the current (the "control margin" the tuning harness cares about).

import { useHud, resetEngine } from '../game/engine';
import { setHapticsEnabled } from '../feel/haptics';
import { useState } from 'react';

export function Hud() {
  const upstream = useHud((s) => s.upstreamProgress);
  const s = useHud((s) => s.s);
  const [haptics, setHaptics] = useState(true);

  const winning = upstream > 0.05;
  const margin = Math.max(-1, Math.min(1, upstream));
  const reached = s > 0.95;

  return (
    <div style={wrap}>
      <div style={topRow}>
        <strong style={{ letterSpacing: 1 }}>LODESTAR · M0 greybox</strong>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={btn}
            onClick={() => {
              const next = !haptics;
              setHaptics(next);
              setHapticsEnabled(next);
            }}
          >
            haptics: {haptics ? 'on' : 'off'}
          </button>
          <button style={btn} onClick={() => resetEngine()}>
            reset
          </button>
        </div>
      </div>

      <div style={hint}>
        Drag to place the magnet. Pull the blob <em>upstream</em> against the current.
      </div>

      {/* progress along the vessel */}
      <Meter label="progress" value={s} color="#ffb24d" />

      {/* control margin: are you beating the current? */}
      <Meter
        label={winning ? 'beating the current ▲' : 'losing to the current ▼'}
        value={(margin + 1) / 2}
        color={winning ? '#4ad991' : '#e0524a'}
        center
      />

      {reached && <div style={win}>✓ reached the far end — the verb carried you there</div>}
    </div>
  );
}

function Meter({
  label,
  value,
  color,
  center,
}: {
  label: string;
  value: number;
  color: string;
  center?: boolean;
}) {
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 3 }}>{label}</div>
      <div style={track}>
        <div
          style={{
            position: 'absolute',
            left: center ? '50%' : 0,
            width: center ? `${Math.abs(value - 0.5) * 100}%` : `${value * 100}%`,
            transform: center && value < 0.5 ? 'translateX(-100%)' : undefined,
            height: '100%',
            background: color,
            borderRadius: 4,
            transition: 'width 80ms linear',
          }}
        />
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = {
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  padding: '14px 16px calc(14px + env(safe-area-inset-bottom))',
  background: 'linear-gradient(to top, rgba(6,12,20,0.92), rgba(6,12,20,0))',
  color: '#eaf2f8',
  fontFamily: 'system-ui, sans-serif',
  userSelect: 'none',
  pointerEvents: 'none',
};
const topRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: 13,
  pointerEvents: 'auto',
};
const hint: React.CSSProperties = { fontSize: 12, opacity: 0.8, marginTop: 6 };
const track: React.CSSProperties = {
  position: 'relative',
  height: 8,
  borderRadius: 4,
  background: 'rgba(255,255,255,0.12)',
  overflow: 'hidden',
};
const btn: React.CSSProperties = {
  pointerEvents: 'auto',
  fontSize: 11,
  padding: '4px 8px',
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.25)',
  background: 'rgba(255,255,255,0.08)',
  color: '#eaf2f8',
  cursor: 'pointer',
};
const win: React.CSSProperties = {
  marginTop: 10,
  fontSize: 13,
  color: '#4ad991',
  fontWeight: 600,
};
