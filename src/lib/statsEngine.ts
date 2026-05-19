/**
 * Comprehensive Statistics Engine
 * Mirrors JASP/Jamovi functionality for psychometric data analysis.
 */

// ── Analysis Options (what user selects in Score step) ──

export interface AnalysisOptions {
  descriptives: {
    enabled: boolean;
    mean: boolean; median: boolean; mode: boolean;
    sd: boolean; variance: boolean; sem: boolean;
    min: boolean; max: boolean; range: boolean;
    skewness: boolean; kurtosis: boolean;
    percentiles: boolean; frequencyTable: boolean;
  };
  reliability: { enabled: boolean; cronbachAlpha: boolean; itemTotal: boolean; };
  normality: { enabled: boolean; shapiroWilk: boolean; histogram: boolean; qqPlot: boolean; };
  transformations: { enabled: boolean; log: boolean; sqrt: boolean; zscore: boolean; };
  inferential: {
    enabled: boolean;
    tTestOneSample: boolean; tTestOneSampleMu: number;
    correlation: boolean; corrMethod: "pearson" | "spearman";
  };
  plots: { enabled: boolean; histogram: boolean; boxplot: boolean; barChart: boolean; };
}

export const DEFAULT_OPTIONS: AnalysisOptions = {
  descriptives: {
    enabled: true, mean: true, median: true, mode: false,
    sd: true, variance: false, sem: false,
    min: true, max: true, range: true,
    skewness: true, kurtosis: true,
    percentiles: true, frequencyTable: false,
  },
  reliability: { enabled: true, cronbachAlpha: true, itemTotal: false },
  normality: { enabled: true, shapiroWilk: true, histogram: true, qqPlot: true },
  transformations: { enabled: false, log: false, sqrt: false, zscore: false },
  inferential: { enabled: false, tTestOneSample: false, tTestOneSampleMu: 0, correlation: false, corrMethod: "pearson" },
  plots: { enabled: true, histogram: true, boxplot: true, barChart: true },
};

// ── Result Types ──

export interface DescriptiveStats {
  variable: string; n: number; mean: number; median: number; mode: number[];
  sd: number; variance: number; sem: number;
  min: number; max: number; range: number;
  skewness: number; kurtosis: number;
  q1: number; q3: number; iqr: number;
  frequencies?: Record<number, number>;
}

export interface NormalityResult {
  variable: string; shapiroW: number; shapiroPValue: number; isNormal: boolean;
  histogramData: { bin: string; count: number }[];
  qqData: { theoretical: number; observed: number }[];
}

export interface TransformResult {
  variable: string; method: string;
  original: number[]; transformed: number[];
  originalShapiroP: number; transformedShapiroP: number;
  improved: boolean;
}

export interface TTestResult {
  variable: string; t: number; df: number; pValue: number;
  meanDiff: number; testMu: number; ci95: [number, number]; cohenD: number;
}

export interface CorrelationCell { r: number; p: number; n: number; }
export interface CorrelationMatrix {
  variables: string[];
  matrix: CorrelationCell[][];
}

export interface ReliabilityResult {
  cronbachAlpha: number | null;
  itemTotalCorrelations: { item: string; correlation: number; alphaIfDeleted: number | null }[];
}

export interface PlotData {
  type: "histogram" | "boxplot" | "bar";
  variable: string;
  data: Record<string, unknown>[];
}

export interface FullAnalysisResult {
  descriptives: DescriptiveStats[];
  reliability: ReliabilityResult | null;
  normality: NormalityResult[];
  transformations: TransformResult[];
  tTests: TTestResult[];
  correlations: CorrelationMatrix | null;
  plots: PlotData[];
}

// ── Math Helpers ──

function sum(a: number[]): number { return a.reduce((s, v) => s + v, 0); }
function mean(a: number[]): number { return a.length ? sum(a) / a.length : 0; }
function variance(a: number[], sample = true): number {
  if (a.length < 2) return 0;
  const m = mean(a);
  const ss = a.reduce((s, v) => s + (v - m) ** 2, 0);
  return ss / (a.length - (sample ? 1 : 0));
}
function sd(a: number[]): number { return Math.sqrt(variance(a)); }
function sem(a: number[]): number { return a.length ? sd(a) / Math.sqrt(a.length) : 0; }

function median(a: number[]): number {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function percentile(a: number[], p: number): number {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const i = (p / 100) * (s.length - 1);
  const lo = Math.floor(i), hi = Math.ceil(i);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo);
}

function mode(a: number[]): number[] {
  const freq: Record<number, number> = {};
  for (const v of a) freq[v] = (freq[v] || 0) + 1;
  const maxF = Math.max(...Object.values(freq));
  return Object.entries(freq).filter(([, f]) => f === maxF).map(([v]) => Number(v));
}

function skewness(a: number[]): number {
  const n = a.length; if (n < 3) return 0;
  const m = mean(a), s = sd(a);
  if (s === 0) return 0;
  const m3 = a.reduce((acc, v) => acc + ((v - m) / s) ** 3, 0);
  return (n / ((n - 1) * (n - 2))) * m3;
}

function kurtosis(a: number[]): number {
  const n = a.length; if (n < 4) return 0;
  const m = mean(a), s = sd(a);
  if (s === 0) return 0;
  const m4 = a.reduce((acc, v) => acc + ((v - m) / s) ** 4, 0);
  const k = ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * m4
    - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
  return k;
}

// ── Shapiro-Wilk (simplified approximation for n <= 5000) ──

function normalQuantile(p: number): number {
  // Rational approximation (Abramowitz & Stegun)
  if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
  if (p < 0.5) return -normalQuantile(1 - p);
  const t = Math.sqrt(-2 * Math.log(1 - p));
  const c0 = 2.515517, c1 = 0.802853, c2 = 0.010328;
  const d1 = 1.432788, d2 = 0.189269, d3 = 0.001308;
  return t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);
}

function shapiroWilk(data: number[]): { W: number; pValue: number } {
  const n = data.length;
  if (n < 3) return { W: 1, pValue: 1 };
  const sorted = [...data].sort((a, b) => a - b);
  const m = mean(sorted);

  // Generate expected normal order statistics
  const mi: number[] = [];
  for (let i = 1; i <= n; i++) mi.push(normalQuantile((i - 0.375) / (n + 0.25)));

  const mNorm = Math.sqrt(mi.reduce((s, v) => s + v * v, 0));
  const a = mi.map(v => v / mNorm);

  // W statistic
  let num = 0;
  for (let i = 0; i < Math.floor(n / 2); i++) {
    num += a[n - 1 - i] * (sorted[n - 1 - i] - sorted[i]);
  }
  num = num * num;

  const denom = sorted.reduce((s, v) => s + (v - m) ** 2, 0);
  const W = denom === 0 ? 1 : num / denom;

  // Approximate p-value using normal transformation
  const lnW = Math.log(1 - W);
  const mu = -1.2725 + 1.0521 * Math.log(n);
  const sigma = 1.0308 - 0.26758 * Math.log(n);
  const z = (lnW - mu) / sigma;

  // Standard normal CDF approximation
  const pValue = 1 - normalCDF(z);
  return { W: r3(W), pValue: r3(Math.max(0, Math.min(1, pValue))) };
}

function normalCDF(z: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

// ── T-Test (one-sample) ──

function tTestOneSample(data: number[], mu: number): TTestResult {
  const n = data.length, m = mean(data), s = sd(data);
  const se = s / Math.sqrt(n);
  const t = se === 0 ? 0 : (m - mu) / se;
  const df = n - 1;
  const pValue = 2 * (1 - tCDF(Math.abs(t), df));
  const tCrit = tInv(0.975, df);
  const ci95: [number, number] = [r3(m - tCrit * se), r3(m + tCrit * se)];
  const cohenD = s === 0 ? 0 : r3((m - mu) / s);
  return { variable: "", t: r3(t), df, pValue: r3(pValue), meanDiff: r3(m - mu), testMu: mu, ci95, cohenD };
}

function tCDF(t: number, df: number): number {
  // Approximation using regularized incomplete beta function
  const x = df / (df + t * t);
  return 1 - 0.5 * incompleteBeta(df / 2, 0.5, x);
}

function incompleteBeta(a: number, b: number, x: number): number {
  // Continued fraction approximation
  if (x === 0 || x === 1) return x;
  const lnBeta = lgamma(a) + lgamma(b) - lgamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta) / a;
  let f = 1, c = 1, d = 0;
  for (let i = 0; i <= 200; i++) {
    const m = Math.floor(i / 2);
    let numerator: number;
    if (i === 0) numerator = 1;
    else if (i % 2 === 0) numerator = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
    else numerator = -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 + numerator * d; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d;
    c = 1 + numerator / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    f *= c * d;
    if (Math.abs(c * d - 1) < 1e-8) break;
  }
  return front * (f - 1);
}

function lgamma(x: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

function tInv(p: number, df: number): number {
  // Newton's method approximation
  let t = normalQuantile(p);
  for (let i = 0; i < 10; i++) {
    const cdf = tCDF(t, df);
    const pdf = Math.exp(lgamma((df + 1) / 2) - lgamma(df / 2) - 0.5 * Math.log(df * Math.PI)
      - ((df + 1) / 2) * Math.log(1 + t * t / df));
    if (pdf === 0) break;
    t -= (cdf - p) / pdf;
  }
  return t;
}

// ── Correlation ──

function pearsonCorr(x: number[], y: number[]): CorrelationCell {
  const n = Math.min(x.length, y.length);
  if (n < 3) return { r: 0, p: 1, n };
  const mx = mean(x), my = mean(y);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - mx) * (y[i] - my);
    dx += (x[i] - mx) ** 2;
    dy += (y[i] - my) ** 2;
  }
  const denom = Math.sqrt(dx * dy);
  const r = denom === 0 ? 0 : num / denom;
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  const p = 2 * (1 - tCDF(Math.abs(t), n - 2));
  return { r: r3(r), p: r3(p), n };
}

function spearmanCorr(x: number[], y: number[]): CorrelationCell {
  const rank = (arr: number[]) => {
    const sorted = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const ranks = new Array(arr.length);
    let i = 0;
    while (i < sorted.length) {
      let j = i;
      while (j < sorted.length - 1 && sorted[j + 1].v === sorted[j].v) j++;
      const avgRank = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) ranks[sorted[k].i] = avgRank;
      i = j + 1;
    }
    return ranks;
  };
  return pearsonCorr(rank(x), rank(y));
}

// ── Cronbach's Alpha & Item-Total ──

function computeReliability(itemScores: number[][], totalScores: number[]): ReliabilityResult {
  const k = itemScores.length;
  const n = totalScores.length;
  if (k < 2 || n < 2) return { cronbachAlpha: null, itemTotalCorrelations: [] };

  const itemVar = itemScores.map(s => variance(s));
  const totalVar = variance(totalScores);
  const alpha = totalVar === 0 ? null : r3((k / (k - 1)) * (1 - sum(itemVar) / totalVar));

  const itemTotalCorrelations = itemScores.map((scores, i) => {
    const corrected = totalScores.map((t, j) => t - scores[j]);
    const corr = pearsonCorr(scores, corrected);
    // Alpha if deleted
    const remaining = itemScores.filter((_, j) => j !== i);
    const remTotals = Array.from({ length: n }, (_, j) => sum(remaining.map(s => s[j])));
    const remVar = remaining.map(s => variance(s));
    const remTotalVar = variance(remTotals);
    const remK = k - 1;
    const alphaIfDel = remK < 2 || remTotalVar === 0 ? null : r3((remK / (remK - 1)) * (1 - sum(remVar) / remTotalVar));
    return { item: `Item ${i + 1}`, correlation: corr.r, alphaIfDeleted: alphaIfDel };
  });

  return { cronbachAlpha: alpha, itemTotalCorrelations };
}

// ── Rounding helper ──
function r3(v: number): number { return Math.round(v * 1000) / 1000; }

// ── Histogram binning ──
function histogramBins(data: number[], binCount = 10): { bin: string; count: number }[] {
  if (!data.length) return [];
  const mn = Math.min(...data), mx = Math.max(...data);
  const width = (mx - mn) / binCount || 1;
  const bins: { bin: string; count: number }[] = [];
  for (let i = 0; i < binCount; i++) {
    const lo = mn + i * width, hi = mn + (i + 1) * width;
    const count = data.filter(v => i === binCount - 1 ? v >= lo && v <= hi : v >= lo && v < hi).length;
    bins.push({ bin: `${r3(lo)}–${r3(hi)}`, count });
  }
  return bins;
}

// ── QQ Plot data ──
function qqPlotData(data: number[]): { theoretical: number; observed: number }[] {
  const sorted = [...data].sort((a, b) => a - b);
  return sorted.map((v, i) => ({
    theoretical: r3(normalQuantile((i + 0.5) / sorted.length)),
    observed: r3(v),
  }));
}

// ══════════════════════════════════════════════
// MAIN ANALYSIS FUNCTION
// ══════════════════════════════════════════════

export function runAnalysis(
  totalScores: number[],
  itemScoresByQuestion: Record<string, number[]>,
  options: AnalysisOptions
): FullAnalysisResult {
  const variables = Object.keys(itemScoresByQuestion);
  const result: FullAnalysisResult = {
    descriptives: [], reliability: null, normality: [],
    transformations: [], tTests: [], correlations: null, plots: [],
  };

  // Always compute for Total Score + each item
  const allVars: Record<string, number[]> = { "Total Score": totalScores, ...itemScoresByQuestion };

  // ── Descriptives ──
  if (options.descriptives.enabled) {
    for (const [name, data] of Object.entries(allVars)) {
      const sorted = [...data].sort((a, b) => a - b);
      const freq: Record<number, number> = {};
      for (const v of data) freq[v] = (freq[v] || 0) + 1;

      result.descriptives.push({
        variable: name, n: data.length,
        mean: r3(mean(data)), median: r3(median(data)), mode: mode(data),
        sd: r3(sd(data)), variance: r3(variance(data)), sem: r3(sem(data)),
        min: sorted[0] ?? 0, max: sorted[sorted.length - 1] ?? 0,
        range: (sorted[sorted.length - 1] ?? 0) - (sorted[0] ?? 0),
        skewness: r3(skewness(data)), kurtosis: r3(kurtosis(data)),
        q1: r3(percentile(data, 25)), q3: r3(percentile(data, 75)),
        iqr: r3(percentile(data, 75) - percentile(data, 25)),
        frequencies: options.descriptives.frequencyTable ? freq : undefined,
      });
    }
  }

  // ── Reliability ──
  if (options.reliability.enabled) {
    const items = variables.map(v => itemScoresByQuestion[v]);
    result.reliability = computeReliability(items, totalScores);
  }

  // ── Normality ──
  if (options.normality.enabled) {
    for (const [name, data] of Object.entries(allVars)) {
      if (data.length < 3) continue;
      const sw = options.normality.shapiroWilk ? shapiroWilk(data) : { W: 0, pValue: 1 };
      result.normality.push({
        variable: name, shapiroW: sw.W, shapiroPValue: sw.pValue, isNormal: sw.pValue > 0.05,
        histogramData: options.normality.histogram ? histogramBins(data) : [],
        qqData: options.normality.qqPlot ? qqPlotData(data) : [],
      });
    }
  }

  // ── Transformations ──
  if (options.transformations.enabled) {
    for (const [name, data] of Object.entries(allVars)) {
      if (data.length < 3) continue;
      const origSW = shapiroWilk(data);
      if (options.transformations.log) {
        const minVal = Math.min(...data);
        const shift = minVal <= 0 ? Math.abs(minVal) + 1 : 0;
        const transformed = data.map(v => r3(Math.log(v + shift)));
        const tSW = shapiroWilk(transformed);
        result.transformations.push({
          variable: name, method: "Log (ln)", original: data, transformed,
          originalShapiroP: origSW.pValue, transformedShapiroP: tSW.pValue,
          improved: tSW.pValue > origSW.pValue,
        });
      }
      if (options.transformations.sqrt) {
        const minVal = Math.min(...data);
        const shift = minVal < 0 ? Math.abs(minVal) : 0;
        const transformed = data.map(v => r3(Math.sqrt(v + shift)));
        const tSW = shapiroWilk(transformed);
        result.transformations.push({
          variable: name, method: "Square Root", original: data, transformed,
          originalShapiroP: origSW.pValue, transformedShapiroP: tSW.pValue,
          improved: tSW.pValue > origSW.pValue,
        });
      }
      if (options.transformations.zscore) {
        const m = mean(data), s = sd(data);
        const transformed = data.map(v => r3(s === 0 ? 0 : (v - m) / s));
        result.transformations.push({
          variable: name, method: "Z-Score", original: data, transformed,
          originalShapiroP: origSW.pValue, transformedShapiroP: origSW.pValue,
          improved: false,
        });
      }
    }
  }

  // ── Inferential: One-Sample T-Test ──
  if (options.inferential.enabled && options.inferential.tTestOneSample) {
    for (const [name, data] of Object.entries(allVars)) {
      if (data.length < 2) continue;
      const res = tTestOneSample(data, options.inferential.tTestOneSampleMu);
      result.tTests.push({ ...res, variable: name });
    }
  }

  // ── Correlations ──
  if (options.inferential.enabled && options.inferential.correlation && variables.length >= 2) {
    const corrFn = options.inferential.corrMethod === "spearman" ? spearmanCorr : pearsonCorr;
    const matrix: CorrelationCell[][] = [];
    for (let i = 0; i < variables.length; i++) {
      const row: CorrelationCell[] = [];
      for (let j = 0; j < variables.length; j++) {
        row.push(i === j ? { r: 1, p: 0, n: itemScoresByQuestion[variables[i]].length }
          : corrFn(itemScoresByQuestion[variables[i]], itemScoresByQuestion[variables[j]]));
      }
      matrix.push(row);
    }
    result.correlations = { variables, matrix };
  }

  // ── Plots ──
  if (options.plots.enabled) {
    if (options.plots.histogram) {
      result.plots.push({ type: "histogram", variable: "Total Score", data: histogramBins(totalScores).map(b => ({ ...b })) });
    }
    if (options.plots.boxplot) {
      const bpData = Object.entries(allVars).map(([name, data]) => ({
        variable: name, min: Math.min(...data), q1: percentile(data, 25),
        median: median(data), q3: percentile(data, 75), max: Math.max(...data),
      }));
      result.plots.push({ type: "boxplot", variable: "All Variables", data: bpData });
    }
    if (options.plots.barChart) {
      const barData = Object.entries(allVars).map(([name, data]) => ({ variable: name, mean: r3(mean(data)), sd: r3(sd(data)) }));
      result.plots.push({ type: "bar", variable: "Means", data: barData });
    }
  }

  return result;
}
