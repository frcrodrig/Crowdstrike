import React, { useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';

export const WorkflowExecutionsWidget = ({ trendData, approvalPending }) => {
  const maxExecutions = trendData && trendData.length > 0 ? Math.max(...trendData.map(d => d.executions)) : 100;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px' }}>
      {/* Execution Trend Title */}
      <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
        Execution Trend (24H)
      </div>

      {/* Trend sparkline */}
      <div style={{
        padding: '12px',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.05)'
      }}>
        <svg width="100%" height="60" viewBox="0 0 280 60" style={{ display: 'block' }}>
          {/* Grid lines */}
          <line x1="0" y1="15" x2="280" y2="15" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          <line x1="0" y1="30" x2="280" y2="30" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          <line x1="0" y1="45" x2="280" y2="45" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

          {/* Trend line */}
          {trendData && trendData.length > 0 && (
            <>
              <polyline
                points={trendData.map((d, i) => {
                  const x = (i / (trendData.length - 1)) * 280;
                  const y = 60 - ((d.executions / maxExecutions) * 50);
                  return `${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.8"
              />
              {/* Data points */}
              {trendData.map((d, i) => {
                const x = (i / (trendData.length - 1)) * 280;
                const y = 60 - ((d.executions / maxExecutions) * 50);
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="3"
                    fill="#10b981"
                    opacity="0.8"
                  />
                );
              })}
            </>
          )}
        </svg>

        {/* Stats */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Total</span>
            <span style={{ fontSize: '16px', color: '#10b981', fontWeight: '700' }}>
              {trendData ? trendData.reduce((sum, d) => sum + d.executions, 0) : 0}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Avg/Hour</span>
            <span style={{ fontSize: '16px', color: '#00E5FF', fontWeight: '700' }}>
              {trendData ? (trendData.reduce((sum, d) => sum + d.executions, 0) / trendData.length).toFixed(0) : 0}
            </span>
          </div>
        </div>
      </div>

      {/* Approval Pending Alert */}
      {approvalPending && approvalPending > 0 && (
        <div style={{
          padding: '10px 12px',
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '6px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          animation: 'pulse-gentle 3s ease-in-out infinite'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>⏸</span>
            <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '600' }}>Approval Pending</span>
          </div>
          <span style={{ fontSize: '18px', color: '#f59e0b', fontWeight: '700' }}>{approvalPending}</span>
        </div>
      )}

      <style>{`
        @keyframes pulse-gentle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>

      {/* Recent executions list */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
          Recent Activity
        </div>
        {trendData && trendData.slice(-5).reverse().map((item, idx) => (
          <div key={idx} style={{
            padding: '6px 10px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderLeft: `2px solid ${item.executions > 30 ? '#10b981' : '#f59e0b'}`
          }}>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{item.hour}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: '600' }}>
              {item.executions} executions
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AgentHealthWidget = ({ statusData, platformData, versionData }) => {
  const hasStatus = statusData && statusData.length > 0;
  const hasPlatform = platformData && platformData.length > 0;
  // Real soc_agent_version query groups by `AgentVersion`; mock data uses `version`.
  const hasVersion = versionData && versionData.length > 0;

  const total = hasStatus ? statusData.reduce((s, i) => s + (i.count || 0), 0) : 0;
  const maxPlatform = hasPlatform ? Math.max(...platformData.map(i => i.count || 0)) : 1;
  const maxVersion  = hasVersion  ? Math.max(...versionData.map(i => i.count || 0))  : 1;

  const statusColor = s =>
    s === 'Online' ? '#10b981' : s === 'Offline' ? '#ef4444' : '#f59e0b';

  if (!hasStatus && !hasPlatform && !hasVersion) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        No agent data
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 10px', overflowY: 'auto' }}>

      {/* Total */}
      {total > 0 && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <span style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1 }}>
            {total.toLocaleString()}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            total devices
          </span>
        </div>
      )}

      {/* Status — 3 inline badges */}
      {hasStatus && (
        <div style={{ display: 'flex', gap: '6px' }}>
          {statusData.map((item, idx) => (
            <div key={idx} style={{
              flex: 1, textAlign: 'center', padding: '6px 4px',
              background: `${statusColor(item.status)}18`,
              borderRadius: '6px',
              border: `1px solid ${statusColor(item.status)}50`
            }}>
              <div style={{ fontSize: '17px', fontWeight: '700', color: statusColor(item.status), lineHeight: 1.1 }}>
                {(item.count || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>
                {item.status}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Platform + Version side-by-side */}
      <div style={{ display: 'flex', gap: '10px', flex: 1 }}>

        {hasPlatform && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', marginBottom: '5px' }}>
              Platform
            </div>
            {platformData.map((item, idx) => (
              <div key={idx} style={{ marginBottom: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{item.platform ?? 'Unknown'}</span>
                  <span style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-primary)' }}>{(item.count || 0).toLocaleString()}</span>
                </div>
                <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px' }}>
                  <div style={{ height: '100%', width: `${Math.round(((item.count || 0) / maxPlatform) * 100)}%`, background: '#3b82f6', borderRadius: '2px' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {hasVersion && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', marginBottom: '5px' }}>
              Version
            </div>
            {versionData.map((item, idx) => (
              <div key={idx} style={{ marginBottom: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{item.AgentVersion ?? item.version ?? 'Unknown'}</span>
                  <span style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-primary)' }}>{(item.count || 0).toLocaleString()}</span>
                </div>
                <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px' }}>
                  <div style={{ height: '100%', width: `${Math.round(((item.count || 0) / maxVersion) * 100)}%`, background: '#8b5cf6', borderRadius: '2px' }} />
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export const WorkflowStatusWidget = ({ workflowData }) => {
  const STATUS_COLORS = {
    Success: '#10b981',
    Failed:  '#ef4444',
    Running: '#3b82f6',
    Timeout: '#f59e0b',
    Unknown: '#64748b'
  };

  const hasData = workflowData && workflowData.length > 0;
  const total   = hasData ? workflowData.reduce((s, i) => s + (i.executions || 0), 0) : 0;
  const success = hasData ? workflowData.filter(i => i.status_label === 'Success').reduce((s, i) => s + (i.executions || 0), 0) : 0;

  // Aggregate status totals for the stacked bar
  const statusTotals = hasData ? workflowData.reduce((acc, item) => {
    acc[item.status_label] = (acc[item.status_label] || 0) + (item.executions || 0);
    return acc;
  }, {}) : {};

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px', overflowY: 'auto' }}>
      {hasData ? (
        <>
          {/* Summary header + stacked bar */}
          <div style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                {total} execution{total !== 1 ? 's' : ''}
              </span>
              <span style={{ fontSize: '10px', fontWeight: '600', color: success === total ? '#10b981' : '#f59e0b' }}>
                {success}/{total} ok
              </span>
            </div>
            <div style={{ display: 'flex', gap: '2px', height: '4px', background: 'rgba(0,0,0,0.3)', borderRadius: '2px', overflow: 'hidden' }}>
              {Object.entries(statusTotals).map(([label, count], idx) =>
                count > 0 && <div key={idx} style={{ flex: count, background: STATUS_COLORS[label] || STATUS_COLORS.Unknown }} />
              )}
            </div>
          </div>

          {/* Per-workflow rows */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {workflowData.map((item, idx) => {
              const color = STATUS_COLORS[item.status_label] || STATUS_COLORS.Unknown;
              // Strip "AgenticSOC " prefix for compact display
              const label = item.workflow_name
                ? item.workflow_name.replace(/^agenticsoc\s*/i, '')
                : item.status_label;
              return (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '5px 8px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '4px',
                  borderLeft: `3px solid ${color}`
                }}>
                  <span style={{
                    fontSize: '9px', color: 'var(--text-secondary)',
                    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    minWidth: 0
                  }}>
                    {label}
                  </span>
                  <span style={{ fontSize: '8px', color, fontWeight: '700', textTransform: 'uppercase', flexShrink: 0 }}>
                    {item.status_label}
                  </span>
                  <span style={{
                    fontSize: '11px', color: 'var(--text-primary)', fontWeight: '700',
                    background: `${color}22`, borderRadius: '3px', padding: '0 5px', flexShrink: 0
                  }}>
                    {item.executions}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '22px', opacity: 0.5 }}>✅</div>
          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>
            No executions in last 24h
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.5', maxWidth: '180px' }}>
            No AgenticSOC (any case) workflow executions found in the last 24 hours.
          </div>
          <a
            href="https://falcon.us-2.crowdstrike.com/workflow/fusion/executions"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '10px', color: '#3b82f6', textDecoration: 'none',
              padding: '4px 10px', borderRadius: '4px',
              border: '1px solid rgba(59,130,246,0.4)',
              display: 'inline-flex', alignItems: 'center', gap: '4px'
            }}
          >
            Open Execution Log →
          </a>
        </div>
      )}
    </div>
  );
};

// Format a raw events/sec rate (averaged over 7 days) as a human-readable
// total-event count over the 7-day window with K/M suffixes.
const SEVEN_DAY_SECONDS = 7 * 24 * 3600;
function formatEventCount(rate) {
  const total = rate * SEVEN_DAY_SECONDS;
  if (total >= 1_000_000) return (total / 1_000_000).toFixed(1) + 'M';
  if (total >= 1_000) return (total / 1_000).toFixed(1) + 'K';
  return Math.round(total).toString();
}

export const SOCOpsStatus = ({ ingestionData }) => {
  const rows = Array.isArray(ingestionData) ? ingestionData : [];

  const statusDot = (status) => {
    const colors = {
      healthy: '#10b981',
      stale:   '#f59e0b',
      unknown: '#64748b',
    };
    const color = colors[status] || colors.unknown;
    return (
      <span
        style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: color,
          flexShrink: 0,
        }}
        title={status}
      />
    );
  };

  if (rows.length === 0) {
    return (
      <div style={{
        width: '100%', height: '100%', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        color: '#64748b', fontSize: '11px',
      }}>
        No ingestion data
      </div>
    );
  }

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      gap: '0px', overflowY: 'auto',
      padding: '4px 8px',
    }}>
      {/* Header row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '14px 1fr auto',
        gap: '6px',
        alignItems: 'center',
        padding: '0 0 4px 0',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        marginBottom: '2px',
      }}>
        <span style={{ fontSize: '9px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', gridColumn: '2' }}>
          Source
        </span>
        <span style={{ fontSize: '9px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>
          Events / 7d
        </span>
      </div>

      {/* Data rows */}
      {rows.map((row, idx) => {
        const sourceName = (row.source || 'Unknown');
        const displayName = sourceName.length > 24
          ? sourceName.slice(0, 22) + '…'
          : sourceName;
        const eventLabel = formatEventCount(row.rate || 0);

        return (
          <div
            key={idx}
            style={{
              display: 'grid',
              gridTemplateColumns: '14px 1fr auto',
              gap: '6px',
              alignItems: 'center',
              padding: '5px 0',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            {statusDot(row.status)}
            <span
              style={{
                fontSize: '11px',
                color: '#cbd5e1',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={sourceName}
            >
              {displayName}
            </span>
            <span style={{
              fontSize: '11px',
              color: '#94a3b8',
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
              textAlign: 'right',
            }}>
              {eventLabel} events
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const DarkHoursWidget = ({ heatmapData, currentDarkData }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const hasRealData = Array.isArray(heatmapData) && heatmapData.length > 0;

  // Build a 7-day x 24-hour activity grid (0-100 normalized) from the real
  // soc_dark_hours_heatmap query (utils/logscale-queries.js), which groups by
  // hour + day_type ("Weekend"/"Weekday") with activity_count - it does NOT
  // break activity down by individual day of week. So every weekday row
  // (Mon-Fri) reuses the "Weekday" bucket for a given hour, and Sat/Sun reuse
  // the "Weekend" bucket. Values are normalized against the max activity_count
  // seen across all buckets so the existing color scale (0-100) still works.
  let weekData = null;
  if (hasRealData) {
    const weekdayByHour = {};
    const weekendByHour = {};
    let maxActivity = 0;

    heatmapData.forEach(row => {
      const hour = parseInt(row.hour, 10);
      const count = row.activity_count || 0;
      if (Number.isNaN(hour)) return;
      if (row.day_type === 'Weekend') {
        weekendByHour[hour] = count;
      } else {
        weekdayByHour[hour] = count;
      }
      if (count > maxActivity) maxActivity = count;
    });

    const normalize = (count) => (maxActivity > 0 ? Math.round((count / maxActivity) * 100) : 0);

    weekData = days.map((day, dayIdx) => {
      const byHour = dayIdx >= 5 ? weekendByHour : weekdayByHour;
      return hours.map(hour => normalize(byHour[hour] || 0));
    });
  }

  // Minimal empty-state placeholder when there is no real data yet - a flat
  // zeroed-out grid, NOT randomly/statically fabricated activity.
  if (!weekData) {
    weekData = days.map(() => hours.map(() => 0));
  }

  const getColor = (activity) => {
    // Using dashboard-consistent colors (green #10b981, amber #f59e0b, red #ef4444)
    if (activity === 0) return 'rgba(239, 68, 68, 0.3)'; // Soft red for dark hours
    if (activity < 10) return 'rgba(245, 158, 11, 0.2)'; // Very soft amber
    if (activity < 20) return 'rgba(245, 158, 11, 0.3)'; // Soft amber
    if (activity < 35) return 'rgba(16, 185, 129, 0.2)'; // Very light green
    if (activity < 50) return 'rgba(16, 185, 129, 0.3)'; // Light green
    if (activity < 65) return 'rgba(16, 185, 129, 0.4)'; // Medium light green
    if (activity < 80) return 'rgba(16, 185, 129, 0.5)'; // Medium green
    return 'rgba(16, 185, 129, 0.6)'; // Full green (dashboard consistent)
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '8px', gap: '8px' }}>
      {/* Coverage indicator (smaller, as complement) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>COVERAGE</div>
        <div style={{ fontSize: '16px', fontWeight: '700', color: currentDarkData?.coverage > 70 ? '#10b981' : '#f59e0b' }}>
          {currentDarkData?.coverage || 0}%
        </div>
      </div>

      {/* Weekly heatmap - built from real heatmapData (Weekday/Weekend x hour), colored consistently */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'auto repeat(24, 1fr)', gap: '1px', fontSize: '8px' }}>
        {/* Header row with hours */}
        <div></div>
        {hours.map(h => (
          <div key={h} style={{
            textAlign: 'center',
            fontSize: '7px',
            color: 'var(--text-muted)',
            paddingBottom: '2px'
          }}>
            {h % 4 === 0 ? h : ''}
          </div>
        ))}

        {/* Days with hourly activity */}
        {days.map((day, dayIdx) => (
          <React.Fragment key={day}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '9px',
              fontWeight: dayIdx >= 5 ? '700' : '500',
              color: dayIdx >= 5 ? '#f59e0b' : 'var(--text-secondary)',
              paddingRight: '4px'
            }}>
              {day}
            </div>
            {hours.map(hour => {
              const activity = weekData[dayIdx][hour];
              const isBusinessHour = dayIdx < 5 && hour >= 8 && hour < 18;
              return (
                <div
                  key={hour}
                  style={{
                    background: getColor(activity),
                    borderRadius: '2px',
                    minHeight: '14px',
                    border: isBusinessHour ? '1px solid rgba(16, 185, 129, 0.2)' : 'none'
                  }}
                  title={`${day} ${hour}:00 - Activity: ${activity}%`}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '12px', fontSize: '8px', color: 'var(--text-muted)', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '8px', height: '8px', background: 'rgba(239, 68, 68, 0.3)', borderRadius: '2px' }}></div>
          Dark Hours
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '8px', height: '8px', background: 'rgba(16, 185, 129, 0.6)', borderRadius: '2px' }}></div>
          High Activity
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '8px', height: '8px', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '2px' }}></div>
          Business Hours
        </div>
      </div>
    </div>
  );
};

export const CharlotteCreditWidget = ({ totalUsed, totalLimit, topUsers }) => {
  const percentage = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;
  const maxUserCredits = topUsers && topUsers.length > 0 ? Math.max(...topUsers.map(u => u.credits)) : 1;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px' }}>
      {/* Total Usage Summary */}
      <div style={{
        padding: '12px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '8px',
        borderLeft: `3px solid ${percentage < 60 ? '#10b981' : percentage < 80 ? '#f59e0b' : '#ef4444'}`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Usage</span>
          <span style={{ fontSize: '10px', fontWeight: '700', color: percentage < 60 ? '#10b981' : percentage < 80 ? '#f59e0b' : '#ef4444' }}>
            {percentage.toFixed(0)}%
          </span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          {totalUsed.toLocaleString()} / {totalLimit > 0 ? totalLimit.toLocaleString() : 'Unknown'} credits
        </div>
      </div>

      {/* Top 5 Users */}
      <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
        Top 5 Consumers
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
        {topUsers && topUsers.length > 0 ? (
          topUsers.map((user, idx) => (
            <div key={idx} style={{
              padding: '8px 10px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    fontSize: '9px',
                    fontWeight: '700',
                    color: idx === 0 ? '#f59e0b' : 'var(--text-secondary)',
                    minWidth: '14px'
                  }}>
                    #{idx + 1}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: '600' }}>{user.name}</span>
                </div>
                <span style={{ fontSize: '12px', color: '#00E5FF', fontWeight: '700' }}>
                  {user.credits.toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '4px', height: '4px', background: 'rgba(0,0,0,0.3)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                  width: `${(user.credits / maxUserCredits) * 100}%`,
                  background: 'linear-gradient(90deg, #00E5FF, #00FF88)',
                  transition: 'width 0.5s ease'
                }}></div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            No user data
          </div>
        )}
      </div>
    </div>
  );
};

export const AnalystActivityChart = ({ data }) => {
  // NOTE: `data[].{preparation,detection,containment,postIncident}` represent action
  // COUNTS per NIST 800-61 v3 phase (soc_analyst_activity has no duration field, so
  // this is an activity-volume proxy, not real elapsed hours). Labels below say
  // "actions" rather than "h" to reflect that accurately.
  // NIST 800-61 v3 Incident Response Phases colors
  const phaseColors = {
    'Preparation': '#3b82f6',
    'Detection & Analysis': '#f59e0b',
    'Containment, Eradication & Recovery': '#ef4444',
    'Post-Incident Activity': '#10b981'
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px' }}>
      <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
        Analyst Time Distribution by Phase
      </div>

      {/* Analyst breakdown */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
        {data && data.length > 0 ? (
          data.map((analyst, idx) => {
            // Find the phase where analyst spends most time
            const phases = [
              { name: 'Preparation', time: analyst.preparation || 0 },
              { name: 'Detection & Analysis', time: analyst.detection || 0 },
              { name: 'Containment, Eradication & Recovery', time: analyst.containment || 0 },
              { name: 'Post-Incident Activity', time: analyst.postIncident || 0 }
            ];

            const totalTime = phases.reduce((sum, p) => sum + p.time, 0);
            const maxPhase = phases.reduce((max, p) => p.time > max.time ? p : max, phases[0]);

            return (
              <div key={idx} style={{
                padding: '12px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '8px',
                borderLeft: `3px solid ${phaseColors[maxPhase.name]}`
              }}>
                {/* Analyst name and primary phase */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: '600' }}>
                    {analyst.name}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Primary:</span>
                    <span style={{
                      fontSize: '10px',
                      color: phaseColors[maxPhase.name],
                      fontWeight: '600',
                      background: `${phaseColors[maxPhase.name]}22`,
                      padding: '2px 6px',
                      borderRadius: '3px'
                    }}>
                      {maxPhase.name}
                    </span>
                  </div>
                </div>

                {/* Total time above bar */}
                <div style={{
                  fontSize: '10px',
                  color: 'var(--text-muted)',
                  marginBottom: '4px',
                  textAlign: 'right'
                }}>
                  Total: {totalTime.toFixed(1)} actions
                </div>

                {/* Time breakdown bar */}
                <div style={{
                  height: '8px',
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  display: 'flex',
                  marginBottom: '6px'
                }}>
                  {phases.map((phase, pIdx) => (
                    totalTime > 0 && phase.time > 0 && (
                      <div
                        key={pIdx}
                        style={{
                          width: `${(phase.time / totalTime) * 100}%`,
                          background: phaseColors[phase.name],
                          transition: 'width 0.5s ease'
                        }}
                        title={`${phase.name}: ${phase.time}h`}
                      ></div>
                    )
                  ))}
                </div>

                {/* Phase legend below bar */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '8px' }}>
                  {phases.map((phase, pIdx) => (
                    phase.time > 0 && (
                      <div key={pIdx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '2px',
                          background: phaseColors[phase.name]
                        }}></div>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {phase.name}
                        </span>
                        <span style={{ color: phaseColors[phase.name], fontWeight: '600' }}>
                          ({phase.time})
                        </span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            No analyst data
          </div>
        )}
      </div>
    </div>
  );
};

export const MITREHeatmap = ({ data }) => {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px', overflowY: 'auto' }}>
      {data && data.length > 0 ? (
        data.map((item, idx) => (
          <div key={idx} style={{
            padding: '6px 8px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '6px',
            borderLeft: `3px solid ${item.status === 'success' ? '#10b981' : item.status === 'failed' ? '#ef4444' : '#f59e0b'}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-primary)', fontWeight: '600' }}>{item.vendor}</span>
                <span style={{
                  fontSize: '8px',
                  color: 'rgba(255,255,255,0.6)',
                  background: 'rgba(255,255,255,0.1)',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  textTransform: 'uppercase',
                  fontWeight: '600'
                }}>
                  {item.type}
                </span>
              </div>
              <span style={{
                fontSize: '11px',
                color: item.status === 'success' ? '#10b981' : item.status === 'failed' ? '#ef4444' : '#f59e0b',
                fontWeight: '700'
              }}>
                {item.executions}
              </span>
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>
              {item.action}
            </div>
            <div style={{ display: 'flex', gap: '2px', marginTop: '4px', height: '3px', background: 'rgba(0,0,0,0.3)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{
                width: `${((item.success || 0) / item.executions * 100)}%`,
                background: '#10b981'
              }}></div>
              <div style={{
                width: `${((item.failed || 0) / item.executions * 100)}%`,
                background: '#ef4444'
              }}></div>
            </div>
          </div>
        ))
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          No remediation data
        </div>
      )}
    </div>
  );
};

export const FPRatioWidget = ({ fpData }) => {
  // fpData should have: { charlotteFP, charlotteTotal, thirdPartyFP, thirdPartyTotal, charlotteAccuracy, thirdPartyAccuracy }
  const charlotteRatio = fpData?.charlotteTotal > 0 ? ((fpData.charlotteFP / fpData.charlotteTotal) * 100).toFixed(1) : 0;
  const thirdPartyRatio = fpData?.thirdPartyTotal > 0 ? ((fpData.thirdPartyFP / fpData.thirdPartyTotal) * 100).toFixed(1) : 0;
  const charlotteAccuracy = fpData?.charlotteAccuracy || 0;
  const thirdPartyAccuracy = fpData?.thirdPartyAccuracy || 0;

  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 95) return '#10b981'; // Green
    if (accuracy >= 85) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '12px', gap: '12px' }}>
      {/* Charlotte Triage Section */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>CHARLOTTE TRIAGE (1st Party)</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: charlotteRatio < 10 ? '#10b981' : charlotteRatio < 20 ? '#f59e0b' : '#ef4444' }}>
              {charlotteRatio}%
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>
              {fpData?.charlotteFP || 0} FPs / {fpData?.charlotteTotal || 0} total
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>Human Review</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: getAccuracyColor(charlotteAccuracy) }}>
              {charlotteAccuracy}%
            </div>
            <div style={{ fontSize: '8px', color: 'var(--text-muted)' }}>accuracy</div>
          </div>
        </div>
        {/* Visual bar */}
        <div style={{ height: '6px', background: 'rgba(0,0,0,0.3)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            width: `${charlotteRatio}%`,
            height: '100%',
            background: charlotteRatio < 10 ? '#10b981' : charlotteRatio < 20 ? '#f59e0b' : '#ef4444'
          }}></div>
        </div>
      </div>

      <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>

      {/* 3rd Party Triage Section */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>3RD PARTY TRIAGE AGENT</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: thirdPartyRatio < 10 ? '#10b981' : thirdPartyRatio < 20 ? '#f59e0b' : '#ef4444' }}>
              {thirdPartyRatio}%
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>
              {fpData?.thirdPartyFP || 0} FPs / {fpData?.thirdPartyTotal || 0} total
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>Human Review</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: getAccuracyColor(thirdPartyAccuracy) }}>
              {thirdPartyAccuracy}%
            </div>
            <div style={{ fontSize: '8px', color: 'var(--text-muted)' }}>accuracy</div>
          </div>
        </div>
        {/* Visual bar */}
        <div style={{ height: '6px', background: 'rgba(0,0,0,0.3)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            width: `${thirdPartyRatio}%`,
            height: '100%',
            background: thirdPartyRatio < 10 ? '#10b981' : thirdPartyRatio < 20 ? '#f59e0b' : '#ef4444'
          }}></div>
        </div>
      </div>
    </div>
  );
};

export const MitreCoverageWidget = ({ data }) => {
  const max = Math.max(1, ...(data || []).map(d => d.count || 0));
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px', overflowY: 'auto' }}>
      {data && data.length > 0 ? (
        data.map((item, idx) => {
          const pct = (item.count / max) * 100;
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 6px' }}>
              <span style={{
                fontSize: '10px',
                color: 'var(--text-primary)',
                fontWeight: '600',
                minWidth: '140px',
                maxWidth: '140px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>{item.tactic}</span>
              <div style={{
                flex: 1,
                height: '14px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '3px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                  transition: 'width 0.5s ease'
                }}></div>
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                color: 'var(--text-primary)',
                minWidth: '48px',
                textAlign: 'right'
              }}>{item.count.toLocaleString()}</span>
            </div>
          );
        })
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
          No MITRE ATT&CK data
        </div>
      )}
    </div>
  );
};

export const TopImpactedHostsWidget = ({ data }) => {
  const max = Math.max(1, ...(data || []).map(d => d.count || 0));
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '3px', padding: '8px', overflowY: 'auto' }}>
      {data && data.length > 0 ? (
        data.map((item, idx) => {
          const pct = (item.count / max) * 100;
          const severity = item.count > 50 ? '#ef4444' : item.count > 20 ? '#f59e0b' : '#3b82f6';
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 4px' }}>
              <span style={{
                fontSize: '9px',
                color: 'var(--text-muted)',
                fontWeight: '600',
                minWidth: '14px',
                textAlign: 'right'
              }}>{idx + 1}</span>
              <span style={{
                fontSize: '10px',
                color: 'var(--text-primary)',
                fontWeight: '500',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontFamily: 'monospace'
              }}>{item.hostname}</span>
              <div style={{
                width: '60px',
                height: '10px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: severity,
                  transition: 'width 0.5s ease'
                }}></div>
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                color: severity,
                minWidth: '38px',
                textAlign: 'right'
              }}>{item.count.toLocaleString()}</span>
            </div>
          );
        })
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center', padding: '12px' }}>
          No host data available<br/>
          <span style={{ fontSize: '9px', opacity: 0.6 }}>(hostname field not aggregatable in this tenant)</span>
        </div>
      )}
    </div>
  );
};

export const AlertBacklogTrendWidget = ({ data }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !data || data.length === 0) return;

    // Clean up previous instance
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.day),
        datasets: [
          {
            label: 'New',
            data: data.map(d => d.new),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.35,
            fill: true,
            pointRadius: 3,
            pointHoverRadius: 5
          },
          {
            label: 'Closed',
            data: data.map(d => d.closed),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.35,
            fill: true,
            pointRadius: 3,
            pointHoverRadius: 5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: 'rgba(255,255,255,0.7)', font: { size: 10 }, boxWidth: 12, padding: 8 }
          },
          tooltip: {
            callbacks: {
              footer: (items) => {
                const idx = items[0]?.dataIndex;
                if (idx === undefined) return '';
                const d = data[idx];
                const sign = d.delta >= 0 ? '+' : '';
                return `Delta: ${sign}${d.delta}`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 9 } },
            grid: { color: 'rgba(255,255,255,0.05)' }
          },
          y: {
            ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 9 } },
            grid: { color: 'rgba(255,255,255,0.05)' },
            beginAtZero: true
          }
        }
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [data]);

  // Summary numbers over the whole 7-day window
  const totalNew    = (data || []).reduce((a, d) => a + d.new, 0);
  const totalClosed = (data || []).reduce((a, d) => a + d.closed, 0);
  const netDelta    = totalNew - totalClosed;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '8px', gap: '4px' }}>
      {data && data.length > 0 ? (
        <>
          <div style={{ display: 'flex', gap: '12px', fontSize: '10px', color: 'var(--text-muted)', padding: '0 4px' }}>
            <span>7D New: <strong style={{ color: '#ef4444' }}>{totalNew.toLocaleString()}</strong></span>
            <span>7D Closed: <strong style={{ color: '#10b981' }}>{totalClosed.toLocaleString()}</strong></span>
            <span>Net: <strong style={{ color: netDelta > 0 ? '#ef4444' : '#10b981' }}>{netDelta >= 0 ? '+' : ''}{netDelta.toLocaleString()}</strong></span>
          </div>
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <canvas ref={canvasRef}></canvas>
          </div>
        </>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
          No backlog data
        </div>
      )}
    </div>
  );
};

export const SensorHygieneWidget = ({ data }) => {
  const total = data?.total || 0;
  const outdated = data?.outdatedCount || 0;
  const offline = data?.offline || 0;
  const versions = data?.versionDistribution || {};
  const upToDate = total > 0 ? Math.round(((total - outdated) / total) * 100) : 0;
  const versionEntries = Object.entries(versions).slice(0, 5);
  const maxVer = Math.max(1, ...versionEntries.map(([, c]) => c));

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px' }}>
      {total > 0 ? (
        <>
          <div style={{ display: 'flex', gap: '6px' }}>
            <div style={{ flex: 1, padding: '6px', background: 'rgba(16,185,129,0.1)', borderRadius: '4px', borderLeft: '3px solid #10b981', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>{upToDate}%</div>
              <div style={{ fontSize: '8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Up-to-date</div>
            </div>
            <div style={{ flex: 1, padding: '6px', background: 'rgba(245,158,11,0.1)', borderRadius: '4px', borderLeft: '3px solid #f59e0b', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#f59e0b' }}>{outdated.toLocaleString()}</div>
              <div style={{ fontSize: '8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Outdated</div>
            </div>
            <div style={{ flex: 1, padding: '6px', background: 'rgba(239,68,68,0.1)', borderRadius: '4px', borderLeft: '3px solid #ef4444', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#ef4444' }}>{offline.toLocaleString()}</div>
              <div style={{ fontSize: '8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Offline</div>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px', overflowY: 'auto', paddingTop: '4px' }}>
            <div style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '2px' }}>Top Sensor Versions</div>
            {versionEntries.length > 0 ? versionEntries.map(([ver, count], idx) => {
              const pct = (count / maxVer) * 100;
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '9px', color: 'var(--text-primary)', fontFamily: 'monospace', minWidth: '95px', maxWidth: '95px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ver}</span>
                  <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: idx === 0 ? '#10b981' : '#64748b' }}></div>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-primary)', minWidth: '40px', textAlign: 'right' }}>{count.toLocaleString()}</span>
                </div>
              );
            }) : (
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px' }}>Version data unavailable</div>
            )}
          </div>
        </>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
          No sensor data
        </div>
      )}
    </div>
  );
};

export const NewThreatsPulseWidget = ({ data }) => {
  const total = data?.total || 0;
  const previous = data?.previous || 0;
  const delta = data?.delta || 0;
  const sources = data?.sources || [];
  const pctChange = previous > 0 ? ((delta / previous) * 100) : 0;
  const trendUp = delta > 0;
  const trendColor = delta === 0 ? '#64748b' : (trendUp ? '#ef4444' : '#10b981');
  const arrow = delta === 0 ? '→' : (trendUp ? '↑' : '↓');
  const maxCount = Math.max(1, ...sources.map(s => s.count || 0));

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '10px', gap: '6px' }}>
      {/* Big number pulse */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
        <div style={{ fontSize: '34px', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1, fontFamily: 'monospace' }}>
          {total.toLocaleString()}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: trendColor }}>
            {arrow} {Math.abs(pctChange).toFixed(1)}%
          </span>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
            vs prev 1h ({previous.toLocaleString()})
          </span>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>
          Alerts<br/>last 1 hour
        </div>
      </div>

      {/* Sources list */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px', overflowY: 'auto' }}>
        {sources.length > 0 ? sources.map((s, idx) => {
          const pct = (s.count / maxCount) * 100;
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '2px 4px' }}>
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: s.color, flexShrink: 0
              }}></span>
              <span style={{
                fontSize: '10px',
                color: 'var(--text-primary)',
                fontWeight: '500',
                minWidth: '140px',
                maxWidth: '140px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>{s.label}</span>
              <div style={{
                flex: 1,
                height: '10px',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: s.color,
                  transition: 'width 0.5s ease'
                }}></div>
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                color: s.color,
                minWidth: '45px',
                textAlign: 'right',
                fontFamily: 'monospace'
              }}>{s.count.toLocaleString()}</span>
            </div>
          );
        }) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
            No new threats in last hour
          </div>
        )}
      </div>
    </div>
  );
};

export const AlertStatusMixWidget = ({ data }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !data || data.length === 0) return;
    if (chartRef.current) chartRef.current.destroy();

    const STATUS_COLORS = {
      new: '#ef4444',
      in_progress: '#f59e0b',
      closed: '#10b981',
      reopened: '#8b5cf6',
      false_positive: '#64748b',
      ignored: '#64748b'
    };
    const labels = data.map(d => d.status.replace('_', ' ').toUpperCase());
    const counts = data.map(d => d.count);
    const colors = data.map(d => STATUS_COLORS[d.status] || '#64748b');

    const ctx = canvasRef.current.getContext('2d');
    chartRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: counts,
          backgroundColor: colors,
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.2)',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: 'rgba(255,255,255,0.75)',
              font: { size: 9 },
              boxWidth: 10,
              padding: 6
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const total = counts.reduce((a, b) => a + b, 0);
                const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                return `${ctx.label}: ${ctx.parsed.toLocaleString()} (${pct}%)`;
              }
            }
          }
        }
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [data]);

  const total = (data || []).reduce((a, b) => a + b.count, 0);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '8px', position: 'relative' }}>
      {data && data.length > 0 ? (
        <>
          <div style={{ textAlign: 'center', marginBottom: '2px' }}>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{total.toLocaleString()}</div>
            <div style={{ fontSize: '8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total (24h)</div>
          </div>
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <canvas ref={canvasRef}></canvas>
          </div>
        </>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
          No status data
        </div>
      )}
    </div>
  );
};

export const CaseAgeDistributionWidget = ({ data }) => {
  const total = (data || []).reduce((a, b) => a + b.count, 0);
  const max = Math.max(1, ...(data || []).map(d => d.count || 0));
  const COLORS = {
    ok:   '#10b981',
    warn: '#f59e0b',
    high: '#ef4444',
    crit: '#dc2626'
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '10px', gap: '6px' }}>
      {data && data.length > 0 ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {total.toLocaleString()}
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>
              Open alerts<br/>by age
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', gap: '4px' }}>
            {data.map((bucket, idx) => {
              const pct = (bucket.count / max) * 100;
              const color = COLORS[bucket.severity] || '#64748b';
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    minWidth: '48px',
                    fontFamily: 'monospace'
                  }}>{bucket.label}</span>
                  <div style={{
                    flex: 1,
                    height: '18px',
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <div style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: color,
                      transition: 'width 0.5s ease'
                    }}></div>
                  </div>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: color,
                    minWidth: '48px',
                    textAlign: 'right',
                    fontFamily: 'monospace'
                  }}>{bucket.count.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
          No case age data
        </div>
      )}
    </div>
  );
};

export const CriticalHighRightNowWidget = ({ data }) => {
  const total = data?.total || 0;
  const buckets = Array.isArray(data?.buckets) ? data.buckets : [];
  const oldestAge = data?.oldestAgeHours || 0;

  const priorityColor = (label) => {
    const k = String(label || '').toLowerCase();
    if (k === 'critical') return '#dc2626';
    if (k === 'high') return '#f59e0b';
    if (k === 'medium') return '#eab308';
    if (k === 'low') return '#10b981';
    if (k === 'informational' || k === 'info') return '#6b7280';
    return '#94a3b8';
  };
  const priorityRank = (label) => {
    const k = String(label || '').toLowerCase();
    if (k === 'critical') return 0;
    if (k === 'high') return 1;
    if (k === 'medium') return 2;
    if (k === 'low') return 3;
    if (k === 'informational' || k === 'info') return 4;
    return 5;
  };
  const sorted = [...buckets].sort((a, b) => priorityRank(a.label) - priorityRank(b.label));
  const topBucket = sorted[0];
  const headlineColor = total === 0 ? '#10b981' : (topBucket ? priorityColor(topBucket.label) : '#94a3b8');

  const ageDisplay = oldestAge > 0
    ? (oldestAge >= 24 ? `${Math.round(oldestAge / 24)}d` : `${Math.round(oldestAge)}h`)
    : '—';
  const ageColor = oldestAge >= 24 ? '#dc2626' : oldestAge >= 6 ? '#f59e0b' : '#10b981';

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '10px 12px', gap: '4px', position: 'relative' }}>
      <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
        Escalation Priority · Open
      </div>
      <div style={{
        fontSize: '36px',
        fontWeight: '800',
        color: headlineColor,
        lineHeight: 1,
        fontFamily: 'monospace',
        display: 'flex',
        alignItems: 'baseline',
        gap: '6px'
      }}>
        {total.toLocaleString()}
        <span style={{
          width: '10px', height: '10px', borderRadius: '50%',
          background: headlineColor,
          animation: total > 0 ? 'pulse 1.5s infinite' : 'none',
          display: 'inline-block'
        }}></span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 10px', fontSize: '10px', marginTop: '4px' }}>
        {sorted.length > 0 ? sorted.map(b => (
          <span key={b.label} style={{ color: priorityColor(b.label), fontWeight: '700' }}>
            ⬤ {b.count.toLocaleString()}{' '}
            <span style={{ color: 'var(--text-muted)', fontWeight: '500', textTransform: 'capitalize' }}>{b.label}</span>
          </span>
        )) : (
          <span style={{ color: 'var(--text-muted)' }}>No open alerts</span>
        )}
      </div>
      <div style={{ marginTop: 'auto', fontSize: '9px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span>Oldest open:</span>
        <span style={{ color: ageColor, fontWeight: '700', fontFamily: 'monospace', fontSize: '12px' }}>{ageDisplay}</span>
      </div>
    </div>
  );
};
