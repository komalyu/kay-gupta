import { useEffect, useRef } from 'react';
import {
  Chart,
  ChartData,
  ChartOptions,
  ChartType,
  registerables,
} from 'chart.js';
import { useTheme } from './ThemeProvider';

Chart.register(...registerables);

interface ChartCanvasProps {
  type: ChartType;
  data: ChartData;
  options?: ChartOptions;
  height?: number;
  ariaLabel: string;
}

export function ChartCanvas({
  type,
  data,
  options,
  height = 240,
  ariaLabel,
}: ChartCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const labelColor = isDark ? '#cbd5e1' : '#334155';
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.08)';

    const baseScales =
      type === 'doughnut'
        ? undefined
        : {
            x: {
              ticks: { color: labelColor },
              grid: { color: gridColor },
              ...(options?.scales?.x ?? {}),
            },
            y: {
              ticks: { color: labelColor },
              grid: { color: gridColor },
              ...(options?.scales?.y ?? {}),
            },
          };

    const mergedOptions: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      ...options,
      scales: baseScales ?? options?.scales,
      plugins: {
        legend: {
          labels: {
            font: {
              family: '"DM Sans", system-ui, sans-serif',
              size: 12,
            },
            color: labelColor,
            boxWidth: 12,
            padding: 14,
          },
        },
        ...options?.plugins,
      },
    };

    chartRef.current = new Chart(canvas, {
      type,
      data,
      options: mergedOptions,
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [type, data, options, isDark]);

  return (
    <div style={{ height }} className="relative w-full">
      <canvas ref={canvasRef} aria-label={ariaLabel} role="img" />
    </div>
  );
}
