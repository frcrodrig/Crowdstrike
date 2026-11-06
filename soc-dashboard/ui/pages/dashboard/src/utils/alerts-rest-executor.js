/**
 * Alerts REST API Executor v2
 *
 * Aggregation spec goes in the POST BODY as an array — NOT urlParams (those become
 * URL query params; the CrowdStrike Aggregates API reads the spec from the body).
 *
 * Confirmed-valid aggregation types: terms, date_range
 * Confirmed-valid fields: severity_name, status
 * timeseries type rejected → use date_range with explicit hourly buckets instead.
 *
 * Response: resources[0].buckets = [{ label, count }]
 */

const HOUR_MS = 3600 * 1000;
const DAY_MS  = 24 * HOUR_MS;

// Source → human-friendly label/group/color map for New Threats Pulse widget.
// `product` field terms observed in the Alerts API are matched by substring (lowercased)
// against the keys below; multiple raw keys may collapse into the same label
// (e.g. cloud + cwpp → "Falcon Cloud").
const SOURCE_MAP = {
  'data-protection': { label: 'Falcon DLP', group: 'falcon', color: '#dc2626' },
  recon: { label: 'Falcon Recon', group: 'falcon', color: '#dc2626' },
  spotlight: { label: 'Falcon Spotlight', group: 'falcon', color: '#dc2626' },
  discover: { label: 'Falcon Discover', group: 'falcon', color: '#dc2626' },
  exposure: { label: 'Falcon Exposure Mgmt', group: 'falcon', color: '#dc2626' },
  epp: { label: 'Falcon EDR', group: 'falcon', color: '#dc2626' },
  idp: { label: 'Falcon Identity', group: 'falcon', color: '#dc2626' },
  ngsiem: { label: 'Falcon SIEM', group: 'falcon', color: '#dc2626' },
  cwpp: { label: 'Falcon Cloud', group: 'falcon', color: '#dc2626' },
  fcs: { label: 'Falcon Cloud', group: 'falcon', color: '#dc2626' },
  cloud: { label: 'Falcon Cloud', group: 'falcon', color: '#dc2626' },
  horizon: { label: 'Falcon ASPM', group: 'falcon', color: '#dc2626' },
  paloalto: { label: 'Palo Alto Networks', group: '3rd-party', color: '#3b82f6' },
  fortinet: { label: 'Fortinet', group: '3rd-party', color: '#3b82f6' },
  proofpoint: { label: 'Proofpoint', group: '3rd-party', color: '#3b82f6' },
  zscaler: { label: 'Zscaler', group: '3rd-party', color: '#3b82f6' },
  okta: { label: 'Okta', group: '3rd-party', color: '#3b82f6' },
  aws: { label: 'AWS', group: '3rd-party', color: '#3b82f6' },
  defender: { label: 'Microsoft Defender', group: '3rd-party', color: '#3b82f6' },
  umbrella: { label: 'Cisco Umbrella', group: '3rd-party', color: '#3b82f6' },
  cisco: { label: 'Cisco', group: '3rd-party', color: '#3b82f6' }
};

function since(offsetMs) { return new Date(Date.now() - offsetMs).toISOString(); }
function nowIso()         { return new Date().toISOString(); }

function getBuckets(response) {
  return response?.resources?.[0]?.buckets ?? [];
}

function getTotal(response) {
  return response?.meta?.pagination?.total ?? 0;
}

// All aggregation specs go in the POST body array
async function agg(alerts, spec) {
  return alerts.postAggregatesAlertsV2([spec], {});
}

// Safe agg: returns [] instead of throwing when field/type is unsupported
async function safeAgg(alerts, spec) {
  try {
    return await agg(alerts, spec);
  } catch {
    return { resources: [{ buckets: [] }] };
  }
}

// Generate N hourly date_range buckets ending now
function hourlyRanges(n) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => ({
    from: new Date(now - (n - i) * HOUR_MS).toISOString(),
    to:   new Date(now - (n - i - 1) * HOUR_MS).toISOString()
  }));
}

// Generate N daily date_range buckets ending now (oldest first)
function dailyRanges(n) {
  const ranges = [];
  const now = Date.now();
  for (let i = n - 1; i >= 0; i--) {
    const to   = now - (i * DAY_MS);
    const from = to - DAY_MS;
    ranges.push({
      from: new Date(from).toISOString(),
      to:   new Date(to).toISOString()
    });
  }
  return ranges;
}

// ─── Per-query fetch functions ────────────────────────────────────────────────

async function fetchThreatTimeline(alerts) {
  const ranges = hourlyRanges(24);
  const severities = ['Critical', 'High', 'Medium', 'Low'];

  const results = await Promise.allSettled(
    severities.map(sev =>
      agg(alerts, {
        type: 'date_range',
        field: 'created_timestamp',
        date_ranges: ranges,
        filter: `severity_name:'${sev}'`
      })
    )
  );

  const rows = [];
  results.forEach((res, i) => {
    if (res.status !== 'fulfilled') return;
    getBuckets(res.value).forEach((b, hourIdx) => {
      rows.push({
        _bucket: ranges[hourIdx]?.from ?? b.label,
        severity_label: severities[i],
        _count: b.count || 0
      });
    });
  });
  return rows;
}

async function fetchSeverityDist(alerts) {
  const res = await agg(alerts, {
    type: 'terms',
    field: 'severity_name',
    filter: `created_timestamp:>'${since(24 * HOUR_MS)}'`,
    size: 10
  });
  return getBuckets(res).map(b => ({ severity_name: b.label, total: b.count || 0 }));
}

async function fetchFPRatio(alerts) {
  // Use count-based approach (getQueriesAlertsV2) to avoid uncertain field names
  const s = since(30 * DAY_MS);
  const [totalRes, fpRes] = await Promise.allSettled([
    alerts.getQueriesAlertsV2({ filter: `created_timestamp:>'${s}'`, limit: 1 }),
    alerts.getQueriesAlertsV2({ filter: `created_timestamp:>'${s}'+status:'false_positive'`, limit: 1 })
  ]);
  const charlotteTotal = totalRes.status === 'fulfilled' ? getTotal(totalRes.value) : 0;
  const charlotteFP    = fpRes.status    === 'fulfilled' ? getTotal(fpRes.value)    : 0;
  const charlotteAccuracy = charlotteTotal > 0
    ? Math.round(100 - (charlotteFP / charlotteTotal * 100))
    : 100;
  return [{
    charlotteFP, charlotteTotal,
    thirdPartyFP: 0, thirdPartyTotal: 0,
    charlotteAccuracy, thirdPartyAccuracy: 100
  }];
}

async function fetchOpenCases(alerts, falcon) {
  // Primary: call incidents-fn Foundry Function (server-side FalconPy — correct API path)
  // The foundry-js bridge calls /api2/incidents/... which 404s; FalconPy uses the correct path.
  if (falcon) {
    try {
      const cf = falcon.cloudFunction({ name: 'incidents-fn' });
      const raw = await cf.execute({ method: 'GET', path: '/execute', params: {} });
      const result = raw?.body ?? raw;
      const rows = result?.rows ?? [];
      const total = result?.total ?? 0;
      if (result?.error) console.warn('[fetchOpenCases] incidents-fn error:', result.error);
      console.log('[fetchOpenCases] incidents-fn: total=', total, 'total_all=', result?.total_all, 'rows=', rows.length);
      if (rows.length > 0) return rows;
    } catch (err) {
      console.warn('[fetchOpenCases] incidents-fn failed, falling back to alerts:', err?.message ?? String(err));
    }
  }
  // Fallback: alerts aggregation (original implementation)
  const res = await agg(alerts, {
    type: 'terms',
    field: 'severity_name',
    filter: "status:'new',status:'in_progress'",
    size: 10
  });
  const buckets = getBuckets(res);
  if (buckets.length > 0) {
    return buckets.map(b => ({ severity_label: b.label, count: b.count || 0 }));
  }
  // Fallback: last 24h all alerts by severity
  const res2 = await agg(alerts, {
    type: 'terms',
    field: 'severity_name',
    filter: `created_timestamp:>'${since(24 * HOUR_MS)}'`,
    size: 10
  });
  return getBuckets(res2).map(b => ({ severity_label: b.label, count: b.count || 0 }));
}

async function fetchDetectionRate(alerts) {
  const t0  = new Date().toISOString();
  const t30 = since(30 * DAY_MS);
  const t60 = since(60 * DAY_MS);
  // Use date_range aggregation (confirmed working) to count alerts in each 30-day period
  const res = await agg(alerts, {
    type: 'date_range',
    field: 'created_timestamp',
    date_ranges: [
      { from: t60, to: t30 },
      { from: t30, to: t0  }
    ]
  });
  const buckets = getBuckets(res);
  return [
    { _count: buckets[1]?.count ?? 0 },  // current period (last 30 days)
    { _count: buckets[0]?.count ?? 0 },  // previous period (30-60 days ago)
  ];
}

async function fetchAnalystActivity(alerts) {
  // Use status terms as NIST phase proxy (status = analyst workflow stage)
  const res = await agg(alerts, {
    type: 'terms',
    field: 'status',
    filter: `created_timestamp:>'${since(7 * DAY_MS)}'`,
    size: 10
  });
  const STATUS_TO_ACTION = {
    new:         'detection_update',
    in_progress: 'detection_assign',
    closed:      'incident_close',
    reopened:    'detection_update'
  };
  return getBuckets(res)
    .filter(b => STATUS_TO_ACTION[(b.label || '').toLowerCase()])
    .map(b => ({
      analyst: 'SOC Team',
      action: STATUS_TO_ACTION[b.label.toLowerCase()],
      action_count: b.count || 0
    }));
}

async function fetchDarkHours(alerts) {
  // 24 hourly date_range buckets (last 24h), grouped into heatmap by hour-of-day
  const ranges = hourlyRanges(24);
  const res = await agg(alerts, {
    type: 'date_range',
    field: 'created_timestamp',
    date_ranges: ranges
  });
  return getBuckets(res).map((b, i) => {
    const dt  = new Date(ranges[i].from);
    const hr  = dt.getUTCHours().toString().padStart(2, '0');
    const dow = dt.getUTCDay();
    return {
      hour: hr,
      day_type: (dow === 0 || dow === 6) ? 'Weekend' : 'Weekday',
      activity_count: b.count || 0
    };
  });
}

async function fetchMitreTactics(alerts) {
  // Try tactic field; fall back to technique; both may be unsupported
  const s = since(24 * HOUR_MS);
  const res = await safeAgg(alerts, { type: 'terms', field: 'tactic', filter: `created_timestamp:>'${s}'`, size: 20 });
  const buckets = getBuckets(res).filter(b => b.label && b.label.trim() !== '');
  if (buckets.length > 0) {
    return buckets.map(b => ({
      vendor: 'CrowdStrike', type: 'MITRE ATT&CK',
      action: b.label, executions: b.count || 0,
      success: b.count || 0, failed: 0, status: 'success'
    }));
  }
  // Fallback: severity as tactic proxy
  const res2 = await agg(alerts, { type: 'terms', field: 'severity_name', filter: `created_timestamp:>'${s}'`, size: 10 });
  return getBuckets(res2).map(b => ({
    vendor: 'CrowdStrike', type: 'Severity',
    action: b.label, executions: b.count || 0,
    success: b.count || 0, failed: 0, status: 'success'
  }));
}

async function fetchMitreCoverage(alerts) {
  const s = since(7 * DAY_MS);
  const res = await safeAgg(alerts, {
    type: 'terms',
    field: 'tactic',
    filter: `created_timestamp:>'${s}'`,
    size: 20
  });
  const buckets = getBuckets(res).filter(b => b.label && b.label.trim() !== '');
  return buckets.map(b => ({ tactic: b.label, count: b.count || 0 }));
}

async function fetchTopHosts(alerts) {
  const s = since(24 * HOUR_MS);
  const filter = `created_timestamp:>'${s}'`;
  const candidates = ['device.hostname', 'device_hostname', 'hostname', 'aid'];
  for (const field of candidates) {
    const res = await safeAgg(alerts, { type: 'terms', field, filter, size: 10 });
    const buckets = getBuckets(res).filter(b => b.label && b.label.trim() !== '');
    if (buckets.length > 0) {
      console.log(`[fetchTopHosts] using field: ${field} (${buckets.length} buckets)`);
      return buckets.map(b => ({ hostname: b.label, count: b.count || 0 }));
    }
  }
  console.log('[fetchTopHosts] no hostname field returned data');
  return [];
}

async function fetchBacklogTrend(alerts) {
  const ranges = dailyRanges(7);
  // Two parallel aggregations: new vs closed alerts per daily bucket.
  // Follows the fetchThreatTimeline pattern (type:'date_range', date_ranges:[]).
  const [newRes, closedRes] = await Promise.all([
    safeAgg(alerts, {
      type: 'date_range',
      field: 'created_timestamp',
      filter: `status:'new'`,
      date_ranges: ranges
    }),
    safeAgg(alerts, {
      type: 'date_range',
      field: 'updated_timestamp',
      filter: `status:'closed'`,
      date_ranges: ranges
    })
  ]);
  const newBuckets    = getBuckets(newRes);
  const closedBuckets = getBuckets(closedRes);
  return ranges.map((r, i) => {
    const dayLabel = new Date(r.from).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
    const nCount = Number(newBuckets[i]?.count || 0);
    const cCount = Number(closedBuckets[i]?.count || 0);
    return { day: dayLabel, new: nCount, closed: cCount, delta: nCount - cCount };
  });
}

async function fetchDataIngestion(alerts) {
  // Aggregate directly on source_vendors over ALL alerts in the window.
  // Why not `product`: that field is a routing bucket (ngsiem/thirdparty/epp/…)
  // that collapses real vendors into one row. source_vendors is the actual
  // vendor array populated per alert (CrowdStrike, Zscaler, Palo Alto, …).
  const s = since(7 * DAY_MS);
  const res = await safeAgg(alerts, { type: 'terms', field: 'source_vendors', filter: `created_timestamp:>'${s}'`, size: 50 });
  const buckets = getBuckets(res).filter(b => b.label && String(b.label).trim() !== '');

  if (buckets.length > 0) {
    // Normalize: lowercase, strip newlines (API sometimes serializes a multi-value
    // array as "Vendor1\nVendor2" — take the first), then map to SOURCE_MAP for a
    // clean display label, otherwise capitalize. Merge duplicates case-insensitively.
    const prettyLabel = (raw) => {
      const first = String(raw).trim().toLowerCase().split('\n')[0].trim();
      for (const [key, meta] of Object.entries(SOURCE_MAP)) {
        if (first.includes(key)) return meta.label;
      }
      if (first === 'crowdstrike' || first === 'falcon') return 'CrowdStrike';
      return first.charAt(0).toUpperCase() + first.slice(1);
    };
    const merged = new Map();
    for (const b of buckets) {
      const label = prettyLabel(b.label);
      merged.set(label, (merged.get(label) || 0) + (Number(b.count) || 0));
    }
    return Array.from(merged.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, events]) => ({ '#repo': label, events, last_event: nowIso() }));
  }

  // Fallback: product terms (prior behaviour) if source_vendors is empty
  const resP = await safeAgg(alerts, { type: 'terms', field: 'product', filter: `created_timestamp:>'${s}'`, size: 20 });
  const pBuckets = getBuckets(resP).filter(b => b.label && b.label.trim() !== '');
  if (pBuckets.length > 0) {
    const vendorLabel = (raw) => {
      const r = String(raw).toLowerCase();
      for (const [key, meta] of Object.entries(SOURCE_MAP)) {
        if (r.includes(key)) return meta.label;
      }
      return String(raw);
    };
    const merged = new Map();
    for (const b of pBuckets) {
      const label = vendorLabel(b.label);
      merged.set(label, (merged.get(label) || 0) + (Number(b.count) || 0));
    }
    return Array.from(merged.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, events]) => ({ '#repo': label, events, last_event: nowIso() }));
  }

  // Last-resort fallback: severity_name as source proxy
  const res2 = await agg(alerts, { type: 'terms', field: 'severity_name', filter: `created_timestamp:>'${s}'`, size: 10 });
  return getBuckets(res2).map(b => ({ '#repo': `${b.label} alerts`, events: b.count || 0, last_event: nowIso() }));
}

// Agent health handled by home.jsx Devices API useEffect
async function fetchAgentPlatform() { return []; }
async function fetchAgentVersion()  { return []; }

// Workflow executions for AgenticSOC workflows via the registered saved search.
// Real backend ID (from Foundry App Manager, NOT the manifest UUID):
// falcon.logscale.savedQuery() → POST /loggingapi/entities/saved-searches-execute/v1
// Returns async job_id; poll via getEntitiesSavedSearchesExecuteV1({ jobId }).
const SOC_WORKFLOW_SAVED_SEARCH_ID = 'f92ad5cf02594c709cf70ed8835d4094';

async function pollWorkflowJob(loggingapi, jobId) {
  const poll = loggingapi?.getEntitiesSavedSearchesExecuteV1;
  if (!poll) {
    console.warn('[Workflow] poll method unavailable');
    return [];
  }
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 1500));
    const res = await poll.call(loggingapi, { jobId });
    const pr = res?.resources?.[0];
    const status = pr?.job_status?.status ?? pr?.status;
    const events = pr?.events ?? [];
    console.log(`[Workflow poll ${i}] status:${status} events:${events.length}`);
    if (status === 'done' || status === 'complete') return events;
  }
  const last = await poll.call(loggingapi, { jobId });
  return last?.resources?.[0]?.events ?? [];
}

function mapWorkflowEvents(events) {
  return events.map(r => ({
    workflow_name: r.workflow_name ?? r.definition_name ?? 'Unknown',
    status_label:  r.status_label ?? r.status ?? 'Unknown',
    executions:    Number(r.executions ?? r._count ?? 0)
  }));
}

async function fetchWorkflowStatus(alerts, falcon) {
  if (!falcon?.logscale) return [];

  const loggingapi = falcon.api?.loggingapi;

  // Execute the registered saved search via the Foundry LogScale bridge.
  // savedQuery() routes through the bridge which knows the Foundry-deployed saved search,
  // and runs it against the main NGSIEM repo. mode:'async' is required by the API.
  try {
    const raw = await falcon.logscale.savedQuery({ id: SOC_WORKFLOW_SAVED_SEARCH_ID, mode: 'async' });
    const firstResource = raw?.resources?.[0];
    if (raw?.errors?.length) {
      console.warn('[Workflow savedQuery] error response:', JSON.stringify(raw.errors));
      return [];
    }
    const jobId = firstResource?.job_status?.job_id;
    if (jobId) {
      const events = await pollWorkflowJob(loggingapi, jobId);
      console.log('[Workflow savedQuery] poll complete, events:', events.length);
      return mapWorkflowEvents(events);
    } else if (firstResource?.events?.length > 0) {
      return mapWorkflowEvents(firstResource.events);
    }
    return [];
  } catch (err) {
    console.warn('[Workflow savedQuery] error:', err?.message ?? String(err));
  }

  return [];
}

// Disconnected 3rd-Party Sources widget removed in v0.7.118 — tenant's
// `product` field contained no 3rd-party vendors, so the signal was
// permanently zero. Fetcher and FETCHERS entry deleted.

// MTTR/MTT/MTTD fetchers removed in v0.7.96 (severity-weighted proxies deleted).

// New Threats Pulse (1H) by Source — current vs previous 1h buckets by `product` field.
// Returns an OBJECT (not array): { total, previous, delta, sources }. The downstream
// executor's `data.length === 0` guard safely skips an object (length === undefined).
async function fetchNewThreatsPulse(alerts) {
  const now = Date.now();
  const h1 = new Date(now - 1 * HOUR_MS).toISOString();
  const h2 = new Date(now - 2 * HOUR_MS).toISOString();
  // Current hour: last 1h
  const [currentRes, previousRes] = await Promise.all([
    safeAgg(alerts, {
      type: 'terms',
      field: 'product',
      filter: `created_timestamp:>'${h1}'`,
      size: 30
    }),
    safeAgg(alerts, {
      type: 'terms',
      field: 'product',
      filter: `created_timestamp:>'${h2}'+created_timestamp:<'${h1}'`,
      size: 30
    })
  ]);
  const currentBuckets = getBuckets(currentRes).filter(b => b.label);
  const previousBuckets = getBuckets(previousRes).filter(b => b.label);
  console.log('[Pulse Raw]', currentBuckets.map(b => `${b.label}=${b.count}`).join(' | '));
  const total = currentBuckets.reduce((a, b) => a + (b.count || 0), 0);
  const previous = previousBuckets.reduce((a, b) => a + (b.count || 0), 0);
  const delta = total - previous;
  // Group current buckets by SOURCE_MAP, merging duplicates (e.g. cloud+cwpp → Falcon Cloud)
  const grouped = {};
  for (const b of currentBuckets) {
    const raw = (b.label || '').toLowerCase();
    const key = Object.keys(SOURCE_MAP).find(k => raw.includes(k));
    const meta = key ? SOURCE_MAP[key] : { label: b.label || 'Other', group: 'other', color: '#64748b' };
    const bucketKey = meta.label;
    if (!grouped[bucketKey]) {
      grouped[bucketKey] = { label: meta.label, count: 0, group: meta.group, color: meta.color };
    }
    grouped[bucketKey].count += (b.count || 0);
  }
  const sources = Object.values(grouped).sort((a, b) => b.count - a.count);
  return { total, previous, delta, sources };
}

async function fetchStatusMix(alerts) {
  const s = since(24 * HOUR_MS);
  const res = await agg(alerts, {
    type: 'terms',
    field: 'status',
    filter: `created_timestamp:>'${s}'`,
    size: 10
  });
  return getBuckets(res)
    .filter(b => b.label)
    .map(b => ({ status: b.label, count: b.count || 0 }));
}

// Escalation Priority · Open — groups open alerts by rule_priority.
// Shape: { total, buckets: [{label, count}], oldestAgeHours } — object (not array);
// downstream `data.length === 0` guard safely skips an object.
async function fetchCritHighNow(alerts) {
  const openStatus = `status:'new',status:'in_progress'`;
  const [bucketsRes, oldestRes] = await Promise.allSettled([
    agg(alerts, { type: 'terms', field: 'rule_priority', filter: openStatus, size: 10 }),
    alerts.getQueriesAlertsV2({ filter: openStatus, limit: 1, sort: 'created_timestamp.asc' })
  ]);

  const buckets = bucketsRes.status === 'fulfilled'
    ? getBuckets(bucketsRes.value)
        .filter(b => b.label)
        .map(b => ({ label: String(b.label), count: b.count || 0 }))
    : [];
  const total = buckets.reduce((sum, b) => sum + b.count, 0);

  let oldestTs = null;
  if (typeof alerts.postEntitiesAlertsV2 === 'function' && oldestRes.status === 'fulfilled') {
    const id = oldestRes.value?.resources?.[0];
    if (id) {
      try {
        const entity = await alerts.postEntitiesAlertsV2({ composite_ids: [id] });
        const t = entity?.resources?.[0]?.created_timestamp
          ? new Date(entity.resources[0].created_timestamp).getTime()
          : null;
        if (t) oldestTs = t;
      } catch (e) {
        console.warn('[fetchCritHighNow] entity fetch failed:', e?.message ?? e);
      }
    }
  }
  const oldestAgeHours = oldestTs ? (Date.now() - oldestTs) / HOUR_MS : 0;

  return { total, buckets, oldestAgeHours };
}

// Case Age Distribution — single date_range aggregation over open alerts.
// Was previously using getQueriesAlertsV2 + getTotal(), which reads
// response.meta.pagination.total — a field that endpoint doesn't return.
// Every bucket silently came back as 0. Fix: ask the aggregation endpoint
// directly for counts per age range.
async function fetchCaseAge(alerts) {
  const now = Date.now();
  const h1   = new Date(now - 1  * HOUR_MS).toISOString();
  const h6   = new Date(now - 6  * HOUR_MS).toISOString();
  const h24  = new Date(now - 24 * HOUR_MS).toISOString();
  const d7   = new Date(now - 7  * DAY_MS).toISOString();
  const epoch = '1970-01-01T00:00:00.000Z';
  const nowIso = new Date(now).toISOString();

  const res = await agg(alerts, {
    type: 'date_range',
    field: 'created_timestamp',
    filter: `status:'new',status:'in_progress'`,
    date_ranges: [
      { from: h1,    to: nowIso },  // <1h
      { from: h6,    to: h1 },      // 1-6h
      { from: h24,   to: h6 },      // 6-24h
      { from: d7,    to: h24 },     // 1-7d
      { from: epoch, to: d7 }       // >7d
    ]
  }).catch(() => ({}));

  const buckets = getBuckets(res);
  return [
    { label: '<1h',   count: buckets[0]?.count ?? 0, severity: 'ok'   },
    { label: '1-6h',  count: buckets[1]?.count ?? 0, severity: 'ok'   },
    { label: '6-24h', count: buckets[2]?.count ?? 0, severity: 'warn' },
    { label: '1-7d',  count: buckets[3]?.count ?? 0, severity: 'high' },
    { label: '>7d',   count: buckets[4]?.count ?? 0, severity: 'crit' }
  ];
}

// ─── SOC Capacity ───────────────────────────────────────────────────────────
// Measures SOC throughput as resolved vs received alerts over the last 24h.
// - received = alerts created in the last 24h
// - resolved = alerts updated to status 'closed' in the last 24h
// Ratio resolved/received: 100% = keeping up, <100% = backlog growing,
// >100% = draining backlog.
async function fetchSOCCapacity(alerts) {
  const t0 = new Date().toISOString();
  const t24 = since(24 * HOUR_MS);
  const [receivedRes, resolvedRes] = await Promise.all([
    safeAgg(alerts, {
      type: 'date_range',
      field: 'created_timestamp',
      date_ranges: [{ from: t24, to: t0 }],
    }),
    safeAgg(alerts, {
      type: 'date_range',
      field: 'updated_timestamp',
      filter: `status:'closed'`,
      date_ranges: [{ from: t24, to: t0 }],
    }),
  ]);
  const received = getBuckets(receivedRes)[0]?.count ?? 0;
  const resolved = getBuckets(resolvedRes)[0]?.count ?? 0;
  return { received, resolved };
}

// ─── AI Services (DNS requests) ─────────────────────────────────────────────
// Aggregate alert counts of DNS/domain activity, classified by AI vendor.
// Alerts REST schema varies, so we try several candidate DNS/domain fields and
// client-side classify each returned bucket against known AI service patterns.
const AI_SERVICE_PATTERNS = [
  { key: 'openai',      patterns: ['openai.com', 'chatgpt.com', 'oaistatic.com', 'oaiusercontent.com'] },
  { key: 'anthropic',   patterns: ['anthropic.com', 'claude.ai'] },
  { key: 'google',      patterns: ['gemini.google.com', 'generativelanguage.googleapis.com', 'bard.google.com', 'ai.google.dev'] },
  { key: 'mscopilot',   patterns: ['copilot.microsoft.com', 'bing.com/chat', 'copilot.cloud.microsoft'] },
  { key: 'ghcopilot',   patterns: ['githubcopilot.com', 'copilot.github.com'] },
  { key: 'perplexity',  patterns: ['perplexity.ai'] },
  { key: 'mistral',     patterns: ['mistral.ai'] },
  { key: 'cohere',      patterns: ['cohere.ai', 'cohere.com'] },
  { key: 'huggingface', patterns: ['huggingface.co', 'hf.co'] },
  { key: 'replicate',   patterns: ['replicate.com', 'replicate.delivery'] },
  { key: 'stability',   patterns: ['stability.ai', 'stablediffusionweb.com'] },
  { key: 'midjourney',  patterns: ['midjourney.com'] },
  { key: 'runway',      patterns: ['runwayml.com'] },
  { key: 'character',   patterns: ['character.ai'] },
  { key: 'poe',         patterns: ['poe.com'] },
  { key: 'deepseek',    patterns: ['deepseek.com'] },
  { key: 'xai',         patterns: ['x.ai', 'grok.com'] },
  { key: 'meta',        patterns: ['meta.ai'] },
  { key: 'elevenlabs',  patterns: ['elevenlabs.io'] },
];

function classifyDomain(domain) {
  if (!domain) return null;
  const d = String(domain).toLowerCase();
  for (const svc of AI_SERVICE_PATTERNS) {
    if (svc.patterns.some(p => d.includes(p))) return svc.key;
  }
  return null;
}

async function fetchAIServices(alerts) {
  const s = since(24 * HOUR_MS);
  const filter = `created_timestamp:>'${s}'`;
  const candidates = [
    'dns_request_name',
    'dns_request.domain',
    'domain',
    'remote_host',
    'destination_host',
    'url_domain',
    'request_url',
    'external_domain',
  ];
  for (const field of candidates) {
    const res = await safeAgg(alerts, { type: 'terms', field, filter, size: 500 });
    const buckets = getBuckets(res).filter(b => b.label && String(b.label).trim() !== '');
    if (buckets.length > 0) {
      console.log(`[fetchAIServices] using field: ${field} (${buckets.length} buckets)`);
      const totals = {};
      for (const b of buckets) {
        const key = classifyDomain(b.label);
        if (!key) continue;
        totals[key] = (totals[key] || 0) + (Number(b.count) || 0);
      }
      const results = Object.entries(totals).map(([key, count]) => ({ key, count }));
      if (results.length > 0) return results;
      console.log(`[fetchAIServices] field ${field} returned ${buckets.length} buckets but none classified`);
    }
  }
  console.log('[fetchAIServices] no DNS/domain field returned classifiable data');
  return [];
}

// MTTA/MTTR fetcher removed in v0.7.120 — insufficient closed-alert volume
// with assigned_to_timestamp populated to drive a meaningful real-time metric.

// ─── False Positive Rate (24h + 7d) ─────────────────────────────────────────
// fp_rate = closed_as_false_positive / (closed_as_false_positive + closed_as_true_positive)
// Uses getQueriesAlertsV2 (count-based) — same pattern as fetchFPRatio which is
// proven to return non-zero data. The prior postAggregatesAlertsV2 variant on
// `updated_timestamp` returned empty buckets and the widget flatlined at 0.0%.
async function fetchFPRate(alerts) {
  const s24 = since(24 * HOUR_MS);
  const s7d = since(7 * DAY_MS);
  const [fp24R, tp24R, fp7dR, tp7dR] = await Promise.allSettled([
    alerts.getQueriesAlertsV2({ filter: `created_timestamp:>'${s24}'+status:'false_positive'`, limit: 1 }),
    alerts.getQueriesAlertsV2({ filter: `created_timestamp:>'${s24}'+status:'true_positive'`,  limit: 1 }),
    alerts.getQueriesAlertsV2({ filter: `created_timestamp:>'${s7d}'+status:'false_positive'`, limit: 1 }),
    alerts.getQueriesAlertsV2({ filter: `created_timestamp:>'${s7d}'+status:'true_positive'`,  limit: 1 }),
  ]);
  const g = r => r.status === 'fulfilled' ? getTotal(r.value) : 0;
  const fp24c = g(fp24R), tp24c = g(tp24R), fp7dc = g(fp7dR), tp7dc = g(tp7dR);
  const rate = (fp, tp) => (fp + tp) > 0 ? (fp / (fp + tp)) * 100 : 0;
  return {
    day:  { fp: fp24c, tp: tp24c, ratePct: rate(fp24c, tp24c) },
    week: { fp: fp7dc, tp: tp7dc, ratePct: rate(fp7dc, tp7dc) },
  };
}

// ─── Top Noisy Detections (7d) ──────────────────────────────────────────────
// Terms agg on detection name field; try a few candidates until one returns data.
async function fetchTopNoisyDetections(alerts) {
  const s = since(7 * DAY_MS);
  const filter = `created_timestamp:>'${s}'`;
  const candidates = ['display_name', 'name', 'rule_name', 'description'];
  for (const field of candidates) {
    const res = await safeAgg(alerts, { type: 'terms', field, filter, size: 10 });
    const buckets = getBuckets(res).filter(b => b.label && String(b.label).trim() !== '');
    if (buckets.length > 0) {
      console.log(`[fetchTopNoisyDetections] using field: ${field} (${buckets.length} buckets)`);
      return buckets.map(b => ({ name: String(b.label), count: Number(b.count) || 0 }));
    }
  }
  console.log('[fetchTopNoisyDetections] no detection-name field returned data');
  return [];
}

// ────────────────────────────────────────────────────────────────────────────


// ─── Third-Party Feed Silence ───────────────────────────────────────────────
// Per 3rd-party vendor, find the latest alert timestamp. Universe: vendors that
// had any alert in the last 7 days (so we only alarm on feeds we expect to be
// flowing). CrowdStrike/Falcon are first-party and excluded.
async function fetchFeedSilence(alerts) {
  const since7d = since(7 * DAY_MS);
  const vendorAgg = await safeAgg(alerts, {
    type: 'terms', field: 'source_vendors',
    filter: `created_timestamp:>'${since7d}'`, size: 50
  });

  const normalize = (raw) => String(raw).trim().toLowerCase().split('\n')[0].trim();
  const prettify = (first) => {
    for (const [key, meta] of Object.entries(SOURCE_MAP)) {
      if (first.includes(key)) return meta.label;
    }
    return first.charAt(0).toUpperCase() + first.slice(1);
  };

  // Dedupe case-insensitive; keep the API label for FQL filtering.
  const byPretty = new Map();
  for (const b of getBuckets(vendorAgg)) {
    if (!b.label) continue;
    const first = normalize(b.label);
    if (!first || first === 'crowdstrike' || first === 'falcon') continue;
    const pretty = prettify(first);
    const prev = byPretty.get(pretty);
    const count = Number(b.count) || 0;
    if (!prev || count > prev.totalCount) {
      byPretty.set(pretty, { pretty, apiLabel: String(b.label), totalCount: count });
    }
  }
  const vendors = Array.from(byPretty.values());
  if (vendors.length === 0) return [];

  const now = Date.now();
  const rows = await Promise.all(vendors.map(async (v) => {
    try {
      const q = await alerts.getQueriesAlertsV2({
        filter: `source_vendors:'${v.apiLabel}'`,
        sort: 'created_timestamp.desc',
        limit: 1
      });
      const id = q?.resources?.[0];
      if (!id) return { vendor: v.pretty, lastSeenTs: null, minutesAgo: null };
      const ent = await alerts.postEntitiesAlertsV2({ composite_ids: [id] });
      const ts = ent?.resources?.[0]?.created_timestamp || null;
      if (!ts) return { vendor: v.pretty, lastSeenTs: null, minutesAgo: null };
      const minutesAgo = Math.max(0, Math.floor((now - new Date(ts).getTime()) / 60000));
      return { vendor: v.pretty, lastSeenTs: ts, minutesAgo };
    } catch (e) {
      console.warn('[fetchFeedSilence]', v.pretty, 'failed:', e?.message ?? e);
      return { vendor: v.pretty, lastSeenTs: null, minutesAgo: null };
    }
  }));

  // Worst silence first (null = never seen → sort to top)
  return rows.sort((a, b) => (b.minutesAgo ?? 1e9) - (a.minutesAgo ?? 1e9));
}


const FETCHERS = {
  soc_threat_timeline:      fetchThreatTimeline,
  soc_severity_dist:        fetchSeverityDist,
  soc_fp_ratio:             fetchFPRatio,
  soc_ai_services:          fetchAIServices,
  soc_capacity:             fetchSOCCapacity,
  soc_detection_rate:       fetchDetectionRate,
  soc_analyst_activity:     fetchAnalystActivity,
  soc_dark_hours_heatmap:   fetchDarkHours,
  soc_mitre_tactics:        fetchMitreTactics,
  soc_mitre_coverage:       fetchMitreCoverage,
  soc_top_hosts:            fetchTopHosts,
  soc_backlog_trend:        fetchBacklogTrend,
  soc_data_ingestion:       fetchDataIngestion,
  soc_workflow_status:      fetchWorkflowStatus,
  soc_agent_platform:       fetchAgentPlatform,
  soc_agent_version:        fetchAgentVersion,
  soc_new_threats_pulse:    fetchNewThreatsPulse,
  soc_status_mix:           fetchStatusMix,
  soc_case_age:             fetchCaseAge,
  soc_crithigh_now:         fetchCritHighNow,
  soc_top_noisy_detections: fetchTopNoisyDetections,
  soc_feed_silence:         fetchFeedSilence,
};

export async function executeQueryViaRestApi(falcon, queryName, setWidgetMockData, queryToWidgetId) {
  const fetcher  = FETCHERS[queryName];
  const widgetId = queryToWidgetId[queryName] || queryName;

  if (!fetcher) {
    setWidgetMockData(widgetId, true, `No REST fetcher for ${queryName}`);
    return { name: queryName, status: 'error', error: `No REST fetcher for ${queryName}`, data: null, recordCount: 0, executionTime: nowIso() };
  }

  if (!falcon?.api?.alerts) {
    setWidgetMockData(widgetId, true, 'Alerts API not available');
    return { name: queryName, status: 'error', error: 'Alerts API not available', data: null, recordCount: 0, executionTime: nowIso() };
  }

  try {
    const data = await fetcher(falcon.api.alerts, falcon);
    const recordCount = Array.isArray(data) ? data.length : (data ? 1 : 0);
    console.log(`[REST ${queryName}] ${recordCount} rows`);

    if (recordCount === 0) {
      setWidgetMockData(widgetId, false, null);  // 0 results is valid real data — no red dot
      return { name: queryName, status: 'success', data: null, recordCount: 0, executionTime: nowIso() };
    }

    setWidgetMockData(widgetId, false, null);
    return { name: queryName, status: 'success', data, recordCount, executionTime: nowIso() };
  } catch (err) {
    const msg = err?.message ?? String(err);
    console.error(`[REST ${queryName}] Error:`, msg);
    setWidgetMockData(widgetId, true, msg);
    return { name: queryName, status: 'error', error: msg, data: null, recordCount: 0, executionTime: nowIso() };
  }
}
