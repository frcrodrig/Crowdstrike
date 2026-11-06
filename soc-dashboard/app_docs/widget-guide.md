# SOC Dashboard — Widget Guide

**App version:** v0.7.137
**Updated:** 2026-10-07

## Overview

The **SOC Dashboard** is a real-time videowall for SOC team leads and security managers. It consolidates threat volume, SOC capacity, dark-hours coverage, MITRE coverage, agent health, and backlog trends into a single operations view.

All metrics are pulled live from CrowdStrike Falcon:
- **Alerts REST API** (`postAggregatesAlertsV2`, `getQueriesAlertsV2`, `postEntitiesAlertsV2`) — the primary source for alert volume, severity mix, status mix, backlog, and age distribution.
- **Devices API** (via `devices-fn` cloud function) — endpoint inventory, platform mix, sensor version distribution.
- **NGSIEM LogScale** — saved searches for ingestion rate and MITRE tactics.

The dashboard auto-refreshes every ~1 minute. Each widget surfaces a status indicator:
- 🟢 **Green dot** — live data from the backend
- 🟡 **Yellow dot** — fallback / mock data (API unavailable or empty tenant)

## Layout

The dashboard renders 15 widgets across 4 rows:

| Row | Widgets |
|-----|---------|
| **1. Threat Pulse** | Threat Timeline (24H) · Top Noisy Detections (7D) |
| **2. Threat Landscape** | SOC Capacity · Alert Backlog Trend (7D) · New Threats Pulse (1H) · Alert Age Distribution |
| **3. Operational** | Top AI Services (24H) · Dark Hours Monitoring · Agent Health · CrowdStrike Data Ingestion Rate · 3rd-Party Feed Silence |
| **4. Deep Analytics** | Sensor Hygiene · NIST 800-61 v3 IR Phases · MITRE ATT and CK Coverage (7D) · Top Impacted Hosts (24H) |

---

## Widget Reference

### Row 1 — Threat Pulse

#### 1. Threat Timeline (24H)
**Shows:** A line chart of alert volume over the last 24 hours, segmented by severity (Critical, High, Medium, Low).
**Read:** Peaks indicate hours of elevated threat activity — campaigns, scheduled scans, or noise bursts. X-axis is hourly buckets; Y-axis is alert count.
**Source:** Alerts REST — `postAggregatesAlertsV2` date_range by `created_timestamp`, one bucket per hour, grouped by `severity_name`.
**Window:** Last 24 hours.

#### 2. Top Noisy Detections (7D)
**Shows:** A ranked horizontal bar list of the ten detection names generating the most alerts over the last 7 days.
**Read:** The widget surfaces tuning candidates — detections at the top are the loudest contributors to analyst workload. Use the names here to prioritize detection-engineering review.
**Source:** Alerts REST aggregation by detection name over 7 days.
**Window:** Last 7 days.

---

### Row 2 — Threat Landscape

#### 3. SOC Capacity
**Shows:** The ratio of alerts the SOC has received vs. resolved, with a breaking-point score indicating whether the team is within sustainable load.
**Read:** A score above 100% means the team is theoretically overloaded. The capacity bar's 80/100/120% zones indicate comfortable, stressed, and critical operational states.
**Source:** Alerts REST — received = all alerts (24h); resolved = alerts with closed status (24h).
**Window:** Last 24 hours.
**Note:** This is a planning metric, not an exact measurement.

#### 4. Alert Backlog Trend (7D)
**Shows:** A dual-line chart tracking new vs. closed alerts per day over the last 7 days.
**Read:** When the "new" line sits above "closed" consistently, the backlog is growing. When closed exceeds new, the team is working down the queue.
**Source:** Alerts REST — `postAggregatesAlertsV2` with daily date_range buckets, one agg on `created_timestamp` for new, one on `updated_timestamp` for closed.
**Window:** Last 7 days.

#### 5. New Threats Pulse (1H) · by Source
**Shows:** A big-number counter of alerts generated in the last hour, with trend arrow vs. the previous hour and a breakdown by data source / product.
**Read:** Spikes indicate active incidents or new campaigns. The source breakdown reveals which Falcon module or 3rd-party connector is driving the surge.
**Source:** Alerts REST — count last 1h vs. previous 1h, grouped by `product` field. Product values are fuzzy-matched against SOURCE_MAP (Falcon Recon, SIEM, Spotlight, Discover, Exposure, FCS, and known 3rd-party vendors).
**Window:** Last 2 hours (current hour + prior hour for comparison).

#### 6. Alert Age Distribution
**Shows:** A horizontal histogram bucketing currently open alerts by age: `<1h`, `1–6h`, `6–24h`, `1–7d`, `>7d`.
**Read:** Alerts in the `>7d` and `1–7d` buckets are aging the backlog — these are tuning or escalation candidates. A heavy `<1h` bucket means the team is currently flooded.
**Source:** Alerts REST — 5 parallel `getQueriesAlertsV2` count calls with age-ranged FQL filters, status=new/in_progress.
**Window:** Live (current open alerts).

---

### Row 3 — Operational

#### 7. Top AI Services · DNS Requests (24H)
**Shows:** The AI and SaaS services generating the most DNS traffic from the environment over the last 24 hours.
**Read:** Surfaces shadow-AI usage, data-exfil risks via LLM uploads, and SaaS DNS volume for policy review.
**Source:** Alerts REST / DNS activity aggregation (24h window).
**Window:** Last 24 hours.

#### 8. Dark Hours Monitoring
**Shows:** A heatmap of alert activity by hour-of-day and day-type (Weekday vs. Weekend), plus a current coverage counter.
**Read:** Darker cells = higher alert volume. "Dark hours" with low analyst coverage are attacker windows. The "Unattended" counter shows alerts generated during low-coverage periods right now.
**Source:** Alerts REST — 24 hourly buckets grouped by weekday/weekend classification.
**Window:** Last 24 hours.

#### 9. Agent Health
**Shows:** Live status of all Falcon-protected endpoints — Total / Online / Stale / Offline, with a platform breakdown (Windows / Linux / macOS) and a sensor-version distribution.
**Read:** Stale endpoints haven't checked in recently but may still be powered on; Offline means no communication. Version skew reveals endpoints due for sensor updates.
**Source:** `devices-fn` cloud function — Hosts API (`/devices/queries/devices/v1`) with `last_seen` FQL. Discover API fallback for enriched platform data.
**Window:** Live.

#### 10. CrowdStrike Data Ingestion Rate
**Shows:** Events-per-second ingested per CrowdStrike / Falcon-reported vendor over the last window.
**Read:** Shows which Falcon sources are most active. The widget intentionally focuses on CrowdStrike-side ingestion — 3rd-party feed liveness is tracked separately in widget #11.
**Source:** Alerts REST — `postAggregatesAlertsV2` terms aggregation on `source_vendors` (the plural array field that carries the real vendor; `product` is a routing bucket, not a vendor classification). Buckets are deduped via SOURCE_MAP into pretty labels (CrowdStrike, Falcon modules, 3rd-party vendors). LogScale `soc_data_ingestion` saved search is kept as a fallback.
**Window:** Last 7 days.

#### 11. 3rd-Party Feed Silence
**Shows:** Per-vendor age of the most recent alert received from each non-CrowdStrike vendor, with a colored dot indicating freshness.
**Read:** Fast at-a-glance view of which 3rd-party connectors have gone silent. Any vendor sitting in orange or red is a connector-health candidate. Expected universe is bounded by what has produced at least one alert in the trailing 7 days — vendors never seen are not surfaced.
**Thresholds:**
- 🟢 Green — last event < 15 min ago
- 🟡 Yellow — ≥ 15 min
- 🟠 Orange — ≥ 30 min
- 🔴 Red — ≥ 1 h
- 🟥 Dark red — ≥ 4 h
**Source:** Alerts REST — `source_vendors` terms aggregation over the last 7 days to enumerate the vendor universe (excluding CrowdStrike / Falcon), then for each vendor one `getQueriesAlertsV2` call sorted `created_timestamp.desc limit=1` + `postEntitiesAlertsV2` to resolve the latest alert's timestamp. Freshness is computed as `now - created_timestamp` client-side.
**Window:** 7d universe + live timestamp per vendor.

---

### Row 4 — Deep Analytics

#### 12. Sensor Hygiene
**Shows:** Total device count, outdated-sensor count, offline count, and the top-5 agent-version distribution.
**Read:** The outdated count is a quick vulnerability-exposure indicator — endpoints running old sensors miss recent detection updates.
**Source:** `devices-fn` cloud function — `/devices/entities/devices/v2` enriched with `agent_version` aggregation.
**Window:** Live.

#### 13. NIST 800-61 v3 — IR Phases
**Shows:** Distribution of analyst actions across the four NIST 800-61 Incident Response phases: Preparation, Detection & Analysis, Containment/Eradication/Recovery, Post-Incident.
**Read:** A healthy SOC concentrates effort in Detection & Analysis, with meaningful activity in Containment and Post-Incident. All-containment or all-detection distributions suggest workflow gaps.
**Source:** Alerts REST — alert status field as an IR-phase proxy (`new` → Detection, `in_progress` → Containment, `closed` → Post-Incident).
**Window:** Last 7 days.

#### 14. MITRE ATT and CK Coverage (7D)
**Shows:** Alert volume by MITRE ATT and CK tactic over the last 7 days.
**Read:** Reveals which attacker tactics are hitting the environment most often — useful for prioritizing detection engineering and purple-team exercises against under-represented tactics.
**Source:** Alerts REST — aggregation on `tactic` field. 20 rows typical.
**Window:** Last 7 days.

#### 15. Top Impacted Hosts (24H)
**Shows:** A ranked list of hostnames by alert count over the last 24 hours.
**Read:** Hosts at the top are the current blast-radius candidates. Repeated appearances over multiple days suggest a persistent compromise or a noisy production system.
**Source:** Alerts REST — aggregation on `device.hostname`, with 3-field fallback chain (device.hostname → hostname → agent_id).
**Window:** Last 24 hours.

---

## Status Indicators

| Symbol | Meaning |
|--------|---------|
| 🟢 Green dot | Live data from Falcon backend |
| 🟡 Yellow dot | Fallback / mock data (API returned empty or errored) |
| ↑ Up arrow | Metric increased vs. previous period |
| ↓ Down arrow | Metric decreased vs. previous period |

## Data Freshness

| Widget | Refresh |
|--------|---------|
| All Alerts-REST widgets | Every dashboard refresh (~1 min) |
| Agent Health, Sensor Hygiene | Every dashboard refresh (via `devices-fn`) |
| Data Ingestion (LogScale fallback) | Every dashboard refresh — NGSIEM indexing adds ~1–5 min lag |

## Known Limitations

- **Mean-time metrics (MTT/MTTR/MTTD):** Removed from this version. Prior proxy-based implementations were severity-weighted estimates, not clock-time measurements. Will be reintroduced once analyst audit-event data is available in the tenant.
- **Charlotte Credits / Workflow Status widgets:** Removed. The Charlotte AI quota API returns 404 from the Foundry context, and the tenant has 0 `FusionWorkflowEvent` entries for the monitored workflow names. See prior project notes.
- **Open Cases / Detection Rate (24H) widgets:** No longer rendered. Alert volume and status are represented through SOC Capacity, Backlog Trend, Age Distribution, and FP Rate — a tighter cross-section of the same signal.
- **New Threats Pulse source mapping:** Depends on the `product` field in alerts. Tenants that use custom product labels or 3rd-party connectors not in SOURCE_MAP will see those alerts bucketed under "Other".
- **MITRE Coverage:** Shows only tactics that produced alerts in the window. Un-covered tactics (zero alerts) are not surfaced — pair this widget with your detection-engineering coverage matrix for the full picture.

## Backend Dependencies

| Component | Role |
|-----------|------|
| `devices-fn` (Python cloud fn) | Hosts API fetcher for Agent Health + Sensor Hygiene |
| `incidents-fn` (Python cloud fn) | Legacy — Open Cases fallback (widget currently retired) |
| `workflow-executions-fn` (Python cloud fn) | Legacy — Charlotte Agent Executions (widget currently retired) |
| `charlotte-credits-fn` (Python cloud fn) | Legacy — Charlotte quota (widget currently retired) |
| LogScale saved searches | `soc_data_ingestion`, `soc_mitre_tactics`, `soc_dark_hours_heatmap`, `soc_analyst_activity`, `soc_threat_timeline` (fallbacks) |

For deployment, rollback, and version history, see `PROJECT_STATUS.md` and `VERSION_MANAGEMENT.md` at the app root.
