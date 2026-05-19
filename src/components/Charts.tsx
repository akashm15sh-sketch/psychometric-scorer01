"use client";

/** SVG-based chart components for psychometric analysis results. */

interface HistogramProps {
  data: { bin: string; count: number }[];
  title: string;
  width?: number;
  height?: number;
}

export function Histogram({ data, title, width = 500, height = 280 }: HistogramProps) {
  if (!data.length) return null;
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const pad = { top: 40, right: 20, bottom: 60, left: 50 };
  const cw = width - pad.left - pad.right;
  const ch = height - pad.top - pad.bottom;
  const barW = cw / data.length - 2;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
      <text x={width / 2} y={20} textAnchor="middle" className="chart-title">{title}</text>
      {/* Y axis */}
      {[0, 0.25, 0.5, 0.75, 1].map(f => {
        const y = pad.top + ch - f * ch;
        return (
          <g key={f}>
            <line x1={pad.left} y1={y} x2={pad.left + cw} y2={y} stroke="rgba(255,255,255,0.06)" />
            <text x={pad.left - 8} y={y + 4} textAnchor="end" className="chart-label">{Math.round(f * maxCount)}</text>
          </g>
        );
      })}
      {/* Bars */}
      {data.map((d, i) => {
        const barH = (d.count / maxCount) * ch;
        const x = pad.left + i * (cw / data.length) + 1;
        const y = pad.top + ch - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={2} fill="url(#histGrad)" opacity={0.85} />
            <text x={x + barW / 2} y={pad.top + ch + 14} textAnchor="middle" className="chart-label" style={{ fontSize: 7 }}>
              {d.bin.split("–")[0]}
            </text>
          </g>
        );
      })}
      <defs>
        <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

interface BoxPlotProps {
  data: { variable: string; min: number; q1: number; median: number; q3: number; max: number }[];
  title: string;
  width?: number;
  height?: number;
}

export function BoxPlot({ data, title, width = 500, height = 300 }: BoxPlotProps) {
  if (!data.length) return null;
  const allVals = data.flatMap(d => [d.min, d.max]);
  const globalMin = Math.min(...allVals);
  const globalMax = Math.max(...allVals);
  const range = globalMax - globalMin || 1;
  const pad = { top: 40, right: 20, bottom: 50, left: 60 };
  const cw = width - pad.left - pad.right;
  const ch = height - pad.top - pad.bottom;
  const boxH = Math.min(30, ch / data.length - 6);

  const scale = (v: number) => pad.left + ((v - globalMin) / range) * cw;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
      <text x={width / 2} y={20} textAnchor="middle" className="chart-title">{title}</text>
      {data.map((d, i) => {
        const cy = pad.top + (i + 0.5) * (ch / data.length);
        return (
          <g key={i}>
            {/* Whiskers */}
            <line x1={scale(d.min)} y1={cy} x2={scale(d.q1)} y2={cy} stroke="#8b5cf6" strokeWidth={1.5} />
            <line x1={scale(d.q3)} y1={cy} x2={scale(d.max)} y2={cy} stroke="#8b5cf6" strokeWidth={1.5} />
            <line x1={scale(d.min)} y1={cy - boxH / 4} x2={scale(d.min)} y2={cy + boxH / 4} stroke="#8b5cf6" strokeWidth={1.5} />
            <line x1={scale(d.max)} y1={cy - boxH / 4} x2={scale(d.max)} y2={cy + boxH / 4} stroke="#8b5cf6" strokeWidth={1.5} />
            {/* Box */}
            <rect x={scale(d.q1)} y={cy - boxH / 2} width={scale(d.q3) - scale(d.q1)} height={boxH}
              rx={3} fill="rgba(139,92,246,0.2)" stroke="#8b5cf6" strokeWidth={1.5} />
            {/* Median */}
            <line x1={scale(d.median)} y1={cy - boxH / 2} x2={scale(d.median)} y2={cy + boxH / 2} stroke="#f59e0b" strokeWidth={2} />
            {/* Label */}
            <text x={pad.left - 6} y={cy + 4} textAnchor="end" className="chart-label" style={{ fontSize: 7 }}>
              {d.variable.length > 8 ? d.variable.slice(0, 8) + "…" : d.variable}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

interface BarChartProps {
  data: { variable: string; mean: number; sd: number }[];
  title: string;
  width?: number;
  height?: number;
}

export function BarChart({ data, title, width = 500, height = 280 }: BarChartProps) {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map(d => d.mean + d.sd), 1);
  const pad = { top: 40, right: 20, bottom: 60, left: 50 };
  const cw = width - pad.left - pad.right;
  const ch = height - pad.top - pad.bottom;
  const barW = Math.min(40, cw / data.length - 4);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
      <text x={width / 2} y={20} textAnchor="middle" className="chart-title">{title}</text>
      {data.map((d, i) => {
        const x = pad.left + (i + 0.5) * (cw / data.length) - barW / 2;
        const barH = (d.mean / maxVal) * ch;
        const y = pad.top + ch - barH;
        const errTop = Math.min(ch, (d.sd / maxVal) * ch);
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={3} fill="url(#barGrad)" opacity={0.8} />
            {/* Error bar */}
            <line x1={x + barW / 2} y1={y - errTop} x2={x + barW / 2} y2={y + errTop} stroke="#f0f0f5" strokeWidth={1} />
            <line x1={x + barW / 2 - 4} y1={y - errTop} x2={x + barW / 2 + 4} y2={y - errTop} stroke="#f0f0f5" strokeWidth={1} />
            <text x={x + barW / 2} y={pad.top + ch + 14} textAnchor="middle" className="chart-label" style={{ fontSize: 7 }}>
              {d.variable.length > 6 ? d.variable.slice(0, 6) + "…" : d.variable}
            </text>
          </g>
        );
      })}
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
    </svg>
  );
}

interface QQPlotProps {
  data: { theoretical: number; observed: number }[];
  title: string;
  width?: number;
  height?: number;
}

export function QQPlot({ data, title, width = 400, height = 400 }: QQPlotProps) {
  if (!data.length) return null;
  const allT = data.map(d => d.theoretical);
  const allO = data.map(d => d.observed);
  const minT = Math.min(...allT), maxT = Math.max(...allT);
  const minO = Math.min(...allO), maxO = Math.max(...allO);
  const pad = { top: 40, right: 20, bottom: 40, left: 50 };
  const cw = width - pad.left - pad.right;
  const ch = height - pad.top - pad.bottom;

  const sx = (v: number) => pad.left + ((v - minT) / (maxT - minT || 1)) * cw;
  const sy = (v: number) => pad.top + ch - ((v - minO) / (maxO - minO || 1)) * ch;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
      <text x={width / 2} y={20} textAnchor="middle" className="chart-title">{title}</text>
      {/* Reference line */}
      <line x1={sx(minT)} y1={sy(minO)} x2={sx(maxT)} y2={sy(maxO)} stroke="rgba(245,158,11,0.5)" strokeWidth={1.5} strokeDasharray="4 4" />
      {/* Points */}
      {data.map((d, i) => (
        <circle key={i} cx={sx(d.theoretical)} cy={sy(d.observed)} r={3} fill="#8b5cf6" opacity={0.7} />
      ))}
      <text x={width / 2} y={height - 8} textAnchor="middle" className="chart-label">Theoretical Quantiles</text>
      <text x={14} y={height / 2} textAnchor="middle" className="chart-label" transform={`rotate(-90, 14, ${height / 2})`}>Observed</text>
    </svg>
  );
}
