import { useEffect, useRef, useMemo, memo } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries, type IChartApi } from 'lightweight-charts';
import type { CandleData } from '@/data/mockData';
import { useTheme } from '@/hooks/useTheme';

interface CandlestickChartProps {
  data: CandleData[];
  height?: number;
}

const CandlestickChart = memo(function CandlestickChart({ data, height = 400 }: CandlestickChartProps) {
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
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)' },
        horzLines: { color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)' },
      },
      rightPriceScale: { 
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.25 }, // Leave space for volume
      },
      timeScale: { 
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)', width: 1, style: 3, labelVisible: false },
        horzLine: { color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)', width: 1, style: 3 },
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: isDark ? 'hsl(161, 94%, 30%)' : 'hsl(142, 76%, 36%)',
      downColor: isDark ? 'hsl(0, 84%, 60%)' : 'hsl(0, 84%, 55%)',
      borderUpColor: isDark ? 'hsl(161, 94%, 35%)' : 'hsl(142, 76%, 40%)',
      borderDownColor: isDark ? 'hsl(0, 84%, 60%)' : 'hsl(0, 84%, 55%)',
      wickUpColor: isDark ? 'hsl(161, 94%, 40%)' : 'hsl(142, 76%, 45%)',
      wickDownColor: isDark ? 'hsl(0, 84%, 65%)' : 'hsl(0, 84%, 60%)',
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '', // Overlay on price scale
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 }, // Stick to bottom 20%
    });

    // 1. Unify time formats and remove duplicates
    const uniqueMap = new Map<number, any>();
    memoData.forEach(item => {
      const ts = typeof item.time === 'number' ? item.time : Math.floor(new Date(item.time).getTime() / 1000);
      uniqueMap.set(ts, { ...item, time: ts });
    });

    const sortedData = Array.from(uniqueMap.values()).sort((a, b) => a.time - b.time);

    // 2. Filter out flatline data (Only if price hasn't moved AND volume is 0/missing)
    const scrubbedData = sortedData.filter((p, i, arr) => {
      if (i === 0) return true;
      const prev = arr[i - 1];
      const hasMoved = p.open !== prev.open || p.high !== prev.high || p.low !== prev.low || p.close !== prev.close;
      const hasVolume = (p.volume || 0) > 0;
      return hasMoved || hasVolume;
    });

    const processedData = scrubbedData.map(d => ({
      ...d,
      time: d.time
    }));

    candleSeries.setData(processedData as any);

    const volumeData = processedData.map(d => ({
      time: d.time,
      value: d.volume || 0,
      color: d.close >= d.open 
        ? (isDark ? 'rgba(38, 166, 154, 0.5)' : 'rgba(38, 166, 154, 0.4)')
        : (isDark ? 'rgba(239, 83, 80, 0.5)' : 'rgba(239, 83, 80, 0.4)')
    }));
    volumeSeries.setData(volumeData);

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
});

export default CandlestickChart;
