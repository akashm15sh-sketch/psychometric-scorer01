/**
 * PsychScore Scoring Engine
 *
 * Core algorithm that scores psychometric questionnaire responses
 * based on user-defined Likert scale configurations and optional
 * reverse-scoring rules.
 */

import { evaluateFormula, type FormulaContext } from "./formulaEngine";

export interface QuestionConfig {
  /** 1-indexed question number */
  questionNumber: number;
  /** Column header in the uploaded sheet that maps to this question */
  columnHeader: string;
  /** Whether the question is reverse-scored */
  isReversed: boolean;
  /** Optional subscale this question belongs to */
  subscale?: string;
}

export interface ScoringConfig {
  studyName: string;
  totalParticipants: number;
  totalQuestions: number;
  /** The maximum value on the Likert scale (e.g. 5 for a 1–5 scale) */
  likertMax: number;
  /** The minimum value on the Likert scale (e.g. 1 for a 1–5 scale, 0 for a 0–4 scale) */
  likertMin: number;
  /** Question-level configurations */
  questions: QuestionConfig[];
  /** Optional subscale definitions: name → question numbers */
  subscales: Record<string, number[]>;
  /** Participant ID column header */
  participantIdColumn: string;
  /**
   * Maps text response labels to numeric scores.
   * Keys are case-insensitive trimmed text values.
   * e.g. { "strongly agree": 5, "agree": 4, ... }
   */
  textToNumberMap: Record<string, number>;
  /**
   * Optional formula for the overall total score.
   * Variables: Q1..Qn (per-question scored values), sum, mean, n.
   * When omitted the default is a plain sum of all question scores.
   */
  totalScoreFormula?: string;
  /**
   * Optional per-subscale scoring formulas.
   * Key = subscale name, value = formula string.
   * Variables: Qn for questions in that subscale, sum, mean, n.
   */
  subscaleFormulas?: Record<string, string>;
}

export interface ScoredParticipant {
  participantId: string;
  /** Raw responses (original values) */
  rawResponses: Record<string, number | string>;
  /** Scored responses (after reverse-scoring) */
  scoredResponses: Record<string, number>;
  /** Total score across all questions */
  totalScore: number;
  /** Mean score */
  meanScore: number;
  /** Subscale totals */
  subscaleTotals: Record<string, number>;
  /** Subscale means */
  subscaleMeans: Record<string, number>;
  /** Number of missing/invalid responses */
  missingCount: number;
  /** Flags for data quality */
  flags: string[];
}

export interface ScoringResult {
  config: ScoringConfig;
  participants: ScoredParticipant[];
  summary: {
    totalScored: number;
    totalSkipped: number;
    grandMean: number;
    grandSD: number;
    subscaleStats: Record<string, { mean: number; sd: number; n: number }>;
    cronbachAlpha: number | null;
  };
}

/**
 * Reverse-score a single item.
 * Formula: reversed = (max + min) - original
 */
function reverseScore(value: number, min: number, max: number): number {
  return max + min - value;
}

/**
 * Compute Cronbach's alpha for internal consistency.
 */
function computeCronbachAlpha(
  itemScores: number[][],
  totalScores: number[]
): number | null {
  const k = itemScores.length;
  if (k < 2) return null;
  const n = totalScores.length;
  if (n < 2) return null;

  // Variance of each item
  const itemVariances = itemScores.map((scores) => {
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance =
      scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / (scores.length - 1);
    return variance;
  });

  // Variance of total scores
  const totalMean = totalScores.reduce((a, b) => a + b, 0) / n;
  const totalVariance =
    totalScores.reduce((sum, s) => sum + (s - totalMean) ** 2, 0) / (n - 1);

  if (totalVariance === 0) return null;

  const sumItemVariances = itemVariances.reduce((a, b) => a + b, 0);
  const alpha = (k / (k - 1)) * (1 - sumItemVariances / totalVariance);

  return Math.round(alpha * 1000) / 1000;
}

/**
 * Standard deviation helper.
 */
function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Core scoring function.
 * Takes raw data rows and a scoring configuration, produces scored results.
 */
export function scoreParticipants(
  rawData: Record<string, string | number>[],
  config: ScoringConfig
): ScoringResult {
  const participants: ScoredParticipant[] = [];
  let totalSkipped = 0;

  for (const row of rawData) {
    const participantId = String(
      row[config.participantIdColumn] ?? `P${participants.length + 1}`
    );

    const rawResponses: Record<string, number | string> = {};
    const scoredResponses: Record<string, number> = {};
    const flags: string[] = [];
    let missingCount = 0;
    let totalScore = 0;
    let validCount = 0;

    for (const qConfig of config.questions) {
      const rawValue = row[qConfig.columnHeader];
      rawResponses[qConfig.columnHeader] = rawValue ?? "";

      // Try direct numeric parse first
      let numericValue = parseFloat(String(rawValue));

      // If not a number, try text-to-number mapping
      if (isNaN(numericValue) && rawValue !== undefined && rawValue !== null && rawValue !== "") {
        const textKey = String(rawValue).trim().toLowerCase();
        if (textKey in config.textToNumberMap) {
          numericValue = config.textToNumberMap[textKey];
        }
      }

      if (rawValue === undefined || rawValue === null || rawValue === "" || isNaN(numericValue)) {
        missingCount++;
        flags.push(`Q${qConfig.questionNumber}: missing/invalid`);
        continue;
      }

      // Validate range
      if (numericValue < config.likertMin || numericValue > config.likertMax) {
        flags.push(
          `Q${qConfig.questionNumber}: value ${numericValue} out of range [${config.likertMin}-${config.likertMax}]`
        );
      }

      let scored = numericValue;
      if (qConfig.isReversed) {
        scored = reverseScore(numericValue, config.likertMin, config.likertMax);
      }

      scoredResponses[qConfig.columnHeader] = scored;
      totalScore += scored;
      validCount++;
    }

    // Apply total-score formula if configured, otherwise use plain sum.
    if (config.totalScoreFormula?.trim()) {
      const ctx: FormulaContext = { sum: totalScore, mean: validCount > 0 ? totalScore / validCount : 0, n: validCount };
      for (const qConfig of config.questions) {
        const scored = scoredResponses[qConfig.columnHeader];
        ctx[`Q${qConfig.questionNumber}`] = scored ?? 0;
      }
      try {
        totalScore = evaluateFormula(config.totalScoreFormula, ctx);
      } catch {
        // formula invalid at runtime — fall back to sum
      }
    }

    const meanScore =
      validCount > 0 ? Math.round((totalScore / validCount) * 1000) / 1000 : 0;

    // Compute subscale scores
    const subscaleTotals: Record<string, number> = {};
    const subscaleMeans: Record<string, number> = {};

    for (const [name, qNumbers] of Object.entries(config.subscales)) {
      let subTotal = 0;
      let subValid = 0;

      for (const qNum of qNumbers) {
        const qConfig = config.questions.find(
          (q) => q.questionNumber === qNum
        );
        if (!qConfig) continue;
        const scored = scoredResponses[qConfig.columnHeader];
        if (scored !== undefined) {
          subTotal += scored;
          subValid++;
        }
      }

      // Apply subscale formula if configured.
      const subFormula = config.subscaleFormulas?.[name]?.trim();
      if (subFormula) {
        const ctx: FormulaContext = {
          sum: subTotal,
          mean: subValid > 0 ? subTotal / subValid : 0,
          n: subValid,
        };
        for (const qNum of qNumbers) {
          const qConfig = config.questions.find((q) => q.questionNumber === qNum);
          if (qConfig) ctx[`Q${qNum}`] = scoredResponses[qConfig.columnHeader] ?? 0;
        }
        try {
          const result = evaluateFormula(subFormula, ctx);
          subscaleTotals[name] = result;
          subscaleMeans[name] = subValid > 0 ? Math.round((result / subValid) * 1000) / 1000 : 0;
        } catch {
          // formula invalid at runtime — fall back to sum
          subscaleTotals[name] = subTotal;
          subscaleMeans[name] = subValid > 0 ? Math.round((subTotal / subValid) * 1000) / 1000 : 0;
        }
      } else {
        subscaleTotals[name] = subTotal;
        subscaleMeans[name] = subValid > 0 ? Math.round((subTotal / subValid) * 1000) / 1000 : 0;
      }
    }

    if (missingCount > config.totalQuestions * 0.5) {
      totalSkipped++;
      flags.push("SKIPPED: >50% missing data");
    }

    participants.push({
      participantId,
      rawResponses,
      scoredResponses,
      totalScore,
      meanScore,
      subscaleTotals,
      subscaleMeans,
      missingCount,
      flags,
    });
  }

  // Compute summary statistics
  const validParticipants = participants.filter(
    (p) => !p.flags.some((f) => f.startsWith("SKIPPED"))
  );

  const totalScores = validParticipants.map((p) => p.totalScore);
  const grandMean =
    totalScores.length > 0
      ? Math.round(
          (totalScores.reduce((a, b) => a + b, 0) / totalScores.length) * 1000
        ) / 1000
      : 0;
  const grandSD = Math.round(stdDev(totalScores) * 1000) / 1000;

  // Subscale stats
  const subscaleStats: Record<string, { mean: number; sd: number; n: number }> =
    {};
  for (const name of Object.keys(config.subscales)) {
    const values = validParticipants.map((p) => p.subscaleTotals[name] ?? 0);
    subscaleStats[name] = {
      mean:
        values.length > 0
          ? Math.round(
              (values.reduce((a, b) => a + b, 0) / values.length) * 1000
            ) / 1000
          : 0,
      sd: Math.round(stdDev(values) * 1000) / 1000,
      n: values.length,
    };
  }

  // Cronbach's alpha
  const itemScores: number[][] = config.questions.map((qConfig) =>
    validParticipants.map(
      (p) => p.scoredResponses[qConfig.columnHeader] ?? 0
    )
  );
  const cronbachAlpha = computeCronbachAlpha(itemScores, totalScores);

  return {
    config,
    participants,
    summary: {
      totalScored: validParticipants.length,
      totalSkipped,
      grandMean,
      grandSD,
      subscaleStats,
      cronbachAlpha,
    },
  };
}
