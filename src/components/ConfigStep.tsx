"use client";

import { useState, useMemo } from "react";
import type { ParsedFile } from "@/lib/fileParser";
import type { ScoringConfig, QuestionConfig } from "@/lib/scoringEngine";

/* ── Common Likert Presets ── */
const PRESETS: { label: string; map: Record<string, number> }[] = [
  {
    label: "5-pt Agree (SA→5)",
    map: { "strongly agree": 5, "agree": 4, "neutral": 3, "neither agree nor disagree": 3, "disagree": 2, "strongly disagree": 1 },
  },
  {
    label: "5-pt Agree (SA→1)",
    map: { "strongly agree": 1, "agree": 2, "neutral": 3, "neither agree nor disagree": 3, "disagree": 4, "strongly disagree": 5 },
  },
  {
    label: "4-pt Frequency",
    map: { "never": 0, "sometimes": 1, "often": 2, "almost always": 3, "always": 3 },
  },
  {
    label: "DASS-21 (0–3)",
    map: {
      "did not apply to me at all": 0, "applied to me to some degree, or some of the time": 1,
      "applied to me to a considerable degree or a good part of time": 2,
      "applied to me very much or most of the time": 3,
      "never": 0, "sometimes": 1, "often": 2, "almost always": 3,
    },
  },
  {
    label: "Yes/No (1/0)",
    map: { "yes": 1, "no": 0, "true": 1, "false": 0 },
  },
  {
    label: "7-pt Agreement",
    map: {
      "strongly disagree": 1, "disagree": 2, "slightly disagree": 3, "neutral": 4,
      "slightly agree": 5, "agree": 6, "strongly agree": 7,
    },
  },
];

interface Props {
  parsedFile: ParsedFile;
  onConfigDone: (config: ScoringConfig) => void;
  onBack: () => void;
  savedConfig?: ScoringConfig | null;
}

export default function ConfigStep({ parsedFile, onConfigDone, onBack, savedConfig }: Props) {
  const [studyName, setStudyName] = useState(savedConfig?.studyName ?? "");
  const [likertMin, setLikertMin] = useState(savedConfig?.likertMin ?? 1);
  const [likertMax, setLikertMax] = useState(savedConfig?.likertMax ?? 5);
  const [participantIdCol, setParticipantIdCol] = useState(savedConfig?.participantIdColumn ?? parsedFile.headers[0] ?? "");

  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    savedConfig?.questions?.map(q => q.columnHeader) ?? []
  );
  const [reverseMap, setReverseMap] = useState<Record<string, boolean>>(
    savedConfig?.questions?.reduce((acc, q) => ({ ...acc, [q.columnHeader]: q.isReversed }), {} as Record<string, boolean>) ?? {}
  );

  // Text-to-number mapping
  const [textMap, setTextMap] = useState<Record<string, number>>(savedConfig?.textToNumberMap ?? {});
  const [newTextLabel, setNewTextLabel] = useState("");
  const [newTextScore, setNewTextScore] = useState<number | "">("");

  // Subscales
  const [subscales, setSubscales] = useState<{ name: string; questions: number[] }[]>(
    savedConfig?.subscales
      ? Object.entries(savedConfig.subscales).map(([name, questions]) => ({ name, questions }))
      : []
  );
  const [newSubscaleName, setNewSubscaleName] = useState("");

  const availableColumns = useMemo(
    () => parsedFile.headers.filter((h) => h !== participantIdCol),
    [parsedFile.headers, participantIdCol]
  );

  // Detect unique text (non-numeric) values in selected question columns
  const detectedTextValues = useMemo(() => {
    const texts = new Set<string>();
    for (const col of selectedColumns) {
      for (const row of parsedFile.rows) {
        const val = row[col];
        if (val === undefined || val === null || val === "") continue;
        const str = String(val).trim();
        if (str && isNaN(parseFloat(str))) {
          texts.add(str);
        }
      }
    }
    return Array.from(texts).sort();
  }, [selectedColumns, parsedFile.rows]);

  const hasTextResponses = detectedTextValues.length > 0;

  // Count how many detected text values are mapped
  const mappedCount = detectedTextValues.filter(
    (t) => t.toLowerCase() in textMap
  ).length;
  const unmappedCount = detectedTextValues.length - mappedCount;

  // ── Handlers ──

  const toggleColumn = (col: string) => {
    setSelectedColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };
  const selectAll = () => setSelectedColumns([...availableColumns]);
  const deselectAll = () => setSelectedColumns([]);

  const toggleReverse = (col: string) => {
    setReverseMap((prev) => ({ ...prev, [col]: !prev[col] }));
  };

  const addTextMapping = () => {
    if (!newTextLabel.trim() || newTextScore === "") return;
    setTextMap((prev) => ({ ...prev, [newTextLabel.trim().toLowerCase()]: Number(newTextScore) }));
    setNewTextLabel("");
    setNewTextScore("");
  };

  const removeTextMapping = (key: string) => {
    setTextMap((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const applyPreset = (preset: Record<string, number>) => {
    setTextMap((prev) => ({ ...prev, ...preset }));
  };

  const autoMapDetected = () => {
    // Try to auto-detect and map common text values
    const autoMap: Record<string, number> = {};
    for (const text of detectedTextValues) {
      const lower = text.toLowerCase();
      // Check all presets for a match
      for (const preset of PRESETS) {
        if (lower in preset.map) {
          autoMap[lower] = preset.map[lower];
          break;
        }
      }
    }
    if (Object.keys(autoMap).length > 0) {
      setTextMap((prev) => ({ ...prev, ...autoMap }));
    }
  };

  const addSubscale = () => {
    if (!newSubscaleName.trim()) return;
    setSubscales((prev) => [...prev, { name: newSubscaleName.trim(), questions: [] }]);
    setNewSubscaleName("");
  };

  const removeSubscale = (idx: number) => {
    setSubscales((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleSubscaleQuestion = (subscaleIdx: number, qNum: number) => {
    setSubscales((prev) =>
      prev.map((s, i) =>
        i === subscaleIdx
          ? { ...s, questions: s.questions.includes(qNum) ? s.questions.filter((q) => q !== qNum) : [...s.questions, qNum] }
          : s
      )
    );
  };

  const isValid = studyName.trim() && selectedColumns.length > 0 && participantIdCol && unmappedCount === 0;

  const handleSubmit = () => {
    const questions: QuestionConfig[] = selectedColumns.map((col, i) => ({
      questionNumber: i + 1,
      columnHeader: col,
      isReversed: !!reverseMap[col],
      subscale: subscales.find((s) => s.questions.includes(i + 1))?.name,
    }));

    const subscaleMap: Record<string, number[]> = {};
    for (const s of subscales) subscaleMap[s.name] = s.questions;

    const config: ScoringConfig = {
      studyName: studyName.trim(),
      totalParticipants: parsedFile.rowCount,
      totalQuestions: selectedColumns.length,
      likertMax,
      likertMin,
      questions,
      subscales: subscaleMap,
      participantIdColumn: participantIdCol,
      textToNumberMap: textMap,
    };

    onConfigDone(config);
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">⚙️ Configure Scoring Parameters</h2>
        <p className="card-desc">
          Set up the study parameters, select question columns, and define scoring rules.
        </p>
      </div>

      {/* Study Info */}
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Study Name *</label>
          <input className="form-input" placeholder="e.g. PHQ-9 Depression Study" value={studyName} onChange={(e) => setStudyName(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Participant ID Column *</label>
          <select className="form-select" value={participantIdCol} onChange={(e) => setParticipantIdCol(e.target.value)}>
            {parsedFile.headers.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Likert Scale Minimum</label>
          <input className="form-input" type="number" min={0} max={likertMax - 1} value={likertMin} onChange={(e) => setLikertMin(Number(e.target.value))} />
        </div>
        <div className="form-group">
          <label className="form-label">Likert Scale Maximum</label>
          <input className="form-input" type="number" min={likertMin + 1} value={likertMax} onChange={(e) => setLikertMax(Number(e.target.value))} />
        </div>
      </div>

      <div className="likert-preview">
        {Array.from({ length: likertMax - likertMin + 1 }, (_, i) => (
          <span key={i} className="likert-chip">{likertMin + i}</span>
        ))}
      </div>

      {/* Column Selection */}
      <div style={{ marginTop: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h3>Select Question Columns ({selectedColumns.length} selected)</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary" style={{ padding: "6px 14px", fontSize: "0.78rem" }} onClick={selectAll}>Select All</button>
            <button className="btn btn-secondary" style={{ padding: "6px 14px", fontSize: "0.78rem" }} onClick={deselectAll}>Deselect All</button>
          </div>
        </div>
        <div className="column-mapper">
          {availableColumns.map((col) => (
            <div key={col} className={`column-chip ${selectedColumns.includes(col) ? "selected" : ""}`} onClick={() => toggleColumn(col)}>
              <span className="column-chip-check">{selectedColumns.includes(col) ? "✓" : ""}</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{col}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══════ Text Response Mapping ══════ */}
      {selectedColumns.length > 0 && hasTextResponses && (
        <div className="text-mapping-section" style={{ marginTop: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <h3>🔤 Text Response Mapping</h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: 4 }}>
                Your data contains text responses. Map each text label to a numeric score.
              </p>
            </div>
            {unmappedCount > 0 && (
              <span className="reverse-badge reversed" style={{ flexShrink: 0 }}>
                {unmappedCount} unmapped
              </span>
            )}
            {unmappedCount === 0 && detectedTextValues.length > 0 && (
              <span className="reverse-badge normal" style={{ flexShrink: 0 }}>
                ✓ All mapped
              </span>
            )}
          </div>

          {/* Presets */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Quick Presets
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {PRESETS.map((p) => (
                <button key={p.label} className="btn btn-secondary" style={{ padding: "6px 14px", fontSize: "0.75rem" }} onClick={() => applyPreset(p.map)}>
                  {p.label}
                </button>
              ))}
              <button className="btn btn-secondary" style={{ padding: "6px 14px", fontSize: "0.75rem" }} onClick={autoMapDetected}>
                🪄 Auto-Detect
              </button>
            </div>
          </div>

          {/* Detected text values with mapping status */}
          <div className="scoring-table-wrap" style={{ maxHeight: 320, overflow: "auto" }}>
            <table className="scoring-table">
              <thead>
                <tr>
                  <th>Detected Response Text</th>
                  <th style={{ width: 60 }}>Count</th>
                  <th style={{ width: 100 }}>Score</th>
                  <th style={{ width: 80 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {detectedTextValues.map((text) => {
                  const key = text.toLowerCase();
                  const isMapped = key in textMap;
                  // Count occurrences
                  let count = 0;
                  for (const col of selectedColumns) {
                    for (const row of parsedFile.rows) {
                      if (String(row[col] ?? "").trim().toLowerCase() === key) count++;
                    }
                  }
                  return (
                    <tr key={text}>
                      <td>
                        <span style={{ fontWeight: 500 }}>{text}</span>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{count}</td>
                      <td>
                        {isMapped ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <input
                              className="form-input"
                              type="number"
                              style={{ width: 60, padding: "6px 8px", fontSize: "0.82rem", textAlign: "center" }}
                              value={textMap[key]}
                              onChange={(e) => setTextMap((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                            />
                            <button className="remove-file" onClick={() => removeTextMapping(key)} style={{ fontSize: "0.7rem" }}>✕</button>
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>—</span>
                        )}
                      </td>
                      <td>
                        {isMapped ? (
                          <span className="reverse-badge normal">✓</span>
                        ) : (
                          <span className="reverse-badge reversed">?</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Manual add */}
          <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "flex-end" }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" style={{ fontSize: "0.7rem" }}>Response Text</label>
              <input
                className="form-input"
                placeholder="e.g. Strongly Agree"
                value={newTextLabel}
                onChange={(e) => setNewTextLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTextMapping()}
              />
            </div>
            <div className="form-group" style={{ width: 90 }}>
              <label className="form-label" style={{ fontSize: "0.7rem" }}>Score</label>
              <input
                className="form-input"
                type="number"
                placeholder="5"
                value={newTextScore}
                onChange={(e) => setNewTextScore(e.target.value === "" ? "" : Number(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && addTextMapping()}
              />
            </div>
            <button className="btn btn-secondary" onClick={addTextMapping} disabled={!newTextLabel.trim() || newTextScore === ""} style={{ padding: "10px 16px" }}>
              + Add
            </button>
          </div>

          {/* Current mapping summary */}
          {Object.keys(textMap).length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                Active Mapping ({Object.keys(textMap).length} entries)
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.entries(textMap).sort(([, a], [, b]) => a - b).map(([text, score]) => (
                  <span key={text} className="likert-chip" style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }} onClick={() => removeTextMapping(text)}>
                    &ldquo;{text}&rdquo; → {score}
                    <span style={{ opacity: 0.5, fontSize: "0.6rem" }}>✕</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* No text responses but show mapping option */}
      {selectedColumns.length > 0 && !hasTextResponses && Object.keys(textMap).length === 0 && (
        <div style={{ marginTop: 20, padding: "12px 16px", background: "var(--success-bg)", borderRadius: "var(--radius-md)", border: "1px solid rgba(16,185,129,0.15)", fontSize: "0.82rem", color: "var(--success)" }}>
          ✓ All responses are numeric — no text mapping needed.
        </div>
      )}

      {/* Scoring Table */}
      {selectedColumns.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h3>Scoring Configuration</h3>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 8 }}>
            Toggle reverse scoring for items that need to be inverted.
          </p>
          <div className="scoring-table-wrap" style={{ maxHeight: 350, overflow: "auto" }}>
            <table className="scoring-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>#</th>
                  <th>Column</th>
                  <th style={{ width: 140 }}>Scoring</th>
                  <th style={{ width: 180 }}>Scale Preview</th>
                </tr>
              </thead>
              <tbody>
                {selectedColumns.map((col, i) => {
                  const isRev = !!reverseMap[col];
                  return (
                    <tr key={col}>
                      <td><span className="q-number">Q{i + 1}</span></td>
                      <td>{col}</td>
                      <td>
                        <div className={`reverse-badge ${isRev ? "reversed" : "normal"}`} style={{ cursor: "pointer" }} onClick={() => toggleReverse(col)}>
                          {isRev ? "🔄 Reversed" : "→ Normal"}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 4 }}>
                          {Array.from({ length: likertMax - likertMin + 1 }, (_, j) => {
                            const orig = likertMin + j;
                            const scored = isRev ? likertMax + likertMin - orig : orig;
                            return (
                              <span key={j} className="likert-chip" style={{ fontSize: "0.65rem", padding: "2px 6px" }}>
                                {orig}→{scored}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subscales */}
      {selectedColumns.length > 0 && (
        <div className="subscale-section">
          <div className="subscale-header">
            <h3>📊 Subscales (Optional)</h3>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 12 }}>
            Group questions into subscales for separate scoring.
          </p>

          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input
              className="form-input"
              placeholder="Subscale name (e.g. Anxiety)"
              value={newSubscaleName}
              onChange={(e) => setNewSubscaleName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSubscale()}
              style={{ flex: 1 }}
            />
            <button className="btn btn-secondary" onClick={addSubscale} disabled={!newSubscaleName.trim()}>+ Add</button>
          </div>

          <div className="subscale-list">
            {subscales.map((sub, si) => (
              <div key={si} className="subscale-item">
                <div className="subscale-item-header">
                  <h3 style={{ fontSize: "0.9rem" }}>{sub.name}</h3>
                  <button className="remove-file" onClick={() => removeSubscale(si)}>✕</button>
                </div>
                <div className="subscale-questions">
                  {selectedColumns.map((_, qi) => (
                    <span key={qi} className={`subscale-q ${sub.questions.includes(qi + 1) ? "selected" : ""}`} onClick={() => toggleSubscaleQuestion(si, qi + 1)}>
                      Q{qi + 1}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {subscales.length === 0 && (
              <div className="empty-state" style={{ padding: "20px" }}>
                <div style={{ fontSize: "0.82rem" }}>No subscales defined. You can skip this step.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Validation warning */}
      {unmappedCount > 0 && (
        <div className="alert alert-warning" style={{ marginTop: 20 }}>
          ⚠️ {unmappedCount} text response{unmappedCount > 1 ? "s" : ""} still need mapping. Please assign numeric scores to all text responses before continuing.
        </div>
      )}

      <div className="btn-group">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn btn-primary" disabled={!isValid} onClick={handleSubmit}>
          Continue to Scoring →
        </button>
      </div>
    </div>
  );
}
