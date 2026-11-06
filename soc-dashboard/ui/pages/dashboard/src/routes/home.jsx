import React, { useContext, useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import { FalconApiContext } from "../contexts/falcon-api-context";
import { useTheme } from "../contexts/theme-context";
import { useWidgetStatus } from "../contexts/widget-status-context";
import { MockDataIndicator } from "../components/MockDataIndicator";
import { ThreatTimelineChart } from "../components/ThreatTimelineChart";
import { SOCBreakingPoint } from "../components/SOCBreakingPoint";
import { AIServicesWidget } from "../components/AIServicesWidget";
import { TopNoisyDetectionsWidget } from "../components/TopNoisyDetectionsWidget";
import { FeedSilenceWidget } from "../components/FeedSilenceWidget";
import {
  AgentHealthWidget,
  SOCOpsStatus,
  DarkHoursWidget,
  AnalystActivityChart,
  MitreCoverageWidget,
  TopImpactedHostsWidget,
  AlertBacklogTrendWidget,
  SensorHygieneWidget,
  NewThreatsPulseWidget,
  CaseAgeDistributionWidget
} from "../components/Widgets";
import { Chart, registerables } from 'chart.js';
import { executeSavedSearch } from "../api-engine";
import {
  initializeErrorBoundary,
  trackWidgetHealth,
  withErrorTracking,
  setWidgetError,
  clearWidgetError
} from "../error-boundary";
import {
  initialKPIData,
  initialTimelineData,
  initialAgentData,
  initialIngestionData,
  initialDarkHoursHeatmap,
  initialDarkHoursCurrent,
  initialAnalystActivityData,
  initialMitreCoverageData,
  initialTopHostsData,
  initialBacklogTrendData,
  initialSensorHygieneData,
  initialNewThreatsPulseData,
  initialCaseAgeData,
  initialTopNoisyDetectionsData
} from "../data/mockData";
import { VERSION } from "../version";
import {
  executeAllQueriesParallel,
  getQueryResult,
  getCacheStats
} from "../utils/parallel-logscale-executor";

Chart.register(...registerables);

function Home() {
  const { falcon, isInitialized } = useContext(FalconApiContext);
  const { theme, setTheme } = useTheme();
  const { setWidgetMockData, isUsingMockData, getWidgetError, showIndicators, toggleIndicators } = useWidgetStatus();
  const [countdown, setCountdown] = useState(10);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Cycle through themes on button click
  const cycleTheme = () => {
    console.log('Theme button clicked! Current theme:', theme);
    const themes = ['dark', 'light'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    console.log('Switching to:', nextTheme);
    setTheme(nextTheme);
  };

  // KPI State
  const [socCapacity, setSocCapacity] = useState({ received: 0, resolved: 0 });
  const [aiServices, setAiServices] = useState([]);
  const [topNoisyDetections, setTopNoisyDetections] = useState(initialTopNoisyDetectionsData);
  const [feedSilence, setFeedSilence] = useState([]);

  // Phase 3 State
  const [timelineData, setTimelineData] = useState(initialTimelineData);

  // Phase 4 State
  const [agentStatusData, setAgentStatusData] = useState(initialAgentData.status);
  const [agentPlatformData, setAgentPlatformData] = useState(initialAgentData.platform);
  const [agentVersionData, setAgentVersionData] = useState(initialAgentData.version);
  const [ingestionData, setIngestionData] = useState(initialIngestionData);
  const [darkHoursHeatmap, setDarkHoursHeatmap] = useState(initialDarkHoursHeatmap);
  const [darkHoursCurrent, setDarkHoursCurrent] = useState(initialDarkHoursCurrent);

  // Phase 5 State
  const [analystActivityData, setAnalystActivityData] = useState(initialAnalystActivityData);
  const [mitreCoverageData, setMitreCoverageData] = useState(initialMitreCoverageData);
  const [topHostsData, setTopHostsData] = useState(initialTopHostsData);
  const [backlogTrendData, setBacklogTrendData] = useState(initialBacklogTrendData);
  const [sensorHygieneData, setSensorHygieneData] = useState(initialSensorHygieneData);
  const [newThreatsPulseData, setNewThreatsPulseData] = useState(initialNewThreatsPulseData);
  const [caseAgeData, setCaseAgeData] = useState(initialCaseAgeData);

  // Initialize error boundary on mount
  useEffect(() => {
    initializeErrorBoundary();
    console.log('[SOC-DASH] Error boundary initialized');
  }, []);

  // Live clock update
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Refresh countdown
  useEffect(() => {
    const countdownTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          triggerGlobalRefresh();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownTimer);
  }, []);

  // NOTE (2026-09-27): Removed the recursive setTimeout loop that used to
  // overwrite mttd/mttr/mttc with Math.random() values every 20-60 seconds.
  // It was clobbering real LogScale data loaded by triggerGlobalRefresh() /
  // executeAllQueriesParallel(), making the "real vs mock" validation added
  // in v0.7.9-v0.7.16 meaningless. See INCONSISTENCIES_REPORT.md (item 1).
  // Real refreshes now happen exclusively via the countdown-driven
  // triggerGlobalRefresh() call below and the 10s refresh cycle.

  // Initial data load
  useEffect(() => {
    triggerGlobalRefresh();
  }, []);

  /**
   * Process results from parallel LogScale execution
   * Maps query results to widget state updates
   */
  const processQueryResults = (queryResults) => {
    console.log('[SOC-DASH] Processing parallel query results...');

    // Process threat timeline
    // soc_threat_timeline (utils/logscale-queries.js) returns raw timechart rows
    // shaped [{_bucket: <timestamp>, severity_label: "Critical"|"High"|"Medium"|"Low", _count: N}, ...]
    // but ThreatTimelineChart expects one row per hour: {hour, critical, high, medium, low}.
    // This transform was previously implemented correctly in the dead fetchThreatTimeline()
    // function but never wired into the real pipeline (see INCONSISTENCIES_REPORT.md) -
    // the widget's MockDataIndicator was clearing (looking like success) while the chart
    // silently rendered nothing because the shape didn't match.
    const threatTimeline = getQueryResult('soc_threat_timeline');
    if (threatTimeline?.status === 'success' && threatTimeline.data?.length > 0) {
      const hourlyMap = {};
      threatTimeline.data.forEach(item => {
        const hour = new Date(item._bucket).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        if (!hourlyMap[hour]) {
          hourlyMap[hour] = { hour, critical: 0, high: 0, medium: 0, low: 0 };
        }
        const severity = (item.severity_label || '').toLowerCase();
        if (hourlyMap[hour][severity] !== undefined) {
          hourlyMap[hour][severity] = item._count || 0;
        }
      });
      const transformedTimeline = Object.values(hourlyMap).sort((a, b) => a.hour.localeCompare(b.hour));

      if (transformedTimeline.length > 0) {
        setTimelineData(transformedTimeline);
        setWidgetMockData('threat-timeline', false, null); // Clear red dot
        console.log('[Threat Timeline] ✅ Real data loaded:', transformedTimeline.length, 'hours');
      } else {
        setWidgetMockData('threat-timeline', true, 'Query data could not be transformed'); // Show red dot
      }
    } else if (threatTimeline?.status === 'success') {
      setTimelineData([]);
      setWidgetMockData('threat-timeline', false, null);
      console.log('[Threat Timeline] ✅ Real data loaded: 0 events');
    } else {
      setWidgetMockData('threat-timeline', true, 'No data available for time range'); // Show red dot
    }

    // Process severity distribution — widget removed; skipping any state write.

    // Process FP ratio — widget removed; skipping any state write.

    // Process agent platform
    const agentPlatform = getQueryResult('soc_agent_platform');
    if (agentPlatform?.status === 'success' && agentPlatform.data?.length > 0) {
      setAgentPlatformData(agentPlatform.data);
      setWidgetMockData('agent-health', false, null); // Clear red dot
      console.log('[Agent Platform] ✅ Real data loaded');
    } else if (agentPlatform?.status === 'success') {
      // LogScale empty — Devices API useEffect has real data; don't overwrite with zeros
      setWidgetMockData('agent-health', false, null);
      console.log('[Agent Platform] LogScale empty — keeping Devices API data');
    } else {
      setWidgetMockData('agent-health', true, 'No data available for time range'); // Show red dot
    }

    // Process agent version
    const agentVersion = getQueryResult('soc_agent_version');
    if (agentVersion?.status === 'success' && agentVersion.data?.length > 0) {
      setAgentVersionData(agentVersion.data);
      // Note: agent-health widget already handled by agent platform
      console.log('[Agent Version] ✅ Real data loaded');
    } else {
      // Note: Only show red dot if both agent queries fail (handled by agent platform check)
    }

    // Process dark hours heatmap
    const darkHours = getQueryResult('soc_dark_hours_heatmap');
    if (darkHours?.status === 'success' && darkHours.data?.length > 0) {
      setDarkHoursHeatmap(darkHours.data);
      const totalActivity = darkHours.data.reduce((sum, row) => sum + (Number(row.activity_count) || 0), 0);
      if (totalActivity > 0) {
        setWidgetMockData('dark-hours', false, null); // Clear red dot
        console.log('[Dark Hours] ✅ Real data loaded');
      } else {
        setWidgetMockData('dark-hours', true, 'Heatmap flatlined — no activity in any cell');
      }
    } else if (darkHours?.status === 'success') {
      setDarkHoursHeatmap([]);
      setWidgetMockData('dark-hours', true, 'No activity data available');
      console.log('[Dark Hours] ⚠️ 0 events — flagged as mock');
    } else {
      setWidgetMockData('dark-hours', true, 'No data available for time range'); // Show red dot
    }

    // Process analyst activity
    // soc_analyst_activity returns raw per-event rows {analyst, action, @timestamp, action_count}
    // with no duration or phase field. Per product decision (2026-09-28), each `action` value
    // is mapped to one of the 4 NIST 800-61 v3 IR phases, and the number of actions (not real
    // elapsed hours - there is no duration data available) is used as the activity-volume proxy
    // per phase. Actions with no clear phase mapping are excluded (Preparation has no supporting
    // event type in this data source, so it will read 0 unless/until a real signal is added).
    const ANALYST_ACTION_PHASE_MAP = {
      detection_update: 'detection',
      detection_assign: 'detection',
      incident_create: 'detection',
      incident_close: 'postIncident',
      host_contain: 'containment'
    };
    const analystActivity = getQueryResult('soc_analyst_activity');
    if (analystActivity?.status === 'success' && analystActivity.data?.length > 0) {
      const byAnalyst = {};
      analystActivity.data.forEach(row => {
        const phase = ANALYST_ACTION_PHASE_MAP[row.action];
        if (!phase) return; // unmapped action - no phase signal, intentionally excluded
        const name = row.analyst || 'Unknown';
        if (!byAnalyst[name]) {
          byAnalyst[name] = { name, preparation: 0, detection: 0, containment: 0, postIncident: 0 };
        }
        byAnalyst[name][phase] += row.action_count || 1;
      });
      const transformedAnalyst = Object.values(byAnalyst);

      if (transformedAnalyst.length > 0) {
        setAnalystActivityData(transformedAnalyst);
        setWidgetMockData('analyst-activity', false, null); // Clear red dot
        console.log('[Analyst Activity] ✅ Real data loaded:', transformedAnalyst.length, 'analysts');
      } else {
        setWidgetMockData('analyst-activity', true, 'No mappable actions in query result'); // Show red dot
      }
    } else if (analystActivity?.status === 'success') {
      setAnalystActivityData([]);
      setWidgetMockData('analyst-activity', false, null);
      console.log('[Analyst Activity] ✅ Real data loaded: 0 events');
    } else {
      setWidgetMockData('analyst-activity', true, 'No data available for time range'); // Show red dot
    }

    // Process MITRE ATT&CK coverage
    const mitreCoverage = getQueryResult('soc_mitre_coverage');
    if (mitreCoverage?.status === 'success' && mitreCoverage.data?.length > 0) {
      setMitreCoverageData(mitreCoverage.data);
      setWidgetMockData('mitre-coverage', false, null);
      console.log('[MITRE Coverage] ✅ Real data loaded');
    } else if (mitreCoverage?.status === 'success') {
      setMitreCoverageData([]);
      setWidgetMockData('mitre-coverage', false, null);
      console.log('[MITRE Coverage] ✅ Real data loaded: 0 tactics');
    } else {
      setWidgetMockData('mitre-coverage', true, 'No data available for time range');
    }

    // Process Top Impacted Hosts
    const topHosts = getQueryResult('soc_top_hosts');
    if (topHosts?.status === 'success' && topHosts.data?.length > 0) {
      setTopHostsData(topHosts.data);
      setWidgetMockData('top-hosts', false, null);
      console.log('[Top Hosts] ✅ Real data loaded:', topHosts.data.length);
    } else if (topHosts?.status === 'success') {
      setTopHostsData([]);
      setWidgetMockData('top-hosts', true, 'Hostname aggregation not supported in tenant');
    } else {
      setWidgetMockData('top-hosts', true, 'No data available for time range');
    }

    // Process Alert Backlog Trend
    const backlogTrend = getQueryResult('soc_backlog_trend');
    if (backlogTrend?.status === 'success' && backlogTrend.data?.length > 0) {
      setBacklogTrendData(backlogTrend.data);
      setWidgetMockData('backlog-trend', false, null);
      console.log('[Backlog Trend] ✅ Real data loaded:', backlogTrend.data.length, 'days');
    } else if (backlogTrend?.status === 'success') {
      setBacklogTrendData([]);
      setWidgetMockData('backlog-trend', false, null);
    } else {
      setWidgetMockData('backlog-trend', true, 'No data available for time range');
    }

    // Process New Threats Pulse
    const pulse = getQueryResult('soc_new_threats_pulse');
    if (pulse?.status === 'success' && pulse.data) {
      setNewThreatsPulseData(pulse.data);
      setWidgetMockData('new-threats-pulse', false, null);
      console.log('[New Threats Pulse] ✅ Real data loaded:', pulse.data.total, 'alerts last 1h');
    } else {
      setWidgetMockData('new-threats-pulse', true, 'No data available for time range');
    }

    // Process Case Age Distribution
    const caseAge = getQueryResult('soc_case_age');
    if (caseAge?.status === 'success' && caseAge.data?.length > 0) {
      setCaseAgeData(caseAge.data);
      setWidgetMockData('case-age', false, null);
      console.log('[Case Age] ✅ Real data loaded:', caseAge.data.length, 'buckets');
    } else if (caseAge?.status === 'success') {
      setCaseAgeData([]);
      setWidgetMockData('case-age', false, null);
    } else {
      setWidgetMockData('case-age', true, 'No data available for time range');
    }

    // Process SOC Capacity (resolved vs received, 24h)
    const socCapacityResult = getQueryResult('soc_capacity');
    if (socCapacityResult?.status === 'success' && socCapacityResult.data) {
      const received = socCapacityResult.data.received ?? 0;
      const resolved = socCapacityResult.data.resolved ?? 0;
      setSocCapacity({ received, resolved });
      if (received > 0 || resolved > 0) {
        setWidgetMockData('breaking-point', false, null);
        console.log(`[SOC Capacity] ✅ Real data: received=${received} resolved=${resolved} (load ${resolved>0?Math.round(received/resolved*100):'∞'}%)`);
      } else {
        setWidgetMockData('breaking-point', true, 'No alert activity in last 24h');
      }
    } else {
      setWidgetMockData('breaking-point', true, 'No data available for time range');
    }

    // Process data ingestion
    // soc_data_ingestion returns raw groupBy rows shaped {'#repo', events, last_event}
    // but SOCOpsStatus / w-soc-ops-status expects {source, rate, status, eventsPerSec}
    // (see initialIngestionData in mockData.js). This widget was never actually mounted
    // in the JSX before, so this mismatch went unnoticed - the MockDataIndicator was
    // clearing (looking like real data) while nothing rendered. Transform here so the
    // now-mounted widget gets a coherent shape: rate is events/sec averaged over the
    // 7-day query window (see start: "7d" in parallel-logscale-executor.js), and
    // status flags sources with no event in the last 60 minutes as "stale".
    const dataIngestion = getQueryResult('soc_data_ingestion');
    if (dataIngestion?.status === 'success' && dataIngestion.data?.length > 0) {
      const WINDOW_SECONDS = 7 * 24 * 3600;
      const transformedIngestion = dataIngestion.data.map(row => {
        const repoName = row['#repo'] || row.repo || 'Unknown';
        const events = row.events || 0;
        const rate = events / WINDOW_SECONDS; // events/sec average
        const lastEventMs = row.last_event ? new Date(row.last_event).getTime() : null;
        const staleMinutes = lastEventMs != null ? (Date.now() - lastEventMs) / 60000 : null;
        const status = staleMinutes == null ? 'unknown' : (staleMinutes > 60 ? 'stale' : 'healthy');
        return { source: repoName, rate, eventsPerSec: rate, status };
      });
      setIngestionData(transformedIngestion);
      setWidgetMockData('soc-ops-status', false, null); // Clear red dot
      console.log('[Data Ingestion] ✅ Real data loaded:', transformedIngestion.length, 'sources');
    } else if (dataIngestion?.status === 'success') {
      setIngestionData([]);
      setWidgetMockData('soc-ops-status', false, null);
      console.log('[Data Ingestion] ✅ Real data loaded: 0 sources');
    } else {
      setWidgetMockData('soc-ops-status', true, 'No data available for time range'); // Show red dot
    }

    // Disconnected 3rd-Party Sources widget removed in v0.7.118 — tenant's
    // `product` field only contains first-party values; no 3rd-party vendors
    // match SOURCE_MAP's 3rd-party group, so the signal is permanently zero.

    // Detection Rate widget removed in v0.7.113 — superseded by SOC Capacity.

    // Process AI services (top AI vendors by DNS requests)
    const aiServicesResult = getQueryResult('soc_ai_services');
    if (aiServicesResult?.status === 'success' && aiServicesResult.data?.length > 0) {
      setAiServices(aiServicesResult.data);
      setWidgetMockData('ai-services', false, null);
      console.log('[AI Services] ✅ Real data loaded:', aiServicesResult.data.length, 'services');
    } else if (aiServicesResult?.status === 'success') {
      setAiServices([]);
      setWidgetMockData('ai-services', true, 'DNS/domain field not aggregatable in tenant');
    } else {
      setWidgetMockData('ai-services', true, 'No data available for time range');
    }

    // MTTA/MTTR widget removed in v0.7.120 — insufficient closed-alert
    // volume with assigned_to_timestamp populated to drive a meaningful
    // real-time metric; fetcher and state deleted.

    // Process Top Noisy Detections (7d)
    const topNoisyResult = getQueryResult('soc_top_noisy_detections');
    if (topNoisyResult?.status === 'success' && topNoisyResult.data?.length > 0) {
      setTopNoisyDetections(topNoisyResult.data);
      setWidgetMockData('top-noisy', false, null);
      console.log('[Top Noisy] ✅ Real data loaded:', topNoisyResult.data.length, 'detections');
    } else {
      // No aggregatable detection name field — show mock, flag as mock
      setTopNoisyDetections(initialTopNoisyDetectionsData);
      setWidgetMockData('top-noisy', true, 'Detection name field not aggregatable — showing sample data');
    }

    // Process 3rd-Party Feed Silence
    const feedSilenceResult = getQueryResult('soc_feed_silence');
    if (feedSilenceResult?.status === 'success' && feedSilenceResult.data?.length > 0) {
      setFeedSilence(feedSilenceResult.data);
      setWidgetMockData('feed-silence', false, null);
      console.log('[Feed Silence] ✅ Real data loaded:', feedSilenceResult.data.length, 'vendors');
    } else {
      setFeedSilence([]);
      setWidgetMockData('feed-silence', true, feedSilenceResult?.error || 'No 3rd-party vendors in window');
    }

    // Process Mean Time to Resolution (MTTR)
    // Removed in v0.7.96 — MTT/MTTR/MTTD widgets deleted (proxy data from severity).

    // Process Mean Time to Triage (MTT)
    // Removed in v0.7.96 — see note above.

    // Process Mean Time to Detect (MTTD)
    // Removed in v0.7.96 — see note above.

    console.log('[SOC-DASH] ✅ All widgets processed');
  };

  /**
   * Update sparkline trend data with realistic variation
   * Called after each data refresh to show evolving trends
   */
  const updateSparklineTrends = () => {
    // Detection Rate sparkline removed in v0.7.113 (widget deleted).
    console.log('[SOC-DASH] Sparkline trends updated');
  };

  const triggerGlobalRefresh = async () => {
    console.log('[SOC-DASH] Global refresh triggered:', new Date().toISOString());
    setIsRefreshing(true);

    // Stagger widget refreshes for wave effect
    const widgets = [
      'w-breaking-point',
      'w-threat-timeline',
      'w-agent-health', 'w-dark-hours', 'w-soc-ops-status',
      'w-analyst-activity', 'w-mitre-coverage', 'w-top-hosts', 'w-backlog-trend',
      'w-sensor-hygiene', 'w-new-threats-pulse', 'w-case-age',
      'w-ai-services', 'w-top-noisy', 'w-feed-silence'
    ];

    widgets.forEach((widgetId, index) => {
      setTimeout(() => {
        const widget = document.getElementById(widgetId);
        if (widget) {
          widget.classList.add('refreshing');
          setTimeout(() => widget.classList.remove('refreshing'), 1000);
        }
      }, index * 80);
    });

    // Execute ALL data fetches in parallel
    console.log('[SOC-DASH] Executing parallel data fetches...');
    const parallelStartTime = performance.now();

    try {
      // Execute LogScale queries in parallel
      await Promise.allSettled([
        // LogScale queries (all 12 in parallel)
        executeAllQueriesParallel(falcon, setWidgetMockData).then(queryResults => {
          console.log('[SOC-DASH] LogScale queries completed');
          processQueryResults(queryResults);
        })
      ]);

      const parallelEndTime = performance.now();
      const parallelDuration = ((parallelEndTime - parallelStartTime) / 1000).toFixed(2);

      console.log(`[SOC-DASH] ✅ All parallel fetches completed in ${parallelDuration}s`);
      console.log('[SOC-DASH] Cache stats:', getCacheStats());

      // Update sparkline trends after data refresh
      updateSparklineTrends();

    } catch (error) {
      console.error('[SOC-DASH] Parallel refresh error:', error);
      // Fall back to mock data for all widgets
      console.log('[SOC-DASH] Using mock data fallback');
    }

    // Complete refresh after all widgets animated
    setTimeout(() => {
      setIsRefreshing(false);
    }, widgets.length * 80 + 1000);
  };

  // NOTE (2026-09-28): Removed dead fetchMTTD()/fetchDetectionRate()/fetchOpenCases()
  // functions here (and further below fetchThreatTimeline, fetchSeverityDistribution,
  // fetchFPRatio, fetchAgentHealth, fetchWorkflowStatus, fetchIngestionHealth,
  // fetchDarkHours, fetchAnalystActivity, fetchMITREHeatmap, plus their
  // generateMock*() helpers and the withErrorTracking/safeExecuteSavedSearch/
  // executeSavedSearch/falcon.data.savedSearch call sites). None of these were ever
  // invoked from any useEffect - the real pipeline is executeAllQueriesParallel() +
  // processQueryResults() above. Several used the deprecated falcon.data.savedSearch()
  // API. Their correct transform logic (where any existed, e.g. threat-timeline's
  // hourly bucketing) was already ported into processQueryResults(). See
  // INCONSISTENCIES_REPORT.md and the widget audit for details.

  useEffect(() => {
    if (!isInitialized || !falcon) return;

    let cancelled = false;

    const fetchAgentHealthDirect = async () => {
      console.log('[Agent Health API] Calling devices-fn...');
      try {
        const cf = falcon.cloudFunction({ name: 'devices-fn' });
        const raw = await cf.execute({ method: 'GET', path: '/execute', params: {} });
        if (cancelled) return;

        console.log('[Agent Health API] devices-fn raw result:', JSON.stringify(raw));
        const result = raw?.body ?? raw;

        const windows = result?.windows ?? 0;
        const linux   = result?.linux   ?? 0;
        const mac     = result?.mac     ?? 0;
        const online  = result?.online  ?? 0;
        const stale   = result?.stale   ?? 0;
        const offline = result?.offline ?? 0;
        const total   = result?.total   ?? 0;
        const source  = result?.source  ?? 'unknown';

        if (source === 'error') {
          console.warn('[Agent Health API] devices-fn returned error:', result?.error);
          setWidgetMockData('agent-health', true, `Devices API error: ${result?.error}`);
          return;
        }

        console.log(`[Agent Health API] source:${source} Windows:${windows} Linux:${linux} Mac:${mac} Total:${total} Online:${online} Stale:${stale} Offline:${offline}`);

        const newPlatformData = [
          { platform: 'Windows', count: windows },
          { platform: 'Linux',   count: linux },
          { platform: 'macOS',   count: mac }
        ].filter(p => p.count > 0);

        const newStatusData = [
          { status: 'Online',  count: online },
          { status: 'Stale',   count: stale },
          { status: 'Offline', count: offline }
        ];

        setAgentPlatformData(newPlatformData);
        setAgentStatusData(newStatusData);
        setWidgetMockData('agent-health', false, null);
        console.log(total > 0
          ? `[Agent Health API] ✅ Real data from ${source}: ${total} total devices`
          : '[Agent Health API] ✅ Confirmed: 0 enrolled devices');

        // Also populate Sensor Hygiene from the same response
        setSensorHygieneData({
          total: Number(total || 0),
          outdatedCount: Number(result.outdated_count || 0),
          offline: Number(result.offline || 0),
          versionDistribution: result.version_distribution || {}
        });
        if (result.version_distribution && Object.keys(result.version_distribution).length > 0) {
          setWidgetMockData('sensor-hygiene', false, null);
          console.log('[Sensor Hygiene] ✅ Real data loaded:', Object.keys(result.version_distribution).length, 'versions');
        } else {
          setWidgetMockData('sensor-hygiene', true, 'Version data unavailable');
        }
      } catch (err) {
        console.error('[Agent Health API] devices-fn call failed:', err?.message ?? err);
      }
    };

    fetchAgentHealthDirect();

    return () => { cancelled = true; };
  }, [isInitialized, falcon]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * NOTE (v0.7.113): Removed Detection Rate REST fallback useEffect — the
   * detection-rate widget was deleted and its state no longer exists.
   */

  /**
   * NOTE (v0.7.96): The Falcon REST fallback useEffect for MTTR/MTTC/MTTD was
   * removed along with the three KPI widgets (w-mttr/w-mttc/w-mttd). Those
   * widgets displayed severity-weighted proxies — not real clock-time — and
   * produced near-identical values (~13–16 min). The entire fetch block
   * (`fetchMeanTimesFromApi`) and its setter calls were deleted.
   */


  // NOTE (2026-09-28): Removed dead fetchThreatTimeline(), fetchSeverityDistribution(),
  // fetchFPRatio(), fetchAgentHealth(), fetchWorkflowStatus(), fetchIngestionHealth(),
  // fetchDarkHours(), fetchAnalystActivity(), fetchMITREHeatmap(), plus their
  // generateMockDarkHoursData()/generateMockAnalystActivity()/generateMockMITREData()/
  // generateMockTimelineData() helpers. None of these functions were ever invoked from
  // any useEffect or handler — the equivalent logic now lives in processQueryResults(),
  // which is fed by executeAllQueriesParallel(). Kept mock-data fallback behavior
  // (MockDataIndicator / setWidgetMockData) fully intact; only this unreachable dead
  // code was removed. See the earlier NOTE above (fetchMTTD/fetchDetectionRate/
  // fetchOpenCases) for the first cleanup pass.


  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <header className="dash-header">
        <div className={`radar-container ${isRefreshing ? 'refreshing' : ''}`}>
          <div className="radar-sweep"></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: 'auto' }}>
          <span style={{ fontSize: '24px', color: '#ef4444', fontWeight: '700', letterSpacing: '1px' }}>
            CROWDSTRIKE
          </span>
          <span style={{ fontSize: '10px', color: 'var(--accent-info)', opacity: 0.7 }}>{VERSION}</span>
        </div>
        <div style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '24px',
          fontWeight: '700',
          letterSpacing: '1px',
          color: 'var(--text-primary)'
        }}>
          SOC DASHBOARD
          {isRefreshing && <span style={{ fontSize: '12px', marginLeft: '12px', color: 'var(--accent-info)' }}>• Refreshing</span>}
        </div>
        <div className="header-meta">
          <div className="title-credit" style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.8 }}>
            Created by Roberto Clavero
          </div>
          <button
            onClick={toggleIndicators}
            style={{
              padding: '6px 12px',
              backgroundColor: showIndicators ? '#ef4444' : (theme === 'dark' ? '#21242e' : '#ffffff'),
              color: showIndicators ? '#ffffff' : (theme === 'dark' ? '#ffffff' : '#1a1d29'),
              border: `2px solid ${showIndicators ? '#ef4444' : (theme === 'dark' ? '#ffffff' : '#21242e')}`,
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginRight: '8px'
            }}
            onMouseEnter={(e) => {
              e.target.style.opacity = '0.8';
            }}
            onMouseLeave={(e) => {
              e.target.style.opacity = '1';
            }}
            title={showIndicators ? 'Hide data source indicators' : 'Show data source indicators'}
          >
            {showIndicators ? '● DATA' : '○ DATA'}
          </button>
          <button
            onClick={cycleTheme}
            style={{
              padding: '6px 12px',
              backgroundColor: theme === 'dark' ? '#21242e' : '#ffffff',
              color: theme === 'dark' ? '#ffffff' : '#1a1d29',
              border: `2px solid ${theme === 'dark' ? '#ffffff' : '#21242e'}`,
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = theme === 'dark' ? '#2d3142' : '#f8f9fa';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = theme === 'dark' ? '#21242e' : '#ffffff';
            }}
          >
            {theme === 'dark' ? 'LIGHT' : 'DARK'}
          </button>
          <div className="refresh-countdown" style={{ backgroundColor: '#10b981', color: '#ffffff' }}>
            {isRefreshing ? 'Refreshing...' : `Refresh: ${countdown}s`}
          </div>
        </div>
      </header>

      {/* MAIN GRID */}
      <main className="dashboard-grid">
        {/* Row 1: KPI Strip */}
        <section className="widget-row main-content">
          <div className="widget large" id="w-threat-timeline" style={{ position: 'relative' }}>
            <MockDataIndicator
              show={isUsingMockData('threat-timeline')}
              tooltip={getWidgetError('threat-timeline') || 'Using fallback data'}
              queryName="soc_threat_timeline"
            />
            <div className="widget-title">Threat Timeline (24H)</div>
            <div style={{ height: '100%', minHeight: 0 }}>
              <ThreatTimelineChart data={timelineData} />
            </div>
          </div>
          <div className="widget large" id="w-top-noisy" style={{ position: 'relative' }}>
            <MockDataIndicator
              show={isUsingMockData('top-noisy')}
              tooltip={getWidgetError('top-noisy') || 'Using fallback data'}
              queryName="soc_top_noisy_detections"
            />
            <div style={{ height: '100%', minHeight: 0 }}>
              <TopNoisyDetectionsWidget data={topNoisyDetections} />
            </div>
          </div>
        </section>

        {/* Row 2: Threat Landscape */}
        <section className="widget-row main-content">
          <div className="widget large" id="w-breaking-point" style={{ position: 'relative' }}>
            <MockDataIndicator
              show={isUsingMockData('breaking-point')}
              tooltip={getWidgetError('breaking-point') || 'Using fallback data'}
              queryName="soc_capacity"
            />
            <div className="widget-title">SOC Capacity</div>
            <div style={{ height: '100%', minHeight: 0, width: '100%' }}>
              <SOCBreakingPoint received={socCapacity.received} resolved={socCapacity.resolved} />
            </div>
          </div>
          <div className="widget medium" id="w-backlog-trend" style={{ position: 'relative' }}>
            <MockDataIndicator
              show={isUsingMockData('backlog-trend')}
              tooltip={getWidgetError('backlog-trend') || 'Using fallback data'}
              queryName="soc_backlog_trend"
            />
            <div className="widget-title">Alert Backlog Trend (7D)</div>
            <div style={{ height: '100%', minHeight: 0 }}>
              <AlertBacklogTrendWidget data={backlogTrendData} />
            </div>
          </div>
          <div className="widget large" id="w-new-threats-pulse" style={{ position: 'relative' }}>
            <MockDataIndicator
              show={isUsingMockData('new-threats-pulse')}
              tooltip={getWidgetError('new-threats-pulse') || 'Using fallback data'}
              queryName="soc_new_threats_pulse"
            />
            <div className="widget-title">New Threats Pulse (1H) · by Source</div>
            <div style={{ height: '100%', minHeight: 0 }}>
              <NewThreatsPulseWidget data={newThreatsPulseData} />
            </div>
          </div>
          <div className="widget medium" id="w-case-age" style={{ position: 'relative' }}>
            <MockDataIndicator
              show={isUsingMockData('case-age')}
              tooltip={getWidgetError('case-age') || 'Using fallback data'}
              queryName="soc_case_age"
            />
            <div className="widget-title">Alert Age Distribution</div>
            <div style={{ height: '100%', minHeight: 0 }}>
              <CaseAgeDistributionWidget data={caseAgeData} />
            </div>
          </div>
        </section>

        {/* Row 3: AI + Infrastructure */}
        <section className="widget-row operational">
          <div className="widget medium" id="w-ai-services" style={{ position: 'relative' }}>
            <MockDataIndicator
              show={isUsingMockData('ai-services')}
              tooltip={getWidgetError('ai-services') || 'Using fallback data'}
              queryName="soc_ai_services"
            />
            <div className="widget-title">Top AI Services · DNS Requests (24H)</div>
            <div style={{ height: '100%', minHeight: 0 }}>
              <AIServicesWidget services={aiServices} />
            </div>
          </div>
          <div className="widget large" id="w-dark-hours" style={{ position: 'relative' }}>
            <MockDataIndicator
              show={isUsingMockData('dark-hours')}
              tooltip={getWidgetError('dark-hours') || 'Using fallback data'}
              queryName="soc_dark_hours_heatmap"
            />
            <div className="widget-title">Dark Hours Monitoring</div>
            <div style={{ height: '100%', minHeight: 0 }}>
              <DarkHoursWidget
                heatmapData={darkHoursHeatmap}
                currentDarkData={darkHoursCurrent}
              />
            </div>
          </div>
          <div className="widget medium" id="w-agent-health" style={{ position: 'relative' }}>
            <MockDataIndicator
              show={isUsingMockData('agent-health')}
              tooltip={getWidgetError('agent-health') || 'Using fallback data'}
              queryName="soc_agent_platform + soc_agent_version"
            />
            <div className="widget-title">Agent Health</div>
            <div style={{ height: '100%', minHeight: 0 }}>
              <AgentHealthWidget
                statusData={agentStatusData}
                platformData={agentPlatformData}
                versionData={agentVersionData}
              />
            </div>
          </div>
          <div className="widget medium" id="w-soc-ops-status" style={{ position: 'relative' }}>
            <MockDataIndicator
              show={isUsingMockData('soc-ops-status')}
              tooltip={getWidgetError('soc-ops-status') || 'Using fallback data'}
              queryName="soc_data_ingestion"
            />
            <div className="widget-title">CROWDSTRIKE DATA INGESTION RATE</div>
            <div style={{ height: '100%', minHeight: 0 }}>
              <SOCOpsStatus ingestionData={ingestionData} />
            </div>
          </div>
          <div className="widget medium" id="w-feed-silence" style={{ position: 'relative' }}>
            <MockDataIndicator
              show={isUsingMockData('feed-silence')}
              tooltip={getWidgetError('feed-silence') || 'Using fallback data'}
              queryName="soc_feed_silence"
            />
            <div className="widget-title">3rd-Party Feed Silence</div>
            <div style={{ height: '100%', minHeight: 0 }}>
              <FeedSilenceWidget data={feedSilence} />
            </div>
          </div>
        </section>

        {/* Row 4: Deep Analytics */}
        <section className="widget-row analyst">
          <div className="widget medium" id="w-sensor-hygiene" style={{ position: 'relative' }}>
            <MockDataIndicator
              show={isUsingMockData('sensor-hygiene')}
              tooltip={getWidgetError('sensor-hygiene') || 'Using fallback data'}
              queryName="devices-fn.version_distribution"
            />
            <div className="widget-title">Sensor Hygiene</div>
            <div style={{ height: '100%', minHeight: 0 }}>
              <SensorHygieneWidget data={sensorHygieneData} />
            </div>
          </div>
          <div className="widget medium" id="w-analyst-activity" style={{ position: 'relative' }}>
            <MockDataIndicator
              show={isUsingMockData('analyst-activity')}
              tooltip={getWidgetError('analyst-activity') || 'Using fallback data'}
              queryName="soc_analyst_activity"
            />
            <div className="widget-title">NIST 800-61 v3 - IR Phases</div>
            <div style={{ height: '100%', minHeight: 0 }}>
              <AnalystActivityChart data={analystActivityData} />
            </div>
          </div>
          <div className="widget medium" id="w-mitre-coverage" style={{ position: 'relative' }}>
            <MockDataIndicator
              show={isUsingMockData('mitre-coverage')}
              tooltip={getWidgetError('mitre-coverage') || 'Using fallback data'}
              queryName="soc_mitre_coverage"
            />
            <div className="widget-title">MITRE ATT&CK Coverage (7D)</div>
            <div style={{ height: '100%', minHeight: 0 }}>
              <MitreCoverageWidget data={mitreCoverageData} />
            </div>
          </div>
          <div className="widget medium" id="w-top-hosts" style={{ position: 'relative' }}>
            <MockDataIndicator
              show={isUsingMockData('top-hosts')}
              tooltip={getWidgetError('top-hosts') || 'Using fallback data'}
              queryName="soc_top_hosts"
            />
            <div className="widget-title">Top Impacted Hosts (24H)</div>
            <div style={{ height: '100%', minHeight: 0 }}>
              <TopImpactedHostsWidget data={topHostsData} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export { Home };
