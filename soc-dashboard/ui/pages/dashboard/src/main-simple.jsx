import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/index.css'

function SimpleDashboard() {
  return (
    <div className="dashboard-container">
      <header className="dash-header">
        <div className="title-block">
          <span className="title-main" style={{ fontSize: '24px', color: '#ef4444', fontWeight: '700', letterSpacing: '1px' }}>
            CROWDSTRIKE
          </span>
          <span className="title-sub">SOC Operations Center</span>
        </div>
        <div className="header-meta">
          <div className="clock-display">Test Dashboard</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
            <div style={{
              fontSize: '12px',
              fontWeight: '700',
              color: '#f59e0b',
              letterSpacing: '0.5px',
              animation: 'blink 1.5s ease-in-out infinite'
            }}>
              BREAKING POINT REACHED
            </div>
            <div style={{
              fontSize: '13px',
              fontWeight: '700',
              color: '#ef4444',
              opacity: 1,
              letterSpacing: '0.5px'
            }}>
              HULL BREACH
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-grid">
        <section className="widget-row kpi-strip">
          <div className="widget kpi">
            <div className="widget-title">Mean Time to Detect</div>
            <div className="metric-value good">4.2<span className="metric-unit">min</span></div>
            <div className="metric-sublabel">847 detections</div>
          </div>
          <div className="widget kpi">
            <div className="widget-title">Mean Time to Respond</div>
            <div className="metric-value warning">18.7<span className="metric-unit">hrs</span></div>
            <div className="metric-sublabel">523 responses</div>
          </div>
          <div className="widget kpi">
            <div className="widget-title">Mean Time to Contain</div>
            <div className="metric-value good">2.8<span className="metric-unit">min</span></div>
            <div className="metric-sublabel">412 workflows</div>
          </div>
          <div className="widget kpi">
            <div className="widget-title">Detection Rate (24H)</div>
            <div className="metric-value">1247</div>
            <div className="metric-sublabel">↑ 4.9% vs yesterday</div>
          </div>
          <div className="widget kpi">
            <div className="widget-title">Open Cases</div>
            <div className="metric-value critical">34</div>
            <div className="metric-sublabel">5 critical, 12 high</div>
          </div>
          <div className="widget kpi">
            <div className="widget-title">Charlotte Credit Usage</div>
            <div className="metric-value warning">71<span className="metric-unit">%</span></div>
            <div className="metric-sublabel">14,250 / 20,000</div>
          </div>
        </section>

        <section className="widget-row main-content">
          <div className="widget large">
            <div className="widget-title">Threat Timeline (24H)</div>
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Chart Widget Placeholder
            </div>
          </div>
          <div className="widget medium">
            <div className="widget-title">SOC Capacity</div>
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Gauge Widget Placeholder
            </div>
          </div>
          <div className="widget medium">
            <div className="widget-title">False Positive Ratio</div>
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--accent-success)', fontSize: '48px', fontWeight: '700' }}>
              12.3%
            </div>
          </div>
        </section>

        <section className="widget-row operational">
          <div className="widget medium">
            <div className="widget-title">Agent Health</div>
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Agent Status</div>
          </div>
          <div className="widget medium">
            <div className="widget-title">Charlotte Agent Executions</div>
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Workflow Status</div>
          </div>
          <div className="widget large">
            <div className="widget-title">Dark Hours Monitoring</div>
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Dark Hours Data</div>
          </div>
          <div className="widget medium">
            <div className="widget-title">Data Ingestion</div>
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Ingestion Status</div>
          </div>
        </section>

        <section className="widget-row analyst">
          <div className="widget large">
            <div className="widget-title">Analyst Activity (8H Timeline)</div>
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Activity Chart</div>
          </div>
          <div className="widget large">
            <div className="widget-title">MITRE ATT&CK Matrix (7D)</div>
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>MITRE Heatmap</div>
          </div>
        </section>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('app')).render(
  <React.StrictMode>
    <SimpleDashboard />
  </React.StrictMode>,
)
