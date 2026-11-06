import React from 'react';

// Thresholds: >=15m yellow, >=30m orange, >=1h red, >=4h dark red; <15m green.
const BUCKETS = [
  { min: 240, color: '#991b1b', label: '>4h'  },
  { min:  60, color: '#dc2626', label: '>1h'  },
  { min:  30, color: '#f97316', label: '>30m' },
  { min:  15, color: '#eab308', label: '>15m' },
  { min:   0, color: '#22c55e', label: '<15m' },
];

function bucketFor(minutesAgo) {
  if (minutesAgo == null) return { color: '#525252', label: 'never' };
  for (const b of BUCKETS) if (minutesAgo >= b.min) return b;
  return BUCKETS[BUCKETS.length - 1];
}

function fmtAge(min) {
  if (min == null) return '—';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h < 24) return m ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

const FeedSilenceWidget = ({ data }) => {
  const items = Array.isArray(data) ? data : [];
  const alerting = items.filter(r => (r.minutesAgo ?? 1e9) >= 15).length;
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      padding: '6px 10px', gap: 6,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{
          fontSize: 9, color: 'var(--text-muted)',
          letterSpacing: 1, textTransform: 'uppercase'
        }}>
          3rd-Party Feed Silence
        </div>
        <div style={{
          fontSize: 10,
          color: alerting > 0 ? '#dc2626' : '#64748b',
          fontVariantNumeric: 'tabular-nums', fontWeight: 600,
        }}>
          {alerting} alerting · {items.length} feeds
        </div>
      </div>
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 3,
        flex: 1, minHeight: 0, overflowY: 'auto',
      }}>
        {items.length === 0 && (
          <div style={{ fontSize: 10, color: '#64748b', textAlign: 'center', marginTop: 12 }}>
            No 3rd-party feeds detected
          </div>
        )}
        {items.map((row, i) => {
          const b = bucketFor(row.minutesAgo);
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 10, color: '#cbd5e1',
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: b.color, boxShadow: `0 0 6px ${b.color}99`,
                flexShrink: 0,
              }} />
              <span
                title={row.vendor}
                style={{
                  flex: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
              >
                {row.vendor}
              </span>
              <span style={{
                color: b.color, fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                minWidth: 54, textAlign: 'right',
              }}>
                {fmtAge(row.minutesAgo)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export { FeedSilenceWidget };
