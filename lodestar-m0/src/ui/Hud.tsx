// Minimal greybox HUD. Reads the low-freq store only — never the sim directly.
// Just enough to read the verb: how far you've gotten, and whether you're winning
// the fight against the current (the "control margin" the tuning harness cares about).

import { useHud, resetEngine } from '../game/engine';
import { setHapticsEnabled } from '../feel/haptics';
import { useState } from 'react';

export function Hud() {
  const upstream = useHud((s) => s.upstreamProgress);
  const s = useHud((s) => s.s);
  const delivered = useHud((s) => s.delivered);
  const cleanliness = useHud((s) => s.cleanliness);
  const healthyDose = useHud((s) => s.healthyDose);
  const [haptics, setHaptics] = useState(true);

  const winning = upstream > 0.05;
  const margin = Math.max(-1, Math.min(1, upstream));
  const reached = s > 0.95;

  // The run is over — reveal the cleanliness card instead of the steering UI. This is
  // the ONE place the score appears (never a live counter): a reveal, not a high-score.
  if (delivered) return <EndCard cleanliness={cleanliness} healthyDose={healthyDose} />;

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

// The end card: shown once the drug delivers. Reveals the cleanliness rating and names
// the lesson — targeted, by the player's own hand — without lecturing. Hopeful, gentle:
// the tumour quiets; collateral (if any) is acknowledged softly, never as a failure.
function EndCard({ cleanliness, healthyDose }: { cleanliness: number; healthyDose: number }) {
  const rating =
    cleanliness >= 0.95
      ? 'Clean delivery · on target'
      : cleanliness >= 0.7
        ? 'On target · minor collateral'
        : 'Delivered · with collateral dose';

  // The spine, said plainly. Clean runs lean fully into precision; messier runs own the
  // cost without scolding — the contrast itself is the teaching.
  const lesson =
    healthyDose > 0
      ? 'Targeted — by your hand. A little reached healthy tissue; the rest went where it was needed, not flushed through the whole body.'
      : 'Targeted — by your hand. Delivered to the tumour alone, not flushed through the whole body.';

  return (
    <div style={cardOverlay}>
      <div style={card}>
        <div style={cardKicker}>The tumour quiets</div>
        <h1 style={cardTitle}>Delivered.</h1>
        <div style={cardRating}>{rating}</div>
        <p style={cardLesson}>{lesson}</p>
        <button style={cardBtn} onClick={() => resetEngine()}>
          Run it again
        </button>
      </div>
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

// --- end card ---
const cardOverlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 'calc(24px + env(safe-area-inset-top)) 20px calc(24px + env(safe-area-inset-bottom))',
  background: 'radial-gradient(120% 90% at 50% 40%, rgba(6,12,20,0.55), rgba(4,8,15,0.92))',
  color: '#eaf2f8',
  fontFamily: 'system-ui, sans-serif',
  userSelect: 'none',
  pointerEvents: 'auto',
  zIndex: 10,
};
const card: React.CSSProperties = {
  width: '100%',
  maxWidth: 360,
  textAlign: 'center',
  padding: '26px 22px',
  borderRadius: 18,
  background: 'rgba(10,18,28,0.72)',
  border: '1px solid rgba(127,200,255,0.18)',
  boxShadow: '0 18px 60px rgba(0,0,0,0.45)',
};
const cardKicker: React.CSSProperties = {
  fontSize: 12,
  letterSpacing: 2,
  textTransform: 'uppercase',
  color: '#7fc8ff',
  opacity: 0.8,
};
const cardTitle: React.CSSProperties = {
  margin: '8px 0 4px',
  fontSize: 34,
  fontWeight: 700,
  letterSpacing: 0.5,
  color: '#bfe6c9',
};
const cardRating: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: 0.4,
  color: '#eaf2f8',
  opacity: 0.92,
};
const cardLesson: React.CSSProperties = {
  margin: '16px auto 22px',
  fontSize: 14,
  lineHeight: 1.5,
  opacity: 0.8,
  maxWidth: 300,
};
const cardBtn: React.CSSProperties = {
  pointerEvents: 'auto',
  fontSize: 14,
  fontWeight: 600,
  padding: '11px 22px',
  borderRadius: 10,
  border: '1px solid rgba(127,200,255,0.35)',
  background: 'rgba(127,200,255,0.12)',
  color: '#eaf2f8',
  cursor: 'pointer',
};
