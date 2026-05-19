"use client";

import { useState, useRef, useCallback } from "react";
import { parseFile, formatFileSize, type ParsedFile } from "@/lib/fileParser";

interface Props {
  onUploaded: (file: ParsedFile) => void;
}

export default function UploadStep({ onUploaded }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const result = await parseFile(file);
      if (result.rowCount === 0) throw new Error("The file appears to be empty.");
      if (result.columnCount === 0) throw new Error("No columns detected.");
      setParsedFile(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to parse file.");
    } finally {
      setLoading(false);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">📄 Upload Response Data</h2>
        <p className="card-desc">
          Upload the spreadsheet containing participant responses. Each row should
          represent one participant and each column one question.
        </p>
      </div>

      {error && <div className="alert alert-error">⚠️ {error}</div>}

      <div
        className={`upload-zone ${dragOver ? "dragover" : ""} ${parsedFile ? "has-file" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.tsv,.xlsx,.xls"
          onChange={onFileChange}
          style={{ display: "none" }}
        />

        {loading ? (
          <>
            <div className="upload-icon"><span className="spinner" /></div>
            <div className="upload-title">Parsing file…</div>
          </>
        ) : parsedFile ? (
          <>
            <div className="upload-icon">✅</div>
            <div className="upload-title">{parsedFile.fileName}</div>
            <div className="upload-subtitle">
              {parsedFile.rowCount} participants · {parsedFile.columnCount} columns · {formatFileSize(parsedFile.fileSize)}
            </div>
          </>
        ) : (
          <>
            <div className="upload-icon">📁</div>
            <div className="upload-title">Drop your file here or click to browse</div>
            <div className="upload-subtitle">Supports CSV, TSV, XLSX, and XLS formats</div>
            <div className="upload-formats">
              {[".csv", ".tsv", ".xlsx", ".xls"].map((f) => (
                <span key={f} className="format-badge">{f}</span>
              ))}
            </div>
          </>
        )}
      </div>

      {parsedFile && (
        <>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3>Data Preview (first 5 rows)</h3>
            <button className="remove-file" onClick={(e) => { e.stopPropagation(); setParsedFile(null); }}>
              ✕ Remove file
            </button>
          </div>
          <div className="preview-table-wrap">
            <table className="preview-table">
              <thead>
                <tr>
                  {parsedFile.headers.map((h) => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {parsedFile.rows.slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    {parsedFile.headers.map((h) => <td key={h}>{String(row[h] ?? "")}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="btn-group">
            <button className="btn btn-primary" onClick={() => onUploaded(parsedFile)}>
              Continue to Configuration →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
