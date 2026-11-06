import React from 'react';

function colorFor(ratePct) {
  if (ratePct >= 40) return '#FF1744';
  if (ratePct >= 20) return '#FFA726';
  if (ratePct >= 10) return '#4FC3F7';
  return '#00FF88';
}

function statusFor(ratePct) {
  if (ratePct >= 40) return 'NOISY';
  if (ratePct >= 20) return 'HIGH';
  if (ratePct >= 10) return 'ACCEPTABLE';
  return 'TUNED';
}

const FPRateWidget = ({ data }) => {
  const week = data?.week ?? { fp: 0, tp: 0, ratePct: 0 };
  const total = week.fp + week.tp;
  const rate = week.ratePct;
  const color = colorFor(rate);
  const status = statusFor(rate);

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      padding: '6px 10px', gap: 6,
    }}>
      <div style={{
        fontSize: 9, color: 'var(--text-muted)',
        letterSpacing: 1, textTransform: 'uppercase'
      }}>
        False Positive Rate · 7D
      </div>
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}>
        <div style={{
          fontSize: 48, fontWeight: 700, fontFamily: 'Orbitron, monospace',
          color, lineHeight: 1, textShadow: `0 0 14px ${color}66`,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {rate.toFixed(1)}%
        </div>
        <div style={{ fontSize: 12, color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ color: '#64748b' }}>FP </span>{week.fp.toLocaleString()}
          <span style={{ color: '#334155', margin: '0 6px' }}>·</span>
          <span style={{ color: '#64748b' }}>TP </span>{week.tp.toLocaleString()}
        </div>
        <div style={{ fontSize: 10, color: '#64748b' }}>
          total {total.toLocaleString()}
        </div>
      </div>
      <div style={{
        alignSelf: 'center',
        padding: '3px 12px',
        fontSize: 10, fontWeight: 600,
        letterSpacing: 0.5,
        color,
        border: `1px solid ${color}66`,
        background: `${color}1a`,
        borderRadius: 4,
      }}>
        {status}
      </div>
    </div>
  );
};

export { FPRateWidget };
