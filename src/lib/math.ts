export type Fraction = { num: number; den: number };

export type UnitSystem = "imperial" | "metric";

const INCHES_PER_FOOT = 12;
const MM_PER_INCH = 25.4;

const gcd = (a: number, b: number) => {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    [x, y] = [y, x % y];
  }
  return x || 1;
};

const reduce = (f: Fraction): Fraction => {
  if (f.num === 0) return { num: 0, den: 1 };
  const sign = f.den < 0 ? -1 : 1;
  const g = gcd(f.num, f.den);
  return { num: (f.num * sign) / g, den: (f.den * sign) / g };
};

const add = (a: Fraction, b: Fraction) =>
  reduce({ num: a.num * b.den + b.num * a.den, den: a.den * b.den });
const sub = (a: Fraction, b: Fraction) =>
  reduce({ num: a.num * b.den - b.num * a.den, den: a.den * b.den });
const mul = (a: Fraction, b: Fraction) =>
  reduce({ num: a.num * b.num, den: a.den * b.den });
const div = (a: Fraction, b: Fraction) => {
  if (b.num === 0) return null;
  return reduce({ num: a.num * b.den, den: a.den * b.num });
};

export const toDecimal = (f: Fraction) => f.num / f.den;

const fractionFromDecimal = (value: number, den = 10000): Fraction =>
  reduce({ num: Math.round(value * den), den });

const parseFraction = (value: string): Fraction | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes("/")) {
    const [n, d] = trimmed.split("/").map(Number);
    if (!d || Number.isNaN(n) || Number.isNaN(d)) return null;
    return reduce({ num: n, den: d });
  }
  const num = Number(trimmed);
  if (Number.isNaN(num)) return null;
  if (Number.isInteger(num)) return { num, den: 1 };
  return fractionFromDecimal(num);
};

const parseImperialValue = (raw: string): Fraction | null => {
  const clean = raw.trim();
  if (!clean) return null;
  let total: Fraction = { num: 0, den: 1 };
  const ftMatch = clean.match(/(\d+)\s*'/);
  if (ftMatch) {
    total = { num: parseInt(ftMatch[1], 10) * INCHES_PER_FOOT, den: 1 };
  }
  let inchPart = ftMatch ? clean.slice(clean.indexOf("'") + 1).trim() : clean;
  inchPart = inchPart.replace(/"/g, "").trim();
  if (!inchPart) return reduce(total);

  if (inchPart.includes("-") && inchPart.includes("/")) {
    const dash = inchPart.indexOf("-");
    const whole = parseInt(inchPart.slice(0, dash), 10);
    const frac = parseFraction(inchPart.slice(dash + 1));
    if (!Number.isNaN(whole) && frac) {
      total = add(total, add({ num: whole, den: 1 }, frac));
    } else if (frac) {
      total = add(total, frac);
    }
  } else if (inchPart.includes(" ") && inchPart.includes("/")) {
    const space = inchPart.lastIndexOf(" ");
    const whole = parseInt(inchPart.slice(0, space).trim(), 10);
    const frac = parseFraction(inchPart.slice(space + 1).trim());
    if (!Number.isNaN(whole) && frac) {
      total = add(total, add({ num: whole, den: 1 }, frac));
    } else if (frac) {
      total = add(total, frac);
    }
  } else if (inchPart.includes("/")) {
    const frac = parseFraction(inchPart);
    if (frac) total = add(total, frac);
  } else {
    const whole = parseInt(inchPart, 10);
    if (!Number.isNaN(whole)) total = add(total, { num: whole, den: 1 });
  }

  return reduce(total);
};

const parseMetricValue = (raw: string): Fraction | null => {
  const clean = raw.trim().replace(/[^\d.+-]/g, "");
  if (!clean) return null;
  const mm = Number(clean);
  if (Number.isNaN(mm)) return null;
  const inches = mm / MM_PER_INCH;
  return fractionFromDecimal(inches);
};

type Token =
  | { type: "op"; raw: string }
  | { type: "paren"; raw: "(" | ")" }
  | { type: "val"; raw: string };

const tokenize = (expr: string): Token[] => {
  const tokens: Token[] = [];
  const ops = ["+", "-", "−", "×", "÷"];
  let buf = "";
  for (let i = 0; i < expr.length; i += 1) {
    const ch = expr[i];
    if (ops.includes(ch) || ch === "(" || ch === ")") {
      if (buf.trim()) tokens.push({ type: "val", raw: buf.trim() });
      tokens.push({
        type: ch === "(" || ch === ")" ? "paren" : "op",
        raw: ch,
      });
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) tokens.push({ type: "val", raw: buf.trim() });
  return tokens;
};

export const evaluateExpression = (
  expr: string,
  unitSystem: UnitSystem
): Fraction | null => {
  const tokens = tokenize(expr);
  if (tokens.length === 0) return null;
  let pos = 0;
  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  const parseAtom = () => {
    const t = peek();
    if (!t) return null;
    if (t.type === "paren" && t.raw === "(") {
      consume();
      const v = parseExpr(0);
      const cl = peek();
      if (cl && cl.type === "paren" && cl.raw === ")") consume();
      return v;
    }
    if (t.type === "val") {
      consume();
      return unitSystem === "imperial"
        ? parseImperialValue(t.raw)
        : parseMetricValue(t.raw);
    }
    return null;
  };

  const prec: Record<string, number> = { "+": 1, "-": 1, "−": 1, "×": 2, "÷": 2 };

  const parseExpr = (minPrec: number): Fraction | null => {
    let left = parseAtom();
    if (!left) return null;
    while (pos < tokens.length) {
      const t = peek();
      if (!t || t.type !== "op" || (prec[t.raw] || 0) < minPrec) break;
      const op = consume().raw;
      const right = parseExpr((prec[op] || 0) + 1);
      if (!right) return null;
      if (op === "+") left = add(left, right);
      else if (op === "-" || op === "−") left = sub(left, right);
      else if (op === "×") left = mul(left, right);
      else if (op === "÷") {
        const divided = div(left, right);
        if (!divided) return null;
        left = divided;
      }
    }
    return left;
  };

  const result = parseExpr(0);
  if (!result) return null;
  return pos >= tokens.length ? result : null;
};

const formatDecimal = (value: number, maxDecimals: number) => {
  const fixed = value.toFixed(maxDecimals);
  return fixed.replace(/\.?0+$/, "");
};

const snapToDenominator = (value: number, den: number) => {
  const whole = Math.floor(value);
  const frac = value - whole;
  let num = Math.round(frac * den);
  let wholeOut = whole;
  if (num === den) {
    wholeOut += 1;
    num = 0;
  }
  const g = gcd(num, den);
  return { whole: wholeOut, num: num / g, den: den / g };
};

export const formatImperial = (frac: Fraction, precision: number) => {
  const value = toDecimal(frac);
  const neg = value < 0;
  const abs = Math.abs(value);
  let feet = Math.floor(abs / INCHES_PER_FOOT);
  const inches = abs - feet * INCHES_PER_FOOT;
  let { whole, num, den } = snapToDenominator(inches, precision);

  if (whole >= INCHES_PER_FOOT) {
    feet += 1;
    whole -= INCHES_PER_FOOT;
  }

  const sign = neg ? "-" : "";
  const parts: string[] = [];
  if (feet > 0) parts.push(`${feet}'`);
  if (num > 0 && whole > 0) parts.push(`${whole}-${num}/${den}"`);
  else if (num > 0) parts.push(`${num}/${den}"`);
  else parts.push(`${whole}"`);

  return `${sign}${parts.join(" ")}`.trim();
};

export const formatMetric = (frac: Fraction) => {
  const inches = toDecimal(frac);
  const mm = inches * MM_PER_INCH;
  return `${formatDecimal(mm, 4)} mm`;
};

export const formatResult = (
  frac: Fraction,
  unitSystem: UnitSystem,
  precision: number
) => (unitSystem === "imperial" ? formatImperial(frac, precision) : formatMetric(frac));

export const formatConverted = (
  frac: Fraction,
  fromUnit: UnitSystem,
  precision: number
) => {
  if (fromUnit === "imperial") return formatMetric(frac);
  return formatImperial(frac, precision);
};

export const inchesToMm = (inches: number) => inches * MM_PER_INCH;
export const mmToInches = (mm: number) => mm / MM_PER_INCH;
