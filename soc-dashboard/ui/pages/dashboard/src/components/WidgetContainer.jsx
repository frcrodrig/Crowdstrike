import React from 'react';
import { useWidgetStatus } from '../contexts/widget-status-context';
import { MockDataIndicator } from './MockDataIndicator';

/**
 * WidgetContainer - HOC que envuelve widgets con indicador de mock data
 *
 * Añade automáticamente el punto rojo cuando el widget usa datos mock.
 * Debe usarse alrededor de cada widget card.
 *
 * Props:
 * - widgetId: string - ID único del widget para rastrear estado
 * - children: ReactNode - contenido del widget
 * - style: object - estilos adicionales del contenedor
 */

export const WidgetContainer = ({ widgetId, children, style = {}, ...props }) => {
  const { isUsingMockData, getWidgetError } = useWidgetStatus();
  const usingMock = isUsingMockData(widgetId);
  const error = getWidgetError(widgetId);

  return (
    <div
      style={{
        position: 'relative',
        ...style
      }}
      {...props}
    >
      <MockDataIndicator
        show={usingMock}
        tooltip={error ? `Fallback data: ${error}` : 'Using fallback data - API unavailable'}
      />
      {children}
    </div>
  );
};
