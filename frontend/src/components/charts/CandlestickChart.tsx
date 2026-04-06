import { useEffect, useRef, useMemo } from 'react';
import { createChart, ColorType, CandlestickSeries, type IChartApi } from 'lightweight-charts';
import type { CandleData } from '@/data/mockData';
import { useTheme } from '@/hooks/useTheme';

interface CandlestickChartProps {
  data: CandleData[];
  height?: number;
}

export default function CandlestickChart({ data, height = 400 }: CandlestickChartProps) {
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
        vertLine: { color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)', width: 1, style: 3, labelVisible: false },
        horzLine: { color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)', width: 1, style: 3 },
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: isDark ? 'hsl(161, 94%, 30%)' : 'hsl(142, 76%, 36%)',
      downColor: isDark ? 'hsl(0, 84%, 60%)' : 'hsl(0, 84%, 55%)',
      borderUpColor: isDark ? 'hsl(161, 94%, 35%)' : 'hsl(142, 76%, 40%)',
      borderDownColor: isDark ? 'hsl(0, 84%, 60%)' : 'hsl(0, 84%, 55%)',
      wickUpColor: isDark ? 'hsl(161, 94%, 40%)' : 'hsl(142, 76%, 45%)',
      wickDownColor: isDark ? 'hsl(0, 84%, 65%)' : 'hsl(0, 84%, 60%)',
    });

    // Ensure data is strictly sorted and unique by time for lightweight-charts
    const uniqueData = Array.from(
      memoData.reduce((map, item) => {
        const ts = typeof item.time === 'number' ? item.time : Math.floor(new Date(item.time).getTime() / 1000);
        map.set(ts, { ...item, time: ts });
        return map;
      }, new Map<number, any>()).values()
    ).sort((a, b) => a.time - b.time);

    // Filter out consecutive duplicate candlesticks to prevent flat lines during weekends/nights
    const transitionsOnly = uniqueData.filter((p, i, arr) => 
      i === 0 || 
      p.open !== arr[i - 1].open || 
      p.high !== arr[i - 1].high || 
      p.low !== arr[i - 1].low || 
      p.close !== arr[i - 1].close
    );

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
  }, [memoData, height]);

  return <div ref={containerRef} className="w-full" />;
}
