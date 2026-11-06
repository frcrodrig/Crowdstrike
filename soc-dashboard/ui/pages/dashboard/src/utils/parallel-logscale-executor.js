/**
 * Centralized Query Executor
 * Executes all queries in parallel via the Alerts REST API.
 * LogScale savedQuery() routes to the isolated foundry-logging-api namespace
 * (always empty); replaced with postAggregatesAlertsV2 which hits real tenant data.
 */

import { QUERY_LIST } from './logscale-queries.js';
import { executeQueryViaRestApi } from './alerts-rest-executor.js';

// Map query names to widget IDs (matching the id="w-*" in home.jsx)
const QUERY_TO_WIDGET_ID = {
  'soc_threat_timeline': 'threat-timeline',
  'soc_severity_dist': 'severity-dist',
  'soc_fp_ratio': 'fp-ratio',
  'soc_agent_platform': 'agent-health',
  'soc_agent_version': 'agent-health',
  'soc_dark_hours_heatmap': 'dark-hours',
  'soc_analyst_activity': 'analyst-activity',
  'soc_detection_rate': 'detection-rate',
  'soc_capacity': 'breaking-point',
  'soc_ai_services': 'ai-services',
  'soc_data_ingestion': 'soc-ops-status',
  'soc_mitre_coverage': 'mitre-coverage',
  'soc_top_hosts': 'top-hosts',
  'soc_backlog_trend': 'backlog-trend',
  'soc_new_threats_pulse': 'new-threats-pulse',
  'soc_status_mix': 'status-mix',
  'soc_case_age': 'case-age',
  'soc_crithigh_now': 'crithigh-now',
  'soc_top_noisy_detections': 'top-noisy',
  'soc_feed_silence': 'feed-silence',
};

// Cache object to store query results
let queryResultsCache = {};
let lastExecutionTime = null;
let executionInProgress = false;

/**
 * Execute all LogScale queries in parallel
 * @param {Object} falcon - FalconJS SDK instance (unused, kept for compatibility)
 * @param {Function} setWidgetMockData - Callback to track which widgets use mock data
 * @returns {Promise<Object>} Object mapping query names to results
 */
export async function executeAllQueriesParallel(falcon, setWidgetMockData) {
  // Use falcon parameter from React context (not window.falconApi)
  if (!falcon || !falcon.isConnected) {
    console.error('[LogScale Parallel] Falcon not connected');
    executionInProgress = false;
    return queryResultsCache;
  }

  // Prevent concurrent executions
  if (executionInProgress) {
    console.log('[LogScale Parallel] Execution already in progress, returning cached results');
    return queryResultsCache;
  }

  executionInProgress = true;
  console.log('[LogScale Parallel] Starting parallel execution of', QUERY_LIST.length, 'queries');

  const startTime = performance.now();
  const results = {};

  // Execute all queries in parallel via Alerts REST API
  const queryPromises = QUERY_LIST.map(queryName =>
    executeQueryViaRestApi(falcon, queryName, setWidgetMockData, QUERY_TO_WIDGET_ID)
  );

  // Wait for all queries to complete
  const queryResults = await Promise.allSettled(queryPromises);

  // Process results
  queryResults.forEach((result, index) => {
    const queryName = QUERY_LIST[index];
    if (result.status === 'fulfilled') {
      results[queryName] = result.value;
    } else {
      results[queryName] = {
        name: queryName,
        status: 'error',
        error: result.reason?.message || 'Unknown error',
        data: null,
        recordCount: 0,
        executionTime: new Date().toISOString()
      };
    }
  });

  const endTime = performance.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Count successes and failures
  const successCount = Object.values(results).filter(r => r.status === 'success').length;
  const errorCount = QUERY_LIST.length - successCount;

  console.log(
    `[LogScale Parallel] Completed in ${duration}s: ${successCount} success, ${errorCount} errors`
  );

  // Update cache
  queryResultsCache = results;
  lastExecutionTime = new Date();
  executionInProgress = false;

  return results;
}

/**
 * Get a specific query result from cache
 * @param {string} queryName - Name of the query
 * @returns {Object|null} Query result or null if not found
 */
export function getQueryResult(queryName) {
  return queryResultsCache[queryName] || null;
}

/**
 * Check if cache is fresh (less than 10 minutes old)
 * @returns {boolean}
 */
export function isCacheFresh() {
  if (!lastExecutionTime) return false;
  const ageMinutes = (new Date() - lastExecutionTime) / 1000 / 60;
  return ageMinutes < 10;
}

/**
 * Clear the query results cache
 */
export function clearCache() {
  queryResultsCache = {};
  lastExecutionTime = null;
  console.log('[LogScale Parallel] Cache cleared');
}

/**
 * Get cache statistics
 * @returns {Object}
 */
export function getCacheStats() {
  const totalQueries = QUERY_LIST.length;
  const cachedQueries = Object.keys(queryResultsCache).length;
  const successQueries = Object.values(queryResultsCache).filter(r => r.status === 'success').length;

  return {
    totalQueries,
    cachedQueries,
    successQueries,
    errorQueries: cachedQueries - successQueries,
    lastExecutionTime,
    cacheAge: lastExecutionTime ? `${((new Date() - lastExecutionTime) / 1000 / 60).toFixed(1)}m` : 'N/A',
    isFresh: isCacheFresh()
  };
}
