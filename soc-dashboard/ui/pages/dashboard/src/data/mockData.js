/**
 * Mock Data for SOC Dashboard
 * Used as fallback when live API data is unavailable
 */

// Charlotte Agent pool - Top 3 fixed, rest randomized
export const topAgents = [
  'Agentic SOC False Positive Detection Analyzer - Falcon26',
  'Lateral Movement Investigation & Impact Analyst - DEMO',
  'Agentic SOC Metrics Analyst - Falcon26'
];

export const randomAgentPool = [
  'Agentic SOC Breaking Point Calculator - Falcon26',
  'Agentic SOC Team Performance and knowledge Analyst - Falcon 26',
  'Agentic SOC Tabletop Exercise Gen. for IR - Falcon26',
  'Agentic SOC Risk Reduction Plan - Falcon26',
  'Agentic SOC Dark Hours GAPs Analyst - Falcon26',
  'Proactive Security & Compliance Readiness Agent - TEST',
  'Detection Tuning & Automation Advisor V2 - Copy'
];

// Generate Charlotte agents with fixed top 3, randomized numbers
export const generateRandomAgents = () => {
  const topThree = topAgents.map(name => ({
    name,
    success: Math.floor(Math.random() * 50) + 30,
    failed: Math.floor(Math.random() * 5),
    pending: Math.floor(Math.random() * 10)
  }));

  const numAdditional = 2 + Math.floor(Math.random() * 3);
  const shuffled = [...randomAgentPool].sort(() => Math.random() - 0.5);
  const additional = shuffled.slice(0, numAdditional).map(name => ({
    name,
    success: Math.floor(Math.random() * 40) + 20,
    failed: Math.floor(Math.random() * 5),
    pending: Math.floor(Math.random() * 8)
  }));

  return [...topThree, ...additional];
};

// Initial KPI mock data
export const initialKPIData = {
  mttd: { crowdstrike: 850, thirdParty: 4.2, count: 847 },
  mttr: { value: '8.7', count: 523 },
  mttc: { value: '2.8', count: 412 },
  detectionRate: { current: 1247, previous: 1189, change: 4.9 },
  openCases: { total: 34, critical: 5, high: 12, medium: 11, low: 6, slaBreach: 2 },
  credits: { used: 14250, limit: 20000, percentage: 71.2 },
  newUseCases: 4
};

// Timeline data
export const initialTimelineData = [
  { hour: '00:00', critical: 12, high: 23, medium: 45, low: 67 },
  { hour: '02:00', critical: 9, high: 21, medium: 41, low: 59 },
  { hour: '04:00', critical: 8, high: 19, medium: 38, low: 52 },
  { hour: '06:00', critical: 11, high: 25, medium: 48, low: 71 },
  { hour: '08:00', critical: 15, high: 32, medium: 61, low: 89 },
  { hour: '10:00', critical: 19, high: 37, medium: 68, low: 96 },
  { hour: '12:00', critical: 22, high: 41, medium: 73, low: 102 },
  { hour: '14:00', critical: 20, high: 38, medium: 70, low: 99 },
  { hour: '16:00', critical: 18, high: 36, medium: 65, low: 94 },
  { hour: '18:00', critical: 14, high: 30, medium: 55, low: 82 },
  { hour: '20:00', critical: 11, high: 28, medium: 51, low: 78 },
  { hour: '22:00', critical: 10, high: 24, medium: 47, low: 69 }
];

export const initialSeverityData = [
  { severity: 'Critical', count: 187 },
  { severity: 'High', count: 423 },
  { severity: 'Medium', count: 891 },
  { severity: 'Low', count: 1247 }
];

export const initialFPRatioData = {
  charlotteFP: 47,
  charlotteTotal: 1234,
  thirdPartyFP: 187,
  thirdPartyTotal: 567,
  charlotteAccuracy: 98.7,
  thirdPartyAccuracy: 87.2
};

// Agent data
export const initialAgentData = {
  status: [
    { status: 'Online', count: 1247 },
    { status: 'Stale', count: 23 },
    { status: 'Offline', count: 8 }
  ],
  platform: [
    { platform: 'Windows', count: 892 },
    { platform: 'Linux', count: 234 },
    { platform: 'macOS', count: 122 }
  ],
  version: [
    { version: '7.10', count: 892 },
    { version: '7.09', count: 234 },
    { version: '7.08', count: 122 }
  ]
};

// Ingestion data
export const initialIngestionData = [
  { source: 'EDR', rate: 12500, status: 'healthy', eventsPerSec: 125 },
  { source: 'Cloud', rate: 8900, status: 'healthy', eventsPerSec: 89 },
  { source: 'Network', rate: 5600, status: 'healthy', eventsPerSec: 56 },
  { source: 'WAF', rate: 6700, status: 'healthy', eventsPerSec: 67 },
  { source: 'Identity', rate: 4200, status: 'healthy', eventsPerSec: 42 },
  { source: 'SaaS', rate: 7100, status: 'healthy', eventsPerSec: 71 }
];

// Dark Hours data
export const initialDarkHoursHeatmap = [
  { hour: 0, day: 'Mon', incidents: 8 },
  { hour: 2, day: 'Mon', incidents: 12 },
  { hour: 4, day: 'Mon', incidents: 15 },
  { hour: 0, day: 'Tue', incidents: 7 },
  { hour: 2, day: 'Tue', incidents: 11 },
  { hour: 4, day: 'Tue', incidents: 14 },
  { hour: 0, day: 'Wed', incidents: 9 },
  { hour: 2, day: 'Wed', incidents: 13 },
  { hour: 4, day: 'Wed', incidents: 16 },
  { hour: 0, day: 'Sat', incidents: 18 },
  { hour: 2, day: 'Sat', incidents: 22 },
  { hour: 4, day: 'Sat', incidents: 25 },
  { hour: 0, day: 'Sun', incidents: 20 },
  { hour: 2, day: 'Sun', incidents: 24 },
  { hour: 4, day: 'Sun', incidents: 28 }
];

export const initialDarkHoursCurrent = {
  coverage: 65,
  alerts: 23,
  unattended: 8
};

// Workflow executions trend
export const initialWorkflowExecutionsTrend = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i}:00`,
  executions: Math.floor(Math.random() * 20) + 20
}));

export const initialWorkflowApprovalPending = 3;

// Charlotte Credit Usage
export const initialCreditTopUsers = [
  { name: 'Sarah Chen', credits: 3420 },
  { name: 'Marcus Johnson', credits: 2890 },
  { name: 'Elena Rodriguez', credits: 2650 },
  { name: 'David Kim', credits: 2100 },
  { name: 'Aisha Patel', credits: 1840 }
];

// Analyst Activity (NIST 800-61 v3)
export const initialAnalystActivityData = [
  { name: 'Sarah Chen', preparation: 0.3, detection: 3.5, containment: 3.0, postIncident: 1.2 },
  { name: 'Marcus Johnson', preparation: 0.5, detection: 4.8, containment: 2.2, postIncident: 0.5 },
  { name: 'Elena Rodriguez', preparation: 0.4, detection: 2.8, containment: 4.0, postIncident: 0.8 },
  { name: 'David Kim', preparation: 0.6, detection: 3.2, containment: 3.5, postIncident: 0.7 },
  { name: 'Aisha Patel', preparation: 0.2, detection: 5.0, containment: 2.0, postIncident: 0.8 }
];

// MITRE Heatmap
export const initialMitreHeatmapData = [
  { vendor: 'Palo Alto Networks', type: 'Firewall', action: 'Block malicious IPs', executions: 45, success: 43, failed: 2, status: 'success' },
  { vendor: 'Zscaler', type: 'SASE', action: 'Isolate compromised users', executions: 28, success: 27, failed: 1, status: 'success' },
  { vendor: 'Okta', type: 'Identity', action: 'Revoke suspicious sessions', executions: 67, success: 65, failed: 2, status: 'success' },
  { vendor: 'AWS Security Hub', type: 'Cloud', action: 'Quarantine EC2 instances', executions: 23, success: 21, failed: 2, status: 'success' },
  { vendor: 'Microsoft Defender', type: 'Endpoint', action: 'Isolate infected endpoints', executions: 89, success: 85, failed: 4, status: 'success' },
  { vendor: 'Netskope', type: 'SaaS', action: 'Block file downloads', executions: 34, success: 32, failed: 2, status: 'success' },
  { vendor: 'Cisco Umbrella', type: 'DNS', action: 'Block malicious domains', executions: 156, success: 154, failed: 2, status: 'success' },
  { vendor: 'Fortinet', type: 'Firewall', action: 'Update firewall rules', executions: 41, success: 38, failed: 3, status: 'success' }
];

export const initialMitreCoverageData = [];

export const initialTopHostsData = [];

export const initialBacklogTrendData = [];

export const initialSensorHygieneData = { total: 0, outdatedCount: 0, offline: 0, versionDistribution: {} };

export const initialNewThreatsPulseData = { total: 0, previous: 0, delta: 0, sources: [] };

export const initialStatusMixData = [];

export const initialCaseAgeData = [];

export const initialCritHighNowData = { total: 0, critical: 0, high: 0, oldestAgeHours: 0 };

export const initialFPRateData = {
  day:  { fp: 18,  tp: 142,  ratePct: 11.25 },
  week: { fp: 143, tp: 1021, ratePct: 12.28 },
};

export const initialTopNoisyDetectionsData = [
  { name: 'Suspicious PowerShell Execution',          count: 2847 },
  { name: 'Credential Access via LSASS Memory',       count: 1932 },
  { name: 'Office Macro Spawning Process',            count: 1518 },
  { name: 'DNS Request to Low-Reputation Domain',     count: 1264 },
  { name: 'Reconnaissance via Net.exe',               count: 1097 },
  { name: 'Impacket SMB Lateral Movement',            count: 843  },
  { name: 'Scheduled Task Persistence',               count: 712  },
  { name: 'Mimikatz Signature Match',                 count: 598  },
  { name: 'Suspicious Child Process from winword.exe',count: 481  },
  { name: 'Living-off-the-Land Binary (LOLBAS)',      count: 364  },
];
