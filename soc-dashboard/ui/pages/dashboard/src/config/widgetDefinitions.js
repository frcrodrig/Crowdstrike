/**
 * Widget Definitions - Configuration and metadata for all dashboard widgets
 */

export const widgetDefinitions = [
  {
    id: 'w-open-incidents',
    title: 'Open Incidents',
    phase: 1,
    refreshInterval: 60000,
    queryName: 'soc_open_cases'
  },
  {
    id: 'w-mttc',
    title: 'Mean Time to Close',
    phase: 1,
    refreshInterval: 60000,
    queryName: null // Calculated metric
  },
  {
    id: 'w-mttd',
    title: 'Mean Time to Detect',
    phase: 1,
    refreshInterval: 60000,
    queryName: null // Calculated metric
  },
  {
    id: 'w-mttr',
    title: 'Mean Time to Respond',
    phase: 1,
    refreshInterval: 60000,
    queryName: null // Calculated metric
  },
  {
    id: 'w-detection-rate',
    title: 'Detection Rate',
    phase: 1,
    refreshInterval: 60000,
    queryName: 'soc_detection_rate'
  },
  {
    id: 'w-breaking-point',
    title: 'Breaking Point',
    phase: 2,
    refreshInterval: 300000,
    queryName: null // Calculated metric
  },
  {
    id: 'w-threat-timeline',
    title: 'Threat Timeline',
    phase: 3,
    refreshInterval: 60000,
    queryName: 'soc_threat_timeline'
  },
  {
    id: 'w-workflow-status',
    title: 'Workflow Status',
    phase: 3,
    refreshInterval: 60000,
    queryName: 'soc_workflow_status'
  },
  {
    id: 'w-fp-ratio',
    title: 'False Positive Ratio',
    phase: 3,
    refreshInterval: 300000,
    queryName: 'soc_fp_ratio'
  },
  {
    id: 'w-analyst-activity',
    title: 'Analyst Activity',
    phase: 5,
    refreshInterval: 60000,
    queryName: 'soc_analyst_activity'
  },
  {
    id: 'w-mitre-heatmap',
    title: 'MITRE ATT&CK Heatmap',
    phase: 5,
    refreshInterval: 300000,
    queryName: 'soc_mitre_tactics'
  },
  {
    id: 'w-dark-hours',
    title: 'Dark Hours Coverage',
    phase: 4,
    refreshInterval: 300000,
    queryName: 'soc_dark_hours_heatmap'
  },
  {
    id: 'w-agent-health',
    title: 'Agent Health',
    phase: 4,
    refreshInterval: 60000,
    queryName: 'soc_agent_platform'
  },
  {
    id: 'w-ingestion',
    title: 'Data Ingestion',
    phase: 4,
    refreshInterval: 60000,
    queryName: 'soc_data_ingestion'
  },
  {
    id: 'w-severity-dist',
    title: 'Severity Distribution',
    phase: 3,
    refreshInterval: 60000,
    queryName: 'soc_severity_dist'
  },
  {
    id: 'w-charlotte-credit',
    title: 'Charlotte Credit Usage',
    phase: 2,
    refreshInterval: 300000,
    queryName: null // Internal metric
  },
  {
    id: 'w-workflow-executions',
    title: 'Workflow Executions',
    phase: 3,
    refreshInterval: 60000,
    queryName: 'soc_workflow_status'
  }
];

// Helper to get widget by ID
export const getWidgetById = (id) => {
  return widgetDefinitions.find(w => w.id === id);
};

// Helper to get widgets by phase
export const getWidgetsByPhase = (phase) => {
  return widgetDefinitions.filter(w => w.phase === phase);
};
