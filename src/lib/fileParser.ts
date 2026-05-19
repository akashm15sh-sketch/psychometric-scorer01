/**
 * File Parser Utility
 *
 * Handles parsing of .csv, .xlsx, .xls, and .tsv files into
 * a normalized array of row objects.
 */
import * as XLSX from "xlsx";
import Papa from "papaparse";

export interface ParsedFile {
  headers: string[];
  rows: Record<string, string | number>[];
  fileName: string;
  fileSize: number;
  rowCount: number;
  columnCount: number;
}

/**
 * Parse an uploaded file (supports .csv, .tsv, .xlsx, .xls).
 */
export async function parseFile(file: File): Promise<ParsedFile> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "csv" || extension === "tsv") {
    return parseCSV(file);
  } else if (extension === "xlsx" || extension === "xls") {
    return parseExcel(file);
  } else {
    throw new Error(
      `Unsupported file format: .${extension}. Please upload .csv, .tsv, .xlsx, or .xls files.`
    );
  }
}

async function parseCSV(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        const headers = results.meta.fields ?? [];
        const rows = results.data as Record<string, string | number>[];

        resolve({
          headers,
          rows,
          fileName: file.name,
          fileSize: file.size,
          rowCount: rows.length,
          columnCount: headers.length,
        });
      },
      error: (error: Error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      },
    });
  });
}

async function parseExcel(file: File): Promise<ParsedFile> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  // Use first sheet
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const jsonData = XLSX.utils.sheet_to_json<Record<string, string | number>>(
    sheet,
    { defval: "" }
  );

  const headers =
    jsonData.length > 0 ? Object.keys(jsonData[0]) : [];

  return {
    headers,
    rows: jsonData,
    fileName: file.name,
    fileSize: file.size,
    rowCount: jsonData.length,
    columnCount: headers.length,
  };
}

/**
 * Format file size for display.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
