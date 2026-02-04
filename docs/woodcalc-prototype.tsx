import { useState, useReducer, useEffect } from "react";

const uuid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// --- Fraction Math Engine ---
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; };
const fracReduce = (f) => { if (f.num === 0) return { num: 0, den: 1 }; const g = gcd(Math.abs(f.num), Math.abs(f.den)); const sign = f.den < 0 ? -1 : 1; return { num: (f.num * sign) / g, den: (f.den * sign) / g }; };
const fracAdd = (a, b) => fracReduce({ num: a.num * b.den + b.num * a.den, den: a.den * b.den });
const fracSub = (a, b) => fracReduce({ num: a.num * b.den - b.num * a.den, den: a.den * b.den });
const fracMul = (a, b) => fracReduce({ num: a.num * b.num, den: a.den * b.den });
const fracDiv = (a, b) => { if (b.num === 0) return null; return fracReduce({ num: a.num * b.den, den: a.den * b.num }); };
const fracToDecimal = (f) => f.num / f.den;
const parseFraction = (s) => {
  s = s.trim();
  if (s.includes("/")) { const [n, d] = s.split("/").map(Number); if (!d || isNaN(n) || isNaN(d)) return null; return fracReduce({ num: n, den: d }); }
  const v = parseFloat(s); if (isNaN(v)) return null;
  if (Number.isInteger(v)) return { num: v, den: 1 };
  const den = 10000; return fracReduce({ num: Math.round(v * den), den });
};

const snapToPrecision = (frac, maxDen) => {
  const dec = fracToDecimal(frac);
  const neg = dec < 0; const abs = Math.abs(dec);
  const whole = Math.floor(abs); const rem = abs - whole;
  const snapped = Math.round(rem * maxDen);
  let n = snapped, d = maxDen; const g = gcd(n, d); n /= g; d /= g;
  return { whole: neg ? -whole : whole, num: n, den: d };
};

// --- Imperial Parser ---
const parseImperial = (expr) => {
  let total = { num: 0, den: 1 };
  const clean = expr.trim();
  const ftMatch = clean.match(/(\d+)\s*'/);
  if (ftMatch) total = { num: parseInt(ftMatch[1]) * 12, den: 1 };
  let inchPart = ftMatch ? clean.slice(clean.indexOf("'") + 1).trim() : clean;
  inchPart = inchPart.replace(/"/g, "").trim();
  if (!inchPart) return fracReduce(total);
  // dash mixed: 5-3/4
  if (inchPart.includes("-") && inchPart.includes("/")) {
    const di = inchPart.indexOf("-"); const w = parseInt(inchPart.slice(0, di)); const f = parseFraction(inchPart.slice(di + 1));
    if (!isNaN(w) && f) total = fracAdd(total, fracAdd({ num: w, den: 1 }, f)); else if (f) total = fracAdd(total, f);
  // space mixed: 5 3/4
  } else if (inchPart.includes(" ") && inchPart.includes("/")) {
    const li = inchPart.lastIndexOf(" "); const w = parseInt(inchPart.slice(0, li).trim()); const f = parseFraction(inchPart.slice(li + 1).trim());
    if (!isNaN(w) && f) total = fracAdd(total, fracAdd({ num: w, den: 1 }, f)); else if (f) total = fracAdd(total, f);
  // fraction only: 3/4
  } else if (inchPart.includes("/")) { const f = parseFraction(inchPart); if (f) total = fracAdd(total, f);
  // whole only: 5
  } else { const v = parseInt(inchPart); if (!isNaN(v)) total = fracAdd(total, { num: v, den: 1 }); }
  return fracReduce(total);
};

// --- Tokenizer with parens ---
const tokenize = (expr) => {
  const tokens = []; let buf = ""; const ops = ["+", "−", "×", "÷"];
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ops.includes(ch) || ch === "(" || ch === ")") {
      if (buf.trim()) tokens.push({ type: "val", raw: buf.trim() }); tokens.push({ type: ch === "(" || ch === ")" ? "paren" : "op", raw: ch }); buf = "";
    } else { buf += ch; }
  }
  if (buf.trim()) tokens.push({ type: "val", raw: buf.trim() });
  return tokens;
};

// --- Evaluator with parens + PEMDAS ---
const evaluate = (expr) => {
  const tokens = tokenize(expr);
  if (tokens.length === 0) return null;
  let pos = 0;
  const peek = () => tokens[pos]; const consume = () => tokens[pos++];
  const parseAtom = () => {
    const t = peek();
    if (!t) return null;
    if (t.type === "paren" && t.raw === "(") {
      consume(); const v = parseExpr(0); const cl = peek();
      if (cl && cl.type === "paren" && cl.raw === ")") consume();
      return v;
    }
    if (t.type === "val") { consume(); return parseImperial(t.raw); }
    return null;
  };
  const prec = { "+": 1, "−": 1, "×": 2, "÷": 2 };
  const parseExpr = (minPrec) => {
    let left = parseAtom(); if (!left) return null;
    while (pos < tokens.length) {
      const t = peek(); if (!t || t.type !== "op" || (prec[t.raw] || 0) < minPrec) break;
      const op = consume().raw; const right = parseExpr((prec[op] || 0) + 1);
      if (!right) return null;
      if (op === "+") left = fracAdd(left, right);
      else if (op === "−") left = fracSub(left, right);
      else if (op === "×") left = fracMul(left, right);
      else if (op === "÷") { left = fracDiv(left, right); if (!left) return null; }
    }
    return left;
  };
  const result = parseExpr(0);
  return result && pos >= tokens.length ? result : (pos < tokens.length ? null : result);
};

// --- Formatter ---
const formatResult = (frac, precision, unit) => {
  if (!frac) return "Error";
  const val = fracToDecimal(frac);
  if (unit === "metric") return Number.isInteger(val) ? `${val} mm` : `${parseFloat(val.toFixed(4))} mm`;
  const neg = val < 0; const abs = Math.abs(val);
  const feet = Math.floor(abs / 12); const inchDec = abs - feet * 12;
  let wh, fn, fd;
  if (precision === "exact") {
    const inchFrac = fracReduce({ num: Math.round(inchDec * frac.den), den: frac.den });
    const d = fracToDecimal(inchFrac); wh = Math.floor(d);
    const rem = fracReduce({ num: inchFrac.num - wh * inchFrac.den, den: inchFrac.den });
    fn = Math.abs(rem.num); fd = rem.den;
  } else { const sn = snapToPrecision({ num: Math.round(inchDec * 10000), den: 10000 }, precision); wh = sn.whole; fn = sn.num; fd = sn.den; }
  let s = neg ? "-" : "";
  if (feet > 0) s += `${feet}' `;
  if (wh > 0 && fn > 0) s += `${wh}-${fn}/${fd}"`;
  else if (fn > 0) s += `${fn}/${fd}"`;
  else s += `${wh}"`;
  return s.trim();
};

const formatConverted = (frac, precision, fromUnit) => {
  if (!frac) return "Error";
  const val = fracToDecimal(frac);
  if (fromUnit === "imperial") {
    const mm = val * 25.4;
    return Number.isInteger(mm) ? `${mm} mm` : `${parseFloat(mm.toFixed(4))} mm`;
  } else {
    const inches = val / 25.4;
    const inchFrac = fracReduce({ num: Math.round(inches * 10000), den: 10000 });
    return formatResult(inchFrac, precision, "imperial");
  }
};

// --- Time helper ---
const timeAgo = (ts) => {
  const d = Date.now() - ts;
  if (d < 60000) return "just now";
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
};

// --- State ---
const initState = {
  expr: "", result: null, history: [],
  settings: { autoSave: true, unit: "imperial", precision: "exact", convEnabled: false },
  screen: "calc", showHistory: false, editingId: null, editDesc: "",
  _resultFrac: null, _resultOriginalUnit: null, _resultConverted: false,
  _lastEntry: null, _showSaveToast: false,
};

const reducer = (state, action) => {
  switch (action.type) {
    case "INPUT": return { ...state, expr: state.expr + action.val, result: null, _showSaveToast: false, _resultFrac: null, _resultConverted: false };
    case "CLEAR": return { ...state, expr: "", result: null, _showSaveToast: false, _resultFrac: null, _lastEntry: null, _resultConverted: false };
    case "BACKSPACE": return { ...state, expr: state.expr.slice(0, -1), result: null, _showSaveToast: false };
    case "EVAL": {
      if (!state.expr.trim()) return state;
      const r = evaluate(state.expr);
      if (!r) return { ...state, result: "Error", _resultFrac: null };
      const fmt = formatResult(r, state.settings.precision, state.settings.unit);
      const entry = { id: uuid(), expression: state.expr, result: fmt, rawFrac: r, unit: state.settings.unit, fav: false, desc: "", ts: Date.now() };
      if (state.settings.autoSave) {
        return { ...state, result: fmt, history: [entry, ...state.history], _resultFrac: r, _resultOriginalUnit: state.settings.unit, _resultConverted: false, _lastEntry: null, _showSaveToast: true };
      }
      return { ...state, result: fmt, _resultFrac: r, _resultOriginalUnit: state.settings.unit, _resultConverted: false, _lastEntry: entry, _showSaveToast: false };
    }
    case "SAVE_MANUAL": {
      if (!state._lastEntry) return state;
      return { ...state, history: [state._lastEntry, ...state.history], _lastEntry: null, _showSaveToast: true };
    }
    case "HIDE_TOAST": return { ...state, _showSaveToast: false };
    case "TOGGLE_FAV": return { ...state, history: state.history.map(h => h.id === action.id ? { ...h, fav: !h.fav } : h) };
    case "DELETE": return { ...state, history: state.history.filter(h => h.id !== action.id) };
    case "CLEAR_ALL": return { ...state, history: [] };
    case "SET_DESC": return { ...state, history: state.history.map(h => h.id === action.id ? { ...h, desc: action.desc } : h) };
    case "SET_SCREEN": return { ...state, screen: action.screen };
    case "TOGGLE_HISTORY": return { ...state, showHistory: !state.showHistory, editingId: null };
    case "SET_SETTING": return { ...state, settings: { ...state.settings, [action.key]: action.val } };
    case "START_EDIT": return { ...state, editingId: action.id, editDesc: state.history.find(h => h.id === action.id)?.desc || "" };
    case "UPDATE_EDIT_DESC": return { ...state, editDesc: action.val };
    case "SAVE_EDIT": return { ...state, history: state.history.map(h => h.id === state.editingId ? { ...h, desc: state.editDesc } : h), editingId: null, editDesc: "" };
    case "CANCEL_EDIT": return { ...state, editingId: null, editDesc: "" };
    case "CONVERT": {
      if (!state._resultFrac || state.result === "Error") return state;
      if (!state._resultConverted) {
        const conv = formatConverted(state._resultFrac, state.settings.precision, state._resultOriginalUnit);
        return { ...state, result: conv, _resultConverted: true };
      }
      const orig = formatResult(state._resultFrac, state.settings.precision, state._resultOriginalUnit);
      return { ...state, result: orig, _resultConverted: false };
    }
    default: return state;
  }
};

// --- Theme ---
const themes = {
  light: { bg: "#F9FAFB", card: "#FFFFFF", text: "#111827", textSec: "#6B7280", border: "#E5E7EB", accent: "#D97706", accentText: "#FFFFFF", danger: "#EF4444", keyBg: "#F3F4F6", keyText: "#111827", opBg: "#FEF3C7", opText: "#92400E", eqBg: "#D97706", eqText: "#FFF", displayBg: "#FFFFFF", overlay: "rgba(0,0,0,0.4)", favActive: "#F59E0B", toast: "#065F46", toastText: "#D1FAE5" },
  dark: { bg: "#111827", card: "#1F2937", text: "#F9FAFB", textSec: "#9CA3AF", border: "#374151", accent: "#F59E0B", accentText: "#111827", danger: "#EF4444", keyBg: "#374151", keyText: "#F9FAFB", opBg: "#451A03", opText: "#FDE68A", eqBg: "#F59E0B", eqText: "#111827", displayBg: "#1F2937", overlay: "rgba(0,0,0,0.7)", favActive: "#F59E0B", toast: "#065F46", toastText: "#D1FAE5" }
};
const useTheme = () => {
  const [dark, setDark] = useState(window.matchMedia?.("(prefers-color-scheme: dark)").matches || false);
  useEffect(() => { const mq = window.matchMedia("(prefers-color-scheme: dark)"); const h = (e) => setDark(e.matches); mq.addEventListener("change", h); return () => mq.removeEventListener("change", h); }, []);
  return dark ? themes.dark : themes.light;
};

// --- Toast ---
const SaveToast = ({ show, theme, onDone }) => {
  useEffect(() => { if (show) { const t = setTimeout(onDone, 1500); return () => clearTimeout(t); } }, [show]);
  if (!show) return null;
  return (
    <div style={{ position: "absolute", top: 56, left: "50%", transform: "translateX(-50%)", background: theme.toast, color: theme.toastText, padding: "8px 18px", borderRadius: 20, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, zIndex: 100, boxShadow: "0 4px 12px rgba(0,0,0,0.2)", animation: "toastIn 0.3s ease" }}>
      <span style={{ fontSize: 16 }}>✓</span> Saved
      <style>{`@keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(-8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
    </div>
  );
};

// --- Swipeable Item ---
const SwipeItem = ({ children, onDelete, theme }) => {
  const [offsetX, setOffsetX] = useState(0);
  const [startX, setStartX] = useState(null);
  const [swiping, setSwiping] = useState(false);
  const handleStart = (x) => { setStartX(x); setSwiping(true); };
  const handleMove = (x) => { if (!swiping || startX === null) return; const dx = x - startX; setOffsetX(Math.min(0, Math.max(-100, dx))); };
  const handleEnd = () => {
    setSwiping(false); setStartX(null);
    if (offsetX < -60) setOffsetX(-100); else setOffsetX(0);
  };
  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 100, background: theme.danger, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <button onClick={onDelete} style={{ background: "none", border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", padding: "0 16px", height: "100%" }}>Delete</button>
      </div>
      <div
        onMouseDown={e => handleStart(e.clientX)} onMouseMove={e => { if (swiping) handleMove(e.clientX); }} onMouseUp={handleEnd} onMouseLeave={() => { if (swiping) handleEnd(); }}
        onTouchStart={e => handleStart(e.touches[0].clientX)} onTouchMove={e => handleMove(e.touches[0].clientX)} onTouchEnd={handleEnd}
        style={{ transform: `translateX(${offsetX}px)`, transition: swiping ? "none" : "transform 0.25s ease", background: theme.card, position: "relative", zIndex: 1, cursor: "grab" }}
      >
        {children}
      </div>
    </div>
  );
};

// --- Key Button ---
const Key = ({ label, onPress, bg, color, flex = 1 }) => (
  <button onClick={onPress} style={{ display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 20, fontWeight: 600, height: 52, flex, background: bg, color, transition: "opacity 0.1s", userSelect: "none" }}
    onMouseDown={e => e.currentTarget.style.opacity = "0.65"} onMouseUp={e => e.currentTarget.style.opacity = "1"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
    {label}
  </button>
);

// --- Calculator Screen ---
const CalcScreen = ({ state, dispatch, theme }) => {
  const keys = [["C", "⌫", "()", "÷"], ["7", "8", "9", "×"], ["4", "5", "6", "−"], ["1", "2", "3", "+"], ["0", "'", "\"", "="]];
  const fracs = ["1/2", "1/4", "1/8", "1/16", "/", "−", "␣"];
  const isOp = (k) => ["÷", "×", "−", "+"].includes(k);

  const handleKey = (k) => {
    if (k === "C") dispatch({ type: "CLEAR" });
    else if (k === "⌫") dispatch({ type: "BACKSPACE" });
    else if (k === "=") dispatch({ type: "EVAL" });
    else if (k === "()") { const o = (state.expr.match(/\(/g) || []).length; const c = (state.expr.match(/\)/g) || []).length; dispatch({ type: "INPUT", val: o > c ? ")" : "(" }); }
    else dispatch({ type: "INPUT", val: k });
  };

  const handleFrac = (f) => {
    if (f === "␣") { dispatch({ type: "INPUT", val: " " }); return; }
    if (f === "/") { dispatch({ type: "INPUT", val: "/" }); return; }
    if (f === "−") { dispatch({ type: "INPUT", val: "-" }); return; }
    const lastChar = state.expr.slice(-1);
    const autoSpace = /\d/.test(lastChar);
    dispatch({ type: "INPUT", val: (autoSpace ? " " : "") + f });
  };

  const unitLabel = state.settings.unit === "imperial" ? "ft-in" : "mm";
  const convUnit = state._resultConverted ? (state._resultOriginalUnit === "imperial" ? "mm" : "ft-in") : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: theme.bg, position: "relative" }}>
      {/* Top Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: `1px solid ${theme.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: theme.accent }}>◉</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: theme.text }}>WoodCalc</span>
          <span style={{ fontSize: 11, background: theme.accent + "22", color: theme.accent, padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>{convUnit || unitLabel}</span>
        </div>
        <button onClick={() => dispatch({ type: "SET_SCREEN", screen: "settings" })} style={{ width: 36, height: 36, borderRadius: 18, background: theme.accent + "22", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👤</button>
      </div>

      <SaveToast show={state._showSaveToast} theme={theme} onDone={() => dispatch({ type: "HIDE_TOAST" })} />

      {/* Display */}
      <div style={{ flex: "0 0 auto", padding: "16px 16px 10px", background: theme.displayBg, minHeight: 90, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        <div style={{ fontSize: 18, color: theme.textSec, wordWrap: "break-word", minHeight: 24, fontFamily: "'SF Mono', 'Fira Code', monospace", lineHeight: 1.6, display: "flex", flexWrap: "wrap", alignItems: "center" }}>
          {state.expr ? (
            <><span style={{ whiteSpace: "pre-wrap" }}>{state.expr}</span><span className="cursor" style={{ display: "inline-block", width: 2, height: 20, background: theme.accent, borderRadius: 1, marginLeft: 1 }} /></>
          ) : (
            <><span className="cursor" style={{ display: "inline-block", width: 2, height: 20, background: theme.accent, borderRadius: 1, marginRight: 4 }} /><span style={{ opacity: 0.35, fontSize: 15 }}>Enter measurement...</span></>
          )}
        </div>
        {state.result && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
            <span style={{ fontSize: 26, fontWeight: 700, color: state.result === "Error" ? theme.danger : theme.accent, fontFamily: "'SF Mono', 'Fira Code', monospace" }}>= {state.result}</span>
            {state.settings.convEnabled && state.result !== "Error" && state._resultFrac && (
              <button onClick={() => dispatch({ type: "CONVERT" })} style={{ background: state._resultConverted ? theme.accent : theme.accent + "22", border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 13, color: state._resultConverted ? theme.accentText : theme.accent, fontWeight: 700, transition: "all 0.2s" }}>⇄</button>
            )}
          </div>
        )}
        {state.result && state.result !== "Error" && !state.settings.autoSave && state._lastEntry && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
            <button onClick={() => dispatch({ type: "SAVE_MANUAL" })} style={{ background: theme.accent, color: theme.accentText, border: "none", borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>💾 Save</button>
          </div>
        )}
      </div>

      {/* Fraction Bar */}
      <div style={{ display: "flex", gap: 5, padding: "6px 10px" }}>
        {fracs.map(f => (
          <button key={f} onClick={() => handleFrac(f)} style={{ flex: "1 1 0", height: 34, borderRadius: 8, background: f === "−" ? theme.keyBg : theme.opBg, color: f === "−" ? theme.keyText : theme.opText, border: "none", cursor: "pointer", fontSize: f === "␣" ? 12 : 13, fontWeight: 600, whiteSpace: "nowrap" }}>{f}</button>
        ))}
      </div>

      {/* Keypad */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5, padding: "2px 10px 6px" }}>
        {keys.map((row, ri) => (
          <div key={ri} style={{ display: "flex", gap: 5, flex: 1 }}>
            {row.map(k => {
              const eq = k === "="; const op = isOp(k); const clr = k === "C" || k === "⌫";
              return <Key key={k} label={k} onPress={() => handleKey(k)} bg={eq ? theme.eqBg : op ? theme.opBg : clr ? theme.danger + "18" : theme.keyBg} color={eq ? theme.eqText : op ? theme.opText : clr ? theme.danger : theme.keyText} />;
            })}
          </div>
        ))}
      </div>

      {/* Bottom Bar */}
      <div style={{ padding: "6px 10px 14px", borderTop: `1px solid ${theme.border}` }}>
        <button onClick={() => dispatch({ type: "TOGGLE_HISTORY" })} style={{ width: "100%", height: 42, borderRadius: 10, background: theme.card, border: `1px solid ${theme.border}`, cursor: "pointer", fontSize: 14, fontWeight: 600, color: theme.text, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          📋 History {state.history.length > 0 && <span style={{ background: theme.accent + "22", color: theme.accent, fontSize: 12, fontWeight: 700, padding: "1px 8px", borderRadius: 10 }}>{state.history.length}</span>}
        </button>
      </div>

      {/* Cursor blink CSS */}
      <style>{`.cursor { animation: blink 1s step-end infinite; } @keyframes blink { 0%,100% { opacity:1 } 50% { opacity:0 } }`}</style>

      {/* History Modal */}
      {state.showHistory && (
        <div style={{ position: "absolute", inset: 0, background: theme.overlay, zIndex: 50, display: "flex", flexDirection: "column" }} onClick={() => dispatch({ type: "TOGGLE_HISTORY" })}>
          <div onClick={e => e.stopPropagation()} style={{ marginTop: "8%", flex: 1, background: theme.bg, borderRadius: "20px 20px 0 0", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${theme.border}` }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: theme.text }}>Saved Measurements</span>
              <button onClick={() => dispatch({ type: "TOGGLE_HISTORY" })} style={{ background: theme.keyBg, border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 14, fontWeight: 600, color: theme.text }}>Done</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
              {state.history.length === 0 && (
                <div style={{ textAlign: "center", padding: 48, color: theme.textSec }}>
                  <div style={{ fontSize: 40, marginBottom: 10, opacity: 0.6 }}>📐</div>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No measurements yet</div>
                  <div style={{ fontSize: 13 }}>Start calculating to build your list!</div>
                </div>
              )}
              {(() => {
                const sorted = [...state.history].sort((a, b) => (b.fav - a.fav) || (b.ts - a.ts));
                const favs = sorted.filter(h => h.fav); const rest = sorted.filter(h => !h.fav);
                const renderItem = (h) => (
                  <SwipeItem key={h.id} onDelete={() => dispatch({ type: "DELETE", id: h.id })} theme={theme}>
                    <div style={{ padding: "12px 20px", borderBottom: `1px solid ${theme.border}` }}>
                      {state.editingId === h.id ? (
                        <div style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                          <div style={{ flex: 1, position: "relative" }}>
                            <input value={state.editDesc} onChange={e => dispatch({ type: "UPDATE_EDIT_DESC", val: e.target.value.slice(0, 60) })} placeholder="Short description..." maxLength={60} autoFocus
                              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1.5px solid ${theme.accent}`, background: theme.card, color: theme.text, fontSize: 14, outline: "none", boxSizing: "border-box" }}
                              onKeyDown={e => { if (e.key === "Enter") dispatch({ type: "SAVE_EDIT" }); if (e.key === "Escape") dispatch({ type: "CANCEL_EDIT" }); }} />
                            <span style={{ position: "absolute", right: 8, bottom: -16, fontSize: 10, color: theme.textSec }}>{state.editDesc.length}/60</span>
                          </div>
                          <button onClick={() => dispatch({ type: "SAVE_EDIT" })} style={{ background: theme.accent, color: theme.accentText, border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Save</button>
                          <button onClick={() => dispatch({ type: "CANCEL_EDIT" })} style={{ background: theme.keyBg, color: theme.textSec, border: "none", borderRadius: 8, padding: "8px 8px", cursor: "pointer", fontSize: 14 }}>✕</button>
                        </div>
                      ) : (
                        <div onClick={() => dispatch({ type: "START_EDIT", id: h.id })} style={{ cursor: "pointer", marginBottom: 2 }}>
                          {h.desc ? <div style={{ fontWeight: 700, color: theme.text, fontSize: 15 }}>{h.desc}</div>
                            : <div style={{ color: theme.textSec, fontSize: 12, fontStyle: "italic" }}>Tap to add description...</div>}
                        </div>
                      )}
                      <div style={{ fontSize: 13, color: theme.textSec, fontFamily: "monospace", marginTop: 4 }}>{h.expression}</div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: theme.accent, fontFamily: "monospace" }}>= {h.result}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 11, color: theme.textSec }}>{timeAgo(h.ts)}</span>
                          <button onClick={(e) => { e.stopPropagation(); dispatch({ type: "TOGGLE_FAV", id: h.id }); }}
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, padding: 0, lineHeight: 1, color: h.fav ? theme.favActive : theme.textSec }}>{h.fav ? "★" : "☆"}</button>
                        </div>
                      </div>
                    </div>
                  </SwipeItem>
                );
                return (
                  <>
                    {favs.length > 0 && (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 700, color: theme.textSec, textTransform: "uppercase", letterSpacing: 0.5, padding: "10px 20px 4px" }}>★ Favorites</div>
                        {favs.map(renderItem)}
                      </>
                    )}
                    {rest.length > 0 && (
                      <>
                        {favs.length > 0 && <div style={{ fontSize: 11, fontWeight: 700, color: theme.textSec, textTransform: "uppercase", letterSpacing: 0.5, padding: "14px 20px 4px" }}>Recent</div>}
                        {rest.map(renderItem)}
                      </>
                    )}
                  </>
                );
              })()}
              {state.history.length > 0 && (
                <div style={{ textAlign: "center", padding: "16px 20px", fontSize: 12, color: theme.textSec }}>← Swipe left on an item to delete</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Settings Screen ---
const SettingsScreen = ({ state, dispatch, theme }) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const Toggle = ({ val, onToggle }) => (
    <button onClick={onToggle} style={{ width: 50, height: 28, borderRadius: 14, background: val ? theme.accent : theme.border, border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
      <div style={{ width: 22, height: 22, borderRadius: 11, background: "#fff", position: "absolute", top: 3, left: val ? 25 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
    </button>
  );
  const Row = ({ label, children, sub }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 20px", borderBottom: `1px solid ${theme.border}` }}>
      <div><div style={{ fontSize: 15, color: theme.text }}>{label}</div>{sub && <div style={{ fontSize: 12, color: theme.textSec, marginTop: 2 }}>{sub}</div>}</div>
      {children}
    </div>
  );
  const Section = ({ title, children }) => (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: theme.textSec, textTransform: "uppercase", letterSpacing: 0.5, padding: "0 20px 6px" }}>{title}</div>
      <div style={{ background: theme.card, borderTop: `1px solid ${theme.border}`, borderBottom: `1px solid ${theme.border}` }}>{children}</div>
    </div>
  );
  const Sel = ({ value, onChange, children }) => (
    <select value={value} onChange={onChange} style={{ background: theme.keyBg, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 14 }}>{children}</select>
  );
  return (
    <div style={{ height: "100%", background: theme.bg, overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: `1px solid ${theme.border}` }}>
        <button onClick={() => dispatch({ type: "SET_SCREEN", screen: "calc" })} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, color: theme.accent, fontWeight: 600 }}>← Back</button>
        <span style={{ fontSize: 18, fontWeight: 700, color: theme.text }}>Settings</span>
      </div>
      <Section title="Account">
        <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: theme.accent + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>👤</div>
          <div>
            <div style={{ fontSize: 14, color: theme.text, fontWeight: 600 }}>Sign in to sync measurements</div>
            <div style={{ fontSize: 12, color: theme.accent, fontWeight: 600, marginTop: 2 }}>Coming soon</div>
          </div>
        </div>
      </Section>
      <Section title="Calculator">
        <Row label="Auto-save calculations" sub="Save every calculation when you press ="><Toggle val={state.settings.autoSave} onToggle={() => dispatch({ type: "SET_SETTING", key: "autoSave", val: !state.settings.autoSave })} /></Row>
        <Row label="Default units">
          <Sel value={state.settings.unit} onChange={e => dispatch({ type: "SET_SETTING", key: "unit", val: e.target.value })}>
            <option value="imperial">Imperial</option><option value="metric">Metric</option>
          </Sel>
        </Row>
        <Row label="Fraction precision" sub="Exact preserves unreduced fractions">
          <Sel value={state.settings.precision} onChange={e => dispatch({ type: "SET_SETTING", key: "precision", val: e.target.value === "exact" ? "exact" : parseInt(e.target.value) })}>
            <option value="exact">Exact</option>
            {[2, 4, 8, 16, 32].map(p => <option key={p} value={p}>1/{p}</option>)}
          </Sel>
        </Row>
        <Row label="Calculate unit conversion" sub="Show ⇄ button to convert results"><Toggle val={state.settings.convEnabled} onToggle={() => dispatch({ type: "SET_SETTING", key: "convEnabled", val: !state.settings.convEnabled })} /></Row>
      </Section>
      <Section title="Data">
        <div style={{ padding: "14px 20px" }}>
          {!showClearConfirm ? (
            <button onClick={() => setShowClearConfirm(true)} style={{ background: theme.danger + "12", color: theme.danger, border: `1px solid ${theme.danger}30`, borderRadius: 10, padding: "11px 20px", cursor: "pointer", fontSize: 14, fontWeight: 600, width: "100%" }}>Clear All History</button>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 14, color: theme.danger, fontWeight: 600, marginBottom: 4 }}>Delete all saved measurements?</div>
              <div style={{ fontSize: 13, color: theme.textSec, marginBottom: 10 }}>This cannot be undone.</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <button onClick={() => { dispatch({ type: "CLEAR_ALL" }); setShowClearConfirm(false); }} style={{ background: theme.danger, color: "#fff", border: "none", borderRadius: 8, padding: "9px 22px", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Delete All</button>
                <button onClick={() => setShowClearConfirm(false)} style={{ background: theme.keyBg, color: theme.text, border: "none", borderRadius: 8, padding: "9px 22px", cursor: "pointer", fontSize: 14 }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </Section>
      <Section title="About">
        <Row label="WoodCalc"><span style={{ color: theme.textSec, fontSize: 14 }}>v1.0.0</span></Row>
      </Section>
      <div style={{ height: 40 }} />
    </div>
  );
};

// --- App ---
export default function WoodCalc() {
  const [state, dispatch] = useReducer(reducer, initState);
  const theme = useTheme();
  return (
    <div style={{ width: "100%", maxWidth: 400, height: "100%", minHeight: 700, margin: "0 auto", background: theme.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {state.screen === "calc" && <CalcScreen state={state} dispatch={dispatch} theme={theme} />}
      {state.screen === "settings" && <SettingsScreen state={state} dispatch={dispatch} theme={theme} />}
    </div>
  );
}
