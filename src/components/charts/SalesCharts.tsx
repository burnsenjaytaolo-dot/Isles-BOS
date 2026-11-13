import React, { useState } from 'react';
import {
  SalesChartPoint,
  InvoiceStatusSummary,
  DateRangeFilter,
  formatSBD,
} from '../../utils/analytics';

interface SalesOverviewChartProps {
  data: SalesChartPoint[];
  currency: string;
}

export const SalesOverviewChart: React.FC<SalesOverviewChartProps> = ({
  data,
  currency,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const width = 460;
  const height = 210;
  const padLeft = 56;
  const padRight = 24;
  const padTop = 16;
  const padBottom = 28;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxVal = Math.max(100, ...data.map((d) => d.total));
  const step = Math.max(100, Math.ceil(maxVal / 4 / 100) * 100);
  const niceMax = step * 4;
  const gridTicks = [0, 0.25, 0.5, 0.75, 1];

  const points = data.map((d, i) => {
    const x =
      data.length <= 1
        ? padLeft + plotW / 2
        : padLeft + (i / (data.length - 1)) * plotW;
    const y = padTop + plotH - (d.total / niceMax) * plotH;
    return { x, y, ...d };
  });

  const linePath =
    points.length > 0
      ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
      : '';

  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
      : '';

  const activePoint = hoverIdx !== null && points[hoverIdx] ? points[hoverIdx] : null;
  const totalVolume = data.reduce((sum, d) => sum + d.total, 0);

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 lg:p-5 flex flex-col justify-between h-full min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold text-[#111827]">Sales Overview</h2>
          <p className="text-[12px] text-[#64748B]">
            Daily revenue trend ({data.length} {data.length === 1 ? 'day' : 'days'})
          </p>
        </div>
        <div className="text-left sm:text-right shrink-0">
          <div className="text-[13px] font-bold text-[#111827] tabular-nums">
            {formatSBD(totalVolume, currency)}
          </div>
          <div className="text-[11px] text-[#64748B]">Period volume</div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-xs text-[#64748B] border border-dashed border-[#E2E8F0] rounded-md">
          No sales recorded for the selected period.
        </div>
      ) : (
        <div className="relative w-full min-w-0">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-[200px] overflow-hidden"
            role="img"
            aria-label="Sales Overview line chart"
          >
            {/* Horizontal grid lines & Y labels */}
            {gridTicks.map((t) => {
              const y = padTop + plotH - t * plotH;
              const val = Math.round(niceMax * t);
              return (
                <g key={t}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={width - padRight}
                    y2={y}
                    stroke="#E2E8F0"
                    strokeDasharray={t === 0 ? undefined : '3 3'}
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    className="fill-[#64748B] text-[10px] font-mono"
                  >
                    {val >= 1000 ? `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k` : val}
                  </text>
                </g>
              );
            })}

            {/* Area fill */}
            {areaPath && <path d={areaPath} fill="#2563EB" fillOpacity="0.08" />}

            {/* Line stroke */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#2563EB"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Vertical hover line */}
            {activePoint && (
              <line
                x1={activePoint.x}
                y1={padTop}
                x2={activePoint.x}
                y2={padTop + plotH}
                stroke="#94A3B8"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
            )}

            {/* Data nodes & X-axis labels */}
            {points.map((p, idx) => {
              const showLabel =
                points.length <= 7 ||
                idx === 0 ||
                idx === points.length - 1 ||
                idx % Math.ceil(points.length / 5) === 0;
              const isHovered = hoverIdx === idx;

              return (
                <g key={p.dateKey}>
                  {showLabel && (
                    <text
                      x={p.x}
                      y={height - 6}
                      textAnchor="middle"
                      className="fill-[#64748B] text-[10px]"
                    >
                      {p.label}
                    </text>
                  )}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 5 : 3}
                    fill={isHovered ? '#1D4ED8' : '#2563EB'}
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />
                  {/* Invisible wider hit zone */}
                  <rect
                    x={p.x - 14}
                    y={padTop}
                    width={28}
                    height={plotH}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoverIdx(idx)}
                    onMouseLeave={() => setHoverIdx(null)}
                  />
                </g>
              );
            })}
          </svg>

          {activePoint && (
            <div className="mt-2 px-3 py-1.5 rounded-md bg-slate-900 text-white text-[11px] flex flex-wrap items-center justify-between gap-2 tabular-nums">
              <span className="font-medium text-slate-300">{activePoint.label}</span>
              <span className="font-semibold">
                {formatSBD(activePoint.total, currency)} · {activePoint.count}{' '}
                {activePoint.count === 1 ? 'invoice' : 'invoices'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface SalesByPeriodChartProps {
  data: SalesChartPoint[];
  period: DateRangeFilter;
  onChangePeriod: (p: DateRangeFilter) => void;
  currency: string;
}

export const SalesByPeriodChart: React.FC<SalesByPeriodChartProps> = ({
  data,
  period,
  onChangePeriod,
  currency,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const width = 380;
  const height = 210;
  const padLeft = 50;
  const padRight = 22;
  const padTop = 16;
  const padBottom = 28;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxVal = Math.max(100, ...data.map((d) => d.total));
  const step = Math.max(100, Math.ceil(maxVal / 4 / 100) * 100);
  const niceMax = step * 4;
  const gridTicks = [0, 0.25, 0.5, 0.75, 1];

  const barStep = data.length > 0 ? plotW / data.length : plotW;
  const barWidth = Math.max(8, Math.min(28, barStep * 0.55));
  const activePoint = hoverIdx !== null && data[hoverIdx] ? data[hoverIdx] : null;

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 lg:p-5 flex flex-col justify-between h-full min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold text-[#111827]">Sales by Period</h2>
          <p className="text-[12px] text-[#64748B]">Daily invoice totals</p>
        </div>

        {/* Compact Period Filter */}
        <div className="flex items-center p-0.5 bg-[#F3F6FA] border border-[#E2E8F0] rounded-md shrink-0">
          {(['7d', '30d', 'all'] as DateRangeFilter[]).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChangePeriod(opt)}
              className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                period === opt
                  ? 'bg-white text-[#111827] shadow-2xs border border-[#E2E8F0]'
                  : 'text-[#64748B] hover:text-[#111827]'
              }`}
            >
              {opt === '7d' ? '7D' : opt === '30d' ? '30D' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-xs text-[#64748B] border border-dashed border-[#E2E8F0] rounded-md">
          No period data available.
        </div>
      ) : (
        <div className="relative w-full min-w-0">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-[200px] overflow-hidden"
            role="img"
            aria-label="Sales by Period bar chart"
          >
            {gridTicks.map((t) => {
              const y = padTop + plotH - t * plotH;
              const val = Math.round(niceMax * t);
              return (
                <g key={t}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={width - padRight}
                    y2={y}
                    stroke="#E2E8F0"
                    strokeDasharray={t === 0 ? undefined : '3 3'}
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    className="fill-[#64748B] text-[10px] font-mono"
                  >
                    {val >= 1000 ? `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k` : val}
                  </text>
                </g>
              );
            })}

            {data.map((d, idx) => {
              const centerX = padLeft + idx * barStep + barStep / 2;
              const barH = Math.max(d.total > 0 ? 3 : 0, (d.total / niceMax) * plotH);
              const x = centerX - barWidth / 2;
              const y = padTop + plotH - barH;
              const showLabel =
                data.length <= 7 ||
                idx === 0 ||
                idx === data.length - 1 ||
                idx % Math.ceil(data.length / 4) === 0;
              const isHovered = hoverIdx === idx;

              return (
                <g key={d.dateKey}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barH}
                    rx="3"
                    fill={isHovered ? '#1D4ED8' : '#2563EB'}
                    className="cursor-pointer transition-colors"
                    onMouseEnter={() => setHoverIdx(idx)}
                    onMouseLeave={() => setHoverIdx(null)}
                  />
                  {/* Hit zone for zero-value bars */}
                  <rect
                    x={padLeft + idx * barStep}
                    y={padTop}
                    width={barStep}
                    height={plotH}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoverIdx(idx)}
                    onMouseLeave={() => setHoverIdx(null)}
                  />
                  {showLabel && (
                    <text
                      x={centerX}
                      y={height - 6}
                      textAnchor="middle"
                      className="fill-[#64748B] text-[10px]"
                    >
                      {d.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {activePoint && (
            <div className="mt-2 px-3 py-1.5 rounded-md bg-slate-900 text-white text-[11px] flex flex-wrap items-center justify-between gap-2 tabular-nums">
              <span className="font-medium text-slate-300">{activePoint.label}</span>
              <span className="font-semibold">
                {formatSBD(activePoint.total, currency)} ({activePoint.count})
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface BusinessStatusPanelProps {
  breakdown: InvoiceStatusSummary;
  lowStockCount: number;
  creditAccountsCount: number;
  currency: string;
  onOpenSales: () => void;
  onOpenStock: () => void;
}

export const BusinessStatusPanel: React.FC<BusinessStatusPanelProps> = ({
  breakdown,
  lowStockCount,
  creditAccountsCount,
  currency,
  onOpenSales,
  onOpenStock,
}) => {
  const total = Math.max(1, breakdown.totalCount);
  const paidPct = (breakdown.paid.count / total) * 100;
  const partPct = (breakdown.partPaid.count / total) * 100;
  const laterPct = (breakdown.payLater.count / total) * 100;

  const r = 42;
  const circ = 2 * Math.PI * r;
  const paidLen = (paidPct / 100) * circ;
  const partLen = (partPct / 100) * circ;
  const laterLen = (laterPct / 100) * circ;

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 lg:p-5 flex flex-col justify-between h-full min-w-0 overflow-hidden">
      <div className="mb-3">
        <h2 className="text-[14px] font-semibold text-[#111827]">Business Status</h2>
        <p className="text-[12px] text-[#64748B]">Invoices, stock &amp; credit health</p>
      </div>

      <div className="flex flex-col md:flex-row xl:flex-col items-center md:items-center xl:items-stretch gap-4 md:gap-6 xl:gap-2 flex-1 justify-between">
        {/* Donut Chart */}
        <div className="flex items-center justify-center my-1 md:my-0 xl:my-2 shrink-0">
          <div className="relative w-28 h-28 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="10"
              />
              {breakdown.totalCount > 0 && (
                <>
                  <circle
                    cx="50"
                    cy="50"
                    r={r}
                    fill="none"
                    stroke="#16A34A"
                    strokeWidth="10"
                    strokeDasharray={`${paidLen} ${circ}`}
                    strokeDashoffset={0}
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={r}
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="10"
                    strokeDasharray={`${partLen} ${circ}`}
                    strokeDashoffset={-paidLen}
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={r}
                    fill="none"
                    stroke="#DC2626"
                    strokeWidth="10"
                    strokeDasharray={`${laterLen} ${circ}`}
                    strokeDashoffset={-(paidLen + partLen)}
                  />
                </>
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-lg font-bold text-[#111827] tabular-nums leading-none">
                {breakdown.totalCount}
              </span>
              <span className="text-[10px] font-medium text-[#64748B] mt-1">Invoices</span>
            </div>
          </div>
        </div>

        {/* Compact Breakdown Rows */}
        <div className="w-full min-w-0 flex-1 space-y-2 pt-2 md:pt-0 md:pl-6 md:border-l md:border-t-0 xl:pl-0 xl:pt-2 xl:border-l-0 xl:border-t border-t border-[#E2E8F0] text-[12px]">
          <button
            type="button"
            onClick={onOpenSales}
            className="w-full flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 py-1 hover:bg-slate-50 rounded px-1 transition-colors text-left"
          >
            <span className="flex items-center gap-2 text-[#111827] font-medium min-w-0">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#16A34A] shrink-0" />
              <span>Paid ({breakdown.paid.count})</span>
            </span>
            <span className="font-semibold text-[#111827] tabular-nums">
              {formatSBD(breakdown.paid.total, currency)}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenSales}
            className="w-full flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 py-1 hover:bg-slate-50 rounded px-1 transition-colors text-left"
          >
            <span className="flex items-center gap-2 text-[#111827] font-medium min-w-0">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#F59E0B] shrink-0" />
              <span>Part paid ({breakdown.partPaid.count})</span>
            </span>
            <span className="font-semibold text-[#111827] tabular-nums">
              {formatSBD(breakdown.partPaid.total, currency)}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenSales}
            className="w-full flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 py-1 hover:bg-slate-50 rounded px-1 transition-colors text-left"
          >
            <span className="flex items-center gap-2 text-[#111827] font-medium min-w-0">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#DC2626] shrink-0" />
              <span>Pay later ({breakdown.payLater.count})</span>
            </span>
            <span className="font-semibold text-[#111827] tabular-nums">
              {formatSBD(breakdown.payLater.total, currency)}
            </span>
          </button>

          <div className="pt-2 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-[#64748B]">
            <button
              type="button"
              onClick={onOpenStock}
              className="hover:text-[#2563EB] font-medium transition-colors"
            >
              Stock alerts:{' '}
              <strong className={lowStockCount > 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'}>
                {lowStockCount}
              </strong>
            </button>
            <span className="tabular-nums">
              Credit accounts: <strong className="text-[#111827]">{creditAccountsCount}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
