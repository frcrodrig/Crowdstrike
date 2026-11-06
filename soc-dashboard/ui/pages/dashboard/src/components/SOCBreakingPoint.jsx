import React from 'react';

const SOCBreakingPoint = ({ received = 0, resolved = 0 }) => {
  const backlogDelta = received - resolved;

  let loadPct;
  let status;
  let statusColor;

  if (received === 0 && resolved === 0) {
    loadPct = 0;
    status = 'IDLE';
    statusColor = '#64748b';
  } else if (resolved === 0) {
    loadPct = 999;
    status = 'BREAKING POINT';
    statusColor = '#FF1744';
  } else {
    loadPct = (received / resolved) * 100;
    if (loadPct >= 200)      { status = 'BREAKING POINT'; statusColor = '#FF1744'; }
    else if (loadPct >= 150) { status = 'CRITICAL';       statusColor = '#FF6B35'; }
    else if (loadPct >= 100) { status = 'OVER CAPACITY';  statusColor = '#FFA726'; }
    else if (loadPct >= 80)  { status = 'KEEPING UP';     statusColor = '#4FC3F7'; }
    else                     { status = 'DRAINING';       statusColor = '#00FF88'; }
  }

  const displayPct = Math.min(999, loadPct);
  const pulse = loadPct >= 100;

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '6px 10px', position: 'relative', gap: 6
    }}>
      <div style={{
        fontSize: '9px', color: 'var(--text-muted)',
        letterSpacing: '1px', textTransform: 'uppercase'
      }}>
        Received / Resolved · 24H
      </div>

      <div style={{
        fontSize: '42px', fontWeight: '700',
        fontFamily: 'Orbitron, monospace',
        color: statusColor,
        textShadow: `0 0 15px ${statusColor}`,
        lineHeight: 1,
        animation: pulse ? 'pulse 2s infinite' : 'none'
      }}>
        {displayPct.toFixed(0)}%
      </div>

      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 10,
        fontSize: 11, color: '#cbd5e1'
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ color: '#64748b', fontSize: 9, letterSpacing: 0.5 }}>IN</span>
          <span style={{ fontWeight: 600, color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
            {received.toLocaleString()}
          </span>
        </div>
        <span style={{ color: '#334155' }}>·</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ color: '#64748b', fontSize: 9, letterSpacing: 0.5 }}>OUT</span>
          <span style={{ fontWeight: 600, color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
            {resolved.toLocaleString()}
          </span>
        </div>
      </div>

      <div style={{
        padding: '3px 10px',
        fontSize: '9px', fontWeight: '600',
        letterSpacing: '0.5px',
        color: statusColor,
        border: `1px solid ${statusColor}66`,
        background: `${statusColor}1a`,
        borderRadius: '4px'
      }}>
        {status}{backlogDelta > 0 ? ` · +${backlogDelta.toLocaleString()} backlog` : backlogDelta < 0 ? ` · ${backlogDelta.toLocaleString()} backlog` : ''}
      </div>

      <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.65; } }`}</style>
    </div>
  );
};

export { SOCBreakingPoint };
