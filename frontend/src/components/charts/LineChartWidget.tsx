import { useEffect, useRef, useMemo } from 'react';
import { createChart, ColorType, AreaSeries, type IChartApi } from 'lightweight-charts';
import { useTheme } from '@/hooks/useTheme';

interface LineChartWidgetProps {
  data: { time: string | number; value: number }[];
  color?: string;
  height?: number;
}

export default function LineChartWidget({ data, color = 'hsl(142, 76%, 36%)', height = 220 }: LineChartWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const { theme } = useTheme();

  const memoData = useMemo(() => data, [data]);

  useEffect(() => {
    if (!containerRef.current) return;

    const isDark = theme === 'dark';

    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: isDark ? 'hsl(240, 5%, 65%)' : 'hsl(215, 16%, 35%)',
        fontFamily: 'IBM Plex Mono',
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)' },
        horzLines: { color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)' },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
      crosshair: {
        vertLine: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', width: 1, style: 3, labelVisible: false },
        horzLine: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', width: 1, style: 3 },
      },
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: color,
      topColor: color.replace(')', ', 0.3)').replace('hsl(', 'hsla('),
      bottomColor: 'transparent',
      lineWidth: 2,
    });

    // Ensure data is strictly sorted and unique by time for lightweight-charts
    const uniqueData = Array.from(
      memoData.reduce((map, item) => {
        const ts = typeof item.time === 'number' ? item.time : Math.floor(new Date(item.time).getTime() / 1000);
        map.set(ts, { ...item, time: ts });
        return map;
      }, new Map<number, any>()).values()
    ).sort((a, b) => a.time - b.time);

    // Filter out consecutive duplicate prices to prevent flat lines during weekends/nights
    const transitionsOnly = uniqueData.filter((p, i, arr) => i === 0 || p.value !== arr[i - 1].value);

    series.setData(transitionsOnly as any);
    chart.timeScale().fitContent();
    chartRef.current = chart;

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [memoData, color, height]);

  return <div ref={containerRef} className="w-full" />;
}
