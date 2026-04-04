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
      rightPriceScale: { 
        borderVisible: false,
        alignLabels: true,
      },
      timeScale: { 
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        barSpacing: 10,
        rightOffset: 12,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      crosshair: {
        vertLine: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', width: 1, style: 3, labelVisible: true },
        horzLine: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', width: 1, style: 3, labelVisible: true },
      },
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: color,
      topColor: color.replace(')', ', 0.3)').replace('hsl(', 'hsla('),
      bottomColor: 'transparent',
      lineWidth: 2,
    });

    // 1. Sort and ensure unique timestamps
    const uniqueData = Array.from(
      memoData.reduce((map, item) => {
        const ts = typeof item.time === 'number' ? item.time : Math.floor(new Date(item.time).getTime() / 1000);
        map.set(ts, { ...item, time: ts });
        return map;
      }, new Map<number, any>()).values()
    ).sort((a, b) => a.time - b.time);

    // 2. [ NEW ] The Weekend/Night Gap Killer
    const filteredData = uniqueData.filter((item, index, array) => {
      if (index === 0) return true;
      const prev = array[index - 1];
      
      // Only keep the point if the value actually changed
      return item.value !== prev.value;
    });

    // 3. Set the filtered data
    series.setData(filteredData as any);
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
