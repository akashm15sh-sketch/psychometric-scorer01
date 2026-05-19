"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { ParsedFile } from "@/lib/fileParser";
import type { ScoringConfig, ScoringResult } from "@/lib/scoringEngine";
import type { AnalysisOptions, FullAnalysisResult } from "@/lib/statsEngine";
import { saveSession, loadSession, clearSession } from "@/lib/storage";
import UploadStep from "@/components/UploadStep";
import ConfigStep from "@/components/ConfigStep";
import ScoringStep from "@/components/ScoringStep";
import ResultsStep from "@/components/ResultsStep";
import ConfirmModal from "@/components/ConfirmModal";

const STEPS = ["Upload Data", "Configure", "Analyze", "Results"];

export default function HomePage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [config, setConfig] = useState<ScoringConfig | null>(null);
  const [result, setResult] = useState<ScoringResult | null>(null);
  const [analysisOptions, setAnalysisOptions] = useState<AnalysisOptions | null>(null);
  const [analysisResult, setAnalysisResult] = useState<FullAnalysisResult | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const isInitialLoad = useRef(true);

  // ── Load session from localStorage on mount ──
  useEffect(() => {
    const saved = loadSession();
    if (saved) {
      setCurrentStep(saved.currentStep);
      setMaxStep(saved.maxStep);
      setParsedFile(saved.parsedFile as ParsedFile | null);
      setConfig(saved.config as ScoringConfig | null);
      setResult(saved.result as ScoringResult | null);
      setAnalysisOptions(saved.analysisOptions as AnalysisOptions | null);
      setAnalysisResult(saved.analysisResult as FullAnalysisResult | null);
    }
    setHydrated(true);
    isInitialLoad.current = false;
  }, []);

  // ── Save session to localStorage on every state change ──
  useEffect(() => {
    if (!hydrated) return; // Don't save during initial load
    saveSession({
      currentStep,
      maxStep,
      parsedFile,
      config,
      result,
      analysisOptions,
      analysisResult,
    });
  }, [currentStep, maxStep, parsedFile, config, result, analysisOptions, analysisResult, hydrated]);

  const goToStep = useCallback((step: number) => {
    if (step <= maxStep) setCurrentStep(step);
  }, [maxStep]);

  const goBack = useCallback(() => setCurrentStep((s) => Math.max(s - 1, 0)), []);

  const handleFileUploaded = useCallback((file: ParsedFile) => {
    setParsedFile(file);
    setCurrentStep(1);
    setMaxStep((m) => Math.max(m, 1));
  }, []);

  const handleConfigDone = useCallback((cfg: ScoringConfig) => {
    setConfig(cfg);
    setCurrentStep(2);
    setMaxStep((m) => Math.max(m, 2));
  }, []);

  const handleAnalysisDone = useCallback((
    scoringRes: ScoringResult,
    opts: AnalysisOptions,
    analysisRes: FullAnalysisResult
  ) => {
    setResult(scoringRes);
    setAnalysisOptions(opts);
    setAnalysisResult(analysisRes);
    setCurrentStep(3);
    setMaxStep((m) => Math.max(m, 3));
  }, []);

  // ── New Study: show modal first ──
  const handleResetRequest = useCallback(() => {
    setShowResetModal(true);
  }, []);

  const handleResetConfirm = useCallback(() => {
    setShowResetModal(false);
    setCurrentStep(0);
    setMaxStep(0);
    setParsedFile(null);
    setConfig(null);
    setResult(null);
    setAnalysisOptions(null);
    setAnalysisResult(null);
    clearSession();
  }, []);

  const handleResetCancel = useCallback(() => {
    setShowResetModal(false);
  }, []);

  // Don't render until hydrated to prevent flash of empty state
  if (!hydrated) {
    return (
      <>
        <header className="header">
          <div className="logo">
            <div className="logo-icon">🧠</div>
            <div>
              <div className="logo-text">PsychScore</div>
              <div className="logo-tag">Psychometric Assessment Scorer</div>
            </div>
          </div>
          <div className="guest-badge">
            <span className="guest-dot" />
            Guest Session
          </div>
        </header>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      </>
    );
  }

  return (
    <>
      <header className="header">
        <div className="logo">
          <div className="logo-icon">🧠</div>
          <div>
            <div className="logo-text">PsychScore</div>
            <div className="logo-tag">Psychometric Assessment Scorer</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {maxStep > 0 && (
            <button
              className="btn btn-secondary"
              style={{ padding: "6px 14px", fontSize: "0.78rem" }}
              onClick={handleResetRequest}
            >
              🔄 New Study
            </button>
          )}
          <div className="guest-badge">
            <span className="guest-dot" />
            Guest Session
          </div>
        </div>
      </header>

      <nav className="stepper">
        {STEPS.map((label, i) => (
          <span key={label} style={{ display: "flex", alignItems: "center" }}>
            <div
              className={`step ${i === currentStep ? "active" : ""} ${i < currentStep ? "completed" : ""} ${i <= maxStep ? "clickable" : ""}`}
              onClick={() => goToStep(i)}
              style={{ cursor: i <= maxStep ? "pointer" : "default" }}
            >
              <span className="step-number">{i < currentStep ? "✓" : i + 1}</span>
              {label}
            </div>
            {i < STEPS.length - 1 && (
              <span className={`step-connector ${i < currentStep ? "completed" : ""}`} />
            )}
          </span>
        ))}
      </nav>

      <main className="page-content animate-in" key={currentStep}>
        {currentStep === 0 && <UploadStep onUploaded={handleFileUploaded} />}
        {currentStep === 1 && parsedFile && (
          <ConfigStep parsedFile={parsedFile} onConfigDone={handleConfigDone} onBack={goBack} savedConfig={config} />
        )}
        {currentStep === 2 && parsedFile && config && (
          <ScoringStep parsedFile={parsedFile} config={config} onDone={handleAnalysisDone} onBack={goBack} />
        )}
        {currentStep === 3 && result && analysisOptions && analysisResult && (
          <ResultsStep
            result={result}
            analysisOptions={analysisOptions}
            analysisResult={analysisResult}
            onReset={handleResetRequest}
            onBack={goBack}
          />
        )}
      </main>

      <ConfirmModal
        open={showResetModal}
        onCancel={handleResetCancel}
        onConfirm={handleResetConfirm}
      />
    </>
  );
}
