/**
 * API Engine - Executes LogScale saved searches via Falcon API
 * Provides consistent error handling and fallback patterns
 *
 * NOTE: Saved searches are defined in manifest.yml under logscale.saved_searches
 * This engine executes them by name using the Foundry LogScale API
 */

// Available saved search names (defined in manifest.yml)
export const SAVED_SEARCHES = {
  THREAT_TIMELINE: 'soc_threat_timeline',
  WORKFLOW_STATUS: 'soc_workflow_status',
  AGENT_PLATFORM: 'soc_agent_platform',
  AGENT_VERSION: 'soc_agent_version',
  DETECTION_RATE: 'soc_detection_rate',
  OPEN_CASES: 'soc_open_cases',
  ANALYST_ACTIVITY: 'soc_analyst_activity',
  DARK_HOURS_HEATMAP: 'soc_dark_hours_heatmap',
  FP_RATIO: 'soc_fp_ratio',
  MITRE_TACTICS: 'soc_mitre_tactics',
  DATA_INGESTION: 'soc_data_ingestion',
  SEVERITY_DIST: 'soc_severity_dist'
};

export const executeSavedSearch = async (searchName, timeRange = '24h') => {
  console.log(`[API-Engine] Executing saved search: ${searchName} (${timeRange})`);

  try {
    // Get FalconAPI instance from window (set by falcon-api-context)
    const falcon = window.falconApi;

    if (!falcon || !falcon.isConnected) {
      throw new Error('FalconAPI not connected');
    }

    // Execute saved search using Falcon Data API
    // The search must exist in manifest.yml logscale.saved_searches
    const result = await falcon.data.savedSearch(searchName);

    // Transform result to consistent format
    const response = {
      data: result,
      searchName: searchName,
      timestamp: new Date().toISOString()
    };

    console.log(`[API-Engine] Success: ${searchName}`, response);
    return response;

  } catch (error) {
    console.error(`[API-Engine] Failed to execute ${searchName}:`, error.message);
    throw error; // Let caller handle fallback to mock data
  }
};

/**
 * Transform LogScale timechart results to widget format
 * Handles different chart types and time series data
 */
export const transformTimeSeriesData = (rawData, severityMapping) => {
  if (!rawData || !Array.isArray(rawData)) return [];

  return rawData.map(bucket => {
    const transformed = {
      hour: new Date(bucket._bucket).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    };

    // Map severity series to widget format
    if (severityMapping) {
      Object.keys(severityMapping).forEach(key => {
        transformed[key] = bucket[severityMapping[key]] || 0;
      });
    }

    return transformed;
  });
};

/**
 * Transform aggregated results to simple key-value pairs
 */
export const transformAggregatedData = (rawData, keyField, valueField) => {
  if (!rawData || !Array.isArray(rawData)) return [];

  return rawData.map(item => ({
    [keyField]: item[keyField] || 'Unknown',
    [valueField]: item[valueField] || 0
  }));
};
