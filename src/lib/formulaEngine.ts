/**
 * Safe mathematical formula evaluator for psychometric scoring.
 *
 * Supported variables (injected by scoring engine):
 *   Q1, Q2, ... Qn  — scored value for each question in scope
 *   sum             — sum of all in-scope question scores
 *   mean            — arithmetic mean of in-scope question scores
 *   n               — count of valid in-scope questions
 *   PI, E           — mathematical constants
 *
 * Supported operators:  + - * / ^ (exponentiation)
 * Supported functions:  sqrt, log, log2, log10, abs, round, ceil, floor,
 *                       exp, sin, cos, tan, min, max, pow
 *
 * Example formulas:
 *   sum                   → plain sum (same as default)
 *   sum / n               → mean (same as default mean)
 *   Q1 * 2 + Q2 + Q3      → weighted sum
 *   (sum / (n * 4)) * 100 → percentage of maximum (4-pt scale)
 *   sqrt(sum)             → square-root transformation
 */

export interface FormulaContext {
  [variable: string]: number;
}

const MATH_FUNCTIONS: Record<string, (...args: number[]) => number> = {
  sqrt:  (x) => Math.sqrt(x),
  log:   (x) => Math.log(x),
  log2:  (x) => Math.log2(x),
  log10: (x) => Math.log10(x),
  abs:   (x) => Math.abs(x),
  round: (x) => Math.round(x),
  ceil:  (x) => Math.ceil(x),
  floor: (x) => Math.floor(x),
  exp:   (x) => Math.exp(x),
  sin:   (x) => Math.sin(x),
  cos:   (x) => Math.cos(x),
  tan:   (x) => Math.tan(x),
  min:   (...args) => Math.min(...args),
  max:   (...args) => Math.max(...args),
  pow:   (base, exp) => Math.pow(base, exp),
};

const CONSTANTS: Record<string, number> = {
  PI: Math.PI,
  E:  Math.E,
};

// ── Tokeniser ────────────────────────────────────────────────────────────────

type Token =
  | { type: "NUMBER"; value: number }
  | { type: "IDENT";  name: string }
  | { type: "OP";     op: string }
  | { type: "LPAREN" }
  | { type: "RPAREN" }
  | { type: "COMMA" }
  | { type: "EOF" };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];

    if (/\s/.test(ch)) { i++; continue; }

    // Number literal (integer or decimal)
    if (/\d/.test(ch) || (ch === "." && /\d/.test(expr[i + 1] ?? ""))) {
      let raw = "";
      while (i < expr.length && (/\d/.test(expr[i]) || expr[i] === ".")) raw += expr[i++];
      tokens.push({ type: "NUMBER", value: parseFloat(raw) });
      continue;
    }

    // Identifier (function name, variable, constant)
    if (/[a-zA-Z_]/.test(ch)) {
      let name = "";
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) name += expr[i++];
      tokens.push({ type: "IDENT", name });
      continue;
    }

    if (ch === "(") { tokens.push({ type: "LPAREN" }); i++; continue; }
    if (ch === ")") { tokens.push({ type: "RPAREN" }); i++; continue; }
    if (ch === ",") { tokens.push({ type: "COMMA" });  i++; continue; }

    if (["+", "-", "*", "/", "^"].includes(ch)) {
      tokens.push({ type: "OP", op: ch });
      i++;
      continue;
    }

    throw new Error(`Unexpected character '${ch}' at position ${i}`);
  }

  tokens.push({ type: "EOF" });
  return tokens;
}

// ── Recursive-descent parser ─────────────────────────────────────────────────
// Grammar (highest to lowest precedence):
//   expr         ::= additive
//   additive     ::= multiplicative (('+' | '-') multiplicative)*
//   multiplicative ::= power (('*' | '/') power)*
//   power        ::= unary ('^' power)?          ← right-associative
//   unary        ::= '-' unary | primary
//   primary      ::= NUMBER | IDENT '(' args ')' | IDENT | '(' expr ')'
//   args         ::= expr (',' expr)*

class Parser {
  private pos = 0;
  constructor(private readonly tokens: Token[], private readonly ctx: FormulaContext) {}

  private peek(): Token { return this.tokens[this.pos]; }
  private consume(): Token { return this.tokens[this.pos++]; }

  private expect(type: Token["type"]): Token {
    const tok = this.consume();
    if (tok.type !== type) throw new Error(`Expected ${type}, got ${tok.type}`);
    return tok;
  }

  parse(): number {
    const result = this.parseAdditive();
    if (this.peek().type !== "EOF") throw new Error("Unexpected tokens after expression end");
    return result;
  }

  private parseAdditive(): number {
    let left = this.parseMultiplicative();
    while (this.peek().type === "OP") {
      const op = (this.peek() as { type: "OP"; op: string }).op;
      if (op !== "+" && op !== "-") break;
      this.consume();
      const right = this.parseMultiplicative();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  private parseMultiplicative(): number {
    let left = this.parsePower();
    while (this.peek().type === "OP") {
      const op = (this.peek() as { type: "OP"; op: string }).op;
      if (op !== "*" && op !== "/") break;
      this.consume();
      const right = this.parsePower();
      if (op === "/" && right === 0) throw new Error("Division by zero");
      left = op === "*" ? left * right : left / right;
    }
    return left;
  }

  private parsePower(): number {
    const base = this.parseUnary();
    if (this.peek().type === "OP" && (this.peek() as { type: "OP"; op: string }).op === "^") {
      this.consume();
      return Math.pow(base, this.parsePower()); // right-associative
    }
    return base;
  }

  private parseUnary(): number {
    if (this.peek().type === "OP" && (this.peek() as { type: "OP"; op: string }).op === "-") {
      this.consume();
      return -this.parseUnary();
    }
    return this.parsePrimary();
  }

  private parsePrimary(): number {
    const tok = this.peek();

    if (tok.type === "NUMBER") {
      this.consume();
      return tok.value;
    }

    if (tok.type === "IDENT") {
      this.consume();
      const name = tok.name;

      // Function call
      if (this.peek().type === "LPAREN") {
        this.consume(); // (
        const args: number[] = [];
        if (this.peek().type !== "RPAREN") {
          args.push(this.parseAdditive());
          while (this.peek().type === "COMMA") {
            this.consume();
            args.push(this.parseAdditive());
          }
        }
        this.expect("RPAREN");
        const fn = MATH_FUNCTIONS[name];
        if (!fn) throw new Error(`Unknown function: ${name}()`);
        return fn(...args);
      }

      // Named constant
      if (name in CONSTANTS) return CONSTANTS[name];

      // Context variable (Q1, sum, mean, n, ...)
      if (name in this.ctx) return this.ctx[name];

      // Qn reference for a question that has no score (missing) → 0
      if (/^Q\d+$/.test(name)) return 0;

      throw new Error(`Unknown variable: ${name}`);
    }

    if (tok.type === "LPAREN") {
      this.consume();
      const val = this.parseAdditive();
      this.expect("RPAREN");
      return val;
    }

    throw new Error(`Unexpected token: ${tok.type}`);
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export function evaluateFormula(formula: string, context: FormulaContext): number {
  const trimmed = formula.trim();
  if (!trimmed) throw new Error("Formula is empty");
  const tokens = tokenize(trimmed);
  return new Parser(tokens, context).parse();
}

/** Returns { valid: true } or { valid: false, error: string }. */
export function validateFormula(
  formula: string,
  sampleContext: FormulaContext
): { valid: boolean; error?: string } {
  try {
    evaluateFormula(formula, sampleContext);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: (e as Error).message };
  }
}
