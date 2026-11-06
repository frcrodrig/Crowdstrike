import React, { useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';

export const ThreatTimelineChart = ({ data }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [themeKey, setThemeKey] = React.useState(0);

  // Detect theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setThemeKey(prev => prev + 1); // Force chart recreation
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    const ctx = chartRef.current.getContext('2d');

    // Get CSS variable values for theme-aware colors
    const computedStyle = getComputedStyle(document.documentElement);
    const textColor = computedStyle.getPropertyValue('--text-secondary').trim();
    const gridColor = computedStyle.getPropertyValue('--border-subtle').trim();

    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Create new chart
    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.hour),
        datasets: [
          {
            label: 'Critical',
            data: data.map(d => d.critical),
            borderColor: '#ef4444',
            backgroundColor: 'transparent',
            tension: 0.4,
            fill: false,
            borderWidth: 2
          },
          {
            label: 'High',
            data: data.map(d => d.high),
            borderColor: '#f59e0b',
            backgroundColor: 'transparent',
            tension: 0.4,
            fill: false,
            borderWidth: 2
          },
          {
            label: 'Medium',
            data: data.map(d => d.medium),
            borderColor: '#8b5cf6',
            backgroundColor: 'transparent',
            tension: 0.4,
            fill: false,
            borderWidth: 2
          },
          {
            label: 'Low',
            data: data.map(d => d.low),
            borderColor: '#10b981',
            backgroundColor: 'transparent',
            tension: 0.4,
            fill: false,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: textColor,
              font: {
                size: 10
              },
              padding: 8,
              usePointStyle: true
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: {
              color: gridColor,
              drawBorder: false
            },
            ticks: {
              color: textColor,
              font: {
                size: 10
              }
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: gridColor,
              drawBorder: false
            },
            ticks: {
              color: textColor,
              font: {
                size: 10
              }
            }
          }
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]); // Chart will recreate when data changes or component remounts

  if (!data || data.length === 0) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        fontSize: '12px'
      }}>
        No timeline data available
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas ref={chartRef}></canvas>
    </div>
  );
};
