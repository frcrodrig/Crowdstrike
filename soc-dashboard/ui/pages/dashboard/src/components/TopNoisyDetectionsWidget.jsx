import React from 'react';

function colorFor(pct) {
  if (pct >= 40) return '#FF1744';
  if (pct >= 20) return '#FF6B35';
  if (pct >= 10) return '#FFA726';
  return '#4FC3F7';
}

const TopNoisyDetectionsWidget = ({ data }) => {
  const items = Array.isArray(data) ? data : [];
  const max = items.reduce((m, r) => Math.max(m, r.count || 0), 0);
  const total = items.reduce((s, r) => s + (r.count || 0), 0);

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      padding: '6px 10px', gap: 6,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'
      }}>
        <div style={{
          fontSize: 9, color: 'var(--text-muted)',
          letterSpacing: 1, textTransform: 'uppercase'
        }}>
          Top Noisy Detections · 7D
        </div>
        <div style={{ fontSize: 10, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
          {total.toLocaleString()} events
        </div>
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column', gap: 4,
        flex: 1, minHeight: 0, overflow: 'hidden',
      }}>
        {items.length === 0 && (
          <div style={{ fontSize: 10, color: '#64748b', textAlign: 'center', marginTop: 12 }}>
            No detection-name data available
          </div>
        )}
        {items.map((row, i) => {
          const pct = max > 0 ? (row.count / max) * 100 : 0;
          const color = colorFor((row.count / (total || 1)) * 100);
          const label = row.name.length > 42 ? row.name.slice(0, 39) + '…' : row.name;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 10, color: '#cbd5e1',
              }}>
                <span title={row.name} style={{
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                }}>
                  {label}
                </span>
                <span style={{ color, fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginLeft: 8 }}>
                  {row.count.toLocaleString()}
                </span>
              </div>
              <div style={{
                height: 4, background: '#1e293b', borderRadius: 2, overflow: 'hidden'
              }}>
                <div style={{
                  width: `${pct}%`, height: '100%', background: color,
                  boxShadow: `0 0 6px ${color}66`,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export { TopNoisyDetectionsWidget };
