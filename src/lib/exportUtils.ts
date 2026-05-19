/**
 * Export Utility
 *
 * Generates downloadable Excel files from scored results.
 */
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import type { ScoringResult } from "./scoringEngine";

/**
 * Export scored results to a multi-sheet Excel workbook.
 */
export function exportToExcel(result: ScoringResult): void {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Scored Data ──
  const scoredRows = result.participants.map((p) => {
    const row: Record<string, string | number> = {
      Participant_ID: p.participantId,
    };

    // Add scored responses for each question
    for (const q of result.config.questions) {
      const header = q.columnHeader;
      row[`${header}_raw`] = p.rawResponses[header] ?? "";
      row[`${header}_scored`] = p.scoredResponses[header] ?? "";
    }

    row["Total_Score"] = p.totalScore;
    row["Mean_Score"] = p.meanScore;
    row["Missing_Count"] = p.missingCount;

    // Add subscale scores
    for (const [name] of Object.entries(result.config.subscales)) {
      row[`${name}_Total`] = p.subscaleTotals[name] ?? 0;
      row[`${name}_Mean`] = p.subscaleMeans[name] ?? 0;
    }

    row["Flags"] = p.flags.join("; ");
    return row;
  });

  const wsScored = XLSX.utils.json_to_sheet(scoredRows);
  autoFitColumns(wsScored, scoredRows);
  XLSX.utils.book_append_sheet(wb, wsScored, "Scored Data");

  // ── Sheet 2: Summary Statistics ──
  const summaryRows = [
    { Metric: "Study Name", Value: result.config.studyName },
    { Metric: "Total Participants", Value: result.participants.length },
    { Metric: "Successfully Scored", Value: result.summary.totalScored },
    { Metric: "Skipped (>50% missing)", Value: result.summary.totalSkipped },
    { Metric: "Total Questions", Value: result.config.totalQuestions },
    {
      Metric: "Likert Scale Range",
      Value: `${result.config.likertMin}–${result.config.likertMax}`,
    },
    { Metric: "Grand Mean (Total Score)", Value: result.summary.grandMean },
    { Metric: "Grand SD (Total Score)", Value: result.summary.grandSD },
    {
      Metric: "Cronbach's Alpha",
      Value: result.summary.cronbachAlpha ?? "N/A",
    },
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  autoFitColumns(wsSummary, summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  // ── Sheet 3: Subscale Statistics (if any) ──
  const subscaleNames = Object.keys(result.config.subscales);
  if (subscaleNames.length > 0) {
    const subscaleRows = subscaleNames.map((name) => ({
      Subscale: name,
      Questions: result.config.subscales[name].join(", "),
      Mean: result.summary.subscaleStats[name]?.mean ?? "N/A",
      SD: result.summary.subscaleStats[name]?.sd ?? "N/A",
      N: result.summary.subscaleStats[name]?.n ?? 0,
    }));

    const wsSubscale = XLSX.utils.json_to_sheet(subscaleRows);
    autoFitColumns(wsSubscale, subscaleRows);
    XLSX.utils.book_append_sheet(wb, wsSubscale, "Subscale Stats");
  }

  // ── Sheet 4: Scoring Reference ──
  const refRows = result.config.questions.map((q) => ({
    Question_Number: q.questionNumber,
    Column_Header: q.columnHeader,
    Scoring: q.isReversed ? "Reversed" : "Normal",
    Subscale: q.subscale ?? "—",
  }));

  const wsRef = XLSX.utils.json_to_sheet(refRows);
  autoFitColumns(wsRef, refRows);
  XLSX.utils.book_append_sheet(wb, wsRef, "Scoring Reference");

  // Generate and download
  const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbOut], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const safeName = result.config.studyName
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_");
  const timestamp = new Date().toISOString().slice(0, 10);
  saveAs(blob, `${safeName}_scored_${timestamp}.xlsx`);
}

/**
 * Auto-fit column widths based on content.
 */
function autoFitColumns(
  ws: XLSX.WorkSheet,
  data: Record<string, unknown>[]
): void {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const colWidths = headers.map((h) => {
    const maxDataLen = data.reduce((max, row) => {
      const val = String(row[h] ?? "");
      return Math.max(max, val.length);
    }, h.length);
    return { wch: Math.min(maxDataLen + 2, 40) };
  });
  ws["!cols"] = colWidths;
}
