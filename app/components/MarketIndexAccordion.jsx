'use client';
import { isArray, isObject } from 'lodash';
import { useIsMobile } from '@/app/hooks/useIsMobile';

import { useEffect, useState, useRef } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { fetchMarketIndices } from '@/app/api/fund';
import { ChevronRightIcon } from 'lucide-react';
import { SettingsIcon } from './Icons';
import { cn } from '@/lib/utils';
import MarketSettingModal from './MarketSettingModal';
import { storageStore } from '../stores';

/** 迷你走势：只展示当日分时数据，不支持时不展示 */
function MiniTrendLine({ changePercent, code, className }) {
  const width = 80;
  const height = 28;
  const pad = 3;
  const innerH = height - 2 * pad;
  const innerW = width - 2 * pad;
  const isDown = changePercent <= 0;

  // 当日分时真实走势 path
  const [realPath, setRealPath] = useState(null);

  useEffect(() => {
    if (!code || typeof window === 'undefined' || typeof document === 'undefined') {
      setRealPath(null);
      return;
    }

    let cancelled = false;
    const varName = `min_data_${code}`;
    const url = `https://web.ifzq.gtimg.cn/appstock/app/minute/query?_var=${varName}&code=${code}&_=${Date.now()}`;

    const script = document.createElement('script');
    script.src = url;
    script.async = true;

    let done = false;
    const cleanup = () => {
      done = true;
      if (timer) clearTimeout(timer);
      if (document.body && document.body.contains(script)) {
        document.body.removeChild(script);
      }
      try {
        if (window[varName]) {
          delete window[varName];
        }
      } catch (e) {
        // ignore
      }
    };

    const timer = setTimeout(() => {
      if (done) return;
      cleanup();
      if (!cancelled) {
        setRealPath(null);
      }
    }, 10000);

    script.onload = () => {
      if (cancelled || done) {
        cleanup();
        return;
      }
      try {
        const raw = window[varName];
        const series =
          raw && raw.data && raw.data[code] && raw.data[code].data && isArray(raw.data[code].data.data)
            ? raw.data[code].data.data
            : null;
        if (!series || !series.length) {
          setRealPath(null);
          return;
        }

        // 解析 "HHMM price volume amount" 行，只关心 price
        const points = series
          .map((row) => {
            const parts = String(row).split(' ');
            const price = parseFloat(parts[1]);
            if (!Number.isFinite(price)) return null;
            return { price };
          })
          .filter(Boolean);

        if (!points.length) {
          setRealPath(null);
          return;
        }

        const minP = points.reduce((m, p) => (p.price < m ? p.price : m), points[0].price);
        const maxP = points.reduce((m, p) => (p.price > m ? p.price : m), points[0].price);
        const span = maxP - minP || 1;

        const n = points.length;
        const pathPoints = points.map((p, idx) => {
          const t = n > 1 ? idx / (n - 1) : 0;
          const x = pad + t * innerW;
          const norm = (p.price - minP) / span;
          const y = pad + (1 - norm) * innerH;
          return [x, Math.max(pad, Math.min(height - pad, y))];
        });

        const d = pathPoints.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
        setRealPath(d);
      } finally {
        cleanup();
      }
    };

    script.onerror = () => {
      if (!cancelled) {
        setRealPath(null);
      }
      cleanup();
    };

    document.body.appendChild(script);

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [code, height, innerH, innerW, pad]);

  if (!realPath) {
    return <svg width={width} height={height} className={cn('overflow-visible', className)} aria-hidden />;
  }
  return (
    <svg width={width} height={height} className={cn('overflow-visible', className)} aria-hidden>
      <path
        d={realPath}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isDown ? 'text-[var(--success)]' : 'text-[var(--danger)]'}
      />
    </svg>
  );
}

function IndexCard({ item }) {
  const isUp = item.change >= 0;
  const colorClass = isUp ? 'text-[var(--danger)]' : 'text-[var(--success)]';
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-1.5 flex flex-col gap-0.5 w-full">
      <div className="text-xs font-medium text-[var(--foreground)] truncate">{item.name}</div>
      <div className={cn('text-sm font-semibold tabular-nums', colorClass)}>{item.price.toFixed(2)}</div>
      <div className={cn('text-xs tabular-nums', colorClass)}>
        {(item.change >= 0 ? '+' : '') + item.change.toFixed(2)}{' '}
        {(item.changePercent >= 0 ? '+' : '') + item.changePercent.toFixed(2)}%
      </div>
      <div className="mt-0.5 flex items-center justify-center opacity-80">
        <MiniTrendLine changePercent={item.changePercent} code={item.code} />
      </div>
    </div>
  );
}

// 默认展示：上证指数、深证成指、创业板指
const DEFAULT_SELECTED_CODES = ['sh000001', 'sz399001', 'sz399006'];

export default function MarketIndexAccordion() {
  return null;
}