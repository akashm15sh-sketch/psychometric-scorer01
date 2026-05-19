# 🧠 PsychScore — Psychometric Assessment Scorer

**PsychScore** is a browser-based tool for scoring self-reported psychometric questionnaires. Upload participant responses, define your Likert scale, configure reverse scoring and subscales, run statistical analyses, and download publication-ready results — all without writing a single line of code.

### 🔗 **[Launch PsychScore →](https://psychometric-scorer01.vercel.app/)**

> **100% Client-Side** — Your data never leaves your browser. All processing happens locally.

---

## Table of Contents

- [Features](#-features)
- [Usage Workflow](#-usage-workflow)
  - [Step 1: Upload Data](#step-1--upload-data)
  - [Step 2: Configure Scoring](#step-2-%EF%B8%8F-configure-scoring)
  - [Step 3: Select Analyses](#step-3--select-analyses)
  - [Step 4: View & Export Results](#step-4--view--export-results)
- [Data Format Requirements](#-data-format-requirements)
- [Supported Analyses](#-supported-analyses)
- [Formula Engine](#-formula-engine)
- [Session Persistence](#-session-persistence)
- [Tech Stack](#-tech-stack)
- [Local Development](#-local-development)

---

## ✨ Features

| Feature | Description |
|---|---|
| **Multi-format Upload** | CSV, TSV, XLSX, and XLS file support with drag-and-drop |
| **Text Response Mapping** | Automatically detect and map Likert text labels (e.g., "Strongly Agree" → 5) |
| **Reverse Scoring** | Toggle reverse scoring per item with live scale previews |
| **Subscales** | Define named subscales and assign questions to each |
| **Custom Formulas** | Write arithmetic formulas for total and subscale scores |
| **Statistical Analyses** | Descriptives, reliability (Cronbach's α), normality tests, t-tests, correlations |
| **Interactive Charts** | Histograms, box plots, bar charts, Q-Q plots rendered in-browser |
| **Excel Export** | Download a multi-sheet `.xlsx` workbook with scored data, summary, and reference tables |
| **Session Persistence** | Your work is auto-saved to `localStorage` and restored on reload |
| **Privacy-First** | Everything runs in the browser — no server, no data upload |

---

## 📖 Usage Workflow

> **No installation required.** PsychScore is hosted on Vercel and runs entirely in your browser.  
> 👉 **[https://psychometric-scorer01.vercel.app/](https://psychometric-scorer01.vercel.app/)**

PsychScore uses a 4-step wizard. Each step must be completed before progressing to the next. You can click any previously completed step in the navigation bar to go back and adjust settings.

### Step 1: 📄 Upload Data

1. **Drag and drop** your data file onto the upload zone, or **click to browse** your file system.
2. Supported formats: `.csv`, `.tsv`, `.xlsx`, `.xls`
3. The tool parses the file and shows a **data preview** (first 5 rows) so you can verify it loaded correctly.
4. File stats are displayed: participant count, column count, and file size.
5. Click **"Continue to Configuration →"** to proceed.

> **Tip:** If your file looks incorrect in the preview, remove it and re-upload. Ensure your data has a header row.

#### What your data should look like

```
Participant_ID, Q1, Q2, Q3, Q4, Q5
P001,           4,  3,  5,  2,  4
P002,           3,  2,  4,  1,  5
P003,           5,  4,  3,  5,  2
```

Or with text responses:

```
Participant_ID, Q1_Mood,         Q2_Sleep,  Q3_Energy
P001,           Strongly Agree,  Agree,     Neutral
P002,           Agree,           Agree,     Strongly Agree
P003,           Neutral,         Disagree,  Agree
```

---

### Step 2: ⚙️ Configure Scoring

This is the most important step. Here you define how your questionnaire is scored.

#### 2a. Study Information

| Field | Description | Required |
|---|---|---|
| **Study Name** | A descriptive name for your study (e.g., "PHQ-9 Depression Study") | ✅ |
| **Participant ID Column** | Select which column contains participant identifiers | ✅ |
| **Likert Scale Minimum** | The lowest value on your scale (e.g., `0` or `1`) | ✅ |
| **Likert Scale Maximum** | The highest value on your scale (e.g., `5` or `7`) | ✅ |

A live Likert chip preview shows the scale range you've configured.

#### 2b. Select Question Columns

- Click individual columns to select/deselect them as scored questions.
- Use **Select All** / **Deselect All** for bulk operations.
- Only selected columns will be scored; unselected columns (like demographics) are ignored.

#### 2c. Text Response Mapping (if applicable)

If your data contains **text responses** (e.g., "Strongly Agree", "Never"), PsychScore detects them automatically and asks you to map each label to a numeric score.

**Quick options:**
- **Preset buttons** — Apply common Likert mappings with one click:
  - `5-pt Agree (SA→5)` — Strongly Agree = 5, Agree = 4, etc.
  - `5-pt Agree (SA→1)` — Reversed direction
  - `4-pt Frequency` — Never = 0, Sometimes = 1, Often = 2, Almost Always = 3
  - `DASS-21 (0–3)` — Standard DASS-21 response mapping
  - `Yes/No (1/0)` — Binary responses
  - `7-pt Agreement` — 7-point Likert scale
- **🪄 Auto-Detect** — Attempts to match all detected text values against known presets.
- **Manual entry** — Type any response text and its numeric value, then click **+ Add**.

> ⚠️ **All text responses must be mapped** before you can proceed. The tool shows an "unmapped" counter to track remaining items.

#### 2d. Scoring Configuration

For each selected question column, you can toggle **reverse scoring**:

- **→ Normal** — The response value is used as-is.
- **🔄 Reversed** — The score is inverted using the formula: `scored = (max + min) - original`.

A live **scale preview** shows the mapping (e.g., `1→5, 2→4, 3→3, 4→2, 5→1`) for each question.

#### 2e. Total Score Formula (Optional)

Define a custom formula for computing the overall total score per participant. If left blank, the default is a **simple sum** of all question scores.

**Available variables:**
- `Q1`, `Q2`, ..., `Qn` — Individual question scores
- `sum` — Sum of all question scores
- `mean` — Mean of all question scores
- `n` — Number of valid questions

**Available functions:** `sqrt`, `log`, `abs`, `round`, `min`, `max`, `pow`

**Examples:**
```
sum                          # Default: plain sum
Q1*2 + Q2 + Q3              # Weighted scoring
(sum / (n * 5)) * 100        # Percentage score
mean * 10                    # Scaled mean
```

The formula input provides **live validation** — a green ✓ or red ✗ indicator confirms whether your formula is syntactically correct.

#### 2f. Subscales (Optional)

Group questions into named subscales for separate scoring:

1. Type a subscale name (e.g., "Anxiety", "Depression") and click **+ Add**.
2. Click the `Q1`, `Q2`, etc. buttons to assign questions to each subscale.
3. Optionally define a **per-subscale formula** using the same syntax as the total score formula.
4. Click **✕** to remove a subscale.

When done, click **"Continue to Scoring →"**.

---

### Step 3: 📐 Select Analyses

Choose which statistical analyses to include in your results. This step is inspired by tools like **JASP** and **Jamovi** — toggle on only the analyses you need.

#### Available Analysis Modules

| Module | Options |
|---|---|
| **📊 Descriptive Statistics** | Mean, Median, Mode, SD, Variance, SEM, Range, Min/Max, Skewness, Kurtosis, Percentiles (Q1/Q3/IQR), Frequency Tables |
| **🔗 Reliability Analysis** | Cronbach's Alpha, Item-Total Correlations & Alpha-if-Deleted |
| **📈 Normality Tests** | Shapiro-Wilk test, Histogram with Normal Curve, Q-Q Plot |
| **🔄 Data Transformations** | Log (ln), Square Root, Z-Score standardization |
| **🧪 Inferential Statistics** | One-Sample T-Test (with configurable μ₀), Correlation Matrix (Pearson or Spearman) |
| **📉 Plots & Graphs** | Histogram, Box Plot, Bar Chart (Mean ± SD) |

Each module has a **toggle switch** — click the section header to enable/disable it. When enabled, you can further customize which specific metrics to include.

Click **"🚀 Run Analysis"** to begin processing.

A progress bar shows the pipeline stages:
1. Scoring responses
2. Preparing item data
3. Running statistical analyses
4. Finalizing

---

### Step 4: 📊 View & Export Results

The results page presents all your analyses in organized, scrollable cards:

#### Overview Card
- **Scored** — Number of successfully scored participants
- **Questions** — Total question count
- **Grand Mean** — Overall mean total score
- **Grand SD** — Overall standard deviation
- **Skipped** — Participants excluded due to >50% missing data (if any)

#### Descriptive Statistics Table
A comprehensive table showing all selected metrics per variable (total score and each subscale).

#### Reliability Analysis
- **Cronbach's Alpha** — Displayed as a prominent stat card
- **Item-Total Correlations** — Table showing each item's correlation with the total and the alpha value if that item were deleted

#### Normality Tests
- **Shapiro-Wilk table** — W statistic, p-value, and normal/non-normal determination
- **Histograms** — Distribution with overlaid normal curve
- **Q-Q Plots** — Quantile-quantile plots for visual normality assessment

#### Data Transformations Table
Shows original vs. transformed Shapiro-Wilk p-values and whether normality improved.

#### Inferential Statistics
- **One-Sample T-Test** — t-statistic, degrees of freedom, p-value, mean difference, 95% CI, and Cohen's d
- **Correlation Matrix** — Color-coded matrix with significance markers (* p < .05, ** p < .01)

#### Interactive Charts
Histograms, box plots, and bar charts rendered as SVG directly in the browser.

#### Scored Data Preview
A table showing the first 10 participants with their scored responses, total, and mean.

#### Actions

| Button | Action |
|---|---|
| **← Back to Analysis Options** | Return to Step 3 to adjust analyses |
| **🔄 New Study** | Reset the entire session (with confirmation modal) |
| **📥 Download Excel** | Export a multi-sheet `.xlsx` workbook |

#### Excel Export Contents

The downloaded workbook includes 4 sheets:

| Sheet | Contents |
|---|---|
| **Scored Data** | Every participant with raw responses, scored responses, totals, means, subscale scores, and flags |
| **Summary** | Study name, participant counts, Likert range, grand mean/SD, Cronbach's α |
| **Subscale Stats** | Per-subscale mean, SD, and N (only if subscales were defined) |
| **Scoring Reference** | Question-by-question reference showing column headers, scoring direction, and subscale assignment |

---

## 📋 Data Format Requirements

### Required Structure

| Rule | Details |
|---|---|
| **Header Row** | The first row must contain column headers |
| **One Participant Per Row** | Each subsequent row represents one participant |
| **ID Column** | At least one column should contain participant identifiers |
| **Response Columns** | Remaining columns contain responses (numeric or text) |

### Supported File Types

| Format | Extension | Notes |
|---|---|---|
| Comma-Separated Values | `.csv` | Most common format |
| Tab-Separated Values | `.tsv` | Tab-delimited |
| Excel Workbook | `.xlsx` | Modern Excel format |
| Legacy Excel | `.xls` | Older Excel format |

### Response Types

- **Numeric responses** — Values like `1`, `2`, `3`, `4`, `5` are used directly.
- **Text responses** — Labels like "Strongly Agree" require mapping via the text-to-number mapping feature in Step 2.
- **Missing values** — Empty cells or blanks are counted as missing. Participants with >50% missing data are flagged and excluded from summary statistics.

---

## 📊 Supported Analyses

### Descriptive Statistics
Central tendency (mean, median, mode), dispersion (SD, variance, SEM, range), and distribution shape (skewness, excess kurtosis, percentiles, frequency tables).

### Reliability
Cronbach's alpha for internal consistency, with item-level diagnostics showing each item's corrected item-total correlation and the scale's alpha if that item were removed.

### Normality Testing
Shapiro-Wilk test for formal hypothesis testing, plus visual diagnostics via histograms with normal curve overlay and Q-Q plots.

### Data Transformations
Log (natural log), square root, and z-score transformations with before/after Shapiro-Wilk comparisons to assess whether transformations improve normality.

### Inferential Statistics
One-sample t-tests with configurable test value (μ₀), including effect size (Cohen's d) and 95% confidence intervals. Inter-item correlation matrices using Pearson or Spearman methods with significance testing.

### Plots & Graphs
Interactive SVG-based histograms, box plots (showing median, Q1, Q3, whiskers), and bar charts (mean ± standard deviation).

---

## 🔢 Formula Engine

PsychScore includes a safe, sandboxed formula engine for custom scoring. Formulas are validated in real-time before execution.

### Syntax

| Element | Examples |
|---|---|
| **Arithmetic** | `+`, `-`, `*`, `/`, `()` |
| **Variables** | `Q1`, `Q2`, ..., `sum`, `mean`, `n` |
| **Functions** | `sqrt(x)`, `log(x)`, `abs(x)`, `round(x)`, `min(a,b)`, `max(a,b)`, `pow(a,b)` |
| **Literals** | Any number: `100`, `3.14`, `0.5` |

### Example Formulas

```
sum                      # Simple sum (default)
mean                     # Mean score
(sum / (n * 5)) * 100    # Percentage of maximum possible score
Q1 + Q2 + Q3            # Sum of specific items only
sqrt(sum)                # Square root transformation
(Q1*2 + Q2*3) / 5       # Weighted combination
```

---

## 💾 Session Persistence

- Your entire session (uploaded data, configuration, analysis results) is **automatically saved** to the browser's `localStorage`.
- If you close the tab or refresh the page, your progress is **fully restored** when you return.
- To start fresh, click the **🔄 New Study** button in the header. A **confirmation modal** warns you before clearing data, prompting you to download results first if needed.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org/) 16 |
| Language | TypeScript |
| UI | React 19, Vanilla CSS |
| File Parsing | [PapaParse](https://www.papaparse.com/) (CSV/TSV), [SheetJS](https://sheetjs.com/) (XLSX/XLS) |
| Excel Export | [SheetJS](https://sheetjs.com/) + [FileSaver.js](https://github.com/eligrey/FileSaver.js/) |
| Charts | Custom SVG components |
| State | React `useState` + `localStorage` persistence |

---

## 🧑‍💻 Local Development

If you want to run PsychScore locally or contribute to the codebase:

### Prerequisites

- **Node.js** v18+
- **npm** v9+

### Setup

```bash
cd app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Project Structure

```
app/
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout with metadata & fonts
│   │   ├── page.tsx           # Main page (4-step wizard controller)
│   │   └── globals.css        # Full design system & styles
│   ├── components/
│   │   ├── UploadStep.tsx     # File upload with drag-and-drop
│   │   ├── ConfigStep.tsx     # Scoring configuration UI
│   │   ├── ScoringStep.tsx    # Analysis options & runner
│   │   ├── ResultsStep.tsx    # Results display & export
│   │   ├── Charts.tsx         # SVG chart components
│   │   └── ConfirmModal.tsx   # Reset confirmation dialog
│   └── lib/
│       ├── fileParser.ts      # CSV/XLSX parsing logic
│       ├── scoringEngine.ts   # Core scoring algorithm
│       ├── formulaEngine.ts   # Safe formula evaluation
│       ├── statsEngine.ts     # Statistical analysis engine
│       ├── exportUtils.ts     # Excel workbook generation
│       └── storage.ts         # localStorage persistence
├── package.json
└── next.config.ts
```

### Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

---

## 📄 License

This project is for academic and research use.

---

<p align="center">
  Built with ❤️ for researchers and psychometricians
</p>
