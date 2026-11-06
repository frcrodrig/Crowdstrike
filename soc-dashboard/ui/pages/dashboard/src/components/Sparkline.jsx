import React, { useEffect, useRef } from 'react';
import { useTheme } from '../contexts/theme-context';

/**
 * Sparkline - Mini line chart for KPI trend visualization
 *
 * @param {Array} data - Array of numeric values to plot
 * @param {Number} width - Width in pixels (default: auto)
 * @param {Number} height - Height in pixels (default: 35)
 * @param {String} trendColor - Override color (default: auto based on trend)
 */
export function Sparkline({ data = [], width = null, height = 35, trendColor = null }) {
  const canvasRef = useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!canvasRef.current || !data || data.length < 2) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    // Set actual canvas size (accounting for devicePixelRatio for sharp rendering)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Calculate min/max for normalization
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1; // Avoid division by zero

    // Determine trend (compare first and last values)
    const trendUp = data[data.length - 1] >= data[0];

    // Theme-aware colors
    const colorUp = theme === 'dark' ? '#10b981' : '#059669';    // Green
    const colorDown = theme === 'dark' ? '#ef4444' : '#dc2626';  // Red
    const lineColor = trendColor || (trendUp ? colorUp : colorDown);
    const fillColor = trendColor
      ? `${trendColor}20`
      : (trendUp ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)');

    // Calculate points
    const padding = 2;
    const chartWidth = rect.width - (padding * 2);
    const chartHeight = rect.height - (padding * 2);
    const stepX = chartWidth / (data.length - 1);

    const points = data.map((value, index) => {
      const x = padding + (index * stepX);
      const normalizedValue = (value - min) / range;
      const y = padding + chartHeight - (normalizedValue * chartHeight);
      return { x, y };
    });

    // Draw gradient fill area
    if (points.length > 0) {
      const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
      gradient.addColorStop(0, fillColor);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.beginPath();
      ctx.moveTo(points[0].x, rect.height - padding);
      points.forEach((point, index) => {
        if (index === 0) {
          ctx.lineTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.lineTo(points[points.length - 1].x, rect.height - padding);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    points.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.stroke();

    // Optional: Draw dots on endpoints
    const drawDot = (point, radius = 2) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = lineColor;
      ctx.fill();
    };

    // Draw first and last points
    if (points.length > 0) {
      drawDot(points[0], 1.5);
      drawDot(points[points.length - 1], 2);
    }

  }, [data, theme, height, trendColor]);

  if (!data || data.length < 2) {
    return null; // Don't render if insufficient data
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: width ? `${width}px` : '100%',
        height: `${height}px`,
        display: 'block',
        marginTop: '8px'
      }}
    />
  );
}

/**
 * Generate mock trend data for sparklines
 * @param {Number} baseValue - Starting value
 * @param {Number} points - Number of data points (default: 24)
 * @param {Number} volatility - Variation percentage (default: 0.15 = ±15%)
 * @param {String} trend - 'up', 'down', or 'neutral'
 */
export function generateSparklineData(baseValue, points = 24, volatility = 0.15, trend = 'neutral') {
  const data = [];
  let current = baseValue;

  // Trend factor: how much to bias the random walk
  const trendFactor = trend === 'up' ? 0.02 : trend === 'down' ? -0.02 : 0;

  for (let i = 0; i < points; i++) {
    // Random walk with trend bias
    const randomChange = (Math.random() - 0.5) * 2 * volatility;
    const change = randomChange + trendFactor;
    current = current * (1 + change);

    // Ensure positive values
    current = Math.max(current * 0.5, current);

    data.push(Math.round(current));
  }

  return data;
}
