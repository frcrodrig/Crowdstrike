import React, { createContext, useState, useContext } from 'react';

/**
 * Widget Status Context
 *
 * Tracks which widgets are using mock data vs real API data.
 * Used to display visual indicators (red dot) when fallback is active.
 */

const WidgetStatusContext = createContext();

export const WidgetStatusProvider = ({ children }) => {
  // Map of widget ID to status: { usingMockData: boolean, lastError: string, lastUpdate: Date }
  const [widgetStatus, setWidgetStatus] = useState({});

  // Toggle to show/hide indicators globally (default: hidden until user enables)
  const [showIndicators, setShowIndicators] = useState(false);

  const setWidgetMockData = (widgetId, isMock, error = null) => {
    setWidgetStatus(prev => ({
      ...prev,
      [widgetId]: {
        usingMockData: isMock,
        lastError: error,
        lastUpdate: new Date()
      }
    }));
  };

  const isUsingMockData = (widgetId) => {
    return widgetStatus[widgetId]?.usingMockData || false;
  };

  const getWidgetError = (widgetId) => {
    return widgetStatus[widgetId]?.lastError || null;
  };

  const toggleIndicators = () => {
    setShowIndicators(prev => !prev);
  };

  return (
    <WidgetStatusContext.Provider value={{
      widgetStatus,
      setWidgetMockData,
      isUsingMockData,
      getWidgetError,
      showIndicators,
      toggleIndicators
    }}>
      {children}
    </WidgetStatusContext.Provider>
  );
};

export const useWidgetStatus = () => {
  const context = useContext(WidgetStatusContext);
  if (!context) {
    throw new Error('useWidgetStatus must be used within WidgetStatusProvider');
  }
  return context;
};
