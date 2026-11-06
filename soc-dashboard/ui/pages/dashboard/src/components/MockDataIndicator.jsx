import React from 'react';
import { useWidgetStatus } from '../contexts/widget-status-context';
import { useTheme } from '../contexts/theme-context';

/**
 * MockDataIndicator Component
 *
 * Displays a small red dot in the top-right corner of widgets
 * when they are using mock/fallback data instead of live API data.
 *
 * Props:
 * - show: boolean - whether to show the indicator
 * - tooltip: string - optional tooltip text explaining the fallback
 * - queryName: string - optional query name to display before the red dot
 */

export const MockDataIndicator = ({ show, tooltip, queryName }) => {
  const { showIndicators } = useWidgetStatus();
  const { theme } = useTheme();

  if (!show || !showIndicators) return null;

  const title = tooltip || "Using fallback data - API unavailable";

  // Theme-aware colors for better readability
  const queryNameStyles = theme === 'dark'
    ? {
        // Dark theme: light text on dark background
        color: '#fca5a5',  // Light red
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        border: '1px solid rgba(239, 68, 68, 0.3)'
      }
    : {
        // Light theme: white text on red background
        color: '#ffffff',
        backgroundColor: 'rgba(239, 68, 68, 0.95)',
        border: '1px solid rgba(220, 38, 38, 0.5)'
      };

  return (
    <>
      {queryName && (
        <div
          title={title}
          style={{
            position: 'absolute',
            top: '8px',
            right: '20px',
            fontSize: '8px',
            fontFamily: 'monospace',
            fontWeight: '600',
            padding: '3px 6px',
            borderRadius: '3px',
            cursor: 'help',
            zIndex: 10,
            whiteSpace: 'nowrap',
            ...queryNameStyles
          }}
        >
          {queryName}
        </div>
      )}
      <div
        title={title}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: '#ef4444',
          boxShadow: '0 0 4px rgba(239, 68, 68, 0.5)',
          cursor: 'help',
          zIndex: 10,
          animation: 'pulse 2s infinite'
        }}
      />
    </>
  );
};

// Add pulse animation to global styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }
  `;
  document.head.appendChild(styleSheet);
}
