"use client";

import type { ScoringResult } from "@/lib/scoringEngine";
import type { AnalysisOptions, FullAnalysisResult } from "@/lib/statsEngine";
import { exportToExcel } from "@/lib/exportUtils";
import { Histogram, BoxPlot, BarChart, QQPlot } from "@/components/Charts";

interface Props {
  result: ScoringResult;
  analysisOptions: AnalysisOptions;
  analysisResult: FullAnalysisResult;
  onReset: () => void;
  onBack: () => void;
}

export default function ResultsStep({ result, analysisOptions: ao, analysisResult: ar, onReset, onBack }: Props) {
  const { config, participants, summary } = result;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Overview */}
      <div className="card">
        <div className="card-header" style={{ marginBottom: 16 }}>
          <h2 className="card-title">📊 Analysis Results — {config.studyName}</h2>
        </div>
        <div className="results-summary">
          <SC value={summary.totalScored} label="Scored" />
          <SC value={config.totalQuestions} label="Questions" />
          <SC value={summary.grandMean} label="Grand Mean" />
          <SC value={summary.grandSD} label="Grand SD" />
          {summary.totalSkipped > 0 && <SC value={summary.totalSkipped} label="Skipped" warn />}
        </div>
      </div>

      {/* Descriptives */}
      {ao.descriptives.enabled && ar.descriptives.length > 0 && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 16 }}>📊 Descriptive Statistics</h3>
          <div className="results-table-wrap">
            <table className="results-table">
              <thead><tr>
                <th>Variable</th><th>N</th>
                {ao.descriptives.mean && <th>Mean</th>}
                {ao.descriptives.median && <th>Median</th>}
                {ao.descriptives.mode && <th>Mode</th>}
                {ao.descriptives.sd && <th>SD</th>}
                {ao.descriptives.variance && <th>Var</th>}
                {ao.descriptives.sem && <th>SEM</th>}
                {ao.descriptives.min && <th>Min</th>}
                {ao.descriptives.max && <th>Max</th>}
                {ao.descriptives.range && <th>Range</th>}
                {ao.descriptives.skewness && <th>Skew</th>}
                {ao.descriptives.kurtosis && <th>Kurt</th>}
                {ao.descriptives.percentiles && <><th>Q1</th><th>Q3</th><th>IQR</th></>}
              </tr></thead>
              <tbody>
                {ar.descriptives.map(d => (
                  <tr key={d.variable}>
                    <td style={{ fontWeight: 600 }}>{d.variable}</td>
                    <td>{d.n}</td>
                    {ao.descriptives.mean && <td className="score-cell">{d.mean}</td>}
                    {ao.descriptives.median && <td>{d.median}</td>}
                    {ao.descriptives.mode && <td>{d.mode.join(", ")}</td>}
                    {ao.descriptives.sd && <td>{d.sd}</td>}
                    {ao.descriptives.variance && <td>{d.variance}</td>}
                    {ao.descriptives.sem && <td>{d.sem}</td>}
                    {ao.descriptives.min && <td>{d.min}</td>}
                    {ao.descriptives.max && <td>{d.max}</td>}
                    {ao.descriptives.range && <td>{d.range}</td>}
                    {ao.descriptives.skewness && <td>{d.skewness}</td>}
                    {ao.descriptives.kurtosis && <td>{d.kurtosis}</td>}
                    {ao.descriptives.percentiles && <><td>{d.q1}</td><td>{d.q3}</td><td>{d.iqr}</td></>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Frequency Tables */}
          {ao.descriptives.frequencyTable && ar.descriptives.filter(d => d.frequencies).length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h4 style={{ marginBottom: 10, color: "var(--text-secondary)" }}>Frequency Tables</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                {ar.descriptives.filter(d => d.frequencies).map(d => (
                  <div key={d.variable} className="freq-table-card">
                    <h5 style={{ marginBottom: 8, fontSize: "0.82rem" }}>{d.variable}</h5>
                    <table className="results-table" style={{ fontSize: "0.75rem" }}>
                      <thead><tr><th>Value</th><th>Freq</th><th>%</th></tr></thead>
                      <tbody>
                        {Object.entries(d.frequencies!).sort(([a], [b]) => Number(a) - Number(b)).map(([val, freq]) => (
                          <tr key={val}><td>{val}</td><td>{freq}</td><td>{((freq / d.n) * 100).toFixed(1)}%</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reliability */}
      {ao.reliability.enabled && ar.reliability && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 16 }}>🔗 Reliability Analysis</h3>
          {ao.reliability.cronbachAlpha && (
            <div className="results-summary" style={{ marginBottom: 16 }}>
              <SC value={ar.reliability.cronbachAlpha ?? "N/A"} label="Cronbach's α" />
            </div>
          )}
          {ao.reliability.itemTotal && ar.reliability.itemTotalCorrelations.length > 0 && (
            <div className="results-table-wrap">
              <table className="results-table">
                <thead><tr><th>Item</th><th>Item-Total r</th><th>α if Deleted</th></tr></thead>
                <tbody>
                  {ar.reliability.itemTotalCorrelations.map(it => (
                    <tr key={it.item}>
                      <td style={{ fontWeight: 600 }}>{it.item}</td>
                      <td>{it.correlation}</td>
                      <td>{it.alphaIfDeleted ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Normality */}
      {ao.normality.enabled && ar.normality.length > 0 && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 16 }}>📈 Normality Tests</h3>
          {ao.normality.shapiroWilk && (
            <div className="results-table-wrap" style={{ marginBottom: 16 }}>
              <table className="results-table">
                <thead><tr><th>Variable</th><th>W</th><th>p-value</th><th>Normal?</th></tr></thead>
                <tbody>
                  {ar.normality.map(n => (
                    <tr key={n.variable}>
                      <td style={{ fontWeight: 600 }}>{n.variable}</td>
                      <td>{n.shapiroW}</td>
                      <td style={{ color: n.shapiroPValue < 0.05 ? "var(--warning)" : "var(--success)" }}>{n.shapiroPValue}</td>
                      <td><span className={`reverse-badge ${n.isNormal ? "normal" : "reversed"}`}>{n.isNormal ? "✓ Yes" : "✗ No"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Histograms & QQ Plots */}
          <div className="chart-grid">
            {ao.normality.histogram && ar.normality.filter(n => n.histogramData.length > 0).slice(0, 4).map(n => (
              <Histogram key={`h-${n.variable}`} data={n.histogramData} title={`Histogram: ${n.variable}`} />
            ))}
            {ao.normality.qqPlot && ar.normality.filter(n => n.qqData.length > 0).slice(0, 4).map(n => (
              <QQPlot key={`q-${n.variable}`} data={n.qqData} title={`Q-Q Plot: ${n.variable}`} />
            ))}
          </div>
        </div>
      )}

      {/* Transformations */}
      {ao.transformations.enabled && ar.transformations.length > 0 && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 16 }}>🔄 Data Transformations</h3>
          <div className="results-table-wrap">
            <table className="results-table">
              <thead><tr><th>Variable</th><th>Method</th><th>Original p (SW)</th><th>Transformed p (SW)</th><th>Improved?</th></tr></thead>
              <tbody>
                {ar.transformations.map((t, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{t.variable}</td>
                    <td>{t.method}</td>
                    <td style={{ color: t.originalShapiroP < 0.05 ? "var(--warning)" : "var(--success)" }}>{t.originalShapiroP}</td>
                    <td style={{ color: t.transformedShapiroP < 0.05 ? "var(--warning)" : "var(--success)" }}>{t.transformedShapiroP}</td>
                    <td><span className={`reverse-badge ${t.improved ? "normal" : "reversed"}`}>{t.improved ? "✓ Yes" : "✗ No"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inferential: T-Test */}
      {ao.inferential.enabled && ao.inferential.tTestOneSample && ar.tTests.length > 0 && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 16 }}>🧪 One-Sample T-Test (μ₀ = {ao.inferential.tTestOneSampleMu})</h3>
          <div className="results-table-wrap">
            <table className="results-table">
              <thead><tr><th>Variable</th><th>t</th><th>df</th><th>p</th><th>Mean Diff</th><th>95% CI</th><th>Cohen&apos;s d</th></tr></thead>
              <tbody>
                {ar.tTests.map(t => (
                  <tr key={t.variable}>
                    <td style={{ fontWeight: 600 }}>{t.variable}</td>
                    <td>{t.t}</td>
                    <td>{t.df}</td>
                    <td style={{ color: t.pValue < 0.05 ? "var(--success)" : "var(--text-secondary)" }}>{t.pValue}</td>
                    <td>{t.meanDiff}</td>
                    <td>[{t.ci95[0]}, {t.ci95[1]}]</td>
                    <td>{t.cohenD}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Correlation Matrix */}
      {ao.inferential.enabled && ao.inferential.correlation && ar.correlations && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 16 }}>
            🔗 {ao.inferential.corrMethod === "spearman" ? "Spearman" : "Pearson"} Correlation Matrix
          </h3>
          <div className="results-table-wrap">
            <table className="results-table" style={{ fontSize: "0.72rem" }}>
              <thead><tr><th></th>{ar.correlations.variables.map(v => <th key={v} style={{ maxWidth: 60 }}>{v.length > 6 ? v.slice(0, 6) + "…" : v}</th>)}</tr></thead>
              <tbody>
                {ar.correlations.variables.map((v, i) => (
                  <tr key={v}>
                    <td style={{ fontWeight: 600, fontSize: "0.72rem" }}>{v.length > 8 ? v.slice(0, 8) + "…" : v}</td>
                    {ar.correlations!.matrix[i].map((cell, j) => (
                      <td key={j} style={{
                        background: i === j ? "transparent" : `rgba(${cell.r > 0 ? "16,185,129" : "239,68,68"}, ${Math.abs(cell.r) * 0.3})`,
                        fontWeight: cell.p < 0.05 && i !== j ? 700 : 400,
                        textAlign: "center"
                      }}>
                        {i === j ? "—" : cell.r}
                        {cell.p < 0.01 && i !== j ? "**" : cell.p < 0.05 && i !== j ? "*" : ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 8, fontSize: "0.72rem", color: "var(--text-muted)" }}>* p &lt; .05 &nbsp; ** p &lt; .01</div>
        </div>
      )}

      {/* Plots */}
      {ao.plots.enabled && ar.plots.length > 0 && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 16 }}>📉 Plots</h3>
          <div className="chart-grid">
            {ar.plots.map((p, i) => {
              if (p.type === "histogram") return <Histogram key={i} data={p.data as { bin: string; count: number }[]} title={`Histogram: ${p.variable}`} />;
              if (p.type === "boxplot") return <BoxPlot key={i} data={p.data as { variable: string; min: number; q1: number; median: number; q3: number; max: number }[]} title="Box Plots" />;
              if (p.type === "bar") return <BarChart key={i} data={p.data as { variable: string; mean: number; sd: number }[]} title="Mean ± SD" />;
              return null;
            })}
          </div>
        </div>
      )}

      {/* Scored Data Preview */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 16 }}>📄 Scored Data Preview</h3>
        <div className="results-table-wrap">
          <table className="results-table">
            <thead><tr>
              <th>ID</th>
              {config.questions.slice(0, 6).map(q => <th key={q.questionNumber}>Q{q.questionNumber}</th>)}
              {config.questions.length > 6 && <th>…</th>}
              <th>Total</th><th>Mean</th>
            </tr></thead>
            <tbody>
              {participants.slice(0, 10).map(p => (
                <tr key={p.participantId}>
                  <td style={{ fontWeight: 600 }}>{p.participantId}</td>
                  {config.questions.slice(0, 6).map(q => <td key={q.questionNumber}>{p.scoredResponses[q.columnHeader] ?? "—"}</td>)}
                  {config.questions.length > 6 && <td style={{ color: "var(--text-muted)" }}>…</td>}
                  <td className="score-cell">{p.totalScore}</td>
                  <td className="score-cell">{p.meanScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="btn-group">
        <button className="btn btn-secondary" onClick={onBack}>← Back to Analysis Options</button>
        <button className="btn btn-secondary" onClick={onReset}>🔄 New Study</button>
        <button className="btn btn-success" onClick={() => exportToExcel(result)}>📥 Download Excel</button>
      </div>
    </div>
  );
}

function SC({ value, label, warn }: { value: string | number | null; label: string; warn?: boolean }) {
  return (
    <div className="stat-card" style={warn ? { borderColor: "rgba(245,158,11,0.3)" } : undefined}>
      <div className="stat-value" style={warn ? { background: "linear-gradient(135deg,#f59e0b,#ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" } : undefined}>
        {value ?? "N/A"}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
