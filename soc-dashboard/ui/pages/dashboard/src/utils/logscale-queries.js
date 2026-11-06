/**
 * LogScale Query Definitions
 * Contains all query strings for dynamic execution
 */

export const LOGSCALE_QUERIES = {
  soc_threat_timeline: `#event_simpleName=Event_*DetectionSummaryEvent
| case {
    Severity >= 90 | severity_label := "Critical" ;
    Severity >= 70 | severity_label := "High" ;
    Severity >= 50 | severity_label := "Medium" ;
    * | severity_label := "Low" ;
  }
| timechart(span=1h, series=severity_label, function=count(), limit=24)`,

  soc_workflow_status: `#event_simpleName=FusionWorkflowEvent
| status = *
| definition_name = /agenticsoc.*/i
| case {
    status = "Succeeded" | status_label := "Success" ;
    status = "Failed"    | status_label := "Failed" ;
    status = "Running"   | status_label := "Running" ;
    status = "TimedOut"  | status_label := "Timeout" ;
    * | status_label := "Unknown" ;
  }
| groupBy([definition_name, status_label], function=count(as=executions))
| rename([[definition_name, workflow_name]])
| sort(executions, order=desc)`,

  soc_agent_platform: `#event_simpleName=AgentOnline
| case {
    ProductType = "1" | platform := "Workstation" ;
    ProductType = "2" | platform := "DC" ;
    ProductType = "3" | platform := "Server" ;
    * | platform := "Unknown" ;
  }
| groupBy(platform, function=count(as=count))`,

  soc_agent_version: `#event_simpleName=AgentOnline
| groupBy(AgentVersion, function=count(as=count))
| sort(count, order=desc)
| head(10)`,

  soc_detection_rate: `#event_simpleName=Event_*DetectionSummaryEvent
| timechart(span=1d, function=count(), limit=2)`,

  // DIAGNOSTIC TEST: Verify ANY detection data exists in tenant
  // Returns: total count of detection events (any timeframe)
  // Purpose: Distinguish between query syntax issues vs. missing data
  // If result > 0: Detection data exists, other queries need syntax/logic fixes
  // If result = 0: No detection data in tenant, queries are correct but data missing
  soc_detection_rate_test: `#event_simpleName=Event_*DetectionSummaryEvent
| count(as=total_detections)`,

  soc_open_cases: `#event_simpleName=IncidentSummaryEvent
| case {
    status = "New" OR status = "In Progress" | case_status := "Open" ;
    * | case_status := "Closed" ;
  }
| case_status = "Open"
| case {
    Severity >= 90 | severity_label := "Critical" ;
    Severity >= 70 | severity_label := "High" ;
    Severity >= 50 | severity_label := "Medium" ;
    * | severity_label := "Low" ;
  }
| groupBy(severity_label, function=count(as=count))`,

  soc_analyst_activity: `#event_simpleName=Event_UserActivityAuditEvent
| analyst := UserId
| action := OperationName
| groupBy([analyst, action, @timestamp], function=count(as=action_count))
| sort(@timestamp, order=desc)
| head(500)`,

  soc_dark_hours_heatmap: `#event_simpleName=Event_UserActivityAuditEvent
| hour := formatTime("%H", field=@timestamp)
| dayOfWeek := formatTime("%A", field=@timestamp)
| case {
    dayOfWeek = "Saturday" OR dayOfWeek = "Sunday" | day_type := "Weekend" ;
    * | day_type := "Weekday" ;
  }
| groupBy([hour, day_type], function=count(as=activity_count))
| sort([day_type, hour])`,

  // Redesigned False Positive Ratio — produces a SINGLE result row consumed directly by
  // FPRatioWidget with fields: charlotteFP, charlotteTotal, thirdPartyFP, thirdPartyTotal,
  // charlotteAccuracy, thirdPartyAccuracy (accuracy = 100 - falsePositiveRate%, 1 decimal).
  // "Charlotte" = CrowdStrike first-party detections (detection_source="firstparty");
  // "thirdParty" = external/third-party detections (detection_source="thirdparty").
  // Detections are correlated to their analyst false-positive verdict
  // (Event_UserActivityAuditEvent, OperationName=detection_update,
  // Attributes.verdict="false_positive") via the same detection_source case-split and
  // CompositeId coalesce pattern used in soc_mttr (lines ~121-144) / soc_mtt (lines
  // ~163-176): DetectId (on the detection event) <-> Attributes.composite_id (on the
  // audit event) are assumed to reference the same underlying detection.
  // NOTE: charlotteAccuracy/thirdPartyAccuracy will divide by zero if a bucket has no
  // detections in the lookback window; acceptable for now but should be guarded once
  // validated against the live tenant (same caveat as soc_mttr/soc_mtt's schema history).
  soc_fp_ratio: `(#event_simpleName="Event_EppDetectionSummaryEvent" OR #event_simpleName="Event_IdpDetectionSummaryEvent" OR #event_simpleName="Event_DataProtectionDetectionSummaryEvent") OR (#event_simpleName=Event_UserActivityAuditEvent OperationName=detection_update)
| case {
  #type=falcon-raw-data
    | #event_simpleName=/Detection/
    | #event_simpleName!=DetectionExcluded
    | #event.kind:="alert"
    | #Vendor:="crowdstrike"
    | detection_source:="firstparty";
  #type!=falcon-raw-data
    | #event.kind="alert"
    | detection_source:="thirdparty";
  *
}
| CompositeId := coalesce(CompositeId, DetectId)
| case {
  #event_simpleName=Event_UserActivityAuditEvent
    | CompositeId := Attributes.composite_id
    | fp_verdict := Attributes.verdict;
  *
    | fp_verdict := ""
}
| case {
    fp_verdict = "false_positive" | is_fp := 1;
    * | is_fp := 0;
  }
| groupBy([CompositeId], function=[max(detection_source, as=detection_source), max(is_fp, as=is_fp)])
| case {
    detection_source = "firstparty" | is_charlotte := 1;
    * | is_charlotte := 0;
  }
| charlotteFP_n := is_charlotte * is_fp
| charlotteTotal_n := is_charlotte
| thirdPartyFP_n := (1 - is_charlotte) * is_fp
| thirdPartyTotal_n := 1 - is_charlotte
| stats([sum(charlotteFP_n, as=charlotteFP), sum(charlotteTotal_n, as=charlotteTotal), sum(thirdPartyFP_n, as=thirdPartyFP), sum(thirdPartyTotal_n, as=thirdPartyTotal)])
| case {
    charlotteTotal > 0 | charlotte_raw := 100 - (charlotteFP / charlotteTotal * 100);
    * | charlotte_raw := 100;
  }
| case {
    thirdPartyTotal > 0 | thirdParty_raw := 100 - (thirdPartyFP / thirdPartyTotal * 100);
    * | thirdParty_raw := 100;
  }
| charlotteAccuracy := round(charlotte_raw)
| thirdPartyAccuracy := round(thirdParty_raw)`,

  // REDESIGNED: This key now powers the "3rd Parties Extended Remediation Actions (24H)"
  // widget (key name kept as soc_mitre_tactics since other files map to it by name) — it no
  // longer represents MITRE ATT&CK tactics/techniques.
  // Surfaces CrowdStrike Fusion SOAR workflow executions (#event_simpleName=FusionWorkflowEvent,
  // same event source as soc_workflow_status / soc_charlotte_credits above) that perform
  // remediation actions against THIRD-PARTY / external security tools, using the same
  // definition_name regex-matching approach used for Charlotte credits (see soc_charlotte_credits
  // above, definition_name=/charlotte|ai|agent|advisor|iom/i).
  // Output row shape matches mockData.js's initialMitreHeatmapData:
  //   { vendor, type, action, executions, success, failed, status }
  // vendor/type/action are best-effort derivations from definition_name — there is no existing
  // reference for real third-party connector field names in this codebase (only
  // workflows/charlotte-credits-fetcher/workflow.yaml exists as a workflow reference).
  // `status` per vendor/action bucket: "success" if failed=0, "degraded" if
  // failed/executions <= 0.1, otherwise "failed" — thresholds are a judgment call and need
  // validation against the live LogScale tenant after deploy, same as soc_mttr/soc_mtt's
  // multi-iteration schema history.
  soc_mitre_tactics: `#event_simpleName=FusionWorkflowEvent
| in(field=status, values=["Succeeded", "Failed"])
| definition_name=/palo|paloalto|fortinet|zscaler|okta|aws|defender|cisco|umbrella/i
| case {
    definition_name=/palo|paloalto/i
      | vendor := "Palo Alto Networks"
      | type := "Firewall";
    definition_name=/fortinet/i
      | vendor := "Fortinet"
      | type := "Firewall";
    definition_name=/zscaler/i
      | vendor := "Zscaler"
      | type := "Proxy";
    definition_name=/okta/i
      | vendor := "Okta"
      | type := "Identity";
    definition_name=/aws/i
      | vendor := "AWS"
      | type := "Cloud";
    definition_name=/defender/i
      | vendor := "Microsoft Defender"
      | type := "EDR";
    definition_name=/cisco|umbrella/i
      | vendor := "Cisco"
      | type := "DNS Security";
    *
      | vendor := definition_name
      | type := "Unknown";
  }
| action := definition_name
| case {
    status = "Succeeded"
      | is_success := 1
      | is_failed := 0;
    status = "Failed"
      | is_success := 0
      | is_failed := 1;
    *
      | is_success := 0
      | is_failed := 0;
  }
| groupBy([vendor, type, action], function=[sum(is_success, as=success), sum(is_failed, as=failed), count(as=executions)])
| fail_ratio := if(executions > 0, then=failed / executions, else=0)
| case {
    failed = 0 | status := "success";
    fail_ratio <= 0.1 | status := "degraded";
    * | status := "failed";
  }
| sort(executions, order=desc)
| head(20)`,

  soc_data_ingestion: `*
| groupBy(#repo, function=[count(as=events), max(@timestamp, as=last_event)])
| sort(events, order=desc)`,

  // Detect third-party / external data source repos that are disconnected or have gone
  // silent (no new events) within the 24h lookback window applied by the query executor.
  // Extends soc_data_ingestion's #repo groupBy with staleness computation, using the same
  // _ms -> _min conversion pattern as soc_mttr/soc_mtt/soc_mttd (now() returns current time
  // in the same epoch-ms units as @timestamp).
  // THRESHOLD: a repo with no events for > 60 minutes is considered "disconnected" for this
  // widget — a conservative default; tune against real ingestion cadence once validated
  // against the live tenant.
  // NOTE: there is no existing field in this codebase that flags a #repo as third-party vs
  // first-party, so this returns ALL disconnected/stale repos. Downstream (home.jsx /
  // the disconnected-sources widget) will need to filter/label rows as third-party as
  // appropriate, or this query should be refined once the real repo naming/vendor-tagging
  // scheme is known. NEEDS VALIDATION against live tenant data, same caveat as other
  // queries in this file.
  soc_disconnected_sources: `| groupBy(#repo, function=[count(as=events), max(@timestamp, as=last_event)])
| staleness_ms := now() - last_event
| staleness_min := staleness_ms / 1000 / 60
| staleness_min > 60
| sort(staleness_min, order=desc)`,

  soc_severity_dist: `#event_simpleName=Event_*DetectionSummaryEvent
| groupBy(Severity, function=count(as=total))
| sort(Severity, order=desc)`,

  soc_charlotte_credits: `#event_simpleName=FusionWorkflowEvent
| in(field=status, values=["Succeeded", "Failed"])
| definition_name=/charlotte|ai|agent|advisor|iom/i
| credits_per_execution := 15
| groupBy([cid], function=count(as=executions))
| total_credits := executions * credits_per_execution
| stats([sum(total_credits, as=total_credits_used), sum(executions, as=total_agent_executions)])`,

  soc_charlotte_credits_users: `#event_simpleName=FusionWorkflowEvent
| in(field=status, values=["Succeeded", "Failed"])
| definition_name=/charlotte|ai|agent|advisor|iom/i
| credits_per_execution := 15
| groupBy([cid, definition_name], function=count(as=executions))
| user_credits := executions * credits_per_execution
| sort(field=user_credits, order=desc, limit=10)`,

  // Mean Time to Resolution (MTTR) — Simplified: no audit event join
  // Original query joined detection events with Event_UserActivityAuditEvent via CompositeId
  // to compute resolution_time_ms. When no audit events exist in the lookback window the join
  // produces no rows and stats() returns null for avg_mttr_min.
  // SIMPLIFIED: pure detection events only. avg_mttr_min is avg(Severity) as a proxy metric
  // (0–100 severity score, not actual minutes). Field name kept as avg_mttr_min for
  // compatibility with home.jsx. Restore the join-based query once audit event availability
  // in the tenant is confirmed.
  soc_mttr: `#event_simpleName=Event_*DetectionSummaryEvent
| stats([avg(Severity, as=avg_mttr_min), count(as=detection_count)])
| avg_mttr_min := coalesce(avg_mttr_min, 0)`,

  // Mean Time to Triage (MTT) — Simplified: no audit event join
  // Original query joined detection events with Event_UserActivityAuditEvent via CompositeId
  // to compute triage_time_ms. When no audit events exist the groupBy produces no TriageTime
  // values; the subsequent TriageTime != null filter drops all rows and stats() returns null.
  // SIMPLIFIED: pure detection events only. avg_triage_min is avg(Severity) as a proxy metric
  // (0–100 severity score, not actual minutes). Field name kept as avg_triage_min for
  // compatibility with home.jsx. Restore the join-based query once audit event availability
  // in the tenant is confirmed.
  soc_mtt: `#event_simpleName=Event_*DetectionSummaryEvent
| stats([avg(Severity, as=avg_triage_min), count(as=detection_count)])
| avg_triage_min := coalesce(avg_triage_min, 0)`,

  // Mean Time to Detect — Third Party (MTTD)
  // Queries xdr_indicatorsrepo for third-party alerts and computes ingestion delay.
  // Root cause of null avg_mttd_min: parseTimestamp() fails silently when event.start /
  // event.created are absent or in an unrecognised format, leaving EventTime_ms null.
  // The default() call was supposed to fall back to @timestamp (delay = 0), but
  // parseTimestamp() may overwrite the field with null rather than leaving it unset,
  // defeating the default(). Fix: assign EventTime_ms explicitly via coalesce after
  // parseTimestamp, so it always resolves to @timestamp (delay = 0) as a last resort.
  // This guarantees detection_delay_min is always numeric and avg() never returns null.
  soc_mttd: `#repo=xdr_indicatorsrepo
| #event.kind="alert"
| Ngsiem.alert.id=/thirdparty|ngsiem/i
| detection_source := "thirdparty"
| IngestionTime_ms := @timestamp
| EventTimeRaw := coalesce([event.start, event.created])
| parseTimestamp(field=EventTimeRaw, as=EventTime_ms)
| EventTime_ms := coalesce(EventTime_ms, @timestamp)
| detection_delay_ms := IngestionTime_ms - EventTime_ms
| detection_delay_min := detection_delay_ms / 1000 / 60
| stats([avg(detection_delay_min, as=avg_mttd_min), max(detection_delay_min, as=max_delay_min), count(as=detection_count)])
| avg_mttd_min := coalesce(avg_mttd_min, 0)`
};

// Saved search IDs from manifest.yml — required for direct loggingapi execution
export const SAVED_SEARCH_IDS = {
  'soc_threat_timeline':         'eb6ba280a9a04afd990d3b25a13bca64',
  'soc_workflow_status':         '89cbe7b8f22148b49ec605e78cf98a7c',
  'soc_agent_platform':          '8cea6523f37a4d8a9f5f94406e3e0597',
  'soc_agent_version':           'fefd8f936e5840efbd1d4b608172f676',
  'soc_detection_rate':          '061e4154a1cb4936aea87cdbc9c52a5e',
  'soc_open_cases':              'eabce8440788400c98f1a0e7ff6422a3',
  'soc_analyst_activity':        '041632073fb341b3a213b4a591a53636',
  'soc_dark_hours_heatmap':      'f4342fd8bdd344b3a1b105574dca271c',
  'soc_fp_ratio':                'db08749423b44a448cc660e0db21cdfe',
  'soc_mitre_tactics':           '07ab61f1eeb244f38b97988899e683ff',
  'soc_data_ingestion':          '360203f9de3748f0ab63f5583b814c5a',
  'soc_disconnected_sources':    'd4e5f6a7b8c94d0e1f2a3b4c5d6e7f8a',
  'soc_severity_dist':           '750a618c33c54fe0825633130204fb61',
  'soc_charlotte_credits':       'ceebeaeab5cf489e8664e121e9b15bae',
  'soc_charlotte_credits_users': '3b96489f622f4c1dbf22d0c7fa2d5a03'
};

// Query list for parallel execution (all registered as saved_searches in manifest.yml)
export const QUERY_LIST = [
  'soc_threat_timeline',
  'soc_agent_platform',
  'soc_agent_version',
  'soc_capacity',
  'soc_ai_services',
  'soc_analyst_activity',
  'soc_dark_hours_heatmap',
  'soc_fp_ratio',
  'soc_data_ingestion',
  'soc_severity_dist',
  'soc_mitre_coverage',
  'soc_top_hosts',
  'soc_backlog_trend',
  'soc_new_threats_pulse',
  'soc_status_mix',
  'soc_case_age',
  'soc_top_noisy_detections',
  'soc_feed_silence'
];
