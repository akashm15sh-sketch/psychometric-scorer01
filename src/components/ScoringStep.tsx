"use client";

import { useState, useCallback } from "react";
import type { ParsedFile } from "@/lib/fileParser";
import type { ScoringConfig, ScoringResult } from "@/lib/scoringEngine";
import { scoreParticipants } from "@/lib/scoringEngine";
import { DEFAULT_OPTIONS, runAnalysis, type AnalysisOptions, type FullAnalysisResult } from "@/lib/statsEngine";

interface Props {
  parsedFile: ParsedFile;
  config: ScoringConfig;
  onDone: (scoring: ScoringResult, opts: AnalysisOptions, analysis: FullAnalysisResult) => void;
  onBack: () => void;
}

export default function ScoringStep({ parsedFile, config, onDone, onBack }: Props) {
  const [opts, setOpts] = useState<AnalysisOptions>({ ...DEFAULT_OPTIONS });
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");

  const toggle = useCallback((path: string, value?: unknown) => {
    setOpts(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const parts = path.split(".");
      let obj = next as Record<string, unknown>;
      for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]] as Record<string, unknown>;
      obj[parts[parts.length - 1]] = value !== undefined ? value : !obj[parts[parts.length - 1]];
      return next;
    });
  }, []);

  const runAll = useCallback(async () => {
    setRunning(true);
    try {
      setStatus("Scoring responses…"); setProgress(15);
      await delay(200);
      const scoringResult = scoreParticipants(parsedFile.rows, config);

      setStatus("Preparing item data…"); setProgress(30);
      await delay(150);
      const validP = scoringResult.participants.filter(p => !p.flags.some(f => f.startsWith("SKIPPED")));
      const totalScores = validP.map(p => p.totalScore);
      const itemScores: Record<string, number[]> = {};
      for (const q of config.questions) {
        itemScores[q.columnHeader] = validP.map(p => p.scoredResponses[q.columnHeader] ?? 0);
      }

      setStatus("Running statistical analyses…"); setProgress(55);
      await delay(200);
      const analysisResult = runAnalysis(totalScores, itemScores, opts);

      setProgress(90); setStatus("Finalizing…");
      await delay(200);
      setProgress(100); setStatus("Complete!");
      await delay(300);

      onDone(scoringResult, opts, analysisResult);
    } catch {
      setStatus("Error during analysis.");
    }
  }, [parsedFile, config, opts, onDone]);

  if (running) {
    return (
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">🔬 Running Analysis</h2>
        </div>
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>{progress < 100 ? "⏳" : "✅"}</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 8 }}>{status}</div>
          <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
            {config.totalQuestions} questions × {parsedFile.rowCount} participants
          </div>
        </div>
        <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div className="card">
        <div className="card-header" style={{ marginBottom: 0 }}>
          <h2 className="card-title">📐 Analysis Options</h2>
          <p className="card-desc">
            Select the statistical analyses you need — similar to JASP &amp; Jamovi.
            Only selected analyses will appear in your results.
          </p>
        </div>
      </div>

      {/* Descriptive Statistics */}
      <div className="card">
        <div className="analysis-section-header" onClick={() => toggle("descriptives.enabled")}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className={`toggle ${opts.descriptives.enabled ? "active" : ""}`} />
            <div>
              <h3 className="card-title" style={{ fontSize: "1rem" }}>📊 Descriptive Statistics</h3>
              <p className="card-desc">Central tendency, dispersion, and distribution shape</p>
            </div>
          </div>
        </div>
        {opts.descriptives.enabled && (
          <div className="analysis-options-grid">
            <h4 className="analysis-group-title">Central Tendency</h4>
            <Chk label="Mean" checked={opts.descriptives.mean} onChange={() => toggle("descriptives.mean")} />
            <Chk label="Median" checked={opts.descriptives.median} onChange={() => toggle("descriptives.median")} />
            <Chk label="Mode" checked={opts.descriptives.mode} onChange={() => toggle("descriptives.mode")} />
            <h4 className="analysis-group-title">Dispersion</h4>
            <Chk label="Standard Deviation" checked={opts.descriptives.sd} onChange={() => toggle("descriptives.sd")} />
            <Chk label="Variance" checked={opts.descriptives.variance} onChange={() => toggle("descriptives.variance")} />
            <Chk label="Std. Error of Mean" checked={opts.descriptives.sem} onChange={() => toggle("descriptives.sem")} />
            <Chk label="Range" checked={opts.descriptives.range} onChange={() => toggle("descriptives.range")} />
            <Chk label="Minimum" checked={opts.descriptives.min} onChange={() => toggle("descriptives.min")} />
            <Chk label="Maximum" checked={opts.descriptives.max} onChange={() => toggle("descriptives.max")} />
            <h4 className="analysis-group-title">Distribution Shape</h4>
            <Chk label="Skewness" checked={opts.descriptives.skewness} onChange={() => toggle("descriptives.skewness")} />
            <Chk label="Kurtosis (Excess)" checked={opts.descriptives.kurtosis} onChange={() => toggle("descriptives.kurtosis")} />
            <Chk label="Percentiles (Q1, Q3, IQR)" checked={opts.descriptives.percentiles} onChange={() => toggle("descriptives.percentiles")} />
            <Chk label="Frequency Table" checked={opts.descriptives.frequencyTable} onChange={() => toggle("descriptives.frequencyTable")} />
          </div>
        )}
      </div>

      {/* Reliability */}
      <div className="card">
        <div className="analysis-section-header" onClick={() => toggle("reliability.enabled")}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className={`toggle ${opts.reliability.enabled ? "active" : ""}`} />
            <div>
              <h3 className="card-title" style={{ fontSize: "1rem" }}>🔗 Reliability Analysis</h3>
              <p className="card-desc">Internal consistency and item-level diagnostics</p>
            </div>
          </div>
        </div>
        {opts.reliability.enabled && (
          <div className="analysis-options-grid">
            <Chk label="Cronbach's Alpha" checked={opts.reliability.cronbachAlpha} onChange={() => toggle("reliability.cronbachAlpha")} />
            <Chk label="Item-Total Correlations & Alpha if Deleted" checked={opts.reliability.itemTotal} onChange={() => toggle("reliability.itemTotal")} />
          </div>
        )}
      </div>

      {/* Normality */}
      <div className="card">
        <div className="analysis-section-header" onClick={() => toggle("normality.enabled")}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className={`toggle ${opts.normality.enabled ? "active" : ""}`} />
            <div>
              <h3 className="card-title" style={{ fontSize: "1rem" }}>📈 Normality Tests</h3>
              <p className="card-desc">Assess distribution normality with formal tests and visual diagnostics</p>
            </div>
          </div>
        </div>
        {opts.normality.enabled && (
          <div className="analysis-options-grid">
            <Chk label="Shapiro-Wilk Test" checked={opts.normality.shapiroWilk} onChange={() => toggle("normality.shapiroWilk")} />
            <Chk label="Histogram with Normal Curve" checked={opts.normality.histogram} onChange={() => toggle("normality.histogram")} />
            <Chk label="Q-Q Plot" checked={opts.normality.qqPlot} onChange={() => toggle("normality.qqPlot")} />
          </div>
        )}
      </div>

      {/* Transformations */}
      <div className="card">
        <div className="analysis-section-header" onClick={() => toggle("transformations.enabled")}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className={`toggle ${opts.transformations.enabled ? "active" : ""}`} />
            <div>
              <h3 className="card-title" style={{ fontSize: "1rem" }}>🔄 Data Transformations</h3>
              <p className="card-desc">Transform data to meet normality assumptions (log, sqrt, z-score)</p>
            </div>
          </div>
        </div>
        {opts.transformations.enabled && (
          <div className="analysis-options-grid">
            <Chk label="Log Transformation (ln)" checked={opts.transformations.log} onChange={() => toggle("transformations.log")} />
            <Chk label="Square Root Transformation" checked={opts.transformations.sqrt} onChange={() => toggle("transformations.sqrt")} />
            <Chk label="Z-Score Standardization" checked={opts.transformations.zscore} onChange={() => toggle("transformations.zscore")} />
          </div>
        )}
      </div>

      {/* Inferential */}
      <div className="card">
        <div className="analysis-section-header" onClick={() => toggle("inferential.enabled")}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className={`toggle ${opts.inferential.enabled ? "active" : ""}`} />
            <div>
              <h3 className="card-title" style={{ fontSize: "1rem" }}>🧪 Inferential Statistics</h3>
              <p className="card-desc">Hypothesis testing and correlation analyses</p>
            </div>
          </div>
        </div>
        {opts.inferential.enabled && (
          <div className="analysis-options-grid">
            <Chk label="One-Sample T-Test" checked={opts.inferential.tTestOneSample} onChange={() => toggle("inferential.tTestOneSample")} />
            {opts.inferential.tTestOneSample && (
              <div className="form-group" style={{ gridColumn: "1 / -1", maxWidth: 280 }}>
                <label className="form-label">Test Value (μ₀)</label>
                <input
                  className="form-input"
                  type="number"
                  value={opts.inferential.tTestOneSampleMu}
                  onChange={e => toggle("inferential.tTestOneSampleMu", Number(e.target.value))}
                />
              </div>
            )}
            <Chk label="Correlation Matrix" checked={opts.inferential.correlation} onChange={() => toggle("inferential.correlation")} />
            {opts.inferential.correlation && (
              <div className="form-group" style={{ gridColumn: "1 / -1", maxWidth: 280 }}>
                <label className="form-label">Correlation Method</label>
                <select className="form-select" value={opts.inferential.corrMethod} onChange={e => toggle("inferential.corrMethod", e.target.value)}>
                  <option value="pearson">Pearson (parametric)</option>
                  <option value="spearman">Spearman (rank-based)</option>
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Plots */}
      <div className="card">
        <div className="analysis-section-header" onClick={() => toggle("plots.enabled")}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className={`toggle ${opts.plots.enabled ? "active" : ""}`} />
            <div>
              <h3 className="card-title" style={{ fontSize: "1rem" }}>📉 Plots &amp; Graphs</h3>
              <p className="card-desc">Visual summaries and distribution plots</p>
            </div>
          </div>
        </div>
        {opts.plots.enabled && (
          <div className="analysis-options-grid">
            <Chk label="Histogram" checked={opts.plots.histogram} onChange={() => toggle("plots.histogram")} />
            <Chk label="Box Plot" checked={opts.plots.boxplot} onChange={() => toggle("plots.boxplot")} />
            <Chk label="Bar Chart (Means ± SD)" checked={opts.plots.barChart} onChange={() => toggle("plots.barChart")} />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="btn-group">
        <button className="btn btn-secondary" onClick={onBack}>← Back to Configuration</button>
        <button className="btn btn-primary" onClick={runAll}>
          🚀 Run Analysis
        </button>
      </div>
    </div>
  );
}

function Chk({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="analysis-checkbox" onClick={onChange}>
      <span className={`analysis-check-box ${checked ? "checked" : ""}`}>
        {checked && "✓"}
      </span>
      <span>{label}</span>
    </label>
  );
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
